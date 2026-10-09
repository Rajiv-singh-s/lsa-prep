// Production incident scenarios for the incident simulation engine (src/core/incidents.js).
// Each scenario: investigate (actions, key evidence gated by minEvidence, `requires` branching)
// -> diagnose (causes, exactly one correct) -> remediate (fixes; unsafe ones penalised)
// -> validate (prove recovery) -> done.
// Outputs are modelled on RHEL 9/10 and kept internally consistent within each scenario.

export const INCIDENTS = [
  // ---------------------------------------------------------------------------------------
  {
    id: 'INC-01',
    title: 'Root filesystem full on app server',
    level: 14, topic: 'L14-M3-T1',
    severity: 'P2',
    environment: 'rhel-app-02.prod.example.com, RHEL 9.4, Java (Tomcat) customer-portal backend behind HAProxy. Single 50G XFS root volume (rhel-root) holding /, /var and /var/log; no separate log volume.',
    symptoms: [
      'Zabbix: Free disk space is less than 1% on volume / (rhel-app-02)',
      'Cron job "nightly-export" failed: "No space left on device"',
      'Portal users report file uploads failing with HTTP 500'
    ],
    timeline: [
      '2026-10-07 18:40 Release 4.12 deployed (included a temporary DEBUG log level for a payment investigation)',
      '2026-10-08 06:00 Zabbix: / at 85%',
      '2026-10-09 02:10 Zabbix: / at 97%',
      '2026-10-09 07:52 Zabbix: / at 99.8%, cron failures begin',
      '2026-10-09 08:05 On-call engineer paged'
    ],
    actions: [
      { id: 'df', label: 'Check filesystem usage', cmd: 'df -hT', key: true, risk: 'safe',
        output: `Filesystem            Type      Size  Used Avail Use% Mounted on
devtmpfs              devtmpfs  4.0M     0  4.0M   0% /dev
tmpfs                 tmpfs     7.7G     0  7.7G   0% /dev/shm
tmpfs                 tmpfs     3.1G  8.9M  3.1G   1% /run
/dev/mapper/rhel-root xfs        50G   50G  104M 100% /
/dev/sda1             xfs       960M  312M  649M  33% /boot
nfs01:/exports/share  nfs4      500G  211G  290G  43% /mnt/share
tmpfs                 tmpfs     1.6G     0  1.6G   0% /run/user/1000`,
        note: 'Block usage on / is 100% with only 104M free. /mnt/share is NFS and must be excluded from any du scan (use du -x) or you will waste minutes walking a 211G remote tree.' },
      { id: 'dfi', label: 'Check inode usage', cmd: 'df -i /', key: false, risk: 'safe',
        output: `Filesystem             Inodes  IUsed   IFree IUse% Mounted on
/dev/mapper/rhel-root 26214400 187342 26027058    1% /`,
        note: 'Inodes are fine (1%). This is a block-space problem, not inode exhaustion.' },
      { id: 'du', label: 'Find the largest top-level directories (same filesystem only)', cmd: 'du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -6', key: true, risk: 'safe', requires: ['df'],
        output: `312M	/boot
1.1G	/home
2.4G	/opt
4.9G	/usr
39G	/var
50G	/`,
        note: '-x keeps du on the root filesystem. /var holds 39G of the 50G - drill down there.' },
      { id: 'duvar', label: 'Drill into /var/log', cmd: 'du -xh --max-depth=2 /var/log | sort -h | tail -5', key: true, risk: 'safe', requires: ['du'],
        output: `212M	/var/log/journal/9f3c1e0d2a7b4c51b0e8d2f6a1c3e5b7
212M	/var/log/journal
1.4G	/var/log/audit
35G	/var/log/portal
37G	/var/log`,
        note: 'The application log directory /var/log/portal is 35G. audit (1.4G) and journal (212M) are within their configured limits.' },
      { id: 'lsportal', label: 'List files in /var/log/portal', cmd: 'ls -lh --time-style=long-iso /var/log/portal/', key: true, risk: 'safe', requires: ['duvar'],
        output: `total 35G
-rw-r--r--. 1 portal portal 412M 2026-10-07 18:39 portal.log
-rw-r--r--. 1 portal portal  34G 2026-10-09 08:06 portal-debug.log
-rw-r--r--. 1 portal portal  96M 2026-10-06 23:59 portal.log.2026-10-06.gz`,
        note: 'portal-debug.log is 34G and still being written (mtime 08:06). It was created by the DEBUG appender shipped with release 4.12 and has no rotation policy.' },
      { id: 'logcfg', label: 'Inspect the application log configuration', cmd: 'grep -nE "level|debug" /opt/portal/conf/log4j2.xml', key: true, risk: 'safe', requires: ['lsportal'],
        output: `14:    <RollingFile name="main" fileName="/var/log/portal/portal.log" filePattern="/var/log/portal/portal.log.%d{yyyy-MM-dd}.gz">
22:    <File name="debug" fileName="/var/log/portal/portal-debug.log">
31:    <Root level="DEBUG">
33:      <AppenderRef ref="debug"/>
41:  <!-- TEMP: DEBUG enabled for PAY-2231 investigation, revert after 24h -->`,
        note: 'Root logger is DEBUG and writes to a plain <File> appender (no rollover). The "revert after 24h" comment was never actioned.' },
      { id: 'lsof', label: 'Look for deleted-but-open files', cmd: 'lsof -nP +L1 / 2>/dev/null', key: false, risk: 'safe', requires: ['df'],
        output: `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NLINK    NODE NAME
rsyslogd 1123 root    7w   REG  253,0     4096     0 1835211 /var/log/messages-20261004 (deleted)`,
        note: 'Only 4K is held by a deleted file - not the cause here. Good habit to rule it out, though.' },
      { id: 'journal', label: 'Check systemd journal disk usage', cmd: 'journalctl --disk-usage', key: false, risk: 'safe',
        output: `Archived and active journals take up 212.0M in the file system.`,
        note: 'The journal is small and capped by SystemMaxUse. Vacuuming it would not recover meaningful space.' },
      { id: 'dnfclean', label: 'Clean the DNF cache', cmd: 'dnf clean all', key: false, risk: 'safe',
        output: `Updating Subscription Management repositories.
42 files removed`,
        note: 'Recovered roughly 180M. Harmless, but it does not address the 34G runaway log and the disk will refill within the hour.' },
      { id: 'rmlogs', label: 'Delete everything in /var/log', cmd: 'rm -rf /var/log/*', key: false, risk: 'destructive',
        output: `[root@rhel-app-02 ~]# rm -rf /var/log/*
[root@rhel-app-02 ~]# df -h /
Filesystem             Size  Used Avail Use% Mounted on
/dev/mapper/rhel-root   50G   50G  110M 100% /
[root@rhel-app-02 ~]# systemctl status auditd | tail -1
Oct 09 08:09:14 rhel-app-02 auditd[981]: Unable to open /var/log/audit/audit.log (No such file or directory)`,
        note: 'Destructive and ineffective: the audit trail, journal and evidence are gone, auditd is now failing (a compliance breach), and the space is NOT freed because Tomcat still holds portal-debug.log open - it became a deleted-but-open file.' }
    ],
    causes: [
      { id: 'c1', text: 'DEBUG logging left enabled after release 4.12 is writing to a non-rotating file appender (/var/log/portal/portal-debug.log, 34G)', correct: true,
        why: 'du narrows the growth to /var/log/portal, ls shows a 34G actively-written debug log, and log4j2.xml confirms a DEBUG root logger with a plain File appender and a forgotten "revert after 24h" note.' },
      { id: 'c2', text: 'The filesystem has run out of inodes because of many small session files', correct: false,
        why: 'df -i shows 1% inode usage. This is block exhaustion.' },
      { id: 'c3', text: 'A large file was deleted but is still held open by a process', correct: false,
        why: 'lsof +L1 shows only a 4K deleted file. The space is consumed by a visible, linked log file.' },
      { id: 'c4', text: 'The systemd journal has grown without limits', correct: false,
        why: 'journalctl --disk-usage reports 212M; the journal is capped and not the problem.' }
    ],
    fixes: [
      { id: 'f1', text: 'Revert the root logger to INFO (config reload / approved change), save a compressed tail of the debug log for PAY-2231, then truncate the open file in place with "truncate -s 0 /var/log/portal/portal-debug.log"', correct: true,
        why: 'Stops the growth at its source, preserves the evidence developers need, and truncation frees the blocks immediately without breaking the file descriptor Tomcat holds open.' },
      { id: 'f2', text: 'rm -f /var/log/portal/portal-debug.log', correct: false, unsafe: true,
        why: 'Tomcat keeps the inode open, so the 34G is not released until the JVM restarts (df still shows 100%), and DEBUG logging keeps writing into an invisible file.' },
      { id: 'f3', text: 'Reboot the server to clear temporary files', correct: false, unsafe: true,
        why: 'A blind reboot causes an outage, does not shrink the 34G log, and the DEBUG level is still active after boot.' },
      { id: 'f4', text: 'Run journalctl --vacuum-size=50M and dnf clean all', correct: false,
        why: 'Frees a few hundred MB at most. The disk refills within the hour because the runaway logger is untouched.' }
    ],
    validations: [
      { id: 'v1', text: 'Confirm free space, confirm the debug log is no longer growing, and confirm the application is healthy', correct: true,
        why: 'Proves space was released, the source of growth is stopped, and the user-facing symptom is gone.',
        output: `[root@rhel-app-02 ~]# df -h /
Filesystem             Size  Used Avail Use% Mounted on
/dev/mapper/rhel-root   50G   16G   35G  32% /
[root@rhel-app-02 ~]# ls -l /var/log/portal/portal-debug.log; sleep 60; ls -l /var/log/portal/portal-debug.log
-rw-r--r--. 1 portal portal 0 Oct  9 08:14 /var/log/portal/portal-debug.log
-rw-r--r--. 1 portal portal 0 Oct  9 08:14 /var/log/portal/portal-debug.log
[root@rhel-app-02 ~]# curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:8080/health
200` },
      { id: 'v2', text: 'Run df -h once and close the incident', correct: false,
        why: 'A single df proves space is free now, not that the growth stopped or that uploads work again.' },
      { id: 'v3', text: 'Check that the Zabbix alert auto-resolved', correct: false,
        why: 'The alert clearing is a lagging signal; it says nothing about the logger configuration or application health.' }
    ],
    hints: [
      'Start with df, then use du -x so you stay on the affected filesystem.',
      'Keep drilling into the largest directory until you find a single file - then ask who writes it and why.',
      'A file that is open by a running process should be truncated, not deleted. Also fix whatever is filling it.'
    ],
    rootCause: 'Release 4.12 temporarily switched the portal root logger to **DEBUG** for a payment investigation and added a plain `<File>` appender (`/var/log/portal/portal-debug.log`) with no rollover policy. The planned 24-hour revert was never done, so the file grew to 34G in about 38 hours and exhausted the shared 50G root filesystem. With `/` full, cron jobs and file uploads failed with ENOSPC. Contributing factors: application logs live on the root filesystem, and the 85% disk alert was not acted on.',
    prevention: [
      'Move /var/log (or at least /var/log/portal) to a dedicated logical volume so log growth cannot take down the OS.',
      'Use a RollingFile appender with size-based policies (e.g. 500M x 10) for every appender, including temporary debug ones.',
      'Track temporary diagnostic changes as change tickets with an expiry and an owner.',
      'Alert on disk growth rate (fill-time prediction), not only static thresholds, and route the 85% alert to a human.'
    ],
    tags: ['disk', 'logs', 'xfs', 'rhcsa', 'troubleshooting']
  },

  // ---------------------------------------------------------------------------------------
  {
    id: 'INC-02',
    title: 'Mail queue host reports "No space left" with free blocks',
    level: 14, topic: 'L14-M3-T1',
    severity: 'P2',
    environment: 'rhel-mx-01.corp.example.com, RHEL 9.3, Postfix relay plus a PHP session-based web form. /var is a separate 20G ext4 logical volume (vg_data-lv_var) created with the default bytes-per-inode ratio.',
    symptoms: [
      'Postfix: "warning: mail_queue_enter: create file maildrop/...: No space left on device"',
      'Web form returns "session_start(): Failed to write session data"',
      'Disk monitoring shows /var at only 46% used'
    ],
    timeline: [
      '2026-09-12 PHP upgraded from 8.0 to 8.2 module stream',
      '2026-10-09 04:20 First Postfix "No space left on device" warning',
      '2026-10-09 07:45 Helpdesk ticket: contact form broken'
    ],
    actions: [
      { id: 'df', label: 'Check block usage on /var', cmd: 'df -h /var', key: false, risk: 'safe',
        output: `Filesystem                    Size  Used Avail Use% Mounted on
/dev/mapper/vg_data-lv_var     20G  8.6G   11G  46% /var`,
        note: 'Plenty of free blocks, yet writes fail with ENOSPC. That contradiction is the clue: something other than blocks is exhausted.' },
      { id: 'dfi', label: 'Check inode usage on /var', cmd: 'df -i /var', key: true, risk: 'safe',
        output: `Filesystem                     Inodes   IUsed IFree IUse% Mounted on
/dev/mapper/vg_data-lv_var    1310720 1310720     0  100% /var`,
        note: 'All 1,310,720 inodes are used. On ext4 the inode count is fixed at mkfs time, so creating any new file fails with "No space left on device" even with free blocks.' },
      { id: 'count', label: 'Count files per directory under /var', cmd: 'for d in /var/*; do echo "$(find "$d" -xdev | wc -l) $d"; done | sort -n | tail -4', key: true, risk: 'safe', requires: ['dfi'],
        output: `2114 /var/log
9876 /var/cache
14402 /var/spool
1281933 /var/lib`,
        note: '/var/lib contains almost every inode. Keep narrowing.' },
      { id: 'countlib', label: 'Narrow down inside /var/lib', cmd: 'find /var/lib -xdev -type f | cut -d/ -f1-5 | sort | uniq -c | sort -n | tail -2', key: true, risk: 'safe', requires: ['count'],
        output: `  11872 /var/lib/selinux/targeted
1264019 /var/lib/php/session`,
        note: '1.26 million files in /var/lib/php/session - PHP session files. Each is tiny (a few hundred bytes) so they use few blocks but one inode each.' },
      { id: 'sess', label: 'Inspect session file ages and the GC configuration', cmd: 'find /var/lib/php/session -type f -mmin +1440 | wc -l; php -i | grep -E "session.gc_(probability|maxlifetime)"', key: true, risk: 'safe', requires: ['countlib'],
        output: `1263544
session.gc_maxlifetime => 1440 => 1440
session.gc_probability => 0 => 0`,
        note: 'Almost all sessions are older than 24 minutes, yet nothing deletes them. On RHEL, gc_probability=0 is expected because cleanup is meant to be done by a cron/systemd timer - which is evidently not running since the module-stream switch.' },
      { id: 'timer', label: 'Check the session cleanup timer', cmd: 'systemctl list-timers --all | grep -i php; ls /etc/cron.d/ | grep -i php', key: false, risk: 'safe', requires: ['sess'],
        output: `0 timers listed.`,
        note: 'No session cleanup job exists. The cron file that came with the old package was removed during the PHP stream change in September.' },
      { id: 'postqueue', label: 'Inspect the mail queue', cmd: 'postqueue -p | tail -1', key: false, risk: 'safe',
        output: `-- 212 Kbytes in 37 Requests.`,
        note: 'The queue itself is small. Postfix is a victim of inode exhaustion, not the cause.' },
      { id: 'lsof', label: 'Look for deleted-but-open files', cmd: 'lsof -nP +L1 /var', key: false, risk: 'safe',
        output: ``,
        note: 'Nothing is held open after deletion. Not relevant to an inode problem anyway.' },
      { id: 'fsck', label: 'Run fsck on the mounted /var', cmd: 'e2fsck -f /dev/mapper/vg_data-lv_var', key: false, risk: 'destructive',
        output: `e2fsck 1.46.5 (30-Dec-2021)
/dev/mapper/vg_data-lv_var is mounted.

WARNING!!!  The filesystem is mounted.   If you continue you ***WILL***
cause ***SEVERE*** filesystem damage.

Do you really want to continue<n>? yes
Pass 1: Checking inodes, blocks, and sizes
Inode 393286 has illegal block(s).  Clear<y>? yes`,
        note: 'Never fsck a mounted read-write filesystem. You have just risked corrupting /var. Inode exhaustion is not corruption.' },
      { id: 'rmall', label: 'Delete the whole session directory', cmd: 'rm -rf /var/lib/php/session', key: false, risk: 'destructive',
        output: `[root@rhel-mx-01 ~]# rm -rf /var/lib/php/session
[root@rhel-mx-01 ~]# curl -s localhost/contact.php | grep -i warning
<b>Warning</b>:  session_start(): open(/var/lib/php/session/sess_q4..., O_RDWR) failed: No such file or directory (2)`,
        note: 'Removing the directory (with its ownership apache:apache, mode 770 and SELinux context) breaks sessions completely, and logs out every active user. Delete stale files, not the directory.' }
    ],
    causes: [
      { id: 'c1', text: 'Inode exhaustion on /var caused by 1.26M stale PHP session files that are never garbage-collected', correct: true,
        why: 'df -i shows 100% IUse with 46% block usage, and the per-directory count pins nearly all inodes on /var/lib/php/session with files older than gc_maxlifetime and no cleanup job.' },
      { id: 'c2', text: 'The /var filesystem is out of disk blocks', correct: false,
        why: 'df -h shows 11G available. Blocks are not the constraint.' },
      { id: 'c3', text: 'The Postfix queue is flooded by a spam run', correct: false,
        why: 'postqueue shows 37 messages / 212K. Postfix fails because it cannot create a file, not because the queue is large.' },
      { id: 'c4', text: 'The ext4 filesystem is corrupted', correct: false,
        why: 'There are no kernel EXT4-fs errors; ENOSPC with full inodes is normal behaviour, not corruption.' }
    ],
    fixes: [
      { id: 'f1', text: 'Delete only stale session files with "find /var/lib/php/session -xdev -type f -name \'sess_*\' -mmin +1440 -delete", then restore a scheduled cleanup (systemd timer) for sessions', correct: true,
        why: 'Frees ~1.26M inodes without touching active sessions or the directory permissions/SELinux context, and the timer prevents recurrence.' },
      { id: 'f2', text: 'rm -rf /var/lib/php/session and recreate it with chmod 777', correct: false, unsafe: true,
        why: 'Logs out every user, and 777 on a session directory lets any local user read or hijack sessions. It also loses the original SELinux context.' },
      { id: 'f3', text: 'Extend the logical volume with lvextend -r -L +10G', correct: false,
        why: 'Growing ext4 adds inodes proportionally, so this buys time, but the sessions keep accumulating and the root cause is untouched.' },
      { id: 'f4', text: 'Unmount /var and run e2fsck -fy', correct: false, unsafe: true,
        why: 'Requires an outage and fixes nothing: the filesystem is consistent, it is just full of files.' }
    ],
    validations: [
      { id: 'v1', text: 'Verify inode usage dropped, Postfix can enqueue mail, the web form works, and the cleanup timer is scheduled', correct: true,
        why: 'Covers capacity, both user-facing symptoms, and the preventive control.',
        output: `[root@rhel-mx-01 ~]# df -i /var
Filesystem                    Inodes IUsed   IFree IUse% Mounted on
/dev/mapper/vg_data-lv_var   1310720 47312 1263408    4% /var
[root@rhel-mx-01 ~]# echo test | mail -s inode-check ops@example.com; postqueue -p | tail -1
Mail queue is empty
[root@rhel-mx-01 ~]# curl -s -o /dev/null -w "%{http_code}\\n" http://localhost/contact.php
200
[root@rhel-mx-01 ~]# systemctl list-timers php-session-clean.timer
NEXT                        LEFT     LAST PASSED UNIT                    ACTIVATES
Thu 2026-10-09 09:00:00 UTC 41min    -    -      php-session-clean.timer php-session-clean.service` },
      { id: 'v2', text: 'Check df -h /var', correct: false,
        why: 'df -h was never the problem - it showed free space even during the outage.' },
      { id: 'v3', text: 'Restart postfix and httpd and assume it works', correct: false,
        why: 'A restart proves nothing about inode capacity or recurrence.' }
    ],
    hints: [
      '"No space left on device" with free blocks - what else can a filesystem run out of?',
      'Run df -i, then count files (not bytes) per directory.',
      'Delete stale files selectively and ask why nothing was cleaning them up.'
    ],
    rootCause: 'The `/var` ext4 filesystem ran out of **inodes** (100% IUse) while only 46% of its blocks were used. When the PHP module stream was switched in September, the scheduled job that purged `/var/lib/php/session` was removed, and RHEL ships PHP with `session.gc_probability = 0`, so no in-process GC ran either. Over four weeks 1.26 million small session files consumed every inode, so any file creation on `/var` - Postfix maildrop files and new PHP sessions - failed with ENOSPC.',
    prevention: [
      'Restore and own a systemd timer that purges sessions older than gc_maxlifetime; verify it after package or module-stream changes.',
      'Monitor inode usage (IUse%) alongside block usage on every filesystem.',
      'For small-file workloads, choose XFS (dynamic inode allocation) or create ext4 with a lower bytes-per-inode ratio (mkfs.ext4 -i).',
      'Consider storing sessions in Redis/memcached instead of the local filesystem.'
    ],
    tags: ['disk', 'inodes', 'ext4', 'php', 'rhcsa']
  }
];
