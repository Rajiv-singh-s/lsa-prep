// Complete Enterprise Dataset: 8 Modules, 20 MCQs with Marking Scheme, Interactive Scenarios, and Production Projects

// 1. MODULES DATA (Plain, deep explanations, examples, flags, and incident SOPs)
const linuxCurriculum = [
  {
    id: "mod-01",
    category: "core",
    categoryLabel: "Core Linux Foundation",
    title: "1. Linux Architecture & File System Hierarchy (FHS)",
    icon: "fa-solid fa-sitemap",
    level: "Basic to Intermediate",
    lead: "Master how the Linux Kernel interacts with hardware, syscalls, and where configuration files, logs, and device mounts live in enterprise systems.",
    description: "In enterprise servers (RHEL/CentOS/Rocky), Linux organizes everything as a single unified hierarchical tree starting at root (`/`). Understanding which directories hold temporary runtime memory vs persistent disk storage is the first step in diagnosing server crashes.",
    keyConcepts: [
      {
        title: "Kernel Space vs User Space",
        text: "The Operating System is split into two realms:\n• Kernel Space: Has unrestricted direct access to hardware (CPU, RAM registers, network cards, disks). It schedules tasks and manages memory paging.\n• User Space: Where normal software, web servers, and terminal shells run. User applications cannot talk directly to hardware—they must issue System Calls (syscalls like `read()`, `write()`, `fork()`, `open()`)."
      },
      {
        title: "Standard Directories & Their Production Purpose",
        text: "• /etc: Contains all system and daemon configuration files (e.g. `/etc/ssh/sshd_config`, `/etc/fstab`, `/etc/resolv.conf`).\n• /var: Variable data that changes continuously. Key directory: `/var/log` where system audit, security, and application logs are stored.\n• /proc & /sys: Virtual in-memory filesystems generated on-the-fly by the Linux kernel. They take up 0 bytes of physical hard drive space. Reading `/proc/cpuinfo` or `/proc/meminfo` queries kernel RAM directly.\n• /dev: Device nodes representing physical storage disks (`/dev/sda`, `/dev/nvme0n1`) and special character devices (`/dev/null`, `/dev/urandom`).\n• /opt: Standard location for 3rd-party vendor enterprise software (e.g., Dynatrace, Splunk, custom Java JARs)."
      }
    ],
    commands: [
      { cmd: "ls -lah /var/log", desc: "List all logs with permissions, file owners, hidden files, and human-readable sizes (K, M, G)" },
      { cmd: "df -Th", desc: "Display all mounted filesystems, total sizes, free space, and filesystem types (XFS / EXT4)" },
      { cmd: "du -sh /var/log/* | sort -hr | head -n 5", desc: "Scan and display the top 5 largest log files in /var/log consuming disk space" },
      { cmd: "stat /etc/fstab", desc: "Inspect detailed inode number, file size, access, modify, and status change timestamps" },
      { cmd: "uname -r", desc: "Display exact Linux Kernel version running on the server" },
      { cmd: "cat /proc/sys/fs/file-nr", desc: "Check allocated file handles vs system maximum open file descriptors" }
    ],
    realWorldScenario: {
      title: "Scenario 1: Root Partition Filled to 100% (/ is full)",
      problem: "At 2 AM, the on-call monitoring alert triggers: `/dev/mapper/rhel-root` is at 100% capacity. Daemons are failing to start because they cannot write temporary lock files.",
      steps: [
        "Run `df -h` to pinpoint which partition is at 100%.",
        "Run `cd / && du -xhd1 | sort -hr | head -10` (the `-x` flag prevents scanning external mountpoints or network NFS shares).",
        "Locate bloated unrotated logs in `/var/log` or dumped core files in `/var/crash`.",
        "Crucial Rule: Do NOT run `rm` on a log file currently being written by a running daemon! Instead, truncate it safely: `> /var/log/app.log`.",
        "If you already deleted it with `rm` but space did not free up, run `lsof | grep '(deleted)'` to identify the holding PID and restart that service."
      ]
    },
    interviewQuestions: [
      {
        q: "Why does `df -h` still report 100% disk usage even after you deleted a 20GB log file with `rm`?",
        a: "In Linux, deleting a file with `rm` only unlinks the filename from directory entry. If a running process still has that file open, its Inode reference count remains greater than 0, and the storage blocks are NOT freed. Run `lsof +L1` or `lsof | grep deleted` to find the process ID (PID), then either reload the service or restart it."
      },
      {
        q: "What is the difference between `/proc` and `/sys`?",
        a: "Both are pseudo virtual filesystems created in RAM by the kernel. `/proc` primarily represents process runtime data (`/proc/<PID>`) and kernel tuneables (`/proc/sys/`), whereas `/sys` (sysfs) provides a structured hierarchy of physical hardware buses, drivers, and network interface adapters."
      }
    ]
  },

  {
    id: "mod-02",
    category: "core",
    categoryLabel: "Core Linux Foundation",
    title: "2. Permissions, SUID/SGID, Sticky Bit & POSIX ACLs",
    icon: "fa-solid fa-user-shield",
    level: "Intermediate",
    lead: "Understand UNIX standard permissions (UGO/rwx), special permission bits, and extended Access Control Lists (ACLs) for enterprise compliance.",
    description: "In production enterprise environments, setting `chmod 777` is an immediate security and audit violation. System administrators must use fine-grained groups, SGID inheritance, and POSIX ACLs to enforce least privilege.",
    keyConcepts: [
      {
        title: "Standard Octal Permissions (UGO)",
        text: "Every file has User (owner), Group, and Others permissions. Read = 4, Write = 2, Execute = 1. Therefore: 7 = rwx, 6 = rw-, 5 = r-x, 4 = r--. The default permission applied when creating new files or directories is controlled by the `umask` (standard default is 0022 or 0027)."
      },
      {
        title: "Special Permission Bits (SUID, SGID, Sticky Bit)",
        text: "• SUID (4xxx): When set on an executable binary, any user running the binary executes it with the privileges of the file owner (e.g. `/usr/bin/passwd` runs as root).\n• SGID (2xxx): When set on a directory, any new file created inside that directory automatically inherits the parent directory's group ownership rather than the user's primary group.\n• Sticky Bit (1xxx): When set on a directory (e.g. `/tmp`), users can only delete or rename files that they personally own."
      },
      {
        title: "POSIX Access Control Lists (ACLs)",
        text: "Standard Linux permissions only support one user owner and one group owner. ACLs allow you to grant read/write permissions to specific additional users or groups without changing the base ownership (`getfacl` to read, `setfacl` to modify)."
      }
    ],
    commands: [
      { cmd: "chmod 750 /opt/myapp/start.sh", desc: "Set User=rwx (7), Group=r-x (5), Others=none (0)" },
      { cmd: "chown -R appuser:appgroup /opt/myapp", desc: "Recursively change user and group ownership on directory" },
      { cmd: "chmod 2770 /shared/finance", desc: "Enable SGID bit (2) on folder so new files inherit 'finance' group" },
      { cmd: "chmod +t /shared/public", desc: "Enable Sticky Bit so users cannot delete files created by other colleagues" },
      { cmd: "getfacl /var/log/secure", desc: "View extended Access Control Lists and specific user permissions on file" },
      { cmd: "setfacl -m u:auditor:r /var/log/secure", desc: "Grant read-only ACL to user 'auditor' without changing file ownership" },
      { cmd: "setfacl -b /var/log/secure", desc: "Wipe all extended ACL rules from file back to standard POSIX" }
    ],
    realWorldScenario: {
      title: "Scenario 2: Developer receives 'Permission Denied' on shared staging folder",
      problem: "Developer 'dev1' was added to the 'webteam' group, but cannot create files inside `/var/www/staging`, getting 'Permission Denied'.",
      steps: [
        "Check folder permissions: `ls -ld /var/www/staging`.",
        "Check developer groups: `id dev1`. If 'webteam' is listed, check if the developer logged out and logged back in after being added. New group memberships only apply to new login sessions!",
        "Workaround for active SSH session: have the user run `newgrp webteam`.",
        "Verify group has write access: `chmod g+w /var/www/staging`.",
        "Set SGID so all subsequent files created by any dev inherit 'webteam': `chmod 2775 /var/www/staging`."
      ]
    },
    interviewQuestions: [
      {
        q: "How does a umask of 027 affect default file and directory creation permissions?",
        a: "Base file permission is 666, base directory permission is 777. With umask 027 (subtracting 027): Files get 640 (`-rw-r-----`), meaning Owner has rw, Group has r, Others have no access. Directories get 750 (`drwxr-x---`), meaning Owner has rwx, Group has rx, Others have no access."
      },
      {
        q: "How do you recognize if a file has an extended ACL configured from `ls -l` output?",
        a: "A plus sign (`+`) will appear at the end of the permission string (e.g., `-rw-r-----+ 1 root root`). To view the exact ACL entries, you run `getfacl <filename>`."
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
    lead: "Diagnose CPU contention, memory starvation, Out-Of-Memory (OOM) killer invocations, and zombie vs uninterruptible D-state processes.",
    description: "In senior technical interviews, you will frequently be asked: 'The load average is 30, but CPU is 95% idle. What is happening?' Mastering process states and kernel metrics is essential.",
    keyConcepts: [
      {
        title: "Load Average Decoded",
        text: "The three load average numbers (1, 5, 15 min) represent the average number of threads in RUNNABLE state (state R) or UNINTERRUPTIBLE SLEEP state (state D, usually waiting on disk/NFS I/O). A load of 8.0 on a 4-core machine means 200% saturation; on a 16-core machine, it is only 50% utilized."
      },
      {
        title: "Process States (R, S, D, Z)",
        text: "• R (Running/Runnable): Actively executing on CPU or waiting in run queue.\n• S (Interruptible Sleep): Waiting for an event or network socket (normal).\n• D (Uninterruptible Sleep): Process is inside a kernel syscall waiting for hardware I/O (disk, SAN, NFS). IT CANNOT BE KILLED, even with `kill -9`!\n• Z (Zombie): Process has terminated, but its parent process has not called `wait()` to collect its exit code. It holds no memory or CPU, only a PID table entry."
      },
      {
        title: "Memory & Linux OOM Killer",
        text: "Linux caches disk reads into RAM (`buff/cache`). Never look at 'free' memory; look at 'available' memory in `free -m`. When memory and swap are completely exhausted, the kernel invokes the OOM Killer, checks process `oom_score`, and sends `SIGKILL` to the most memory-intensive process."
      }
    ],
    commands: [
      { cmd: "uptime", desc: "Display current system uptime, logged-in user count, and 1/5/15-minute load averages" },
      { cmd: "top -b -n 1 | head -n 25", desc: "Capture real-time CPU, RAM, and process table snapshot in non-interactive batch mode" },
      { cmd: "ps aux --sort=-%cpu | head -n 10", desc: "Identify top 10 CPU-consuming processes across the entire server" },
      { cmd: "ps aux --sort=-%mem | head -n 10", desc: "Identify top 10 memory-consuming processes across the server" },
      { cmd: "free -m -h", desc: "Show RAM and swap usage, buffer cache, and truly available memory in human units" },
      { cmd: "vmstat 1 5", desc: "Virtual memory statistics: monitor run queue (r), blocked processes (b), paging (si/so), and I/O wait (wa)" },
      { cmd: "dmesg -T | grep -iE 'oom|kill'", desc: "Inspect kernel ring buffer for timestamps of Out-Of-Memory process termination" }
    ],
    realWorldScenario: {
      title: "Scenario 3: Server Freezes with High Load Average but CPU is 95% Idle",
      problem: "Load average spikes to 42 on an 8-core server. However, CPU utilization shows `95% id` (idle) and `78% wa` (I/O wait).",
      steps: [
        "Run `vmstat 1 5`. Inspect the `b` (blocked processes) and `wa` (I/O wait) columns.",
        "High `wa` means processes are waiting on storage (disk read/write or hanging NFS mount).",
        "Run `iostat -xz 1 5`. Check the `%util` and `await` columns. If `%util` is near 100%, disk hardware is saturated.",
        "Run `iotop -oP` to see which exact PID is flooding disk throughput.",
        "Check `/var/log/messages` or `dmesg -T` for disk controller timeouts, filesystem aborts, or unreachable NFS servers."
      ]
    },
    interviewQuestions: [
      {
        q: "Can you kill a process in 'D' (Uninterruptible Sleep) state using `kill -9`?",
        a: "No! A process in 'D' state is suspended in a kernel system call waiting for hardware I/O to complete. The kernel will not deliver signals (including SIGKILL 9) to a process in D-state until the hardware I/O completes. If the underlying disk or NFS share never responds, the only way to clear it is to fix the storage link or reboot the server."
      },
      {
        q: "How do you remove Zombie processes from a server?",
        a: "Zombies are already dead and do not consume CPU or RAM. You cannot kill them with `kill -9`. You must notify the parent process to reap it by sending `kill -CHLD <PPID>`. If the parent application is stuck, restart the parent service, which transfers the zombies to PID 1 (systemd), which immediately reaps them."
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
    description: "In modern RHEL 7/8/9, systemd manages system initialization, background daemons, and system timers. Support engineers must know how to inspect unit dependencies, troubleshoot boot loops, and recover failed services.",
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
    description: "Align your experience directly with the questions hiring managers ask for Senior Technical Support and Systems Administrator roles.",
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

// 2. 20 MULTIPLE CHOICE QUESTIONS (MCQs) WITH ENTERPRISE MARKING SCHEME (+2 Correct, -0.5 Wrong)
const quizData = [
  {
    id: 1,
    q: "You deleted a 25GB log file using 'rm /var/log/app.log', but 'df -h' still shows the partition at 100% full. What command helps you identify the process keeping the space locked?",
    options: [
      "du -sh /var/log/*",
      "lsof | grep '(deleted)'",
      "fuser -m /var/log",
      "systemctl restart rsyslog"
    ],
    answer: 1,
    explanation: "When a process still has an open file handle, the Linux kernel keeps the disk blocks allocated even if unlinked from directory tree. 'lsof | grep (deleted)' identifies the PID holding the descriptor."
  },
  {
    id: 2,
    q: "A server shows a 1-minute load average of 24.0 on an 8-core CPU server. However, running 'top' reveals CPU idle at 94% and I/O wait ('%wa') at 78%. What is the bottleneck?",
    options: [
      "CPU is overloaded by too many multithreaded calculation loops",
      "Processes are blocked in Uninterruptible Sleep (D-state) waiting on slow or saturated storage/disk I/O",
      "The Linux Kernel OOM killer is purging processes",
      "Network bandwidth is exhausted by incoming DDoS traffic"
    ],
    answer: 1,
    explanation: "Linux load average accounts for both running processes (R) and processes in uninterruptible sleep (D state). High I/O wait ('wa') with idle CPU means tasks are hung waiting on disk/SAN/NFS operations."
  },
  {
    id: 3,
    q: "How can you terminate a process that is currently in 'D' (Uninterruptible Sleep) state?",
    options: [
      "kill -9 <PID>",
      "kill -15 <PID>",
      "pkill -f <process_name>",
      "You cannot kill it with signals; you must resolve the hanging I/O or reboot the system"
    ],
    answer: 3,
    explanation: "D-state processes are waiting inside a kernel system call for hardware. The kernel blocks all signals—including SIGKILL 9—until the hardware call returns."
  },
  {
    id: 4,
    q: "Which command dynamically expands an XFS filesystem after extending the underlying LVM Logical Volume?",
    options: [
      "resize2fs /dev/mapper/vg_data-lv_app",
      "xfs_growfs /mountpoint",
      "xfs_repair -e /dev/mapper/vg_data-lv_app",
      "fsck.xfs /mountpoint"
    ],
    answer: 1,
    explanation: "'xfs_growfs' takes the mount point as an argument to expand an XFS filesystem. Remember: XFS cannot be reduced/shrunk!"
  },
  {
    id: 5,
    q: "What is the primary difference between 'systemctl enable' and 'systemctl start'?",
    options: [
      "'enable' starts the service immediately; 'start' configures it for reboot",
      "'enable' creates a symlink in systemd targets for boot persistence; 'start' launches the process right now in memory",
      "'enable' reloads the configuration file, whereas 'start' runs unit tests",
      "They are identical commands in RHEL 8 and 9"
    ],
    answer: 1,
    explanation: "'start' modifies running state; 'enable' creates symlinks under /etc/systemd/system/*.wants/ so systemd knows to launch it during target activation upon reboot."
  },
  {
    id: 6,
    q: "A user tries to save a file and gets 'No space left on device', but 'df -h' reports that only 45% of disk space is utilized. What is the most likely cause?",
    options: [
      "The filesystem is out of Inodes (100% Inode utilization)",
      "The user has exceeded their CPU quota in cgroups",
      "SELinux is blocking writes due to wrong booleans",
      "The /etc/fstab file is corrupted"
    ],
    answer: 0,
    explanation: "Every file requires an Inode pointer. If a partition has millions of tiny files (like session files or mail queues), it can consume all Inodes (df -i at 100%) even if gigabytes of physical storage remain."
  },
  {
    id: 7,
    q: "What does setting the SGID (Set Group ID) permission bit on a directory do?",
    options: [
      "Allows any user to execute scripts inside that directory as root",
      "Forces all newly created files in that directory to inherit the directory's group ownership",
      "Prevents users from deleting other users' files in that directory",
      "Restricts the directory to read-only access"
    ],
    answer: 1,
    explanation: "SGID on a directory (chmod 2770) ensures that collaborative teams have shared ownership: newly created files automatically inherit the group of the parent directory."
  },
  {
    id: 8,
    q: "Which command shows listening TCP/UDP sockets with numeric port numbers and their corresponding process IDs without slow DNS lookups?",
    options: [
      "netstat -a",
      "ss -tulnp",
      "lsof -i",
      "ip route show"
    ],
    answer: 1,
    explanation: "'ss -tulnp' (TCP, UDP, Listening, Numeric, Process) is the high-performance modern replacement for netstat in Enterprise Linux."
  },
  {
    id: 9,
    q: "In RHEL 8/9, how do you permanently open TCP port 8080 in firewalld and apply it immediately without dropping active sessions?",
    options: [
      "iptables -A INPUT -p tcp --dport 8080 -j ACCEPT",
      "firewall-cmd --permanent --add-port=8080/tcp && firewall-cmd --reload",
      "systemctl restart firewalld --port=8080",
      "firewall-cmd --zone=public --open-port=8080"
    ],
    answer: 1,
    explanation: "Using '--permanent' writes the rule to XML disk configuration, and 'firewall-cmd --reload' applies it dynamically without disrupting existing active connections."
  },
  {
    id: 10,
    q: "A web server returns 403 Forbidden after moving its DocumentRoot to /data/www. Permissions are 755 (apache:apache). What SELinux command restores the correct file contexts?",
    options: [
      "setenforce 0",
      "semanage fcontext -a -t httpd_sys_content_t '/data/www(/.*)?' && restorecon -Rv /data/www",
      "chmod -R 777 /data/www",
      "chcon -u root /data/www"
    ],
    answer: 1,
    explanation: "'semanage fcontext' registers the directory in the SELinux policy database, and 'restorecon -Rv' applies the 'httpd_sys_content_t' context to all files."
  },
  {
    id: 11,
    q: "What is the function of the Sticky Bit when applied to a directory like /tmp?",
    options: [
      "Prevents any file in the directory from being modified",
      "Ensures files can only be deleted or renamed by the file owner or root user",
      "Makes all files in the directory executable by everyone",
      "Automatically compresses old files after 24 hours"
    ],
    answer: 1,
    explanation: "Sticky Bit ('chmod +t' or '1777') ensures that in shared directories like /tmp, users cannot delete or overwrite other users' files."
  },
  {
    id: 12,
    q: "What parameter should you pass to the kernel line in GRUB2 to boot into an emergency shell to reset a lost root password in RHEL 8?",
    options: [
      "single",
      "init=/bin/bash or rd.break",
      "emergency.target",
      "rescue -root"
    ],
    answer: 1,
    explanation: "Appending 'rd.break' interrupts the boot process in the initramfs stage before root filesystem is mounted, allowing you to remount /sysroot as rw and change the root password."
  },
  {
    id: 13,
    q: "When looking at 'free -m', which column reflects the true amount of RAM available to launch new applications without paging into swap?",
    options: [
      "free",
      "available",
      "buff/cache",
      "shared"
    ],
    answer: 1,
    explanation: "Linux uses idle RAM for filesystem buffering ('buff/cache'). The 'available' column estimates the actual RAM that can be reclaimed immediately for new apps without swapping."
  },
  {
    id: 14,
    q: "Which command allows you to view historical CPU utilization metrics from previous days on a server configured with sysstat?",
    options: [
      "sar -u -f /var/log/sa/sa<day>",
      "dmesg --history",
      "top -H",
      "uptime --log"
    ],
    answer: 0,
    explanation: "'sar' (System Activity Reporter) reads daily binary log files under /var/log/sa/ to analyze historical CPU, RAM, and I/O spikes."
  },
  {
    id: 15,
    q: "What signal does 'kill -9 <PID>' send to a process?",
    options: [
      "SIGTERM (Graceful Termination Request)",
      "SIGKILL (Immediate Uncatchable Kernel Termination)",
      "SIGHUP (Hangup / Reload Configuration)",
      "SIGINT (Keyboard Interrupt)"
    ],
    answer: 1,
    explanation: "Signal 9 is SIGKILL, which is handled directly by the kernel and cannot be caught, ignored, or blocked by the user process."
  },
  {
    id: 16,
    q: "Why should you use filesystem UUIDs instead of '/dev/sdb1' in /etc/fstab?",
    options: [
      "UUIDs allow files to read twice as fast",
      "Device node paths can change dynamically during server reboots if controller scan order changes",
      "LVM does not support device names",
      "UUIDs are required by firewalld"
    ],
    answer: 1,
    explanation: "Kernel disk scanning is asynchronous; adding or removing disks can cause /dev/sdb to become /dev/sdc, causing boot failure or mounting the wrong volume if UUIDs are not used."
  },
  {
    id: 17,
    q: "Which command in NetworkManager displays the active connection profiles and hardware device link status?",
    options: [
      "nmcli device status",
      "ifconfig -a",
      "route -n",
      "ip link down"
    ],
    answer: 0,
    explanation: "'nmcli device status' provides an overview of network interfaces and their currently connected NetworkManager profiles."
  },
  {
    id: 18,
    q: "What command lets you attach to a running process and trace all of its kernel system calls in real time?",
    options: [
      "lsof -p <PID>",
      "strace -p <PID> -f",
      "gdb --status <PID>",
      "systemd-analyze blame"
    ],
    answer: 1,
    explanation: "'strace' intercepts and records system calls made by a process and the signals received, which is invaluable when an app is hanging."
  },
  {
    id: 19,
    q: "What is an Access Vector Cache (AVC) denial in Linux?",
    options: [
      "A hardware GPU crash",
      "An SELinux security audit event indicating an action was blocked or logged as a violation",
      "A failed network handshake in SSH",
      "A disk block read error reported by SMART"
    ],
    answer: 1,
    explanation: "AVC denials are generated by the SELinux subsystem when an operation violates mandatory access controls, logged in /var/log/audit/audit.log."
  },
  {
    id: 20,
    q: "What command permanently sets a boolean in SELinux so that the Apache web server can establish outbound network connections?",
    options: [
      "setsebool -P httpd_can_network_connect 1",
      "chmod +x /usr/sbin/httpd",
      "setenforce permissive",
      "firewall-cmd --add-service=http"
    ],
    answer: 0,
    explanation: "'setsebool -P' persists the boolean change across reboots. Setting 'httpd_can_network_connect 1' allows Apache/Nginx to proxy requests to backends."
  }
];

// 3. PRODUCTION SCENARIO SIMULATOR DRILLS (Multi-stage interactive problem solving)
const scenarioDrills = [
  {
    id: "drill-1",
    title: "Incident 1: Web Service Down (502 Bad Gateway / Connection Refused)",
    severity: "P1 Critical",
    alert: "PagerDuty Alert: Production Customer Portal is down. Load balancer reports 502 Bad Gateway to backend node 10.10.40.15:8080.",
    phases: [
      {
        question: "Step 1: You have SSH access to 10.10.40.15. What is the very first diagnostic command you run?",
        options: [
          { text: "reboot", feedback: "Wrong! Never reboot a production server blindly without identifying why the service crashed. You lose volatile memory and forensic logs.", nextPhase: 0 },
          { text: "systemctl status portal-app.service", feedback: "Correct! You immediately check service status. Output: 'Active: failed (Result: exit-code)'. Main PID 4210 terminated.", nextPhase: 1 },
          { text: "rm -rf /tmp/*", feedback: "Danger! Random deletion does not diagnose service state.", nextPhase: 0 },
          { text: "firewall-cmd --reload", feedback: "Premature. First verify if the application daemon is even running.", nextPhase: 0 }
        ]
      },
      {
        question: "Step 2: The service is in 'failed' state. How do you find the exact error message that caused the crash?",
        options: [
          { text: "journalctl -u portal-app.service -n 40 --no-pager", feedback: "Spot on! The logs reveal: 'java.net.BindException: Address already in use: :8080'.", nextPhase: 2 },
          { text: "cat /var/log/wtmp", feedback: "Incorrect. wtmp records logins, not application stderr.", nextPhase: 1 },
          { text: "ping localhost", feedback: "Pinging does not explain port binding errors.", nextPhase: 1 }
        ]
      },
      {
        question: "Step 3: Port 8080 is already in use by another process. How do you find which process has hijacked port 8080?",
        options: [
          { text: "ss -tulnp | grep :8080", feedback: "Excellent! You see PID 1890 (a rogue Python test script) is bound to 0.0.0.0:8080.", nextPhase: 3 },
          { text: "netstat -rn", feedback: "Incorrect. 'netstat -rn' checks routing table, not listening ports.", nextPhase: 2 },
          { text: "ls -l /proc", feedback: "Too generic.", nextPhase: 2 }
        ]
      },
      {
        question: "Step 4: You kill rogue PID 1890. What is your final action to restore production and verify health?",
        options: [
          { text: "systemctl start portal-app.service && curl -Iv http://localhost:8080/health", feedback: "Incident Resolved! Service starts cleanly, returns HTTP 200 OK. SLA restored within 8 minutes!", nextPhase: 4 },
          { text: "setenforce 0", feedback: "Do not weaken server security when the issue was an application port conflict.", nextPhase: 3 }
        ]
      }
    ]
  },
  {
    id: "drill-2",
    title: "Incident 2: Root Filesystem at 100% Disk Utilization",
    severity: "P2 High",
    alert: "Zabbix Alert: Host rhel-app-02: Disk space on '/' is at 99.8%. Cron jobs and database transactions are failing.",
    phases: [
      {
        question: "Step 1: You connect to the server. How do you safely find which top-level directory is consuming space without crossing into external mounts?",
        options: [
          { text: "du -xhd1 / | sort -hr | head -10", feedback: "Perfect! The '-x' flag prevents scanning separate mounts (like NFS or /boot). Output shows: 42GB in /var/log.", nextPhase: 1 },
          { text: "rm -rf /var/log/*", feedback: "Catastrophic! Deleting all logs wipes active system audit logs and can break running daemons.", nextPhase: 0 },
          { text: "fdisk -l", feedback: "fdisk shows partition table sizes, not filesystem directory consumption.", nextPhase: 0 }
        ]
      },
      {
        question: "Step 2: You navigate to /var/log and find 'audit/audit.log' is 38GB. A junior admin asks to run 'rm audit.log'. What do you do?",
        options: [
          { text: "Truncate it safely with '> /var/log/audit/audit.log' or rotate via logrotate", feedback: "Correct! Truncating ('> filename') zeroes the file size immediately without breaking open file descriptors held by auditd.", nextPhase: 2 },
          { text: "Run 'rm -f audit.log'", feedback: "Risk! The auditd process will continue writing to the unlinked file descriptor, meaning 'df -h' will still report 100% full!", nextPhase: 1 }
        ]
      },
      {
        question: "Step 3: What long-term preventative action (CAPA) must be implemented in the RCA report?",
        options: [
          { text: "Configure /etc/logrotate.d/audit with maxsize 1G, daily rotation, and 7-day retention", feedback: "Production Excellence! You created a permanent preventive control. Incident closed.", nextPhase: 3 },
          { text: "Disable auditd daemon", feedback: "Disabling security auditing fails PCI-DSS and SOC2 regulatory compliance.", nextPhase: 2 }
        ]
      }
    ]
  }
];

// 4. ENTERPRISE HANDS-ON PROJECTS (Showcase in interviews)
const enterpriseProjects = [
  {
    title: "Project 1: High-Availability Web Cluster with HAProxy & Keepalived",
    level: "Advanced Architecture",
    tags: ["RHEL 8", "HAProxy", "Keepalived", "VRRP", "Firewalld"],
    summary: "Architected a dual-node active-passive load balancing cluster ensuring zero downtime for backend Apache/Nginx web tiers.",
    deliverables: [
      "Configured Keepalived with Virtual Router Redundancy Protocol (VRRP) managing a shared Virtual IP (VIP 10.10.40.100).",
      "Deployed HAProxy with round-robin balancing, active health checks (`check inter 2000 fall 3 rise 2`), and sticky session cookies.",
      "Configured firewalld VRRP protocol pass-through (`firewall-cmd --add-protocol=vrrp --permanent`).",
      "Tested failover: simulated primary node crash by stopping keepalived; backup node transitioned to MASTER state within 300ms without dropped packets."
    ]
  },
  {
    title: "Project 2: Enterprise Storage Expansion & LVM Disaster Recovery Runbook",
    level: "Systems Administration",
    tags: ["LVM", "XFS", "SAN Storage", "Multipath", "fstab Recovery"],
    summary: "Automated zero-downtime online storage expansion across 50+ enterprise virtual machines and standardized emergency recovery.",
    deliverables: [
      "Partitioned new SAN LUNs using `parted` GPT labels, initialized Physical Volumes with `pvcreate`, and extended Volume Groups.",
      "Performed live volume expansions using `lvextend -r` without unmounting critical database filesystems.",
      "Implemented UUID mounting policies across all enterprise servers to eliminate device node name drifting during SCSI rescan.",
      "Authored disaster recovery runbook for recovering unbootable servers stuck in emergency mode due to corrupt `/etc/fstab` mounts."
    ]
  },
  {
    title: "Project 3: Production Log Triage & Automated Incident Remediation",
    level: "Observability & SRE",
    tags: ["Bash", "Journalctl", "Cron", "Logrotate", "Slack Webhooks"],
    summary: "Built automated monitoring scripts that proactively scan kernel logs for OOM events and disk threshold warnings before SLA breach.",
    deliverables: [
      "Created a modular Bash diagnostic daemon that scans `/var/log/messages` and `dmesg -T` for hardware and kernel errors.",
      "Automated automated memory and swap threshold alerts when available RAM drops below 10%.",
      "Standardized enterprise `/etc/logrotate.d/` policies to compress logs with gzip and retain 30 days of forensic audit logs.",
      "Reduced P1 log-related disk full outages by 90% across production clusters."
    ]
  }
];
