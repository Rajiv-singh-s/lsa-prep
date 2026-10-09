// Simulated RHEL-family host: a coherent state model that all commands read and mutate.
// Clearly a simulation: values are representative, not measured from real hardware.
import { VFS, S_IFDIR, S_IFREG, S_IFLNK, S_IFCHR, S_IFBLK, normalizePath } from './vfs.js';

export const HOSTNAME = 'srv01.lab.example.com';
const START_TIME = Date.UTC(2026, 9, 9, 9, 0, 0); // simulated clock origin

export const DEFAULT_FCONTEXTS = [
  // [regex, type] — evaluated in order, last match wins (local rules appended at the end)
  ['/.*', 'default_t'],
  ['/etc(/.*)?', 'etc_t'],
  ['/etc/shadow.*', 'shadow_t'],
  ['/etc/ssh(/.*)?', 'etc_t'],
  ['/etc/httpd(/.*)?', 'httpd_config_t'],
  ['/root(/.*)?', 'admin_home_t'],
  ['/home', 'home_root_t'],
  ['/home/[^/]+', 'user_home_dir_t'],
  ['/home/[^/]+/.+', 'user_home_t'],
  ['/home/[^/]+/\\.ssh(/.*)?', 'ssh_home_t'],
  ['/tmp(/.*)?', 'tmp_t'],
  ['/var(/.*)?', 'var_t'],
  ['/var/log(/.*)?', 'var_log_t'],
  ['/var/log/httpd(/.*)?', 'httpd_log_t'],
  ['/var/log/audit(/.*)?', 'auditd_log_t'],
  ['/var/www(/.*)?', 'httpd_sys_content_t'],
  ['/var/www/cgi-bin(/.*)?', 'httpd_sys_script_exec_t'],
  ['/srv(/.*)?', 'var_t'],
  ['/opt(/.*)?', 'usr_t'],
  ['/usr(/.*)?', 'usr_t'],
  ['/usr/bin(/.*)?', 'bin_t'],
  ['/usr/sbin(/.*)?', 'bin_t'],
  ['/usr/lib/systemd/system(/.*)?', 'systemd_unit_file_t'],
  ['/etc/systemd/system(/.*)?', 'systemd_unit_file_t'],
  ['/boot(/.*)?', 'boot_t'],
  ['/dev(/.*)?', 'device_t'],
  ['/proc(/.*)?', 'proc_t'],
  ['/sys(/.*)?', 'sysfs_t'],
  ['/run(/.*)?', 'var_run_t'],
  ['/mnt(/.*)?', 'mnt_t'],
  ['/data(/.*)?', 'default_t']
];

const BINARIES = {
  '/usr/bin': ['bash', 'sh', 'ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'ln', 'chmod', 'chown', 'chgrp', 'grep', 'sed', 'awk', 'find', 'sort', 'uniq', 'cut', 'tr', 'tee', 'head', 'tail', 'wc', 'less', 'more', 'file', 'stat', 'which', 'whereis', 'echo', 'printf', 'date', 'id', 'whoami', 'groups', 'getent', 'passwd', 'su', 'sudo', 'ps', 'top', 'kill', 'pkill', 'pgrep', 'pstree', 'free', 'uptime', 'df', 'du', 'lsblk', 'findmnt', 'mount', 'umount', 'uname', 'hostname', 'hostnamectl', 'systemctl', 'journalctl', 'ip', 'ss', 'ping', 'curl', 'dig', 'host', 'nmcli', 'tar', 'gzip', 'gunzip', 'bzip2', 'xargs', 'env', 'nice', 'renice', 'sleep', 'man', 'stat', 'readlink', 'chage', 'getfacl', 'setfacl', 'dnf', 'yum', 'rpm', 'vi', 'vim', 'nano', 'test', 'true', 'false', 'lsof', 'vmstat', 'iostat', 'crontab', 'timedatectl', 'chronyc', 'ssh', 'scp', 'ssh-keygen', 'logger', 'basename', 'dirname', 'seq', 'diff', 'apropos', 'locate', 'nl', 'paste', 'rev'],
  '/usr/sbin': ['useradd', 'usermod', 'userdel', 'groupadd', 'groupdel', 'groupmod', 'visudo', 'fdisk', 'parted', 'mkfs.xfs', 'mkfs.ext4', 'mkswap', 'swapon', 'swapoff', 'pvcreate', 'pvs', 'vgcreate', 'vgs', 'vgextend', 'lvcreate', 'lvs', 'lvextend', 'xfs_growfs', 'resize2fs', 'blkid', 'getenforce', 'setenforce', 'sestatus', 'getsebool', 'setsebool', 'semanage', 'restorecon', 'chcon', 'ausearch', 'firewall-cmd', 'sshd', 'httpd', 'crond', 'chronyd', 'auditd', 'NetworkManager', 'rsyslogd', 'sysctl', 'tuned-adm', 'lvremove', 'vgremove', 'pvremove']
};

export function createSystem(clockOverride) {
  const realStart = Date.now();
  const clock = clockOverride || (() => START_TIME + (Date.now() - realStart));
  const sys = {
    clock,
    hostname: HOSTNAME,
    bootTime: START_TIME - 45 * 86400000,
    kernel: '6.12.0-55.9.1.el10_0.x86_64',
    osName: 'Red Hat Enterprise Linux',
    osVersion: '10.0 (Coughlan)',
    users: [
      { name: 'root', uid: 0, gid: 0, gecos: 'root', home: '/root', shell: '/bin/bash', password: 'set', locked: false, expire: '', maxDays: 99999 },
      { name: 'bin', uid: 1, gid: 1, gecos: 'bin', home: '/bin', shell: '/sbin/nologin', password: 'none', locked: true },
      { name: 'daemon', uid: 2, gid: 2, gecos: 'daemon', home: '/sbin', shell: '/sbin/nologin', password: 'none', locked: true },
      { name: 'apache', uid: 48, gid: 48, gecos: 'Apache', home: '/usr/share/httpd', shell: '/sbin/nologin', password: 'none', locked: true },
      { name: 'sshd', uid: 74, gid: 74, gecos: 'Privilege-separated SSH', home: '/usr/share/empty.sshd', shell: '/sbin/nologin', password: 'none', locked: true },
      { name: 'chrony', uid: 992, gid: 990, gecos: 'chrony system user', home: '/var/lib/chrony', shell: '/sbin/nologin', password: 'none', locked: true },
      { name: 'student', uid: 1000, gid: 1000, gecos: 'Student', home: '/home/student', shell: '/bin/bash', password: 'set', locked: false, expire: '', maxDays: 99999 },
      { name: 'devuser', uid: 1001, gid: 1001, gecos: 'Developer', home: '/home/devuser', shell: '/bin/bash', password: 'set', locked: false, expire: '', maxDays: 99999 }
    ],
    groups: [
      { name: 'root', gid: 0, members: [] }, { name: 'bin', gid: 1, members: [] }, { name: 'daemon', gid: 2, members: [] },
      { name: 'wheel', gid: 10, members: ['student'] }, { name: 'apache', gid: 48, members: [] }, { name: 'sshd', gid: 74, members: [] },
      { name: 'chrony', gid: 990, members: [] }, { name: 'student', gid: 1000, members: [] }, { name: 'devuser', gid: 1001, members: [] }
    ],
    session: { user: 'root', cwd: '/root', umask: 0o022, env: {}, stack: [] },
    history: [],
    lastExit: 0,
    processes: [],
    nextPid: 4100,
    services: {},
    journal: [],
    audit: [],
    selinux: { mode: 'enforcing', configMode: 'enforcing', policy: 'targeted', booleans: {}, fcontextLocal: [], ports: {} },
    firewall: { running: true, defaultZone: 'public', runtime: {}, permanent: {} },
    net: {},
    storage: {},
    packages: { installed: {}, repos: [], available: {} },
    cron: {},
    sysctl: { 'vm.swappiness': '60', 'net.ipv4.ip_forward': '0', 'fs.file-max': '9223372036854775807', 'kernel.pid_max': '4194304' },
    tuned: 'virtual-guest',
    jobs: []
  };
  sys.fs = new VFS(clock);
  seedFilesystem(sys);
  seedPackages(sys);
  seedServices(sys);
  seedNetwork(sys);
  seedStorage(sys);
  seedSecurity(sys);
  seedProcesses(sys);
  seedJournal(sys);
  return sys;
}

// ---------- user helpers ----------
export function userByName(sys, name) { return sys.users.find(u => u.name === name); }
export function userByUid(sys, uid) { return sys.users.find(u => u.uid === uid); }
export function groupByName(sys, name) { return sys.groups.find(g => g.name === name); }
export function groupByGid(sys, gid) { return sys.groups.find(g => g.gid === gid); }
export function supplementaryGids(sys, name) { return sys.groups.filter(g => g.members.includes(name)).map(g => g.gid); }
export function currentUser(sys) {
  const u = userByName(sys, sys.session.user);
  return { uid: u.uid, gid: u.gid, groups: supplementaryGids(sys, u.name), name: u.name, home: u.home };
}
export function uname(sys, uid) { return userByUid(sys, uid)?.name ?? String(uid); }
export function gname(sys, gid) { return groupByGid(sys, gid)?.name ?? String(gid); }

// ---------- SELinux helpers ----------
export function expectedContext(sys, path) {
  let type = 'default_t';
  const rules = [...DEFAULT_FCONTEXTS, ...sys.selinux.fcontextLocal.map(r => [r.regex, r.type])];
  for (const [re, t] of rules) {
    try { if (new RegExp(`^${re}$`).test(path)) type = t; } catch { /* ignore bad regex */ }
  }
  const user = path.startsWith('/home') || path.startsWith('/root') ? 'unconfined_u' : 'system_u';
  return `${user}:object_r:${type}:s0`;
}
export const ctxType = (ctx) => (ctx || '').split(':')[2] || '';

// ---------- filesystem seeding ----------
function mk(sys, path, type, mode, uid = 0, gid = 0, extra = {}) {
  const fs = sys.fs;
  const parts = path.split('/').filter(Boolean);
  let cur = '';
  for (let i = 0; i < parts.length - 1; i++) {
    cur += '/' + parts[i];
    if (!fs.exists(cur)) mk(sys, cur, S_IFDIR, 0o755);
  }
  const node = fs.create(path, '/', type, { mode, umask: 0, ctx: expectedContext(sys, path), ...extra });
  node.uid = uid; node.gid = gid; node.mode = mode;
  if (extra.size !== undefined) node.size = extra.size;
  return node;
}
export function writeSeed(sys, path, content, mode = 0o644, uid = 0, gid = 0) {
  return mk(sys, path, S_IFREG, mode, uid, gid, { data: content });
}

function passwdText(sys) {
  return sys.users.map(u => `${u.name}:x:${u.uid}:${u.gid}:${u.gecos || ''}:${u.home}:${u.shell}`).join('\n') + '\n';
}
function shadowText(sys) {
  return sys.users.map(u => {
    const hash = u.password === 'set' ? (u.locked ? '!' : '') + '$6$rounds=5000$simulated$hash' : u.locked ? '!!' : '';
    return `${u.name}:${hash}:20370:0:${u.maxDays ?? 99999}:7::${u.expireDays ?? ''}:`;
  }).join('\n') + '\n';
}
function groupText(sys) {
  return sys.groups.map(g => `${g.name}:x:${g.gid}:${g.members.join(',')}`).join('\n') + '\n';
}

export function generators(sys) {
  return {
    passwd: () => passwdText(sys),
    shadow: () => shadowText(sys),
    group: () => groupText(sys),
    loadavg: () => `${loadString(sys)} 2/${200 + sys.processes.length} ${sys.nextPid}\n`,
    meminfo: () => meminfoText(sys),
    uptime: () => `${Math.round((sys.clock() - sys.bootTime) / 1000)}.42 ${Math.round((sys.clock() - sys.bootTime) / 1000 * 3.7)}.10\n`,
    mounts: () => [...sys.fs.mounts].map(([mp, m]) => `${m.source} ${mp} ${m.fstype} ${m.readonly ? 'ro' : 'rw'},${m.options || 'relatime'} 0 0`).join('\n') + '\n',
    filenr: () => `${2048 + sys.processes.length * 12}\t0\t9223372036854775807\n`
  };
}

function genFile(sys, path, key, mode = 0o644) {
  const node = mk(sys, path, S_IFREG, mode);
  node.gen = generators(sys)[key];
  node.genKey = key;
  node.readonlyGen = true;
}

export function loadString(sys) {
  const busy = sys.processes.filter(p => p.cpu > 50).length;
  const base = 0.32 + busy * 0.95;
  return `${base.toFixed(2)} ${(base * 0.9 + 0.1).toFixed(2)} ${(base * 0.8 + 0.15).toFixed(2)}`;
}

export function memory(sys) {
  const total = 16048; // MiB
  const used = Math.round(2100 + sys.processes.reduce((s, p) => s + (p.rssMb || 0), 0));
  const buff = 3717;
  const shared = 385;
  const free = Math.max(120, total - used - buff);
  const available = Math.max(80, free + Math.round(buff * 0.85));
  return { total, used, free, shared, buff, available, swapTotal: 4096, swapUsed: used > 12000 ? 900 : 0 };
}

function meminfoText(sys) {
  const m = memory(sys);
  const kb = (mb) => String(mb * 1024).padStart(8);
  return `MemTotal:       ${kb(m.total)} kB\nMemFree:        ${kb(m.free)} kB\nMemAvailable:   ${kb(m.available)} kB\nBuffers:        ${kb(120)} kB\nCached:         ${kb(m.buff - 120)} kB\nSwapCached:            0 kB\nShmem:          ${kb(m.shared)} kB\nSwapTotal:      ${kb(m.swapTotal)} kB\nSwapFree:       ${kb(m.swapTotal - m.swapUsed)} kB\n`;
}

function seedFilesystem(sys) {
  const fs = sys.fs;
  const root = fs.get(fs.rootIno);
  root.ctx = 'system_u:object_r:root_t:s0';
  for (const d of ['/boot', '/dev', '/etc', '/home', '/mnt', '/opt', '/proc', '/run', '/srv', '/sys', '/usr', '/usr/bin', '/usr/sbin', '/usr/lib', '/usr/share', '/usr/share/doc', '/usr/local', '/var', '/var/log', '/var/tmp', '/var/spool', '/var/lib', '/var/www', '/var/www/html', '/var/crash', '/media']) mk(sys, d, S_IFDIR, 0o755);
  mk(sys, '/root', S_IFDIR, 0o550);
  mk(sys, '/tmp', S_IFDIR, 0o1777);
  sys.fs.get(sys.fs.resolve('/var/tmp').node.ino).mode = 0o1777;
  mk(sys, '/bin', S_IFLNK, 0o777, 0, 0, { target: 'usr/bin' });
  mk(sys, '/sbin', S_IFLNK, 0o777, 0, 0, { target: 'usr/sbin' });
  mk(sys, '/lib', S_IFLNK, 0o777, 0, 0, { target: 'usr/lib' });

  for (const [dir, bins] of Object.entries(BINARIES)) {
    for (const b of [...new Set(bins)]) {
      const special = { passwd: 0o4755, su: 0o4755, sudo: 0o4111, chage: 0o4755 }[b] || 0o755;
      const n = mk(sys, `${dir}/${b}`, S_IFREG, special, 0, 0, { data: `\u007fELF simulated binary: ${b}` });
      n.size = 30000 + (b.length * 7919) % 140000;
    }
  }
  // /dev
  for (const [name, type] of [['null', S_IFCHR], ['zero', S_IFCHR], ['urandom', S_IFCHR], ['tty', S_IFCHR], ['sda', S_IFBLK], ['sda1', S_IFBLK], ['sda2', S_IFBLK], ['sdb', S_IFBLK], ['sdc', S_IFBLK]]) {
    mk(sys, `/dev/${name}`, type, type === S_IFCHR ? 0o666 : 0o660, 0, type === S_IFBLK ? 6 : 0);
  }
  // /etc
  sys.groups.push({ name: 'disk', gid: 6, members: [] });
  genFile(sys, '/etc/passwd', 'passwd', 0o644);
  genFile(sys, '/etc/shadow', 'shadow', 0o000);
  genFile(sys, '/etc/group', 'group', 0o644);
  writeSeed(sys, '/etc/hostname', `${HOSTNAME}\n`);
  writeSeed(sys, '/etc/hosts', `127.0.0.1   localhost localhost.localdomain\n::1         localhost localhost.localdomain\n10.10.40.15 ${HOSTNAME} srv01\n10.10.40.20 repo.lab.example.com repo\n`);
  writeSeed(sys, '/etc/resolv.conf', '# Generated by NetworkManager\nsearch lab.example.com\nnameserver 10.10.40.2\n');
  writeSeed(sys, '/etc/os-release', 'NAME="Red Hat Enterprise Linux"\nVERSION="10.0 (Coughlan)"\nID="rhel"\nID_LIKE="centos fedora"\nVERSION_ID="10.0"\nPLATFORM_ID="platform:el10"\nPRETTY_NAME="Red Hat Enterprise Linux 10.0 (Coughlan)"\n');
  writeSeed(sys, '/etc/redhat-release', 'Red Hat Enterprise Linux release 10.0 (Coughlan)\n');
  writeSeed(sys, '/etc/fstab', '#\n# /etc/fstab — simulated. Fields: device  mountpoint  fstype  options  dump  fsck\n#\n/dev/mapper/rhel-root   /       xfs     defaults        0 0\nUUID=6a2c4f1e-3b9d-4c1a-9e2f-0d1b2c3d4e5f /boot xfs defaults 0 0\n/dev/mapper/rhel-swap   none    swap    defaults        0 0\n');
  writeSeed(sys, '/etc/login.defs', 'PASS_MAX_DAYS\t99999\nPASS_MIN_DAYS\t0\nPASS_WARN_AGE\t7\nUID_MIN\t\t1000\nUID_MAX\t\t60000\nSYS_UID_MIN\t201\nSYS_UID_MAX\t999\nCREATE_HOME\tyes\nUMASK\t\t022\nHOME_MODE\t0700\nUSERGROUPS_ENAB yes\nENCRYPT_METHOD SHA512\n');
  writeSeed(sys, '/etc/sudoers', '## Simulated sudoers. Edit with visudo in real systems.\nDefaults   !visiblepw\nroot    ALL=(ALL)       ALL\n%wheel  ALL=(ALL)       ALL\n#includedir /etc/sudoers.d\n', 0o440);
  mk(sys, '/etc/sudoers.d', S_IFDIR, 0o750);
  writeSeed(sys, '/etc/selinux/config', 'SELINUX=enforcing\nSELINUXTYPE=targeted\n');
  writeSeed(sys, '/etc/ssh/sshd_config', '# Simulated sshd_config (excerpt)\nInclude /etc/ssh/sshd_config.d/*.conf\nPort 22\nPermitRootLogin prohibit-password\nPubkeyAuthentication yes\nPasswordAuthentication yes\nMaxAuthTries 6\nX11Forwarding no\nSubsystem sftp /usr/libexec/openssh/sftp-server\n', 0o600);
  mk(sys, '/etc/ssh/sshd_config.d', S_IFDIR, 0o755);
  writeSeed(sys, '/etc/chrony.conf', 'pool 2.rhel.pool.ntp.org iburst\nsourcedir /run/chrony-dhcp\ndriftfile /var/lib/chrony/drift\nmakestep 1.0 3\nrtcsync\nlogdir /var/log/chrony\n');
  writeSeed(sys, '/etc/logrotate.conf', 'weekly\nrotate 4\ncreate\ndateext\ninclude /etc/logrotate.d\n');
  writeSeed(sys, '/etc/logrotate.d/httpd', '/var/log/httpd/*log {\n    missingok\n    notifempty\n    sharedscripts\n    delaycompress\n    postrotate\n        /bin/systemctl reload httpd.service > /dev/null 2>/dev/null || true\n    endscript\n}\n');
  writeSeed(sys, '/etc/crontab', 'SHELL=/bin/bash\nPATH=/sbin:/bin:/usr/sbin:/usr/bin\nMAILTO=root\n# minute hour day-of-month month day-of-week user command\n');
  writeSeed(sys, '/etc/yum.repos.d/rhel.repo', '[rhel-10-baseos]\nname=RHEL 10 BaseOS (lab mirror)\nbaseurl=http://repo.lab.example.com/rhel10/BaseOS\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release\n\n[rhel-10-appstream]\nname=RHEL 10 AppStream (lab mirror)\nbaseurl=http://repo.lab.example.com/rhel10/AppStream\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release\n');
  writeSeed(sys, '/etc/httpd/conf/httpd.conf', '# Simulated httpd.conf (excerpt)\nServerRoot "/etc/httpd"\nListen 80\nUser apache\nGroup apache\nDocumentRoot "/var/www/html"\n<Directory "/var/www/html">\n    Require all granted\n</Directory>\nErrorLog "logs/error_log"\n');
  mk(sys, '/etc/systemd/system', S_IFDIR, 0o755);
  writeSeed(sys, '/etc/systemd/journald.conf', '[Journal]
#Storage=auto
#Compress=yes
#SystemMaxUse=
#SystemKeepFree=
#MaxRetentionSec=
');
  writeSeed(sys, '/etc/sysctl.conf', '# System default settings live in /usr/lib/sysctl.d/00-system.conf.
# Add overrides in /etc/sysctl.d/*.conf
');
  mk(sys, '/etc/sysctl.d', S_IFDIR, 0o755);
  writeSeed(sys, '/etc/nsswitch.conf', 'passwd:     files
group:      files
hosts:      files dns myhostname
');
  writeSeed(sys, '/etc/exports', '');
  writeSeed(sys, '/etc/auto.master', '/misc   /etc/auto.misc
/net    -hosts
+dir:/etc/auto.master.d
');
  mk(sys, '/etc/auto.master.d', S_IFDIR, 0o755);
  mk(sys, '/etc/cron.d', S_IFDIR, 0o755);
  mk(sys, '/etc/pki/tls/certs', S_IFDIR, 0o755);
  writeSeed(sys, '/etc/pki/tls/certs/app.crt', '-----BEGIN CERTIFICATE-----
MIIDsimulatedCERTIFICATEdataONLYforLEARNING
-----END CERTIFICATE-----
');
  mk(sys, '/etc/systemd/system/multi-user.target.wants', S_IFDIR, 0o755);
  writeSeed(sys, '/etc/motd', 'Simulated RHEL 10 lab host. Nothing here runs on a real kernel.\n');
  writeSeed(sys, '/etc/profile', '# /etc/profile (excerpt)\npathmunge () { :; }\nexport HISTSIZE=1000\n');
  writeSeed(sys, '/etc/bashrc', '# /etc/bashrc (excerpt)\n[ "$PS1" = "\\\\s-\\\\v\\\\\\$ " ] && PS1="[\\u@\\h \\W]\\\\$ "\n');
  // /proc, /sys
  writeSeed(sys, '/proc/cpuinfo', Array.from({ length: 4 }, (_, i) => `processor\t: ${i}\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Xeon(R) Gold 6338 CPU @ 2.00GHz\ncpu MHz\t\t: 2000.000\ncpu cores\t: 4\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov lm vmx\n`).join('\n'), 0o444);
  writeSeed(sys, '/proc/version', `Linux version ${sys.kernel} (mockbuild@example) (gcc (GCC) 14.2.1) #1 SMP PREEMPT_DYNAMIC\n`, 0o444);
  writeSeed(sys, '/proc/cmdline', `BOOT_IMAGE=(hd0,gpt2)/vmlinuz-${sys.kernel} root=/dev/mapper/rhel-root ro crashkernel=1G-4G:192M rd.lvm.lv=rhel/root rd.lvm.lv=rhel/swap\n`, 0o444);
  genFile(sys, '/proc/loadavg', 'loadavg', 0o444);
  genFile(sys, '/proc/meminfo', 'meminfo', 0o444);
  genFile(sys, '/proc/uptime', 'uptime', 0o444);
  genFile(sys, '/proc/mounts', 'mounts', 0o444);
  genFile(sys, '/proc/sys/fs/file-nr', 'filenr', 0o444);
  writeSeed(sys, '/proc/sys/vm/swappiness', '60\n');
  writeSeed(sys, '/proc/sys/net/ipv4/ip_forward', '0\n');
  writeSeed(sys, '/sys/class/net/ens192/mtu', '1500\n', 0o444);
  writeSeed(sys, '/sys/block/sda/queue/scheduler', 'none [mq-deadline] kyber bfq\n', 0o444);
  // homes
  for (const u of sys.users.filter(x => x.uid >= 1000)) {
    mk(sys, u.home, S_IFDIR, 0o700, u.uid, u.gid);
    writeSeed(sys, `${u.home}/.bashrc`, '# .bashrc\n[ -f /etc/bashrc ] && . /etc/bashrc\n', 0o644, u.uid, u.gid);
    writeSeed(sys, `${u.home}/.bash_profile`, '# .bash_profile\n[ -f ~/.bashrc ] && . ~/.bashrc\n', 0o644, u.uid, u.gid);
  }
  writeSeed(sys, '/home/student/notes.txt', 'Linux lab notes\nRemember: check logs before restarting services.\nerror: disk quota warning on /home\nTODO: rotate application logs\n', 0o644, 1000, 1000);
  writeSeed(sys, '/root/.bashrc', '# .bashrc\nalias rm=\'rm -i\'\nalias cp=\'cp -i\'\nalias mv=\'mv -i\'\n', 0o644);
  writeSeed(sys, '/root/anaconda-ks.cfg', '#version=RHEL10\nlang en_US.UTF-8\nkeyboard us\ntimezone UTC --utc\nrootpw --lock\n', 0o600);
  // logs
  writeSeed(sys, '/var/log/messages', '', 0o600);
  writeSeed(sys, '/var/log/secure', 'Oct  9 08:58:01 srv01 sshd[1024]: Server listening on 0.0.0.0 port 22.\nOct  9 09:01:12 srv01 sshd[3311]: Accepted publickey for student from 10.10.40.50 port 51822 ssh2: ED25519 SHA256:Qm9vT0sr\nOct  9 09:02:44 srv01 sshd[3402]: Failed password for invalid user admin from 203.0.113.77 port 40112 ssh2\nOct  9 09:02:47 srv01 sshd[3402]: Failed password for invalid user admin from 203.0.113.77 port 40112 ssh2\nOct  9 09:03:10 srv01 sudo[3460]:  student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/systemctl restart httpd\n', 0o600);
  writeSeed(sys, '/var/log/cron', 'Oct  9 09:00:01 srv01 CROND[3200]: (root) CMD (run-parts /etc/cron.hourly)\n', 0o600);
  writeSeed(sys, '/var/log/dnf.log', '2026-10-01T03:12:44+0000 INFO --- logging initialized ---\n2026-10-01T03:12:50+0000 DDEBUG Command: dnf -y update openssl\n2026-10-01T03:13:20+0000 INFO Complete!\n', 0o600);
  mk(sys, '/var/log/audit', S_IFDIR, 0o700);
  writeSeed(sys, '/var/log/audit/audit.log', '', 0o600);
  mk(sys, '/var/log/httpd', S_IFDIR, 0o700);
  writeSeed(sys, '/var/log/httpd/access_log', '10.10.40.50 - - [09/Oct/2026:09:10:01 +0000] "GET / HTTP/1.1" 200 45 "-" "curl/8.9"\n10.10.40.51 - - [09/Oct/2026:09:10:07 +0000] "GET /missing HTTP/1.1" 404 196 "-" "Mozilla/5.0"\n10.10.40.50 - - [09/Oct/2026:09:11:22 +0000] "GET /app HTTP/1.1" 503 299 "-" "curl/8.9"\n', 0o644);
  writeSeed(sys, '/var/log/httpd/error_log', '[Fri Oct 09 09:11:22 2026] [proxy:error] [pid 2841] (13)Permission denied: AH00957: http: attempt to connect to 127.0.0.1:8080 (localhost) failed\n', 0o644);
  writeSeed(sys, '/var/www/html/index.html', '<h1>srv01 lab web server</h1>\n', 0o644);
  mk(sys, '/var/lib/chrony', S_IFDIR, 0o750, 992, 990);
  mk(sys, '/var/spool/cron', S_IFDIR, 0o700);
  writeSeed(sys, '/usr/share/doc/README.simulator', 'This is a simulated Linux host for learning. Commands are implemented in JavaScript.\nType "help" in the terminal for the supported command list and their fidelity.\n');
  writeSeed(sys, '/opt/app/app.conf', 'listen_port=8080\nlog_dir=/var/log/app\nmax_connections=512\n');
  writeSeed(sys, '/opt/app/bin/start.sh', '#!/bin/bash\n# start the demo application\necho "starting app on port 8080"\n', 0o755);
  mk(sys, '/var/log/app', S_IFDIR, 0o755);
  writeSeed(sys, '/var/log/app/app.log', '2026-10-09 08:55:01 INFO  app started pid=2950 port=8080\n2026-10-09 09:05:13 WARN  slow query 2300ms user=report\n2026-10-09 09:07:40 ERROR connection refused db01:5432\n2026-10-09 09:07:41 ERROR connection refused db01:5432\n2026-10-09 09:08:02 INFO  retry succeeded db01:5432\n2026-10-09 09:12:30 ERROR timeout calling payments-api\n', 0o644);
  writeSeed(sys, '/srv/data/report.csv', 'host,cpu,mem,disk\nweb01,45,62,71\nweb02,88,91,64\ndb01,32,78,93\napp01,12,40,22\n');
  mk(sys, '/data', S_IFDIR, 0o755);
  fs.mounts.set('/', { source: '/dev/mapper/rhel-root', fstype: 'xfs', options: 'seclabel,relatime', readonly: false });
  fs.mounts.set('/boot', { source: '/dev/sda1', fstype: 'xfs', options: 'seclabel,relatime', readonly: false });
  fs.mounts.set('/proc', { source: 'proc', fstype: 'proc', options: 'nosuid,nodev,noexec', readonly: false, virtual: true });
  fs.mounts.set('/sys', { source: 'sysfs', fstype: 'sysfs', options: 'nosuid,nodev,noexec', readonly: false, virtual: true });
  fs.mounts.set('/dev', { source: 'devtmpfs', fstype: 'devtmpfs', options: 'nosuid', readonly: false, virtual: true });
  fs.mounts.set('/run', { source: 'tmpfs', fstype: 'tmpfs', options: 'nosuid,nodev', readonly: false, virtual: true });
}

// ---------- services ----------
export function unitText(svc) {
  return `[Unit]\nDescription=${svc.description}\n${svc.after ? `After=${svc.after}\n` : ''}\n[Service]\nType=${svc.type || 'simple'}\nExecStart=${svc.exec}\n${svc.restart ? `Restart=${svc.restart}\n` : ''}${svc.user ? `User=${svc.user}\n` : ''}\n[Install]\nWantedBy=${svc.wantedBy || 'multi-user.target'}\n`;
}

function seedServices(sys) {
  const def = (name, o) => { sys.services[name] = { name, active: 'inactive', enabled: 'disabled', pid: null, ports: [], since: sys.bootTime + 60000, ...o }; };
  def('sshd', { description: 'OpenSSH server daemon', exec: '/usr/sbin/sshd -D', active: 'active', enabled: 'enabled', ports: [['tcp', 22]], package: 'openssh-server', user: 'root', rssMb: 8 });
  def('httpd', { description: 'The Apache HTTP Server', exec: '/usr/sbin/httpd -DFOREGROUND', active: 'active', enabled: 'enabled', ports: [['tcp', 80]], package: 'httpd', type: 'notify', user: 'root', rssMb: 62 });
  def('crond', { description: 'Command Scheduler', exec: '/usr/sbin/crond -n', active: 'active', enabled: 'enabled', package: 'cronie', rssMb: 3 });
  def('chronyd', { description: 'NTP client/server', exec: '/usr/sbin/chronyd -F 2', active: 'active', enabled: 'enabled', ports: [['udp', 323]], package: 'chrony', user: 'chrony', rssMb: 4 });
  def('firewalld', { description: 'firewalld - dynamic firewall daemon', exec: '/usr/sbin/firewalld --nofork --nopid', active: 'active', enabled: 'enabled', package: 'firewalld', rssMb: 40 });
  def('NetworkManager', { description: 'Network Manager', exec: '/usr/sbin/NetworkManager --no-daemon', active: 'active', enabled: 'enabled', package: 'NetworkManager', rssMb: 18 });
  def('auditd', { description: 'Security Auditing Service', exec: '/sbin/auditd', active: 'active', enabled: 'enabled', package: 'audit', rssMb: 3, type: 'forking' });
  def('rsyslog', { description: 'System Logging Service', exec: '/usr/sbin/rsyslogd -n', active: 'active', enabled: 'enabled', package: 'rsyslog', rssMb: 6 });
  def('systemd-journald', { description: 'Journal Service', exec: '/usr/lib/systemd/systemd-journald', active: 'active', enabled: 'static', package: 'systemd', rssMb: 30 });
  def('tuned', { description: 'Dynamic System Tuning Daemon', exec: '/usr/sbin/tuned -l -P', active: 'active', enabled: 'enabled', package: 'tuned', rssMb: 20 });
  def('mariadb', { description: 'MariaDB database server', exec: '/usr/libexec/mariadbd --basedir=/usr', ports: [['tcp', 3306]], package: 'mariadb-server', user: 'mysql', rssMb: 180 });
  def('nginx', { description: 'The nginx HTTP and reverse proxy server', exec: '/usr/sbin/nginx', ports: [['tcp', 80]], package: 'nginx', type: 'forking', rssMb: 10 });
  def('autofs', { description: 'Automounts filesystems on demand', exec: '/usr/sbin/automount --systemd-service --dont-check-daemon', package: 'autofs', type: 'notify', rssMb: 4 });
  def('nfs-server', { description: 'NFS server and services', exec: '/usr/sbin/rpc.nfsd', package: 'nfs-utils', type: 'oneshot', rssMb: 2 });
  def('app', { description: 'Demo business application', exec: '/opt/app/bin/start.sh', active: 'failed', enabled: 'enabled', ports: [['tcp', 8080]], custom: true, failReason: 'exit-code', rssMb: 120, after: 'network-online.target' });
  for (const [name, svc] of Object.entries(sys.services)) {
    if (svc.package && !sys.packages.installed[svc.package]) continue; // unit ships with the package
    const dir = svc.custom ? '/etc/systemd/system' : '/usr/lib/systemd/system';
    writeSeed(sys, `${dir}/${name}.service`, unitText(svc));
    if (svc.enabled === 'enabled') {
      mk(sys, `/etc/systemd/system/multi-user.target.wants/${name}.service`, S_IFLNK, 0o777, 0, 0, { target: `${dir}/${name}.service` });
    }
  }
  for (const t of ['multi-user', 'graphical', 'rescue', 'emergency', 'network-online', 'default']) {
    if (t === 'default') mk(sys, '/etc/systemd/system/default.target', S_IFLNK, 0o777, 0, 0, { target: '/usr/lib/systemd/system/multi-user.target' });
    else writeSeed(sys, `/usr/lib/systemd/system/${t}.target`, `[Unit]\nDescription=${t} target\n`);
  }
}

// ---------- network ----------
function seedNetwork(sys) {
  sys.net = {
    interfaces: [
      { name: 'lo', mac: '00:00:00:00:00:00', mtu: 65536, state: 'UNKNOWN', ipv4: ['127.0.0.1/8'], ipv6: ['::1/128'], up: true, rx: 18234, tx: 18234 },
      { name: 'ens192', mac: '00:50:56:a1:2b:3c', mtu: 1500, state: 'UP', ipv4: ['10.10.40.15/24'], ipv6: ['fe80::250:56ff:fea1:2b3c/64'], up: true, rx: 948213, tx: 552190, connection: 'ens192' },
      { name: 'ens224', mac: '00:50:56:a1:9f:01', mtu: 1500, state: 'DOWN', ipv4: [], ipv6: [], up: false, rx: 0, tx: 0, connection: null }
    ],
    routes: [
      { dest: 'default', via: '10.10.40.1', dev: 'ens192', proto: 'static', metric: 100 },
      { dest: '10.10.40.0/24', dev: 'ens192', proto: 'kernel', scope: 'link', src: '10.10.40.15', metric: 100 }
    ],
    connections: {
      ens192: { name: 'ens192', uuid: '5fb06bd0-0bb0-7ffb-45f1-d6edd65f3e03', type: 'ethernet', device: 'ens192', method: 'manual', addresses: ['10.10.40.15/24'], gateway: '10.10.40.1', dns: ['10.10.40.2'], autoconnect: 'yes', ipv6method: 'auto' }
    },
    dns: {
      'repo.lab.example.com': '10.10.40.20', 'db01.lab.example.com': '10.10.40.30', 'web01.lab.example.com': '10.10.40.41',
      'www.redhat.com': '23.215.0.136', 'access.redhat.com': '23.200.88.10', 'example.com': '93.184.215.14', 'ntp.lab.example.com': '10.10.40.3'
    },
    reachable: ['10.10.40.1', '10.10.40.2', '10.10.40.3', '10.10.40.20', '10.10.40.30', '10.10.40.41', '127.0.0.1', '23.215.0.136', '93.184.215.14', '8.8.8.8', '23.200.88.10'],
    dnsServerUp: true,
    remotePorts: { '10.10.40.30': [22, 5432], '10.10.40.20': [22, 80, 443], '10.10.40.41': [22, 80, 443], '93.184.215.14': [80, 443], '23.215.0.136': [443] }
  };
}

// ---------- storage ----------
function seedStorage(sys) {
  sys.storage = {
    disks: {
      sda: { size: 50 * 1024, model: 'Virtual disk', label: 'gpt', partitions: [
        { name: 'sda1', start: 1, size: 1024, type: 'linux', fstype: 'xfs', uuid: '6a2c4f1e-3b9d-4c1a-9e2f-0d1b2c3d4e5f' },
        { name: 'sda2', start: 1025, size: 49 * 1024 - 1, type: 'lvm', fstype: 'LVM2_member', uuid: 'aB3dEf-Gh1j-kL2m-Np3q-Rs4t-Uv5w-Xy6z7A' }
      ] },
      sdb: { size: 10 * 1024, model: 'Virtual disk', label: null, partitions: [] },
      sdc: { size: 5 * 1024, model: 'Virtual disk', label: null, partitions: [] }
    },
    pvs: { '/dev/sda2': { vg: 'rhel', size: 49 * 1024 - 4, uuid: 'aB3dEf-Gh1j-kL2m-Np3q-Rs4t-Uv5w-Xy6z7A' } },
    vgs: { rhel: { pvs: ['/dev/sda2'], extent: 4 } },
    lvs: {
      'rhel/root': { vg: 'rhel', name: 'root', size: 40 * 1024, fstype: 'xfs', uuid: '0c6f1a2b-8d3e-4f5a-9b6c-7d8e9f0a1b2c', fsSize: 40 * 1024 },
      'rhel/swap': { vg: 'rhel', name: 'swap', size: 4 * 1024, fstype: 'swap', uuid: '7e1d2c3b-4a59-4687-b7c6-d5e4f3a2b1c0', fsSize: 4 * 1024 }
    },
    filesystems: { // device -> { fstype, uuid, size(MiB), used(MiB), inodes, iused }
      '/dev/mapper/rhel-root': { fstype: 'xfs', uuid: '0c6f1a2b-8d3e-4f5a-9b6c-7d8e9f0a1b2c', size: 40 * 1024, used: 9830, inodes: 20971520, iused: 241080 },
      '/dev/sda1': { fstype: 'xfs', uuid: '6a2c4f1e-3b9d-4c1a-9e2f-0d1b2c3d4e5f', size: 1014, used: 280, inodes: 524288, iused: 340 },
      '/dev/mapper/rhel-swap': { fstype: 'swap', uuid: '7e1d2c3b-4a59-4687-b7c6-d5e4f3a2b1c0', size: 4096, used: 0 }
    },
    swaps: ['/dev/mapper/rhel-swap'],
    nfsExports: { 'nfs01.lab.example.com:/exports/shared': { reachable: true } }
  };
  sys.net.dns['nfs01.lab.example.com'] = '10.10.40.25';
  sys.net.reachable.push('10.10.40.25');
}

// ---------- security ----------
function seedSecurity(sys) {
  sys.selinux.booleans = {
    httpd_can_network_connect: false, httpd_can_network_connect_db: false, httpd_enable_homedirs: false,
    httpd_use_nfs: false, samba_enable_home_dirs: false, ftpd_anon_write: false, use_nfs_home_dirs: false, ssh_sysadm_login: false
  };
  sys.selinux.ports = {
    http_port_t: { tcp: [80, 81, 443, 488, 8008, 8009, 8443, 9000] },
    ssh_port_t: { tcp: [22] },
    mysqld_port_t: { tcp: [1186, 3306, 63132, 63164] },
    http_cache_port_t: { tcp: [8080, 8118, 8123, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010] }
  };
  const zone = () => ({ services: ['cockpit', 'dhcpv6-client', 'ssh'], ports: [], interfaces: ['ens192'], sources: [], richRules: [], target: 'default' });
  sys.firewall.runtime = { public: zone(), trusted: { services: [], ports: [], interfaces: [], sources: [], richRules: [], target: 'ACCEPT' }, internal: { services: ['cockpit', 'dhcpv6-client', 'mdns', 'samba-client', 'ssh'], ports: [], interfaces: [], sources: [], richRules: [], target: 'default' } };
  sys.firewall.permanent = structuredClone(sys.firewall.runtime);
}

// ---------- packages ----------
function seedPackages(sys) {
  const pkg = (name, version, release, summary, extra = {}) => ({ name, version, release, arch: 'x86_64', summary, repo: extra.repo || 'rhel-10-baseos', files: extra.files || [], requires: extra.requires || [], size: extra.size || '1.2 M' });
  const installed = [
    pkg('bash', '5.2.26', '6.el10', 'The GNU Bourne Again shell', { files: ['/usr/bin/bash'] }),
    pkg('coreutils', '9.5', '6.el10', 'A set of basic GNU tools commonly used in shell scripts', { files: ['/usr/bin/ls', '/usr/bin/cp', '/usr/bin/mv', '/usr/bin/cat'] }),
    pkg('openssh-server', '9.9p1', '7.el10', 'An open source SSH server daemon', { files: ['/usr/sbin/sshd', '/etc/ssh/sshd_config'] }),
    pkg('httpd', '2.4.63', '1.el10', 'Apache HTTP Server', { repo: 'rhel-10-appstream', files: ['/usr/sbin/httpd', '/etc/httpd/conf/httpd.conf'], requires: ['httpd-core', 'apr'] }),
    pkg('systemd', '257', '9.el10', 'System and Service Manager', { files: ['/usr/bin/systemctl', '/usr/bin/journalctl'] }),
    pkg('firewalld', '2.3.0', '1.el10', 'A firewall daemon with D-Bus interface providing a dynamic firewall', { files: ['/usr/sbin/firewall-cmd'] }),
    pkg('chrony', '4.6.1', '1.el10', 'An NTP client/server', { files: ['/usr/sbin/chronyd', '/etc/chrony.conf'] }),
    pkg('policycoreutils', '3.8', '1.el10', 'SELinux policy core utilities', { files: ['/usr/sbin/restorecon', '/usr/sbin/setenforce'] }),
    pkg('policycoreutils-python-utils', '3.8', '1.el10', 'SELinux policy core python utilities', { files: ['/usr/sbin/semanage'] }),
    pkg('lvm2', '2.03.28', '6.el10', 'Userland logical volume management tools', { files: ['/usr/sbin/lvcreate', '/usr/sbin/pvcreate'] }),
    pkg('xfsprogs', '6.11.0', '1.el10', 'Utilities for managing the XFS filesystem', { files: ['/usr/sbin/mkfs.xfs', '/usr/sbin/xfs_growfs'] }),
    pkg('e2fsprogs', '1.47.1', '3.el10', 'Utilities for managing ext2, ext3, and ext4 file systems', { files: ['/usr/sbin/mkfs.ext4', '/usr/sbin/resize2fs'] }),
    pkg('NetworkManager', '1.51.90', '1.el10', 'Network connection manager and user applications', { files: ['/usr/bin/nmcli'] }),
    pkg('cronie', '1.7.0', '9.el10', 'Cron daemon for executing programs at set times', { files: ['/usr/sbin/crond'] }),
    pkg('sudo', '1.9.15', '8.p5.el10', 'Allows restricted root access for specified users', { files: ['/usr/bin/sudo', '/etc/sudoers'] }),
    pkg('openssl', '3.2.2', '16.el10', 'Utilities from the general purpose cryptography library with TLS implementation', { files: ['/usr/bin/openssl'] }),
    pkg('tuned', '2.25.1', '1.el10', 'A dynamic adaptive system tuning daemon', { files: ['/usr/sbin/tuned-adm'] }),
    pkg('audit', '4.0.3', '1.el10', 'User space tools for kernel auditing', { files: ['/sbin/auditd', '/usr/sbin/ausearch'] }),
    pkg('rsyslog', '8.2412.0', '1.el10', 'Enhanced system logging and kernel message trapping daemon', { files: ['/usr/sbin/rsyslogd'] }),
    pkg('kernel', '6.12.0', '55.9.1.el10_0', 'The Linux kernel', { files: ['/boot/vmlinuz-6.12.0-55.9.1.el10_0.x86_64'] })
  ];
  for (const p of installed) sys.packages.installed[p.name] = { ...p, installedAt: sys.bootTime };
  const avail = [
    pkg('mariadb-server', '10.11.11', '1.el10', 'The MariaDB server and related files', { repo: 'rhel-10-appstream', files: ['/usr/libexec/mariadbd'], size: '10 M' }),
    pkg('nginx', '1.26.3', '2.el10', 'A high performance web server and reverse proxy server', { repo: 'rhel-10-appstream', files: ['/usr/sbin/nginx'], size: '35 k' }),
    pkg('tmux', '3.4', '5.el10', 'A terminal multiplexer', { repo: 'rhel-10-baseos', files: ['/usr/bin/tmux'], size: '480 k' }),
    pkg('vim-enhanced', '9.1.083', '5.el10', 'A version of the VIM editor which includes recent enhancements', { repo: 'rhel-10-appstream', files: ['/usr/bin/vim'], size: '1.9 M' }),
    pkg('nfs-utils', '2.8.2', '3.el10', 'NFS utilities and supporting clients and daemons for the kernel NFS server', { repo: 'rhel-10-baseos', files: ['/usr/sbin/mount.nfs'], size: '480 k' }),
    pkg('autofs', '5.1.9', '9.el10', 'A tool for automatically mounting and unmounting filesystems', { repo: 'rhel-10-baseos', files: ['/usr/sbin/automount'], size: '410 k' }),
    pkg('sysstat', '12.7.6', '2.el10', 'Collection of performance monitoring tools for Linux', { repo: 'rhel-10-appstream', files: ['/usr/bin/sar', '/usr/bin/iostat', '/usr/bin/mpstat'], size: '520 k' }),
    pkg('ansible-core', '2.16.14', '1.el10', 'A radically simple IT automation system', { repo: 'rhel-10-appstream', files: ['/usr/bin/ansible', '/usr/bin/ansible-playbook'], size: '3.8 M' }),
    pkg('git', '2.47.1', '1.el10', 'Fast Version Control System', { repo: 'rhel-10-appstream', files: ['/usr/bin/git'], size: '50 k' }),
    pkg('bind-utils', '9.18.33', '1.el10', 'Utilities for querying DNS name servers', { repo: 'rhel-10-appstream', files: ['/usr/bin/dig', '/usr/bin/host', '/usr/bin/nslookup'], size: '220 k' }),
    pkg('tcpdump', '4.99.5', '1.el10', 'Command-line tool for monitoring network traffic', { repo: 'rhel-10-appstream', files: ['/usr/sbin/tcpdump'], size: '490 k' }),
    pkg('strace', '6.12', '1.el10', 'Tracks and displays system calls associated with a running process', { repo: 'rhel-10-baseos', files: ['/usr/bin/strace'], size: '1.4 M' }),
    pkg('setroubleshoot-server', '3.3.35', '1.el10', 'SELinux troubleshoot server', { repo: 'rhel-10-appstream', files: ['/usr/bin/sealert'], size: '400 k' })
  ];
  for (const p of avail) sys.packages.available[p.name] = p;
  sys.packages.repos = [
    { id: 'rhel-10-baseos', name: 'RHEL 10 BaseOS (lab mirror)', enabled: true, reachable: true, packages: avail.filter(p => p.repo === 'rhel-10-baseos').length + 2000 },
    { id: 'rhel-10-appstream', name: 'RHEL 10 AppStream (lab mirror)', enabled: true, reachable: true, packages: avail.filter(p => p.repo === 'rhel-10-appstream').length + 5000 }
  ];
}

// ---------- processes ----------
export function addProcess(sys, p) {
  const proc = { pid: p.pid ?? sys.nextPid++, ppid: p.ppid ?? 1, user: p.user || 'root', state: p.state || 'S', cpu: p.cpu ?? 0, mem: p.mem ?? 0.1, rssMb: p.rssMb ?? 4, nice: p.nice ?? 0, tty: p.tty || '?', start: p.start || '08:55', time: p.time || '0:00', cmd: p.cmd, service: p.service || null, fds: p.fds || 12, ports: p.ports || null };
  sys.processes.push(proc);
  return proc;
}

function seedProcesses(sys) {
  addProcess(sys, { pid: 1, ppid: 0, cmd: '/usr/lib/systemd/systemd --switched-root --system --deserialize=42', rssMb: 14, mem: 0.1, time: '0:21' });
  addProcess(sys, { pid: 2, ppid: 0, cmd: '[kthreadd]', rssMb: 0, mem: 0 });
  addProcess(sys, { pid: 89, ppid: 2, cmd: '[kswapd0]', rssMb: 0, mem: 0 });
  let pid = 600;
  for (const svc of Object.values(sys.services)) {
    if (svc.active !== 'active') continue;
    const p = addProcess(sys, { pid: pid += 37, cmd: svc.exec, user: svc.user || 'root', rssMb: svc.rssMb || 5, mem: +((svc.rssMb || 5) / 160).toFixed(1), service: svc.name, cpu: svc.name === 'httpd' ? 0.3 : 0 });
    svc.pid = p.pid;
    if (svc.name === 'httpd') {
      for (let i = 0; i < 3; i++) addProcess(sys, { ppid: p.pid, cmd: '/usr/sbin/httpd -DFOREGROUND', user: 'apache', rssMb: 12, mem: 0.1, service: 'httpd' });
    }
  }
  addProcess(sys, { pid: 3301, ppid: sys.services.sshd.pid, cmd: 'sshd-session: student [priv]', rssMb: 6 });
  addProcess(sys, { pid: 3310, ppid: 3301, cmd: '-bash', user: 'student', tty: 'pts/0', rssMb: 4 });
  addProcess(sys, { pid: 3999, ppid: 1, cmd: '-bash', user: 'root', tty: 'pts/1', rssMb: 4, state: 'S' });
}

function seedJournal(sys) {
  const t0 = sys.bootTime;
  const at = (min) => sys.clock() - min * 60000;
  const e = (time, unit, prio, msg, ident) => sys.journal.push({ time, unit, prio, msg, ident: ident || unit?.replace('.service', '') || 'kernel', boot: 0 });
  e(t0, null, 6, `Linux version ${sys.kernel}`, 'kernel');
  e(t0 + 900, null, 6, 'Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz root=/dev/mapper/rhel-root ro', 'kernel');
  e(t0 + 2000, null, 6, 'XFS (dm-0): Mounting V5 Filesystem', 'kernel');
  e(t0 + 4000, 'systemd', 6, 'Reached target multi-user.target - Multi-User System.', 'systemd');
  for (const s of Object.values(sys.services)) if (s.active === 'active') e(t0 + 5000, `${s.name}.service`, 6, `Started ${s.name}.service - ${s.description}.`, 'systemd');
  e(at(18), 'app.service', 6, 'Started app.service - Demo business application.', 'systemd');
  e(at(18), 'app.service', 3, 'Error: listen EADDRINUSE: address already in use 0.0.0.0:8080', 'start.sh');
  e(at(18), 'app.service', 3, 'app.service: Main process exited, code=exited, status=1/FAILURE', 'systemd');
  e(at(18), 'app.service', 4, "app.service: Failed with result 'exit-code'.", 'systemd');
  e(at(12), 'sshd.service', 6, 'Accepted publickey for student from 10.10.40.50 port 51822 ssh2', 'sshd');
  e(at(10), 'sshd.service', 5, 'Failed password for invalid user admin from 203.0.113.77 port 40112 ssh2', 'sshd');
  e(at(6), 'httpd.service', 3, '[proxy:error] (13)Permission denied: AH00957: attempt to connect to 127.0.0.1:8080 failed', 'httpd');
  sys.audit.push(`type=AVC msg=audit(${Math.round(at(6) / 1000)}.512:812): avc:  denied  { name_connect } for  pid=2841 comm="httpd" dest=8080 scontext=system_u:system_r:httpd_t:s0 tcontext=system_u:object_r:http_cache_port_t:s0 tclass=tcp_socket permissive=0`);
  // rogue process holding 8080, explains app.service failure
  addProcess(sys, { pid: 2950, ppid: 1, cmd: 'python3 -m http.server 8080', user: 'devuser', rssMb: 22, mem: 0.1, tty: '?', ports: [['tcp', 8080]] });
}

export function resolvePath(sys, p) {
  return normalizePath(p.replace(/^~(?=\/|$)/, userByName(sys, sys.session.user)?.home || '/root'), sys.session.cwd);
}

export { S_IFDIR, S_IFREG, S_IFLNK };
