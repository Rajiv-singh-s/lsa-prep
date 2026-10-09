// Process, memory, kernel-parameter and scheduling commands.
import { getopt, columns, syslogDate } from './util.js';
import { loadString, memory, userByName, addProcess } from '../system.js';
import { stopService } from './services.js';

const fail = (ctx, msg, code = 1) => { ctx.error(`${ctx.name}: ${msg}`); return code; };

export const SIGNALS = { HUP: 1, INT: 2, QUIT: 3, KILL: 9, USR1: 10, USR2: 12, TERM: 15, CHLD: 17, CONT: 18, STOP: 19, TSTP: 20 };
const SIG_BY_NUM = Object.fromEntries(Object.entries(SIGNALS).map(([k, v]) => [v, k]));

function parseSignal(s) {
  if (!s) return 15;
  const up = s.toUpperCase().replace(/^SIG/, '');
  if (/^\d+$/.test(up)) return Number(up);
  return SIGNALS[up] ?? null;
}

/** Deliver a signal to a simulated process. Returns error string or null. */
export function deliverSignal(sys, pid, sig, actor) {
  const p = sys.processes.find(x => x.pid === pid);
  if (!p) return 'No such process';
  if (actor.uid !== 0 && userByName(sys, p.user)?.uid !== actor.uid) return 'Operation not permitted';
  if (pid === 1) return null; // init ignores signals it has no handler for
  const name = SIG_BY_NUM[sig] || String(sig);
  if (p.state === 'Z') return null; // already dead; only the parent reaping it removes the entry
  if (p.state === 'D' && name !== 'CONT') { p.pendingSignal = name; return null; } // delivered only when the I/O completes
  if (name === 'STOP' || name === 'TSTP') { p.state = 'T'; return null; }
  if (name === 'CONT') { if (p.state === 'T') p.state = 'S'; return null; }
  if (name === 'HUP' && p.service) { sys.journal.push({ time: sys.clock(), unit: `${p.service}.service`, prio: 6, msg: `Received SIGHUP, reloading configuration.`, ident: p.service }); return null; }
  if (p.ignores?.includes(name)) return null;
  if (['TERM', 'KILL', 'INT', 'QUIT', 'HUP', 'USR1', 'USR2'].includes(name) || sig === 9 || sig === 15) {
    killTree(sys, p, name);
    return null;
  }
  if (name === 'CHLD') {
    // Parent reaps zombie children when poked (if it is well-behaved).
    sys.processes = sys.processes.filter(c => !(c.ppid === pid && c.state === 'Z' && !p.neverReaps));
  }
  return null;
}

function killTree(sys, p, name) {
  const svc = p.service && sys.services[p.service];
  sys.processes = sys.processes.filter(x => x !== p);
  // Orphans are re-parented to PID 1, which reaps zombies immediately.
  for (const c of sys.processes) if (c.ppid === p.pid) { if (c.state === 'Z') c.reap = true; c.ppid = 1; }
  sys.processes = sys.processes.filter(c => !c.reap);
  for (const f of sys.fs.inodes.values()) if (f.openBy?.includes(p.pid)) { f.openBy = f.openBy.filter(x => x !== p.pid); if (f.nlink <= 0 && !f.openBy.length) sys.fs.inodes.delete(f.ino); }
  if (svc && svc.pid === p.pid) {
    stopService(sys, svc.name, { result: name === 'KILL' ? 'signal' : null, signal: name });
  }
}

function procsFor(ctx, o) {
  let list = ctx.sys.processes.slice().sort((a, b) => a.pid - b.pid);
  if (o.u) list = list.filter(p => String(o.u).split(',').includes(p.user));
  if (o.p) list = list.filter(p => String(o.p).split(',').map(Number).includes(p.pid));
  if (o.C) list = list.filter(p => procName(p) === o.C);
  return list;
}

export function procName(p) {
  const first = p.cmd.replace(/^\[|\]$/g, '').split(/\s+/)[0];
  return first.split('/').pop().replace(/^-/, '').replace(/:$/, '');
}

const vsz = (p) => Math.round(p.rssMb * 1024 * 3.2 + 20000);

export const procCommands = [
  {
    name: 'ps', cat: 'Processes', summary: 'Report process status (aux, -ef, -eo, --sort, -p, -u, -C)', usage: 'ps aux | ps -ef | ps -eo pid,ppid,user,stat,%cpu,%mem,cmd --sort=-%cpu', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      const bsd = args[0] && !args[0].startsWith('-') && /^[auxfwe]+$/.test(args[0]) ? args.shift() : '';
      const { o } = getopt(args, 'efAlLH', 'oupC', { sort: '=sort', format: '=o', forest: 'forest' });
      let list = procsFor(ctx, o);
      if (!bsd && !o.e && !o.A && !o.u && !o.p && !o.C) list = list.filter(p => p.tty === 'pts/1');
      if (o.sort) {
        const keys = String(o.sort).split(',');
        list.sort((a, b) => {
          for (const k of keys) {
            const desc = k.startsWith('-');
            const f = k.replace(/^[-+]/, '');
            const v = { '%cpu': 'cpu', pcpu: 'cpu', '%mem': 'mem', pmem: 'mem', pid: 'pid', rss: 'rssMb', vsz: 'rssMb', user: 'user', comm: 'cmd', ppid: 'ppid' }[f] || 'pid';
            const r = typeof a[v] === 'string' ? a[v].localeCompare(b[v]) : a[v] - b[v];
            if (r) return desc ? -r : r;
          }
          return 0;
        });
      }
      const stat = (p) => p.state + (p.nice < 0 ? '<' : p.nice > 0 ? 'N' : '') + (p.pid === p.sessionLeader ? 's' : '');
      if (o.o) {
        const fields = String(o.o).split(',');
        const head = { pid: 'PID', ppid: 'PPID', user: 'USER', stat: 'STAT', state: 'S', '%cpu': '%CPU', pcpu: '%CPU', '%mem': '%MEM', pmem: '%MEM', cmd: 'CMD', args: 'COMMAND', comm: 'COMMAND', rss: 'RSS', vsz: 'VSZ', ni: 'NI', nice: 'NI', tty: 'TT', etime: 'ELAPSED', time: 'TIME', nlwp: 'NLWP', wchan: 'WCHAN' };
        const val = (p, f) => ({ pid: p.pid, ppid: p.ppid, user: p.user, stat: stat(p), state: p.state, '%cpu': p.cpu.toFixed(1), pcpu: p.cpu.toFixed(1), '%mem': p.mem.toFixed(1), pmem: p.mem.toFixed(1), cmd: p.cmd, args: p.cmd, comm: procName(p), rss: Math.round(p.rssMb * 1024), vsz: vsz(p), ni: p.nice, nice: p.nice, tty: p.tty, etime: '01:05:12', time: p.time, nlwp: 1, wchan: p.state === 'D' ? 'nfs_wait_bit_killable' : '-' }[f] ?? '-');
        ctx.print(columns([fields.map(f => head[f] || f.toUpperCase()), ...list.map(p => fields.map(f => val(p, f)))]));
        return 0;
      }
      if (bsd.includes('u')) {
        ctx.print(columns([['USER', 'PID', '%CPU', '%MEM', 'VSZ', 'RSS', 'TTY', 'STAT', 'START', 'TIME', 'COMMAND'],
          ...list.map(p => [p.user, p.pid, p.cpu.toFixed(1), p.mem.toFixed(1), vsz(p), Math.round(p.rssMb * 1024), p.tty, stat(p), p.start, p.time, p.state === 'Z' ? `[${procName(p)}] <defunct>` : p.cmd])], { align: ['', 'r', 'r', 'r', 'r', 'r'] }));
      } else if (o.f || bsd.includes('f')) {
        ctx.print(columns([['UID', 'PID', 'PPID', 'C', 'STIME', 'TTY', 'TIME', 'CMD'], ...list.map(p => [p.user, p.pid, p.ppid, Math.round(p.cpu), p.start, p.tty, p.time.padStart(8, '0:0'), p.state === 'Z' ? `[${procName(p)}] <defunct>` : p.cmd])], { align: ['', 'r', 'r', 'r'] }));
      } else {
        ctx.print(columns([['PID', 'TTY', 'TIME', 'CMD'], ...list.map(p => [p.pid, p.tty, '00:00:00', procName(p)])], { align: ['r'] }));
      }
      return 0;
    }
  },
  {
    name: 'top', cat: 'Processes', summary: 'One snapshot of the process table (interactive mode not simulated)', usage: 'top [-b -n 1] [-o %MEM]', fidelity: 'partial',
    run(ctx) {
      const { o } = getopt(ctx.args, 'bcHi', 'nodpu');
      const sys = ctx.sys;
      const m = memory(sys);
      const procs = sys.processes.slice().sort((a, b) => (o.o === '%MEM' ? b.mem - a.mem : b.cpu - a.cpu) || a.pid - b.pid);
      const states = { R: 0, S: 0, D: 0, T: 0, Z: 0 };
      for (const p of procs) states[p.state] = (states[p.state] || 0) + 1;
      const busy = procs.reduce((s, p) => s + p.cpu, 0) / 4;
      const wa = procs.filter(p => p.state === 'D').length ? 38.5 : 0.3;
      const us = Math.min(99, busy * 0.85).toFixed(1), sy = Math.min(20, busy * 0.12 + 0.6).toFixed(1);
      const idle = Math.max(0, 100 - us - sy - wa).toFixed(1);
      ctx.print(`top - ${new Date(sys.clock()).toISOString().slice(11, 19)} up 45 days, 18:22,  2 users,  load average: ${loadString(sys).split(' ').join(', ')}`);
      ctx.print(`Tasks: ${procs.length + 200} total,   ${states.R + 1} running, ${200 + states.S} sleeping,   ${states.T} stopped,   ${states.Z} zombie`);
      ctx.print(`%Cpu(s): ${us.padStart(4)} us, ${sy.padStart(4)} sy,  0.0 ni, ${idle.padStart(4)} id, ${wa.toFixed(1).padStart(4)} wa,  0.0 hi,  0.1 si,  0.0 st`);
      ctx.print(`MiB Mem :  ${m.total.toFixed(1)} total,  ${m.free.toFixed(1)} free,  ${m.used.toFixed(1)} used,  ${m.buff.toFixed(1)} buff/cache`);
      ctx.print(`MiB Swap:   ${m.swapTotal.toFixed(1)} total,   ${(m.swapTotal - m.swapUsed).toFixed(1)} free,     ${m.swapUsed.toFixed(1)} used.  ${m.available.toFixed(1)} avail Mem`);
      ctx.print('');
      ctx.print(columns([['PID', 'USER', 'PR', 'NI', 'VIRT', 'RES', 'SHR', 'S', '%CPU', '%MEM', 'TIME+', 'COMMAND'],
        ...procs.slice(0, Number(o.n) > 1 ? 30 : 15).map(p => [p.pid, p.user.slice(0, 8), 20 + p.nice, p.nice, vsz(p), Math.round(p.rssMb * 1024), Math.round(p.rssMb * 300), p.state, p.cpu.toFixed(1), p.mem.toFixed(1), `${p.time}.00`, procName(p)])], { align: ['r', '', 'r', 'r', 'r', 'r', 'r', '', 'r', 'r', 'r'] }));
      if (!o.b) ctx.error('(simulator: top shows one snapshot; interactive keys are not supported — use top -b -n 1 in scripts)');
      return 0;
    }
  },
  {
    name: 'kill', cat: 'Processes', summary: 'Send a signal to processes (default SIGTERM)', usage: 'kill [-SIGNAL|-s SIG|-l] PID...', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      if (args[0] === '-l' || args[0] === '-L') { ctx.print(Object.entries(SIGNALS).map(([k, v]) => `${String(v).padStart(2)}) SIG${k}`).join('\t')); return 0; }
      let sig = 15;
      if (args[0] === '-s' || args[0] === '-n') { args.shift(); sig = parseSignal(args.shift()); }
      else if (args[0]?.startsWith('-')) sig = parseSignal(args.shift().slice(1));
      if (sig === null) return fail(ctx, 'invalid signal specification');
      if (!args.length) return fail(ctx, 'usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ...', 2);
      let code = 0;
      for (const a of args) {
        const pid = Number(a.replace(/^%/, ''));
        if (!Number.isInteger(pid)) { ctx.error(`bash: kill: ${a}: arguments must be process or job IDs`); code = 1; continue; }
        const err = deliverSignal(ctx.sys, pid, sig, ctx.user);
        if (err) { ctx.error(`bash: kill: (${pid}) - ${err}`); code = 1; }
      }
      return code;
    }
  },
  {
    name: 'pkill', cat: 'Processes', summary: 'Signal processes by name/user', usage: 'pkill [-SIGNAL] [-u USER] [-f] [-x] PATTERN', fidelity: 'functional',
    run(ctx) { return pmatch(ctx, true); }
  },
  {
    name: 'pgrep', cat: 'Processes', summary: 'Find processes by name/user', usage: 'pgrep [-l|-a] [-u USER] [-f] [-x] PATTERN', fidelity: 'functional',
    run(ctx) { return pmatch(ctx, false); }
  },
  {
    name: 'pidof', cat: 'Processes', summary: 'Find PIDs of a program', usage: 'pidof NAME', fidelity: 'functional',
    run(ctx) { const pids = ctx.sys.processes.filter(p => procName(p) === ctx.args[0]).map(p => p.pid).sort((a, b) => b - a); if (!pids.length) return 1; ctx.print(pids.join(' ')); return 0; }
  },
  {
    name: 'pstree', cat: 'Processes', summary: 'Show the process tree', usage: 'pstree [-p] [PID]', fidelity: 'functional',
    run(ctx) {
      const showPid = ctx.args.includes('-p');
      const rootPid = Number(ctx.args.find(a => /^\d+$/.test(a)) || 1);
      const procs = ctx.sys.processes;
      const label = (p) => procName(p) + (showPid ? `(${p.pid})` : '');
      const lines = [];
      const walk = (p, prefix, last, top) => {
        lines.push(top ? label(p) : `${prefix}${last ? '└─' : '├─'}${label(p)}`);
        const kids = procs.filter(c => c.ppid === p.pid && c.pid !== p.pid).sort((a, b) => a.pid - b.pid);
        kids.forEach((k, i) => walk(k, top ? '' : prefix + (last ? '  ' : '│ '), i === kids.length - 1, false));
      };
      const root = procs.find(p => p.pid === rootPid);
      if (!root) return 1;
      walk(root, '', true, true);
      ctx.print(lines.join('\n'));
      return 0;
    }
  },
  {
    name: 'free', cat: 'Memory', summary: 'Memory and swap usage', usage: 'free [-m|-g|-h|-b] [-t]', fidelity: 'functional',
    run(ctx) {
      const { o } = getopt(ctx.args, 'mghbkwtl', '', { human: 'h', mega: 'm', giga: 'g' });
      const m = memory(ctx.sys);
      const conv = (mib) => {
        if (o.h) return mib >= 1024 ? `${(mib / 1024).toFixed(1)}Gi` : `${mib}Mi`;
        if (o.m) return String(mib);
        if (o.g) return String(Math.floor(mib / 1024));
        if (o.b) return String(mib * 1048576);
        return String(mib * 1024);
      };
      const rows = [['', 'total', 'used', 'free', 'shared', 'buff/cache', 'available'],
        ['Mem:', conv(m.total), conv(m.used), conv(m.free), conv(m.shared), conv(m.buff), conv(m.available)],
        ['Swap:', conv(m.swapTotal), conv(m.swapUsed), conv(m.swapTotal - m.swapUsed)]];
      if (o.t) rows.push(['Total:', conv(m.total + m.swapTotal), conv(m.used + m.swapUsed), conv(m.free + m.swapTotal - m.swapUsed)]);
      ctx.print(columns(rows, { align: ['', 'r', 'r', 'r', 'r', 'r', 'r'] }));
      return 0;
    }
  },
  {
    name: 'uptime', cat: 'System', summary: 'Uptime, users and load averages', usage: 'uptime [-p|-s]', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      if (ctx.args.includes('-p')) { ctx.print('up 6 weeks, 3 days, 18 hours, 22 minutes'); return 0; }
      if (ctx.args.includes('-s')) { ctx.print(new Date(sys.bootTime).toISOString().replace('T', ' ').slice(0, 19)); return 0; }
      ctx.print(` ${new Date(sys.clock()).toISOString().slice(11, 19)} up 45 days, 18:22,  2 users,  load average: ${loadString(sys).split(' ').join(', ')}`);
      return 0;
    }
  },
  {
    name: 'uname', cat: 'System', summary: 'Kernel and machine information', usage: 'uname [-a|-r|-n|-m|-s|-o|-v]', fidelity: 'functional',
    run(ctx) {
      const { o } = getopt(ctx.args, 'arnmsovpi', '', { all: 'a', 'kernel-release': 'r' });
      const sys = ctx.sys;
      const parts = { s: 'Linux', n: sys.hostname, r: sys.kernel, v: '#1 SMP PREEMPT_DYNAMIC Wed Sep 3 10:00:00 UTC 2026', m: 'x86_64', p: 'x86_64', i: 'x86_64', o: 'GNU/Linux' };
      if (o.a) { ctx.print(['s', 'n', 'r', 'v', 'm', 'p', 'i', 'o'].map(k => parts[k]).join(' ')); return 0; }
      const sel = ['s', 'n', 'r', 'v', 'm', 'p', 'i', 'o'].filter(k => o[k]);
      ctx.print((sel.length ? sel : ['s']).map(k => parts[k]).join(' '));
      return 0;
    }
  },
  {
    name: 'hostname', cat: 'System', summary: 'Show or set the transient hostname', usage: 'hostname [-s|-f|-I] [NAME]', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      if (ctx.args.includes('-I')) { ctx.print(sys.net.interfaces.filter(i => i.name !== 'lo' && i.up).flatMap(i => i.ipv4.map(a => a.split('/')[0])).join(' ') + ' '); return 0; }
      if (ctx.args.includes('-s')) { ctx.print(sys.hostname.split('.')[0]); return 0; }
      const name = ctx.args.find(a => !a.startsWith('-'));
      if (name) { if (!ctx.requireRoot()) return 1; sys.hostname = name; ctx.error('(simulator) transient hostname set; use hostnamectl set-hostname to persist it'); return 0; }
      ctx.print(sys.hostname);
      return 0;
    }
  },
  {
    name: 'hostnamectl', cat: 'System', summary: 'Query or persistently set the hostname', usage: 'hostnamectl [status | set-hostname NAME | hostname NAME]', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      const [verb, value] = ctx.args;
      if (verb === 'set-hostname' || (verb === 'hostname' && value)) {
        if (!ctx.requireRoot()) return 1;
        if (!value) return fail(ctx, 'missing hostname');
        sys.hostname = value;
        sys.fs.writeFile('/etc/hostname', '/', value + '\n');
        return 0;
      }
      if (verb === 'hostname') { ctx.print(sys.hostname); return 0; }
      ctx.print(` Static hostname: ${sys.fs.readFile('/etc/hostname', '/').trim()}\n       Icon name: computer-vm\n         Chassis: vm 🖴\n      Machine ID: 5f2c0a9d1e7b4a3c8d6e0f1a2b3c4d5e\n         Boot ID: 9a8b7c6d5e4f30211234567890abcdef\n  Virtualization: vmware\nOperating System: Red Hat Enterprise Linux 10.0 (Coughlan)\n     CPE OS Name: cpe:/o:redhat:enterprise_linux:10::baseos\n          Kernel: Linux ${sys.kernel}\n    Architecture: x86-64\n Hardware Vendor: VMware, Inc.`);
      return 0;
    }
  },
  {
    name: 'nice', cat: 'Processes', summary: 'Run a command with adjusted niceness', usage: 'nice -n N command [args]', fidelity: 'partial',
    run(ctx) {
      const args = ctx.args.slice();
      let n = 10;
      if (args[0] === '-n') { args.shift(); n = Number(args.shift()); } else if (/^-\d+$/.test(args[0] || '')) n = Number(args.shift().slice(1));
      if (!args.length) { ctx.print('0'); return 0; }
      if (n < 0 && !ctx.isRoot()) { ctx.error('nice: cannot set niceness: Permission denied'); n = 0; }
      const p = addProcess(ctx.sys, { cmd: args.join(' '), user: ctx.sys.session.user, nice: Math.max(-20, Math.min(19, n)), tty: 'pts/1', rssMb: 2 });
      ctx.print(`(simulator) started PID ${p.pid} '${args.join(' ')}' with nice ${p.nice}; it keeps running until killed`);
      return 0;
    }
  },
  {
    name: 'renice', cat: 'Processes', summary: 'Change niceness of running processes', usage: 'renice -n N -p PID | renice N PID', fidelity: 'functional',
    run(ctx) {
      const args = ctx.args.slice();
      let n = null;
      const pids = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n') n = Number(args[++i]);
        else if (args[i] === '-p') continue;
        else if (n === null && /^[-+]?\d+$/.test(args[i])) n = Number(args[i]);
        else if (/^\d+$/.test(args[i])) pids.push(Number(args[i]));
      }
      if (n === null || !pids.length) return fail(ctx, 'usage: renice [-n] priority [-p] pid...');
      let code = 0;
      for (const pid of pids) {
        const p = ctx.sys.processes.find(x => x.pid === pid);
        if (!p) { ctx.error(`renice: failed to get priority for ${pid} (process ID): No such process`); code = 1; continue; }
        if (!ctx.isRoot() && (p.user !== ctx.sys.session.user || n < p.nice)) { ctx.error(`renice: failed to set priority for ${pid} (process ID): Permission denied`); code = 1; continue; }
        const old = p.nice;
        p.nice = Math.max(-20, Math.min(19, n));
        ctx.print(`${pid} (process ID) old priority ${old}, new priority ${p.nice}`);
      }
      return code;
    }
  },
  {
    name: 'lsof', cat: 'Processes', summary: 'List open files and sockets (-i, -p, +L1, -u, path)', usage: 'lsof [-i [:PORT]] [-p PID] [+L1] [-u USER] [path]', fidelity: 'partial', pkg: 'lsof',
    run(ctx) {
      const sys = ctx.sys;
      const args = ctx.args;
      const rows = [['COMMAND', 'PID', 'USER', 'FD', 'TYPE', 'DEVICE', 'SIZE/OFF', 'NLINK', 'NODE', 'NAME']];
      if (args.includes('+L1')) {
        for (const f of sys.fs.inodes.values()) if (f.openBy?.length && f.nlink <= 0) {
          for (const pid of f.openBy) { const p = sys.processes.find(x => x.pid === pid); if (p) rows.push([procName(p), pid, p.user, '3w', 'REG', '253,0', sys.fs.usage(f), 0, f.ino, `${f.deletedPath || '/unknown'} (deleted)`]); }
        }
        if (rows.length === 1) return 1;
        ctx.print(columns(rows));
        return 0;
      }
      const iIdx = args.indexOf('-i');
      if (iIdx >= 0 || args.some(a => a.startsWith('-i'))) {
        const spec = (args[iIdx + 1] && !args[iIdx + 1].startsWith('-') ? args[iIdx + 1] : args.find(a => a.startsWith('-i:'))?.slice(2)) || '';
        const port = Number((spec.match(/:(\d+)/) || [])[1]) || null;
        const socks = listeningSockets(sys).filter(s => !port || s.port === port);
        const r2 = [['COMMAND', 'PID', 'USER', 'FD', 'TYPE', 'DEVICE', 'SIZE/OFF', 'NODE', 'NAME']];
        for (const s of socks) r2.push([s.proc, s.pid, s.user, '4u', 'IPv4', String(30000 + s.port), '0t0', s.proto.toUpperCase(), `*:${s.port} (LISTEN)`]);
        if (r2.length === 1) return 1;
        ctx.print(columns(r2));
        return 0;
      }
      const pIdx = args.indexOf('-p');
      const uIdx = args.indexOf('-u');
      let procs = sys.processes;
      if (pIdx >= 0) procs = procs.filter(p => p.pid === Number(args[pIdx + 1]));
      if (uIdx >= 0) procs = procs.filter(p => p.user === args[uIdx + 1]);
      const path = args.find((a, i) => !a.startsWith('-') && !a.startsWith('+') && i !== pIdx + 1 && i !== uIdx + 1);
      for (const p of procs.slice(0, 40)) {
        if (path) { const f = [...sys.fs.inodes.values()].find(n => n.openBy?.includes(p.pid) && sys.fs.pathOf(n.ino) === ctx.abs(path)); if (!f) continue; }
        rows.push([procName(p), p.pid, p.user, 'cwd', 'DIR', '253,0', 4096, 1, 128, '/']);
        rows.push([procName(p), p.pid, p.user, 'txt', 'REG', '253,0', 1245728, 1, 4401, p.cmd.split(' ')[0]]);
        for (const f of sys.fs.inodes.values()) if (f.openBy?.includes(p.pid)) rows.push([procName(p), p.pid, p.user, '3w', 'REG', '253,0', sys.fs.usage(f), f.nlink, f.ino, f.nlink > 0 ? sys.fs.pathOf(f.ino) : `${f.deletedPath} (deleted)`]);
      }
      if (rows.length === 1) return 1;
      ctx.print(columns(rows));
      return 0;
    }
  },
  {
    name: 'fuser', cat: 'Processes', summary: 'Identify processes using files, mounts or ports', usage: 'fuser [-v] [-m] PATH | fuser PORT/tcp', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const target = ctx.args.find(a => !a.startsWith('-'));
      if (!target) return fail(ctx, 'No process specification given');
      const m = /^(\d+)\/(tcp|udp)$/.exec(target);
      let pids = [];
      if (m) pids = listeningSockets(sys).filter(s => s.port === Number(m[1]) && s.proto === m[2]).map(s => s.pid);
      else {
        const abs = ctx.abs(target);
        for (const f of sys.fs.inodes.values()) if (f.openBy?.length) { const p = sys.fs.pathOf(f.ino) || f.deletedPath || ''; if (p === abs || (ctx.args.includes('-m') && p.startsWith(abs === '/' ? '/' : abs + '/'))) pids.push(...f.openBy); }
        if (ctx.args.includes('-m') && sys.mountUsers?.[abs]) pids.push(...sys.mountUsers[abs]);
      }
      if (!pids.length) return 1;
      ctx.print(`${target}: ${[...new Set(pids)].join(' ')}`);
      return 0;
    }
  },
  {
    name: 'vmstat', cat: 'Performance', summary: 'Virtual memory, run queue, I/O wait statistics', usage: 'vmstat [delay [count]]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const nums = ctx.args.filter(a => /^\d+$/.test(a)).map(Number);
      const count = nums.length >= 2 ? Math.min(nums[1], 10) : 1;
      const m = memory(sys);
      const r = sys.processes.filter(p => p.cpu > 50).length;
      const b = sys.processes.filter(p => p.state === 'D').length;
      const busy = Math.min(98, sys.processes.reduce((s, p) => s + p.cpu, 0) / 4);
      ctx.print('procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----');
      ctx.print(' r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st');
      for (let i = 0; i < count; i++) {
        const wa = b ? 35 + (i % 3) * 4 : 0;
        const us = Math.round(busy * 0.85), sy = Math.round(busy * 0.1) + 1;
        const id = Math.max(0, 100 - us - sy - wa);
        const so = m.swapUsed > 0 ? 120 + i * 40 : 0;
        ctx.print(` ${String(r).padStart(1)}  ${b}  ${String(m.swapUsed * 1024).padStart(5)} ${String(m.free * 1024).padStart(7)} ${String(120 * 1024).padStart(6)} ${String(m.buff * 1024).padStart(6)} ${String(so ? 40 : 0).padStart(4)} ${String(so).padStart(4)} ${String(b ? 8200 : 12).padStart(5)} ${String(b ? 950 : 45).padStart(5)} ${String(310 + r * 400).padStart(4)} ${String(620 + r * 900).padStart(4)} ${String(us).padStart(2)} ${String(sy).padStart(2)} ${String(id).padStart(2)} ${String(wa).padStart(2)}  0`);
      }
      return 0;
    }
  },
  {
    name: 'sysctl', cat: 'Kernel', summary: 'Read/write kernel parameters (-a, -w, -p)', usage: 'sysctl [-a] [KEY] [-w KEY=VALUE] [-p [FILE]] [--system]', fidelity: 'partial', bin: '/usr/sbin/sysctl',
    run(ctx) {
      const sys = ctx.sys;
      const args = ctx.args;
      const setKey = (kv) => {
        const [k, v] = kv.split('=').map(s => s.trim());
        if (!(k in sys.sysctl)) { ctx.error(`sysctl: cannot stat /proc/sys/${k.replace(/\./g, '/')}: No such file or directory`); return false; }
        sys.sysctl[k] = v;
        try { sys.fs.writeFile(`/proc/sys/${k.replace(/\./g, '/')}`, '/', v + '\n'); } catch { /* not mirrored */ }
        ctx.print(`${k} = ${v}`);
        return true;
      };
      if (args.includes('-a')) { for (const [k, v] of Object.entries(sys.sysctl)) ctx.print(`${k} = ${v}`); return 0; }
      if (args.includes('-p') || args.includes('--system')) {
        if (!ctx.requireRoot()) return 1;
        const files = args.includes('--system') ? ['/etc/sysctl.conf', ...listDir(sys, '/etc/sysctl.d').map(f => `/etc/sysctl.d/${f}`)] : [args[args.indexOf('-p') + 1] || '/etc/sysctl.conf'];
        for (const f of files) {
          let text = '';
          try { text = sys.fs.readFile(f, '/'); } catch { if (!args.includes('--system')) { ctx.error(`sysctl: cannot open "${f}": No such file or directory`); return 1; } continue; }
          if (args.includes('--system')) ctx.print(`* Applying ${f} ...`);
          for (const l of text.split('\n')) if (l.trim() && !l.trim().startsWith('#') && l.includes('=')) setKey(l.trim());
        }
        return 0;
      }
      const w = args.indexOf('-w');
      if (w >= 0 || args.some(a => a.includes('='))) { if (!ctx.requireRoot()) return 1; return setKey(args[w + 1] || args.find(a => a.includes('='))) ? 0 : 1; }
      let code = 0;
      for (const k of args.filter(a => !a.startsWith('-'))) {
        if (k in sys.sysctl) ctx.print(args.includes('-n') ? sys.sysctl[k] : `${k} = ${sys.sysctl[k]}`);
        else { ctx.error(`sysctl: cannot stat /proc/sys/${k.replace(/\./g, '/')}: No such file or directory`); code = 255; }
      }
      return code;
    }
  },
  ...['env', 'printenv'].map(name => ({
    name, cat: 'Shell', summary: 'Print environment variables', usage: `${name} [VAR]`, fidelity: 'functional',
    run(ctx) {
      const sh = ctx.shell;
      const vars = { HOME: sh.getVar('HOME'), USER: sh.getVar('USER'), LOGNAME: sh.getVar('USER'), SHELL: '/bin/bash', PATH: sh.getVar('PATH'), PWD: sh.getVar('PWD'), LANG: 'en_US.UTF-8', TERM: 'xterm-256color', HOSTNAME: sh.getVar('HOSTNAME'), ...sh.env };
      if (name === 'printenv' && ctx.args[0]) { if (!(ctx.args[0] in vars)) return 1; ctx.print(vars[ctx.args[0]]); return 0; }
      for (const [k, v] of Object.entries(vars)) ctx.print(`${k}=${v}`);
      return 0;
    }
  })),
  {
    name: 'dmesg', cat: 'Logs', summary: 'Kernel ring buffer messages', usage: 'dmesg [-T] [-l err,warn]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const human = ctx.args.includes('-T');
      const lvlIdx = ctx.args.indexOf('-l');
      const levels = lvlIdx >= 0 ? ctx.args[lvlIdx + 1].split(',') : null;
      const map = { emerg: 0, alert: 1, crit: 2, err: 3, warn: 4, notice: 5, info: 6, debug: 7 };
      for (const e of sys.journal.filter(j => j.ident === 'kernel')) {
        if (levels && !levels.some(l => map[l] === e.prio)) continue;
        const rel = ((e.time - sys.bootTime) / 1000).toFixed(6).padStart(12);
        ctx.print(human ? `[${new Date(e.time).toUTCString().replace(' GMT', '')}] ${e.msg}` : `[${rel}] ${e.msg}`);
      }
      return 0;
    }
  },
  {
    name: 'timedatectl', cat: 'System', summary: 'Time, time zone and NTP status', usage: 'timedatectl [status | set-timezone ZONE | set-ntp true|false | list-timezones]', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      sys.time ||= { tz: 'UTC', ntp: true };
      const [verb, v] = ctx.args;
      if (verb === 'set-timezone') { if (!ctx.requireRoot()) return 1; if (!/^[A-Z][A-Za-z_]+(\/[A-Za-z_]+)*$/.test(v || '')) return fail(ctx, `Failed to set time zone: Invalid or not installed time zone '${v}'`); sys.time.tz = v; return 0; }
      if (verb === 'set-ntp') { if (!ctx.requireRoot()) return 1; sys.time.ntp = v === 'true' || v === 'yes' || v === '1'; sys.services.chronyd.active = sys.time.ntp ? 'active' : 'inactive'; return 0; }
      if (verb === 'list-timezones') { ctx.print('America/New_York\nAsia/Kolkata\nEurope/London\nEurope/Berlin\nUTC'); return 0; }
      const d = new Date(sys.clock()).toISOString().replace('T', ' ').slice(0, 19);
      ctx.print(`               Local time: Fri ${d} ${sys.time.tz}\n           Universal time: Fri ${d} UTC\n                 RTC time: Fri ${d}\n                Time zone: ${sys.time.tz}\nSystem clock synchronized: ${sys.time.ntp && sys.services.chronyd.active === 'active' ? 'yes' : 'no'}\n              NTP service: ${sys.services.chronyd.active === 'active' ? 'active' : 'inactive'}\n          RTC in local TZ: no`);
      return 0;
    }
  },
  {
    name: 'chronyc', cat: 'System', summary: 'chrony client: sources, tracking', usage: 'chronyc sources [-v] | tracking', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      if (sys.services.chronyd.active !== 'active') { ctx.error('506 Cannot talk to daemon'); return 1; }
      const conf = sys.fs.readFile('/etc/chrony.conf', '/');
      const servers = conf.split('\n').filter(l => /^(server|pool)\s/.test(l)).map(l => l.split(/\s+/)[1]);
      if (ctx.args[0] === 'tracking') { ctx.print(`Reference ID    : 0A0A2803 (${servers[0] || 'none'})\nStratum         : 3\nRef time (UTC)  : Fri Oct 09 09:41:10 2026\nSystem time     : 0.000012345 seconds fast of NTP time\nLast offset     : +0.000004120 seconds\nRMS offset      : 0.000021334 seconds\nFrequency       : 12.104 ppm slow\nLeap status     : Normal`); return 0; }
      ctx.print('MS Name/IP address         Stratum Poll Reach LastRx Last sample\n===============================================================================');
      servers.forEach((s, i) => ctx.print(`^${i === 0 ? '*' : '+'} ${s.padEnd(27)} 2   6   377    ${12 + i}   +${120 + i * 30}us[ +${130 + i * 20}us] +/-   ${14 + i}ms`));
      return 0;
    }
  },
  {
    name: 'tuned-adm', cat: 'Performance', summary: 'Manage tuning profiles', usage: 'tuned-adm active | list | recommend | profile NAME | off', fidelity: 'partial', bin: '/usr/sbin/tuned-adm',
    run(ctx) {
      const sys = ctx.sys;
      const profiles = ['accelerator-performance', 'balanced', 'desktop', 'hpc-compute', 'latency-performance', 'network-latency', 'network-throughput', 'powersave', 'throughput-performance', 'virtual-guest', 'virtual-host'];
      const [verb, name] = ctx.args;
      if (sys.services.tuned.active !== 'active' && verb !== 'list') { ctx.error('Cannot talk to TuneD daemon via DBus. Is TuneD daemon running?'); return 1; }
      if (verb === 'active') { ctx.print(sys.tuned ? `Current active profile: ${sys.tuned}` : 'No current active profile.'); return 0; }
      if (verb === 'recommend') { ctx.print('virtual-guest'); return 0; }
      if (verb === 'list') { ctx.print('Available profiles:\n' + profiles.map(p => `- ${p}`).join('\n') + `\nCurrent active profile: ${sys.tuned || 'none'}`); return 0; }
      if (verb === 'off') { if (!ctx.requireRoot()) return 1; sys.tuned = null; return 0; }
      if (verb === 'profile') {
        if (!ctx.requireRoot()) return 1;
        if (!name) { ctx.print('Available profiles:\n' + profiles.map(p => `- ${p}`).join('\n')); return 0; }
        if (!profiles.includes(name)) return fail(ctx, `Requested profile '${name}' doesn't exist.`);
        sys.tuned = name;
        return 0;
      }
      return fail(ctx, 'usage: tuned-adm active|list|recommend|profile NAME|off', 2);
    }
  },
  {
    name: 'crontab', cat: 'Scheduling', summary: 'Manage per-user cron tables (-l, -e, -r, -u, FILE)', usage: 'crontab [-u USER] -l | -e | -r | FILE', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      const args = ctx.args.slice();
      let user = sys.session.user;
      const ui = args.indexOf('-u');
      if (ui >= 0) { if (!ctx.isRoot()) return fail(ctx, 'must be privileged to use -u'); user = args[ui + 1]; args.splice(ui, 2); }
      const path = `/var/spool/cron/${user}`;
      if (args[0] === '-l') { try { ctx.write(sys.fs.readFile(path, '/')); return 0; } catch { ctx.error(`no crontab for ${user}`); return 1; } }
      if (args[0] === '-r') { const r = sys.fs.tryResolve(path); if (!r) { ctx.error(`no crontab for ${user}`); return 1; } sys.fs.unlink(r.parent, r.name); return 0; }
      if (args[0] === '-e') {
        if (!sys.fs.exists(path)) { const n = sys.fs.writeFile(path, '/', '', {}); n.mode = 0o600; n.uid = userByName(sys, user)?.uid ?? 0; }
        return { editor: path, validate: 'crontab' };
      }
      if (args[0]) {
        try {
          const text = sys.fs.readFile(args[0], ctx.cwd, ctx.user);
          const bad = validateCrontab(text);
          if (bad) { ctx.error(`"${args[0]}":${bad.line}: ${bad.msg}\nerrors in crontab file, can't install.`); return 1; }
          const n = sys.fs.writeFile(path, '/', text, {});
          n.mode = 0o600;
          return 0;
        } catch (e) { return fail(ctx, e.message); }
      }
      return fail(ctx, 'usage: crontab [-u user] [-l | -r | -e] [file]');
    }
  },
  {
    name: 'at', cat: 'Scheduling', summary: 'Queue a one-time job (commands read from stdin)', usage: 'echo "cmd" | at now + 5 minutes', fidelity: 'partial',
    run(ctx) {
      const sys = ctx.sys;
      if (!ctx.args.length) return fail(ctx, 'garbled time');
      if (!ctx.stdin) return fail(ctx, '(simulator) pipe the job into at, e.g. echo "date > /tmp/t" | at now + 1 minute');
      sys.atJobs ||= [];
      const id = sys.atJobs.length + 1;
      sys.atJobs.push({ id, when: ctx.args.join(' '), cmd: ctx.stdin.trim(), user: sys.session.user });
      ctx.error(`warning: commands will be executed using /bin/sh\njob ${id} at ${new Date(sys.clock() + 300000).toUTCString().replace(' GMT', '')}`);
      return 0;
    }
  },
  { name: 'atq', cat: 'Scheduling', summary: 'List queued at jobs', usage: 'atq', fidelity: 'partial', run(ctx) { (ctx.sys.atJobs || []).forEach(j => ctx.print(`${j.id}\tFri Oct  9 10:05:00 2026 a ${j.user}`)); return 0; } },
  { name: 'atrm', cat: 'Scheduling', summary: 'Remove queued at jobs', usage: 'atrm JOB', fidelity: 'partial', run(ctx) { const sys = ctx.sys; sys.atJobs = (sys.atJobs || []).filter(j => !ctx.args.includes(String(j.id))); return 0; } },
  {
    name: 'logger', cat: 'Logs', summary: 'Write a message to the system log', usage: 'logger [-p facility.level] [-t TAG] message', fidelity: 'functional',
    run(ctx) {
      const sys = ctx.sys;
      const { o, rest } = getopt(ctx.args, 's', 'pt');
      const prioMap = { emerg: 0, alert: 1, crit: 2, err: 3, warning: 4, notice: 5, info: 6, debug: 7 };
      const prio = o.p ? prioMap[String(o.p).split('.').pop()] ?? 5 : 5;
      const tag = o.t || sys.session.user;
      const msg = rest.join(' ');
      sys.journal.push({ time: sys.clock(), unit: null, prio, msg, ident: tag });
      const node = sys.fs.resolve('/var/log/messages').node;
      node.data += `${syslogDate(sys.clock())} ${sys.hostname.split('.')[0]} ${tag}[${sys.nextPid}]: ${msg}\n`;
      return 0;
    }
  },
  {
    name: 'ulimit', cat: 'Processes', summary: 'Show resource limits of the shell', usage: 'ulimit [-a|-n|-u]', fidelity: 'static',
    run(ctx) {
      const lim = ctx.sys.ulimits ||= { n: 1024, u: 62844 };
      const a = ctx.args[0];
      if (a === '-a') { ctx.print(`core file size              (blocks, -c) 0\nfile size                   (blocks, -f) unlimited\nmax memory size             (kbytes, -m) unlimited\nopen files                          (-n) ${lim.n}\nmax user processes                  (-u) ${lim.u}\nstack size                  (kbytes, -s) 8192\nvirtual memory              (kbytes, -v) unlimited`); return 0; }
      if (a === '-n' && ctx.args[1]) { lim.n = Number(ctx.args[1]); return 0; }
      ctx.print(a === '-u' ? lim.u : a === '-n' ? lim.n : 'unlimited');
      return 0;
    }
  },
  { name: 'nproc', cat: 'System', summary: 'Number of CPUs', usage: 'nproc', fidelity: 'static', run(ctx) { ctx.print('4'); return 0; } },
  {
    name: 'lscpu', cat: 'System', summary: 'CPU architecture summary', usage: 'lscpu', fidelity: 'static',
    run(ctx) { ctx.print('Architecture:             x86_64\n  CPU op-mode(s):         32-bit, 64-bit\nCPU(s):                   4\n  On-line CPU(s) list:    0-3\nVendor ID:                GenuineIntel\n  Model name:             Intel(R) Xeon(R) Gold 6338 CPU @ 2.00GHz\n    Thread(s) per core:   1\n    Core(s) per socket:   4\n    Socket(s):            1\nVirtualization features:\n  Hypervisor vendor:      VMware\n  Virtualization type:    full\nNUMA:\n  NUMA node(s):           1'); return 0; }
  },
  ...['reboot', 'shutdown', 'poweroff', 'halt'].map(name => ({
    name, cat: 'System', summary: 'Power management (refused in the simulator)', usage: `${name} [options]`, fidelity: 'static', bin: `/usr/sbin/${name}`,
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      ctx.print(`(simulator) ${name} ${ctx.args.join(' ')} accepted but not performed — the lab host stays up.`);
      ctx.print('In production: confirm the change window, notify users (shutdown -r +10 "message"), and verify services after boot.');
      return 0;
    }
  }))
];

function listDir(sys, path) {
  const r = sys.fs.tryResolve(path);
  return r ? sys.fs.list(r.node) : [];
}

export function validateCrontab(text) {
  const ls = text.split('\n');
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i].trim();
    if (!l || l.startsWith('#') || /^[A-Z_]+=/.test(l)) continue;
    if (/^@(reboot|yearly|annually|monthly|weekly|daily|hourly)\s+\S/.test(l)) continue;
    const f = l.split(/\s+/);
    if (f.length < 6) return { line: i + 1, msg: 'bad command' };
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
    for (let k = 0; k < 5; k++) {
      const field = f[k];
      if (!/^(\*|\d+(-\d+)?)(\/\d+)?(,(\*|\d+(-\d+)?)(\/\d+)?)*$/.test(field) && !(k >= 3 && /^[a-z]{3}(-[a-z]{3})?$/i.test(field))) return { line: i + 1, msg: `bad ${['minute', 'hour', 'day-of-month', 'month', 'day-of-week'][k]}` };
      for (const n of field.match(/\d+/g) || []) {
        if (/\/\d+/.test(field) && field.endsWith('/' + n)) continue;
        if (Number(n) < ranges[k][0] || Number(n) > ranges[k][1]) return { line: i + 1, msg: `bad ${['minute', 'hour', 'day-of-month', 'month', 'day-of-week'][k]}` };
      }
    }
  }
  return null;
}

/** Listening sockets derived from running services and stray processes. */
export function listeningSockets(sys) {
  const out = [];
  for (const svc of Object.values(sys.services)) {
    if (svc.active !== 'active' || !svc.pid) continue;
    for (const [proto, port, addr] of svc.ports || []) out.push({ proto, port, addr: addr || (proto === 'udp' && port === 323 ? '127.0.0.1' : '0.0.0.0'), pid: svc.pid, proc: procName({ cmd: svc.exec }), user: svc.user || 'root' });
  }
  for (const p of sys.processes) for (const [proto, port, addr] of p.ports || []) out.push({ proto, port, addr: addr || '0.0.0.0', pid: p.pid, proc: procName(p), user: p.user });
  return out.sort((a, b) => a.port - b.port);
}

function pmatch(ctx, kill) {
  const args = ctx.args.slice();
  let sig = 15;
  if (kill && args[0] && /^-[A-Z0-9]+$/i.test(args[0]) && !['-f', '-u', '-x', '-l', '-a', '-n', '-o'].includes(args[0])) sig = parseSignal(args.shift().slice(1));
  const { o, rest } = getopt(args, 'flaxno', 'uU', {});
  const pat = rest[0];
  if (!pat && !o.u) return fail(ctx, 'no matching criteria specified', 2);
  let list = ctx.sys.processes.filter(p => p.pid !== 1 && !p.cmd.startsWith('['));
  if (o.u) list = list.filter(p => String(o.u).split(',').includes(p.user));
  if (pat) {
    const re = new RegExp(o.x ? `^${pat}$` : pat);
    list = list.filter(p => re.test(o.f ? p.cmd : procName(p)));
  }
  if (o.n) list = list.slice(-1);
  if (o.o) list = list.slice(0, 1);
  if (!list.length) return 1;
  if (!kill) { ctx.print(list.map(p => (o.a ? `${p.pid} ${p.cmd}` : o.l ? `${p.pid} ${procName(p)}` : p.pid)).join('\n')); return 0; }
  let code = 0;
  for (const p of list) { const err = deliverSignal(ctx.sys, p.pid, sig, ctx.user); if (err) { ctx.error(`pkill: killing pid ${p.pid} failed: ${err}`); code = 1; } }
  return code;
}
