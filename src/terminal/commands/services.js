// systemd model: unit files on the VFS are the source of truth. Enablement = symlinks in
// /etc/systemd/system/*.wants, masking = symlink to /dev/null, drop-ins in NAME.service.d/*.conf,
// changes on disk require daemon-reload. Start-up performs realistic pre-flight checks.
import { S_IFDIR, S_IFLNK, S_IFREG, normalizePath } from '../vfs.js';
import { addProcess, userByName, ctxType } from '../system.js';
import { columns } from './util.js';

const UNIT_DIRS = ['/etc/systemd/system', '/run/systemd/system', '/usr/lib/systemd/system'];

export function normUnit(name) {
  if (!name) return name;
  return /\.(service|socket|timer|target|mount|path|slice)$/.test(name) ? name : `${name}.service`;
}
const baseName = (unit) => unit.replace(/\.service$/, '');

export function findUnitFile(sys, unit) {
  for (const d of UNIT_DIRS) {
    const r = sys.fs.tryResolve(`${d}/${unit}`, '/', { follow: false });
    if (r && r.node.type === S_IFLNK && r.node.target === '/dev/null') return { path: `${d}/${unit}`, masked: true };
    if (r) { const rr = sys.fs.tryResolve(`${d}/${unit}`); if (rr && rr.node.type === S_IFREG) return { path: `${d}/${unit}`, masked: false }; }
  }
  return null;
}

export function parseUnitText(text, cfg = {}) {
  let section = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sm = /^\[(\w+)\]$/.exec(line);
    if (sm) { section = sm[1]; continue; }
    const kv = /^([A-Za-z]+)\s*=\s*(.*)$/.exec(line);
    if (!kv || !section) continue;
    const key = `${section}.${kv[1]}`;
    if (kv[1] === 'ExecStart' || kv[1] === 'ExecStartPre') {
      if (kv[2] === '') cfg[key] = [];
      else (cfg[key] = Array.isArray(cfg[key]) ? cfg[key] : []).push(kv[2]);
    } else cfg[key] = kv[2];
  }
  return cfg;
}

export function dropInPaths(sys, unit) {
  const out = [];
  for (const d of UNIT_DIRS) {
    const r = sys.fs.tryResolve(`${d}/${unit}.d`);
    if (r && r.node.type === S_IFDIR) for (const f of sys.fs.list(r.node)) if (f.endsWith('.conf')) out.push(`${d}/${unit}.d/${f}`);
  }
  return out.sort((a, b) => a.split('/').pop().localeCompare(b.split('/').pop()));
}

function unitSource(sys, unit) {
  const f = findUnitFile(sys, unit);
  if (!f || f.masked) return null;
  let text = sys.fs.readFile(f.path, '/');
  for (const d of dropInPaths(sys, unit)) text += '\n' + sys.fs.readFile(d, '/');
  return { path: f.path, text };
}

/** (Re)load a unit's configuration from disk into the runtime model. */
export function loadUnit(sys, unit) {
  const src = unitSource(sys, unit);
  if (!src) return null;
  const f = findUnitFile(sys, unit);
  let cfg = parseUnitText(sys.fs.readFile(f.path, '/'));
  for (const d of dropInPaths(sys, unit)) cfg = parseUnitText(sys.fs.readFile(d, '/'), cfg);
  const name = baseName(unit);
  const svc = sys.services[name] ||= { name, active: 'inactive', pid: null, ports: [], custom: true };
  const exec = (cfg['Service.ExecStart'] || [])[0] || '';
  svc.description = cfg['Unit.Description'] || name;
  svc.exec = exec;
  svc.type = cfg['Service.Type'] || 'simple';
  svc.user = cfg['Service.User'] || svc.user || 'root';
  svc.restart = cfg['Service.Restart'] || 'no';
  svc.wantedBy = cfg['Install.WantedBy'] || '';
  svc.unitPath = src.path;
  svc.loadedText = src.text;
  svc.envFile = cfg['Service.EnvironmentFile'] || '';
  return svc;
}

export function needsReload(sys, svc) {
  if (!svc.loadedText) return false;
  const src = unitSource(sys, `${svc.name}.service`);
  return !!src && src.text !== svc.loadedText;
}

export function enabledState(sys, unit) {
  const f = findUnitFile(sys, unit);
  if (!f) return null;
  if (f.masked) return 'masked';
  const wantsRoot = sys.fs.tryResolve('/etc/systemd/system');
  for (const d of sys.fs.list(wantsRoot.node)) {
    if (!/\.(wants|requires)$/.test(d)) continue;
    const r = sys.fs.tryResolve(`/etc/systemd/system/${d}/${unit}`, '/', { follow: false });
    if (r) return 'enabled';
  }
  const text = sys.fs.readFile(f.path, '/');
  if (!/^\s*\[Install\]/m.test(text) || !/WantedBy|RequiredBy|Alias/.test(text)) return 'static';
  return 'disabled';
}

function journal(sys, unit, prio, msg, ident) {
  sys.journal.push({ time: sys.clock(), unit, prio, msg, ident: ident || 'systemd' });
}

function portsFromConfig(sys, svc) {
  try {
    if (svc.name === 'httpd') {
      const conf = sys.fs.readFile('/etc/httpd/conf/httpd.conf', '/');
      const ports = conf.split('\n').map(l => /^\s*Listen\s+(?:[\d.]+:)?(\d+)/.exec(l)).filter(Boolean).map(m => ['tcp', Number(m[1])]);
      return ports.length ? ports : [['tcp', 80]];
    }
    if (svc.name === 'sshd') {
      let conf = sys.fs.readFile('/etc/ssh/sshd_config', '/');
      const dd = sys.fs.tryResolve('/etc/ssh/sshd_config.d');
      if (dd) for (const f of sys.fs.list(dd.node)) conf = sys.fs.readFile(`/etc/ssh/sshd_config.d/${f}`, '/') + '\n' + conf;
      const ports = conf.split('\n').map(l => /^\s*Port\s+(\d+)/i.exec(l)).filter(Boolean).map(m => ['tcp', Number(m[1])]);
      return ports.length ? [...new Map(ports.map(p => [p[1], p])).values()] : [['tcp', 22]];
    }
    if (svc.custom && svc.envFile) {
      const env = sys.fs.readFile(svc.envFile.replace(/^-/, ''), '/');
      const m = /PORT=(\d+)/.exec(env);
      if (m) return [['tcp', Number(m[1])]];
    }
  } catch { /* fall through */ }
  return svc.ports || [];
}

function selinuxPortAllowed(sys, svc, port) {
  if (sys.selinux.mode !== 'enforcing') return true;
  const typeFor = { httpd: ['http_port_t'], sshd: ['ssh_port_t'], mariadb: ['mysqld_port_t'] }[svc.name];
  if (!typeFor) return true;
  return typeFor.some(t => (sys.selinux.ports[t]?.tcp || []).includes(port));
}

export function avc(sys, perm, comm, extra) {
  sys.audit.push(`type=AVC msg=audit(${Math.floor(sys.clock() / 1000)}.${String(sys.audit.length).padStart(3, '0')}:${900 + sys.audit.length}): avc:  denied  { ${perm} } for  pid=${sys.nextPid} comm="${comm}" ${extra} permissive=0`);
  try { sys.fs.resolve('/var/log/audit/audit.log').node.data += sys.audit[sys.audit.length - 1] + '\n'; } catch { /* ignore */ }
}

/** Start a service. Returns { ok, message } and updates runtime state + journal. */
export function startService(sys, name, shell) {
  const unit = `${name}.service`;
  const f = findUnitFile(sys, unit);
  if (!f) return { ok: false, code: 5, message: `Failed to start ${unit}: Unit ${unit} not found.` };
  if (f.masked) return { ok: false, code: 1, message: `Failed to start ${unit}: Unit ${unit} is masked.` };
  let svc = sys.services[name];
  if (!svc || !svc.loadedText) svc = loadUnit(sys, unit);
  if (svc.active === 'active') return { ok: true };
  const fail = (lines, status = '1/FAILURE', result = 'exit-code') => {
    for (const l of lines) journal(sys, unit, 3, l, name);
    journal(sys, unit, 5, `${unit}: Main process exited, code=exited, status=${status}`);
    journal(sys, unit, 4, `${unit}: Failed with result '${result}'.`);
    journal(sys, unit, 3, `Failed to start ${unit} - ${svc.description}.`);
    svc.active = 'failed';
    svc.failReason = result;
    svc.pid = null;
    svc.lastStatus = status;
    return { ok: false, code: 1, message: `Job for ${unit} failed because the control process exited with error code.\nSee "systemctl status ${unit}" and "journalctl -xeu ${unit}" for details.` };
  };
  journal(sys, unit, 6, `Starting ${unit} - ${svc.description}...`);
  const execPath = (svc.exec || '').replace(/^[-@!+]+/, '').split(/\s+/)[0];
  if (!execPath) return fail([`${unit}: Service has no ExecStart= setting. Refusing.`], '0/INVALID', 'resources');
  const ex = sys.fs.tryResolve(execPath);
  if (!ex) return fail([`${unit}: Failed to locate executable ${execPath}: No such file or directory`, `${unit}: Failed at step EXEC spawning ${execPath}: No such file or directory`], '203/EXEC');
  if (!(ex.node.mode & 0o111)) return fail([`${unit}: Failed to execute ${execPath}: Permission denied`, `${unit}: Failed at step EXEC spawning ${execPath}: Permission denied`], '203/EXEC');
  if (svc.user && !userByName(sys, svc.user)) return fail([`${unit}: Failed to determine user credentials: No such process`, `${unit}: Failed at step USER spawning ${execPath}: No such process`], '217/USER');
  if (svc.custom && ctxType(ex.node.ctx) && !['bin_t', 'usr_t', 'httpd_exec_t'].includes(ctxType(ex.node.ctx)) && sys.selinux.mode === 'enforcing' && /admin_home_t|user_home_t/.test(ex.node.ctx)) {
    avc(sys, 'execute', 'systemd', `name="${execPath.split('/').pop()}" dev="dm-0" ino=${ex.node.ino} scontext=system_u:system_r:init_t:s0 tcontext=${ex.node.ctx} tclass=file`);
    return fail([`${unit}: Failed to execute ${execPath}: Permission denied`], '203/EXEC');
  }
  if (name === 'httpd') {
    const err = httpdConfigErrors(sys);
    if (err) return fail([err, 'AH00016: Configuration Failed']);
  }
  if (name === 'sshd') {
    const err = sshdConfigErrors(sys);
    if (err) return fail([err], '255/EXCEPTION');
  }
  const ports = portsFromConfig(sys, svc);
  for (const [proto, port] of ports) {
    if (!selinuxPortAllowed(sys, svc, port)) {
      avc(sys, 'name_bind', name, `src=${port} scontext=system_u:system_r:${name === 'sshd' ? 'sshd_t' : name === 'mariadb' ? 'mysqld_t' : 'httpd_t'}:s0 tcontext=system_u:object_r:unreserved_port_t:s0 tclass=${proto}_socket`);
      return fail([name === 'httpd' ? `(13)Permission denied: AH00072: make_sock: could not bind to address [::]:${port}` : `error: Bind to port ${port} on 0.0.0.0 failed: Permission denied.`, name === 'httpd' ? 'AH00015: Unable to open logs' : 'fatal: Cannot bind any address.']);
    }
    const taken = sys.processes.find(p => (p.ports || []).some(pp => pp[1] === port && pp[0] === proto)) || Object.values(sys.services).find(s => s !== svc && s.active === 'active' && portsFromConfig(sys, s).some(pp => pp[1] === port && pp[0] === proto));
    if (taken) return fail([name === 'httpd' ? `(98)Address already in use: AH00072: make_sock: could not bind to address 0.0.0.0:${port}` : `Error: listen EADDRINUSE: address already in use 0.0.0.0:${port}`]);
  }
  // Run custom scripts for real (through the simulated shell) so their output lands in the journal.
  if (svc.custom && shell && ex.node.type === S_IFREG && !(ex.node.data || '').startsWith('\u007fELF')) {
    const saved = { user: sys.session.user, cwd: sys.session.cwd };
    sys.session.user = svc.user || 'root';
    sys.session.cwd = '/';
    let res;
    try { res = shell.run(svc.exec.replace(/^[-@!+]+/, ''), { record: false }); } finally { sys.session.user = saved.user; sys.session.cwd = saved.cwd; }
    for (const l of res.lines) journal(sys, unit, l.t === 'err' ? 3 : 6, l.s, execPath.split('/').pop());
    if (res.code !== 0 && !svc.exec.startsWith('-')) return fail([], `${res.code}/FAILURE`);
    if (svc.type === 'oneshot') {
      svc.active = 'inactive';
      svc.lastStatus = '0/SUCCESS';
      svc.ranAt = sys.clock();
      journal(sys, unit, 6, `${unit}: Deactivated successfully.`);
      journal(sys, unit, 6, `Finished ${unit} - ${svc.description}.`);
      return { ok: true };
    }
  }
  const p = addProcess(sys, { cmd: svc.exec.replace(/^[-@!+]+/, ''), user: svc.user || 'root', service: name, rssMb: svc.rssMb || 10, mem: 0.1, start: new Date(sys.clock()).toISOString().slice(11, 16) });
  if (name === 'httpd') for (let i = 0; i < 3; i++) addProcess(sys, { ppid: p.pid, cmd: '/usr/sbin/httpd -DFOREGROUND', user: 'apache', service: name, rssMb: 12 });
  svc.ports = ports;
  svc.pid = p.pid;
  svc.active = 'active';
  svc.since = sys.clock();
  svc.failReason = null;
  svc.lastStatus = null;
  journal(sys, unit, 6, `Started ${unit} - ${svc.description}.`);
  return { ok: true };
}

export function stopService(sys, name, { result = null, signal = null } = {}) {
  const svc = sys.services[name];
  if (!svc) return;
  const unit = `${name}.service`;
  sys.processes = sys.processes.filter(p => p.service !== name);
  if (result === 'signal') {
    journal(sys, unit, 5, `${unit}: Main process exited, code=killed, status=${signal === 'KILL' ? 9 : 15}/${signal}`);
    journal(sys, unit, 4, `${unit}: Failed with result 'signal'.`);
    svc.active = 'failed';
    svc.failReason = 'signal';
    svc.lastStatus = `${signal === 'KILL' ? 9 : 15}/${signal}`;
  } else {
    journal(sys, unit, 6, `Stopping ${unit} - ${svc.description}...`);
    journal(sys, unit, 6, `${unit}: Deactivated successfully.`);
    journal(sys, unit, 6, `Stopped ${unit} - ${svc.description}.`);
    svc.active = 'inactive';
    svc.failReason = null;
  }
  svc.pid = null;
}

export function httpdConfigErrors(sys) {
  let conf;
  try { conf = sys.fs.readFile('/etc/httpd/conf/httpd.conf', '/'); } catch { return 'AH00526: Syntax error: could not open configuration file /etc/httpd/conf/httpd.conf'; }
  const known = /^(ServerRoot|Listen|User|Group|DocumentRoot|ServerName|ServerAdmin|ErrorLog|CustomLog|LogLevel|Include|IncludeOptional|LoadModule|DirectoryIndex|Options|AllowOverride|Require|ProxyPass|ProxyPassReverse|KeepAlive|Timeout|AddDefaultCharset|EnableSendfile|Alias|ScriptAlias|RewriteEngine|RewriteRule|SSLEngine|SSLCertificateFile|SSLCertificateKeyFile|Header|TypesConfig|AddType|LogFormat)\b/i;
  const ls = conf.split('\n');
  let open = 0;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i].trim();
    if (!l || l.startsWith('#')) continue;
    if (/^<\/\w+>$/.test(l)) { open--; continue; }
    if (/^<\w+[^>]*>$/.test(l)) { open++; continue; }
    if (!known.test(l)) return `AH00526: Syntax error on line ${i + 1} of /etc/httpd/conf/httpd.conf: Invalid command '${l.split(/\s+/)[0]}', perhaps misspelled or defined by a module not included in the server configuration`;
  }
  if (open !== 0) return 'AH00526: Syntax error: Unclosed <Directory> or <VirtualHost> section';
  return null;
}

export function sshdConfigErrors(sys) {
  let conf;
  try { conf = sys.fs.readFile('/etc/ssh/sshd_config', '/'); } catch { return '/etc/ssh/sshd_config: No such file or directory'; }
  const known = /^(Include|Port|ListenAddress|PermitRootLogin|PubkeyAuthentication|PasswordAuthentication|MaxAuthTries|MaxSessions|MaxStartups|X11Forwarding|Subsystem|AllowUsers|AllowGroups|DenyUsers|DenyGroups|ClientAliveInterval|ClientAliveCountMax|LoginGraceTime|UsePAM|AuthorizedKeysFile|KbdInteractiveAuthentication|ChallengeResponseAuthentication|PermitEmptyPasswords|Banner|SyslogFacility|LogLevel|HostKey|AcceptEnv|PrintMotd|GSSAPIAuthentication|UseDNS|Ciphers|MACs|KexAlgorithms|Match|AllowTcpForwarding)\b/i;
  const ls = conf.split('\n');
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i].trim();
    if (!l || l.startsWith('#')) continue;
    if (!known.test(l)) return `/etc/ssh/sshd_config line ${i + 1}: Bad configuration option: ${l.split(/\s+/)[0]}`;
    if (/^PermitRootLogin\s+(?!yes|no|prohibit-password|without-password|forced-commands-only)/i.test(l)) return `/etc/ssh/sshd_config line ${i + 1}: unsupported option "${l.split(/\s+/)[1]}".`;
  }
  return null;
}

function fmtSince(sys, t) {
  const d = new Date(t);
  const ago = Math.max(1, Math.round((sys.clock() - t) / 60000));
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.toISOString().replace('T', ' ').slice(0, 19)} UTC; ${ago >= 1440 ? `${Math.floor(ago / 1440)} days` : ago >= 60 ? `${Math.floor(ago / 60)}h ${ago % 60}min` : `${ago}min`} ago`;
}

export function journalLine(sys, e) {
  const d = new Date(e.time);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  const pidPart = e.ident === 'kernel' ? '' : `[${e.pid || (e.ident === 'systemd' ? 1 : sys.services[e.ident]?.pid || 4100 + (e.ident.length * 13) % 400)}]`;
  return `${mon} ${String(d.getUTCDate()).padStart(2, '0')} ${d.toISOString().slice(11, 19)} ${sys.hostname.split('.')[0]} ${e.ident}${pidPart}: ${e.msg}`;
}

function statusText(sys, name) {
  const unit = `${name}.service`;
  const f = findUnitFile(sys, unit);
  const svc = sys.services[name];
  if (!f || (svc?.package && !sys.packages.installed[svc.package])) return null;
  const en = enabledState(sys, unit);
  const dot = svc?.active === 'active' ? '●' : svc?.active === 'failed' ? '×' : '○';
  const lines = [];
  lines.push(`${dot} ${unit} - ${svc?.description || name}`);
  lines.push(`     Loaded: ${f.masked ? 'masked (Reason: Unit ' + unit + ' is masked.)' : `loaded (${f.path}; ${en}; preset: disabled)`}`);
  const drops = dropInPaths(sys, unit);
  if (drops.length) lines.push(`    Drop-In: ${drops.map(d => d.slice(0, d.lastIndexOf('/'))).filter((v, i, a) => a.indexOf(v) === i).join(', ')}\n             └─${drops.map(d => d.split('/').pop()).join(', ')}`);
  if (svc?.active === 'active') {
    lines.push(`     Active: active (running) since ${fmtSince(sys, svc.since || sys.bootTime)}`);
    lines.push(`   Main PID: ${svc.pid} (${(svc.exec || '').split(/\s+/)[0].split('/').pop()})`);
    const procs = sys.processes.filter(p => p.service === name);
    lines.push(`      Tasks: ${procs.length} (limit: 22960)`);
    lines.push(`     Memory: ${procs.reduce((s, p) => s + p.rssMb, 0).toFixed(1)}M`);
    lines.push(`        CPU: ${(procs.length * 0.412).toFixed(3)}s`);
    lines.push(`     CGroup: /system.slice/${unit}`);
    procs.forEach((p, i) => lines.push(`             ${i === procs.length - 1 ? '└─' : '├─'}${p.pid} ${p.cmd}`));
  } else if (svc?.active === 'failed') {
    lines.push(`     Active: failed (Result: ${svc.failReason || 'exit-code'}) since ${fmtSince(sys, sys.clock() - 60000)}`);
    lines.push(`    Process: ${4000 + name.length} ExecStart=${svc.exec} (code=exited, status=${svc.lastStatus || '1/FAILURE'})`);
  } else {
    lines.push(`     Active: inactive (dead)${svc?.ranAt ? ` since ${fmtSince(sys, svc.ranAt)}` : ''}`);
  }
  if (svc && needsReload(sys, svc)) lines.push(`Warning: The unit file, source configuration file or drop-ins of ${unit} changed on disk. Run 'systemctl daemon-reload' to reload units.`);
  const logs = sys.journal.filter(e => e.unit === unit).slice(-10);
  if (logs.length) { lines.push(''); logs.forEach(e => lines.push(journalLine(sys, e))); }
  return { text: lines.join('\n'), code: svc?.active === 'active' ? 0 : 3 };
}

function installedUnits(sys) {
  return Object.values(sys.services).filter(s => !s.package || sys.packages.installed[s.package]).filter(s => findUnitFile(sys, `${s.name}.service`));
}

export const serviceCommands = [
  {
    name: 'systemctl', cat: 'Services', summary: 'Control systemd units: status/start/stop/restart/reload/enable/disable/mask/daemon-reload/list-units/cat/edit/get-default/set-default/is-active/is-enabled/show',
    usage: 'systemctl COMMAND [UNIT...]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const args = ctx.args.filter(a => a !== '--no-pager' && a !== '-l' && a !== '--full' && a !== '--quiet' && a !== '-q');
      const quiet = ctx.args.includes('--quiet') || ctx.args.includes('-q');
      const now = args.includes('--now');
      const typeArg = (args.find(a => a.startsWith('--type=')) || '').split('=')[1];
      const stateArg = (args.find(a => a.startsWith('--state=')) || '').split('=')[1] || (args.includes('--failed') ? 'failed' : '');
      const pos = args.filter(a => !a.startsWith('-'));
      const verb = pos[0] || 'list-units';
      const units = pos.slice(1).map(normUnit);
      const needRoot = ['start', 'stop', 'restart', 'reload', 'enable', 'disable', 'mask', 'unmask', 'daemon-reload', 'set-default', 'isolate', 'reset-failed', 'edit', 'try-restart', 'reload-or-restart', 'kill', 'reboot', 'poweroff'];
      if (needRoot.includes(verb) && !ctx.isRoot()) { ctx.error(`Failed to ${verb.replace('-', ' ')}${units[0] ? ' ' + units[0] : ''}: Access denied\n(simulator: polkit authentication is not simulated — use sudo)`); return 1; }
      if (needRoot.slice(0, 9).includes(verb) && verb !== 'daemon-reload' && !units.length) { ctx.error(`Too few arguments.`); return 1; }
      const warnReload = (u) => { const s = sys.services[baseName(u)]; if (s && needsReload(sys, s)) ctx.error(`Warning: The unit file, source configuration file or drop-ins of ${u} changed on disk. Run 'systemctl daemon-reload' to reload units.`); };
      let code = 0;
      switch (verb) {
        case 'status': {
          if (!units.length) { ctx.print(`● ${sys.hostname}\n    State: ${installedUnits(sys).some(s => s.active === 'failed') ? 'degraded' : 'running'}\n    Units: ${installedUnits(sys).length + 180} loaded (incl. loaded aliases)\n     Jobs: 0 queued\n   Failed: ${installedUnits(sys).filter(s => s.active === 'failed').length} units`); return 0; }
          for (const u of units) {
            const st = statusText(sys, baseName(u));
            if (!st) { ctx.error(`Unit ${u} could not be found.`); code = 4; continue; }
            ctx.print(st.text);
            code = Math.max(code, st.code);
          }
          return code;
        }
        case 'start': case 'restart': case 'try-restart': case 'reload-or-restart': case 'reload': {
          for (const u of units) {
            const name = baseName(u);
            const svc = sys.services[name];
            if (svc?.package && !sys.packages.installed[svc.package]) { ctx.error(`Failed to ${verb} ${u}: Unit ${u} not found.`); code = 5; continue; }
            warnReload(u);
            if (verb === 'reload') {
              if (!svc || svc.active !== 'active') { ctx.error(`Job for ${u} failed.\nSee "systemctl status ${u}" and "journalctl -xeu ${u}" for details.`); code = 1; continue; }
              if (name === 'httpd') { const err = httpdConfigErrors(sys); if (err) { journal(sys, u, 3, err, name); ctx.error(`Job for ${u} failed.`); code = 1; continue; } }
              journal(sys, u, 6, `Reloading ${u} - ${svc.description}...`); journal(sys, u, 6, `Reloaded ${u} - ${svc.description}.`);
              continue;
            }
            if (verb === 'try-restart' && svc?.active !== 'active') continue;
            if (verb !== 'start' && svc?.active === 'active') stopService(sys, name);
            const r = startService(sys, name, ctx.shell);
            if (!r.ok) { ctx.error(r.message); code = r.code || 1; }
          }
          return code;
        }
        case 'stop': {
          for (const u of units) {
            const svc = sys.services[baseName(u)];
            if (!svc || !findUnitFile(sys, u)) { ctx.error(`Failed to stop ${u}: Unit ${u} not loaded.`); code = 5; continue; }
            if (svc.active === 'active') stopService(sys, svc.name);
            else if (svc.active === 'failed') { /* stays failed until reset-failed or start */ }
          }
          return code;
        }
        case 'enable': case 'disable': {
          for (const u of units) {
            const f = findUnitFile(sys, u);
            const svc = sys.services[baseName(u)] || (f && !f.masked ? loadUnit(sys, u) : null);
            if (!f || (svc?.package && !sys.packages.installed[svc.package])) { ctx.error(`Failed to ${verb} unit: Unit file ${u} does not exist.`); code = 1; continue; }
            if (f.masked) { ctx.error(`Failed to ${verb} unit: Unit file ${f.path} is masked.`); code = 1; continue; }
            const text = sys.fs.readFile(f.path, '/');
            const wanted = (parseUnitText(text)['Install.WantedBy'] || '').split(/\s+/).filter(Boolean);
            if (verb === 'enable') {
              if (!wanted.length) { ctx.error(`The unit files have no installation config (WantedBy=, RequiredBy=, UpheldBy=,\nAlso=, or Alias= settings in the [Install] section, and DefaultInstance= for\ntemplate units). This means they are not meant to be enabled or disabled using systemctl.`); continue; }
              for (const t of wanted) {
                const dir = `/etc/systemd/system/${t}.wants`;
                if (!sys.fs.exists(dir)) sys.fs.create(dir, '/', S_IFDIR, { umask: 0o022 });
                const link = `${dir}/${u}`;
                if (!sys.fs.tryResolve(link, '/', { follow: false })) { sys.fs.create(link, '/', S_IFLNK, { target: f.path }); ctx.print(`Created symlink '${link}' → '${f.path}'.`); }
              }
              if (svc) svc.enabled = 'enabled';
              if (now) { const r = startService(sys, baseName(u), ctx.shell); if (!r.ok) { ctx.error(r.message); code = 1; } }
            } else {
              const root = sys.fs.resolve('/etc/systemd/system').node;
              for (const d of sys.fs.list(root)) {
                if (!/\.(wants|requires)$/.test(d)) continue;
                const link = `/etc/systemd/system/${d}/${u}`;
                const r = sys.fs.tryResolve(link, '/', { follow: false });
                if (r) { sys.fs.unlink(r.parent, r.name); ctx.print(`Removed '${link}'.`); }
              }
              if (svc) svc.enabled = 'disabled';
              if (now && svc?.active === 'active') stopService(sys, svc.name);
            }
          }
          return code;
        }
        case 'mask': case 'unmask': {
          for (const u of units) {
            const link = `/etc/systemd/system/${u}`;
            const r = sys.fs.tryResolve(link, '/', { follow: false });
            if (verb === 'mask') {
              if (r && !(r.node.type === S_IFLNK && r.node.target === '/dev/null')) { ctx.error(`Failed to mask unit: File ${link} already exists.`); code = 1; continue; }
              if (!r) { sys.fs.create(link, '/', S_IFLNK, { target: '/dev/null' }); ctx.print(`Created symlink '${link}' → '/dev/null'.`); }
            } else if (r && r.node.type === S_IFLNK && r.node.target === '/dev/null') { sys.fs.unlink(r.parent, r.name); ctx.print(`Removed '${link}'.`); }
          }
          return code;
        }
        case 'daemon-reload': {
          const seen = new Set();
          for (const d of UNIT_DIRS) {
            const r = sys.fs.tryResolve(d);
            if (!r) continue;
            for (const f of sys.fs.list(r.node)) if (f.endsWith('.service') && !seen.has(f)) { seen.add(f); const s = sys.services[baseName(f)]; if (!s?.package || sys.packages.installed[s.package]) loadUnit(sys, f); }
          }
          journal(sys, null, 6, 'Reloading requested from client PID ' + (sys.nextPid) + ' (\'systemctl\')...');
          return 0;
        }
        case 'is-active': {
          for (const u of units) { const s = sys.services[baseName(u)]; const st = s && findUnitFile(sys, u) ? s.active : 'inactive'; if (!quiet) ctx.print(st); if (st !== 'active') code = 3; }
          return code;
        }
        case 'is-failed': {
          for (const u of units) { const st = sys.services[baseName(u)]?.active === 'failed' ? 'failed' : (sys.services[baseName(u)]?.active || 'inactive'); if (!quiet) ctx.print(st); if (st !== 'failed') code = 1; }
          return code;
        }
        case 'is-enabled': {
          for (const u of units) { const st = enabledState(sys, u); if (!st) { ctx.error(`Failed to get unit file state for ${u}: No such file or directory`); code = 1; continue; } if (!quiet) ctx.print(st); if (st !== 'enabled' && st !== 'static') code = 1; }
          return code;
        }
        case 'list-units': case 'list-unit-files': {
          if (typeArg && typeArg !== 'service') { ctx.print(typeArg === 'target' ? 'UNIT                   LOAD   ACTIVE SUB    DESCRIPTION\nbasic.target           loaded active active Basic System\nmulti-user.target      loaded active active Multi-User System\nnetwork-online.target  loaded active active Network is Online\n\n3 loaded units listed.' : `0 loaded units listed.`); return 0; }
          let list = installedUnits(sys);
          if (verb === 'list-unit-files') {
            ctx.print(columns([['UNIT FILE', 'STATE', 'PRESET'], ...list.map(s => [`${s.name}.service`, enabledState(sys, `${s.name}.service`), 'disabled'])]));
            ctx.print(`\n${list.length} unit files listed.`);
            return 0;
          }
          if (stateArg) list = list.filter(s => (stateArg === 'running' ? s.active === 'active' : s.active === stateArg));
          else list = list.filter(s => s.active !== 'inactive' || args.includes('--all'));
          ctx.print(columns([['  UNIT', 'LOAD', 'ACTIVE', 'SUB', 'DESCRIPTION'], ...list.map(s => [`${s.active === 'failed' ? '●' : ' '} ${s.name}.service`, 'loaded', s.active, s.active === 'active' ? 'running' : s.active === 'failed' ? 'failed' : 'dead', s.description])]));
          ctx.print(`\nLegend: LOAD   → Reflects whether the unit definition was properly loaded.\n        ACTIVE → The high-level unit activation state, i.e. generalization of SUB.\n        SUB    → The low-level unit activation state, values depend on unit type.\n\n${list.length} loaded units listed.`);
          return 0;
        }
        case 'list-timers': {
          const timers = [];
          for (const d of UNIT_DIRS) { const r = sys.fs.tryResolve(d); if (r) for (const f of sys.fs.list(r.node)) if (f.endsWith('.timer')) timers.push(f); }
          ctx.print(columns([['NEXT', 'LEFT', 'LAST', 'PASSED', 'UNIT', 'ACTIVATES'], ['Sat 2026-10-10 00:00:00 UTC', '14h', 'Fri 2026-10-09 00:00:00 UTC', '9h ago', 'logrotate.timer', 'logrotate.service'], ['Fri 2026-10-09 10:10:00 UTC', '8min', 'Fri 2026-10-09 10:00:00 UTC', '1min ago', 'sysstat-collect.timer', 'sysstat-collect.service'],
            ...timers.filter(t => enabledState(sys, t) === 'enabled').map(t => ['Fri 2026-10-09 11:00:00 UTC', '58min', 'n/a', 'n/a', t, t.replace('.timer', '.service')])]));
          return 0;
        }
        case 'cat': {
          for (const u of units) {
            const f = findUnitFile(sys, u);
            if (!f) { ctx.error(`No files found for ${u}.`); code = 1; continue; }
            if (f.masked) { ctx.print(`# Unit ${u} is masked.`); continue; }
            ctx.print(`# ${f.path}\n${sys.fs.readFile(f.path, '/')}`);
            for (const d of dropInPaths(sys, u)) ctx.print(`\n# ${d}\n${sys.fs.readFile(d, '/')}`);
          }
          return code;
        }
        case 'edit': {
          const u = units[0];
          if (!findUnitFile(sys, u)) { ctx.error(`No files found for ${u}.`); return 1; }
          const dir = `/etc/systemd/system/${u}.d`;
          if (!sys.fs.exists(dir)) sys.fs.create(dir, '/', S_IFDIR, { umask: 0o022 });
          const path = `${dir}/override.conf`;
          if (!sys.fs.exists(path)) sys.fs.writeFile(path, '/', '### Editing drop-in for ' + u + '\n### Lines below this comment become the override\n\n[Service]\n', {});
          return { editor: path, after: 'daemon-reload' };
        }
        case 'show': {
          const u = units[0];
          const s = sys.services[baseName(u)];
          if (!s) { ctx.print('LoadState=not-found\nActiveState=inactive'); return 0; }
          const props = { Id: u, Description: s.description, LoadState: 'loaded', ActiveState: s.active, SubState: s.active === 'active' ? 'running' : s.active === 'failed' ? 'failed' : 'dead', MainPID: s.pid || 0, UnitFileState: enabledState(sys, u), ExecStart: `{ path=${(s.exec || '').split(' ')[0]} ; argv[]=${s.exec} }`, Restart: s.restart || 'no', User: s.user || '', Type: s.type || 'simple', FragmentPath: s.unitPath || findUnitFile(sys, u)?.path, NeedDaemonReload: needsReload(sys, s) ? 'yes' : 'no' };
          const pIdx = args.indexOf('-p');
          const want = pIdx >= 0 ? args[pIdx + 1].split(',') : (ctx.args.find(a => a.startsWith('--property=')) || '').split('=')[1]?.split(',');
          for (const [k, v] of Object.entries(props)) if (!want || want.includes(k)) ctx.print(`${k}=${v}`);
          return 0;
        }
        case 'get-default': {
          const r = sys.fs.resolve('/etc/systemd/system/default.target', '/', { follow: false });
          ctx.print(r.node.target.split('/').pop());
          return 0;
        }
        case 'set-default': {
          const t = units[0].replace(/\.service$/, '');
          const target = t.endsWith('.target') ? t : `${t}.target`;
          if (!sys.fs.exists(`/usr/lib/systemd/system/${target}`)) { ctx.error(`Failed to set default target: Unit file ${target} does not exist.`); return 1; }
          const r = sys.fs.resolve('/etc/systemd/system/default.target', '/', { follow: false });
          sys.fs.unlink(r.parent, r.name);
          sys.fs.create('/etc/systemd/system/default.target', '/', S_IFLNK, { target: `/usr/lib/systemd/system/${target}` });
          ctx.print(`Removed '/etc/systemd/system/default.target'.\nCreated symlink '/etc/systemd/system/default.target' → '/usr/lib/systemd/system/${target}'.`);
          return 0;
        }
        case 'isolate': {
          ctx.print(`(simulator) isolate ${units[0]} accepted but not performed: on a real host this stops every unit not required by the target (rescue/emergency drop you to a maintenance shell).`);
          return 0;
        }
        case 'reset-failed': {
          for (const s of Object.values(sys.services)) if ((!units.length || units.includes(`${s.name}.service`)) && s.active === 'failed') s.active = 'inactive';
          return 0;
        }
        case 'list-dependencies': {
          const u = units[0] || 'default.target';
          ctx.print(`${u}\n● ├─sshd.service\n● ├─crond.service\n● ├─chronyd.service\n● ├─firewalld.service\n● ├─httpd.service\n● └─basic.target\n●   ├─sysinit.target\n●   └─local-fs.target`);
          return 0;
        }
        case 'reboot': case 'poweroff': return ctx.shell.registry.get(verb).run(ctx);
        default:
          ctx.error(`Unknown command verb '${verb}'.`);
          return 1;
      }
    }
  },
  {
    name: 'journalctl', cat: 'Logs', summary: 'Query the systemd journal: -u UNIT, -p PRIO, -n N, -b, -k, -r, --since, -g PATTERN, --list-boots, --disk-usage',
    usage: 'journalctl [-u UNIT] [-p err] [-n 50] [-b] [-k] [-r] [--since "1 hour ago"] [-g PATTERN] [--no-pager]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const args = ctx.args;
      const val = (flag, long) => { const i = args.findIndex(a => a === flag || a === long); if (i >= 0) return args[i + 1]; const eq = args.find(a => long && a.startsWith(long + '=')); return eq ? eq.split('=').slice(1).join('=') : (args.find(a => a.startsWith(flag) && a.length > flag.length && flag.length === 2) || '').slice(2) || undefined; };
      if (!ctx.isRoot() && !sys.groups.find(g => g.name === 'wheel')?.members.includes(sys.session.user)) ctx.error('Hint: You are currently not seeing messages from other users and the system.\n      Users in groups \'adm\', \'systemd-journal\', \'wheel\' can see all messages.');
      if (args.includes('--list-boots')) {
        const persistent = sys.fs.exists('/var/log/journal');
        if (persistent && sys.journalPersisted) ctx.print('IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY\n -1 1c2d3e4f5a6b7c8d9e0f112233445566 Mon 2026-08-25 08:12:01 UTC Mon 2026-08-25 08:58:44 UTC\n  0 9a8b7c6d5e4f30211234567890abcdef Mon 2026-08-25 09:00:00 UTC Fri 2026-10-09 10:00:00 UTC');
        else ctx.print('IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY\n  0 9a8b7c6d5e4f30211234567890abcdef Mon 2026-08-25 09:00:00 UTC Fri 2026-10-09 10:00:00 UTC');
        return 0;
      }
      if (args.includes('--disk-usage')) { ctx.print(`Archived and active journals take up ${sys.fs.exists('/var/log/journal') ? '152.0M in the file system.' : '24.0M in the file system (volatile, /run/log/journal).'}`); return 0; }
      if (args.includes('--verify') || args.includes('--vacuum-size') || args.some(a => a.startsWith('--vacuum'))) { ctx.print('Vacuuming done, freed 0B of archived journals from /var/log/journal.'); return 0; }
      let entries = sys.journal.slice();
      const unitArgs = [];
      args.forEach((a, i) => { if (a === '-u' || a === '--unit') unitArgs.push(args[i + 1]); else if (a.startsWith('-u') && a.length > 2) unitArgs.push(a.slice(2)); else if (a.startsWith('--unit=')) unitArgs.push(a.slice(7)); });
      if (unitArgs.length) {
        const units = unitArgs.map(normUnit);
        entries = entries.filter(e => units.includes(e.unit));
      }
      if (args.includes('-k') || args.includes('--dmesg')) entries = entries.filter(e => e.ident === 'kernel');
      const prio = val('-p', '--priority');
      if (prio) {
        const map = { emerg: 0, alert: 1, crit: 2, err: 3, warning: 4, notice: 5, info: 6, debug: 7 };
        const [lo, hi] = prio.split('..').map(p => (/^\d$/.test(p) ? Number(p) : map[p]));
        entries = entries.filter(e => (hi === undefined ? e.prio <= lo : e.prio >= lo && e.prio <= hi));
      }
      const since = val('-S', '--since');
      if (since) {
        let t = 0;
        const m = /^(\d+)\s*(min|minute|minutes|hour|hours|h|day|days)\s+ago$/.exec(since);
        if (m) t = sys.clock() - Number(m[1]) * ({ min: 60, minute: 60, minutes: 60, hour: 3600, hours: 3600, h: 3600, day: 86400, days: 86400 }[m[2]]) * 1000;
        else if (since === 'today') t = sys.clock() - (sys.clock() % 86400000);
        else if (since === 'yesterday') t = sys.clock() - (sys.clock() % 86400000) - 86400000;
        else { const p = Date.parse(since.replace(' ', 'T') + 'Z'); if (!Number.isNaN(p)) t = p; else { ctx.error(`Failed to parse timestamp: ${since}`); return 1; } }
        entries = entries.filter(e => e.time >= t);
      }
      const grep = val('-g', '--grep');
      if (grep) { const re = new RegExp(grep, /[A-Z]/.test(grep) ? '' : 'i'); entries = entries.filter(e => re.test(e.msg)); }
      const b = args.indexOf('-b');
      if (b >= 0 && args[b + 1] === '-1') {
        if (!sys.fs.exists('/var/log/journal') || !sys.journalPersisted) { ctx.error('Specifying boot ID or boot offset has no effect, no persistent journal was found.'); return 1; }
        entries = [{ time: sys.bootTime - 3600000, ident: 'kernel', prio: 6, msg: 'Linux version (previous boot)' }, { time: sys.bootTime - 120000, ident: 'systemd', prio: 6, msg: 'System is rebooting.' }];
      }
      if (args.includes('-r') || args.includes('--reverse')) entries.reverse();
      const n = val('-n', '--lines');
      if (n !== undefined) entries = args.includes('-r') ? entries.slice(0, Number(n) || 10) : entries.slice(-(Number(n) || 10));
      else if (args.includes('-e')) entries = entries.slice(-1000);
      if (!entries.length) { ctx.print('-- No entries --'); return 0; }
      ctx.print(entries.map(e => journalLine(sys, e)).join('\n'));
      if (args.includes('-f') || args.includes('--follow')) ctx.error('(simulator) follow mode is not supported; showing current entries only');
      return 0;
    }
  }
];

export { normalizePath };
