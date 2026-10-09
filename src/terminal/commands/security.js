// SELinux, audit and certificate commands. Labels live on inodes; restorecon consults the
// default + local fcontext rules (see system.js) exactly like the real tool's matchpathcon logic.
import { expectedContext, ctxType } from '../system.js';
import { getopt, columns } from './util.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

function restorecon(ctx) {
  const sys = ctx.sys;
  const { o, rest } = getopt(ctx.args, 'RrvnFi', '');
  if (!rest.length) return fail(ctx, 'usage: restorecon [-R] [-v] [-n] [-F] pathname...', 255);
  if (!ctx.requireRoot()) return 255;
  let code = 0;
  for (const p of rest) {
    const r = sys.fs.tryResolve(p, ctx.cwd, { follow: false });
    if (!r) { ctx.error(`restorecon: lstat(${p}) failed: No such file or directory`); code = 255; continue; }
    const visit = (node, path) => {
      const want = expectedContext(sys, path);
      const cur = node.ctx;
      const changed = o.F ? cur !== want : ctxType(cur) !== ctxType(want);
      if (changed) {
        if (o.v || o.n) ctx.print(`${o.n ? 'Would relabel' : 'Relabeled'} ${path} from ${cur} to ${o.F ? want : cur.split(':').slice(0, 2).join(':') + ':' + ctxType(want) + ':s0'}`);
        if (!o.n) node.ctx = o.F ? want : `${cur.split(':').slice(0, 2).join(':')}:${ctxType(want)}:s0`;
      }
    };
    if ((o.R || o.r) && r.node.type === 'd') sys.fs.walk(r.path, '/', (n, path) => { if (n) visit(n, path); });
    else visit(r.node, r.path);
  }
  return code;
}

function semanage(ctx) {
  const sys = ctx.sys;
  const [obj, ...args] = ctx.args;
  if (!obj) return fail(ctx, 'usage: semanage {fcontext|port|boolean|login} ...', 1);
  const { o, rest } = getopt(args, 'adlmCnD', 'tpfs', { add: 'a', delete: 'd', list: 'l', modify: 'm', type: '=t', proto: '=p', locallist: 'C', noheading: 'n' });
  if ((o.a || o.d || o.m) && !ctx.requireRoot('semanage')) return 1;
  if (obj === 'fcontext') {
    if (o.l) {
      const rows = [['SELinux fcontext', 'type', 'Context']];
      const local = sys.selinux.fcontextLocal.map(r => [r.regex, 'all files', `system_u:object_r:${r.type}:s0`]);
      if (o.C) { if (!o.n) ctx.print('SELinux Local fcontext customizations\n'); ctx.print(columns(local)); return 0; }
      for (const [re, t] of [...(sys.defaultFcontexts || [])]) rows.push([re, 'all files', `system_u:object_r:${t}:s0`]);
      ctx.print(columns([...rows, ...local]));
      if (!rows.length) ctx.print('(simulator: built-in defaults omitted)');
      return 0;
    }
    const spec = rest[0];
    if (!spec) return fail(ctx, 'fcontext requires a file specification', 1);
    if (o.a || o.m) {
      if (!o.t) return fail(ctx, 'SELinux type is required (-t)', 1);
      if (!/_t$/.test(o.t)) { ctx.error(`ValueError: Type ${o.t} is invalid, must be a file or device type`); return 1; }
      if (o.a && sys.selinux.fcontextLocal.some(r => r.regex === spec)) { ctx.error(`ValueError: File context for ${spec} already defined`); return 1; }
      sys.selinux.fcontextLocal = sys.selinux.fcontextLocal.filter(r => r.regex !== spec);
      sys.selinux.fcontextLocal.push({ regex: spec, type: o.t });
      if (!spec.includes('(') && !spec.includes('*')) ctx.error('(hint) this rule matches only the directory itself; use "PATH(/.*)?" to include its contents');
      return 0;
    }
    if (o.d) {
      const before = sys.selinux.fcontextLocal.length;
      sys.selinux.fcontextLocal = sys.selinux.fcontextLocal.filter(r => r.regex !== spec);
      if (before === sys.selinux.fcontextLocal.length) { ctx.error(`ValueError: File context for ${spec} is not defined`); return 1; }
      return 0;
    }
  }
  if (obj === 'port') {
    if (o.l) {
      const rows = [['SELinux Port Type', 'Proto', 'Port Number']];
      for (const [t, protos] of Object.entries(sys.selinux.ports)) for (const [p, list] of Object.entries(protos)) rows.push([t, p, list.join(', ')]);
      ctx.print(columns(rows));
      return 0;
    }
    const port = Number(rest[0]);
    const proto = o.p || 'tcp';
    if (!port) return fail(ctx, 'port number required', 1);
    if (o.a || o.m) {
      if (!o.t) return fail(ctx, 'type is required (-t)', 1);
      const owner = Object.entries(sys.selinux.ports).find(([, pr]) => (pr[proto] || []).includes(port));
      if (owner && o.a) { ctx.error(`ValueError: Port ${proto}/${port} already defined`); return 1; }
      if (owner) owner[1][proto] = owner[1][proto].filter(x => x !== port);
      ((sys.selinux.ports[o.t] ||= {})[proto] ||= []).push(port);
      return 0;
    }
    if (o.d) {
      const owner = Object.entries(sys.selinux.ports).find(([t, pr]) => (!o.t || t === o.t) && (pr[proto] || []).includes(port));
      if (!owner) { ctx.error(`ValueError: Port ${proto}/${port} is not defined`); return 1; }
      owner[1][proto] = owner[1][proto].filter(x => x !== port);
      return 0;
    }
  }
  if (obj === 'boolean') {
    if (o.l) { ctx.print(columns([['SELinux boolean', 'State', 'Default', 'Description'], ...Object.entries(sys.selinux.booleans).map(([k, v]) => [k, v ? '(on' : '(off', `${v ? 'on' : 'off'})`, k.replace(/_/g, ' ')])])); return 0; }
    if (o.m) { const [flag, name] = args.includes('--on') ? ['on', rest[0]] : ['off', rest[0]]; if (!(name in sys.selinux.booleans)) return fail(ctx, `Boolean ${name} is not defined`); sys.selinux.booleans[name] = flag === 'on'; return 0; }
  }
  if (obj === 'login') { ctx.print('Login Name           SELinux User         MLS/MCS Range        Service\n\n__default__          unconfined_u         s0-s0:c0.c1023       *\nroot                 unconfined_u         s0-s0:c0.c1023       *'); return 0; }
  return fail(ctx, `(simulator supports: semanage fcontext -a|-d|-m|-l, semanage port -a|-d|-m|-l, semanage boolean -l|-m)`, 1);
}

export const securityCommands = [
  { name: 'getenforce', cat: 'SELinux', summary: 'Show the current SELinux mode', usage: 'getenforce', fidelity: 'functional', bin: '/usr/sbin/getenforce', run(ctx) { ctx.print(ctx.sys.selinux.mode[0].toUpperCase() + ctx.sys.selinux.mode.slice(1)); return 0; } },
  {
    name: 'setenforce', cat: 'SELinux', summary: 'Switch runtime mode Enforcing(1)/Permissive(0) — not persistent', usage: 'setenforce 0|1|Enforcing|Permissive', fidelity: 'functional', bin: '/usr/sbin/setenforce',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      if (sys.selinux.mode === 'disabled') { ctx.error('setenforce: SELinux is disabled'); return 1; }
      const v = (ctx.args[0] || '').toLowerCase();
      if (['1', 'enforcing'].includes(v)) sys.selinux.mode = 'enforcing';
      else if (['0', 'permissive'].includes(v)) { sys.selinux.mode = 'permissive'; ctx.error('(note) Permissive mode is for short-term diagnosis only. Find the denial with ausearch -m avc -ts recent, fix the label/boolean/port, then setenforce 1.'); }
      else return fail(ctx, 'usage: setenforce [ Enforcing | Permissive | 1 | 0 ]');
      return 0;
    }
  },
  {
    name: 'sestatus', cat: 'SELinux', summary: 'SELinux status summary', usage: 'sestatus [-b]', fidelity: 'functional', bin: '/usr/sbin/sestatus',
    run(ctx) {
      const s = ctx.sys.selinux;
      let cfg = 'enforcing';
      try { cfg = (/^SELINUX=(\w+)/m.exec(ctx.sys.fs.readFile('/etc/selinux/config', '/')) || [])[1] || cfg; } catch { /* default */ }
      if (s.mode === 'disabled') { ctx.print('SELinux status:                 disabled'); return 0; }
      ctx.print(`SELinux status:                 enabled\nSELinuxfs mount:                /sys/fs/selinux\nSELinux root directory:         /etc/selinux\nLoaded policy name:             ${s.policy}\nCurrent mode:                   ${s.mode}\nMode from config file:          ${cfg}\nPolicy MLS status:              enabled\nPolicy deny_unknown status:     allowed\nMemory protection checking:     actual (secure)\nMax kernel policy version:      33`);
      if (ctx.args.includes('-b')) ctx.print('\nPolicy booleans:\n' + Object.entries(s.booleans).map(([k, v]) => `${k.padEnd(40)}${v ? 'on' : 'off'}`).join('\n'));
      return 0;
    }
  },
  {
    name: 'getsebool', cat: 'SELinux', summary: 'Show SELinux booleans', usage: 'getsebool -a | getsebool NAME', fidelity: 'functional', bin: '/usr/sbin/getsebool',
    run(ctx) {
      const b = ctx.sys.selinux.booleans;
      const names = ctx.args.includes('-a') ? Object.keys(b) : ctx.args;
      if (!names.length) return fail(ctx, 'usage: getsebool -a or getsebool boolean...');
      let code = 0;
      for (const n of names) { if (!(n in b)) { ctx.error(`Error getting active value for ${n}`); code = 1; continue; } ctx.print(`${n} --> ${b[n] ? 'on' : 'off'}`); }
      return code;
    }
  },
  {
    name: 'setsebool', cat: 'SELinux', summary: 'Set SELinux booleans (-P persists across reboot)', usage: 'setsebool [-P] NAME on|off', fidelity: 'functional', bin: '/usr/sbin/setsebool',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      const args = ctx.args.filter(a => a !== '-P');
      const [name, val] = args.length === 1 && args[0].includes('=') ? args[0].split('=') : args;
      if (!(name in sys.selinux.booleans)) { ctx.error(`Boolean ${name} is not defined`); return 1; }
      if (!['on', 'off', '1', '0', 'true', 'false'].includes(val)) return fail(ctx, `Illegal value for boolean ${name}=${val}`);
      sys.selinux.booleans[name] = ['on', '1', 'true'].includes(val);
      (sys.selinux.persistentBooleans ||= {})[name] = ctx.args.includes('-P') ? sys.selinux.booleans[name] : sys.selinux.persistentBooleans?.[name];
      if (!ctx.args.includes('-P')) ctx.error('(note) without -P the change is lost at the next reboot');
      return 0;
    }
  },
  { name: 'semanage', cat: 'SELinux', summary: 'Persistent SELinux policy changes: fcontext, port, boolean', usage: 'semanage fcontext -a -t TYPE "/path(/.*)?" | semanage port -a -t TYPE -p tcp PORT | semanage port -l', fidelity: 'partial', bin: '/usr/sbin/semanage', run: semanage },
  { name: 'restorecon', cat: 'SELinux', summary: 'Reset file labels to the policy default (-R recursive, -v verbose, -n dry run, -F force full context)', usage: 'restorecon [-R] [-v] [-n] PATH...', fidelity: 'functional', bin: '/usr/sbin/restorecon', run: restorecon },
  {
    name: 'chcon', cat: 'SELinux', summary: 'Change a file label temporarily (lost on relabel/restorecon)', usage: 'chcon [-R] -t TYPE PATH... | chcon --reference=REF PATH', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 'Rvh', 'tu', { reference: '=ref', type: '=t' });
      if (!ctx.requireRoot()) return 1;
      let type = o.t;
      if (o.ref) { const r = sys.fs.tryResolve(o.ref, ctx.cwd); if (!r) return fail(ctx, `cannot stat '${o.ref}'`); type = ctxType(r.node.ctx); }
      if (!type) return fail(ctx, 'missing context (use -t TYPE)');
      for (const p of rest) {
        const r = sys.fs.tryResolve(p, ctx.cwd);
        if (!r) { ctx.error(`chcon: cannot access '${p}': No such file or directory`); return 1; }
        const apply = (n) => { const parts = n.ctx.split(':'); parts[2] = type; n.ctx = parts.join(':'); };
        if (o.R) sys.fs.walk(r.path, '/', (n) => { if (n) apply(n); }); else apply(r.node);
      }
      ctx.error('(note) chcon changes are not persistent: restorecon or a relabel resets them. Use semanage fcontext + restorecon for permanent fixes.');
      return 0;
    }
  },
  {
    name: 'ausearch', cat: 'SELinux', summary: 'Search the audit log (-m AVC, -ts recent|today, -c COMM, -i)', usage: 'ausearch -m AVC -ts recent [-c httpd] [-i]', fidelity: 'partial', bin: '/usr/sbin/ausearch',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.requireRoot()) return 1;
      const { o } = getopt(ctx.args, 'i', 'mtcp', { message: '=m', 'start': '=t', comm: '=c' });
      const tsIdx = ctx.args.indexOf('-ts');
      const ts = tsIdx >= 0 ? ctx.args[tsIdx + 1] : null;
      let lines = sys.audit.slice();
      if (o.m && !/avc/i.test(o.m)) lines = lines.filter(l => l.includes(`type=${o.m.toUpperCase()}`));
      if (o.c) lines = lines.filter(l => l.includes(`comm="${o.c}"`));
      if (ts === 'recent') { const cutoff = sys.clock() / 1000 - 600; lines = lines.filter(l => Number((/audit\((\d+)/.exec(l) || [])[1]) >= cutoff); }
      if (!lines.length) { ctx.print('<no matches>'); return 1; }
      for (const l of lines) {
        const t = Number((/audit\((\d+)/.exec(l) || [])[1]) * 1000;
        ctx.print(`----\ntime->${new Date(t).toUTCString().replace(' GMT', '')}`);
        ctx.print(ctx.args.includes('-i') ? l.replace(/audit\(\d+\.\d+:(\d+)\)/, `audit(${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}:$1)`) : l);
      }
      return 0;
    }
  },
  {
    name: 'sealert', cat: 'SELinux', summary: 'Explain AVC denials (setroubleshoot-server)', usage: 'sealert -a /var/log/audit/audit.log', fidelity: 'partial', pkg: 'setroubleshoot-server',
    run(ctx) {
      const sys = ctx.sys;
      if (!sys.audit.length) { ctx.print('found 0 alerts in /var/log/audit/audit.log'); return 0; }
      ctx.print(`100% done\nfound ${sys.audit.length} alerts in /var/log/audit/audit.log`);
      for (const l of sys.audit) {
        const comm = (/comm="([^"]+)"/.exec(l) || [])[1];
        const perm = (/\{ (\w+) \}/.exec(l) || [])[1];
        const tctx = (/tcontext=(\S+)/.exec(l) || [])[1];
        const name = (/name="([^"]+)"/.exec(l) || [])[1];
        ctx.print('--------------------------------------------------------------------------------\n');
        if (perm === 'name_bind' || perm === 'name_connect') {
          const port = (/(?:src|dest)=(\d+)/.exec(l) || [])[1];
          ctx.print(`SELinux is preventing ${comm} from ${perm} access on the tcp_socket port ${port}.\n\n*****  Plugin bind_ports (92.2 confidence) suggests   ************************\n\nIf you want to allow ${comm} to ${perm === 'name_bind' ? 'bind to' : 'connect to'} network port ${port}\nThen you need to modify the port type.\nDo\n# semanage port -a -t PORT_TYPE -p tcp ${port}\n    where PORT_TYPE is one of the following: http_cache_port_t, http_port_t.\n${perm === 'name_connect' ? '\n*****  Plugin catchall_boolean (7.83 confidence) suggests   ******************\n\nIf you want to allow httpd to can network connect\nThen you must tell SELinux about this by enabling the \'httpd_can_network_connect\' boolean.\nDo\nsetsebool -P httpd_can_network_connect 1\n' : ''}`);
        } else {
          ctx.print(`SELinux is preventing ${comm} from ${perm} access on the file ${name}.\n\n*****  Plugin restorecon (99.5 confidence) suggests   ************************\n\nIf you want to fix the label.\n${name} default label should be the policy default for its path (current: ${ctxType(tctx)}).\nThen you can run restorecon. The access attempt may have been stopped due to insufficient permissions to access a parent directory in which case try to change the following command accordingly.\nDo\n# /sbin/restorecon -v PATH/${name}\n`);
        }
      }
      return 0;
    }
  },
  {
    name: 'audit2why', cat: 'SELinux', summary: 'Explain why AVC denials happened', usage: 'ausearch -m avc -ts recent | audit2why', fidelity: 'partial',
    run(ctx) {
      const input = ctx.stdin ?? ctx.sys.audit.join('\n');
      const avcs = input.split('\n').filter(l => l.includes('avc:'));
      if (!avcs.length) { ctx.print('Nothing to do'); return 0; }
      for (const l of avcs) ctx.print(`${l}\n\n\tWas caused by:\n\t\tMissing type enforcement (TE) allow rule.\n\n\t\tYou can use audit2allow to generate a loadable module to allow this access.\n\t\t(Prefer fixing labels/booleans/port types first — custom modules widen policy.)\n`);
      return 0;
    }
  },
  {
    name: 'openssl', cat: 'Security', summary: 'Certificate inspection (x509 -noout -dates|-enddate|-subject)', usage: 'openssl x509 -in CERT -noout -dates', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const [sub] = ctx.args;
      if (sub === 'version') { ctx.print('OpenSSL 3.2.2 4 Jun 2024 (Library: OpenSSL 3.2.2 4 Jun 2024)'); return 0; }
      if (sub !== 'x509') return fail(ctx, '(simulator supports: openssl x509 -in FILE -noout -dates|-enddate|-subject|-issuer, openssl version)');
      const inIdx = ctx.args.indexOf('-in');
      const file = inIdx >= 0 ? ctx.args[inIdx + 1] : null;
      try { if (file) sys.fs.readFile(file, ctx.cwd, ctx.user); } catch (e) { ctx.error(`Could not open file or uri for loading certificate from ${file}: ${e.message}`); return 1; }
      const cert = sys.certs?.[ctx.abs(file || '')] || { subject: `CN = ${sys.hostname}`, issuer: 'CN = Lab Internal CA', notBefore: 'Oct  9 00:00:00 2025 GMT', notAfter: sys.certExpired ? 'Oct  8 23:59:59 2026 GMT' : 'Oct  9 23:59:59 2027 GMT' };
      if (ctx.args.includes('-subject')) ctx.print(`subject=${cert.subject}`);
      if (ctx.args.includes('-issuer')) ctx.print(`issuer=${cert.issuer}`);
      if (ctx.args.includes('-dates')) ctx.print(`notBefore=${cert.notBefore}\nnotAfter=${cert.notAfter}`);
      if (ctx.args.includes('-enddate')) ctx.print(`notAfter=${cert.notAfter}`);
      const ce = ctx.args.indexOf('-checkend');
      if (ce >= 0) { const expired = sys.certExpired; ctx.print(expired ? 'Certificate will expire' : 'Certificate will not expire'); return expired ? 1 : 0; }
      return 0;
    }
  }
];
