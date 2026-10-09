// Account management. /etc/passwd, /etc/group and /etc/shadow are generated from this model.
import { S_IFDIR, S_IFREG } from '../vfs.js';
import { userByName, groupByName, groupByGid, supplementaryGids, currentUser, writeSeed } from '../system.js';
import { getopt, syslogDate } from './util.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

function nextId(list, key, min = 1000) {
  let id = min;
  const used = new Set(list.map(x => x[key]));
  while (used.has(id)) id++;
  return id;
}

function secureLog(sys, msg) {
  try {
    const node = sys.fs.resolve('/var/log/secure').node;
    node.data += `${syslogDate(sys.clock())} ${sys.hostname.split('.')[0]} ${msg}\n`;
  } catch { /* ignore */ }
}

function canSudo(sys, name) {
  if (name === 'root') return true;
  if (groupByName(sys, 'wheel')?.members.includes(name)) return true;
  try {
    const dir = sys.fs.resolve('/etc/sudoers.d').node;
    for (const f of sys.fs.list(dir)) {
      const text = sys.fs.get(dir.entries.get(f)).data || '';
      if (text.split('\n').some(l => new RegExp(`^\\s*${name}\\s+ALL\\s*=`).test(l))) return true;
      for (const g of sys.groups.filter(g => g.members.includes(name) || userByName(sys, name)?.gid === g.gid)) {
        if (text.split('\n').some(l => new RegExp(`^\\s*%${g.name}\\s+ALL\\s*=`).test(l))) return true;
      }
    }
  } catch { /* none */ }
  return false;
}

function runAs(ctx, userName, argv, { login = false } = {}) {
  const sys = ctx.sys;
  const sess = sys.session;
  const saved = { user: sess.user, cwd: sess.cwd };
  sess.user = userName;
  if (login) sess.cwd = userByName(sys, userName).home;
  try {
    let buf = '';
    const sub = ctx.shell.makeCtx(argv, ctx.stdin, (s) => { buf += s; }, (s) => ctx.error(s.replace(/\n$/, '')));
    const code = ctx.shell.dispatch(argv, sub);
    if (buf) ctx.write(buf);
    return code;
  } finally {
    // A nested "su -" inside sudo changes the session itself; only restore if unchanged.
    if (sess.user === userName) { sess.user = saved.user; sess.cwd = saved.cwd; }
  }
}

function createHome(sys, u) {
  const fs = sys.fs;
  if (fs.exists(u.home)) return false;
  const node = fs.create(u.home, '/', S_IFDIR, { mode: 0o700, umask: 0 });
  node.uid = u.uid; node.gid = u.gid;
  node.ctx = 'unconfined_u:object_r:user_home_dir_t:s0';
  for (const [f, content] of [['.bashrc', '# .bashrc\n[ -f /etc/bashrc ] && . /etc/bashrc\n'], ['.bash_profile', '# .bash_profile\n[ -f ~/.bashrc ] && . ~/.bashrc\n'], ['.bash_logout', '# ~/.bash_logout\n']]) {
    const n = writeSeed(sys, `${u.home}/${f}`, content, 0o644, u.uid, u.gid);
    n.ctx = 'unconfined_u:object_r:user_home_t:s0';
  }
  return true;
}

export const userCommands = [
  {
    name: 'id', cat: 'Users', summary: 'Print user and group IDs', usage: 'id [-u|-g|-G] [-n] [user]', fidelity: 'functional',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'ugGnrZ');
      const sys = ctx.sys;
      const u = rest[0] ? userByName(sys, rest[0]) : userByName(sys, sys.session.user);
      if (!u) return fail(ctx, `'${rest[0]}': no such user`);
      const gids = [u.gid, ...supplementaryGids(sys, u.name).filter(g => g !== u.gid)];
      const gn = (g) => groupByGid(sys, g)?.name ?? g;
      if (o.u) { ctx.print(o.n ? u.name : u.uid); return 0; }
      if (o.g) { ctx.print(o.n ? gn(u.gid) : u.gid); return 0; }
      if (o.G) { ctx.print(gids.map(g => (o.n ? gn(g) : g)).join(' ')); return 0; }
      if (o.Z) { ctx.print('unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023'); return 0; }
      ctx.print(`uid=${u.uid}(${u.name}) gid=${u.gid}(${gn(u.gid)}) groups=${gids.map(g => `${g}(${gn(g)})`).join(',')}${rest[0] ? '' : ' context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023'}`);
      return 0;
    }
  },
  { name: 'whoami', cat: 'Users', summary: 'Print effective user name', usage: 'whoami', fidelity: 'functional', run(ctx) { ctx.print(ctx.sys.session.user); return 0; } },
  {
    name: 'groups', cat: 'Users', summary: 'Print group memberships', usage: 'groups [user]', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      const names = ctx.args.length ? ctx.args : [sys.session.user];
      for (const n of names) {
        const u = userByName(sys, n);
        if (!u) { ctx.error(`groups: '${n}': no such user`); return 1; }
        const list = [groupByGid(sys, u.gid)?.name, ...sys.groups.filter(g => g.members.includes(n) && g.gid !== u.gid).map(g => g.name)];
        ctx.print(ctx.args.length ? `${n} : ${list.join(' ')}` : list.join(' '));
      }
      return 0;
    }
  },
  {
    name: 'getent', cat: 'Users', summary: 'Query NSS databases (passwd, group, shadow, hosts)', usage: 'getent passwd|group|shadow|hosts [key]', fidelity: 'functional',
    run(ctx) {
      const [db, key] = ctx.args;
      const sys = ctx.sys;
      if (db === 'passwd' || db === 'group' || db === 'shadow') {
        if (db === 'shadow' && !ctx.isRoot()) return 2;
        const text = sys.fs.get(sys.fs.resolve(`/etc/${db}`).node.ino).gen();
        const ls = text.trim().split('\n').filter(l => !key || l.split(':')[0] === key || l.split(':')[2] === key);
        if (!ls.length) return 2;
        ctx.print(ls.join('\n'));
        return 0;
      }
      if (db === 'hosts' || db === 'ahosts') {
        const hostsFile = sys.fs.readFile('/etc/hosts', '/');
        const entries = hostsFile.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (!key) { ctx.print(entries.join('\n')); return 0; }
        const hit = entries.find(l => l.split(/\s+/).slice(1).includes(key));
        if (hit) { ctx.print(hit.replace(/\s+/, '      ')); return 0; }
        const ip = sys.net.dnsServerUp ? (sys.net.dns[key] || sys.net.dns[`${key}.lab.example.com`]) : null;
        if (ip) { ctx.print(`${ip}      ${key}`); return 0; }
        return 2;
      }
      return fail(ctx, `Unknown database: ${db || ''}`, 1);
    }
  },
  {
    name: 'useradd', cat: 'Users', summary: 'Create a user (private group, home dir per login.defs)', usage: 'useradd [-u UID] [-g GROUP] [-G G1,G2] [-s SHELL] [-c COMMENT] [-d HOME] [-m|-M] [-e YYYY-MM-DD] [-r] name', fidelity: 'functional', bin: '/usr/sbin/useradd',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o, rest, bad } = getopt(ctx.args, 'mMrN', 'ugGscde', { 'create-home': 'm', uid: '=u', gid: '=g', groups: '=G', shell: '=s', comment: '=c', home: '=d', expiredate: '=e', system: 'r' });
      if (bad) return fail(ctx, bad, 2);
      const name = rest[0];
      const sys = ctx.sys;
      if (!name) return fail(ctx, 'Usage: useradd [options] LOGIN', 2);
      if (!/^[a-z_][a-z0-9_-]*\$?$/.test(name)) return fail(ctx, `invalid user name '${name}'`, 3);
      if (userByName(sys, name)) return fail(ctx, `user '${name}' already exists`, 9);
      const uid = o.u !== undefined ? Number(o.u) : nextId(sys.users, 'uid', o.r ? 201 : 1000);
      if (sys.users.some(u => u.uid === uid)) return fail(ctx, `UID ${uid} is not unique`, 4);
      let gid;
      if (o.g) {
        const g = groupByName(sys, o.g) || groupByGid(sys, Number(o.g));
        if (!g) return fail(ctx, `group '${o.g}' does not exist`, 6);
        gid = g.gid;
      } else {
        if (groupByName(sys, name)) return fail(ctx, `group ${name} exists - if you want to add this user to that group, use -g.`, 9);
        gid = sys.groups.some(g => g.gid === uid) ? nextId(sys.groups, 'gid', o.r ? 201 : 1000) : uid;
        sys.groups.push({ name, gid, members: [] });
      }
      const supp = o.G ? String(o.G).split(',') : [];
      for (const gname of supp) if (!groupByName(sys, gname)) return fail(ctx, `group '${gname}' does not exist`, 6);
      const u = { name, uid, gid, gecos: o.c || '', home: o.d || `/home/${name}`, shell: o.s || '/bin/bash', password: 'none', locked: true, expire: o.e || '', maxDays: 99999 };
      sys.users.push(u);
      for (const gname of supp) groupByName(sys, gname).members.push(name);
      if (!o.M && !o.r) createHome(sys, u);
      secureLog(sys, `useradd[${4200 + sys.users.length}]: new user: name=${name}, UID=${uid}, GID=${gid}, home=${u.home}, shell=${u.shell}, from=/dev/pts/1`);
      return 0;
    }
  },
  {
    name: 'usermod', cat: 'Users', summary: 'Modify a user (-aG, -G, -g, -s, -c, -d -m, -L, -U, -e, -l, -u)', usage: 'usermod [-a -G G1,G2] [-g GROUP] [-s SHELL] [-L|-U] [-e DATE] name', fidelity: 'functional', bin: '/usr/sbin/usermod',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o, rest, bad } = getopt(ctx.args, 'aLUm', 'gGscdelu', { append: 'a', groups: '=G', gid: '=g', shell: '=s', lock: 'L', unlock: 'U', expiredate: '=e', login: '=l', home: '=d' });
      if (bad) return fail(ctx, bad, 2);
      const sys = ctx.sys;
      const u = userByName(sys, rest[0]);
      if (!u) return fail(ctx, `user '${rest[0] ?? ''}' does not exist`, 6);
      if (o.G !== undefined) {
        const list = String(o.G).split(',').filter(Boolean);
        for (const g of list) if (!groupByName(sys, g)) return fail(ctx, `group '${g}' does not exist`, 6);
        if (!o.a) for (const g of sys.groups) g.members = g.members.filter(m => m !== u.name);
        for (const g of list) { const grp = groupByName(sys, g); if (!grp.members.includes(u.name)) grp.members.push(u.name); }
      } else if (o.a) return fail(ctx, '-a flag is ONLY allowed with the -G flag', 2);
      if (o.g) { const g = groupByName(sys, o.g) || groupByGid(sys, Number(o.g)); if (!g) return fail(ctx, `group '${o.g}' does not exist`, 6); u.gid = g.gid; }
      if (o.s) u.shell = o.s;
      if (o.c !== undefined) u.gecos = o.c;
      if (o.e !== undefined) u.expire = o.e;
      if (o.u) u.uid = Number(o.u);
      if (o.L) u.locked = true;
      if (o.U) { if (u.password !== 'set') { ctx.error("usermod: unlocking the user's password would result in a passwordless account."); return 0; } u.locked = false; }
      if (o.d) {
        const old = u.home;
        u.home = o.d;
        if (o.m) ctx.shell.run(`mv ${old} ${o.d}`, { record: false });
      }
      if (o.l) { for (const g of sys.groups) g.members = g.members.map(m => (m === u.name ? o.l : m)); u.name = o.l; }
      return 0;
    }
  },
  {
    name: 'userdel', cat: 'Users', summary: 'Delete a user (-r removes home and mail spool)', usage: 'userdel [-r] [-f] name', fidelity: 'functional', bin: '/usr/sbin/userdel',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o, rest } = getopt(ctx.args, 'rf', '', { remove: 'r', force: 'f' });
      const sys = ctx.sys;
      const u = userByName(sys, rest[0]);
      if (!u) return fail(ctx, `user '${rest[0] ?? ''}' does not exist`, 6);
      if (u.uid === 0) return fail(ctx, 'refusing to delete root in this simulator', 8);
      const proc = sys.processes.find(p => p.user === u.name);
      if (proc && !o.f) return fail(ctx, `user ${u.name} is currently used by process ${proc.pid}`, 8);
      sys.users = sys.users.filter(x => x !== u);
      for (const g of sys.groups) g.members = g.members.filter(m => m !== u.name);
      const pg = groupByGid(sys, u.gid);
      if (pg && pg.name === u.name && !sys.users.some(x => x.gid === pg.gid)) sys.groups = sys.groups.filter(g => g !== pg);
      if (o.r && sys.fs.exists(u.home)) {
        const r = sys.fs.resolve(u.home);
        sys.fs.unlink(r.parent, r.name);
      }
      return 0;
    }
  },
  {
    name: 'groupadd', cat: 'Users', summary: 'Create a group', usage: 'groupadd [-g GID] [-r] name', fidelity: 'functional', bin: '/usr/sbin/groupadd',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o, rest } = getopt(ctx.args, 'rf', 'g', { gid: '=g', system: 'r' });
      const sys = ctx.sys;
      const name = rest[0];
      if (!name) return fail(ctx, 'Usage: groupadd [options] GROUP', 2);
      if (groupByName(sys, name)) return o.f ? 0 : fail(ctx, `group '${name}' already exists`, 9);
      const gid = o.g !== undefined ? Number(o.g) : nextId(sys.groups, 'gid', o.r ? 201 : 1000);
      if (sys.groups.some(g => g.gid === gid)) return fail(ctx, `GID '${gid}' already exists`, 4);
      sys.groups.push({ name, gid, members: [] });
      return 0;
    }
  },
  {
    name: 'groupdel', cat: 'Users', summary: 'Delete a group', usage: 'groupdel name', fidelity: 'functional', bin: '/usr/sbin/groupdel',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const sys = ctx.sys;
      const g = groupByName(sys, ctx.args[0]);
      if (!g) return fail(ctx, `group '${ctx.args[0] ?? ''}' does not exist`, 6);
      const primary = sys.users.find(u => u.gid === g.gid);
      if (primary) return fail(ctx, `cannot remove the primary group of user '${primary.name}'`, 8);
      sys.groups = sys.groups.filter(x => x !== g);
      return 0;
    }
  },
  {
    name: 'groupmod', cat: 'Users', summary: 'Rename a group or change its GID', usage: 'groupmod [-n NEW] [-g GID] name', fidelity: 'functional', bin: '/usr/sbin/groupmod',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o, rest } = getopt(ctx.args, '', 'ng');
      const g = groupByName(ctx.sys, rest[0]);
      if (!g) return fail(ctx, `group '${rest[0] ?? ''}' does not exist`, 6);
      if (o.n) g.name = o.n;
      if (o.g) g.gid = Number(o.g);
      return 0;
    }
  },
  {
    name: 'passwd', cat: 'Users', summary: 'Set password (simulated, no real hashing) / lock / status', usage: 'passwd [-l|-u|-S|-e|-d] [--stdin] [user]', fidelity: 'partial',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'luSedx', '', { stdin: 'stdin', lock: 'l', unlock: 'u', status: 'S', expire: 'e', delete: 'd' });
      const sys = ctx.sys;
      const target = rest[0] || sys.session.user;
      const u = userByName(sys, target);
      if (!u) return fail(ctx, `user '${target}' does not exist`, 1);
      const root = ctx.isRoot();
      if (!root && (target !== sys.session.user || o.l || o.u || o.e || o.d)) { ctx.error('passwd: Only root can specify a user name.'); return 1; }
      if (o.S) { ctx.print(`${u.name} ${u.locked ? 'LK' : u.password === 'set' ? 'PS' : 'NP'} 2026-10-01 0 ${u.maxDays ?? 99999} 7 -1 (${u.locked ? 'Password locked.' : u.password === 'set' ? 'Password set, SHA512 crypt.' : 'Empty password.'})`); return 0; }
      if (o.l) { u.locked = true; ctx.print(`Locking password for user ${u.name}.\npasswd: Success`); return 0; }
      if (o.u) { if (u.password !== 'set') { ctx.error(`passwd: Unsafe operation (use -f to force)`); return 1; } u.locked = false; ctx.print(`Unlocking password for user ${u.name}.\npasswd: Success`); return 0; }
      if (o.e) { u.mustChange = true; ctx.print(`Expiring password for user ${u.name}.\npasswd: Success`); return 0; }
      if (o.d) { u.password = 'none'; u.locked = false; ctx.print(`Removing password for user ${u.name}.\npasswd: Success`); return 0; }
      if (!root) { ctx.error('passwd: (simulator) interactive password entry is not simulated for non-root users.'); return 1; }
      if (o.stdin && !(ctx.stdin || '').trim()) { ctx.error('passwd: empty password on stdin'); return 1; }
      u.password = 'set';
      u.locked = false;
      ctx.print(`Changing password for user ${u.name}.`);
      if (!o.stdin) ctx.print('(simulator: password prompt skipped — a password is now recorded as set; nothing is hashed or stored)');
      ctx.print('passwd: all authentication tokens updated successfully.');
      return 0;
    }
  },
  {
    name: 'chage', cat: 'Users', summary: 'Password aging (-l, -M, -m, -W, -E, -d 0)', usage: 'chage [-l] [-M MAX] [-m MIN] [-W WARN] [-E YYYY-MM-DD] [-d 0] user', fidelity: 'partial',
    run(ctx) {
      const { o, rest } = getopt(ctx.args, 'l', 'MmWEdI', { list: 'l', maxdays: '=M', mindays: '=m', warndays: '=W', expiredate: '=E', lastday: '=d' });
      const u = userByName(ctx.sys, rest[0]);
      if (!u) return fail(ctx, `user '${rest[0] ?? ''}' does not exist in /etc/passwd`, 1);
      if (o.l) {
        if (!ctx.isRoot() && u.name !== ctx.sys.session.user) return fail(ctx, 'Permission denied.', 1);
        ctx.print(`Last password change\t\t\t\t\t: ${u.mustChange ? 'password must be changed' : 'Oct 01, 2026'}`);
        ctx.print(`Password expires\t\t\t\t\t: ${u.maxDays && u.maxDays < 99999 ? `${u.maxDays} days after last change` : 'never'}`);
        ctx.print(`Password inactive\t\t\t\t\t: never`);
        ctx.print(`Account expires\t\t\t\t\t\t: ${u.expire || 'never'}`);
        ctx.print(`Minimum number of days between password change\t\t: ${u.minDays ?? 0}`);
        ctx.print(`Maximum number of days between password change\t\t: ${u.maxDays ?? 99999}`);
        ctx.print(`Number of days of warning before password expires\t: ${u.warnDays ?? 7}`);
        return 0;
      }
      if (!ctx.requireRoot()) return 1;
      if (o.M !== undefined) u.maxDays = Number(o.M);
      if (o.m !== undefined) u.minDays = Number(o.m);
      if (o.W !== undefined) u.warnDays = Number(o.W);
      if (o.E !== undefined) u.expire = o.E === '-1' ? '' : o.E;
      if (o.d !== undefined) u.mustChange = String(o.d) === '0';
      return 0;
    }
  },
  {
    name: 'su', cat: 'Users', summary: 'Switch user (no password needed from root; others must use sudo)', usage: 'su [-] [-c CMD] [user]', fidelity: 'partial',
    run(ctx) {
      const args = ctx.args.slice();
      let login = false, cmd = null;
      while (args.length && args[0].startsWith('-')) {
        const a = args.shift();
        if (a === '-' || a === '-l' || a === '--login') login = true;
        else if (a === '-c') cmd = args.shift();
      }
      const target = args[0] || 'root';
      const sys = ctx.sys;
      const u = userByName(sys, target);
      if (!u) return fail(ctx, `user ${target} does not exist or the user entry does not contain all the required fields`, 1);
      if (!ctx.isRoot()) {
        ctx.error('Password: (simulator: password authentication is not simulated)');
        ctx.error('su: Authentication failure');
        secureLog(sys, `su[${sys.nextPid}]: FAILED SU (to ${target}) ${sys.session.user} on pts/1`);
        return 1;
      }
      if (u.shell.endsWith('nologin')) { ctx.print('This account is currently not available.'); return 1; }
      if (cmd) return runAs(ctx, target, ['bash', '-c', cmd]);
      sys.session.stack.push({ user: sys.session.user, cwd: sys.session.cwd });
      sys.session.user = target;
      if (login) sys.session.cwd = u.home;
      secureLog(sys, `su[${sys.nextPid}]: (to ${target}) root on pts/1`);
      return 0;
    }
  },
  {
    name: 'sudo', cat: 'Users', summary: 'Run a command as root (wheel group or /etc/sudoers.d entry required)', usage: 'sudo [-u USER] [-i] [-l] command', fidelity: 'partial',
    run(ctx) {
      const args = ctx.args.slice();
      let asUser = 'root', login = false, list = false;
      while (args.length && args[0].startsWith('-')) {
        const a = args.shift();
        if (a === '-u') asUser = args.shift();
        else if (a === '-i' || a === '-s') login = true;
        else if (a === '-l') list = true;
      }
      const sys = ctx.sys;
      const me = sys.session.user;
      if (!canSudo(sys, me)) {
        ctx.error(`${me} is not in the sudoers file.`);
        secureLog(sys, `sudo[${sys.nextPid}]: ${me} : user NOT in sudoers ; TTY=pts/1 ; PWD=${sys.session.cwd} ; USER=root ; COMMAND=${args.join(' ')}`);
        return 1;
      }
      if (list) { ctx.print(`User ${me} may run the following commands on ${sys.hostname.split('.')[0]}:\n    (ALL) ALL`); return 0; }
      if (!userByName(sys, asUser)) return fail(ctx, `unknown user ${asUser}`, 1);
      secureLog(sys, `sudo[${sys.nextPid}]: ${me} : TTY=pts/1 ; PWD=${sys.session.cwd} ; USER=${asUser} ; COMMAND=${args.join(' ') || '/bin/bash'}`);
      if (login && !args.length) {
        sys.session.stack.push({ user: me, cwd: sys.session.cwd });
        sys.session.user = asUser;
        sys.session.cwd = userByName(sys, asUser).home;
        return 0;
      }
      if (!args.length) return fail(ctx, 'usage: sudo [-u user] command', 1);
      return runAs(ctx, asUser, args);
    }
  },
  {
    name: 'bash', cat: 'Shell', summary: 'Run a script file or -c command string', usage: 'bash [-x] script.sh [args] | bash -c "command"', fidelity: 'partial',
    run(ctx) {
      const args = ctx.args.filter(a => a !== '-x' && a !== '-e' && a !== '-n');
      if (!args.length) { ctx.error('bash: (simulator) already running an interactive shell'); return 0; }
      if (args[0] === '-c') return ctx.shell.runScriptText(args[1] || '', 'bash', args.slice(2), ctx);
      try {
        const text = ctx.fs.readFile(args[0], ctx.cwd, ctx.user);
        if (ctx.args.includes('-n')) return 0;
        return ctx.shell.runScriptText(text, args[0], args.slice(1), ctx);
      } catch (e) { ctx.error(`bash: ${args[0]}: ${e.message.split(': ').pop()}`); return 127; }
    }
  },
  {
    name: 'visudo', cat: 'Users', summary: 'Check sudoers syntax (-c); editing is done with the editor', usage: 'visudo -c | visudo -f /etc/sudoers.d/FILE', fidelity: 'partial', bin: '/usr/sbin/visudo',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      const { o } = getopt(ctx.args, 'cq', 'f');
      if (o.c) {
        const files = ['/etc/sudoers', ...ctx.fs.list(ctx.fs.resolve('/etc/sudoers.d').node).map(f => `/etc/sudoers.d/${f}`)];
        let code = 0;
        for (const f of files) {
          const text = ctx.fs.readFile(f, '/');
          const bad = text.split('\n').findIndex(l => l.trim() && !l.trim().startsWith('#') && !/^(Defaults|%?\w[\w.-]*\s+\S+\s*=|#includedir|@includedir|\w+_Alias)/.test(l.trim()));
          if (bad >= 0) { ctx.print(`${f}:${bad + 1}:1: syntax error`); code = 1; } else ctx.print(`${f}: parsed OK`);
        }
        return code;
      }
      return { editor: o.f || '/etc/sudoers' };
    }
  },
  {
    name: 'who', cat: 'Users', summary: 'Show logged-in sessions', usage: 'who', fidelity: 'static',
    run(ctx) { ctx.print('student  pts/0        2026-10-09 09:01 (10.10.40.50)\nroot     pts/1        2026-10-09 09:00 (10.10.40.50)'); return 0; }
  },
  {
    name: 'w', cat: 'Users', summary: 'Show who is logged on and what they are doing', usage: 'w', fidelity: 'static',
    run(ctx) { ctx.shell.registry.get('uptime').run(ctx); ctx.print('USER     TTY        LOGIN@   IDLE   JCPU   PCPU WHAT\nstudent  pts/0      09:01    5:12   0.02s  0.02s -bash\nroot     pts/1      09:00    0.00s  0.05s  0.00s w'); return 0; }
  },
  {
    name: 'last', cat: 'Users', summary: 'Show login and reboot history', usage: 'last [-x] [-n N]', fidelity: 'static',
    run(ctx) {
      const x = ctx.args.includes('-x');
      ctx.print('student  pts/0        10.10.40.50      Fri Oct  9 09:01   still logged in\nroot     pts/1        10.10.40.50      Fri Oct  9 09:00   still logged in');
      if (x) ctx.print('runlevel (to lvl 3)   6.12.0-55.9.1.el Mon Aug 25 09:00 - 09:00  (00:00)');
      ctx.print('reboot   system boot  6.12.0-55.9.1.el Mon Aug 25 09:00   still running');
      if (x) ctx.print('shutdown system down  6.12.0-55.9.1.el Mon Aug 25 08:58 - 09:00  (00:02)');
      ctx.print('\nwtmp begins Mon Aug 25 09:00:00 2026');
      return 0;
    }
  }
];

export { canSudo, currentUser, S_IFREG };
