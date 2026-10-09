// Terminal labs. Each lab starts from a fresh simulated host, runs `setup` as root, then validates
// every task by inspecting the simulator's state (files, inodes, users, services, mounts, firewall,
// SELinux...). Validators never look at what was typed, only at the resulting system state.
import { userByName, groupByName, ctxType, expectedContext } from '../terminal/system.js';
import { listeningSockets } from '../terminal/commands/proc.js';
import { localHttp, firewallAllows, resolveName } from '../terminal/commands/network.js';
import { enabledState, findUnitFile, parseUnitText } from '../terminal/commands/services.js';
import { parseFstab, deviceBySpec, fsUsage } from '../terminal/commands/storage.js';
import { parseRepoFiles } from '../terminal/commands/packages.js';

// ---------- state helpers ----------
const node = (sys, p, follow = true) => { try { return sys.fs.resolve(p, '/', { follow }).node; } catch { return null; } };
const text = (sys, p) => { try { return sys.fs.readFile(p, '/'); } catch { return null; } };
const mode = (sys, p) => (node(sys, p)?.mode ?? -1) & 0o7777;
const isDir = (sys, p) => node(sys, p)?.type === 'd';
const isFile = (sys, p) => node(sys, p)?.type === 'f';
const owner = (sys, p) => { const n = node(sys, p); return n ? { u: sys.users.find(u => u.uid === n.uid)?.name, g: sys.groups.find(g => g.gid === n.gid)?.name } : {}; };
const svcActive = (sys, name) => sys.services[name]?.active === 'active';
const enabled = (sys, unit) => enabledState(sys, unit) === 'enabled';
const inGroup = (sys, user, group) => !!groupByName(sys, group)?.members.includes(user) || userByName(sys, user)?.gid === groupByName(sys, group)?.gid;
const mounted = (sys, mp) => sys.fs.mounts.get(mp);
const fstabFor = (sys, mp) => parseFstab(sys).find(e => e.mp === mp);
const run = (sys, term, cmd) => term.shell.run(cmd, { record: false });

export const LABS = [
  // ---------- Level 2: command line ----------
  {
    id: 'LAB-02-NAV', title: 'Navigate and organise files', level: 2, lessonId: 'L02-M2-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'You are root on srv01. Build a small project tree for the student user and copy their notes into it.',
    tasks: [
      { id: 't1', text: 'Create the directories `/home/student/projects/alpha` and `/home/student/projects/beta` (one command with `mkdir -p` and brace expansion works).', hint: 'mkdir -p /home/student/projects/{alpha,beta}', check: (s) => isDir(s, '/home/student/projects/alpha') && isDir(s, '/home/student/projects/beta') },
      { id: 't2', text: 'Copy `/home/student/notes.txt` into `projects/alpha/` keeping the name.', hint: 'cp /home/student/notes.txt /home/student/projects/alpha/', check: (s) => text(s, '/home/student/projects/alpha/notes.txt') === text(s, '/home/student/notes.txt') && text(s, '/home/student/notes.txt') !== null },
      { id: 't3', text: 'Move (rename) `projects/beta` to `projects/archive`.', hint: 'mv /home/student/projects/beta /home/student/projects/archive', check: (s) => isDir(s, '/home/student/projects/archive') && !node(s, '/home/student/projects/beta') },
      { id: 't4', text: 'Make sure the whole `projects` tree is owned by `student:student`.', hint: 'chown -R student:student /home/student/projects', check: (s) => { let ok = true; s.fs.walk('/home/student/projects', '/', (n) => { if (n && (n.uid !== 1000 || n.gid !== 1000)) ok = false; }); return ok && isDir(s, '/home/student/projects'); } }
    ],
    solution: ['mkdir -p /home/student/projects/{alpha,beta}', 'cp /home/student/notes.txt /home/student/projects/alpha/', 'mv /home/student/projects/beta /home/student/projects/archive', 'chown -R student:student /home/student/projects', 'ls -lR /home/student/projects']
  },
  {
    id: 'LAB-02-REDIRECT', title: 'Redirection, pipes and exit codes', level: 2, lessonId: 'L02-M4-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Collect evidence from the application log without editing it.',
    tasks: [
      { id: 't1', text: 'Write every line containing `ERROR` from `/var/log/app/app.log` into `/root/errors.txt`.', hint: 'grep ERROR /var/log/app/app.log > /root/errors.txt', check: (s) => { const t = text(s, '/root/errors.txt'); return !!t && t.trim().split('\n').length === 3 && t.split('\n').filter(Boolean).every(l => l.includes('ERROR')); } },
      { id: 't2', text: 'Append the number of WARN lines to the same file (do not overwrite it).', hint: 'grep -c WARN /var/log/app/app.log >> /root/errors.txt', check: (s) => { const t = text(s, '/root/errors.txt') || ''; return t.includes('ERROR') && /^1$/m.test(t); } },
      { id: 't3', text: 'Run `find /root /home -name "*.conf"` as the student user (via `su - student`) sending errors to `/tmp/find.err` and results to `/tmp/find.out`; then `exit` back to root.', hint: 'su - student, then: find /root /home -name "*.conf" > /tmp/find.out 2> /tmp/find.err ; exit', check: (s) => (text(s, '/tmp/find.err') || '').includes('Permission denied') && text(s, '/tmp/find.out') !== null && s.session.user === 'root' }
    ],
    solution: ['grep ERROR /var/log/app/app.log > /root/errors.txt', 'grep -c WARN /var/log/app/app.log >> /root/errors.txt', 'su - student', 'find /root /home -name "*.conf" > /tmp/find.out 2> /tmp/find.err', 'exit', 'cat /tmp/find.err']
  },
  {
    id: 'LAB-02-TEXT', title: 'Extract a report with text tools', level: 2, lessonId: 'L02-M3-T2', tags: [], minutes: 10,
    intro: '`/srv/data/report.csv` holds host,cpu,mem,disk. Produce a sorted list of hosts whose disk usage is above 60%.',
    tasks: [
      { id: 't1', text: 'Create `/root/busy-disks.txt` containing only the host names whose disk column (field 4) is greater than 60, sorted alphabetically, one per line.', hint: "awk -F, 'NR>1 && $4>60 {print $1}' /srv/data/report.csv | sort > /root/busy-disks.txt", check: (s) => (text(s, '/root/busy-disks.txt') || '').trim() === 'db01\nweb01\nweb02' },
      { id: 't2', text: 'Create `/root/host-count.txt` containing just the number of data rows (no header) in the CSV.', hint: 'tail -n +2 /srv/data/report.csv | wc -l > /root/host-count.txt', check: (s) => (text(s, '/root/host-count.txt') || '').trim() === '4' }
    ],
    solution: ["awk -F, 'NR>1 && $4>60 {print $1}' /srv/data/report.csv | sort > /root/busy-disks.txt", 'tail -n +2 /srv/data/report.csv | wc -l > /root/host-count.txt']
  },
  // ---------- Level 3: filesystem ----------
  {
    id: 'LAB-03-LINKS', title: 'Hard links versus symbolic links', level: 3, lessonId: 'L03-M3-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Prove the difference between hard and symbolic links using inode numbers.',
    setup: ['mkdir -p /srv/links', 'echo "release=2026.10" > /srv/links/version.conf'],
    tasks: [
      { id: 't1', text: 'Create a hard link `/srv/links/version.hard` to `/srv/links/version.conf`.', hint: 'ln /srv/links/version.conf /srv/links/version.hard', check: (s) => { const a = node(s, '/srv/links/version.conf'), b = node(s, '/srv/links/version.hard', false); return !!a && !!b && a.ino === b.ino && a.nlink === 2; } },
      { id: 't2', text: 'Create a symbolic link `/etc/app-version.conf` pointing to `/srv/links/version.conf` (absolute target).', hint: 'ln -s /srv/links/version.conf /etc/app-version.conf', check: (s) => { const l = node(s, '/etc/app-version.conf', false); return l?.type === 'l' && l.target === '/srv/links/version.conf'; } },
      { id: 't3', text: 'Delete the original `/srv/links/version.conf`. The hard link must still contain the data (the symlink will now dangle — observe it with `ls -l`).', hint: 'rm /srv/links/version.conf ; cat /srv/links/version.hard ; ls -l /etc/app-version.conf', check: (s) => !node(s, '/srv/links/version.conf', false) && (text(s, '/srv/links/version.hard') || '').includes('release=2026.10') }
    ],
    solution: ['ln /srv/links/version.conf /srv/links/version.hard', 'ls -li /srv/links', 'ln -s /srv/links/version.conf /etc/app-version.conf', 'rm /srv/links/version.conf', 'cat /srv/links/version.hard', 'ls -l /etc/app-version.conf   # dangling']
  },
  {
    id: 'LAB-03-DELETED', title: 'Disk space held by a deleted file', level: 3, lessonId: 'L03-M5-T1', tags: [], minutes: 15,
    intro: 'Someone deleted a 6 GiB log while a reporting process still had it open. `df` still shows the space as used. Find the holder and release the space without rebooting.',
    setup: ['__deleted_open_file__'],
    tasks: [
      { id: 't1', text: 'Identify the PID still holding the deleted file (`lsof +L1`).', hint: 'lsof +L1', check: (s, term) => term.sys.history.some(h => /lsof\s.*\+L1|lsof \+L1/.test(h)) },
      { id: 't2', text: 'Release the space by stopping that process gracefully (SIGTERM).', hint: 'kill PID   (use the PID from lsof)', check: (s) => ![...s.fs.inodes.values()].some(n => n.nlink <= 0 && n.openBy?.length) },
      { id: 't3', text: 'Confirm with `df -h /` that usage dropped back under 30%.', hint: 'df -h /', check: (s) => { const u = fsUsage(s, '/'); return u && u.used / u.size < 0.3; } }
    ],
    solution: ['df -h /', 'lsof +L1', 'kill <PID of report-gen>', 'df -h /']
  },
  // ---------- Level 4: users and permissions ----------
  {
    id: 'LAB-04-USERS', title: 'Create and age user accounts', level: 4, lessonId: 'L04-M2-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'Onboard an operations engineer according to the access request.',
    tasks: [
      { id: 't1', text: 'Create group `ops` with GID 3000.', hint: 'groupadd -g 3000 ops', check: (s) => groupByName(s, 'ops')?.gid === 3000 },
      { id: 't2', text: 'Create user `ops1` with UID 2001, supplementary group `ops`, comment "Ops Engineer" and shell /bin/bash.', hint: 'useradd -u 2001 -G ops -c "Ops Engineer" -s /bin/bash ops1', check: (s) => { const u = userByName(s, 'ops1'); return u?.uid === 2001 && inGroup(s, 'ops1', 'ops') && u.gecos === 'Ops Engineer' && u.shell === '/bin/bash' && isDir(s, '/home/ops1'); } },
      { id: 't3', text: 'Set a password for `ops1` (e.g. `echo "Redhat123" | passwd --stdin ops1`).', hint: 'echo "Redhat123" | passwd --stdin ops1', check: (s) => userByName(s, 'ops1')?.password === 'set' && !userByName(s, 'ops1').locked },
      { id: 't4', text: 'Force a password change every 90 days and expire the account on 2027-12-31.', hint: 'chage -M 90 -E 2027-12-31 ops1', check: (s) => userByName(s, 'ops1')?.maxDays === 90 && userByName(s, 'ops1')?.expire === '2027-12-31' }
    ],
    solution: ['groupadd -g 3000 ops', 'useradd -u 2001 -G ops -c "Ops Engineer" -s /bin/bash ops1', 'echo "Redhat123" | passwd --stdin ops1', 'chage -M 90 -E 2027-12-31 ops1', 'chage -l ops1', 'id ops1']
  },
  {
    id: 'LAB-04-SHARED', title: 'Collaborative directory with setgid and ACLs', level: 4, lessonId: 'L04-M4-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'Finance needs `/srv/finance`: members of group finance can create and edit files; new files must belong to finance; others have no access; the auditor gets read-only access.',
    setup: ['useradd alice', 'useradd bob', 'useradd auditor'],
    tasks: [
      { id: 't1', text: 'Create group `finance` and add alice and bob to it (supplementary).', hint: 'groupadd finance ; usermod -aG finance alice ; usermod -aG finance bob', check: (s) => inGroup(s, 'alice', 'finance') && inGroup(s, 'bob', 'finance') },
      { id: 't2', text: 'Create `/srv/finance` owned by root:finance with mode 2770 (setgid, group rwx, others none).', hint: 'mkdir /srv/finance ; chown root:finance /srv/finance ; chmod 2770 /srv/finance', check: (s) => isDir(s, '/srv/finance') && owner(s, '/srv/finance').g === 'finance' && mode(s, '/srv/finance') === 0o2770 },
      { id: 't3', text: 'Grant user `auditor` read and traverse access with an ACL (`r-x` on the directory).', hint: 'setfacl -m u:auditor:rx /srv/finance', check: (s) => { const n = node(s, '/srv/finance'); const uid = userByName(s, 'auditor')?.uid; return n?.acl?.users?.[uid] === 5; } },
      { id: 't4', text: 'Prove it: as alice (`su - alice`), create `/srv/finance/q4.txt`, then `exit`. The file must be group-owned by finance.', hint: 'su - alice ; touch /srv/finance/q4.txt ; ls -l /srv/finance ; exit', check: (s) => owner(s, '/srv/finance/q4.txt').g === 'finance' && owner(s, '/srv/finance/q4.txt').u === 'alice' }
    ],
    solution: ['groupadd finance', 'usermod -aG finance alice', 'usermod -aG finance bob', 'mkdir /srv/finance', 'chown root:finance /srv/finance', 'chmod 2770 /srv/finance', 'setfacl -m u:auditor:rx /srv/finance', 'su - alice', 'touch /srv/finance/q4.txt', 'exit', 'ls -l /srv/finance ; getfacl /srv/finance']
  },
  {
    id: 'LAB-04-SUDO', title: 'Least-privilege sudo rule', level: 4, lessonId: 'L04-M5-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'User `deploy` must restart httpd without receiving full root access.',
    setup: ['useradd deploy'],
    tasks: [
      { id: 't1', text: 'Create `/etc/sudoers.d/deploy` (use `nano` or `echo`) allowing: `deploy ALL=(root) /usr/bin/systemctl restart httpd` — and nothing else.', hint: "echo 'deploy ALL=(root) /usr/bin/systemctl restart httpd' > /etc/sudoers.d/deploy", check: (s) => /^\s*deploy\s+ALL\s*=\s*\(root\)\s+\/usr\/bin\/systemctl restart httpd\s*$/m.test(text(s, '/etc/sudoers.d/deploy') || '') && !/ALL\s*$/m.test((text(s, '/etc/sudoers.d/deploy') || '').replace(/ALL\s*=/, '')) },
      { id: 't2', text: 'Restrict the file to mode 0440 owned by root.', hint: 'chmod 440 /etc/sudoers.d/deploy', check: (s) => mode(s, '/etc/sudoers.d/deploy') === 0o440 && owner(s, '/etc/sudoers.d/deploy').u === 'root' },
      { id: 't3', text: 'Validate the syntax with `visudo -c`.', hint: 'visudo -c', check: (s, term) => term.sys.history.some(h => /visudo\s+-c/.test(h)) },
      { id: 't4', text: 'Confirm `deploy` is NOT a member of wheel (least privilege).', hint: 'id deploy', check: (s) => !inGroup(s, 'deploy', 'wheel') && !!userByName(s, 'deploy') }
    ],
    solution: ["echo 'deploy ALL=(root) /usr/bin/systemctl restart httpd' > /etc/sudoers.d/deploy", 'chmod 440 /etc/sudoers.d/deploy', 'visudo -c', 'id deploy'],
    note: 'The simulator grants sudo for any sudoers.d line naming the user; a real sudo enforces the exact command list.'
  },
  {
    id: 'LAB-04-UMASK', title: 'Default permissions with umask', level: 4, lessonId: 'L04-M3-T2', tags: ['rhcsa'], minutes: 8,
    intro: 'Files created by this shell must not be readable by others.',
    tasks: [
      { id: 't1', text: 'Set the shell umask so new files are 640 and new directories 750.', hint: 'umask 027', check: (s) => s.session.umask === 0o027 },
      { id: 't2', text: 'Create `/root/secret.txt` and `/root/secretdir` and confirm their modes.', hint: 'touch /root/secret.txt ; mkdir /root/secretdir ; ls -ld /root/secret*', check: (s) => mode(s, '/root/secret.txt') === 0o640 && mode(s, '/root/secretdir') === 0o750 }
    ],
    solution: ['umask 027', 'touch /root/secret.txt', 'mkdir /root/secretdir', 'ls -ld /root/secret*', '# persist for a user: echo "umask 027" >> ~/.bashrc']
  },
  // ---------- Level 5: processes ----------
  {
    id: 'LAB-05-RUNAWAY', title: 'Find and control CPU hogs', level: 5, lessonId: 'L05-M3-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Load average is climbing. One process is runaway; another (backup) is legitimate but should yield CPU.',
    setup: ['__cpu_hogs__'],
    tasks: [
      { id: 't1', text: 'Identify the top CPU consumers (`ps aux --sort=-%cpu | head` or `top -b -n 1`).', hint: 'ps aux --sort=-%cpu | head -5', check: (s, term) => term.sys.history.some(h => /ps .*--sort=-%cpu|top -b|^top\b/.test(h)) },
      { id: 't2', text: 'Terminate the runaway `cryptominer` process (it ignores SIGTERM — escalate only after trying TERM).', hint: 'pkill cryptominer ; ps aux | grep cryptominer ; pkill -9 cryptominer', check: (s) => !s.processes.some(p => p.cmd.includes('cryptominer')) },
      { id: 't3', text: 'Lower the priority of the `backup.sh` process to nice 15 without stopping it.', hint: 'renice -n 15 -p $(pgrep -f backup.sh)', check: (s) => s.processes.find(p => p.cmd.includes('backup.sh'))?.nice === 15 }
    ],
    solution: ['ps aux --sort=-%cpu | head -5', 'pkill cryptominer', 'pgrep -a cryptominer    # still running: it ignores SIGTERM', 'pkill -9 cryptominer', 'renice -n 15 -p $(pgrep -f backup.sh)', 'top -b -n 1 | head -15']
  },
  // ---------- Level 6: packages ----------
  {
    id: 'LAB-06-REPO', title: 'Configure a repository and install software', level: 6, lessonId: 'L06-M2-T1', tags: ['rhcsa'], minutes: 12,
    intro: 'The default repo file was removed. Configure the internal mirror and install nginx.',
    setup: ['rm -f /etc/yum.repos.d/rhel.repo'],
    tasks: [
      { id: 't1', text: 'Create `/etc/yum.repos.d/internal.repo` with two repos: BaseOS at `http://repo.lab.example.com/rhel10/BaseOS` and AppStream at `http://repo.lab.example.com/rhel10/AppStream`, both enabled with gpgcheck=1.', hint: 'nano /etc/yum.repos.d/internal.repo — sections [baseos] and [appstream] with name=, baseurl=, enabled=1, gpgcheck=1', check: (s) => { const r = parseRepoFiles(s).filter(x => x.file === 'internal.repo' && x.enabled); return r.some(x => /BaseOS/.test(x.baseurl)) && r.some(x => /AppStream/.test(x.baseurl)) && r.every(x => x.gpgcheck); } },
      { id: 't2', text: 'Verify with `dnf repolist`.', hint: 'dnf repolist', check: (s, term) => term.sys.history.some(h => /(dnf|yum) repolist/.test(h)) },
      { id: 't3', text: 'Install the `nginx` package non-interactively.', hint: 'dnf install -y nginx', check: (s) => !!s.packages.installed.nginx }
    ],
    solution: ['cat > internal.repo via nano:', '[baseos]\nname=BaseOS\nbaseurl=http://repo.lab.example.com/rhel10/BaseOS\nenabled=1\ngpgcheck=1', '[appstream]\nname=AppStream\nbaseurl=http://repo.lab.example.com/rhel10/AppStream\nenabled=1\ngpgcheck=1', 'dnf repolist', 'dnf install -y nginx', 'rpm -q nginx']
  },
  {
    id: 'LAB-06-FLATPAK', title: 'Flatpak remotes and applications', level: 6, lessonId: 'L06-M3-T2', tags: ['rhcsa'], minutes: 8,
    intro: 'EX200 on RHEL 10 includes Flatpak. Add the Flathub remote and install the GNOME Calculator system-wide.',
    tasks: [
      { id: 't1', text: 'Add the remote `flathub` from `https://dl.flathub.org/repo/flathub.flatpakrepo` (idempotently).', hint: 'flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo', check: (s) => !!s.flatpak?.remotes.some(r => r.name === 'flathub' && !r.user) },
      { id: 't2', text: 'Install `org.gnome.Calculator` from flathub (system scope).', hint: 'flatpak install -y flathub org.gnome.Calculator', check: (s) => !!s.flatpak?.installed.some(i => i.id === 'org.gnome.Calculator' && !i.user) }
    ],
    solution: ['flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo', 'flatpak remotes', 'flatpak install -y flathub org.gnome.Calculator', 'flatpak list']
  },
  // ---------- Level 7: boot ----------
  {
    id: 'LAB-07-TARGET', title: 'Default boot target', level: 7, lessonId: 'L07-M3-T1', tags: ['rhcsa'], minutes: 6,
    intro: 'A colleague set this server to boot into the graphical target. Servers here must boot to multi-user.',
    setup: ['systemctl set-default graphical.target'],
    tasks: [
      { id: 't1', text: 'Check the current default target.', hint: 'systemctl get-default', check: (s, term) => term.sys.history.some(h => /systemctl get-default/.test(h)) },
      { id: 't2', text: 'Set the default target to `multi-user.target`.', hint: 'systemctl set-default multi-user.target', check: (s) => node(s, '/etc/systemd/system/default.target', false)?.target?.endsWith('multi-user.target') }
    ],
    solution: ['systemctl get-default', 'systemctl set-default multi-user.target', 'systemctl get-default']
  },
  {
    id: 'LAB-07-JOURNAL', title: 'Preserve the systemd journal across reboots', level: 7, lessonId: 'L07-M5-T1', tags: ['rhcsa'], minutes: 8,
    intro: 'After the last crash there were no logs from the previous boot. Make the journal persistent.',
    tasks: [
      { id: 't1', text: 'Set `Storage=persistent` in `/etc/systemd/journald.conf` (or a drop-in under /etc/systemd/journald.conf.d/).', hint: "sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf", check: (s) => /^\s*Storage\s*=\s*persistent/m.test((text(s, '/etc/systemd/journald.conf') || '') + (s.fs.tryResolve('/etc/systemd/journald.conf.d') ? s.fs.list(node(s, '/etc/systemd/journald.conf.d')).map(f => text(s, `/etc/systemd/journald.conf.d/${f}`)).join('\n') : '')) },
      { id: 't2', text: 'Create `/var/log/journal` (with `Storage=auto` its mere existence enables persistence).', hint: 'mkdir -p /var/log/journal', check: (s) => isDir(s, '/var/log/journal') },
      { id: 't3', text: 'Restart systemd-journald so the setting takes effect.', hint: 'systemctl restart systemd-journald', check: (s) => svcActive(s, 'systemd-journald') && (s.services['systemd-journald'].since || 0) >= (node(s, '/etc/systemd/journald.conf')?.mtime || 0) }
    ],
    solution: ["sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf", 'mkdir -p /var/log/journal', 'systemctl restart systemd-journald', 'journalctl --list-boots'],
    onComplete: (s) => { s.journalPersisted = true; }
  },
  // ---------- Level 8: systemd ----------
  {
    id: 'LAB-08-FAILED', title: 'Recover a failed service', level: 8, lessonId: 'L08-M5-T1', tags: ['rhcsa'], minutes: 10,
    intro: '`app.service` is failed. Diagnose from evidence, fix the cause (do not change the unit or the port), start it and keep it enabled.',
    tasks: [
      { id: 't1', text: 'Read the failure reason from `systemctl status app` and `journalctl -u app`.', hint: 'journalctl -u app -n 20', check: (s, term) => term.sys.history.some(h => /journalctl .*-u app|systemctl status app/.test(h)) },
      { id: 't2', text: 'Find what is already listening on port 8080 and stop it.', hint: 'ss -tlnp | grep 8080 ; kill <PID>', check: (s) => !s.processes.some(p => p.cmd.includes('http.server 8080')) },
      { id: 't3', text: 'Start `app.service` and confirm it is active and enabled.', hint: 'systemctl start app ; systemctl is-active app ; systemctl is-enabled app', check: (s) => svcActive(s, 'app') && enabled(s, 'app.service') }
    ],
    solution: ['systemctl status app', 'journalctl -u app -n 20   # EADDRINUSE 8080', 'ss -tlnp | grep :8080', 'kill 2950', 'systemctl start app', 'systemctl is-active app && systemctl is-enabled app']
  },
  {
    id: 'LAB-08-UNIT', title: 'Write and enable a custom service', level: 8, lessonId: 'L08-M2-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'Package a backup script as a oneshot systemd service that runs at boot.',
    tasks: [
      { id: 't1', text: 'Create the executable script `/usr/local/bin/backup-etc.sh` that runs `tar -czf /var/tmp/etc-backup.tar.gz /etc/hosts /etc/fstab`.', hint: "printf '#!/bin/bash\\ntar -czf /var/tmp/etc-backup.tar.gz /etc/hosts /etc/fstab\\n' > /usr/local/bin/backup-etc.sh ; chmod 755 /usr/local/bin/backup-etc.sh", check: (s) => { const t = text(s, '/usr/local/bin/backup-etc.sh') || ''; return t.startsWith('#!') && /tar\s/.test(t) && (mode(s, '/usr/local/bin/backup-etc.sh') & 0o111) !== 0; } },
      { id: 't2', text: 'Create `/etc/systemd/system/backup-etc.service` with `Type=oneshot`, `ExecStart=/usr/local/bin/backup-etc.sh` and `WantedBy=multi-user.target`.', hint: 'nano /etc/systemd/system/backup-etc.service', check: (s) => { const c = parseUnitText(text(s, '/etc/systemd/system/backup-etc.service') || ''); return c['Service.Type'] === 'oneshot' && (c['Service.ExecStart'] || [])[0] === '/usr/local/bin/backup-etc.sh' && /multi-user\.target/.test(c['Install.WantedBy'] || ''); } },
      { id: 't3', text: 'Reload systemd, then enable and run it now (`--now`).', hint: 'systemctl daemon-reload ; systemctl enable --now backup-etc.service', check: (s) => enabled(s, 'backup-etc.service') && s.services['backup-etc']?.lastStatus === '0/SUCCESS' },
      { id: 't4', text: 'Verify the archive exists in /var/tmp.', hint: 'tar -tzf /var/tmp/etc-backup.tar.gz', check: (s) => isFile(s, '/var/tmp/etc-backup.tar.gz') }
    ],
    solution: ["printf '#!/bin/bash\\ntar -czf /var/tmp/etc-backup.tar.gz /etc/hosts /etc/fstab\\n' > /usr/local/bin/backup-etc.sh", 'chmod 755 /usr/local/bin/backup-etc.sh', 'nano /etc/systemd/system/backup-etc.service   # [Unit] Description=Backup /etc  [Service] Type=oneshot ExecStart=/usr/local/bin/backup-etc.sh  [Install] WantedBy=multi-user.target', 'systemctl daemon-reload', 'systemctl enable --now backup-etc.service', 'systemctl status backup-etc', 'tar -tzf /var/tmp/etc-backup.tar.gz']
  },
  {
    id: 'LAB-08-TIMER', title: 'Schedule work with a systemd timer', level: 8, lessonId: 'L08-M4-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Replace a cron entry with a systemd timer that runs `logrotate-app.service` daily.',
    setup: ['__timer_service__'],
    tasks: [
      { id: 't1', text: 'Create `/etc/systemd/system/logrotate-app.timer` with `OnCalendar=daily`, `Persistent=true` and `WantedBy=timers.target`.', hint: 'nano /etc/systemd/system/logrotate-app.timer  ([Timer] OnCalendar=daily, Persistent=true; [Install] WantedBy=timers.target)', check: (s) => { const c = parseUnitText(text(s, '/etc/systemd/system/logrotate-app.timer') || ''); return /daily/i.test(c['Timer.OnCalendar'] || '') && /timers\.target/.test(c['Install.WantedBy'] || ''); } },
      { id: 't2', text: 'Enable and start the timer.', hint: 'systemctl daemon-reload ; systemctl enable --now logrotate-app.timer', check: (s) => enabled(s, 'logrotate-app.timer') && s.activeUnits?.['logrotate-app.timer'] === 'active' },
      { id: 't3', text: 'List timers to confirm it is scheduled.', hint: 'systemctl list-timers', check: (s, term) => term.sys.history.some(h => /list-timers/.test(h)) }
    ],
    solution: ['nano /etc/systemd/system/logrotate-app.timer   # [Unit] Description=Daily app log rotation  [Timer] OnCalendar=daily Persistent=true  [Install] WantedBy=timers.target', 'systemctl daemon-reload', 'systemctl enable --now logrotate-app.timer', 'systemctl list-timers']
  },
  // ---------- Level 9: storage ----------
  {
    id: 'LAB-09-LVM', title: 'Persistent LVM storage mounted by UUID', level: 9, lessonId: 'L09-M3-T1', tags: ['rhcsa'], minutes: 20,
    intro: 'Use the spare disk /dev/sdb (never the OS disk). Build vg_data/lv_app (2 GiB XFS) mounted persistently at /data/app.',
    tasks: [
      { id: 't1', text: 'Create a GPT label and one partition spanning /dev/sdb, flagged for LVM.', hint: 'parted -s /dev/sdb mklabel gpt mkpart lvm 1MiB 100% set 1 lvm on', check: (s) => s.storage.disks.sdb.label === 'gpt' && s.storage.disks.sdb.partitions.length >= 1 },
      { id: 't2', text: 'Create PV /dev/sdb1, VG `vg_data` and LV `lv_app` of 2 GiB.', hint: 'pvcreate /dev/sdb1 ; vgcreate vg_data /dev/sdb1 ; lvcreate -n lv_app -L 2G vg_data', check: (s) => s.storage.lvs['vg_data/lv_app']?.size === 2048 },
      { id: 't3', text: 'Format it as XFS and mount it at `/data/app`.', hint: 'mkfs.xfs /dev/vg_data/lv_app ; mkdir -p /data/app ; mount /dev/vg_data/lv_app /data/app', check: (s) => s.storage.filesystems['/dev/mapper/vg_data-lv_app']?.fstype === 'xfs' && mounted(s, '/data/app')?.source === '/dev/mapper/vg_data-lv_app' },
      { id: 't4', text: 'Add an /etc/fstab entry using the filesystem UUID, then prove it with `umount /data/app ; mount -a`.', hint: 'blkid /dev/vg_data/lv_app ; echo "UUID=<uuid> /data/app xfs defaults 0 0" >> /etc/fstab ; umount /data/app ; mount -a', check: (s) => { const e = fstabFor(s, '/data/app'); return !!e && /^UUID=/.test(e.spec) && deviceBySpec(s, e.spec) === '/dev/mapper/vg_data-lv_app' && e.type === 'xfs' && !!mounted(s, '/data/app'); } }
    ],
    solution: ['lsblk', 'parted -s /dev/sdb mklabel gpt mkpart lvm 1MiB 100% set 1 lvm on', 'pvcreate /dev/sdb1', 'vgcreate vg_data /dev/sdb1', 'lvcreate -n lv_app -L 2G vg_data', 'mkfs.xfs /dev/vg_data/lv_app', 'mkdir -p /data/app', 'blkid /dev/vg_data/lv_app', 'echo "UUID=<uuid> /data/app xfs defaults 0 0" >> /etc/fstab', 'systemctl daemon-reload', 'mount -a', 'findmnt /data/app ; findmnt --verify']
  },
  {
    id: 'LAB-09-EXTEND', title: 'Grow a logical volume online', level: 9, lessonId: 'L09-M3-T2', tags: ['rhcsa'], minutes: 10,
    intro: '/srv/db (XFS on vg_db/lv_db) is nearly full. Grow it by 512 MiB without unmounting.',
    setup: ['parted -s /dev/sdc mklabel gpt mkpart lvm 1MiB 100%', 'pvcreate /dev/sdc1', 'vgcreate vg_db /dev/sdc1', 'lvcreate -n lv_db -L 1G vg_db', 'mkfs.xfs /dev/vg_db/lv_db', 'mkdir -p /srv/db', 'mount /dev/vg_db/lv_db /srv/db'],
    tasks: [
      { id: 't1', text: 'Check free space in the volume group.', hint: 'vgs vg_db', check: (s, term) => term.sys.history.some(h => /vgs|vgdisplay/.test(h)) },
      { id: 't2', text: 'Extend `lv_db` by 512 MiB AND grow the filesystem in the same step.', hint: 'lvextend -r -L +512M /dev/vg_db/lv_db', check: (s) => s.storage.lvs['vg_db/lv_db']?.size === 1536 && s.storage.filesystems['/dev/mapper/vg_db-lv_db']?.fsSize === 1536 && !!mounted(s, '/srv/db') }
    ],
    solution: ['vgs vg_db', 'lvextend -r -L +512M /dev/vg_db/lv_db', 'df -h /srv/db   # or: lvextend -L +512M ... then xfs_growfs /srv/db']
  },
  {
    id: 'LAB-09-SWAP', title: 'Add swap non-destructively', level: 9, lessonId: 'L09-M4-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Add a 512 MiB swap partition on /dev/sdc and make it persistent, leaving existing swap in place.',
    tasks: [
      { id: 't1', text: 'Create a GPT label on /dev/sdc and a 512 MiB partition.', hint: 'parted -s /dev/sdc mklabel gpt mkpart swap1 linux-swap 1MiB 513MiB', check: (s) => s.storage.disks.sdc.partitions.some(p => p.size >= 500 && p.size <= 530) },
      { id: 't2', text: 'Initialise it with mkswap and activate it.', hint: 'mkswap /dev/sdc1 ; swapon /dev/sdc1', check: (s) => s.storage.swaps.includes('/dev/sdc1') && s.storage.swaps.length >= 2 },
      { id: 't3', text: 'Persist it in /etc/fstab by UUID (type swap, mount point none) and verify with `swapon --show`.', hint: 'echo "UUID=<uuid> none swap defaults 0 0" >> /etc/fstab ; swapon -a', check: (s) => parseFstab(s).some(e => e.type === 'swap' && /^UUID=/.test(e.spec) && deviceBySpec(s, e.spec) === '/dev/sdc1') }
    ],
    solution: ['parted -s /dev/sdc mklabel gpt mkpart swap1 linux-swap 1MiB 513MiB', 'mkswap /dev/sdc1', 'swapon /dev/sdc1', 'blkid /dev/sdc1', 'echo "UUID=<uuid> none swap defaults 0 0" >> /etc/fstab', 'swapon --show ; free -m']
  },
  {
    id: 'LAB-09-NFS', title: 'Mount an NFS export persistently', level: 9, lessonId: 'L09-M5-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'nfs01.lab.example.com exports /exports/shared. Mount it at /mnt/shared now and at every boot.',
    tasks: [
      { id: 't1', text: 'Install the NFS client tools and list the server exports.', hint: 'dnf install -y nfs-utils ; showmount -e nfs01.lab.example.com', check: (s) => !!s.packages.installed['nfs-utils'] },
      { id: 't2', text: 'Mount the export at `/mnt/shared`.', hint: 'mkdir -p /mnt/shared ; mount -t nfs nfs01.lab.example.com:/exports/shared /mnt/shared', check: (s) => /nfs/.test(mounted(s, '/mnt/shared')?.fstype || '') },
      { id: 't3', text: 'Add an fstab entry with type nfs and the `_netdev` option.', hint: 'echo "nfs01.lab.example.com:/exports/shared /mnt/shared nfs defaults,_netdev 0 0" >> /etc/fstab', check: (s) => { const e = fstabFor(s, '/mnt/shared'); return !!e && /^nfs4?$/.test(e.type) && /_netdev/.test(e.opts) && /nfs01/.test(e.spec); } }
    ],
    solution: ['dnf install -y nfs-utils', 'showmount -e nfs01.lab.example.com', 'mkdir -p /mnt/shared', 'mount -t nfs nfs01.lab.example.com:/exports/shared /mnt/shared', 'echo "nfs01.lab.example.com:/exports/shared /mnt/shared nfs defaults,_netdev 0 0" >> /etc/fstab', 'findmnt /mnt/shared']
  },
  {
    id: 'LAB-09-AUTOFS', title: 'On-demand mounts with autofs', level: 9, lessonId: 'L09-M5-T2', tags: ['rhcsa'], minutes: 12,
    intro: 'Configure autofs so /shares/data mounts nfs01.lab.example.com:/exports/shared on demand.',
    tasks: [
      { id: 't1', text: 'Install autofs and nfs-utils.', hint: 'dnf install -y autofs nfs-utils', check: (s) => !!s.packages.installed.autofs && !!s.packages.installed['nfs-utils'] },
      { id: 't2', text: 'Create `/etc/auto.master.d/shares.autofs` containing `/shares /etc/auto.shares`.', hint: "echo '/shares /etc/auto.shares' > /etc/auto.master.d/shares.autofs", check: (s) => /^\s*\/shares\s+\/etc\/auto\.shares/m.test(text(s, '/etc/auto.master.d/shares.autofs') || '') },
      { id: 't3', text: 'Create the map `/etc/auto.shares` with: `data -rw,sync nfs01.lab.example.com:/exports/shared`.', hint: "echo 'data -rw,sync nfs01.lab.example.com:/exports/shared' > /etc/auto.shares", check: (s) => /^\s*data\s+-\S*\s+nfs01(\.lab\.example\.com)?:\/exports\/shared/m.test(text(s, '/etc/auto.shares') || '') },
      { id: 't4', text: 'Enable and start autofs, then access /shares/data.', hint: 'systemctl enable --now autofs ; ls /shares/data', check: (s) => enabled(s, 'autofs.service') && svcActive(s, 'autofs') && !!mounted(s, '/shares/data') }
    ],
    solution: ['dnf install -y autofs nfs-utils', "echo '/shares /etc/auto.shares' > /etc/auto.master.d/shares.autofs", "echo 'data -rw,sync nfs01.lab.example.com:/exports/shared' > /etc/auto.shares", 'systemctl enable --now autofs', 'ls /shares/data'],
    note: 'The simulator mounts autofs map entries when the service starts; real autofs mounts on first access and unmounts after the timeout.'
  },
  // ---------- Level 10: networking ----------
  {
    id: 'LAB-10-NMCLI', title: 'Configure a static IPv4/IPv6 connection', level: 10, lessonId: 'L10-M2-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'Bring up the second NIC ens224 on the storage network with a persistent static configuration.',
    tasks: [
      { id: 't1', text: 'Create connection `storage` on ens224 with IPv4 10.10.50.15/24, method manual, autoconnect yes.', hint: 'nmcli con add type ethernet con-name storage ifname ens224 ipv4.method manual ipv4.addresses 10.10.50.15/24 autoconnect yes', check: (s) => { const c = s.net.connections.storage; return c?.device === 'ens224' && c.method === 'manual' && c.addresses.includes('10.10.50.15/24'); } },
      { id: 't2', text: 'Add the IPv6 address fd00:50::15/64 (ipv6.method manual).', hint: 'nmcli con mod storage ipv6.method manual ipv6.addresses fd00:50::15/64', check: (s) => (s.net.connections.storage?.ipv6addresses || []).includes('fd00:50::15/64') && s.net.connections.storage.ipv6method === 'manual' },
      { id: 't3', text: 'Activate it and verify with `ip -br addr`. The keyfile must exist in /etc/NetworkManager/system-connections.', hint: 'nmcli con up storage ; ip -br addr', check: (s) => { const i = s.net.interfaces.find(x => x.name === 'ens224'); return i?.up && i.ipv4.includes('10.10.50.15/24') && i.ipv6.includes('fd00:50::15/64') && isFile(s, '/etc/NetworkManager/system-connections/storage.nmconnection'); } },
      { id: 't4', text: 'Set the static hostname to `server1.lab.example.com`.', hint: 'hostnamectl set-hostname server1.lab.example.com', check: (s) => (text(s, '/etc/hostname') || '').trim() === 'server1.lab.example.com' }
    ],
    solution: ['nmcli con add type ethernet con-name storage ifname ens224 ipv4.method manual ipv4.addresses 10.10.50.15/24 autoconnect yes', 'nmcli con mod storage ipv6.method manual ipv6.addresses fd00:50::15/64', 'nmcli con up storage', 'ip -br addr', 'hostnamectl set-hostname server1.lab.example.com']
  },
  {
    id: 'LAB-10-DNS', title: 'Fix name resolution persistently', level: 10, lessonId: 'L10-M4-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'Name resolution broke after a change. Ping by IP works; names do not. Fix it so it survives a reboot.',
    setup: ['__bad_dns__'],
    tasks: [
      { id: 't1', text: 'Show the evidence: compare `ping -c1 10.10.40.20` with `getent hosts repo.lab.example.com`, and read /etc/resolv.conf.', hint: 'cat /etc/resolv.conf ; getent hosts repo.lab.example.com', check: (s, term) => term.sys.history.some(h => /resolv\.conf/.test(h)) },
      { id: 't2', text: 'Fix the DNS server in the NetworkManager profile `ens192` (correct server: 10.10.40.2) and re-activate it — do not just edit resolv.conf.', hint: 'nmcli con mod ens192 ipv4.dns 10.10.40.2 ; nmcli con up ens192', check: (s) => s.net.connections.ens192?.dns.join(',') === '10.10.40.2' && !!resolveName(s, 'repo.lab.example.com').ip }
    ],
    solution: ['cat /etc/resolv.conf', 'getent hosts repo.lab.example.com   # fails', 'nmcli con show ens192 | grep dns', 'nmcli con mod ens192 ipv4.dns 10.10.40.2', 'nmcli con up ens192', 'getent hosts repo.lab.example.com']
  },
  // ---------- Level 11: security ----------
  {
    id: 'LAB-11-SSHKEY', title: 'Key-based SSH authentication', level: 11, lessonId: 'L11-M1-T1', tags: ['rhcsa'], minutes: 10,
    intro: 'As user student, set up key-based login to the student account on this host.',
    tasks: [
      { id: 't1', text: 'Switch to student and generate an ed25519 key pair with an empty passphrase.', hint: 'su - student ; ssh-keygen -t ed25519 -N ""', check: (s) => isFile(s, '/home/student/.ssh/id_ed25519') && mode(s, '/home/student/.ssh/id_ed25519') === 0o600 },
      { id: 't2', text: 'Install the public key with ssh-copy-id student@localhost.', hint: 'ssh-copy-id student@localhost', check: (s) => (text(s, '/home/student/.ssh/authorized_keys') || '').includes((text(s, '/home/student/.ssh/id_ed25519.pub') || 'x').trim()) },
      { id: 't3', text: 'Verify: `ssh student@localhost` must authenticate with the key. ~/.ssh must be 700 and authorized_keys 600 with label ssh_home_t.', hint: 'ssh student@localhost ; ls -ldZ ~/.ssh ~/.ssh/authorized_keys', check: (s) => mode(s, '/home/student/.ssh') === 0o700 && mode(s, '/home/student/.ssh/authorized_keys') === 0o600 && ctxType(node(s, '/home/student/.ssh/authorized_keys')?.ctx) === 'ssh_home_t' }
    ],
    solution: ['su - student', 'ssh-keygen -t ed25519 -N ""', 'ssh-copy-id student@localhost', 'ssh student@localhost', 'exit']
  },
  {
    id: 'LAB-11-SELINUX-WEB', title: 'SELinux: serve content from a custom directory', level: 11, lessonId: 'L11-M3-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'The web root was moved to /srv/web and now returns 403. Fix it the right way — SELinux stays Enforcing.',
    setup: ['__selinux_web__'],
    tasks: [
      { id: 't1', text: 'Reproduce the problem (`curl -I http://localhost/`) and find the denial (`ausearch -m AVC -ts recent`).', hint: 'curl -I http://localhost/ ; ausearch -m AVC -ts recent', check: (s, term) => term.sys.history.some(h => /ausearch|sealert|audit\.log/.test(h)) },
      { id: 't2', text: 'Add a persistent file-context rule for /srv/web and everything under it (type httpd_sys_content_t).', hint: "semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'", check: (s) => s.selinux.fcontextLocal.some(r => r.type === 'httpd_sys_content_t' && expectedContext(s, '/srv/web/index.html').includes('httpd_sys_content_t')) },
      { id: 't3', text: 'Apply the labels and confirm the page returns 200 while SELinux is Enforcing.', hint: 'restorecon -Rv /srv/web ; curl -I http://localhost/', check: (s) => s.selinux.mode === 'enforcing' && localHttp(s, 80, '/').status === 200 }
    ],
    solution: ['curl -I http://localhost/', 'ausearch -m AVC -ts recent', 'ls -ldZ /srv/web /srv/web/index.html', "semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'", 'restorecon -Rv /srv/web', 'curl -I http://localhost/']
  },
  {
    id: 'LAB-11-SELINUX-PORT', title: 'Run httpd on a non-standard port', level: 11, lessonId: 'L11-M3-T2', tags: ['rhcsa'], minutes: 15,
    intro: 'httpd must listen on TCP 82 (instead of 80) and be reachable from client01.',
    tasks: [
      { id: 't1', text: 'Change `Listen 80` to `Listen 82` in /etc/httpd/conf/httpd.conf.', hint: "sed -i 's/^Listen 80$/Listen 82/' /etc/httpd/conf/httpd.conf", check: (s) => /^\s*Listen\s+82\s*$/m.test(text(s, '/etc/httpd/conf/httpd.conf') || '') && !/^\s*Listen\s+80\s*$/m.test(text(s, '/etc/httpd/conf/httpd.conf') || '') },
      { id: 't2', text: 'Label port 82 for httpd in SELinux policy.', hint: 'semanage port -a -t http_port_t -p tcp 82', check: (s) => (s.selinux.ports.http_port_t?.tcp || []).includes(82) },
      { id: 't3', text: 'Restart httpd; it must be listening on 82.', hint: 'systemctl restart httpd ; ss -tlnp | grep :82', check: (s) => svcActive(s, 'httpd') && listeningSockets(s).some(x => x.port === 82 && x.proc === 'httpd') },
      { id: 't4', text: 'Open 82/tcp in firewalld permanently AND in the running config; test with `simclient 82`.', hint: 'firewall-cmd --permanent --add-port=82/tcp ; firewall-cmd --reload ; simclient 82', check: (s) => s.firewall.permanent.public.ports.includes('82/tcp') && firewallAllows(s, 82, 'tcp') }
    ],
    solution: ["sed -i 's/^Listen 80$/Listen 82/' /etc/httpd/conf/httpd.conf", 'semanage port -a -t http_port_t -p tcp 82', 'systemctl restart httpd', 'ss -tlnp | grep :82', 'firewall-cmd --permanent --add-port=82/tcp', 'firewall-cmd --reload', 'simclient 82']
  },
  {
    id: 'LAB-11-FIREWALL', title: 'firewalld runtime versus permanent', level: 11, lessonId: 'L11-M4-T1', tags: ['rhcsa'], minutes: 8,
    intro: 'Allow HTTPS, remove Cockpit, and make sure both survive a reload.',
    tasks: [
      { id: 't1', text: 'Permanently allow the https service and remove cockpit from the public zone.', hint: 'firewall-cmd --permanent --add-service=https ; firewall-cmd --permanent --remove-service=cockpit', check: (s) => s.firewall.permanent.public.services.includes('https') && !s.firewall.permanent.public.services.includes('cockpit') },
      { id: 't2', text: 'Apply the permanent configuration to the running firewall.', hint: 'firewall-cmd --reload', check: (s) => s.firewall.runtime.public.services.includes('https') && !s.firewall.runtime.public.services.includes('cockpit') }
    ],
    solution: ['firewall-cmd --permanent --add-service=https', 'firewall-cmd --permanent --remove-service=cockpit', 'firewall-cmd --reload', 'firewall-cmd --list-all']
  },
  // ---------- Level 12: logging / tuning ----------
  {
    id: 'LAB-12-TIME', title: 'Configure a time source with chrony', level: 12, lessonId: 'L12-M4-T1', tags: ['rhcsa'], minutes: 8,
    intro: 'Use the internal NTP server ntp.lab.example.com instead of the public pool.',
    tasks: [
      { id: 't1', text: 'In /etc/chrony.conf replace the pool line with `server ntp.lab.example.com iburst`.', hint: "sed -i 's/^pool .*/server ntp.lab.example.com iburst/' /etc/chrony.conf", check: (s) => /^\s*server\s+ntp\.lab\.example\.com\s+iburst/m.test(text(s, '/etc/chrony.conf') || '') && !/^\s*pool\s/m.test(text(s, '/etc/chrony.conf') || '') },
      { id: 't2', text: 'Restart chronyd and confirm the source with `chronyc sources`.', hint: 'systemctl restart chronyd ; chronyc sources', check: (s) => svcActive(s, 'chronyd') && (s.services.chronyd.since || 0) >= (node(s, '/etc/chrony.conf')?.mtime || 0) && enabled(s, 'chronyd.service') }
    ],
    solution: ["sed -i 's/^pool .*/server ntp.lab.example.com iburst/' /etc/chrony.conf", 'systemctl restart chronyd', 'chronyc sources', 'timedatectl']
  },
  {
    id: 'LAB-12-TUNED', title: 'Apply a tuning profile', level: 12, lessonId: 'L12-M4-T2', tags: ['rhcsa'], minutes: 5,
    intro: 'This VM will run a throughput-heavy batch workload. Apply the matching tuned profile.',
    tasks: [
      { id: 't1', text: 'Check the recommended and active profiles.', hint: 'tuned-adm recommend ; tuned-adm active', check: (s, term) => term.sys.history.some(h => /tuned-adm (recommend|active)/.test(h)) },
      { id: 't2', text: 'Switch to `throughput-performance`.', hint: 'tuned-adm profile throughput-performance', check: (s) => s.tuned === 'throughput-performance' }
    ],
    solution: ['tuned-adm recommend', 'tuned-adm active', 'tuned-adm profile throughput-performance', 'tuned-adm active']
  },
  // ---------- Level 13: scripting and scheduling ----------
  {
    id: 'LAB-13-SCRIPT', title: 'A disk-usage check script', level: 13, lessonId: 'L13-M1-T1', tags: ['rhcsa'], minutes: 15,
    intro: 'Write /usr/local/bin/diskcheck.sh taking a threshold as $1. It prints "OK <pct>" (exit 0) when root usage is below the threshold, otherwise "ALERT <pct>" (exit 1).',
    tasks: [
      { id: 't1', text: 'Create the script with a shebang and make it executable.', hint: 'nano /usr/local/bin/diskcheck.sh ; chmod 755 /usr/local/bin/diskcheck.sh', check: (s) => (text(s, '/usr/local/bin/diskcheck.sh') || '').startsWith('#!/bin/bash') && (mode(s, '/usr/local/bin/diskcheck.sh') & 0o111) !== 0 },
      { id: 't2', text: 'Running `diskcheck.sh 90` must print OK with the percentage and exit 0.', hint: "pct=$(df / | tail -1 | awk '{print $5}' | tr -d '%')", check: (s, term) => { const r = run(s, term, '/usr/local/bin/diskcheck.sh 90'); return r.code === 0 && r.lines.some(l => /^OK \d+/.test(l.s)); } },
      { id: 't3', text: 'Running `diskcheck.sh 10` must print ALERT and exit 1.', hint: 'if [ "$pct" -ge "$1" ]; then echo "ALERT $pct"; exit 1; fi', check: (s, term) => { const r = run(s, term, '/usr/local/bin/diskcheck.sh 10'); return r.code === 1 && r.lines.some(l => /^ALERT \d+/.test(l.s)); } }
    ],
    solution: ['nano /usr/local/bin/diskcheck.sh', '#!/bin/bash\nthreshold=${1:-90}\npct=$(df / | tail -1 | awk \'{print $5}\' | tr -d \'%\')\nif [ "$pct" -ge "$threshold" ]; then\n  echo "ALERT $pct"\n  exit 1\nfi\necho "OK $pct"', 'chmod 755 /usr/local/bin/diskcheck.sh', '/usr/local/bin/diskcheck.sh 90 ; echo $?', '/usr/local/bin/diskcheck.sh 10 ; echo $?']
  },
  {
    id: 'LAB-13-CRON', title: 'Schedule a job with cron', level: 13, lessonId: 'L13-M4-T2', tags: ['rhcsa'], minutes: 8,
    intro: 'Run `/usr/local/bin/diskcheck.sh 85` every 15 minutes as user student, Monday to Friday.',
    tasks: [
      { id: 't1', text: 'Install the crontab for student (as root: `crontab -u student -e`, or write a file and `crontab -u student FILE`).', hint: "echo '*/15 * * * 1-5 /usr/local/bin/diskcheck.sh 85' > /tmp/cron.txt ; crontab -u student /tmp/cron.txt", check: (s) => /^\s*\*\/15\s+\*\s+\*\s+\*\s+(1-5|mon-fri)\s+\/usr\/local\/bin\/diskcheck\.sh 85\s*$/mi.test(text(s, '/var/spool/cron/student') || '') },
      { id: 't2', text: 'List it to verify.', hint: 'crontab -u student -l', check: (s, term) => term.sys.history.some(h => /crontab .*-l/.test(h)) }
    ],
    solution: ["echo '*/15 * * * 1-5 /usr/local/bin/diskcheck.sh 85' > /tmp/cron.txt", 'crontab -u student /tmp/cron.txt', 'crontab -u student -l']
  }
];

/** Special setup steps that need direct state manipulation (still deterministic). */
export function applySpecialSetup(step, term) {
  const sys = term.sys;
  switch (step) {
    case '__deleted_open_file__': {
      term.shell.run('mkdir -p /var/log/reports', { record: false });
      const n = sys.fs.writeFile('/var/log/reports/report-gen.log', '/', 'report line\n', {});
      n.size = 6 * 1024 * 1024 * 1024;
      const p = sys.processes.find(x => x.cmd.includes('report-gen')) || null;
      const pid = p?.pid || 4321;
      if (!p) sys.processes.push({ pid, ppid: 1, user: 'root', state: 'S', cpu: 0.4, mem: 0.2, rssMb: 30, nice: 0, tty: '?', start: '08:10', time: '0:12', cmd: '/opt/reports/bin/report-gen --daemon', fds: 14, ports: null });
      n.openBy = [pid];
      n.fsRoot = sys.fs.rootIno;
      sys.storage.filesystems['/dev/mapper/rhel-root'].used = 26000 - 6144; // after deletion df still counts the open file
      term.shell.run('rm /var/log/reports/report-gen.log', { record: false });
      return;
    }
    case '__cpu_hogs__':
      sys.processes.push({ pid: 5101, ppid: 1, user: 'devuser', state: 'R', cpu: 99.2, mem: 0.4, rssMb: 64, nice: 0, tty: '?', start: '09:40', time: '45:10', cmd: '/tmp/.x/cryptominer --threads 1', ignores: ['TERM'], fds: 8, ports: null });
      sys.processes.push({ pid: 5140, ppid: 1, user: 'root', state: 'R', cpu: 62.0, mem: 0.3, rssMb: 40, nice: 0, tty: '?', start: '09:45', time: '12:03', cmd: '/bin/bash /usr/local/sbin/backup.sh', fds: 9, ports: null });
      return;
    case '__timer_service__':
      term.shell.run("printf '[Unit]\\nDescription=Rotate application logs\\n\\n[Service]\\nType=oneshot\\nExecStart=/usr/sbin/logrotate /etc/logrotate.conf\\n' > /etc/systemd/system/logrotate-app.service", { record: false });
      return;
    case '__bad_dns__':
      sys.net.connections.ens192.dns = ['10.10.40.99'];
      sys.fs.writeFile('/etc/resolv.conf', '/', '# Generated by NetworkManager\nsearch lab.example.com\nnameserver 10.10.40.99\n', {});
      return;
    case '__selinux_web__': {
      term.shell.run('mkdir -p /srv/web', { record: false });
      term.shell.run("echo '<h1>Moved web root</h1>' > /root/index.html", { record: false });
      term.shell.run('mv /root/index.html /srv/web/index.html', { record: false });
      term.shell.run('chmod 755 /srv/web; chmod 644 /srv/web/index.html', { record: false });
      term.shell.run("sed -i 's#/var/www/html#/srv/web#g' /etc/httpd/conf/httpd.conf", { record: false });
      term.shell.run('systemctl restart httpd', { record: false });
      return;
    }
    default:
      term.shell.run(step, { record: false });
  }
}

export function setupLab(lab, term) {
  term.reset();
  for (const step of lab.setup || []) applySpecialSetup(step, term);
  term.sys.history.length = 0;
  term.sys.audit.length = Math.min(term.sys.audit.length, 1);
}

/** Evaluate every task; returns [{id, done}] — exceptions count as not done. */
export function checkLab(lab, term) {
  return lab.tasks.map(t => {
    let done = false;
    try { done = !!t.check(term.sys, term); } catch { done = false; }
    return { id: t.id, done };
  });
}

export { findUnitFile };
