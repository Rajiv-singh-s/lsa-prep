// Package management: dnf/yum, rpm and flatpak. Repositories are read from the .repo files in
// /etc/yum.repos.d, so editing them (or breaking DNS/routing to the mirror) changes behaviour.
import { S_IFREG } from '../vfs.js';
import { columns } from './util.js';
import { resolveName } from './network.js';
import { writeSeed } from '../system.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

export function parseRepoFiles(sys) {
  const repos = [];
  const dir = sys.fs.tryResolve('/etc/yum.repos.d');
  if (!dir) return repos;
  for (const f of sys.fs.list(dir.node).filter(n => n.endsWith('.repo'))) {
    let text;
    try { text = sys.fs.readFile(`/etc/yum.repos.d/${f}`, '/'); } catch { continue; }
    let cur = null;
    for (const raw of text.split('\n')) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      const sec = /^\[([^\]]+)\]$/.exec(l);
      if (sec) { cur = { id: sec[1], file: f, enabled: true, gpgcheck: true, baseurl: '', name: sec[1] }; repos.push(cur); continue; }
      const kv = /^(\w+)\s*=\s*(.*)$/.exec(l);
      if (!kv || !cur) continue;
      const [, k, v] = kv;
      if (k === 'enabled') cur.enabled = v === '1' || v === 'true';
      else if (k === 'gpgcheck') cur.gpgcheck = v === '1' || v === 'true';
      else cur[k] = v;
    }
  }
  if (sys.repoOverrides) for (const r of repos) if (r.id in sys.repoOverrides) r.enabled = sys.repoOverrides[r.id];
  return repos;
}

/** Which simulated catalogue a repo serves, and whether it is reachable right now. */
function repoStatus(sys, repo) {
  const url = repo.baseurl || repo.mirrorlist || repo.metalink || '';
  const catalogue = /appstream/i.test(url) ? 'rhel-10-appstream' : /baseos/i.test(url) ? 'rhel-10-baseos' : null;
  if (!url) return { ok: false, error: `Cannot find a valid baseurl for repo: ${repo.id}` };
  if (url.startsWith('file://')) {
    const path = url.slice(7);
    return sys.fs.exists(`${path}/repodata`) || sys.fs.exists(path) ? { ok: !!catalogue, catalogue, error: catalogue ? null : `Curl error (37): Couldn't read a file:// file for ${url}/repodata/repomd.xml` } : { ok: false, error: `Curl error (37): Couldn't read a file:// file for ${url}/repodata/repomd.xml [Couldn't open file ${path}/repodata/repomd.xml]` };
  }
  const m = /^https?:\/\/([^/:]+)/.exec(url);
  if (!m) return { ok: false, error: `Invalid baseurl ${url}` };
  const res = resolveName(sys, m[1]);
  if (!res.ip) return { ok: false, error: `Curl error (6): Couldn't resolve host name for ${url}/repodata/repomd.xml [Could not resolve host: ${m[1]}]` };
  if (!sys.net.reachable.includes(res.ip)) return { ok: false, error: `Curl error (28): Timeout was reached for ${url}/repodata/repomd.xml [Connection timed out after 30001 milliseconds]` };
  if (!catalogue) return { ok: false, error: `Status code: 404 for ${url}/repodata/repomd.xml (IP: ${res.ip})` };
  return { ok: true, catalogue };
}

function loadRepos(ctx, { quiet = false } = {}) {
  const sys = ctx.sys;
  const enabled = parseRepoFiles(sys).filter(r => r.enabled);
  const usable = [];
  let fatal = null;
  for (const r of enabled) {
    const st = repoStatus(sys, r);
    if (st.ok) usable.push({ ...r, catalogue: st.catalogue });
    else {
      if (!quiet) ctx.error(`Errors during downloading metadata for repository '${r.id}':\n  - ${st.error}`);
      if (r.skip_if_unavailable !== 'True' && r.skip_if_unavailable !== '1' && !fatal) fatal = `Error: Failed to download metadata for repo '${r.id}': Cannot download repomd.xml: Cannot download repodata/repomd.xml: All mirrors were tried`;
    }
  }
  return { usable, fatal };
}

function availableFrom(sys, usable) {
  const cats = new Set(usable.map(r => r.catalogue));
  return Object.values(sys.packages.available).filter(p => cats.has(p.repo)).map(p => ({ ...p, repoId: usable.find(r => r.catalogue === p.repo).id }));
}

function installPackage(sys, p) {
  sys.packages.installed[p.name] = { ...p, installedAt: sys.clock() };
  for (const f of p.files || []) {
    if (!sys.fs.exists(f)) {
      const n = writeSeed(sys, f, f.includes('/bin/') || f.includes('/sbin/') || f.includes('/libexec/') ? `\u007fELF simulated binary: ${f.split('/').pop()}` : '', f.includes('bin') || f.includes('libexec') ? 0o755 : 0o644);
      n.size = 50000;
    }
  }
  const svcMap = { 'mariadb-server': ['mariadb', '/usr/lib/systemd/system/mariadb.service'], nginx: ['nginx', '/usr/lib/systemd/system/nginx.service'], autofs: ['autofs', '/usr/lib/systemd/system/autofs.service'], 'nfs-utils': ['nfs-server', '/usr/lib/systemd/system/nfs-server.service'] };
  if (svcMap[p.name]) {
    const [name, path] = svcMap[p.name];
    const svc = sys.services[name];
    if (svc && !sys.fs.exists(path)) writeSeed(sys, path, `[Unit]\nDescription=${svc.description}\n\n[Service]\nType=${svc.type || 'simple'}\nExecStart=${svc.exec}\n\n[Install]\nWantedBy=multi-user.target\n`);
    if (name === 'mariadb' && !sys.users.some(u => u.name === 'mysql')) { sys.users.push({ name: 'mysql', uid: 27, gid: 27, gecos: 'MySQL Server', home: '/var/lib/mysql', shell: '/sbin/nologin', password: 'none', locked: true }); sys.groups.push({ name: 'mysql', gid: 27, members: [] }); }
  }
  if (p.name === 'nginx' && !sys.fs.exists('/etc/nginx/nginx.conf')) writeSeed(sys, '/etc/nginx/nginx.conf', 'user nginx;\nworker_processes auto;\nhttp {\n    server { listen 80; root /usr/share/nginx/html; }\n}\n');
  if (p.name === 'autofs' && !sys.fs.exists('/etc/auto.misc')) writeSeed(sys, '/etc/auto.misc', '# key  options  location\ncd      -fstype=iso9660,ro,nosuid,nodev :/dev/cdrom\n');
}

function removePackage(sys, name) {
  const p = sys.packages.installed[name];
  delete sys.packages.installed[name];
  for (const f of p.files || []) { const r = sys.fs.tryResolve(f); if (r && r.node.type === S_IFREG && !f.startsWith('/etc/')) sys.fs.unlink(r.parent, r.name); }
  for (const svc of Object.values(sys.services)) if (svc.package === name) { sys.processes = sys.processes.filter(x => x.service !== svc.name); svc.active = 'inactive'; svc.pid = null; }
}

function recordHistory(sys, cmdline, action, names) {
  sys.packages.history ||= [{ id: 1, cmd: 'install @^minimal-environment', date: '2026-08-25 09:00', action: 'Install', altered: 412, names: [] }, { id: 2, cmd: '-y update openssl', date: '2026-10-01 03:12', action: 'Upgrade', altered: 2, names: ['openssl'] }];
  const id = sys.packages.history.length + 1;
  sys.packages.history.push({ id, cmd: cmdline, date: new Date(sys.clock()).toISOString().slice(0, 16).replace('T', ' '), action, altered: names.length, names, removed: action === 'Removed' ? names.map(n => ({ ...sys.packages.removedCache?.[n] })) : null });
  return id;
}

function dnf(ctx) {
  const sys = ctx.sys;
  const args = ctx.args.slice();
  const assumeYes = args.includes('-y') || args.includes('--assumeyes');
  const securityOnly = args.includes('--security');
  const enableIdx = args.findIndex(a => a.startsWith('--enablerepo'));
  const pos = args.filter(a => !a.startsWith('-'));
  const verb = pos[0];
  const names = pos.slice(1);
  if (!verb) { ctx.error(`usage: ${ctx.name} [options] COMMAND\n(simulator supports: install, remove, reinstall, update/upgrade, check-update, list, info, search, provides, repolist, history, clean, makecache, config-manager, updateinfo)`); return 1; }
  const needRoot = ['install', 'remove', 'erase', 'reinstall', 'update', 'upgrade', 'downgrade', 'clean', 'makecache', 'config-manager', 'groupinstall', 'autoremove'];
  if (needRoot.includes(verb) && !ctx.isRoot()) { ctx.error('Error: This command has to be run with superuser privileges (under the root user on most systems).'); return 1; }
  if (verb === 'module') { ctx.error('Error: modularity was removed in RHEL 10 (dnf module is unavailable). Install the package version you need directly.'); return 1; }
  if (verb === 'config-manager') {
    const add = args.find(a => a.startsWith('--add-repo'));
    const url = add?.includes('=') ? add.split('=')[1] : args[args.indexOf('--add-repo') + 1];
    if (url) {
      const id = url.replace(/^\w+:\/\//, '').replace(/[/:]/g, '_');
      sys.fs.writeFile(`/etc/yum.repos.d/${id}.repo`, '/', `[${id}]\nname=created by dnf config-manager from ${url}\nbaseurl=${url}\nenabled=1\n`, {});
      ctx.print(`Adding repo from: ${url}`);
      return 0;
    }
    const setEn = args.includes('--set-enabled') || args.includes('--enable');
    const setDis = args.includes('--set-disabled') || args.includes('--disable');
    if (setEn || setDis) { sys.repoOverrides ||= {}; for (const n of names) sys.repoOverrides[n] = !!setEn; return 0; }
    return fail(ctx, 'config-manager: use --add-repo URL | --set-enabled ID | --set-disabled ID');
  }
  if (verb === 'repolist') {
    const all = parseRepoFiles(sys);
    const list = args.includes('all') || names.includes('all') ? all : names.includes('disabled') ? all.filter(r => !r.enabled) : all.filter(r => r.enabled);
    ctx.print(columns([['repo id', 'repo name', ...(names.includes('all') ? ['status'] : [])], ...list.map(r => [r.id, r.name, ...(names.includes('all') ? [r.enabled ? 'enabled' : 'disabled'] : [])])]));
    return 0;
  }
  if (verb === 'clean') { ctx.print(`${names.includes('all') ? '47 files removed' : 'Cache was expired'}`); return 0; }
  if (verb === 'history') {
    sys.packages.history ||= [{ id: 1, cmd: 'install @^minimal-environment', date: '2026-08-25 09:00', action: 'Install', altered: 412, names: [] }, { id: 2, cmd: '-y update openssl', date: '2026-10-01 03:12', action: 'Upgrade', altered: 2, names: ['openssl'] }];
    const h = sys.packages.history;
    if (names[0] === 'undo' || names[0] === 'rollback') {
      if (!ctx.isRoot()) { ctx.error('Error: This command has to be run with superuser privileges.'); return 1; }
      const t = h.find(x => x.id === Number(names[1]));
      if (!t) return fail(ctx, `Transaction ${names[1]} not found`);
      if (t.action === 'Install' && t.names.length) { for (const n of t.names) if (sys.packages.installed[n]) removePackage(sys, n); ctx.print(`Removing: ${t.names.join(', ')}\nComplete!`); recordHistory(sys, `history undo ${t.id}`, 'Removed', t.names); return 0; }
      if (t.action === 'Removed' && t.names.length) { for (const n of t.names) { const p = sys.packages.available[n] || sys.packages.removedCache?.[n]; if (p) installPackage(sys, p); } ctx.print(`Installing: ${t.names.join(', ')}\nComplete!`); recordHistory(sys, `history undo ${t.id}`, 'Install', t.names); return 0; }
      ctx.error('Error: (simulator) undo is supported for install/remove transactions only'); return 1;
    }
    if (names[0] === 'info') { const t = h.find(x => x.id === Number(names[1])) || h[h.length - 1]; ctx.print(`Transaction ID : ${t.id}\nBegin time     : ${t.date}\nCommand Line   : ${t.cmd}\nPackages Altered:\n${t.names.map(n => `    ${t.action} ${n}`).join('\n')}`); return 0; }
    ctx.print(columns([['ID', '| Command line', '| Date and time', '| Action(s)', '| Altered'], ...h.slice().reverse().map(t => [t.id, `| ${t.cmd}`, `| ${t.date}`, `| ${t.action}`, `| ${String(t.altered).padStart(4)}`])]));
    return 0;
  }
  const installed = sys.packages.installed;
  if (verb === 'list') {
    const which = names[0];
    const rows = [];
    if (!which || which === 'installed' || which === '--installed') { rows.push(['Installed Packages']); for (const p of Object.values(installed)) rows.push([`${p.name}.${p.arch}`, `${p.version}-${p.release}`, `@${p.repo}`]); }
    if (!which || which === 'available') {
      const { usable, fatal } = loadRepos(ctx);
      if (fatal && !usable.length) { ctx.error(fatal); return 1; }
      rows.push(['Available Packages']);
      for (const p of availableFrom(sys, usable)) if (!installed[p.name]) rows.push([`${p.name}.${p.arch}`, `${p.version}-${p.release}`, p.repoId]);
    }
    const filtered = which && !['installed', 'available', '--installed', 'updates'].includes(which) ? rows.filter(r => r.length === 1 || r[0].startsWith(which)) : rows;
    ctx.print(columns(filtered));
    return 0;
  }
  if (verb === 'check-update' || verb === 'updateinfo' || (verb === 'update' && !names.length && args.includes('--assumeno'))) {
    const { fatal } = loadRepos(ctx);
    if (fatal) { ctx.error(fatal); return 1; }
    const sec = sys.packages.pendingUpdates || [{ name: 'openssl', version: '3.2.2', release: '17.el10', advisory: 'RHSA-2026:4012', severity: 'Important' }, { name: 'kernel', version: '6.12.0', release: '55.12.1.el10_0', advisory: 'RHSA-2026:4188', severity: 'Moderate' }];
    if (verb === 'updateinfo') { if (names[0] === 'list') sec.forEach(u => ctx.print(`${u.advisory} ${u.severity}/Sec. ${u.name}-${u.version}-${u.release}.x86_64`)); else ctx.print(`Updates Information Summary: available\n    ${sec.length} Security notice(s)\n        ${sec.filter(s => s.severity === 'Important').length} Important Security notice(s)\n        ${sec.filter(s => s.severity === 'Moderate').length} Moderate Security notice(s)`); return 0; }
    for (const u of sec) ctx.print(`${`${u.name}.x86_64`.padEnd(32)} ${`${u.version}-${u.release}`.padEnd(24)} rhel-10-baseos`);
    return sec.length ? 100 : 0;
  }
  if (verb === 'info' || verb === 'search' || verb === 'provides' || verb === 'whatprovides') {
    const { usable, fatal } = loadRepos(ctx, { quiet: verb !== 'search' });
    if (fatal && !usable.length && verb !== 'info') { ctx.error(fatal); return 1; }
    const pool = [...Object.values(installed).map(p => ({ ...p, repoId: '@System' })), ...availableFrom(sys, usable).filter(p => !installed[p.name])];
    if (verb === 'search') {
      const term = names.join(' ').toLowerCase();
      const hits = pool.filter(p => p.name.includes(term) || p.summary.toLowerCase().includes(term));
      if (!hits.length) { ctx.print(`No matches found.`); return 1; }
      ctx.print(`======================== Name & Summary Matched: ${term} ========================`);
      hits.forEach(p => ctx.print(`${p.name}.${p.arch} : ${p.summary}`));
      return 0;
    }
    if (verb === 'info') {
      let code = 1;
      for (const n of names) { const p = pool.find(x => x.name === n); if (!p) continue; code = 0; ctx.print(`${installed[n] ? 'Installed' : 'Available'} Packages\nName         : ${p.name}\nVersion      : ${p.version}\nRelease      : ${p.release}\nArchitecture : ${p.arch}\nSize         : ${p.size}\nSource       : ${p.name}-${p.version}-${p.release}.src.rpm\nRepository   : ${p.repoId}\nSummary      : ${p.summary}\nLicense      : (simulated)\n`); }
      if (code) ctx.error(`Error: No matching Packages to list`);
      return code;
    }
    const target = names[0] || '';
    const hits = pool.filter(p => (p.files || []).some(f => f === target || f.endsWith('/' + target.replace(/^\*\//, '')) || (target.startsWith('*/') && f.endsWith(target.slice(1)))));
    if (!hits.length) { ctx.error(`Error: No matches found. If searching for a file, try specifying the full path or using a wildcard prefix ("*/") at the beginning.`); return 1; }
    hits.forEach(p => ctx.print(`${p.name}-${p.version}-${p.release}.${p.arch} : ${p.summary}\nRepo        : ${p.repoId}\nMatched from:\nFilename    : ${(p.files || []).find(f => f.endsWith(target.replace(/^\*/, '')))}\n`));
    return 0;
  }
  if (verb === 'install' || verb === 'reinstall' || verb === 'groupinstall') {
    if (!names.length) return fail(ctx, 'Error: Need to pass a list of pkgs to install');
    const { usable, fatal } = loadRepos(ctx);
    if (fatal && !usable.length) { ctx.error(fatal); return 1; }
    const avail = availableFrom(sys, usable);
    const toInstall = [];
    let code = 0;
    for (const n of names) {
      if (installed[n] && verb !== 'reinstall') { ctx.print(`Package ${n}-${installed[n].version}-${installed[n].release}.${installed[n].arch} is already installed.`); continue; }
      const p = avail.find(x => x.name === n) || (verb === 'reinstall' && installed[n]);
      if (!p) { ctx.error(`No match for argument: ${n}`); code = 1; continue; }
      toInstall.push(p);
    }
    if (code && !toInstall.length) { ctx.error('Error: Unable to find a match: ' + names.filter(n => !installed[n]).join(' ')); return 1; }
    if (!toInstall.length) { ctx.print('Dependencies resolved.\nNothing to do.\nComplete!'); return 0; }
    const gpgOff = usable.filter(r => !r.gpgcheck);
    ctx.print('Dependencies resolved.\n' + '='.repeat(78) + '\n Package            Architecture   Version                 Repository        Size\n' + '='.repeat(78) + `\n${verb === 'reinstall' ? 'Reinstalling' : 'Installing'}:\n` + toInstall.map(p => ` ${p.name.padEnd(18)} ${p.arch.padEnd(14)} ${`${p.version}-${p.release}`.padEnd(23)} ${String(p.repoId || p.repo).padEnd(17)} ${p.size}`).join('\n') + `\n\nTransaction Summary\n${'='.repeat(78)}\nInstall  ${toInstall.length} Package${toInstall.length > 1 ? 's' : ''}\n`);
    if (!assumeYes) ctx.print('Is this ok [y/N]: y   (simulator: confirmation assumed — use -y in scripts)');
    if (gpgOff.length) ctx.error(`Warning: gpgcheck is disabled for ${gpgOff.map(r => r.id).join(', ')} — package signatures are not being verified.`);
    for (const p of toInstall) installPackage(sys, p);
    ctx.print(`Downloading Packages:\nRunning transaction check\nTransaction check succeeded.\nRunning transaction test\nTransaction test succeeded.\nRunning transaction\n${toInstall.map(p => `  Installing       : ${p.name}-${p.version}-${p.release}.${p.arch}`).join('\n')}\n\nInstalled:\n  ${toInstall.map(p => `${p.name}-${p.version}-${p.release}.${p.arch}`).join('  ')}\n\nComplete!`);
    recordHistory(sys, `${verb} ${names.join(' ')}`, 'Install', toInstall.map(p => p.name));
    return code;
  }
  if (verb === 'remove' || verb === 'erase' || verb === 'autoremove') {
    const targets = names.filter(n => installed[n]);
    for (const n of names) if (!installed[n]) ctx.error(`No match for argument: ${n}`);
    if (!targets.length) { ctx.print('No packages marked for removal.\nDependencies resolved.\nNothing to do.\nComplete!'); return names.length ? 1 : 0; }
    const protectedPkgs = ['systemd', 'kernel', 'bash', 'coreutils', 'sudo'];
    const prot = targets.filter(n => protectedPkgs.includes(n));
    if (prot.length) { ctx.error(`Error: \n Problem: The operation would result in removing the following protected packages: ${prot.join(', ')}`); return 1; }
    if (!assumeYes) ctx.print('Is this ok [y/N]: y   (simulator: confirmation assumed)');
    sys.packages.removedCache ||= {};
    for (const n of targets) { sys.packages.removedCache[n] = { ...installed[n] }; removePackage(sys, n); }
    ctx.print(`Removed:\n  ${targets.join('  ')}\n\nComplete!`);
    recordHistory(sys, `remove ${targets.join(' ')}`, 'Removed', targets);
    return 0;
  }
  if (verb === 'update' || verb === 'upgrade' || verb === 'downgrade') {
    const { fatal } = loadRepos(ctx);
    if (fatal) { ctx.error(fatal); return 1; }
    const pend = (sys.packages.pendingUpdates ||= [{ name: 'openssl', version: '3.2.2', release: '17.el10', advisory: 'RHSA-2026:4012', severity: 'Important' }, { name: 'kernel', version: '6.12.0', release: '55.12.1.el10_0', advisory: 'RHSA-2026:4188', severity: 'Moderate' }]);
    const sel = pend.filter(u => !names.length || names.includes(u.name)).filter(() => !securityOnly || true);
    if (!sel.length) { ctx.print('Dependencies resolved.\nNothing to do.\nComplete!'); return 0; }
    if (!assumeYes) ctx.print('Is this ok [y/N]: y   (simulator: confirmation assumed)');
    for (const u of sel) if (installed[u.name]) { installed[u.name].version = u.version; installed[u.name].release = u.release; }
    sys.packages.pendingUpdates = pend.filter(u => !sel.includes(u));
    ctx.print(`Upgraded:\n  ${sel.map(u => `${u.name}-${u.version}-${u.release}.x86_64`).join('\n  ')}\n\nComplete!`);
    if (sel.some(u => u.name === 'kernel')) ctx.print('(note) A new kernel is installed; it is used after the next reboot. Check with: grubby --default-kernel');
    recordHistory(sys, `${verb} ${names.join(' ')}`.trim(), 'Upgrade', sel.map(u => u.name));
    return 0;
  }
  void enableIdx;
  return fail(ctx, `No such command: ${verb}. Please use /usr/bin/${ctx.name} --help`);
}

function rpm(ctx) {
  const sys = ctx.sys;
  const args = ctx.args;
  const flags = args.filter(a => a.startsWith('-')).join('').replace(/-/g, '');
  const names = args.filter(a => !a.startsWith('-'));
  const installed = sys.packages.installed;
  const nevra = (p) => `${p.name}-${p.version}-${p.release}.${p.arch}`;
  if (args.includes('--import')) { if (!ctx.requireRoot('rpm')) return 1; (sys.packages.gpgKeys ||= []).push(names[0]); return 0; }
  if (flags.startsWith('e') || args.includes('--erase')) { if (!ctx.requireRoot('rpm')) return 1; for (const n of names) { if (!installed[n]) { ctx.error(`error: package ${n} is not installed`); return 1; } removePackage(sys, n); } return 0; }
  if (/^[iUF]/.test(flags)) { ctx.error(`error: open of ${names[0]} failed: No such file or directory\n(simulator: local .rpm files are not simulated — use dnf install from a repository)`); return 1; }
  if (flags.includes('V')) {
    const targets = flags.includes('a') ? Object.keys(installed) : names;
    let code = 0;
    for (const n of targets) {
      const p = installed[n];
      if (!p) { ctx.print(`package ${n} is not installed`); code = 1; continue; }
      for (const f of p.files || []) {
        const r = sys.fs.tryResolve(f);
        if (!r) { ctx.print(`missing     ${f.startsWith('/etc/') ? 'c' : ' '} ${f}`); code = 1; continue; }
        if (r.node.mtime > (p.installedAt || 0) + 1000 && f.startsWith('/etc/')) { ctx.print(`S.5....T.  c ${f}`); code = 1; }
        if ((r.node.mode & 0o7777) !== ((f.includes('bin') ? 0o755 : 0o644)) && f.includes('bin') && !(r.node.mode & 0o4000)) { ctx.print(`.M.......    ${f}`); code = 1; }
      }
    }
    return code;
  }
  if (flags.includes('q')) {
    if (flags.includes('a')) { Object.values(installed).forEach(p => ctx.print(nevra(p))); return 0; }
    if (flags.includes('f')) {
      let code = 0;
      for (const f of names) { const abs = ctx.abs(f); const p = Object.values(installed).find(x => (x.files || []).includes(abs)); if (p) ctx.print(nevra(p)); else { ctx.print(sys.fs.exists(abs) ? `file ${abs} is not owned by any package` : `error: file ${abs}: No such file or directory`); code = 1; } }
      return code;
    }
    let code = 0;
    for (const n of names) {
      const p = installed[n];
      if (!p) { ctx.print(`package ${n} is not installed`); code = 1; continue; }
      if (flags.includes('i')) ctx.print(`Name        : ${p.name}\nVersion     : ${p.version}\nRelease     : ${p.release}\nArchitecture: ${p.arch}\nInstall Date: ${new Date(p.installedAt).toUTCString()}\nSize        : ${p.size}\nSignature   : RSA/SHA256, key ID 199e2f91fd431d51\nSource RPM  : ${p.name}-${p.version}-${p.release}.src.rpm\nSummary     : ${p.summary}`);
      else if (flags.includes('l')) (p.files || []).forEach(f => ctx.print(f));
      else if (flags.includes('c')) (p.files || []).filter(f => f.startsWith('/etc/')).forEach(f => ctx.print(f));
      else if (flags.includes('d')) ctx.print(`/usr/share/doc/${p.name}/README`);
      else if (args.includes('--changelog')) ctx.print(`* Wed Sep 03 2026 Red Hat <rhel@redhat.com> - ${p.version}-${p.release}\n- Security and bug fixes (simulated changelog)`);
      else ctx.print(nevra(p));
    }
    return code;
  }
  if (flags.includes('K')) { ctx.print(`${names[0]}: digests signatures OK`); return 0; }
  return fail(ctx, '(simulator supports: -qa, -q, -qi, -ql, -qc, -qd, -qf, -V, -e, --import, --changelog)');
}

function flatpak(ctx) {
  const sys = ctx.sys;
  sys.flatpak ||= { remotes: [], installed: [] };
  const fp = sys.flatpak;
  const args = ctx.args.filter(a => !a.startsWith('-') || a.startsWith('--if-not-exists') === false && false);
  const pos = ctx.args.filter(a => !a.startsWith('-'));
  const verb = pos[0];
  const catalogue = { 'org.gnome.Calculator': 'Calculator', 'org.mozilla.firefox': 'Firefox', 'org.libreoffice.LibreOffice': 'LibreOffice', 'com.visualstudio.code': 'Visual Studio Code', 'org.gimp.GIMP': 'GNU Image Manipulation Program' };
  void args;
  const userScope = ctx.args.includes('--user');
  if (!verb) return fail(ctx, 'usage: flatpak remotes|remote-add|remote-delete|search|install|list|uninstall|update');
  if (['remote-add', 'remote-delete', 'install', 'uninstall', 'update'].includes(verb) && !userScope && !ctx.isRoot()) { ctx.error('error: Flatpak system operation requires polkit authorization (simulator: use sudo or --user)'); return 1; }
  switch (verb) {
    case 'remotes': ctx.print(columns([['Name', 'Options'], ...fp.remotes.map(r => [r.name, r.user ? 'user' : 'system'])])); return 0;
    case 'remote-add': {
      const [, name, url] = pos;
      if (!name || !url) return fail(ctx, 'error: NAME and LOCATION must be specified');
      if (fp.remotes.some(r => r.name === name)) { if (ctx.args.includes('--if-not-exists')) return 0; ctx.error(`error: Remote ${name} already exists`); return 1; }
      const host = (/^https?:\/\/([^/]+)/.exec(url) || [])[1];
      if (host && !resolveName(sys, host).ip && !['dl.flathub.org', 'flathub.org'].includes(host)) { ctx.error(`error: Can't load uri ${url}: Could not resolve hostname`); return 1; }
      fp.remotes.push({ name, url, user: userScope });
      return 0;
    }
    case 'remote-delete': fp.remotes = fp.remotes.filter(r => r.name !== pos[1]); return 0;
    case 'search': {
      if (!fp.remotes.length) { ctx.print('No matches found'); return 1; }
      const term = (pos[1] || '').toLowerCase();
      const hits = Object.entries(catalogue).filter(([id, n]) => id.toLowerCase().includes(term) || n.toLowerCase().includes(term));
      ctx.print(columns([['Name', 'Application ID', 'Version', 'Branch', 'Remotes'], ...hits.map(([id, n]) => [n, id, '1.0', 'stable', fp.remotes[0].name])]));
      return hits.length ? 0 : 1;
    }
    case 'install': {
      const [, remote, app] = pos.length >= 3 ? pos : [null, fp.remotes[0]?.name, pos[1]];
      if (!fp.remotes.some(r => r.name === remote)) { ctx.error(`error: No remote refs found for '${app}'${remote ? ` in remote ${remote}` : ''} (add a remote first: flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo)`); return 1; }
      if (!catalogue[app]) { ctx.error(`error: No remote refs found similar to '${app}'`); return 1; }
      if (fp.installed.some(i => i.id === app)) { ctx.print(`Skipping: ${app}/x86_64/stable is already installed`); return 0; }
      fp.installed.push({ id: app, name: catalogue[app], remote, user: userScope });
      ctx.print(`Looking for matches…\n\n        ID                                  Branch   Op   Remote    Download\n 1. [✓] ${app.padEnd(36)} stable   i    ${remote.padEnd(9)} 62.1 MB\n\nInstallation complete.`);
      return 0;
    }
    case 'list': ctx.print(columns([['Name', 'Application ID', 'Version', 'Branch', 'Installation'], ...fp.installed.map(i => [i.name, i.id, '1.0', 'stable', i.user ? 'user' : 'system'])])); return 0;
    case 'uninstall': { const id = pos[1]; if (!fp.installed.some(i => i.id === id)) { ctx.error(`error: ${id}/*unspecified*/*unspecified* not installed`); return 1; } fp.installed = fp.installed.filter(i => i.id !== id); ctx.print(`Uninstall complete.`); return 0; }
    case 'update': ctx.print('Looking for updates…\nNothing to do.'); return 0;
    case 'info': { const i = fp.installed.find(x => x.id === pos[1]); if (!i) { ctx.error(`error: ${pos[1]} not installed`); return 1; } ctx.print(`${i.name}\n\n          ID: ${i.id}\n         Ref: app/${i.id}/x86_64/stable\n      Origin: ${i.remote}\nInstallation: ${i.user ? 'user' : 'system'}`); return 0; }
    case 'run': ctx.print(`(simulator) ${pos[1]} would start in a sandbox on a graphical session.`); return 0;
    default: return fail(ctx, `error: '${verb}' is not a flatpak command`);
  }
}

export const packageCommands = [
  { name: 'dnf', cat: 'Packages', summary: 'Install/remove/update packages; repos come from /etc/yum.repos.d/*.repo', usage: 'dnf [-y] install|remove|update|list|info|search|provides|repolist|history|config-manager PKG', fidelity: 'partial', run: dnf },
  { name: 'yum', cat: 'Packages', summary: 'Compatibility alias for dnf on RHEL 8+', usage: 'yum ...', fidelity: 'partial', run: dnf },
  { name: 'rpm', cat: 'Packages', summary: 'Query/verify installed RPMs (-qa, -qi, -ql, -qf, -qc, -V, -e, --import)', usage: 'rpm -qa | rpm -qi PKG | rpm -qf FILE | rpm -V PKG', fidelity: 'partial', run: rpm },
  { name: 'flatpak', cat: 'Packages', summary: 'Flatpak remotes and applications (EX200 objective on RHEL 10)', usage: 'flatpak remote-add --if-not-exists flathub URL | flatpak install flathub APP | flatpak list', fidelity: 'partial', pkg: 'flatpak', run: flatpak }
];
