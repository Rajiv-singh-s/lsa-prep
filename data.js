// Complete Curriculum Data from Basic to Advanced Linux Server & Enterprise Operations
const linuxCurriculum = [
  {
    id: "mod-01",
    category: "core",
    categoryLabel: "Core Linux Foundation",
    title: "1. Linux Architecture & File System Hierarchy",
    icon: "fa-solid fa-sitemap",
    level: "Basic to Intermediate",
    lead: "Master the Linux Filesystem Hierarchy Standard (FHS), Kernel vs User space, and essential file navigation for production environments.",
    description: "In RHEL/CentOS systems, understanding where configuration files, logs, and mount points live is crucial before diagnosing any server crash.",
    keyConcepts: [
      {
        title: "Filesystem Hierarchy Standard (FHS)",
        text: "Unlike Windows with drive letters (C:, D:), Linux is a unified single tree beginning at `/`. Key directories: `/etc` (system configuration), `/var/log` (incident log audit trails), `/proc` & `/sys` (kernel virtual memory metrics), `/dev` (device files), `/home` (user dirs), and `/opt` (third-party vendor enterprise apps)."
      },
      {
        title: "Kernel vs User Space",
        text: "The Linux Kernel handles CPU scheduling, RAM memory paging, I/O drivers, and hardware communication. User applications communicate with the kernel strictly through System Calls (syscalls like `open()`, `read()`, `fork()`)."
      }
    ],
    commands: [
      { cmd: "ls -lah /var/log", desc: "List all logs with human-readable permissions and hidden files" },
      { cmd: "df -Th", desc: "Display file system disk space and filesystem type (xfs/ext4)" },
      { cmd: "du -sh /var/log/* | sort -hr | head -n 5", desc: "Find top 5 biggest space-consuming logs in /var/log" },
      { cmd: "pwd && which systemctl", desc: "Print current working directory and path of binary" },
      { cmd: "stat /etc/passwd", desc: "Inspect detailed inode, file size, access/modify timestamps" },
      { cmd: "tree -L 2 /etc/systemd", desc: "Display directory structure of systemd up to depth 2" }
    ],
    realWorldScenario: {
      title: "Scenario 1: Root Partition Filled to 100% (/ is full)",
      problem: "A critical monitoring alert fires at 2 AM: `/dev/mapper/rhel-root` is at 100% capacity. Services are crashing because they cannot write PID files or temp logs.",
      steps: [
        "Run `df -h` to confirm which mount point is at 100%.",
        "Run `cd / && du -xhd1 | sort -hr | head -10` (the `-x` flag ensures you don't scan other mounted disks like `/boot` or NFS shares).",
        "Drill down into `/var/log` or `/var/cache` to locate bloated unrotated logs.",
        "Clear or compress safely without breaking open file descriptors: `> /var/log/app.log` (do NOT run `rm` on a file held open by a running daemon!).",
        "Verify with `lsof | grep deleted` if disk space didn't free up immediately."
      ]
    },
    interviewQuestions: [
      {
        q: "Why does `df -h` still show 100% disk usage even after deleting a huge 20GB log file with `rm`?",
        a: "Because a running process still holds an open file handle (file descriptor) to that deleted file. In Linux, disk blocks are only marked free when the inode reference count drops to 0. Run `lsof +L1` or `lsof | grep '(deleted)'` to find the offending PID, then either reload/restart that service or truncate the file descriptor via `/proc/<PID>/fd/<FD>`."
      },
      {
        q: "What is the difference between `/proc` and `/sys`?",
        a: "Both are pseudo/virtual filesystems generated directly by the kernel in RAM. `/proc` mainly contains process-specific states (`/proc/<pid>`) and runtime kernel parameters (like `/proc/sys/vm/swappiness`), whereas `/sys` (sysfs) provides a unified view of physical hardware, bus devices, and kernel drivers."
      }
    ]
  },

  {
    id: "mod-02",
    category: "core",
    categoryLabel: "Core Linux Foundation",
    title: "2. Permissions, ACLs & Ownership Security",
    icon: "fa-solid fa-user-shield",
    level: "Intermediate",
    lead: "Understand UNIX standard permissions (rwx), SUID, SGID, Sticky Bit, and POSIX Access Control Lists (ACLs) in enterprise RHEL.",
    description: "Enterprise environments require strict principle of least privilege. In production, misconfigured chmod 777 is an audit violation and major security risk.",
    keyConcepts: [
      {
        title: "Standard Permissions (UGO / rwx)",
        text: "User, Group, Others with octal values: Read (4), Write (2), Execute (1). Total 7 = rwx. Default permissions are determined by the `umask` (commonly 0022 or 0027)."
      },
      {
        title: "Special Permissions: SUID, SGID & Sticky Bit",
        text: "SUID (4xxx) allows binary execution with owner's privileges (e.g. `/usr/bin/passwd`). SGID (2xxx) forces newly created files to inherit parent directory's group. Sticky Bit (1xxx, e.g. `/tmp`) allows only file owners or root to delete their own files."
      },
      {
        title: "POSIX Access Control Lists (ACLs)",
        text: "When standard user/group permissions aren't flexible enough (e.g., granting read access to a specific auditor user without changing group ownership), ACLs (`getfacl`, `setfacl`) provide fine-grained multi-user authorization."
      }
    ],
    commands: [
      { cmd: "chmod 750 /opt/myapp/start.sh", desc: "User rwx, Group r-x, Others none" },
      { cmd: "chown -R appuser:appgroup /opt/myapp", desc: "Recursively change ownership of application directory" },
      { cmd: "chmod 2770 /shared/project", desc: "Set SGID so all newly created files inherit 'project' group" },
      { cmd: "chmod +t /shared/public_drop", desc: "Enable sticky bit on directory" },
      { cmd: "getfacl /var/log/audit/audit.log", desc: "View extended ACL rules on audit log" },
      { cmd: "setfacl -m u:rajiv:r-x /var/log/audit", desc: "Grant user 'rajiv' specific read-execute ACL without modifying group" },
      { cmd: "setfacl -b /var/log/audit", desc: "Remove all extended ACL rules from directory" }
    ],
    realWorldScenario: {
      title: "Scenario 2: Developer cannot write to shared staging directory",
      problem: "Developer 'dev1' cannot save files to `/var/www/html/app`, getting 'Permission Denied', even though they belong to group 'webdev'.",
      steps: [
        "Inspect directory permissions: `ls -ld /var/www/html/app`.",
        "Check developer groups: `id dev1` to ensure membership in 'webdev'.",
        "If they were just added to the group, explain that active SSH sessions must log out and log back in, or run `newgrp webdev` to refresh token.",
        "Ensure group write permission is active: `chmod g+w /var/www/html/app`.",
        "Set SGID so newly created files remain writable by everyone in 'webdev': `chmod 2775 /var/www/html/app`."
      ]
    },
    interviewQuestions: [
      {
        q: "What is the security risk of SUID on a shell script?",
        a: "Linux kernels intentionally ignore the SUID bit on interpreted scripts (like bash) because environment variables like `PATH` and `IFS` can be manipulated to execute arbitrary commands as root."
      },
      {
        q: "How does default umask 022 affect newly created files vs directories?",
        a: "Base permissions are 666 for files and 777 for directories. Subtracting umask 022 gives 644 (`-rw-r--r--`) for files and 755 (`drwxr-xr-x`) for directories."
      }
    ]
  },

  {
    id: "mod-03",
    category: "server",
    categoryLabel: "Server Operations & Performance",
    title: "3. Process Management, Load Average & Performance Triage",
    icon: "fa-solid fa-microchip",
    level: "Advanced (L2/L3)",
    lead: "Diagnose CPU spikes, memory starvation, Out-Of-Memory (OOM) killer invocations, and zombie/uninterruptible D-state processes.",
    description: "As an enterprise support engineer, understanding whether high load average is caused by CPU saturation or Disk I/O wait is the hallmark of senior problem solving.",
    keyConcepts: [
      {
        title: "Load Average Decoded",
        text: "The three load average numbers (1 min, 5 min, 15 min) represent the average number of threads in RUNNABLE state (state R) or UNINTERRUPTIBLE SLEEP state (state D, usually waiting on disk/NFS I/O). A load of 8.0 on a 4-core machine means 200% saturation; on a 16-core machine, it is only 50% utilized."
      },
      {
        title: "Process States (R, S, D, Z, T)",
        text: "R: Running/runnable. S: Interruptible sleep (waiting for event). D: Uninterruptible sleep (I/O wait - CANNOT be killed even with `kill -9`). Z: Zombie (child terminated, parent has not reaped exit code). T: Stopped."
      },
      {
        title: "Linux Memory & OOM Killer",
        text: "Linux utilizes spare RAM for disk caching (`buff/cache`). Look at 'available' memory in `free -m`, not 'free'. When memory and swap run out completely, the Linux kernel triggers the OOM killer (`dmesg -T | grep -i oom`) and terminates the process with the highest `oom_score`."
      }
    ],
    commands: [
      { cmd: "uptime", desc: "Display current uptime, logged-in users, and 1/5/15-min load averages" },
      { cmd: "top -b -n 1 | head -n 20", desc: "Batch capture top 20 processes without interactive prompt" },
      { cmd: "ps aux --sort=-%cpu | head -n 10", desc: "Identify top 10 CPU-consuming processes" },
      { cmd: "ps aux --sort=-%mem | head -n 10", desc: "Identify top 10 memory-consuming processes" },
      { cmd: "free -m -h", desc: "Check memory usage, swap space, and buffer/cache in human-readable format" },
      { cmd: "vmstat 1 5", desc: "Report virtual memory, processes (r, b), paging (si, so), and CPU wait (wa)" },
      { cmd: "pidstat 1 3", desc: "Display per-task CPU utilization breakdown in real time" },
      { cmd: "kill -15 <PID> && kill -9 <PID>", desc: "Graceful SIGTERM first, followed by force SIGKILL if unresponsive" }
    ],
    realWorldScenario: {
      title: "Scenario 3: Production Server Freezes, High Load Average but CPU is 98% Idle",
      problem: "Load average spikes to 45 on an 8-core RHEL server. However, CPU utilization shows `95% id` (idle) and `75% wa` (I/O wait).",
      steps: [
        "Run `vmstat 1 5` to inspect the `b` (blocked processes) and `wa` columns.",
        "High `wa` means processes are stuck waiting for disk reads/writes or an unresponsive NFS mount.",
        "Run `iostat -xz 1 5` and examine the `%util` and `await` columns. If `%util` is 100%, physical disk or SAN array is bottlenecked.",
        "Run `iotop -oP` to see exactly which Process ID is flooding disk write throughput.",
        "Check `/var/log/messages` or `dmesg -T` for disk controller timeouts, bad sectors, or NFS server timeout errors."
      ]
    },
    interviewQuestions: [
      {
        q: "How do you kill a process in 'D' (Uninterruptible Sleep) state?",
        a: "You CANNOT kill a D-state process—not even with `kill -9`! The process is inside a kernel-level uninterruptible system call waiting for hardware I/O (e.g., stuck on an offline NFS share, hung SAN LUN, or failing hard disk). The only solutions are restoring the underlying I/O resource or rebooting the server."
      },
      {
        q: "How do you clear Zombie processes from a Linux server?",
        a: "A zombie process (`Z` state) is already dead and consumes zero CPU or RAM—it only holds a slot in the process table. You cannot kill a zombie with `kill -9`. You must send `SIGHUP` or `SIGCHLD` to its parent process (`kill -CHLD <PPID>`). If the parent application refuses to reap it, restarting the parent process will adopt the zombie to PID 1 (`systemd`), which immediately cleans it up."
      }
    ]
  },

  {
    id: "mod-04",
    category: "server",
    categoryLabel: "Server Operations & Performance",
    title: "4. Systemd, Service Management & Journalctl Log Analysis",
    icon: "fa-solid fa-gears",
    level: "Advanced (RHCSA Core)",
    lead: "Master systemd targets, unit files, dependencies, socket activation, and querying systemd-journald logs with advanced filters.",
    description: "In modern RHEL 7/8/9, systemd replaced SysV init. Support engineers must know how to inspect unit dependencies, troubleshoot boot loops, and recover failed services.",
    keyConcepts: [
      {
        title: "Systemd Architecture",
        text: "Systemd manages system units: `.service` (daemons), `.socket` (network sockets), `.target` (runlevels, e.g., `multi-user.target`, `graphical.target`), and `.timer` (modern cron alternatives). Unit configurations reside in `/etc/systemd/system/` (user custom) and `/usr/lib/systemd/system/` (rpm package default)."
      },
      {
        title: "Journalctl Diagnostic Power",
        text: "The `systemd-journald` daemon captures stdout/stderr, syslog, and kernel messages in indexed binary format. Allows pinpoint time filtering (`--since`), PID filtering, priority filtering (`-p err`), and reverse scrolling."
      }
    ],
    commands: [
      { cmd: "systemctl status httpd.service", desc: "Inspect current service status, PID, active memory, and last log lines" },
      { cmd: "systemctl list-units --type=service --state=failed", desc: "List all services currently in failed state across the server" },
      { cmd: "systemctl daemon-reload", desc: "Reload systemd manager configuration after editing unit files" },
      { cmd: "journalctl -u nginx --since '1 hour ago' -p err", desc: "Fetch only ERROR priority logs for nginx from the last 60 minutes" },
      { cmd: "journalctl -xe", desc: "Jump to end of journal with detailed explanatory catalog hints" },
      { cmd: "journalctl -k -b 0", desc: "Display kernel ring buffer logs (`dmesg` equivalent) for the current boot" },
      { cmd: "systemctl get-default && systemctl set-default multi-user.target", desc: "Set server default boot target to non-GUI server mode" }
    ],
    realWorldScenario: {
      title: "Scenario 4: Service Fails to Start with 'Code=exited, status=1/FAILURE'",
      problem: "You run `systemctl start myapp` and it returns `Job for myapp.service failed because the control process exited with error code`.",
      steps: [
        "Run `systemctl status myapp.service` to look at the exit code and failure status.",
        "Inspect exact runtime logs using `journalctl -u myapp.service -n 50 --no-pager`.",
        "Check syntax of configuration file if the service is a web server or database (e.g. `nginx -t`, `apachectl configtest`, `sshd -t`).",
        "Check if port is already bound: `ss -tulnp | grep :8080`.",
        "Check SELinux denial logs: `ausearch -m avc -ts recent` or `grep denied /var/log/audit/audit.log`."
      ]
    },
    interviewQuestions: [
      {
        q: "What is the difference between `systemctl enable` and `systemctl start`?",
        a: "`systemctl start` starts the service immediately in the current running session, but does NOT persist across reboot. `systemctl enable` creates a symlink under `/etc/systemd/system/*.wants/` so the service launches automatically on server reboot, but does NOT start it in the current session unless `--now` is specified."
      },
      {
        q: "How do you permanently limit journalctl log sizes from eating all disk space?",
        a: "Edit `/etc/systemd/journald.conf` and set `SystemMaxUse=2G` or `SystemKeepFree=5G`, then restart the journald daemon with `systemctl restart systemd-journald`."
      }
    ]
  },

  {
    id: "mod-05",
    category: "server",
    categoryLabel: "Server Operations & Performance",
    title: "5. Storage Administration, LVM & Filesystem Management",
    icon: "fa-solid fa-hard-drive",
    level: "Advanced (RHCSA Core)",
    lead: "Logical Volume Management (LVM): Physical Volumes (PV), Volume Groups (VG), Logical Volumes (LV), online filesystem resizing, and swap tuning.",
    description: "In enterprise servers, physical hard drives are rarely formatted directly. LVM allows dynamic volume expansion without taking production services offline.",
    keyConcepts: [
      {
        title: "LVM 3-Tier Hierarchy",
        text: "1. PV (Physical Volume: `/dev/sdb`, `/dev/nvme0n1`): raw block devices initialized with `pvcreate`.\n2. VG (Volume Group: e.g. `vg_data`): pool of physical extents (PE, usually 4MB) combining multiple PVs.\n3. LV (Logical Volume: e.g. `/dev/vg_data/lv_app`): slice carved out of VG formatted with a filesystem (XFS or EXT4)."
      },
      {
        title: "XFS vs EXT4 Resizing Rules",
        text: "Crucial for interviews! EXT4 can be grown online (`resize2fs`) AND shrunk offline. XFS can ONLY be grown online (`xfs_growfs`)—XFS CANNOT be reduced or shrunk without recreating the filesystem and restoring data from backup!"
      }
    ],
    commands: [
      { cmd: "lsblk -f", desc: "List all block devices, partitions, UUIDs, and mount points" },
      { cmd: "pvs && vgs && lvs", desc: "Quick summary of all PVs, Volume Groups, and Logical Volumes" },
      { cmd: "pvcreate /dev/sdb1", desc: "Initialize disk partition as an LVM Physical Volume" },
      { cmd: "vgextend vg_prod /dev/sdb1", desc: "Add newly attached hard drive PV into existing Volume Group" },
      { cmd: "lvextend -L +20G /dev/vg_prod/lv_data -r", desc: "Extend LV by 20GB and resize filesystem simultaneously (-r flag)" },
      { cmd: "xfs_growfs /data", desc: "Grow XFS filesystem on mountpoint /data" },
      { cmd: "resize2fs /dev/vg_prod/lv_data", desc: "Grow EXT4 filesystem on logical volume" },
      { cmd: "blkid", desc: "Locate UUIDs of block devices for `/etc/fstab` mounting" }
    ],
    realWorldScenario: {
      title: "Scenario 5: Server Fails to Boot into Emergency Mode due to corrupt `/etc/fstab`",
      problem: "After a scheduled storage maintenance, the server reboot hangs at `Welcome to emergency mode! Enter root password for maintenance:`.",
      steps: [
        "Enter root password to access emergency maintenance shell.",
        "Check `/etc/fstab` and run `mount -a` to see which device failed to mount.",
        "Common cause: A UUID changed, an NFS server is unreachable, or a drive was decommissioned without removing its entry.",
        "If root filesystem is mounted read-only, remount it writable: `mount -o remount,rw /`.",
        "Comment out the bad entry in `/etc/fstab` using `vi`, test with `mount -a`, then `systemctl reboot`."
      ]
    },
    interviewQuestions: [
      {
        q: "Why should you always mount partitions using UUID in `/etc/fstab` instead of device names like `/dev/sdb1`?",
        a: "Device node names (like `/dev/sda`, `/dev/sdb`) are dynamically assigned by the Linux kernel during SCSI/PCI bus scanning on boot. If a drive is unplugged, added, or controller order shifts, `/dev/sdb` might become `/dev/sdc`, causing the wrong disk to be mounted or the system to hang. UUIDs are universally unique identifiers stored in the filesystem superblock and never change."
      },
      {
        q: "What does the `-r` flag do in `lvextend -L +10G /dev/vg_data/lv_app -r`?",
        a: "The `-r` (or `--resizefs`) flag automatically runs the underlying filesystem expansion tool (`xfs_growfs` for XFS or `resize2fs` for EXT4) immediately after extending the LVM container. This saves you from running a separate command and prevents user confusion when `df -h` doesn't show the new space."
      }
    ]
  },

  {
    id: "mod-06",
    category: "server",
    categoryLabel: "Server Operations & Performance",
    title: "6. Server Networking, DNS, Routing & Firewalld",
    icon: "fa-solid fa-network-wired",
    level: "Advanced (Production L2/L3)",
    lead: "Configure static IP addresses via `nmcli`, inspect active ports with `ss`, trace routes, debug DNS with `dig`, and open firewall ports via `firewalld`.",
    description: "Enterprise engineers must isolate whether an outage is a local OS firewall drop, network interface link down, routing table gateway failure, or remote port listener issue.",
    keyConcepts: [
      {
        title: "NetworkManager & nmcli",
        text: "In RHEL 8 and 9, legacy network scripts (`/etc/sysconfig/network-scripts/ifcfg-*`) are deprecated in favor of NetworkManager and `nmcli`. Persistent configuration changes must be made via `nmcli connection modify`."
      },
      {
        title: "Socket Statistics: ss vs netstat",
        text: "`netstat` is obsolete and reads slowly from `/proc/net`. Modern Linux uses `ss` (Socket Statistics), which directly queries the kernel's `sock_diag` netlink subsystem for immediate socket state inspection."
      },
      {
        title: "Enterprise Firewalls: firewalld & Zones",
        text: "RHEL uses `firewalld` with dynamic zones (`public`, `internal`, `trusted`). Changes made without `--permanent` are lost on reload or reboot. Always run `firewall-cmd --reload` after permanent rules."
      }
    ],
    commands: [
      { cmd: "ip addr show", desc: "Display IP addresses, subnet masks, and interface states" },
      { cmd: "ip route show", desc: "Inspect kernel routing table and default gateway" },
      { cmd: "nmcli device status", desc: "List all hardware network adapters and connection profiles" },
      { cmd: "ss -tulnp", desc: "Show TCP/UDP Listening sockets with Numeric ports and Process Names" },
      { cmd: "dig +short api.company.internal @10.0.0.2", desc: "Query corporate internal DNS server directly for fast resolution check" },
      { cmd: "nc -zvw3 192.168.1.50 443", desc: "Netcat port test (test if remote IP port 443 is open and responding)" },
      { cmd: "firewall-cmd --list-all", desc: "Display current active firewalld zone, ports, and allowed services" },
      { cmd: "firewall-cmd --permanent --add-port=8443/tcp && firewall-cmd --reload", desc: "Permanently open port 8443 in firewalld and reload rules without dropping connections" }
    ],
    realWorldScenario: {
      title: "Scenario 6: Application Client Cannot Reach Server on Port 8080 ('Connection Timed Out')",
      problem: "Client reports 'Connection timed out' when trying to connect to web service on server 10.10.20.15:8080.",
      steps: [
        "Step 1 (Check listening process): On the server, run `ss -tulnp | grep :8080`. Is the app listening on `0.0.0.0:8080` or mistakenly on `127.0.0.1:8080` (localhost only)?",
        "Step 2 (Check OS firewall): Run `firewall-cmd --list-ports`. Is 8080/tcp open? If not, run `firewall-cmd --permanent --add-port=8080/tcp && firewall-cmd --reload`.",
        "Step 3 (Check iptables/SELinux): Run `iptables -S INPUT | grep 8080`.",
        "Step 4 (Test locally): Run `curl -Iv http://127.0.0.1:8080` on the server itself.",
        "Step 5 (Check upstream): If server answers locally, the drop is upstream at network security group (NSG), enterprise Palo Alto firewall, or switch ACL."
      ]
    },
    interviewQuestions: [
      {
        q: "What is the difference between 'Connection Refused' and 'Connection Timed Out'?",
        a: "'Connection Refused' means the packet successfully reached the destination host, but no application is listening on that port (the kernel sent back a TCP RST packet), or a local firewall explicitly REJECTed it. 'Connection Timed Out' means the packet was dropped silently (no reply received at all), typically caused by an intermediate firewall, wrong routing gateway, or firewall DROP rule."
      },
      {
        q: "How do you check packet drops or interface errors at the hardware/driver level?",
        a: "Run `ip -s link show <interface_name>` or `ethtool -S <interface_name>` to inspect hardware RX/TX drops, CRC errors, and buffer overruns."
      }
    ]
  },

  {
    id: "mod-07",
    category: "server",
    categoryLabel: "Server Operations & Performance",
    title: "7. SELinux Security & Enterprise Hardening",
    icon: "fa-solid fa-shield-halved",
    level: "Advanced (RHCSA / Security)",
    lead: "Master Security-Enhanced Linux (SELinux): Enforcing vs Permissive, file contexts, booleans, and resolving AVC denial audits.",
    description: "Never disable SELinux in production! Enterprise support engineers must know how to diagnose AVC denials, restore labels, and enable port booleans.",
    keyConcepts: [
      {
        title: "SELinux Modes & Types",
        text: "Enforcing (enforces policies and blocks unauthorized access), Permissive (does not block, but logs denials for debugging), Disabled (turned off completely; requires reboot to re-enable). In targeted policy, each file and process has a label formatted as `user:role:type:level` (e.g., `httpd_sys_content_t`)."
      },
      {
        title: "SELinux Booleans",
        text: "Booleans are toggle switches that enable or disable specific operational capabilities without writing custom policies (e.g. `httpd_can_network_connect` allows Apache/Nginx to make reverse proxy calls to backend databases or API ports)."
      }
    ],
    commands: [
      { cmd: "sestatus", desc: "Display current SELinux status, mode, and loaded policy name" },
      { cmd: "setenforce 0 && setenforce 1", desc: "Switch dynamically between Permissive (0) and Enforcing (1) for immediate troubleshooting" },
      { cmd: "ls -Z /var/www/html", desc: "Inspect SELinux security context tags on files" },
      { cmd: "restorecon -Rv /var/www/html", desc: "Restore default SELinux security contexts based on system policy rules" },
      { cmd: "semanage fcontext -a -t httpd_sys_content_t '/custom_web(/.*)?'", desc: "Persistently add new directory to SELinux file context database" },
      { cmd: "getsebool -a | grep httpd", desc: "List all SELinux booleans related to HTTP/Web services" },
      { cmd: "setsebool -P httpd_can_network_connect 1", desc: "Permanently enable Apache/Nginx reverse proxy network communication" },
      { cmd: "ausearch -m avc -ts recent", desc: "Search audit log for recent Access Vector Cache (AVC) SELinux denials" }
    ],
    realWorldScenario: {
      title: "Scenario 7: Web Application returns 403 Forbidden after moving DocumentRoot",
      problem: "A developer moved web assets from `/var/www/html` to `/data/www`. File permissions are `755` and owned by `apache:apache`, but Nginx/Apache still gets `403 Forbidden`.",
      steps: [
        "Check file context: `ls -ldZ /data/www`. You notice the type is `default_t` or `var_t` instead of `httpd_sys_content_t`.",
        "Verify SELinux is the culprit: temporarily set `setenforce 0` and reload page. The page loads successfully!",
        "Never leave it in Permissive mode. Turn it back: `setenforce 1`.",
        "Add permanent context rule: `semanage fcontext -a -t httpd_sys_content_t '/data/www(/.*)?'`.",
        "Apply the context to existing files: `restorecon -Rv /data/www`.",
        "Reload page again to confirm clean resolution."
      ]
    },
    interviewQuestions: [
      {
        q: "Why is running `setenforce 0` in production considered bad practice?",
        a: "It puts SELinux into Permissive mode globally across the entire operating system, leaving all daemons (SSH, web servers, databases, containers) unprotected against zero-day exploits and privilege escalation. Support engineers should resolve the specific AVC denial using `restorecon`, `semanage fcontext`, or `audit2allow`."
      },
      {
        q: "What tool generates human-readable explanations and fix recommendations for SELinux audit denials?",
        a: "`sealert` (part of `setroubleshoot-server`). When an audit denial occurs, `sealert -a /var/log/audit/audit.log` generates a readable diagnosis and provides the exact `setsebool` or `restorecon` command to resolve it."
      }
    ]
  },

  {
    id: "mod-08",
    category: "interview",
    categoryLabel: "Interview & Production Incident Bank",
    title: "8. Enterprise Production RCA & L2/L3 Interview Scenarios",
    icon: "fa-solid fa-clipboard-question",
    level: "Interview Preparation",
    lead: "Real-world incident troubleshooting workflows, ITIL RCA frameworks, and 15 top technical interview questions asked by enterprise recruiters.",
    description: "Align your 5 years of experience directly with the questions hiring managers ask for Senior Technical Support and Systems Administrator roles.",
    keyConcepts: [
      {
        title: "The Structured Troubleshooting Methodology (USE Method)",
        text: "Utilization (how busy is the resource), Saturation (how much queued work is waiting), and Errors (hardware or software error events). Always check CPU, Memory, Disk, and Network sequentially rather than making blind guesses."
      },
      {
        title: "ITIL Incident & Root Cause Analysis (RCA) Format",
        text: "1. Incident Description & Severity (P1/P2).\n2. Timeline of Events.\n3. Temporary Workaround applied to restore SLA.\n4. Root Cause identified.\n5. Permanent Corrective Action & Preventative Action (CAPA)."
      }
    ],
    commands: [
      { cmd: "dmesg -T | grep -iE 'error|fail|killed|oom'", desc: "Scan kernel messages with human timestamps for critical hardware or memory errors" },
      { cmd: "strace -p <PID> -f", desc: "Attach to live running process and trace its kernel system calls in real-time" },
      { cmd: "lsof -i :80", desc: "Identify process name and PID holding port 80" },
      { cmd: "sar -q -f /var/log/sa/sa09", desc: "Review historical CPU and load average spikes from system activity reporter" },
      { cmd: "last -x | head -n 15", desc: "Check system reboot history, shutdown events, and logged-in users" }
    ],
    realWorldScenario: {
      title: "Scenario 8: P1 Outage - Server is Alive (pings) but SSH is Refusing Connections",
      problem: "Monitoring alerts that SSH port 22 on production database host is unreachable. Ping responds with 0% loss, but `ssh root@host` returns `Connection refused` or hangs indefinitely.",
      steps: [
        "Log into Out-of-Band management console (Dell iDRAC or HPE iLO virtual console).",
        "Check console screen for kernel panic, OOM killer messages, or filesystem read-only remount.",
        "If logged in locally via console: check `systemctl status sshd`.",
        "If sshd is stopped: check why: `journalctl -u sshd -n 30`. Common causes: corrupted `/etc/ssh/sshd_config`, missing host keys, or max connections reached (`MaxStartups`).",
        "Check process table limit: `ps -eLf | wc -l`. Has system hit `kernel.pid_max` or user `nproc` limits?",
        "Restart service: `systemctl restart sshd`, test local login: `ssh localhost`, and verify firewall state."
      ]
    },
    interviewQuestions: [
      {
        q: "A server has been up for 400 days and suddenly files cannot be saved, yet `df -h` shows 60% disk space free. What is the problem?",
        a: "The filesystem has exhausted its Inodes (Index Nodes). Run `df -i`. If `%IUse` is at 100%, the filesystem has run out of file tracking pointers even though physical disk blocks are free. This commonly happens when millions of tiny files or emails pile up in `/var/spool/clientmqueue` or session directories."
      },
      {
        q: "What is the boot sequence of an enterprise RHEL 8 system?",
        a: "1. UEFI / BIOS initializes hardware.\n2. GRUB2 bootloader is executed from ESP/MBR, reads `/boot/grub2/grub.cfg`, and loads kernel (`vmlinuz`) and initramfs into RAM.\n3. Linux Kernel initializes hardware drivers and mounts root filesystem read-only.\n4. Kernel executes `/usr/lib/systemd/systemd` as PID 1.\n5. Systemd mounts `/etc/fstab`, switches root to real disk, activates targets (`multi-user.target`), and launches services in parallel."
      },
      {
        q: "How do you reset a lost root password on RHEL 8?",
        a: "Reboot the system, at the GRUB menu press `e` to edit the kernel boot line, append `rd.break` at the end of the `linux` line, press `Ctrl+X` to boot into emergency ramfs. Remount sysroot writable (`mount -o remount,rw /sysroot`), chroot into it (`chroot /sysroot`), change password (`passwd`), force SELinux relabel (`touch /.autorelabel`), type `exit` twice to reboot."
      }
    ]
  }
];
