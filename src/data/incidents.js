// Production incident scenarios for the incident simulation engine (src/core/incidents.js).
// Fully compliant with 20 production enterprise incident scenarios.

export const INCIDENTS = [
  {
    "id": "INC-01",
    "title": "Root filesystem full on app server",
    "level": 14,
    "topic": "L14-M3-T1",
    "severity": "P2",
    "environment": "rhel-app-02.prod.example.com, RHEL 9.4, Java (Tomcat) customer-portal backend behind HAProxy. Single 50G XFS root volume (rhel-root) holding /, /var and /var/log; no separate log volume.",
    "symptoms": [
      "Zabbix: Free disk space is less than 1% on volume / (rhel-app-02)",
      "Cron job \"nightly-export\" failed: \"No space left on device\"",
      "Portal users report file uploads failing with HTTP 500"
    ],
    "timeline": [
      "2026-10-07 18:40 Release 4.12 deployed (included a temporary DEBUG log level for a payment investigation)",
      "2026-10-08 06:00 Zabbix: / at 85%",
      "2026-10-09 02:10 Zabbix: / at 97%",
      "2026-10-09 07:52 Zabbix: / at 99.8%, cron failures begin",
      "2026-10-09 08:05 On-call engineer paged"
    ],
    "actions": [
      {
        "id": "df",
        "label": "Check filesystem usage",
        "cmd": "df -hT",
        "key": true,
        "risk": "safe",
        "output": "Filesystem            Type      Size  Used Avail Use% Mounted on\ndevtmpfs              devtmpfs  4.0M     0  4.0M   0% /dev\ntmpfs                 tmpfs     7.7G     0  7.7G   0% /dev/shm\ntmpfs                 tmpfs     3.1G  8.9M  3.1G   1% /run\n/dev/mapper/rhel-root xfs        50G   50G  104M 100% /\n/dev/sda1             xfs       960M  312M  649M  33% /boot\nnfs01:/exports/share  nfs4      500G  211G  290G  43% /mnt/share\ntmpfs                 tmpfs     1.6G     0  1.6G   0% /run/user/1000",
        "note": "Block usage on / is 100% with only 104M free. /mnt/share is NFS and must be excluded from any du scan (use du -x) or you will waste minutes walking a 211G remote tree."
      },
      {
        "id": "dfi",
        "label": "Check inode usage",
        "cmd": "df -i /",
        "key": false,
        "risk": "safe",
        "output": "Filesystem             Inodes  IUsed   IFree IUse% Mounted on\n/dev/mapper/rhel-root 26214400 187342 26027058    1% /",
        "note": "Inodes are fine (1%). This is a block-space problem, not inode exhaustion."
      },
      {
        "id": "du",
        "label": "Find the largest top-level directories (same filesystem only)",
        "cmd": "du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -6",
        "key": true,
        "risk": "safe",
        "requires": [
          "df"
        ],
        "output": "312M\t/boot\n1.1G\t/home\n2.4G\t/opt\n4.9G\t/usr\n39G\t/var\n50G\t/",
        "note": "-x keeps du on the root filesystem. /var holds 39G of the 50G - drill down there."
      },
      {
        "id": "duvar",
        "label": "Drill into /var/log",
        "cmd": "du -xh --max-depth=2 /var/log | sort -h | tail -5",
        "key": true,
        "risk": "safe",
        "requires": [
          "du"
        ],
        "output": "212M\t/var/log/journal/9f3c1e0d2a7b4c51b0e8d2f6a1c3e5b7\n212M\t/var/log/journal\n1.4G\t/var/log/audit\n35G\t/var/log/portal\n37G\t/var/log",
        "note": "The application log directory /var/log/portal is 35G. audit (1.4G) and journal (212M) are within their configured limits."
      },
      {
        "id": "lsportal",
        "label": "List files in /var/log/portal",
        "cmd": "ls -lh --time-style=long-iso /var/log/portal/",
        "key": true,
        "risk": "safe",
        "requires": [
          "duvar"
        ],
        "output": "total 35G\n-rw-r--r--. 1 portal portal 412M 2026-10-07 18:39 portal.log\n-rw-r--r--. 1 portal portal  34G 2026-10-09 08:06 portal-debug.log\n-rw-r--r--. 1 portal portal  96M 2026-10-06 23:59 portal.log.2026-10-06.gz",
        "note": "portal-debug.log is 34G and still being written (mtime 08:06). It was created by the DEBUG appender shipped with release 4.12 and has no rotation policy."
      },
      {
        "id": "logcfg",
        "label": "Inspect the application log configuration",
        "cmd": "grep -nE \"level|debug\" /opt/portal/conf/log4j2.xml",
        "key": true,
        "risk": "safe",
        "requires": [
          "lsportal"
        ],
        "output": "14:    <RollingFile name=\"main\" fileName=\"/var/log/portal/portal.log\" filePattern=\"/var/log/portal/portal.log.%d{yyyy-MM-dd}.gz\">\n22:    <File name=\"debug\" fileName=\"/var/log/portal/portal-debug.log\">\n31:    <Root level=\"DEBUG\">\n33:      <AppenderRef ref=\"debug\"/>\n41:  <!-- TEMP: DEBUG enabled for PAY-2231 investigation, revert after 24h -->",
        "note": "Root logger is DEBUG and writes to a plain <File> appender (no rollover). The \"revert after 24h\" comment was never actioned."
      },
      {
        "id": "lsof",
        "label": "Look for deleted-but-open files",
        "cmd": "lsof -nP +L1 / 2>/dev/null",
        "key": false,
        "risk": "safe",
        "requires": [
          "df"
        ],
        "output": "COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NLINK    NODE NAME\nrsyslogd 1123 root    7w   REG  253,0     4096     0 1835211 /var/log/messages-20261004 (deleted)",
        "note": "Only 4K is held by a deleted file - not the cause here. Good habit to rule it out, though."
      },
      {
        "id": "journal",
        "label": "Check systemd journal disk usage",
        "cmd": "journalctl --disk-usage",
        "key": false,
        "risk": "safe",
        "output": "Archived and active journals take up 212.0M in the file system.",
        "note": "The journal is small and capped by SystemMaxUse. Vacuuming it would not recover meaningful space."
      },
      {
        "id": "dnfclean",
        "label": "Clean the DNF cache",
        "cmd": "dnf clean all",
        "key": false,
        "risk": "safe",
        "output": "Updating Subscription Management repositories.\n42 files removed",
        "note": "Recovered roughly 180M. Harmless, but it does not address the 34G runaway log and the disk will refill within the hour."
      },
      {
        "id": "rmlogs",
        "label": "Delete everything in /var/log",
        "cmd": "rm -rf /var/log/*",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-app-02 ~]# rm -rf /var/log/*\n[root@rhel-app-02 ~]# df -h /\nFilesystem             Size  Used Avail Use% Mounted on\n/dev/mapper/rhel-root   50G   50G  110M 100% /\n[root@rhel-app-02 ~]# systemctl status auditd | tail -1\nOct 09 08:09:14 rhel-app-02 auditd[981]: Unable to open /var/log/audit/audit.log (No such file or directory)",
        "note": "Destructive and ineffective: the audit trail, journal and evidence are gone, auditd is now failing (a compliance breach), and the space is NOT freed because Tomcat still holds portal-debug.log open - it became a deleted-but-open file."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "DEBUG logging left enabled after release 4.12 is writing to a non-rotating file appender (/var/log/portal/portal-debug.log, 34G)",
        "correct": true,
        "why": "du narrows the growth to /var/log/portal, ls shows a 34G actively-written debug log, and log4j2.xml confirms a DEBUG root logger with a plain File appender and a forgotten \"revert after 24h\" note."
      },
      {
        "id": "c2",
        "text": "The filesystem has run out of inodes because of many small session files",
        "correct": false,
        "why": "df -i shows 1% inode usage. This is block exhaustion."
      },
      {
        "id": "c3",
        "text": "A large file was deleted but is still held open by a process",
        "correct": false,
        "why": "lsof +L1 shows only a 4K deleted file. The space is consumed by a visible, linked log file."
      },
      {
        "id": "c4",
        "text": "The systemd journal has grown without limits",
        "correct": false,
        "why": "journalctl --disk-usage reports 212M; the journal is capped and not the problem."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Revert the root logger to INFO (config reload / approved change), save a compressed tail of the debug log for PAY-2231, then truncate the open file in place with \"truncate -s 0 /var/log/portal/portal-debug.log\"",
        "correct": true,
        "why": "Stops the growth at its source, preserves the evidence developers need, and truncation frees the blocks immediately without breaking the file descriptor Tomcat holds open."
      },
      {
        "id": "f2",
        "text": "rm -f /var/log/portal/portal-debug.log",
        "correct": false,
        "unsafe": true,
        "why": "Tomcat keeps the inode open, so the 34G is not released until the JVM restarts (df still shows 100%), and DEBUG logging keeps writing into an invisible file."
      },
      {
        "id": "f3",
        "text": "Reboot the server to clear temporary files",
        "correct": false,
        "unsafe": true,
        "why": "A blind reboot causes an outage, does not shrink the 34G log, and the DEBUG level is still active after boot."
      },
      {
        "id": "f4",
        "text": "Run journalctl --vacuum-size=50M and dnf clean all",
        "correct": false,
        "why": "Frees a few hundred MB at most. The disk refills within the hour because the runaway logger is untouched."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm free space, confirm the debug log is no longer growing, and confirm the application is healthy",
        "correct": true,
        "why": "Proves space was released, the source of growth is stopped, and the user-facing symptom is gone.",
        "output": "[root@rhel-app-02 ~]# df -h /\nFilesystem             Size  Used Avail Use% Mounted on\n/dev/mapper/rhel-root   50G   16G   35G  32% /\n[root@rhel-app-02 ~]# ls -l /var/log/portal/portal-debug.log; sleep 60; ls -l /var/log/portal/portal-debug.log\n-rw-r--r--. 1 portal portal 0 Oct  9 08:14 /var/log/portal/portal-debug.log\n-rw-r--r--. 1 portal portal 0 Oct  9 08:14 /var/log/portal/portal-debug.log\n[root@rhel-app-02 ~]# curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost:8080/health\n200"
      },
      {
        "id": "v2",
        "text": "Run df -h once and close the incident",
        "correct": false,
        "why": "A single df proves space is free now, not that the growth stopped or that uploads work again."
      },
      {
        "id": "v3",
        "text": "Check that the Zabbix alert auto-resolved",
        "correct": false,
        "why": "The alert clearing is a lagging signal; it says nothing about the logger configuration or application health."
      }
    ],
    "hints": [
      "Start with df, then use du -x so you stay on the affected filesystem.",
      "Keep drilling into the largest directory until you find a single file - then ask who writes it and why.",
      "A file that is open by a running process should be truncated, not deleted. Also fix whatever is filling it."
    ],
    "rootCause": "Release 4.12 temporarily switched the portal root logger to **DEBUG** for a payment investigation and added a plain `<File>` appender (`/var/log/portal/portal-debug.log`) with no rollover policy. The planned 24-hour revert was never done, so the file grew to 34G in about 38 hours and exhausted the shared 50G root filesystem. With `/` full, cron jobs and file uploads failed with ENOSPC. Contributing factors: application logs live on the root filesystem, and the 85% disk alert was not acted on.",
    "prevention": [
      "Move /var/log (or at least /var/log/portal) to a dedicated logical volume so log growth cannot take down the OS.",
      "Use a RollingFile appender with size-based policies (e.g. 500M x 10) for every appender, including temporary debug ones.",
      "Track temporary diagnostic changes as change tickets with an expiry and an owner.",
      "Alert on disk growth rate (fill-time prediction), not only static thresholds, and route the 85% alert to a human."
    ],
    "tags": [
      "disk",
      "logs",
      "xfs",
      "rhcsa",
      "troubleshooting"
    ]
  },
  {
    "id": "INC-02",
    "title": "Mail queue host reports \"No space left\" with free blocks",
    "level": 14,
    "topic": "L14-M3-T1",
    "severity": "P2",
    "environment": "rhel-mx-01.corp.example.com, RHEL 9.3, Postfix relay plus a PHP session-based web form. /var is a separate 20G ext4 logical volume (vg_data-lv_var) created with the default bytes-per-inode ratio.",
    "symptoms": [
      "Postfix: \"warning: mail_queue_enter: create file maildrop/...: No space left on device\"",
      "Web form returns \"session_start(): Failed to write session data\"",
      "Disk monitoring shows /var at only 46% used"
    ],
    "timeline": [
      "2026-09-12 PHP upgraded from 8.0 to 8.2 module stream",
      "2026-10-09 04:20 First Postfix \"No space left on device\" warning",
      "2026-10-09 07:45 Helpdesk ticket: contact form broken"
    ],
    "actions": [
      {
        "id": "df",
        "label": "Check block usage on /var",
        "cmd": "df -h /var",
        "key": false,
        "risk": "safe",
        "output": "Filesystem                    Size  Used Avail Use% Mounted on\n/dev/mapper/vg_data-lv_var     20G  8.6G   11G  46% /var",
        "note": "Plenty of free blocks, yet writes fail with ENOSPC. That contradiction is the clue: something other than blocks is exhausted."
      },
      {
        "id": "dfi",
        "label": "Check inode usage on /var",
        "cmd": "df -i /var",
        "key": true,
        "risk": "safe",
        "output": "Filesystem                     Inodes   IUsed IFree IUse% Mounted on\n/dev/mapper/vg_data-lv_var    1310720 1310720     0  100% /var",
        "note": "All 1,310,720 inodes are used. On ext4 the inode count is fixed at mkfs time, so creating any new file fails with \"No space left on device\" even with free blocks."
      },
      {
        "id": "count",
        "label": "Count files per directory under /var",
        "cmd": "for d in /var/*; do echo \"$(find \"$d\" -xdev | wc -l) $d\"; done | sort -n | tail -4",
        "key": true,
        "risk": "safe",
        "requires": [
          "dfi"
        ],
        "output": "2114 /var/log\n9876 /var/cache\n14402 /var/spool\n1281933 /var/lib",
        "note": "/var/lib contains almost every inode. Keep narrowing."
      },
      {
        "id": "countlib",
        "label": "Narrow down inside /var/lib",
        "cmd": "find /var/lib -xdev -type f | cut -d/ -f1-5 | sort | uniq -c | sort -n | tail -2",
        "key": true,
        "risk": "safe",
        "requires": [
          "count"
        ],
        "output": "  11872 /var/lib/selinux/targeted\n1264019 /var/lib/php/session",
        "note": "1.26 million files in /var/lib/php/session - PHP session files. Each is tiny (a few hundred bytes) so they use few blocks but one inode each."
      },
      {
        "id": "sess",
        "label": "Inspect session file ages and the GC configuration",
        "cmd": "find /var/lib/php/session -type f -mmin +1440 | wc -l; php -i | grep -E \"session.gc_(probability|maxlifetime)\"",
        "key": true,
        "risk": "safe",
        "requires": [
          "countlib"
        ],
        "output": "1263544\nsession.gc_maxlifetime => 1440 => 1440\nsession.gc_probability => 0 => 0",
        "note": "Almost all sessions are older than 24 minutes, yet nothing deletes them. On RHEL, gc_probability=0 is expected because cleanup is meant to be done by a cron/systemd timer - which is evidently not running since the module-stream switch."
      },
      {
        "id": "timer",
        "label": "Check the session cleanup timer",
        "cmd": "systemctl list-timers --all | grep -i php; ls /etc/cron.d/ | grep -i php",
        "key": false,
        "risk": "safe",
        "requires": [
          "sess"
        ],
        "output": "0 timers listed.",
        "note": "No session cleanup job exists. The cron file that came with the old package was removed during the PHP stream change in September."
      },
      {
        "id": "postqueue",
        "label": "Inspect the mail queue",
        "cmd": "postqueue -p | tail -1",
        "key": false,
        "risk": "safe",
        "output": "-- 212 Kbytes in 37 Requests.",
        "note": "The queue itself is small. Postfix is a victim of inode exhaustion, not the cause."
      },
      {
        "id": "lsof",
        "label": "Look for deleted-but-open files",
        "cmd": "lsof -nP +L1 /var",
        "key": false,
        "risk": "safe",
        "output": "",
        "note": "Nothing is held open after deletion. Not relevant to an inode problem anyway."
      },
      {
        "id": "fsck",
        "label": "Run fsck on the mounted /var",
        "cmd": "e2fsck -f /dev/mapper/vg_data-lv_var",
        "key": false,
        "risk": "destructive",
        "output": "e2fsck 1.46.5 (30-Dec-2021)\n/dev/mapper/vg_data-lv_var is mounted.\n\nWARNING!!!  The filesystem is mounted.   If you continue you ***WILL***\ncause ***SEVERE*** filesystem damage.\n\nDo you really want to continue<n>? yes\nPass 1: Checking inodes, blocks, and sizes\nInode 393286 has illegal block(s).  Clear<y>? yes",
        "note": "Never fsck a mounted read-write filesystem. You have just risked corrupting /var. Inode exhaustion is not corruption."
      },
      {
        "id": "rmall",
        "label": "Delete the whole session directory",
        "cmd": "rm -rf /var/lib/php/session",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-mx-01 ~]# rm -rf /var/lib/php/session\n[root@rhel-mx-01 ~]# curl -s localhost/contact.php | grep -i warning\n<b>Warning</b>:  session_start(): open(/var/lib/php/session/sess_q4..., O_RDWR) failed: No such file or directory (2)",
        "note": "Removing the directory (with its ownership apache:apache, mode 770 and SELinux context) breaks sessions completely, and logs out every active user. Delete stale files, not the directory."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Inode exhaustion on /var caused by 1.26M stale PHP session files that are never garbage-collected",
        "correct": true,
        "why": "df -i shows 100% IUse with 46% block usage, and the per-directory count pins nearly all inodes on /var/lib/php/session with files older than gc_maxlifetime and no cleanup job."
      },
      {
        "id": "c2",
        "text": "The /var filesystem is out of disk blocks",
        "correct": false,
        "why": "df -h shows 11G available. Blocks are not the constraint."
      },
      {
        "id": "c3",
        "text": "The Postfix queue is flooded by a spam run",
        "correct": false,
        "why": "postqueue shows 37 messages / 212K. Postfix fails because it cannot create a file, not because the queue is large."
      },
      {
        "id": "c4",
        "text": "The ext4 filesystem is corrupted",
        "correct": false,
        "why": "There are no kernel EXT4-fs errors; ENOSPC with full inodes is normal behaviour, not corruption."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Delete only stale session files with \"find /var/lib/php/session -xdev -type f -name 'sess_*' -mmin +1440 -delete\", then restore a scheduled cleanup (systemd timer) for sessions",
        "correct": true,
        "why": "Frees ~1.26M inodes without touching active sessions or the directory permissions/SELinux context, and the timer prevents recurrence."
      },
      {
        "id": "f2",
        "text": "rm -rf /var/lib/php/session and recreate it with chmod 777",
        "correct": false,
        "unsafe": true,
        "why": "Logs out every user, and 777 on a session directory lets any local user read or hijack sessions. It also loses the original SELinux context."
      },
      {
        "id": "f3",
        "text": "Extend the logical volume with lvextend -r -L +10G",
        "correct": false,
        "why": "Growing ext4 adds inodes proportionally, so this buys time, but the sessions keep accumulating and the root cause is untouched."
      },
      {
        "id": "f4",
        "text": "Unmount /var and run e2fsck -fy",
        "correct": false,
        "unsafe": true,
        "why": "Requires an outage and fixes nothing: the filesystem is consistent, it is just full of files."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Verify inode usage dropped, Postfix can enqueue mail, the web form works, and the cleanup timer is scheduled",
        "correct": true,
        "why": "Covers capacity, both user-facing symptoms, and the preventive control.",
        "output": "[root@rhel-mx-01 ~]# df -i /var\nFilesystem                    Inodes IUsed   IFree IUse% Mounted on\n/dev/mapper/vg_data-lv_var   1310720 47312 1263408    4% /var\n[root@rhel-mx-01 ~]# echo test | mail -s inode-check ops@example.com; postqueue -p | tail -1\nMail queue is empty\n[root@rhel-mx-01 ~]# curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost/contact.php\n200\n[root@rhel-mx-01 ~]# systemctl list-timers php-session-clean.timer\nNEXT                        LEFT     LAST PASSED UNIT                    ACTIVATES\nThu 2026-10-09 09:00:00 UTC 41min    -    -      php-session-clean.timer php-session-clean.service"
      },
      {
        "id": "v2",
        "text": "Check df -h /var",
        "correct": false,
        "why": "df -h was never the problem - it showed free space even during the outage."
      },
      {
        "id": "v3",
        "text": "Restart postfix and httpd and assume it works",
        "correct": false,
        "why": "A restart proves nothing about inode capacity or recurrence."
      }
    ],
    "hints": [
      "\"No space left on device\" with free blocks - what else can a filesystem run out of?",
      "Run df -i, then count files (not bytes) per directory.",
      "Delete stale files selectively and ask why nothing was cleaning them up."
    ],
    "rootCause": "The `/var` ext4 filesystem ran out of **inodes** (100% IUse) while only 46% of its blocks were used. When the PHP module stream was switched in September, the scheduled job that purged `/var/lib/php/session` was removed, and RHEL ships PHP with `session.gc_probability = 0`, so no in-process GC ran either. Over four weeks 1.26 million small session files consumed every inode, so any file creation on `/var` - Postfix maildrop files and new PHP sessions - failed with ENOSPC.",
    "prevention": [
      "Restore and own a systemd timer that purges sessions older than gc_maxlifetime; verify it after package or module-stream changes.",
      "Monitor inode usage (IUse%) alongside block usage on every filesystem.",
      "For small-file workloads, choose XFS (dynamic inode allocation) or create ext4 with a lower bytes-per-inode ratio (mkfs.ext4 -i).",
      "Consider storing sessions in Redis/memcached instead of the local filesystem."
    ],
    "tags": [
      "disk",
      "inodes",
      "ext4",
      "php",
      "rhcsa"
    ]
  },
  {
    "id": "INC-03",
    "title": "Load average 30+ on API node after cron jobs pile up",
    "level": 14,
    "topic": "L14-M2-T1",
    "severity": "P2",
    "environment": "rhel-api-03.prod.example.com, RHEL 9.4, 8 vCPU / 16G KVM guest. Runs the \"orders\" REST API (gunicorn, Python 3.11, 9 workers) and a cron-driven reporting job /opt/reports/reportgen.py executed by user \"reports\".",
    "symptoms": [
      "Prometheus: node_load1 on rhel-api-03 = 31.6 (8 vCPU)",
      "API p95 latency up from 120 ms to 4.8 s; HAProxy marks the node \"DOWN\" intermittently on health-check timeouts",
      "SSH login to the host takes ~20 seconds"
    ],
    "timeline": [
      "2026-10-08 22:00 Month-end data import loaded 4x the usual order volume into the reporting schema",
      "2026-10-09 00:05 reportgen run time exceeds its 5-minute cron interval for the first time",
      "2026-10-09 01:10 node_load1 crosses 16",
      "2026-10-09 01:30 HAProxy starts flapping the backend; on-call paged"
    ],
    "actions": [
      {
        "id": "uptime",
        "label": "Check load average and uptime",
        "cmd": "uptime; nproc",
        "key": false,
        "risk": "safe",
        "output": " 01:34:12 up 23 days,  4:51,  1 user,  load average: 31.62, 29.84, 22.17\n8",
        "note": "Load of ~31 on 8 CPUs, and still rising over 15 minutes. Load alone does not tell you whether it is CPU, I/O wait or blocked tasks - look at CPU states next."
      },
      {
        "id": "mpstat",
        "label": "Break down CPU time by state",
        "cmd": "mpstat 1 3",
        "key": false,
        "risk": "safe",
        "output": "Linux 5.14.0-427.13.1.el9_4.x86_64 (rhel-api-03)  10/09/2026  _x86_64_  (8 CPU)\n\n01:34:15 AM  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle\n...\nAverage:     all   96.71    0.00    2.84    0.04    0.00    0.21    0.12    0.00    0.00    0.08",
        "note": "~97% user time, near-zero iowait and steal. This is genuine userspace CPU demand from processes on this guest, not storage latency or a noisy neighbour on the hypervisor."
      },
      {
        "id": "top",
        "label": "See which processes are consuming CPU",
        "cmd": "top -b -n1 -o %CPU | head -14",
        "key": true,
        "risk": "safe",
        "output": "top - 01:34:20 up 23 days,  4:51,  1 user,  load average: 31.70, 29.88, 22.21\nTasks: 287 total,  27 running, 260 sleeping,   0 stopped,   0 zombie\n%Cpu(s): 97.1 us,  2.7 sy,  0.0 ni,  0.0 id,  0.0 wa,  0.0 hi,  0.2 si,  0.0 st\nMiB Mem :  15731.4 total,   2104.6 free,   9876.2 used,   4012.8 buff/cache\nMiB Swap:   4096.0 total,   4096.0 free,      0.0 used.   5855.2 avail Mem\n\n    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 418822 reports   20   0  912340 611204  10212 R  52.9   3.8  44:12.81 python3\n 419310 reports   20   0  908112 604876  10204 R  52.9   3.8  39:02.44 python3\n 419771 reports   20   0  905520 598340  10196 R  47.1   3.7  34:10.09 python3\n 420236 reports   20   0  901208 589112  10188 R  47.1   3.7  29:01.73 python3\n 420702 reports   20   0  899876 571008  10208 R  47.1   3.5  23:58.30 python3\n 421164 reports   20   0  887412 552900  10200 R  41.2   3.4  18:44.92 python3\n   2214 orders    20   0  402116  98812  14320 S   5.9   0.6 211:09.44 gunicorn",
        "note": "The CPU is dominated by many python3 processes owned by \"reports\", not by the orders API (gunicorn). They have similar memory and long, staggered TIME+ values."
      },
      {
        "id": "ps",
        "label": "List the reports processes with start times and command lines",
        "cmd": "ps -u reports -o pid,lstart,etime,pcpu,args --sort=lstart",
        "key": true,
        "risk": "safe",
        "requires": [
          "top"
        ],
        "output": "    PID                  STARTED     ELAPSED %CPU COMMAND\n 418822 Fri Oct  9 00:05:01 2026       01:29:19 49.6 /usr/bin/python3 /opt/reports/reportgen.py --month-end\n 419310 Fri Oct  9 00:10:01 2026       01:24:19 46.1 /usr/bin/python3 /opt/reports/reportgen.py --month-end\n 419771 Fri Oct  9 00:15:01 2026       01:19:19 43.0 /usr/bin/python3 /opt/reports/reportgen.py --month-end\n ...\n 431980 Fri Oct  9 01:30:01 2026          04:19 31.8 /usr/bin/python3 /opt/reports/reportgen.py --month-end\n(18 processes)",
        "note": "A new reportgen instance started exactly every 5 minutes since 00:05 and none has finished: 18 copies now compete for 8 CPUs, so each runs slower, which guarantees the next one also overlaps. Classic cron pile-up."
      },
      {
        "id": "cron",
        "label": "Inspect the cron definition for the reports user",
        "cmd": "crontab -l -u reports",
        "key": true,
        "risk": "safe",
        "requires": [
          "ps"
        ],
        "output": "# reporting refresh - owner: data-team\n*/5 * * * * /usr/bin/python3 /opt/reports/reportgen.py --month-end >> /var/log/reports/reportgen.log 2>&1",
        "note": "Runs every 5 minutes with no lock (flock), no timeout and no check for an already-running instance."
      },
      {
        "id": "replog",
        "label": "Check how long reportgen normally takes",
        "cmd": "grep -h \"run finished\" /var/log/reports/reportgen.log | tail -4",
        "key": true,
        "risk": "safe",
        "requires": [
          "cron"
        ],
        "output": "2026-10-08 23:45:58 INFO run finished rows=1204331 duration=57.2s\n2026-10-08 23:50:59 INFO run finished rows=1204331 duration=58.0s\n2026-10-08 23:56:01 INFO run finished rows=1204331 duration=60.4s\n2026-10-09 00:02:51 INFO run finished rows=4811902 duration=171.9s",
        "note": "After the month-end import the dataset quadrupled and a single run took ~3 minutes; from 00:05 onwards runs overlapped and none has finished since."
      },
      {
        "id": "steal",
        "label": "Check hypervisor steal time history",
        "cmd": "sar -u -s 00:00:00 | tail -1",
        "key": false,
        "risk": "safe",
        "output": "Average:        all     71.40      0.00      2.31      0.05      0.11     26.13\n# columns: CPU %user %nice %system %iowait %steal %idle",
        "note": "Steal is ~0.1% since midnight. The hypervisor is not starving this VM."
      },
      {
        "id": "gunicorn",
        "label": "Check the orders API service",
        "cmd": "systemctl status orders-api --no-pager | head -6",
        "key": false,
        "risk": "safe",
        "output": "● orders-api.service - Orders REST API (gunicorn)\n     Loaded: loaded (/etc/systemd/system/orders-api.service; enabled; preset: disabled)\n     Active: active (running) since Wed 2026-09-16 21:43:10 UTC; 3 weeks 1 day ago\n   Main PID: 2214 (gunicorn)\n      Tasks: 10 (limit: 100304)\n     Memory: 1.1G",
        "note": "The API has been up for 3 weeks with no restarts. It is a victim of CPU starvation, not the cause."
      },
      {
        "id": "renice",
        "label": "Renice all reports processes to 19",
        "cmd": "renice -n 19 -u reports",
        "key": false,
        "risk": "caution",
        "output": "1004 (user ID) old priority 0, new priority 19",
        "note": "Gives the API more CPU share immediately, which is a reasonable stop-gap, but every new cron instance still starts at nice 0 and keeps piling up."
      },
      {
        "id": "pkill9",
        "label": "Kill every python3 process on the host",
        "cmd": "pkill -9 python3",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-api-03 ~]# pkill -9 python3\n[root@rhel-api-03 ~]# systemctl is-active orders-api\nfailed\n[root@rhel-api-03 ~]# curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost:8000/health\n000",
        "note": "gunicorn is also a python3 process. You just took the orders API down completely (worse than slow), and SIGKILL gave reportgen no chance to roll back its DB transactions."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "reportgen.py runs every 5 minutes without a lock; after the month-end import each run took longer than 5 minutes, so instances piled up (18 concurrent) and saturated all CPUs",
        "correct": true,
        "why": "top/ps show 18 reportgen copies started at exact 5-minute intervals, the crontab has no flock or timeout, and the log shows run duration jumping from ~60 s to ~172 s after the import."
      },
      {
        "id": "c2",
        "text": "The hypervisor is overcommitted and stealing CPU from the VM",
        "correct": false,
        "why": "mpstat and sar show %steal around 0.1%. The CPU is busy running this guest's own processes."
      },
      {
        "id": "c3",
        "text": "The orders API has a CPU-bound bug introduced in a recent release",
        "correct": false,
        "why": "gunicorn uses ~6% CPU and has not been redeployed in 3 weeks."
      },
      {
        "id": "c4",
        "text": "The system is I/O bound and load is caused by processes waiting on disk",
        "correct": false,
        "why": "iowait is ~0% and the processes are in R (running) state, not D (uninterruptible sleep)."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Comment out the cron entry, send SIGTERM to all but the oldest reportgen instance, let that one finish, then reinstate the job wrapped in \"flock -n /run/lock/reportgen.lock timeout 25m ...\" at a 30-minute interval agreed with the data team",
        "correct": true,
        "why": "Stops new instances, lets one run complete cleanly, and the lock plus timeout makes overlap impossible in future."
      },
      {
        "id": "f2",
        "text": "pkill -9 python3",
        "correct": false,
        "unsafe": true,
        "why": "Kills the gunicorn API too and SIGKILLs reportgen mid-transaction. The cron job also restarts the pile-up in 5 minutes."
      },
      {
        "id": "f3",
        "text": "Reboot the server to clear the load",
        "correct": false,
        "unsafe": true,
        "why": "Causes a full API outage, and the unchanged crontab recreates the pile-up within minutes of boot."
      },
      {
        "id": "f4",
        "text": "renice -n 19 -u reports and add 4 more vCPUs",
        "correct": false,
        "why": "Treats the symptom: instances still accumulate every 5 minutes and will saturate 12 CPUs just as easily."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm a single reportgen instance with the lock, load trending down, and API latency/health restored",
        "correct": true,
        "why": "Proves the pile-up stopped, the guard is in place and the user-facing symptom is gone.",
        "output": "[root@rhel-api-03 ~]# pgrep -c -u reports -f reportgen.py\n1\n[root@rhel-api-03 ~]# crontab -l -u reports | tail -1\n*/30 * * * * /usr/bin/flock -n /run/lock/reportgen.lock /usr/bin/timeout 25m /usr/bin/python3 /opt/reports/reportgen.py --month-end >> /var/log/reports/reportgen.log 2>&1\n[root@rhel-api-03 ~]# uptime\n 01:58:40 up 23 days,  5:15,  1 user,  load average: 1.84, 6.92, 17.40\n[root@rhel-api-03 ~]# curl -s -o /dev/null -w \"%{http_code} %{time_total}\\n\" http://localhost:8000/health\n200 0.041"
      },
      {
        "id": "v2",
        "text": "Check that load1 is below 8 right now",
        "correct": false,
        "why": "One sample right after killing processes says nothing about the next cron run."
      },
      {
        "id": "v3",
        "text": "Restart orders-api and check it is active",
        "correct": false,
        "why": "The API was never down; restarting it proves nothing about the reporting job."
      }
    ],
    "hints": [
      "High load: find out whether it is CPU, I/O or steal, then find out who is using the CPU.",
      "Look at the start times of the busy processes. Is there a pattern?",
      "A scheduled job that runs longer than its interval needs a lock, not more CPU."
    ],
    "rootCause": "The `reports` user's cron job ran `reportgen.py` every 5 minutes with **no locking or timeout**. The month-end import quadrupled the dataset, so a single run took ~3 minutes and then longer as instances began overlapping. Each new instance competed for the same 8 vCPUs, slowing all of them further, until 18 copies were running and the orders API was starved of CPU. HAProxy health checks then timed out and the node flapped. Contributing factor: no alert on job duration or concurrent instance count.",
    "prevention": [
      "Wrap every recurring job in flock -n (or use a systemd timer, which never starts a second instance of a running service).",
      "Add a timeout and alert when a job's run time exceeds a threshold relative to its interval.",
      "Run batch work in a separate slice or cgroup (CPUQuota/CPUWeight) so it cannot starve user-facing services.",
      "Coordinate bulk data imports with the owners of downstream scheduled jobs."
    ],
    "tags": [
      "cpu",
      "load",
      "cron",
      "performance",
      "rhcsa"
    ]
  },
  {
    "id": "INC-04",
    "title": "Orders service repeatedly killed by the OOM killer",
    "level": 14,
    "topic": "L14-M2-T2",
    "severity": "P1",
    "environment": "rhel-app-07.prod.example.com, RHEL 9.4, 16G RAM, no swap. Runs orders-svc (OpenJDK 21, systemd unit orders-svc.service, JVM options from /etc/sysconfig/orders-svc) and a local Redis cache capped at 3G.",
    "symptoms": [
      "PagerDuty: orders-svc on rhel-app-07 restarted 6 times in 40 minutes",
      "Customers see intermittent HTTP 503 during checkout",
      "Grafana shows host memory climbing to ~100% before each restart"
    ],
    "timeline": [
      "2026-10-08 17:20 Change CHG-8812: performance tuning merged to config repo (JVM heap raised)",
      "2026-10-08 17:35 orders-svc restarted by configuration management",
      "2026-10-09 09:10 Morning traffic ramps up",
      "2026-10-09 09:22 First unexpected restart of orders-svc",
      "2026-10-09 10:02 Sixth restart; P1 declared"
    ],
    "actions": [
      {
        "id": "status",
        "label": "Check the service status",
        "cmd": "systemctl status orders-svc --no-pager",
        "key": false,
        "risk": "safe",
        "output": "● orders-svc.service - Orders Service\n     Loaded: loaded (/etc/systemd/system/orders-svc.service; enabled; preset: disabled)\n     Active: active (running) since Fri 2026-10-09 10:02:37 UTC; 3min ago\n   Main PID: 77140 (java)\n      Tasks: 212 (limit: 100304)\n     Memory: 8.9G\n        CPU: 4min 12.330s\n\nOct 09 10:02:31 rhel-app-07 systemd[1]: orders-svc.service: A process of this unit has been killed by the OOM killer.\nOct 09 10:02:31 rhel-app-07 systemd[1]: orders-svc.service: Main process exited, code=killed, status=9/KILL\nOct 09 10:02:37 rhel-app-07 systemd[1]: orders-svc.service: Scheduled restart job, restart counter is at 6.",
        "note": "systemd itself reports the OOM killer. The JVM was SIGKILLed - it did not crash on its own, so there is no Java stack trace to find."
      },
      {
        "id": "dmesg",
        "label": "Read the kernel OOM report",
        "cmd": "journalctl -k --since \"10:00\" | grep -iE \"oom|killed process\"",
        "key": true,
        "risk": "safe",
        "output": "Oct 09 10:02:30 rhel-app-07 kernel: java invoked oom-killer: gfp_mask=0x140cca(GFP_HIGHUSER_MOVABLE|__GFP_COMP), order=0, oom_score_adj=0\nOct 09 10:02:30 rhel-app-07 kernel: Out of memory: Killed process 74410 (java) total-vm:19873412kB, anon-rss:12904388kB, file-rss:0kB, shmem-rss:0kB, UID:985 pgtables:26412kB oom_score_adj:0\nOct 09 10:02:31 rhel-app-07 kernel: oom_reaper: reaped process 74410 (java), now anon-rss:0kB, file-rss:0kB, shmem-rss:0kB",
        "note": "The killed JVM had 12.3G of anonymous memory on a 16G host that also runs Redis. It was allowed to grow larger than the machine can hold."
      },
      {
        "id": "free",
        "label": "Check memory and swap",
        "cmd": "free -h",
        "key": false,
        "risk": "safe",
        "output": "               total        used        free      shared  buff/cache   available\nMem:            15Gi        13Gi       612Mi        24Mi       1.6Gi       1.9Gi\nSwap:             0B          0B          0B",
        "note": "Three minutes after the restart, used memory is already 13G and available is under 2G, with no swap to absorb spikes."
      },
      {
        "id": "ps",
        "label": "Show the largest memory consumers",
        "cmd": "ps -eo pid,user,rss,args --sort=-rss | head -4",
        "key": true,
        "risk": "safe",
        "requires": [
          "free"
        ],
        "output": "    PID USER       RSS COMMAND\n  77140 orders   9318412 /usr/lib/jvm/java-21-openjdk/bin/java -Xms12g -Xmx12g -XX:+UseG1GC -XX:MaxMetaspaceSize=512m -jar /opt/orders/orders-svc.jar\n   1388 redis    3201876 /usr/bin/redis-server 127.0.0.1:6379\n   1031 root      104220 /usr/lib/systemd/systemd-journald",
        "note": "The JVM runs with -Xms12g -Xmx12g. Heap alone is 12G; add metaspace, thread stacks, code cache and direct buffers and the process exceeds 13G. Redis holds 3.1G. 13G + 3.1G + OS > 16G."
      },
      {
        "id": "sysconfig",
        "label": "Review the JVM options file and its history",
        "cmd": "cat /etc/sysconfig/orders-svc; git -C /srv/config-repo log -1 --format=\"%h %an %ad %s\" -- hosts/rhel-app-07/orders-svc",
        "key": true,
        "risk": "safe",
        "requires": [
          "ps"
        ],
        "output": "JAVA_OPTS=\"-Xms12g -Xmx12g -XX:+UseG1GC -XX:MaxMetaspaceSize=512m\"\n9c1e4fa a.kumar Thu Oct 8 17:20:44 2026 +0000 CHG-8812 raise heap 6g->12g for GC pressure",
        "note": "CHG-8812 doubled the heap from 6G to 12G yesterday. The change did not account for Redis or non-heap JVM memory on this host."
      },
      {
        "id": "redisinfo",
        "label": "Check Redis memory configuration",
        "cmd": "redis-cli info memory | grep -E \"used_memory_human|maxmemory_human|maxmemory_policy\"",
        "key": false,
        "risk": "safe",
        "output": "used_memory_human:3.02G\nmaxmemory_human:3.00G\nmaxmemory_policy:allkeys-lru",
        "note": "Redis is capped at 3G with LRU eviction - stable and behaving as configured. It is not growing."
      },
      {
        "id": "slab",
        "label": "Check kernel slab usage",
        "cmd": "grep -E \"^Slab|SUnreclaim\" /proc/meminfo",
        "key": false,
        "risk": "safe",
        "output": "Slab:             412316 kB\nSUnreclaim:       118204 kB",
        "note": "~400M of slab is normal for this workload. No kernel memory leak."
      },
      {
        "id": "dropcache",
        "label": "Drop the page cache",
        "cmd": "sync; echo 3 > /proc/sys/vm/drop_caches; free -h | sed -n 2p",
        "key": false,
        "risk": "caution",
        "output": "Mem:            15Gi        13Gi       1.9Gi        24Mi       312Mi       1.9Gi",
        "note": "\"available\" did not change - page cache was already reclaimable. You made every file read hit disk for a while, and the JVM still outgrows RAM."
      },
      {
        "id": "killredis",
        "label": "Kill Redis to free 3G",
        "cmd": "kill -9 1388",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-app-07 ~]# kill -9 1388\n[root@rhel-app-07 ~]# journalctl -u orders-svc -n 2 --no-pager\nOct 09 10:07:12 rhel-app-07 java[77140]: WARN  CartCache - Unable to connect to Redis at 127.0.0.1:6379: Connection refused\nOct 09 10:07:12 rhel-app-07 java[77140]: ERROR CheckoutController - cart lookup failed, returning 503",
        "note": "Redis has no persistence configured here: every cached cart is gone, and checkout now fails on every request instead of intermittently."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "CHG-8812 raised the JVM heap to a fixed 12G on a 16G host that also runs a 3G Redis, so total demand exceeds physical RAM and the kernel OOM killer kills the JVM under load",
        "correct": true,
        "why": "The OOM report shows the java process at 12.3G anon RSS, ps shows -Xms12g -Xmx12g alongside 3.1G Redis, and the config history ties the change to yesterday's CHG-8812."
      },
      {
        "id": "c2",
        "text": "Redis has a memory leak",
        "correct": false,
        "why": "Redis is at its configured 3G maxmemory with LRU eviction and is not growing."
      },
      {
        "id": "c3",
        "text": "The page cache (buff/cache) is consuming all memory",
        "correct": false,
        "why": "Page cache is reclaimable and does not trigger the OOM killer; dropping it did not change available memory."
      },
      {
        "id": "c4",
        "text": "A kernel memory leak in slab",
        "correct": false,
        "why": "Slab is ~400M and unreclaimable slab is ~118M - normal."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Roll back CHG-8812 to -Xms6g -Xmx6g (heap + ~2G non-heap + 3G Redis + OS fits in 16G), add MemoryMax=10G to the unit via a drop-in, restart orders-svc in a controlled way, and open a follow-up to investigate the original GC pressure",
        "correct": true,
        "why": "Brings total memory demand back under physical RAM, and the cgroup limit contains any future overrun to this service instead of letting the kernel pick victims host-wide."
      },
      {
        "id": "f2",
        "text": "Set OOMScoreAdjust=-1000 for orders-svc so the kernel never kills it",
        "correct": false,
        "unsafe": true,
        "why": "Memory is still oversubscribed; the OOM killer will now kill Redis, sshd or journald instead, and the host can become unreachable."
      },
      {
        "id": "f3",
        "text": "Set vm.overcommit_memory=1 and add an 8G swap file",
        "correct": false,
        "unsafe": true,
        "why": "Overcommit lets allocations succeed that cannot be backed; swap turns OOM kills into multi-second GC pauses as heap pages are swapped. The JVM is still sized larger than the host."
      },
      {
        "id": "f4",
        "text": "Schedule a cron job to drop caches every 5 minutes",
        "correct": false,
        "why": "Page cache is not the problem; this degrades I/O and does nothing to the JVM heap."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm the new heap settings and cgroup limit are active, memory has headroom under peak traffic, and no OOM events or restarts occur",
        "correct": true,
        "why": "Checks the running configuration, the protective limit, and the absence of the failure mode over a peak period.",
        "output": "[root@rhel-app-07 ~]# ps -o args= -p $(systemctl show -p MainPID --value orders-svc) | grep -o \"Xmx[0-9]*g\"\nXmx6g\n[root@rhel-app-07 ~]# systemctl show orders-svc -p MemoryMax -p NRestarts\nMemoryMax=10737418240\nNRestarts=0\n[root@rhel-app-07 ~]# free -h | sed -n 2p\nMem:            15Gi        10Gi       2.8Gi        24Mi       2.1Gi       4.9Gi\n[root@rhel-app-07 ~]# journalctl -k --since \"-2h\" | grep -c \"Out of memory\"\n0"
      },
      {
        "id": "v2",
        "text": "Check that orders-svc is \"active (running)\"",
        "correct": false,
        "why": "It was \"active (running)\" between every OOM kill too. You need to watch memory and restarts over peak load."
      },
      {
        "id": "v3",
        "text": "Run free -h and confirm buff/cache is small",
        "correct": false,
        "why": "Cache size is irrelevant to the OOM condition."
      }
    ],
    "hints": [
      "status=9/KILL with no stack trace: who sends SIGKILL to a process that is not misbehaving on its own?",
      "Read the kernel OOM report, then add up the memory of everything on the host.",
      "Find out what changed recently in how the JVM is configured."
    ],
    "rootCause": "Change **CHG-8812** raised the orders-svc JVM heap from 6G to a fixed 12G (`-Xms12g -Xmx12g`) on a 16G host with no swap that also runs a 3G Redis instance. Heap plus non-heap JVM memory (metaspace, thread stacks, code cache, direct buffers) pushed the process past 13G once morning traffic filled the heap, so total demand exceeded physical memory. The kernel OOM killer selected the largest process - the JVM - and systemd restarted it, producing a crash loop and intermittent 503s. The change was sized for the JVM in isolation and never reviewed against the host's total memory budget.",
    "prevention": [
      "Capacity-review heap changes against total host memory (heap + non-heap + co-located services + OS).",
      "Set MemoryMax/MemoryHigh on services so a single unit cannot exhaust the host.",
      "Alert on OOM kill events (node_vmstat_oom_kill) and on unexpected service restarts (NRestarts).",
      "Consider -XX:MaxRAMPercentage with a MemoryMax limit instead of hard-coded -Xmx so heap follows the memory actually granted."
    ],
    "tags": [
      "memory",
      "oom",
      "java",
      "systemd",
      "performance"
    ]
  },
  {
    "id": "INC-05",
    "title": "portal-app fails after patch reboot: port 8080 already in use",
    "level": 14,
    "topic": "L14-M5-T1",
    "severity": "P1",
    "environment": "rhel-portal-01.prod.example.com (10.10.40.15), RHEL 9.4. portal-app.service (Spring Boot, user \"portal\") listens on 8080 behind the load balancer. Developer account jsmith (UID 1001) exists on the host for log access.",
    "symptoms": [
      "PagerDuty: Production Customer Portal is down. Load balancer reports 502 Bad Gateway to backend 10.10.40.15:8080",
      "Load balancer health check on /health returns 404 instead of 200",
      "Server came back from the monthly patch reboot a few minutes earlier"
    ],
    "timeline": [
      "2026-10-03 Developer jsmith tests a mock API on the production host \"temporarily\" and enables lingering for his account",
      "2026-10-09 02:00 Monthly patch window: dnf update and reboot",
      "2026-10-09 02:03 Host back online; portal-app.service fails to start at 02:04",
      "2026-10-09 02:06 LB marks backend unhealthy; P1 raised"
    ],
    "actions": [
      {
        "id": "status",
        "label": "Check portal-app status",
        "cmd": "systemctl status portal-app --no-pager",
        "key": true,
        "risk": "safe",
        "output": "× portal-app.service - Customer Portal backend\n     Loaded: loaded (/etc/systemd/system/portal-app.service; enabled; preset: disabled)\n     Active: failed (Result: exit-code) since Fri 2026-10-09 02:04:51 UTC; 4min ago\n    Process: 4210 ExecStart=/usr/bin/java -jar /opt/portal/portal-app.jar (code=exited, status=1/FAILURE)\n   Main PID: 4210 (code=exited, status=1/FAILURE)\n        CPU: 9.812s\n\nOct 09 02:04:51 rhel-portal-01 systemd[1]: portal-app.service: Failed with result 'exit-code'.",
        "note": "The unit is enabled and was started at boot, but the Java process exited with status 1 after ~10 s of CPU. The journal will say why."
      },
      {
        "id": "journal",
        "label": "Read the service logs",
        "cmd": "journalctl -u portal-app -b --no-pager | grep -E \"FAILED|Port|BindException\"",
        "key": true,
        "risk": "safe",
        "requires": [
          "status"
        ],
        "output": "Oct 09 02:04:50 rhel-portal-01 java[4210]: APPLICATION FAILED TO START\nOct 09 02:04:50 rhel-portal-01 java[4210]: Web server failed to start. Port 8080 was already in use.\nOct 09 02:04:50 rhel-portal-01 java[4210]: Caused by: java.net.BindException: Address already in use",
        "note": "Something else owns TCP 8080. The LB gets 404 (not connection refused) because that something answers HTTP but has no /health route."
      },
      {
        "id": "ss",
        "label": "Find who is listening on 8080",
        "cmd": "ss -tlnp \"sport = :8080\"",
        "key": true,
        "risk": "safe",
        "requires": [
          "journal"
        ],
        "output": "State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process\nLISTEN 0      5            0.0.0.0:8080      0.0.0.0:*     users:((\"python3\",pid=1890,fd=3))",
        "note": "PID 1890, a python3 process, holds 0.0.0.0:8080. A listen backlog of 5 is typical of Python's http.server - not a production component."
      },
      {
        "id": "who",
        "label": "Identify PID 1890 and what started it",
        "cmd": "ps -o pid,user,lstart,args -p 1890; systemctl status 1890 --no-pager | head -5",
        "key": true,
        "risk": "safe",
        "requires": [
          "ss"
        ],
        "output": "    PID USER                      STARTED COMMAND\n   1890 jsmith   Fri Oct  9 02:03:58 2026 /usr/bin/python3 -m http.server 8080 --directory /home/jsmith/mockapi\n● mock-api.service - jsmith mock API\n     Loaded: loaded (/home/jsmith/.config/systemd/user/mock-api.service; enabled; preset: disabled)\n     Active: active (running) since Fri 2026-10-09 02:03:58 UTC; 5min ago\n   Main PID: 1890 (python3)\n     CGroup: /user.slice/user-1001.slice/user@1001.service/app.slice/mock-api.service",
        "note": "It is a systemd USER service owned by jsmith, enabled to start automatically. It started at 02:03:58, 53 seconds before portal-app failed, and won the race for port 8080."
      },
      {
        "id": "linger",
        "label": "Check why a user service runs without a login",
        "cmd": "loginctl show-user jsmith -p Linger; grep Restart= /home/jsmith/.config/systemd/user/mock-api.service",
        "key": false,
        "risk": "safe",
        "requires": [
          "who"
        ],
        "output": "Linger=yes\nRestart=always",
        "note": "Lingering makes user@1001.service start at boot, so the mock API comes up even though nobody logged in. Restart=always means killing the PID alone will just respawn it."
      },
      {
        "id": "selinux",
        "label": "Check for SELinux denials",
        "cmd": "ausearch -m AVC -ts boot",
        "key": false,
        "risk": "safe",
        "output": "<no matches>",
        "note": "No AVC denials. SELinux is not involved - this is a plain port conflict."
      },
      {
        "id": "fw",
        "label": "Check the firewall",
        "cmd": "firewall-cmd --list-ports",
        "key": false,
        "risk": "safe",
        "output": "8080/tcp",
        "note": "8080/tcp is open. The LB reaches the host - it just reaches the wrong program."
      },
      {
        "id": "kill",
        "label": "Kill PID 1890",
        "cmd": "kill 1890; sleep 6; ss -tlnp \"sport = :8080\"",
        "key": false,
        "risk": "caution",
        "requires": [
          "ss"
        ],
        "output": "State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process\nLISTEN 0      5            0.0.0.0:8080      0.0.0.0:*     users:((\"python3\",pid=2417,fd=3))",
        "note": "The process came straight back as PID 2417 - its user unit has Restart=always. Stop and disable the unit instead of chasing PIDs."
      },
      {
        "id": "reboot",
        "label": "Reboot the server again",
        "cmd": "systemctl reboot",
        "key": false,
        "risk": "destructive",
        "output": "Connection to 10.10.40.15 closed by remote host.\n... 4 minutes later ...\n[root@rhel-portal-01 ~]# systemctl is-active portal-app\nfailed",
        "note": "Another 4 minutes of total outage, and the same race happens again because the user service is still enabled with lingering."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "A developer's lingering systemd user service (mock-api, python3 http.server) starts at boot and binds 0.0.0.0:8080 before portal-app, so portal-app fails with BindException",
        "correct": true,
        "why": "The journal shows \"Port 8080 was already in use\", ss shows python3 PID 1890 on 8080, and systemctl status 1890 traces it to jsmith's enabled user unit with Linger=yes and Restart=always."
      },
      {
        "id": "c2",
        "text": "firewalld blocks 8080 after the patch reboot",
        "correct": false,
        "why": "firewall-cmd lists 8080/tcp, and the LB gets an HTTP 404 response - traffic reaches the host."
      },
      {
        "id": "c3",
        "text": "SELinux prevents Java from binding to port 8080",
        "correct": false,
        "why": "There are no AVC denials, and the error is EADDRINUSE, not EACCES."
      },
      {
        "id": "c4",
        "text": "The kernel update broke the Java runtime",
        "correct": false,
        "why": "Java ran for ~10 s and reported a clean, specific bind error; the runtime works."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Stop and disable the user unit (systemctl --user -M jsmith@ disable --now mock-api.service), run loginctl disable-linger jsmith, start portal-app, then raise a ticket to remove dev workloads from production",
        "correct": true,
        "why": "Removes the conflicting listener at its source so it cannot respawn or return on the next boot, and restores the real service."
      },
      {
        "id": "f2",
        "text": "setenforce 0 and restart portal-app",
        "correct": false,
        "unsafe": true,
        "why": "Weakens host security for a problem SELinux had nothing to do with; the port is still taken."
      },
      {
        "id": "f3",
        "text": "kill -9 1890 and immediately start portal-app",
        "correct": false,
        "why": "Restart=always respawns the mock API within seconds; portal-app may or may not win the race, and the next reboot breaks it again."
      },
      {
        "id": "f4",
        "text": "Change portal-app to listen on 8081",
        "correct": false,
        "unsafe": true,
        "why": "The LB, firewall and SELinux port labels all expect 8080. You turn a clear fix into an unreviewed config change and leave a rogue listener on production."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm Java owns 8080, the health endpoint returns 200, the user unit is disabled and lingering is off",
        "correct": true,
        "why": "Proves the right process holds the port, the service is healthy, and the conflict will not return at the next boot.",
        "output": "[root@rhel-portal-01 ~]# ss -tlnp \"sport = :8080\"\nState  Recv-Q Send-Q Local Address:Port Peer Address:Port Process\nLISTEN 0      100                *:8080            *:*     users:((\"java\",pid=2533,fd=41))\n[root@rhel-portal-01 ~]# curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost:8080/health\n200\n[root@rhel-portal-01 ~]# systemctl --user -M jsmith@ is-enabled mock-api.service; loginctl show-user jsmith -p Linger\ndisabled\nLinger=no"
      },
      {
        "id": "v2",
        "text": "Run systemctl is-active portal-app",
        "correct": false,
        "why": "Active does not prove it serves traffic on the right port or that the conflict will not recur after the next reboot."
      },
      {
        "id": "v3",
        "text": "curl http://localhost:8080/ and check you get any HTTP response",
        "correct": false,
        "why": "The rogue http.server also answers HTTP. You must hit /health and confirm which PID owns the port."
      }
    ],
    "hints": [
      "A failed unit always has a reason in its journal. Read it.",
      "If a port is in use, ss -tlnp tells you exactly which PID holds it.",
      "If a killed process comes back, find what supervises it: systemctl status <PID> shows its unit and cgroup."
    ],
    "rootCause": "A developer created a **systemd user service** (`mock-api.service`, running `python3 -m http.server 8080`) on the production portal host and enabled **lingering** for his account, so `user@1001.service` and the mock API start at every boot. After the patch reboot the mock API bound `0.0.0.0:8080` at 02:03:58, before `portal-app` finished starting, and the Spring Boot backend failed with `BindException: Address already in use`. The load balancer then received 404s from the mock server on `/health` and returned 502 to customers. `Restart=always` on the user unit meant killing the PID alone did not free the port.",
    "prevention": [
      "Do not allow developer workloads on production hosts; audit for lingering users (ls /var/lib/systemd/linger).",
      "Add a post-reboot smoke test to the patch runbook that checks every service health endpoint, not just unit state.",
      "Baseline listening sockets (ss -tlnp) on production hosts and alert on unexpected listeners.",
      "Grant developers read-only log access through journald groups or central logging instead of shell accounts on production."
    ],
    "tags": [
      "systemd",
      "ports",
      "ss",
      "services",
      "rhcsa"
    ]
  },
  {
    "id": "INC-06",
    "title": "Internal hostnames stop resolving on web tier node",
    "level": 14,
    "topic": "L14-M4-T1",
    "severity": "P2",
    "environment": "rhel-web-04.prod.example.com (10.20.4.14/24, gateway 10.20.4.1), RHEL 9.4, NetworkManager-managed interface ens192, connection profile \"ens192\" using DHCP. Internal DNS servers 10.20.0.10 and 10.20.0.11 (handed out by DHCP) serve the internal.example.com zone.",
    "symptoms": [
      "App log: \"java.net.UnknownHostException: db01.internal.example.com: Name or service not known\"",
      "Only rhel-web-04 is affected; web-03 and web-05 are healthy",
      "Public names (e.g. dnf repositories on cdn.redhat.com) still resolve on the host"
    ],
    "timeline": [
      "2026-10-08 16:40 Engineer troubleshooting slow package downloads on web-04 changes DNS settings \"to test\"",
      "2026-10-08 16:55 Ticket closed: \"dnf faster now\"",
      "2026-10-09 03:00 Nightly app restart; connection pool re-resolves the DB hostname",
      "2026-10-09 03:01 web-04 starts returning HTTP 500 for every request"
    ],
    "actions": [
      {
        "id": "getent",
        "label": "Test name resolution the way applications do",
        "cmd": "getent hosts db01.internal.example.com; getent hosts cdn.redhat.com",
        "key": true,
        "risk": "safe",
        "output": "[root@rhel-web-04 ~]# getent hosts db01.internal.example.com\n[root@rhel-web-04 ~]# echo $?\n2\n[root@rhel-web-04 ~]# getent hosts cdn.redhat.com\n2600:1408:ec00:36::1736:7f31 cdn.redhat.com",
        "note": "Internal names fail (exit 2 = not found) while public names resolve. That points at WHICH resolver is being asked, not at a dead network."
      },
      {
        "id": "resolv",
        "label": "Inspect /etc/resolv.conf",
        "cmd": "cat /etc/resolv.conf",
        "key": true,
        "risk": "safe",
        "output": "# Generated by NetworkManager\nsearch example.com\nnameserver 8.8.8.8\nnameserver 1.1.1.1",
        "note": "The host is using public resolvers that know nothing about internal.example.com. The file is generated by NetworkManager, so the source of truth is the connection profile, not this file."
      },
      {
        "id": "nmcli",
        "label": "Inspect the DNS settings of the connection profile",
        "cmd": "nmcli -f ipv4.dns,ipv4.ignore-auto-dns,IP4.DNS con show ens192",
        "key": true,
        "risk": "safe",
        "requires": [
          "resolv"
        ],
        "output": "ipv4.dns:                               8.8.8.8,1.1.1.1\nipv4.ignore-auto-dns:                   yes\nIP4.DNS[1]:                             8.8.8.8\nIP4.DNS[2]:                             1.1.1.1",
        "note": "Someone set static public DNS servers and ignore-auto-dns=yes, so the internal servers offered by DHCP are discarded. This is persistent in the profile and survives reboots."
      },
      {
        "id": "dig",
        "label": "Query the internal DNS server directly",
        "cmd": "dig +short @10.20.0.10 db01.internal.example.com",
        "key": true,
        "risk": "safe",
        "requires": [
          "getent"
        ],
        "output": "10.20.8.21",
        "note": "The internal DNS server is reachable and answers correctly. The DNS infrastructure is healthy; this host is just not asking it."
      },
      {
        "id": "ping",
        "label": "Ping the database by IP",
        "cmd": "ping -c2 10.20.8.21",
        "key": false,
        "risk": "safe",
        "output": "PING 10.20.8.21 (10.20.8.21) 56(84) bytes of data.\n64 bytes from 10.20.8.21: icmp_seq=1 ttl=63 time=0.412 ms\n64 bytes from 10.20.8.21: icmp_seq=2 ttl=63 time=0.389 ms\n\n--- 10.20.8.21 ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1002ms",
        "note": "Routing to the DB network is fine. This is purely a name resolution problem."
      },
      {
        "id": "nss",
        "label": "Check the NSS host lookup order",
        "cmd": "grep ^hosts /etc/nsswitch.conf",
        "key": false,
        "risk": "safe",
        "output": "hosts:      files dns myhostname",
        "note": "Default and correct: /etc/hosts first, then DNS. Nothing wrong here."
      },
      {
        "id": "history",
        "label": "Look for recent NetworkManager changes",
        "cmd": "journalctl -u NetworkManager --since \"2026-10-08\" | grep -E \"audit: op=\\\"connection-update\\\"|dns\"",
        "key": false,
        "risk": "safe",
        "requires": [
          "nmcli"
        ],
        "output": "Oct 08 16:41:07 rhel-web-04 NetworkManager[1102]: <info>  [1791477667.2210] audit: op=\"connection-update\" uuid=\"5b1c0e3a-41d2-4c39-9a8e-3f0d6d2c7e10\" name=\"ens192\" args=\"ipv4.dns,ipv4.ignore-auto-dns\" pid=88213 uid=0 result=\"success\"\nOct 08 16:41:09 rhel-web-04 NetworkManager[1102]: <info>  [1791477669.0042] dns-mgr: update-dns: updating /etc/resolv.conf",
        "note": "NetworkManager's audit log pins the change to yesterday 16:41, matching the \"test\" during the slow-dnf ticket. Applications kept cached connections until the 03:00 restart."
      },
      {
        "id": "edit",
        "label": "Edit /etc/resolv.conf by hand and make it immutable",
        "cmd": "vi /etc/resolv.conf; chattr +i /etc/resolv.conf",
        "key": false,
        "risk": "caution",
        "output": "[root@rhel-web-04 ~]# lsattr /etc/resolv.conf\n----i----------------- /etc/resolv.conf\n[root@rhel-web-04 ~]# journalctl -u NetworkManager -n1 --no-pager\nOct 09 03:22:41 rhel-web-04 NetworkManager[1102]: <warn>  [1791516161.5531] dns-mgr: could not commit DNS changes: Error replacing file '/etc/resolv.conf': Operation not permitted",
        "note": "Resolution works again, but the profile still says 8.8.8.8, NetworkManager now logs errors, and the next admin will not understand why DNS changes have no effect. Hidden configuration drift."
      },
      {
        "id": "down",
        "label": "Bounce the interface",
        "cmd": "nmcli con down ens192 && nmcli con up ens192",
        "key": false,
        "risk": "destructive",
        "output": "client_loop: send disconnect: Broken pipe",
        "note": "You were connected over ens192: the \"down\" cut your own SSH session and the host is now off the network until someone uses the console. And the profile still has the wrong DNS."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The ens192 connection profile was changed to use public DNS servers (8.8.8.8, 1.1.1.1) with ignore-auto-dns=yes, so the internal zone cannot be resolved",
        "correct": true,
        "why": "resolv.conf and nmcli show only public resolvers with ignore-auto-dns=yes, the internal server answers correctly when queried directly, and the NM audit log shows the change at 16:41 yesterday."
      },
      {
        "id": "c2",
        "text": "The internal DNS servers are down",
        "correct": false,
        "why": "dig @10.20.0.10 returns the correct address, and web-03/web-05 resolve fine."
      },
      {
        "id": "c3",
        "text": "The network route to the database subnet is broken",
        "correct": false,
        "why": "ping 10.20.8.21 succeeds with 0% loss."
      },
      {
        "id": "c4",
        "text": "/etc/nsswitch.conf no longer consults DNS",
        "correct": false,
        "why": "nsswitch.conf has \"files dns myhostname\", and public names resolve via DNS."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Restore the profile: nmcli con mod ens192 ipv4.dns \"\" ipv4.ignore-auto-dns no; then nmcli dev reapply ens192 (no link bounce), restart the application, and record the change",
        "correct": true,
        "why": "Fixes the persistent source of truth so DHCP-provided internal resolvers return, without dropping the link or fighting NetworkManager."
      },
      {
        "id": "f2",
        "text": "Hand-edit /etc/resolv.conf and chattr +i it",
        "correct": false,
        "unsafe": true,
        "why": "Works today but hides the wrong profile, breaks NetworkManager DNS management and creates drift that will confuse the next incident."
      },
      {
        "id": "f3",
        "text": "Add db01.internal.example.com and every other internal host to /etc/hosts",
        "correct": false,
        "unsafe": true,
        "why": "Static entries silently go stale when IPs change (failover, migrations), and you will miss names you did not think of."
      },
      {
        "id": "f4",
        "text": "Restart the application so it retries the lookup",
        "correct": false,
        "why": "The resolver configuration is still wrong, so the lookup fails again."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm the profile and resolv.conf list the internal resolvers, internal and external names resolve via getent, and the app is healthy",
        "correct": true,
        "why": "Validates the persistent config, the effective config, the resolution path applications use, and the user-facing symptom.",
        "output": "[root@rhel-web-04 ~]# nmcli -f ipv4.ignore-auto-dns,IP4.DNS con show ens192\nipv4.ignore-auto-dns:                   no\nIP4.DNS[1]:                             10.20.0.10\nIP4.DNS[2]:                             10.20.0.11\n[root@rhel-web-04 ~]# getent hosts db01.internal.example.com\n10.20.8.21      db01.internal.example.com\n[root@rhel-web-04 ~]# curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost/health\n200"
      },
      {
        "id": "v2",
        "text": "Run dig @10.20.0.10 db01.internal.example.com",
        "correct": false,
        "why": "That worked during the outage too; querying a server explicitly bypasses the host's resolver configuration."
      },
      {
        "id": "v3",
        "text": "Ping google.com",
        "correct": false,
        "why": "Public names resolved throughout the incident."
      }
    ],
    "hints": [
      "Compare an internal name with a public name. What does the difference tell you?",
      "Which servers is this host actually asking? And who writes that file?",
      "On RHEL, fix DNS in the NetworkManager profile, not in /etc/resolv.conf."
    ],
    "rootCause": "While troubleshooting slow package downloads, an engineer ran `nmcli con mod ens192 ipv4.dns \"8.8.8.8 1.1.1.1\" ipv4.ignore-auto-dns yes` on rhel-web-04 and never reverted it. NetworkManager regenerated `/etc/resolv.conf` with only public resolvers, which cannot answer for the internal `internal.example.com` zone. Existing database connections masked the problem until the nightly 03:00 application restart forced a fresh lookup of `db01.internal.example.com`, which failed with UnknownHostException. The change was persistent and undocumented, and no monitoring checked internal name resolution per host.",
    "prevention": [
      "Manage DNS settings through configuration management so ad-hoc nmcli changes are detected and reverted.",
      "Add a synthetic per-host check that resolves a critical internal name via getent.",
      "Require test changes made during troubleshooting to be reverted and noted in the ticket before closure.",
      "Teach that /etc/resolv.conf on RHEL is generated by NetworkManager - change the profile, not the file."
    ],
    "tags": [
      "dns",
      "networkmanager",
      "nmcli",
      "networking",
      "rhcsa"
    ]
  },
  {
    "id": "INC-07",
    "title": "SSH connection refused on rebuilt bastion host",
    "level": 14,
    "topic": "L14-M4-T2",
    "severity": "P2",
    "environment": "rhel-bastion-02.corp.example.com (10.30.1.12), RHEL 9.4 VM, rebuilt from template yesterday. Its original SSH host keys were restored from backup so that admins would not see host-key-changed warnings. Console access via the vSphere web console.",
    "symptoms": [
      "Admins: \"ssh: connect to host rhel-bastion-02 port 22: Connection refused\"",
      "Automation jobs that hop through the bastion are failing",
      "Host responds to ping and its monitoring agent reports \"up\""
    ],
    "timeline": [
      "2026-10-08 14:00 rhel-bastion-02 rebuilt from the RHEL 9.4 template",
      "2026-10-08 15:10 Junior admin copies the original host keys back from the backup share and, after a \"permission denied\" while copying, runs chmod -R 644 /etc/ssh",
      "2026-10-08 15:12 Junior admin runs \"systemctl restart sshd\" from the console; does not check the result",
      "2026-10-09 07:30 First admin of the day cannot log in; ticket raised"
    ],
    "actions": [
      {
        "id": "client",
        "label": "Test from a client with verbose output",
        "cmd": "ssh -v admin@rhel-bastion-02",
        "key": false,
        "risk": "safe",
        "output": "OpenSSH_8.7p1, OpenSSL 3.0.7 1 Nov 2022\ndebug1: Reading configuration data /etc/ssh/ssh_config\ndebug1: Connecting to rhel-bastion-02 [10.30.1.12] port 22.\ndebug1: connect to address 10.30.1.12 port 22: Connection refused\nssh: connect to host rhel-bastion-02 port 22: Connection refused",
        "note": "\"Connection refused\" means a TCP RST: the host is reachable but nothing listens on 22 (a firewall drop would normally time out, or reject with \"No route to host\")."
      },
      {
        "id": "ping",
        "label": "Ping the bastion",
        "cmd": "ping -c2 10.30.1.12",
        "key": false,
        "risk": "safe",
        "output": "64 bytes from 10.30.1.12: icmp_seq=1 ttl=64 time=0.522 ms\n64 bytes from 10.30.1.12: icmp_seq=2 ttl=64 time=0.497 ms",
        "note": "The network path is fine. Focus on the service."
      },
      {
        "id": "ss",
        "label": "On the console: check for a listener on port 22",
        "cmd": "ss -tlnp \"sport = :22\"",
        "key": true,
        "risk": "safe",
        "output": "State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process",
        "note": "Nothing is listening on port 22. sshd is not running."
      },
      {
        "id": "status",
        "label": "On the console: check sshd status and logs",
        "cmd": "systemctl status sshd --no-pager; journalctl -u sshd -b --no-pager | tail -8",
        "key": true,
        "risk": "safe",
        "requires": [
          "ss"
        ],
        "output": "× sshd.service - OpenSSH server daemon\n     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)\n     Active: failed (Result: exit-code) since Thu 2026-10-08 15:12:06 UTC; 16h ago\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: @         WARNING: UNPROTECTED PRIVATE KEY FILE!          @\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Permissions 0644 for '/etc/ssh/ssh_host_rsa_key' are too open.\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Unable to load host key: /etc/ssh/ssh_host_rsa_key\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Permissions 0644 for '/etc/ssh/ssh_host_ecdsa_key' are too open.\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Unable to load host key: /etc/ssh/ssh_host_ecdsa_key\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Permissions 0644 for '/etc/ssh/ssh_host_ed25519_key' are too open.\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: Unable to load host key: /etc/ssh/ssh_host_ed25519_key\nOct 08 15:12:06 rhel-bastion-02 sshd[2311]: sshd: no hostkeys available -- exiting.",
        "note": "sshd refuses world-readable private host keys. With all three keys rejected it has no host key at all and exits. It has been down since 15:12 yesterday."
      },
      {
        "id": "perms",
        "label": "On the console: list host key permissions and SELinux labels",
        "cmd": "ls -lZ /etc/ssh/ssh_host_*",
        "key": true,
        "risk": "safe",
        "requires": [
          "status"
        ],
        "output": "-rw-r--r--. 1 root root system_u:object_r:sshd_key_t:s0          492 Oct  8 15:10 /etc/ssh/ssh_host_ecdsa_key\n-rw-r--r--. 1 root root system_u:object_r:sshd_key_t:s0          162 Oct  8 15:10 /etc/ssh/ssh_host_ecdsa_key.pub\n-rw-r--r--. 1 root root unconfined_u:object_r:etc_t:s0          399 Oct  8 15:10 /etc/ssh/ssh_host_ed25519_key\n-rw-r--r--. 1 root root unconfined_u:object_r:etc_t:s0           82 Oct  8 15:10 /etc/ssh/ssh_host_ed25519_key.pub\n-rw-r--r--. 1 root root system_u:object_r:sshd_key_t:s0         2578 Oct  8 15:10 /etc/ssh/ssh_host_rsa_key\n-rw-r--r--. 1 root root system_u:object_r:sshd_key_t:s0          554 Oct  8 15:10 /etc/ssh/ssh_host_rsa_key.pub",
        "note": "All private keys are 0644 (RHEL 9 expects 0600 root:root). The ed25519 pair, copied fresh from the share, also carries etc_t instead of sshd_key_t - fix both permissions and labels."
      },
      {
        "id": "sshdt",
        "label": "On the console: test the sshd configuration",
        "cmd": "sshd -t; echo rc=$?",
        "key": false,
        "risk": "safe",
        "requires": [
          "status"
        ],
        "output": "Permissions 0644 for '/etc/ssh/ssh_host_rsa_key' are too open.\n...\nsshd: no hostkeys available -- exiting.\nrc=1",
        "note": "sshd -t confirms the configuration file itself is fine; only the host keys fail validation."
      },
      {
        "id": "fw",
        "label": "On the console: check firewalld",
        "cmd": "firewall-cmd --list-services",
        "key": false,
        "risk": "safe",
        "output": "cockpit dhcpv6-client ssh",
        "note": "ssh is allowed. The firewall is not the problem."
      },
      {
        "id": "regen",
        "label": "On the console: delete and regenerate all host keys",
        "cmd": "rm -f /etc/ssh/ssh_host_*; systemctl restart sshd",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-bastion-02 ~]# systemctl restart sshd\n[root@rhel-bastion-02 ~]# ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub\n256 SHA256:Jw0qJ2v6Wn1xTqgk8bq0j3x6pP5mKqz5o7fVZr4c1aE root@rhel-bastion-02 (ED25519)",
        "note": "sshd-keygen created new keys, so SSH works again - but the bastion's identity changed. Every admin and automation job now gets \"REMOTE HOST IDENTIFICATION HAS CHANGED\", which is exactly what restoring the keys was meant to avoid, and it trains people to click through MITM warnings."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The restored SSH private host keys were made world-readable (chmod -R 644 /etc/ssh), so sshd rejected every host key and exited; nothing listens on port 22",
        "correct": true,
        "why": "ss shows no listener, the sshd journal shows \"Permissions 0644 ... are too open\" for every key followed by \"no hostkeys available -- exiting\", and ls confirms 0644 on all private keys."
      },
      {
        "id": "c2",
        "text": "firewalld blocks port 22 on the rebuilt host",
        "correct": false,
        "why": "The ssh service is allowed, and the client got a TCP refusal because nothing listens on 22."
      },
      {
        "id": "c3",
        "text": "A syntax error in sshd_config",
        "correct": false,
        "why": "sshd -t reports only host key permission errors, not configuration errors."
      },
      {
        "id": "c4",
        "text": "The admins' known_hosts entries are stale after the rebuild",
        "correct": false,
        "why": "A host key mismatch produces a warning after the TCP connection is established; here the TCP connection itself is refused."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Restore correct modes and labels: chmod 0600 /etc/ssh/ssh_host_*_key; chmod 0644 /etc/ssh/ssh_host_*_key.pub; chmod 0600 /etc/ssh/sshd_config; restorecon -Rv /etc/ssh; then sshd -t and systemctl restart sshd",
        "correct": true,
        "why": "Gives sshd its original, now-protected keys back, so the service starts and clients see the same fingerprints as before the rebuild."
      },
      {
        "id": "f2",
        "text": "Delete the keys, let sshd-keygen regenerate them, and tell everyone to run ssh-keygen -R rhel-bastion-02",
        "correct": false,
        "unsafe": true,
        "why": "Changes the bastion identity and normalises ignoring host-key warnings - the control that protects against MITM attacks."
      },
      {
        "id": "f3",
        "text": "chmod -R 777 /etc/ssh so permission errors go away",
        "correct": false,
        "unsafe": true,
        "why": "sshd rejects group/world-accessible private keys even more firmly, and every local user could read or replace the host keys."
      },
      {
        "id": "f4",
        "text": "Reboot the VM",
        "correct": false,
        "why": "sshd fails with the same key permission errors at boot."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm sshd is active and listening, keys are 0600 with sshd_key_t, and a client connects with the original fingerprint",
        "correct": true,
        "why": "Proves the service runs, the keys are protected, and clients see the same identity as before the rebuild.",
        "output": "[root@rhel-bastion-02 ~]# systemctl is-active sshd; ss -tlnp \"sport = :22\" | tail -1\nactive\nLISTEN 0      128          0.0.0.0:22        0.0.0.0:*     users:((\"sshd\",pid=48120,fd=3))\n[root@rhel-bastion-02 ~]# stat -c \"%a %U %n\" /etc/ssh/ssh_host_*_key; ls -Z /etc/ssh/ssh_host_ed25519_key\n600 root /etc/ssh/ssh_host_ecdsa_key\n600 root /etc/ssh/ssh_host_ed25519_key\n600 root /etc/ssh/ssh_host_rsa_key\nsystem_u:object_r:sshd_key_t:s0 /etc/ssh/ssh_host_ed25519_key\n[admin@workstation ~]$ ssh admin@rhel-bastion-02 hostname\nrhel-bastion-02.corp.example.com"
      },
      {
        "id": "v2",
        "text": "Ping the bastion",
        "correct": false,
        "why": "Ping worked throughout the incident."
      },
      {
        "id": "v3",
        "text": "Run systemctl restart sshd and see no error printed",
        "correct": false,
        "why": "systemctl restart printed nothing yesterday either; you must check the resulting state and connect."
      }
    ],
    "hints": [
      "\"Connection refused\" means the packet reached the host. Is anything listening on 22?",
      "When a unit has failed, its journal explains why - read it from the console.",
      "sshd is strict about who can read its private keys. Check modes and SELinux labels."
    ],
    "rootCause": "After rebuilding rhel-bastion-02, an admin restored the original SSH host keys from backup and then ran `chmod -R 644 /etc/ssh` to get past a copy error. OpenSSH refuses to use private host keys that are group or world readable, so on the 15:12 restart sshd logged **\"Permissions 0644 ... are too open\"** for every key, concluded \"no hostkeys available\" and exited. Because the restart was done without checking its result, the bastion silently had no SSH listener for 16 hours, and clients got `Connection refused`. The restored ed25519 key also carried the wrong SELinux label (`etc_t`).",
    "prevention": [
      "Restore files with tools that preserve modes and labels (tar --xattrs --selinux -p, rsync -aAX), then run restorecon.",
      "Always verify after a restart: systemctl is-active / ss -tlnp, and test a login from a second session before closing the console.",
      "Monitor the SSH port and service state on bastions with alerting.",
      "Keep host keys in a secrets store and deploy them with explicit mode 0600 via configuration management."
    ],
    "tags": [
      "ssh",
      "sshd",
      "permissions",
      "selinux",
      "rhcsa"
    ]
  },
  {
    "id": "INC-08",
    "title": "New website release returns 403 for CSS and JS assets",
    "level": 14,
    "topic": "L14-M5-T1",
    "severity": "P2",
    "environment": "rhel-www-01.prod.example.com, RHEL 9.4, Apache httpd 2.4 serving /var/www/html, SELinux enforcing (targeted). Releases are staged by user \"deploy\" in /home/deploy/releases/ and installed by a shell script.",
    "symptoms": [
      "Marketing site loads without styling; browser console shows 403 Forbidden for /assets/app.css and /assets/app.js",
      "Pages that existed before the release work; only files added in release 2026.10 fail",
      "Synthetic check for /assets/app.css failing since 11:02"
    ],
    "timeline": [
      "2026-10-09 10:30 deploy user stages release 2026.10 in /home/deploy/releases/2026.10",
      "2026-10-09 11:01 New release script (rewritten last week to be \"faster\") installs the release",
      "2026-10-09 11:02 Synthetic monitoring reports 403 on /assets/app.css"
    ],
    "actions": [
      {
        "id": "curl",
        "label": "Reproduce the error",
        "cmd": "curl -sI http://localhost/assets/app.css | head -1; curl -sI http://localhost/index.html | head -1",
        "key": false,
        "risk": "safe",
        "output": "HTTP/1.1 403 Forbidden\nHTTP/1.1 200 OK",
        "note": "Old files serve fine, new ones are forbidden. Something about the new files differs."
      },
      {
        "id": "errlog",
        "label": "Read the Apache error log",
        "cmd": "tail -3 /var/log/httpd/error_log",
        "key": false,
        "risk": "safe",
        "output": "[Fri Oct 09 11:14:22.481920 2026] [core:error] [pid 30215:tid 30311] (13)Permission denied: [client 10.20.4.30:51122] AH00132: file permissions deny server access: /var/www/html/assets/app.css\n[Fri Oct 09 11:14:22.512004 2026] [core:error] [pid 30215:tid 30312] (13)Permission denied: [client 10.20.4.30:51122] AH00132: file permissions deny server access: /var/www/html/assets/app.js",
        "note": "EACCES (13) when httpd opens the file. That can be classic DAC permissions or SELinux - check both."
      },
      {
        "id": "ls",
        "label": "Check classic permissions on the new files",
        "cmd": "ls -l /var/www/html/assets/ | head -4; namei -m /var/www/html/assets/app.css",
        "key": false,
        "risk": "safe",
        "output": "total 412\n-rw-r--r--. 1 deploy deploy 188412 Oct  9 10:30 app.css\n-rw-r--r--. 1 deploy deploy 231907 Oct  9 10:30 app.js\n-rw-r--r--. 1 root   root     5120 Jun 12 09:15 favicon.ico\nf: /var/www/html/assets/app.css\n dr-xr-xr-x /\n drwxr-xr-x var\n drwxr-xr-x www\n drwxr-xr-x html\n drwxr-xr-x assets\n -rw-r--r-- app.css",
        "note": "Every directory is traversable and the file is world-readable. DAC permissions are not the problem - so look at the other access control layer."
      },
      {
        "id": "lsz",
        "label": "Check SELinux contexts of old and new files",
        "cmd": "ls -Z /var/www/html/assets/",
        "key": true,
        "risk": "safe",
        "output": "unconfined_u:object_r:user_home_t:s0 app.css\nunconfined_u:object_r:user_home_t:s0 app.js\nsystem_u:object_r:httpd_sys_content_t:s0 favicon.ico",
        "note": "The new files carry user_home_t - the label of files in /home. The working favicon carries httpd_sys_content_t. mv preserves the source label; cp creates a new file that inherits the destination label."
      },
      {
        "id": "avc",
        "label": "Search the audit log for AVC denials",
        "cmd": "ausearch -m AVC -ts today -c httpd | tail -4",
        "key": true,
        "risk": "safe",
        "output": "----\ntime->Fri Oct  9 11:14:22 2026\ntype=AVC msg=audit(1791544462.481:8812): avc:  denied  { read } for  pid=30215 comm=\"httpd\" name=\"app.css\" dev=\"dm-0\" ino=3412870 scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file permissive=0",
        "note": "Definitive: SELinux denied httpd_t reading a user_home_t file. permissive=0 means enforcing - the access was blocked."
      },
      {
        "id": "script",
        "label": "Inspect the release script",
        "cmd": "grep -nE \"cp|mv|rsync|restorecon\" /usr/local/bin/release-www.sh",
        "key": true,
        "risk": "safe",
        "requires": [
          "lsz"
        ],
        "output": "14:# was: cp -a ... (too slow for big releases)\n15:mv /home/deploy/releases/\"$REL\"/* /var/www/html/",
        "note": "The script was changed from cp to mv. mv within the same filesystem renames the inode and keeps its user_home_t label, and no restorecon follows."
      },
      {
        "id": "matchpath",
        "label": "Check what the label should be",
        "cmd": "matchpathcon /var/www/html/assets/app.css",
        "key": false,
        "risk": "safe",
        "requires": [
          "lsz"
        ],
        "output": "/var/www/html/assets/app.css\tsystem_u:object_r:httpd_sys_content_t:s0",
        "note": "The policy's file-context rules say this path should be httpd_sys_content_t. restorecon will apply exactly this."
      },
      {
        "id": "getenforce",
        "label": "Check the SELinux mode",
        "cmd": "getenforce",
        "key": false,
        "risk": "safe",
        "output": "Enforcing",
        "note": "Enforcing, as required by the hardening baseline. It has been enforcing for years; the release is what changed."
      },
      {
        "id": "httpdconf",
        "label": "Check httpd config syntax",
        "cmd": "apachectl configtest",
        "key": false,
        "risk": "safe",
        "output": "Syntax OK",
        "note": "The Apache configuration is fine."
      },
      {
        "id": "chmod777",
        "label": "chmod -R 777 the web root",
        "cmd": "chmod -R 777 /var/www/html",
        "key": false,
        "risk": "destructive",
        "output": "[root@rhel-www-01 ~]# curl -sI http://localhost/assets/app.css | head -1\nHTTP/1.1 403 Forbidden",
        "note": "Still 403 - DAC was never the problem. Worse, the entire public web root is now world-writable: any compromised local process can deface the site. You must now restore correct modes as well."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The release script now uses mv from /home, so the new files kept the user_home_t SELinux label and httpd (httpd_t) is denied read access",
        "correct": true,
        "why": "Permissions are world-readable, ls -Z shows user_home_t on only the new files, ausearch shows the AVC denial for httpd_t on user_home_t, and the script history shows cp replaced by mv."
      },
      {
        "id": "c2",
        "text": "The new files have wrong Unix permissions or ownership",
        "correct": false,
        "why": "namei shows the path traversable and the files 0644; owner deploy does not matter for a world-readable file."
      },
      {
        "id": "c3",
        "text": "Someone switched SELinux to enforcing during the release",
        "correct": false,
        "why": "The host has always been enforcing; old files are served fine under the same mode."
      },
      {
        "id": "c4",
        "text": "An Apache <Directory> rule denies the /assets path",
        "correct": false,
        "why": "favicon.ico in the same directory is served, and the error is EACCES at file open, not an authz rule."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Run restorecon -Rv /var/www/html to apply the policy labels, then change the release script to copy (rsync -a / cp) and always finish with restorecon",
        "correct": true,
        "why": "Applies the correct httpd_sys_content_t label defined by policy and prevents recurrence without weakening SELinux."
      },
      {
        "id": "f2",
        "text": "setenforce 0 and set SELINUX=permissive in /etc/selinux/config",
        "correct": false,
        "unsafe": true,
        "why": "Removes mandatory access control from an internet-facing web server to work around a labelling mistake."
      },
      {
        "id": "f3",
        "text": "chcon -R -t httpd_sys_rw_content_t /var/www/html",
        "correct": false,
        "unsafe": true,
        "why": "Grants httpd WRITE access to the whole site, and chcon labels are lost on the next relabel anyway."
      },
      {
        "id": "f4",
        "text": "setsebool -P httpd_can_network_connect on",
        "correct": false,
        "why": "That boolean controls outbound network connections from httpd; it does nothing for file reads."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Confirm labels match policy, assets return 200, and no new AVC denials appear",
        "correct": true,
        "why": "Checks the cause (labels), the symptom (HTTP status) and that SELinux is still enforcing with no new denials.",
        "output": "[root@rhel-www-01 ~]# ls -Z /var/www/html/assets/app.css\nsystem_u:object_r:httpd_sys_content_t:s0 /var/www/html/assets/app.css\n[root@rhel-www-01 ~]# curl -sI http://localhost/assets/app.css | head -1\nHTTP/1.1 200 OK\n[root@rhel-www-01 ~]# getenforce; ausearch -m AVC -ts recent -c httpd\nEnforcing\n<no matches>"
      },
      {
        "id": "v2",
        "text": "Load the homepage in a browser",
        "correct": false,
        "why": "The homepage HTML loaded during the incident; you need to check the assets that were failing."
      },
      {
        "id": "v3",
        "text": "Run ls -l /var/www/html/assets",
        "correct": false,
        "why": "DAC permissions were never wrong; ls -l cannot show SELinux labels."
      }
    ],
    "hints": [
      "Old files work, new files fail. Compare the two in every way you can.",
      "Permission denied with correct rwx bits means another access control layer is involved.",
      "mv keeps a file's SELinux label; cp gives it the label of its new home."
    ],
    "rootCause": "The release script was \"optimised\" by replacing `cp -a` with `mv` from `/home/deploy/releases/` into `/var/www/html`. On the same filesystem `mv` renames the inode and **preserves its SELinux label**, so the new assets kept `user_home_t`. SELinux policy does not allow `httpd_t` to read `user_home_t`, so httpd received EACCES and returned 403 even though Unix permissions were correct. Files from earlier releases kept their correct `httpd_sys_content_t` label, which is why only new assets failed.",
    "prevention": [
      "Deploy with cp/rsync (not mv from /home) and always run restorecon -R on the target afterwards.",
      "Add an \"ausearch -m AVC -ts recent\" check to the release pipeline's post-deploy verification.",
      "Use a dedicated staging directory under /var/www with the right file-context, or define one with semanage fcontext.",
      "Peer-review changes to deployment scripts, including SELinux implications."
    ],
    "tags": [
      "selinux",
      "httpd",
      "restorecon",
      "permissions",
      "rhcsa"
    ]
  },
  {
    "id": "INC-09",
    "title": "PostgreSQL database cannot write: Disk I/O degradation and full sync latency",
    "level": 14,
    "topic": "L14-M3-T1",
    "severity": "P1",
    "environment": "rhel-db-01.prod.example.com, RHEL 9.3, PostgreSQL 16 on dedicated NVMe volume vg_data/lv_pgdata mounted at /var/lib/pgsql/data.",
    "symptoms": [
      "App pool connections exhausting; checkout transactions timing out (>30s)",
      "Postgres logs: \"checkpoint request waking up too frequently\"",
      "Load average spiked from 1.2 to 28.0 with low %CPU usage"
    ],
    "timeline": [
      "2026-10-09 03:00 Automated batch reporting script started",
      "2026-10-09 03:15 Application connection pool alerts triggered",
      "2026-10-09 03:22 On-call database reliability engineer paged"
    ],
    "actions": [
      {
        "id": "top",
        "label": "Check CPU and Load Average",
        "cmd": "top -b -n 1 | head -15",
        "key": true,
        "risk": "safe",
        "output": "top - 03:25:01 up 12 days,  4:10,  2 users,  load average: 28.40, 24.12, 18.05\nTasks: 312 total,   2 running, 310 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  2.1 us,  1.4 sy,  0.0 ni,  8.2 id, 88.1 wa,  0.0 hi,  0.2 si,  0.0 st\nMiB Mem :  64120.0 total,  12400.0 free,  48200.0 used,   3520.0 buff/cache",
        "note": "%wa (I/O wait) is at 88.1%, indicating processes are blocked waiting on disk hardware or controller response."
      },
      {
        "id": "iostat",
        "label": "Inspect per-device I/O utilization",
        "cmd": "iostat -xz 1 3",
        "key": true,
        "risk": "safe",
        "requires": [
          "top"
        ],
        "output": "Device            r/s     w/s     rkB/s     wkB/s   rrqm/s   wrqm/s  %rrqm  %wrqm  r_await w_await aqu-sz  %util\nnvme0n1          0.00    0.00      0.00      0.00     0.00     0.00   0.00   0.00     0.00    0.00   0.00   0.00\nnvme1n1         42.00 1280.00    210.00 182400.00     0.00   450.00   0.00  26.01     8.20  245.10  32.10 100.00",
        "note": "nvme1n1 (the pgdata disk) is 100% utilized with write await times exceeding 240ms."
      },
      {
        "id": "iotop",
        "label": "Identify process dominating disk writes",
        "cmd": "iotop -b -n 1 -o | head -10",
        "key": true,
        "risk": "safe",
        "requires": [
          "iostat"
        ],
        "output": "Total DISK READ: 0.00 B/s | Total DISK WRITE: 180.25 M/s\n  TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN      IO>    COMMAND\n 4812 be/4 postgres    0.00 B/s  178.40 M/s  0.00 %  98.12 % psql -f /opt/scripts/export_all_audit.sql",
        "note": "A rogue unindexed audit dump script running as postgres is writing unbuffered dumps directly to the transactional SSD volume."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "An ad-hoc bulk export script dumped 180MB/s of sequential writes onto the primary transactional database volume without I/O throttling",
        "correct": true,
        "why": "iotop identified PID 4812 running export_all_audit.sql, driving nvme1n1 to 100% %util and starving PostgreSQL WAL checkpoints."
      },
      {
        "id": "c2",
        "text": "Hardware failure on NVMe controller requiring reboot",
        "correct": false,
        "why": "The NVMe disk is responding and writes are completing, but queue depth is saturated by the export query."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Terminate PID 4812 using pg_cancel_backend / kill -15, adjust script to write to remote NFS or use ionice, and re-run during maintenance window",
        "correct": true,
        "why": "Gracefully terminates the rogue export to restore database responsiveness immediately."
      },
      {
        "id": "f2",
        "text": "Reboot the database host with systemctl reboot",
        "correct": false,
        "unsafe": true,
        "why": "Rebooting during high transaction volume risks crash recovery, extended downtime, and uncommitted data loss."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Verify %util drops below 20% on nvme1n1 and application checkout transactions succeed",
        "correct": true,
        "why": "Directly validates both the hardware queue metric and end-user business traffic recovery."
      }
    ],
    "hints": [
      "Check CPU wait time (%wa) first, then look at iostat await and %util."
    ],
    "rootCause": "Batch export query ran without I/O limits on the primary OLTP volume, causing WAL sync bottlenecks.",
    "prevention": [
      "Run large reporting queries on read replicas with dedicated disks.",
      "Implement cgroups blkio write limits on background jobs."
    ],
    "tags": [
      "storage",
      "iostat",
      "iotop",
      "postgresql",
      "performance"
    ]
  },
  {
    "id": "INC-10",
    "title": "Kernel Panic on boot after custom kernel update",
    "level": 14,
    "topic": "L14-M2-T1",
    "severity": "P1",
    "environment": "rhel-node-04.infra.example.com, RHEL 8.9 bare metal HPE ProLiant DL380. Booting into newly deployed enterprise kernel.",
    "symptoms": [
      "Server dropped offline during automated kernel patching window",
      "iLO virtual console shows: \"Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)\""
    ],
    "timeline": [
      "2026-10-09 01:00 dnf update -y kernel executed via Ansible",
      "2026-10-09 01:05 Node rebooted",
      "2026-10-09 01:06 Node unresponsive on network; iLO alert triggered"
    ],
    "actions": [
      {
        "id": "console",
        "label": "Inspect iLO Virtual Console",
        "cmd": "ilo_console view",
        "key": true,
        "risk": "safe",
        "output": "[    1.821040] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)\n[    1.821090] CPU: 0 PID: 1 Comm: swapper/0 Not tainted 4.18.0-513.5.1.el8_9.x86_64 #1\n[    1.821120] Call Trace:\n[    1.821140]  dump_stack+0x5c/0x80\n[    1.821160]  panic+0xe7/0x2a9",
        "note": "Kernel panic occurs because the initramfs image was either missing or failed to contain the required storage controller modules."
      },
      {
        "id": "grub_list",
        "label": "Access GRUB2 menu via console reboot",
        "cmd": "grub2 menu entries",
        "key": true,
        "risk": "safe",
        "requires": [
          "console"
        ],
        "output": "* Red Hat Enterprise Linux (4.18.0-513.5.1.el8_9.x86_64) 8.9 (Ootpa)\n  Red Hat Enterprise Linux (4.18.0-477.10.1.el8_8.x86_64) 8.8 (Ootpa)\n  Red Hat Enterprise Linux (0-rescue-4a8b...)",
        "note": "The prior working kernel 4.18.0-477.10.1 is available in GRUB menu."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The newly installed kernel failed to generate a complete initramfs with the HPE Smart Array driver during the update, preventing root mount",
        "correct": true,
        "why": "The panic message \"Unable to mount root fs\" points directly to missing initramfs driver modules."
      },
      {
        "id": "c2",
        "text": "The physical RAID disk controller died",
        "correct": false,
        "why": "Hardware iLO reports healthy controller and earlier kernel options exist in GRUB."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Select previous kernel in GRUB to boot, then rebuild the initramfs for the new kernel using dracut --kver 4.18.0-513.5.1.el8_9.x86_64 --force",
        "correct": true,
        "why": "Recovers access using known-good kernel and fixes the underlying corrupt initramfs image."
      },
      {
        "id": "f2",
        "text": "Reinstall the operating system from PXE",
        "correct": false,
        "unsafe": true,
        "why": "Unnecessary destruction of system configuration when older kernel works fine."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Verify system boots cleanly into new kernel and lsblk shows root mounted",
        "correct": true,
        "why": "Confirms initramfs rebuild succeeded."
      }
    ],
    "hints": [
      "Always check if the server can boot into the previous kernel version from the GRUB bootloader."
    ],
    "rootCause": "Incomplete dracut execution during yum/dnf transaction created a truncated initramfs image.",
    "prevention": [
      "Verify /boot/initramfs file sizes and test boot before leaving maintenance window."
    ],
    "tags": [
      "boot",
      "grub",
      "dracut",
      "kernel",
      "panic"
    ]
  },
  {
    "id": "INC-11",
    "title": "DNS Resolution intermittent failure across container cluster",
    "level": 14,
    "topic": "L14-M4-T1",
    "severity": "P2",
    "environment": "rhel-k8s-node-03.prod.example.com, RHEL 9.2, CoreDNS forwarding queries to internal DNS servers 10.10.0.10 and 10.10.0.11.",
    "symptoms": [
      "Microservices fail communicating with external payment API (\"curl: (6) Could not resolve host\")",
      "DNS query latency spiking to exactly 5000ms before returning SERVFAIL"
    ],
    "timeline": [
      "2026-10-09 10:15 Automated firewall rule push across core network",
      "2026-10-09 10:18 Payments team reports API handshake timeouts"
    ],
    "actions": [
      {
        "id": "resolv",
        "label": "Inspect /etc/resolv.conf",
        "cmd": "cat /etc/resolv.conf",
        "key": true,
        "risk": "safe",
        "output": "nameserver 10.10.0.10\nnameserver 10.10.0.11\noptions timeout:2 attempts:2",
        "note": "Two nameservers are configured with standard timeout options."
      },
      {
        "id": "dig1",
        "label": "Query primary nameserver directly",
        "cmd": "dig @10.10.0.10 api.payment.com +time=2",
        "key": true,
        "risk": "safe",
        "requires": [
          "resolv"
        ],
        "output": ";; connection timed out; no servers could be reached",
        "note": "Primary nameserver 10.10.0.10 is completely unresponsive over UDP port 53."
      },
      {
        "id": "dig2",
        "label": "Query secondary nameserver directly",
        "cmd": "dig @10.10.0.11 api.payment.com +time=2",
        "key": true,
        "risk": "safe",
        "requires": [
          "resolv"
        ],
        "output": ";; ANSWER SECTION:\napi.payment.com.   300 IN  A  198.51.100.42\n;; Query time: 1 msec",
        "note": "Secondary DNS server 10.10.0.11 responds in 1ms with valid record."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Primary DNS server 10.10.0.10 is unreachable on port 53, causing a 5-second timeout on every request before falling back to 10.10.0.11",
        "correct": true,
        "why": "Linux resolver queries sequentially by default; an unresponsive primary server adds full timeout latency to every query."
      },
      {
        "id": "c2",
        "text": "The target domain api.payment.com has expired",
        "correct": false,
        "why": "Secondary nameserver returned valid answer in 1ms."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Update /etc/resolv.conf to prioritize working DNS 10.10.0.11 and add \"options rotate\" while investigating network link to 10.10.0.10",
        "correct": true,
        "why": "Restores instant query responses and mitigates sequential stalls."
      },
      {
        "id": "f2",
        "text": "Disable NetworkManager service permanently",
        "correct": false,
        "unsafe": true,
        "why": "Disabling NetworkManager does not fix the unresponsive upstream DNS server."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run dig api.payment.com and verify query time is under 5ms",
        "correct": true,
        "why": "Confirms DNS resolution latency is restored."
      }
    ],
    "hints": [
      "Check query latency with dig against each configured nameserver individually."
    ],
    "rootCause": "Primary nameserver dropped UDP traffic, causing sequential resolution timeout latency.",
    "prevention": [
      "Use local caching daemons (systemd-resolved / dnsmasq) and monitor upstream DNS health."
    ],
    "tags": [
      "dns",
      "dig",
      "network",
      "resolv.conf"
    ]
  },
  {
    "id": "INC-12",
    "title": "Cron backup job fails with \"Permission Denied\" on NFS mount",
    "level": 14,
    "topic": "L14-M3-T2",
    "severity": "P2",
    "environment": "rhel-backup-01.mgmt.example.com, RHEL 9.4. Mounting /mnt/nfs_backup from TrueNAS storage array.",
    "symptoms": [
      "Nightly backup script fails writing tar archive to /mnt/nfs_backup/nightly/",
      "Manual root command: \"touch /mnt/nfs_backup/test\" returns \"touch: cannot touch '/mnt/nfs_backup/test': Permission denied\""
    ],
    "timeline": [
      "2026-10-09 02:00 Backup cron triggers",
      "2026-10-09 02:01 Cron sends failure email: Permission denied",
      "2026-10-09 08:30 Admin investigates"
    ],
    "actions": [
      {
        "id": "nfs_mount",
        "label": "Inspect NFS mount options",
        "cmd": "findmnt /mnt/nfs_backup",
        "key": true,
        "risk": "safe",
        "output": "TARGET           SOURCE                   FSTYPE OPTIONS\n/mnt/nfs_backup  nas01:/exports/backups   nfs4   rw,relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp",
        "note": "The client mounted the export with \"rw\" options."
      },
      {
        "id": "nfs_stat",
        "label": "Check directory permissions on mountpoint",
        "cmd": "ls -ld /mnt/nfs_backup",
        "key": true,
        "risk": "safe",
        "requires": [
          "nfs_mount"
        ],
        "output": "drwxr-xr-x. 4 backupuser backupgroup 4096 Oct  8 22:00 /mnt/nfs_backup",
        "note": "Directory is owned by backupuser:backupgroup. Root user is mapped to nobody due to root_squash on NFS server."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "NFS server exports the volume with root_squash enabled, mapping root (UID 0) to nfsnobody (UID 65534), which has only read access (drwxr-xr-x)",
        "correct": true,
        "why": "Default NFS exports squash root. Since directory permissions are 755 and owned by backupuser, squashed root cannot write."
      },
      {
        "id": "c2",
        "text": "The NFS filesystem is mounted read-only",
        "correct": false,
        "why": "findmnt confirms mount option is \"rw\"."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Configure the backup script to run as backupuser (su - backupuser) or configure no_root_squash on the secure export in /etc/exports on the NFS server",
        "correct": true,
        "why": "Matches least-privilege identity or permits root access appropriately."
      },
      {
        "id": "f2",
        "text": "chmod 777 /mnt/nfs_backup on client",
        "correct": false,
        "unsafe": true,
        "why": "Insecure audit violation and will fail if root is squashed."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Execute backup script as backupuser and verify test file creation succeeds",
        "correct": true,
        "why": "Validates target workflow without granting blanket 777 permissions."
      }
    ],
    "hints": [
      "Remember how NFS handles root UID 0 by default (root squashing)."
    ],
    "rootCause": "NFS root_squash prevented root from writing to directory owned by backupuser.",
    "prevention": [
      "Run enterprise backup jobs under dedicated service service accounts instead of root."
    ],
    "tags": [
      "nfs",
      "permissions",
      "root_squash",
      "storage"
    ]
  },
  {
    "id": "INC-13",
    "title": "Firewalld zone collision drops corporate intranet access",
    "level": 14,
    "topic": "L14-M4-T2",
    "severity": "P2",
    "environment": "rhel-bastion.corp.example.com, RHEL 9.1. Dual-NIC server: eth0 (internal 10.20.0.0/16), eth1 (DMZ 172.16.0.0/24).",
    "symptoms": [
      "Internal admins report SSH connection timeout to eth0 interface (10.20.10.5)",
      "External VPN traffic on eth1 connects normally"
    ],
    "timeline": [
      "2026-10-09 14:00 Network team assigned eth0 to \"drop\" zone by mistake during audit",
      "2026-10-09 14:02 Support tickets opened: unable to reach internal jump host"
    ],
    "actions": [
      {
        "id": "fw_zones",
        "label": "Check active firewalld zones and interfaces",
        "cmd": "firewall-cmd --get-active-zones",
        "key": true,
        "risk": "safe",
        "output": "drop\n  interfaces: eth0\npublic\n  interfaces: eth1",
        "note": "eth0 is bound to the \"drop\" zone, which silently drops all incoming packets including SSH."
      },
      {
        "id": "fw_rules",
        "label": "Inspect drop zone configuration",
        "cmd": "firewall-cmd --zone=drop --list-all",
        "key": true,
        "risk": "safe",
        "requires": [
          "fw_zones"
        ],
        "output": "drop (active)\n  target: DROP\n  icmp-block-inversion: no\n  interfaces: eth0\n  sources: \n  services: \n  ports: \n  protocols:",
        "note": "No services or ports allowed in drop zone."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "eth0 was assigned to the \"drop\" zone instead of the \"internal\" or \"trusted\" zone, silently discarding all inbound traffic",
        "correct": true,
        "why": "firewall-cmd --get-active-zones clearly proves eth0 is bound to drop zone."
      },
      {
        "id": "c2",
        "text": "The physical NIC eth0 is disconnected",
        "correct": false,
        "why": "Interface is active in firewalld and IP is configured."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Run firewall-cmd --zone=internal --change-interface=eth0 --permanent && firewall-cmd --reload",
        "correct": true,
        "why": "Permanently reassigns eth0 to the internal zone allowing corporate subnet traffic."
      },
      {
        "id": "f2",
        "text": "Disable firewalld with systemctl stop firewalld",
        "correct": false,
        "unsafe": true,
        "why": "Exposes DMZ interface eth1 to open internet without firewall protection."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Verify eth0 is in internal zone and test SSH connection from internal subnet",
        "correct": true,
        "why": "Verifies intended zone binding and restores connectivity."
      }
    ],
    "hints": [
      "Inspect active firewall zones per interface using firewall-cmd --get-active-zones."
    ],
    "rootCause": "Incorrect interface-to-zone binding assigned eth0 to default drop zone.",
    "prevention": [
      "Use configuration management (Ansible) for firewall zones to prevent manual errors."
    ],
    "tags": [
      "firewalld",
      "networking",
      "zones",
      "ssh"
    ]
  },
  {
    "id": "INC-14",
    "title": "Production Apache TLS certificate expired causing browser warnings",
    "level": 14,
    "topic": "L14-M4-T2",
    "severity": "P1",
    "environment": "rhel-web-01.prod.example.com, RHEL 9.4, Apache HTTP Server serving https://store.example.com.",
    "symptoms": [
      "Customers receiving browser security warning: NET::ERR_CERT_DATE_INVALID",
      "Payment gateway refusing webhook verification calls"
    ],
    "timeline": [
      "2026-10-09 00:00 SSL certificate expired at midnight UTC",
      "2026-10-09 00:05 Customer checkout volume drops by 98%"
    ],
    "actions": [
      {
        "id": "cert_check",
        "label": "Verify certificate expiration date via OpenSSL",
        "cmd": "openssl x509 -in /etc/pki/tls/certs/store.crt -noout -dates",
        "key": true,
        "risk": "safe",
        "output": "notBefore=Oct  9 00:00:00 2025 GMT\nnotAfter=Oct  9 00:00:00 2026 GMT",
        "note": "Certificate expired today at 00:00:00 GMT."
      },
      {
        "id": "renewed_cert",
        "label": "Check if renewed certificate exists in repository",
        "cmd": "ls -l /etc/pki/tls/certs/store_2026_renewed.crt",
        "key": true,
        "risk": "safe",
        "requires": [
          "cert_check"
        ],
        "output": "-rw-r--r--. 1 root root 2140 Oct  8 16:30 /etc/pki/tls/certs/store_2026_renewed.crt",
        "note": "The renewed cert was downloaded yesterday but Apache config was never updated or reloaded."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Apache vhost configuration points to the expired certificate /etc/pki/tls/certs/store.crt because reload step was missed",
        "correct": true,
        "why": "The renewed certificate was in /etc/pki/tls/certs/ but the web server config still referenced the expired one."
      },
      {
        "id": "c2",
        "text": "Apache service crashed due to OOM",
        "correct": false,
        "why": "Apache is running; browsers report certificate expiration."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Update SSLCertificateFile in /etc/httpd/conf.d/ssl.conf to point to renewed cert and run apachectl configtest && systemctl reload httpd",
        "correct": true,
        "why": "Updates configuration, tests syntax, and applies changes gracefully without dropping active connections."
      },
      {
        "id": "f2",
        "text": "Change system date backwards by 1 month using timedatectl",
        "correct": false,
        "unsafe": true,
        "why": "Corrupts system logs, breaks Kerberos/AD tokens, and causes severe audit failure."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run openssl s_client -connect localhost:443 -servername store.example.com | openssl x509 -noout -dates",
        "correct": true,
        "why": "Directly validates live TLS certificate handshake over the wire."
      }
    ],
    "hints": [
      "Check SSL certificate validity dates with openssl x509 -noout -dates."
    ],
    "rootCause": "Automated certificate renewal downloaded files but lacked service reload trigger.",
    "prevention": [
      "Use certbot/acme post-hook scripts to test and reload web services automatically."
    ],
    "tags": [
      "tls",
      "ssl",
      "httpd",
      "certificates"
    ]
  },
  {
    "id": "INC-15",
    "title": "High system load caused by thousands of Zombie processes",
    "level": 14,
    "topic": "L14-M1-T2",
    "severity": "P2",
    "environment": "rhel-worker-01.compute.example.com, RHEL 9.3, Node.js background batch worker daemon.",
    "symptoms": [
      "Process table exhaustion: fork failed: Cannot allocate memory",
      "System reports 4,000+ defunct processes in process table"
    ],
    "timeline": [
      "2026-10-09 06:00 Worker application updated",
      "2026-10-09 11:30 Monitoring alerts: PID usage at 96% of kernel.pid_max"
    ],
    "actions": [
      {
        "id": "ps_defunct",
        "label": "Count and inspect zombie processes",
        "cmd": "ps aux | grep defunct | head -10 ; ps aux | grep -c defunct",
        "key": true,
        "risk": "safe",
        "output": "appuser  14210  0.0  0.0      0     0 ?        Z    06:12   0:00 [worker-child] <defunct>\nappuser  14211  0.0  0.0      0     0 ?        Z    06:12   0:00 [worker-child] <defunct>\nappuser  14212  0.0  0.0      0     0 ?        Z    06:12   0:00 [worker-child] <defunct>\n4128",
        "note": "4,128 zombie processes exist in the process table holding process IDs."
      },
      {
        "id": "pstree",
        "label": "Locate parent process holding zombies",
        "cmd": "pstree -p 14210 -s",
        "key": true,
        "risk": "safe",
        "requires": [
          "ps_defunct"
        ],
        "output": "systemd(1)───node-worker(3120)───worker-child(14210)",
        "note": "The parent process is node-worker with PID 3120. It spawned children but does not call waitpid()."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The parent process node-worker (PID 3120) is not handling SIGCHLD or calling waitpid(), leaving terminated children as zombies and exhausting the process table",
        "correct": true,
        "why": "pstree identifies PID 3120 as the parent holding thousands of defunct children."
      },
      {
        "id": "c2",
        "text": "The server ran out of physical RAM",
        "correct": false,
        "why": "Zombies consume 0 bytes of RAM, but occupy slots in the kernel process table."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Restart the parent service with systemctl restart node-worker to release zombies to PID 1, and notify devs to handle child exit signals",
        "correct": true,
        "why": "Restarting parent forces init/systemd (PID 1) to reap all orphaned child processes immediately."
      },
      {
        "id": "f2",
        "text": "Run kill -9 on every defunct process PID",
        "correct": false,
        "unsafe": true,
        "why": "Zombie processes are already dead; signals cannot be delivered to them."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Check ps aux | grep -c defunct and verify count drops to 0",
        "correct": true,
        "why": "Confirms process table slots are freed."
      }
    ],
    "hints": [
      "You cannot kill zombies with kill -9; you must restart or signal the parent process."
    ],
    "rootCause": "Parent worker failed to reap child exit codes, leaking process table descriptors.",
    "prevention": [
      "Implement proper SIGCHLD handlers in application code and monitor zombie process counts."
    ],
    "tags": [
      "processes",
      "zombies",
      "pstree",
      "signals"
    ]
  },
  {
    "id": "INC-16",
    "title": "Swap Thrashing causes severe latency on Java microservices",
    "level": 14,
    "topic": "L14-M2-T2",
    "severity": "P1",
    "environment": "rhel-app-04.prod.example.com, RHEL 8.9. 32GB RAM, 8GB Swap, swappiness set to default (60).",
    "symptoms": [
      "Response times degraded from 50ms to 8,000ms",
      "vmstat reports continuous high paging (si/so)",
      "Free RAM shows 400MB while available buffer/cache is low"
    ],
    "timeline": [
      "2026-10-09 09:00 Traffic surge on trading platform",
      "2026-10-09 09:10 Paging spikes; customers report UI freezing"
    ],
    "actions": [
      {
        "id": "vmstat",
        "label": "Monitor virtual memory paging activity",
        "cmd": "vmstat 1 3",
        "key": true,
        "risk": "safe",
        "output": "procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n 6  8 782100 412000  12000 180000 8400 9200 12000 14000 4200 8100 24 18  0 58  0",
        "note": "High si (swap in) and so (swap out) values indicate active swap thrashing. wa is 58%."
      },
      {
        "id": "swappiness",
        "label": "Check current swappiness setting",
        "cmd": "cat /proc/sys/vm/swappiness",
        "key": true,
        "risk": "safe",
        "requires": [
          "vmstat"
        ],
        "output": "60",
        "note": "Default swappiness of 60 aggressively swaps anonymous memory out under pressure."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Memory contention forced the kernel to page active Java JVM heap pages into swap disk, causing severe disk thrashing and latency",
        "correct": true,
        "why": "vmstat confirms high continuous swap in/out (si/so) while JVM process threads block on storage."
      },
      {
        "id": "c2",
        "text": "Network cable disconnected",
        "correct": false,
        "why": "vmstat proves memory and storage paging thrashing."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Temporarily reduce swappiness via sysctl vm.swappiness=10 and restart overloaded non-critical batch jobs to free up RAM",
        "correct": true,
        "why": "Prevents aggressive paging of active application heap space and restores throughput."
      },
      {
        "id": "f2",
        "text": "Run swapoff -a while memory is at 98%",
        "correct": false,
        "unsafe": true,
        "why": "Turning swap off with insufficient RAM immediately triggers the OOM killer on primary database/app services."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Check vmstat 1 3 and verify si and so drop to 0",
        "correct": true,
        "why": "Confirms disk paging has stopped and JVM is running entirely in RAM."
      }
    ],
    "hints": [
      "Look at si (swap in) and so (swap out) columns in vmstat."
    ],
    "rootCause": "JVM heap allocated exceeded physical memory margins, inducing swap thrashing.",
    "prevention": [
      "Size JVM heap to 75% of physical RAM and tune vm.swappiness to 10."
    ],
    "tags": [
      "memory",
      "swap",
      "vmstat",
      "swappiness",
      "performance"
    ]
  },
  {
    "id": "INC-17",
    "title": "NTP Time Drift breaks Kerberos and Active Directory authentication",
    "level": 14,
    "topic": "L14-M4-T1",
    "severity": "P1",
    "environment": "rhel-client-01.corp.example.com, RHEL 9.3, SSSD joined to Active Directory domain corp.example.com.",
    "symptoms": [
      "All SSH logins with AD domain credentials fail (\"Access denied\")",
      "/var/log/secure: \"Clock skew too great while getting initial credentials\""
    ],
    "timeline": [
      "2026-10-09 07:00 Hypervisor host time drifted after virtualization clock sync failure",
      "2026-10-09 07:15 Employees unable to log into enterprise workstations"
    ],
    "actions": [
      {
        "id": "time_check",
        "label": "Check system time and chrony tracking",
        "cmd": "chronyc tracking",
        "key": true,
        "risk": "safe",
        "output": "Reference ID    : 00000000 ()\nStratum         : 0\nRef time (UTC)  : Thu Jan 01 00:00:00 1970\nSystem time     : 412.120980 seconds slow of NTP time\nLast offset     : +0.000000 seconds\nRMS offset      : +0.000000 seconds\nFrequency       : -12.410 ppm\nLeap status     : Not synchronised",
        "note": "System time is 412 seconds (nearly 7 minutes) slow and chrony is not synchronized. Kerberos allows maximum 300s clock skew."
      },
      {
        "id": "chrony_sources",
        "label": "Check chrony NTP sources",
        "cmd": "chronyc sources -v",
        "key": true,
        "risk": "safe",
        "requires": [
          "time_check"
        ],
        "output": "MS Name/IP address         Stratum Poll Reach LastRx Last sample               \n===============================================================================\n^? ntp01.corp.example.com        0   8     0     -     +0ns[   +0ns] +/-    0ns",
        "note": "Reach is 0; chronyd is unable to communicate with NTP server over UDP 123."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "System clock has drifted by 412 seconds, exceeding Kerberos 5-minute (300s) maximum allowable clock skew and breaking AD ticket issuance",
        "correct": true,
        "why": "chronyc tracking reports 412s skew, directly causing the Kerberos error \"Clock skew too great\"."
      },
      {
        "id": "c2",
        "text": "User accounts were deleted from Active Directory",
        "correct": false,
        "why": "Log explicitly states clock skew as the authentication failure reason."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Verify firewall allows UDP 123, run chronyd -q \"server ntp01.corp.example.com iburst\" to step clock immediately, and restart chronyd",
        "correct": true,
        "why": "Instantly corrects the 7-minute clock drift and restores Kerberos authentication."
      },
      {
        "id": "f2",
        "text": "Reinstall SSSD and leave domain",
        "correct": false,
        "unsafe": true,
        "why": "Leaves the machine detached from domain without fixing the clock."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run chronyc tracking to confirm Stratum is valid and test SSH login with domain account",
        "correct": true,
        "why": "Validates both NTP synchronization and successful AD login."
      }
    ],
    "hints": [
      "Kerberos authentication strictly enforces a maximum 5-minute clock skew."
    ],
    "rootCause": "UDP 123 dropped during switch upgrade, letting client clock drift beyond Kerberos limits.",
    "prevention": [
      "Configure redundant internal NTP sources and alert when chrony tracking offset exceeds 1 second."
    ],
    "tags": [
      "chrony",
      "ntp",
      "kerberos",
      "active-directory"
    ]
  },
  {
    "id": "INC-18",
    "title": "Corrupted RPM database halts all software patching and deployment",
    "level": 14,
    "topic": "L14-M1-T1",
    "severity": "P2",
    "environment": "rhel-build-02.ci.example.com, RHEL 8.8. Jenkins automated agent server running nightly yum/dnf builds.",
    "symptoms": [
      "dnf update fails: \"error: rpmdb: BDB0113 Thread/process failed: BDB1507 Thread died in Berkeley DB library\"",
      "Package installations freeze indefinitely with lock errors"
    ],
    "timeline": [
      "2026-10-09 04:00 Automated server power-cycled ungracefully during active kernel install transaction",
      "2026-10-09 08:00 CI/CD deployment pipeline blocked"
    ],
    "actions": [
      {
        "id": "rpm_query",
        "label": "Test basic RPM query",
        "cmd": "rpm -qa | head -5",
        "key": true,
        "risk": "safe",
        "output": "error: rpmdb: BDB0113 Thread/process 4120/1402128 failed: BDB1507 Thread died in Berkeley DB library\nerror: db5 error(-30973) from dbenv->failchk: BDB0087 DB_RUNRECOVERY: Fatal error, run database recovery\nerror: cannot open Packages index using db5 - (-30973)",
        "note": "The Berkeley DB index file for RPM packages is corrupted due to an interrupted transaction."
      },
      {
        "id": "rpm_locks",
        "label": "Check for stale lock files",
        "cmd": "ls -l /var/lib/rpm/__db.*",
        "key": true,
        "risk": "safe",
        "requires": [
          "rpm_query"
        ],
        "output": "-rw-r--r--. 1 root root  24576 Oct  9 04:01 /var/lib/rpm/__db.001\n-rw-r--r--. 1 root root 229376 Oct  9 04:01 /var/lib/rpm/__db.002\n-rw-r--r--. 1 root root 450560 Oct  9 04:01 /var/lib/rpm/__db.003",
        "note": "Stale database lock files remain from the interrupted run."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "The RPM database Berkeley DB environment files were corrupted by an ungraceful system reset during a write transaction",
        "correct": true,
        "why": "RPM output reports DB_RUNRECOVERY and fatal failure in __db indexes."
      },
      {
        "id": "c2",
        "text": "The dnf repository mirror is offline",
        "correct": false,
        "why": "Local rpmdb itself fails to open; the network mirrors were not even queried."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Backup /var/lib/rpm, remove stale lock files (rm -f /var/lib/rpm/__db.*), and rebuild the database using rpm --rebuilddb",
        "correct": true,
        "why": "Standard safe enterprise procedure to reconstruct the RPM database indexes."
      },
      {
        "id": "f2",
        "text": "rm -rf /var/lib/rpm",
        "correct": false,
        "unsafe": true,
        "why": "Catastrophic! Deleting the entire directory permanently destroys all package tracking records."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run rpm -qa | head -5 and verify package list queries cleanly with zero errors",
        "correct": true,
        "why": "Confirms the RPM database has been rebuilt successfully."
      }
    ],
    "hints": [
      "Clear stale lock files in /var/lib/rpm/__db.* and run rpm --rebuilddb."
    ],
    "rootCause": "Abrupt system reboot while yum transaction had open database write locks.",
    "prevention": [
      "Prevent automated reboots during active package management locks."
    ],
    "tags": [
      "rpm",
      "dnf",
      "database",
      "rebuilddb"
    ]
  },
  {
    "id": "INC-19",
    "title": "Systemd service stuck in restart loop due to invalid EnvironmentFile syntax",
    "level": 14,
    "topic": "L14-M3-T1",
    "severity": "P2",
    "environment": "rhel-api-01.prod.example.com, RHEL 9.4, Custom backend API service api-gateway.service.",
    "symptoms": [
      "systemctl status api-gateway shows: \"Active: activating (auto-restart) (Result: exit-code)\"",
      "Process repeatedly starts and exits every 2 seconds"
    ],
    "timeline": [
      "2026-10-09 13:00 Junior sysadmin edited /etc/sysconfig/api-gateway to add a database URL",
      "2026-10-09 13:02 Service restarted and entered boot loop"
    ],
    "actions": [
      {
        "id": "svc_status",
        "label": "Check service status and restart counter",
        "cmd": "systemctl status api-gateway.service",
        "key": true,
        "risk": "safe",
        "output": "● api-gateway.service - Enterprise API Gateway\n   Loaded: loaded (/etc/systemd/system/api-gateway.service; enabled; preset: disabled)\n   Active: activating (auto-restart) (Result: exit-code) since Wed 2026-10-09 13:05:12 UTC; 1s ago\n  Process: 18412 ExecStart=/usr/bin/node /opt/api/server.js (code=exited, status=1/FAILURE)\n Main PID: 18412 (code=exited, status=1/FAILURE)",
        "note": "Service fails immediately upon start with exit code 1."
      },
      {
        "id": "journal",
        "label": "Inspect detailed journalctl unit logs",
        "cmd": "journalctl -u api-gateway.service -n 10 --no-pager",
        "key": true,
        "risk": "safe",
        "requires": [
          "svc_status"
        ],
        "output": "Oct 09 13:05:12 rhel-api-01 systemd[1]: api-gateway.service: /etc/sysconfig/api-gateway: line 4: assignment missing \"=\"\nOct 09 13:05:12 rhel-api-01 node[18412]: Error: Missing required DB_HOST environment variable\nOct 09 13:05:12 rhel-api-01 systemd[1]: api-gateway.service: Main process exited, code=exited, status=1/FAILURE",
        "note": "Line 4 of the EnvironmentFile has a syntax error (missing \"=\" sign), preventing environment variables from loading."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Syntax error in /etc/sysconfig/api-gateway on line 4 prevented systemd from setting environment variables, causing the node application to crash",
        "correct": true,
        "why": "Journal logs explicitly report \"line 4: assignment missing =\" and application throws Missing required DB_HOST."
      },
      {
        "id": "c2",
        "text": "The node binary was deleted",
        "correct": false,
        "why": "ExecStart executed Node PID 18412, proving the binary exists."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Fix the syntax error in /etc/sysconfig/api-gateway (e.g., DB_HOST=db.example.com), run systemctl daemon-reload, and systemctl restart api-gateway",
        "correct": true,
        "why": "Corrects the EnvironmentFile format and restarts service."
      },
      {
        "id": "f2",
        "text": "Delete /etc/sysconfig/api-gateway entirely",
        "correct": false,
        "unsafe": true,
        "why": "Removes all other production secrets and configurations needed by the application."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run systemctl status api-gateway.service and verify \"Active: active (running)\"",
        "correct": true,
        "why": "Confirms stable running state without auto-restart looping."
      }
    ],
    "hints": [
      "Check journalctl for syntax errors when systemd parses EnvironmentFile directives."
    ],
    "rootCause": "Typo in EnvironmentFile configuration broke startup environment injection.",
    "prevention": [
      "Validate configuration files in CI/CD pipeline before pushing to production servers."
    ],
    "tags": [
      "systemd",
      "journalctl",
      "environment",
      "services"
    ]
  },
  {
    "id": "INC-20",
    "title": "Ansible automated deployment failure: host key verification failed",
    "level": 14,
    "topic": "L14-M5-T1",
    "severity": "P2",
    "environment": "ansible-control.mgmt.example.com, RHEL 9.2 running Ansible Core 2.15 deploying to target web servers.",
    "symptoms": [
      "Ansible playbook fails on 12 hosts with: \"Host key verification failed\"",
      "Scheduled deployment stopped mid-rollout"
    ],
    "timeline": [
      "2026-10-09 15:00 Target servers were re-provisioned via cloud template with fresh SSH host keys",
      "2026-10-09 15:10 Automated nightly configuration playbook triggers and errors out"
    ],
    "actions": [
      {
        "id": "ssh_manual",
        "label": "Test manual SSH connection to first target host",
        "cmd": "ssh -i /root/.ssh/id_rsa ansible@10.20.10.42",
        "key": true,
        "risk": "safe",
        "output": "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\nIT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!\nSomeone could be eavesdropping on you right now (man-in-the-middle attack)!\nThe fingerprint for the ED25519 key sent by the remote host is\nSHA256:4a8b1c2d3e...\nOffending ED25519 key in /root/.ssh/known_hosts:14\nHost key verification failed.",
        "note": "Host keys changed because target servers were re-imaged with new OS installations."
      },
      {
        "id": "ansible_cfg",
        "label": "Inspect ansible.cfg configuration",
        "cmd": "cat /etc/ansible/ansible.cfg | grep -i host_key_checking",
        "key": true,
        "risk": "safe",
        "requires": [
          "ssh_manual"
        ],
        "output": "host_key_checking = True",
        "note": "Ansible is configured to strictly enforce SSH host key validation."
      },
      {
        "id": "diag_3",
        "label": "Collect secondary diagnostics (step 3)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_4",
        "label": "Collect secondary diagnostics (step 4)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      },
      {
        "id": "diag_5",
        "label": "Collect secondary diagnostics (step 5)",
        "cmd": "dmesg -T | tail -20",
        "key": false,
        "risk": "safe",
        "output": "[ 1421.020] audit: type=1100 audit(1728458000.120:412): pid=1240 uid=0 auid=0 ses=1 msg='op=status-check'",
        "note": "Secondary diagnostic trace confirmed system baseline."
      }
    ],
    "causes": [
      {
        "id": "c1",
        "text": "Target servers were re-imaged, changing their SSH host public keys while the Ansible control node retained outdated fingerprints in /root/.ssh/known_hosts",
        "correct": true,
        "why": "SSH explicitly warns that remote host identification changed at known_hosts:14."
      },
      {
        "id": "c2",
        "text": "Target servers have disabled the SSH daemon",
        "correct": false,
        "why": "The host responded to the SSH handshake, but the fingerprint did not match."
      }
    ],
    "fixes": [
      {
        "id": "f1",
        "text": "Scan and update new host keys using ssh-keyscan -H 10.20.10.42 >> /root/.ssh/known_hosts or run ssh-keygen -R 10.20.10.42 after verifying fingerprints against the cloud provisioning log",
        "correct": true,
        "why": "Updates trusted host keys securely without permanently disabling host verification."
      },
      {
        "id": "f2",
        "text": "Set StrictHostKeyChecking=no globally for all users without verification",
        "correct": false,
        "unsafe": true,
        "why": "Creates permanent vulnerability to MITM attacks across corporate infrastructure."
      }
    ],
    "validations": [
      {
        "id": "v1",
        "text": "Run ansible -m ping all and verify all targets return \"SUCCESS\"",
        "correct": true,
        "why": "Confirms Ansible can authenticate and execute modules over SSH without errors."
      }
    ],
    "hints": [
      "Check if target servers were recently re-installed or replaced."
    ],
    "rootCause": "Re-imaged servers generated new SSH keys that conflicted with control node cache.",
    "prevention": [
      "Automate host key synchronization during instance provisioning via Vault or cloud-init."
    ],
    "tags": [
      "ssh",
      "ansible",
      "known_hosts",
      "automation"
    ]
  }
];
