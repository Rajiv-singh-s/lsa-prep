// Command registry: one place that knows every simulated command, its fidelity and docs.
import { fileCommands } from './files.js';
import { textCommands } from './text.js';
import { userCommands } from './users.js';
import { procCommands } from './proc.js';
import { serviceCommands } from './services.js';
import { networkCommands } from './network.js';
import { storageCommands } from './storage.js';
import { securityCommands } from './security.js';
import { packageCommands } from './packages.js';
import { columns } from './util.js';

export const FIDELITY = {
  functional: 'Modelled behaviour: reads and changes the simulated system state.',
  partial: 'Common options modelled; less common options are not.',
  static: 'Representative fixed output only.',
  simulator: 'Simulator-only helper (does not exist on real Linux).'
};

// Real commands we deliberately do not implement — reported honestly instead of "command not found".
const KNOWN_UNSUPPORTED = new Set(['gdisk', 'iotop', 'htop', 'screen', 'tmux', 'nc', 'ncat', 'telnet', 'ftp', 'rsync', 'zip', 'unzip', 'tune2fs', 'e2fsck', 'fsck', 'xfs_repair', 'mdadm', 'iptables', 'nft', 'perf', 'bpftrace', 'ansible', 'ansible-playbook', 'ansible-navigator', 'ansible-galaxy', 'ansible-vault', 'python', 'python3', 'pip', 'git', 'podman', 'docker', 'kubectl', 'virsh', 'qemu-img', 'emacs', 'watch', 'stress-ng', 'fio', 'dracut', 'grub2-mkconfig', 'grubby', 'mokutil', 'ipmitool', 'dmidecode', 'smartctl', 'multipath', 'iscsiadm', 'cryptsetup', 'aureport', 'auditctl', 'oscap', 'sshd', 'useradd.sh', 'newgrp', 'info', 'chronyd', 'httpd', 'apachectl', 'nginx', 'ssh-agent', 'ssh-add', 'gpg', 'base64', 'md5sum', 'sha256sum', 'cksum', 'split', 'join', 'comm', 'column', 'fold', 'fmt', 'od', 'hexdump', 'strings', 'lsmod', 'modprobe', 'modinfo', 'lspci', 'lsusb']);

const MAN_FILES = {
  fstab: 'FSTAB(5)\n\nEach line: <device> <mountpoint> <type> <options> <dump> <fsck-order>\n  device      UUID=..., LABEL=..., /dev/mapper/vg-lv, or server:/export for NFS\n  options     defaults, noauto, nofail, ro, _netdev, x-systemd.automount\n  fsck-order  0 = skip, 1 = root, 2 = others (XFS ignores fsck order)\nTest changes with: mount -a ; findmnt --verify ; systemctl daemon-reload',
  crontab: 'CRONTAB(5)\n\nminute hour day-of-month month day-of-week command\n  */5 * * * *  every five minutes\n  0 2 * * 1-5  02:00 Monday to Friday\nSystem files in /etc/crontab and /etc/cron.d also have a user field before the command.',
  sudoers: 'SUDOERS(5)\n\nuser   HOST=(RUNAS)   COMMANDS\n%wheel ALL=(ALL)      ALL\nalice  ALL=(root)     /usr/bin/systemctl restart httpd\nAlways edit with visudo (or visudo -f /etc/sudoers.d/FILE) so syntax is checked before saving.',
  passwd: 'PASSWD(5)\n\nname:password:UID:GID:GECOS:home:shell — the password field is "x" (hash lives in /etc/shadow).',
  shadow: 'SHADOW(5)\n\nname:hash:lastchg:min:max:warn:inactive:expire:reserved — readable by root only.',
  'systemd.unit': 'SYSTEMD.UNIT(5)\n\n[Unit] Description=, After=, Requires=, Wants=\n[Service] Type=, ExecStart=, User=, Restart=, EnvironmentFile=\n[Install] WantedBy=multi-user.target\nRun systemctl daemon-reload after editing unit files.',
  'sshd_config': 'SSHD_CONFIG(5)\n\nPort, PermitRootLogin, PasswordAuthentication, PubkeyAuthentication, AllowUsers, MaxAuthTries. Validate with sshd -t before restarting sshd. Prefer drop-ins in /etc/ssh/sshd_config.d/.'
};

const miscCommands = [
  {
    name: 'help', cat: 'Simulator', summary: 'List simulator commands by category and fidelity', usage: 'help [command]', fidelity: 'simulator', builtin: true,
    run(ctx) {
      const reg = ctx.shell.registry;
      if (ctx.args[0]) return reg.get('man').run({ ...ctx, name: 'man' });
      ctx.print('SIMULATED RHEL 10 TERMINAL — commands run against an in-browser model of a Linux host, not a real kernel.');
      ctx.print('Fidelity: [F] functional  [P] partial  [S] static output  [*] simulator-only helper\n');
      const byCat = {};
      for (const c of reg.all()) (byCat[c.cat] ||= []).push(c);
      for (const [cat, list] of Object.entries(byCat).sort()) {
        const tag = (c) => ({ functional: 'F', partial: 'P', static: 'S', simulator: '*' }[c.fidelity] || 'P');
        ctx.print(`${cat}:`);
        ctx.print('  ' + list.sort((a, b) => a.name.localeCompare(b.name)).map(c => `${c.name}[${tag(c)}]`).join(' '));
      }
      ctx.print(`\nShell: pipes | ; && || > >> 2> 2>&1 < , $VAR, $(cmd), $((math)), globs, {a,b}, if/for/while, functions.`);
      ctx.print(`Not supported: interactive programs (top/less keys, fdisk dialogs), job control, here-documents, case.`);
      ctx.print(`Edit files with: nano FILE  (or vi/vim) — opens an editor panel.  Type "man CMD" for details.`);
      return 0;
    }
  },
  {
    name: 'man', cat: 'Shell', summary: 'Show the simulator manual for a command or config file', usage: 'man [SECTION] NAME | man -k KEYWORD', fidelity: 'partial',
    run(ctx) {
      const reg = ctx.shell.registry;
      if (ctx.args[0] === '-k') return reg.get('apropos').run({ ...ctx, name: 'apropos', args: ctx.args.slice(1) });
      const name = ctx.args.filter(a => !/^\d$/.test(a))[0];
      if (!name) { ctx.error('What manual page do you want?\nFor example, try \'man man\'.'); return 1; }
      if (MAN_FILES[name] && (ctx.args.includes('5') || !reg.get(name))) { ctx.print(MAN_FILES[name]); return 0; }
      const c = reg.get(name);
      if (!c) { ctx.error(`No manual entry for ${name}${KNOWN_UNSUPPORTED.has(name) ? ' (real command, not implemented in the simulator)' : ''}`); return 16; }
      ctx.print(`${name.toUpperCase()}(1)              Simulator Manual              ${name.toUpperCase()}(1)\n\nNAME\n       ${name} - ${c.summary}\n\nSYNOPSIS\n       ${c.usage}\n\nSIMULATOR FIDELITY\n       ${c.fidelity}: ${FIDELITY[c.fidelity] || ''}\n\nREAL SYSTEM\n       On a real RHEL host, run "man ${name}" for the complete page (package documentation lives in /usr/share/man and /usr/share/doc).`);
      return 0;
    }
  },
  {
    name: 'apropos', cat: 'Shell', summary: 'Search command summaries by keyword (same as man -k)', usage: 'apropos KEYWORD', fidelity: 'partial',
    run(ctx) {
      const kw = (ctx.args[0] || '').toLowerCase();
      if (!kw) { ctx.error('apropos what?'); return 1; }
      const hits = ctx.shell.registry.all().filter(c => c.name.includes(kw) || c.summary.toLowerCase().includes(kw));
      if (!hits.length) { ctx.print(`${kw}: nothing appropriate.`); return 16; }
      ctx.print(columns(hits.map(c => [`${c.name} (1)`, `- ${c.summary}`])));
      return 0;
    }
  },
  { name: 'clear', cat: 'Shell', summary: 'Clear the terminal screen', usage: 'clear', fidelity: 'functional', run() { return { clear: true }; } },
  ...['nano', 'vi', 'vim'].map(name => ({
    name, cat: 'Files', summary: 'Edit a file in the simulator editor panel', usage: `${name} FILE`, fidelity: 'partial',
    run(ctx) {
      const file = ctx.args.find(a => !a.startsWith('-') && !a.startsWith('+'));
      if (!file) { ctx.error(`${name}: (simulator) a file name is required`); return 1; }
      const abs = ctx.abs(file);
      const r = ctx.fs.tryResolve(abs, '/', { user: ctx.user });
      if (r) {
        if (r.node.type === 'd') { ctx.error(`${name}: ${file} is a directory`); return 1; }
        if (!ctx.fs.can(r.node, 'r', ctx.user)) { ctx.error(`${name}: ${file}: Permission denied`); return 1; }
        if (r.node.readonlyGen) { ctx.error(`${name}: ${file} is generated from the account database in this simulator — use useradd/usermod/passwd instead`); return 1; }
      }
      if (ctx.shell.depth > 0) { ctx.error(`${name}: cannot open an interactive editor from a script`); return 1; }
      return { editor: abs };
    }
  })),
  {
    name: 'iostat', cat: 'Performance', summary: 'Device I/O statistics (sysstat)', usage: 'iostat -x [interval [count]]', fidelity: 'static', pkg: 'sysstat',
    run(ctx) {
      const busy = ctx.sys.processes.some(p => p.state === 'D') || ctx.sys.ioDegraded;
      ctx.print(`Linux ${ctx.sys.kernel} (${ctx.sys.hostname})  10/09/2026  _x86_64_  (4 CPU)\n\navg-cpu:  %user   %nice %system %iowait  %steal   %idle\n           ${busy ? ' 3.10    0.00    2.40   41.80    0.00   52.70' : ' 2.10    0.00    0.90    0.20    0.00   96.80'}\n\nDevice            r/s     w/s     rkB/s     wkB/s  r_await  w_await  aqu-sz  %util\nsda             ${busy ? '210.00  880.00  8400.00 35200.00    48.20   212.70   21.30  99.80' : '  2.10    6.40    48.00   210.00     0.41     0.88    0.01   0.60'}\ndm-0            ${busy ? '208.00  876.00  8320.00 35040.00    49.10   215.30   21.10  99.70' : '  2.00    6.30    46.00   205.00     0.43     0.90    0.01   0.58'}`);
      return 0;
    }
  },
  {
    name: 'mpstat', cat: 'Performance', summary: 'Per-CPU utilisation (sysstat)', usage: 'mpstat -P ALL [interval [count]]', fidelity: 'static', pkg: 'sysstat',
    run(ctx) { const hot = ctx.sys.processes.some(p => p.cpu > 50); ctx.print(`Linux ${ctx.sys.kernel} (${ctx.sys.hostname})  10/09/2026  _x86_64_  (4 CPU)\n\n10:00:01 AM  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal   %idle\n10:00:01 AM  all   ${hot ? '26.40' : ' 1.90'}    0.00    0.80    0.20    0.00    0.10    0.00   ${hot ? '72.50' : '97.00'}\n10:00:01 AM    0   ${hot ? '99.20' : ' 2.10'}    0.00    0.80    0.00    0.00    0.00    0.00    ${hot ? '0.00' : '97.10'}\n10:00:01 AM    1    1.80    0.00    0.70    0.30    0.00    0.10    0.00   97.10`); return 0; }
  },
  {
    name: 'sar', cat: 'Performance', summary: 'Historical activity reports (sysstat)', usage: 'sar [-u|-r|-q|-b] [-f /var/log/sa/saDD]', fidelity: 'static', pkg: 'sysstat',
    run(ctx) {
      const mode = ctx.args.find(a => /^-[urqbd]$/.test(a)) || '-u';
      const head = { '-u': 'CPU     %user     %nice   %system   %iowait    %steal     %idle', '-r': 'kbmemfree   kbavail kbmemused  %memused kbbuffers  kbcached', '-q': 'runq-sz  plist-sz   ldavg-1   ldavg-5  ldavg-15   blocked', '-b': '    tps      rtps      wtps   bread/s   bwrtn/s', '-d': 'DEV       tps     rkB/s     wkB/s   areq-sz    aqu-sz     await     %util' }[mode];
      const rows = { '-u': ['all      2.10      0.00      0.90      0.20      0.00     96.80', 'all     71.30      0.00      6.20      0.40      0.00     22.10', 'all      2.40      0.00      1.00      0.20      0.00     96.40'], '-r': [' 4219200   7493632   8406220     52.38    122880   3683200', '  312400   1210880  15120400     94.20    121880    902100', ' 4102200   7380120   8521300     53.10    122800   3650100'], '-q': ['      1       412      0.32      0.40      0.41         0', '     14       430     12.80      9.10      5.20         0', '      1       414      0.40      1.90      2.80         0'], '-b': ['   8.40      2.10      6.30     48.00    210.00', '  95.20     40.10     55.10   1640.00   4210.00', '   8.10      2.00      6.10     46.00    205.00'], '-d': ['dev8-0    8.40     48.00    210.00     30.70      0.01      0.70      0.60', 'dev8-0  1090.00   8400.00  35200.00     40.00     21.30    180.10     99.80', 'dev8-0    8.10     46.00    205.00     31.00      0.01      0.72      0.58'] }[mode];
      ctx.print(`Linux ${ctx.sys.kernel} (${ctx.sys.hostname})  10/09/2026  _x86_64_  (4 CPU)\n\n12:00:01 AM  ${head}\n02:10:01 AM  ${rows[0]}\n02:20:01 AM  ${rows[1]}\n02:30:01 AM  ${rows[2]}\nAverage:     ${rows[0]}`);
      return 0;
    }
  },
  {
    name: 'tcpdump', cat: 'Network', summary: 'Packet capture (representative output only)', usage: 'tcpdump -i IFACE -nn [-c N] [filter]', fidelity: 'static', pkg: 'tcpdump', bin: '/usr/sbin/tcpdump',
    run(ctx) {
      if (!ctx.requireRoot()) return 1;
      ctx.print(`dropped privs to tcpdump\ntcpdump: verbose output suppressed, use -v[v]... for full protocol decode\nlistening on ens192, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n10:00:01.112233 IP 10.10.40.50.51822 > 10.10.40.15.22: Flags [P.], seq 1:53, ack 1, win 501, length 52\n10:00:01.112480 IP 10.10.40.15.22 > 10.10.40.50.51822: Flags [.], ack 53, win 507, length 0\n10:00:02.004100 IP 10.10.40.15.41522 > 10.10.40.2.53: 4242+ A? repo.lab.example.com. (38)\n10:00:02.004601 IP 10.10.40.2.53 > 10.10.40.15.41522: 4242* 1/0/0 A 10.10.40.20 (54)\n4 packets captured\n(simulator: representative capture, not live traffic)`);
      return 0;
    }
  },
  {
    name: 'strace', cat: 'Processes', summary: 'Trace system calls (representative output only)', usage: 'strace [-c] [-f] -p PID | strace CMD', fidelity: 'static', pkg: 'strace',
    run(ctx) {
      if (ctx.args.includes('-c')) { ctx.print('% time     seconds  usecs/call     calls    errors syscall\n------ ----------- ----------- --------- --------- ----------------\n 61.20    0.004120          12       340           read\n 22.10    0.001488           9       160        40 openat\n  9.40    0.000633           3       190           fstat\n  7.30    0.000491           5        98           write\n------ ----------- ----------- --------- --------- ----------------\n100.00    0.006732           8       788        40 total'); return 0; }
      const pidIdx = ctx.args.indexOf('-p');
      const p = pidIdx >= 0 ? ctx.sys.processes.find(x => x.pid === Number(ctx.args[pidIdx + 1])) : null;
      if (pidIdx >= 0 && !p) { ctx.error(`strace: attach: ptrace(PTRACE_SEIZE, ${ctx.args[pidIdx + 1]}): No such process`); return 1; }
      if (p?.state === 'D') ctx.print(`strace: Process ${p.pid} attached\nread(5,  <unfinished ...>   (blocked in an uninterruptible I/O wait)`);
      else ctx.print(`strace: Process ${p?.pid ?? 4242} attached\nepoll_wait(4, [{events=EPOLLIN, data={u32=7}}], 64, 1000) = 1\naccept4(7, {sa_family=AF_INET, sin_port=htons(51822), sin_addr=inet_addr("10.10.40.50")}, [16], SOCK_CLOEXEC) = 9\nopenat(AT_FDCWD, "/opt/app/app.conf", O_RDONLY) = 10\nread(10, "listen_port=8080\\n...", 4096) = 61\nclose(10) = 0\n(simulator: representative trace)`);
      return 0;
    }
  }
];

export class Registry {
  constructor(sys) {
    this.sys = sys;
    this.map = new Map();
    for (const c of [...fileCommands, ...textCommands, ...userCommands, ...procCommands, ...serviceCommands, ...networkCommands, ...storageCommands, ...securityCommands, ...packageCommands, ...miscCommands]) this.map.set(c.name, c);
  }
  get(name) { return this.map.get(name); }
  all() { return [...this.map.values()]; }
  names() { return [...this.map.keys()]; }
  knownUnsupported(name) { return KNOWN_UNSUPPORTED.has(name); }
  /** True when the command's package is not installed (so it is absent from PATH). */
  requiresBinary(name) {
    const c = this.map.get(name);
    return !!(c?.pkg && !this.sys.packages.installed[c.pkg]);
  }
  pathOf(name, sys = this.sys) {
    const c = this.map.get(name);
    if (!c || c.builtin) return null;
    if (this.requiresBinary(name)) return null;
    if (c.bin) return c.bin;
    for (const dir of ['/usr/bin', '/usr/sbin']) if (sys.fs.tryResolve(`${dir}/${name}`)) return `${dir}/${name}`;
    return `/usr/bin/${name}`;
  }
}
