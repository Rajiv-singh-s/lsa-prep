// Complete Enterprise Dataset: 35 Modular Units across Enterprise Levels, 20 MCQs with Marking Scheme, 20 Incidents, and 13 Projects
const linuxCurriculum = [
  {
    "id": "mod-01",
    "levelId": "L00",
    "category": "core",
    "categoryLabel": "Computer and Operating System Fundamentals",
    "title": "1. Computers and hardware",
    "icon": "fa-solid fa-laptop",
    "level": "Beginner",
    "lead": "The physical building blocks of every server: processor, memory, storage, firmware and devices, and how they cooperate when a machine starts.",
    "description": "The physical building blocks of every server: processor, memory, storage, firmware and devices, and how they cooperate when a machine starts.",
    "keyConcepts": [
      {
        "title": "CPU, memory and storage: what a computer is made of",
        "text": "A computer is a machine that follows instructions (a program) to transform data. Every server you will administer, from a laptop-sized lab VM to a rack of database hosts, is built from the same few parts.\n\n The processor (CPU)\nThe CPU (Central Processing Unit) executes instructions: add these numbers, compare these values, ..."
      },
      {
        "title": "Firmware, devices and what happens at power-on",
        "text": "When you press the power button, RAM is empty and the CPU knows nothing about Linux. Something must bring the machine to life. That something is firmware.\n\n Firmware\nFirmware is software stored on a chip on the motherboard (flash memory), not on the disk. It runs first, tests the hardware (the POST, Power-On Self-Test), ini..."
      }
    ],
    "commands": [
      {
        "cmd": "nproc",
        "desc": "Print the number of logical CPUs available to the current process"
      },
      {
        "cmd": "free -h",
        "desc": "Show RAM and swap totals and usage in human-readable binary units (Gi, Mi)"
      },
      {
        "cmd": "/sys/firmware/efi",
        "desc": "Directory present only when the system booted via UEFI"
      },
      {
        "cmd": "lspci",
        "desc": "List devices on the PCI/PCIe bus (controllers, NICs, GPUs)"
      }
    ],
    "realWorldScenario": {
      "title": "After adding a second network card to a server, Linux shows no new interface.",
      "problem": "Production alert: investigation required in computers and hardware.",
      "steps": [
        "Evidence: `lspci | grep -i ethernet` — is the card detected on the bus at all?",
        "If listed, run `lspci -k` and look for a missing \"Kernel driver in use\" line; check `dmesg` for firmware or driver errors.",
        "Hypothesis: the card is detected but no driver supports it (or it needs firmware files); if not listed at all, it is a hardware/seating/BIOS setting issue.",
        "Fix by installing the vendor-supported driver or firmware package, or re-seating/enabling the card via the BMC; validate with `ip link` showing the new interface."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between RAM and storage?",
        "a": "RAM is fast, volatile working memory the CPU uses for running programs and their data; it is cleared on power loss. Storage (SSD, HDD, NVMe, network disks) is slower but persistent and much larger. Programs are loaded from storage into RAM to run, and data that must survive is written back to storage."
      },
      {
        "q": "What is the difference between BIOS and UEFI?",
        "a": "Both are firmware that initialise hardware and start a boot loader. BIOS is the legacy design that loads code from the disk's MBR and is limited with large disks. UEFI loads boot loader files from an EFI System Partition, works with GPT disks, stores boot entries in NVRAM and supports Secure Boot."
      }
    ]
  },
  {
    "id": "mod-02",
    "levelId": "L00",
    "category": "core",
    "categoryLabel": "Computer and Operating System Fundamentals",
    "title": "2. Operating systems and kernels",
    "icon": "fa-solid fa-laptop",
    "level": "Beginner",
    "lead": "What an operating system is for, the special role of the kernel, and how ordinary programs ask the kernel for help through system calls.",
    "description": "What an operating system is for, the special role of the kernel, and how ordinary programs ask the kernel for help through system calls.",
    "keyConcepts": [
      {
        "title": "What an operating system does: kernel space and user space",
        "text": "Hardware alone is useless to most people: nobody wants to send electrical signals to a disk controller to save a document. An operating system (OS) is the software layer that manages the hardware and offers simple, safe services to programs and people. Linux, Windows and macOS are operating systems.\n\n The jobs of an operating syste..."
      },
      {
        "title": "Programs, processes and system calls",
        "text": " Program versus process\nA program is a file on storage containing instructions, for example `/usr/bin/ls`. A process is a program that is running: the kernel has loaded it into memory and is scheduling it on the CPU. One program can have many processes at once; ten users running `bash` means ten bash processes from one prog..."
      }
    ],
    "commands": [
      {
        "cmd": "uname -r",
        "desc": "Print the running kernel release (e.g. 5.14.0-570.12.1.el9_6.x86_64)"
      },
      {
        "cmd": "uname -m",
        "desc": "Print the machine hardware architecture (x86_64, aarch64)"
      },
      {
        "cmd": "ps -ef",
        "desc": "List every process in full format (UID, PID, PPID, start time, command)"
      },
      {
        "cmd": "ps aux",
        "desc": "BSD-style list of every process with CPU and memory usage"
      }
    ],
    "realWorldScenario": {
      "title": "A junior admin restarts a service and then says the process \"disappeared\" because PID 3120 from their notes no longer exists.",
      "problem": "Production alert: investigation required in operating systems and kernels.",
      "steps": [
        "Evidence: `pgrep -a <service-binary>` or `systemctl status <service>` shows the current Main PID.",
        "Hypothesis: a restart stops the old process and starts a new one with a new PID.",
        "Explain: PIDs are assigned at process creation and are reused only after a process ends; never record them as permanent identifiers.",
        "Validate: the service is active with a different Main PID; refer to processes by service name instead."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the kernel and how does it differ from the operating system?",
        "a": "The kernel is the privileged core that manages CPU scheduling, memory, devices, filesystems, networking and security. The operating system is the kernel plus user-space tools and libraries (shell, utilities, services) that make the system usable."
      },
      {
        "q": "What is the difference between a program and a process?",
        "a": "A program is an executable file on disk. A process is a running instance with its own PID, memory, owner and open files. One program can run as many processes."
      }
    ]
  },
  {
    "id": "mod-03",
    "levelId": "L00",
    "category": "core",
    "categoryLabel": "Computer and Operating System Fundamentals",
    "title": "3. Unix, Linux, GNU and open source",
    "icon": "fa-solid fa-laptop",
    "level": "Beginner",
    "lead": "Where Linux came from, the Unix ideas it inherited, the GNU project that supplied its tools, and how open-source licences shape the enterprise software you will run.",
    "description": "Where Linux came from, the Unix ideas it inherited, the GNU project that supplied its tools, and how open-source licences shape the enterprise software you will run.",
    "keyConcepts": [
      {
        "title": "From Unix to Linux: history and the Unix philosophy",
        "text": " Unix\nUnix was created at AT&T Bell Labs starting in 1969 by Ken Thompson, Dennis Ritchie and colleagues. In the early 1970s it was rewritten in the new C programming language, which made it portable to different hardware, a radical idea at the time. Universities and companies adopted it, producing many variants: BSD (from ..."
      },
      {
        "title": "GNU, licences and how open source is developed",
        "text": " The GNU project\nIn 1983 Richard Stallman launched the GNU project (\"GNU's Not Unix\") to build a complete, free Unix-like operating system. By 1991 GNU had produced most of the pieces — the GCC compiler, the Bash shell, coreutils (`ls`, `cp`, `mv`), the C library glibc — but its own kernel was not ready. Linus Torva..."
      }
    ],
    "commands": [
      {
        "cmd": "|",
        "desc": "Pipe: send the standard output of the left command to the standard input of the right command"
      },
      {
        "cmd": ">",
        "desc": "Redirect standard output to a file (overwrites)"
      },
      {
        "cmd": "--queryformat '%{LICENSE}\\n'",
        "desc": "Print the licence field from an installed RPM"
      },
      {
        "cmd": "/usr/share/licenses/PKG",
        "desc": "Directory holding the licence texts shipped with a package (RHEL family)"
      }
    ],
    "realWorldScenario": {
      "title": "A developer wants to patch a bug in an RPM-installed open-source library directly on production servers by editing its files.",
      "problem": "Production alert: investigation required in unix, linux, gnu and open source.",
      "steps": [
        "Evidence: identify the package that owns the file with `rpm -qf <file>` and check whether the bug is already fixed in an update or upstream.",
        "Hypothesis: a local edit will be overwritten by the next update and is unsupported by the vendor.",
        "Fix: install the vendor errata if available, otherwise report the bug to the vendor/upstream and, if urgent, build a properly versioned package through change control.",
        "Validate: `rpm -V <package>` shows no unexpected modifications on production."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Is Linux Unix?",
        "a": "Linux is a Unix-like kernel written independently by Linus Torvalds from 1991, largely POSIX-compatible but not derived from AT&T code and not certified UNIX. It follows Unix design ideas and runs Unix-style tools."
      },
      {
        "q": "Why do some people say GNU/Linux?",
        "a": "Because a typical system combines the Linux kernel with essential GNU components such as glibc, Bash, coreutils and GCC. \"Linux\" alone strictly names the kernel."
      }
    ]
  },
  {
    "id": "mod-04",
    "levelId": "L00",
    "category": "core",
    "categoryLabel": "Computer and Operating System Fundamentals",
    "title": "4. Linux distributions and the enterprise ecosystem",
    "icon": "fa-solid fa-laptop",
    "level": "Beginner",
    "lead": "What a distribution is, how the RHEL family relates to Fedora, CentOS Stream, Rocky and AlmaLinux, how Debian, Ubuntu and SUSE compare, and why support lifecycles drive enterprise decisions.",
    "description": "What a distribution is, how the RHEL family relates to Fedora, CentOS Stream, Rocky and AlmaLinux, how Debian, Ubuntu and SUSE compare, and why support lifecycles drive enterprise decisions.",
    "keyConcepts": [
      {
        "title": "Distributions and families: RHEL, Fedora, CentOS Stream, Rocky, Alma, Debian, Ubuntu, SUSE",
        "text": "A Linux distribution (\"distro\") is a complete operating system assembled from the Linux kernel, GNU tools, libraries, a package manager, an installer, default configuration, documentation and a release and support policy. Thousands of upstream projects are integrated, tested and shipped together. Distributions differ mostly in packa..."
      },
      {
        "title": "Support lifecycles and choosing an enterprise distribution",
        "text": " Releases\nEnterprise distributions publish major releases (RHEL 8, 9, 10) every few years. A major release may change default tools and remove old features, so upgrading between majors is a project. Within a major release come minor releases (RHEL 9.4, 9.5, 9.6), roughly every six months, which add hardware support and features..."
      }
    ],
    "commands": [
      {
        "cmd": "ID=",
        "desc": "/etc/os-release key: the distribution identifier"
      },
      {
        "cmd": "ID_LIKE=",
        "desc": "/etc/os-release key: the family the distribution is compatible with"
      },
      {
        "cmd": "dnf check-update",
        "desc": "List packages with available updates (exit status 100 when updates exist)"
      },
      {
        "cmd": "dnf updateinfo summary",
        "desc": "Count applicable security, bug fix and enhancement advisories"
      }
    ],
    "realWorldScenario": {
      "title": "An audit flags 40 servers as \"unsupported OS\". The team believes they are fine because \"they still work\".",
      "problem": "Production alert: investigation required in linux distributions and the enterprise ecosystem.",
      "steps": [
        "Evidence: collect `/etc/os-release` from each server (Ansible or a simple SSH loop).",
        "Hypothesis: servers run EOL releases (for example CentOS Linux 7 or Ubuntu 18.04 without ESM).",
        "Remediate: plan migration to supported releases (RHEL/Rocky/Alma 9 or 10, Ubuntu 24.04), or buy extended support as a temporary bridge with a dated exit plan.",
        "Validate: re-run the inventory and confirm every server is on a release with a future EOL date."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the relationship between Fedora, CentOS Stream and RHEL?",
        "a": "Fedora is the fast-moving community distribution where features land first; CentOS Stream is the continuously delivered branch just ahead of the next RHEL minor release; RHEL is the supported product built from it."
      },
      {
        "q": "What happens when a distribution reaches end of life?",
        "a": "The vendor stops shipping security and bug fixes. The system keeps running but accumulates unpatched vulnerabilities, fails compliance checks and usually loses vendor and application support."
      }
    ]
  },
  {
    "id": "mod-05",
    "levelId": "L00",
    "category": "core",
    "categoryLabel": "Computer and Operating System Fundamentals",
    "title": "5. Networks, servers, virtualization and cloud basics",
    "icon": "fa-solid fa-laptop",
    "level": "Beginner",
    "lead": "How clients reach servers over IP networks using addresses, names and ports, and how virtual machines, hypervisors and cloud instances host the servers you will administer in production and non-production environments.",
    "description": "How clients reach servers over IP networks using addresses, names and ports, and how virtual machines, hypervisors and cloud instances host the servers you will administer in production and non-production environments.",
    "keyConcepts": [
      {
        "title": "Clients, servers, IP addresses, DNS and ports",
        "text": " Clients and servers\nA server is a computer (or a program) that provides a service to others: web pages, databases, file shares, authentication. A client is the program that asks for the service, such as your browser or the `ssh` command. The same machine can be a client for one service and a server for another. In data cen..."
      },
      {
        "title": "Virtualization, cloud instances and production environments",
        "text": " Virtual machines\nA virtual machine (VM) is a software-defined computer: it has virtual CPUs, virtual RAM, virtual disks and virtual network cards, and runs a complete operating system called the guest. The real physical machine is the host. One host can run dozens of VMs, isolating them from each other. VMs made it cheap t..."
      }
    ],
    "commands": [
      {
        "cmd": "ip -br addr",
        "desc": "Brief list of interfaces, their state and addresses"
      },
      {
        "cmd": "ip route",
        "desc": "Show the routing table, including the default gateway"
      },
      {
        "cmd": "systemd-detect-virt",
        "desc": "Print the virtualization technology in use (kvm, vmware, oracle, microsoft, none)"
      },
      {
        "cmd": "systemd-detect-virt -c",
        "desc": "Detect only container environments"
      }
    ],
    "realWorldScenario": {
      "title": "An administrator restarts a database \"in staging\" but the payments team immediately reports a production outage.",
      "problem": "Production alert: investigation required in networks, servers, virtualization and cloud basics.",
      "steps": [
        "Evidence: shell history and `hostnamectl` on the affected host show it was pay-db-prod-01, not the staging server.",
        "Root cause: the admin had several SSH sessions open and typed into the wrong terminal; nothing distinguished production.",
        "Remediation: restore service following the incident process, then add safeguards: coloured or tagged prompts for production, login banners, separate accounts or jump hosts, and change-control approval for restarts.",
        "Validate: production prompts are visibly different and the change process records host names before execution."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between an IP address and a port?",
        "a": "The IP address identifies the host (network interface); the port identifies which service on that host receives the traffic. A connection uses both, e.g. 10.0.0.5:443."
      },
      {
        "q": "What is the difference between a type 1 and a type 2 hypervisor?",
        "a": "Type 1 runs directly on hardware (KVM, ESXi, Hyper-V) and is used in data centres and clouds; type 2 runs as an application on a desktop OS (VirtualBox, VMware Workstation) and suits labs."
      }
    ]
  },
  {
    "id": "mod-06",
    "levelId": "L02",
    "category": "core",
    "categoryLabel": "Command-Line Mastery",
    "title": "6. Shell basics and navigation",
    "icon": "fa-solid fa-terminal",
    "level": "Intermediate",
    "lead": "How the shell reads a command line, how to get help offline, and how to move around the directory tree with absolute paths, relative paths and wildcards.",
    "description": "How the shell reads a command line, how to get help offline, and how to move around the directory tree with absolute paths, relative paths and wildcards.",
    "keyConcepts": [
      {
        "title": "The shell, the prompt, getting help and moving around (pwd, cd, ls, man)",
        "text": "A shell is an ordinary user-space program that reads a line of text, splits it into words, expands special characters and then asks the kernel to run a program. On RHEL the default interactive shell is Bash (`/bin/bash`, which is really `/usr/bin/bash`). A terminal (or SSH session) only carries characters back and forth; the s..."
      },
      {
        "title": "Absolute and relative paths, and wildcards (globbing)",
        "text": "A path names a location in the single directory tree. An absolute path starts with `/` and is resolved from the root directory, so it means the same thing no matter where you are: `/etc/ssh/sshd_config`. A relative path does not start with `/` and is resolved from the current working directory: if you are in `/etc`, then `ssh/..."
      }
    ],
    "commands": [
      {
        "cmd": "ls -l",
        "desc": "Long format: type+permissions, link count, owner, group, size, mtime, name"
      },
      {
        "cmd": "ls -a",
        "desc": "Include dot files (-A omits the . and .. entries)"
      },
      {
        "cmd": "*",
        "desc": "Any string (including empty); does not match a leading dot by default"
      },
      {
        "cmd": "?",
        "desc": "Exactly one character"
      }
    ],
    "realWorldScenario": {
      "title": "A cleanup script runs `rm /data/spool/*` and fails with `/usr/bin/rm: Argument list too long`.",
      "problem": "Production alert: investigation required in shell basics and navigation.",
      "steps": [
        "Evidence: count the files with `ls -f /data/spool | wc -l` (hundreds of thousands).",
        "Hypothesis: the shell expanded the glob into more argument bytes than ARG_MAX allows, so execve() failed before rm even started.",
        "Fix: let find walk the directory without building a giant argument list: `find /data/spool -maxdepth 1 -type f -delete` (preview first without -delete).",
        "Validate: re-count with `ls -f /data/spool | wc -l` and check the job log."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Why is cd a shell builtin rather than a program in /usr/bin?",
        "a": "The current working directory is a per-process attribute. An external program runs in a child process, so changing its directory would not affect the parent shell. cd therefore has to execute inside the shell process itself."
      },
      {
        "q": "Who expands wildcards such as *.log, the shell or the command?",
        "a": "The shell. It replaces the pattern with a sorted list of matching names before executing the command, so the program only sees ordinary arguments. That is why quoting the pattern passes it unexpanded to tools like find that do their own matching."
      }
    ]
  },
  {
    "id": "mod-07",
    "levelId": "L02",
    "category": "core",
    "categoryLabel": "Command-Line Mastery",
    "title": "7. Working with files",
    "icon": "fa-solid fa-terminal",
    "level": "Intermediate",
    "lead": "Create, copy, move, rename and delete files and directories safely, then inspect them with cat, less, head, tail, file and stat.",
    "description": "Create, copy, move, rename and delete files and directories safely, then inspect them with cat, less, head, tail, file and stat.",
    "keyConcepts": [
      {
        "title": "Creating, copying, moving and deleting (mkdir, touch, cp, mv, rm, rmdir)",
        "text": "These six commands are the core of everyday file management and an explicit RHCSA objective (\"create, delete, copy, and move files and directories\").\n\nmkdir creates directories. `mkdir a/b/c` fails if `a/b` does not exist; `mkdir -p a/b/c` creates every missing parent and does not complain if the target already exists, which makes..."
      },
      {
        "title": "Viewing and identifying files (cat, less, more, head, tail, file, stat)",
        "text": "Linux does not care about file extensions; a file is a sequence of bytes, and different tools show those bytes in different ways.\n\ncat (concatenate) writes one or more files to standard output. It is ideal for short files and for joining files (`cat part1 part2 > whole`). `cat -n` numbers lines and `cat -A` makes invisible characters ..."
      }
    ],
    "commands": [
      {
        "cmd": "mkdir -p",
        "desc": "Create missing parents; no error if the directory already exists"
      },
      {
        "cmd": "cp -r",
        "desc": "Copy directories recursively"
      },
      {
        "cmd": "cat -A",
        "desc": "Show non-printing characters: $ line end, ^I tab, ^M carriage return"
      },
      {
        "cmd": "less +F",
        "desc": "Follow mode inside less (Ctrl+C returns to normal browsing)"
      }
    ],
    "realWorldScenario": {
      "title": "An engineer runs `tail -f /var/log/app/app.log` overnight to watch for errors, but after midnight no new lines appear even though the application is busy.",
      "problem": "Production alert: investigation required in working with files.",
      "steps": [
        "Evidence: `ls -li /var/log/app/` shows a new app.log with a different inode and app.log-20261009 holding the old one.",
        "Hypothesis: logrotate renamed the file at midnight; tail -f keeps following the old file descriptor (the renamed file), which no longer grows.",
        "Fix: use `tail -F` (follow by name, retry) so tail re-opens the new app.log after rotation.",
        "Validate: run `logrotate -f` on a test config or wait for rotation and confirm tail prints \"has been replaced; following new file\"."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Why is mv of a 50 GB file instantaneous in one case and slow in another?",
        "a": "Within the same filesystem mv calls rename(), which only changes directory entries; the data blocks are untouched. Across filesystems rename() fails with EXDEV, so mv copies all the data and then deletes the source."
      },
      {
        "q": "What is the difference between tail -f and tail -F?",
        "a": "tail -f follows the open file descriptor, so after a rotation it keeps watching the renamed old file. tail -F follows the name: it notices the name now points to a new inode and re-opens it, and it retries if the file is temporarily missing."
      }
    ]
  },
  {
    "id": "mod-08",
    "levelId": "L02",
    "category": "core",
    "categoryLabel": "Command-Line Mastery",
    "title": "8. Searching and text tools",
    "icon": "fa-solid fa-terminal",
    "level": "Intermediate",
    "lead": "Locate files by name and attributes with find and locate, search content with grep and regular expressions, and reshape text with wc, sort, uniq, cut, tr and paste.",
    "description": "Locate files by name and attributes with find and locate, search content with grep and regular expressions, and reshape text with wc, sort, uniq, cut, tr and paste.",
    "keyConcepts": [
      {
        "title": "Finding files and searching content (find, locate, grep)",
        "text": "There are two different questions: \"where is a file?\" and \"which files contain this text?\". `find` and `locate` answer the first, `grep` the second. Both are RHCSA skills (\"use grep and regular expressions to analyze text\", \"create, delete, copy and move files\").\n\nfind walks the directory tree right now and tests every entry..."
      },
      {
        "title": "Text processing: wc, sort, uniq, cut, tr and paste",
        "text": "Unix text tools each do one small job on lines of text and are combined with pipes (`|`, covered fully in Module 4). Learning six of them lets you answer most \"how many / which / top N\" questions directly from logs and config files.\n\nwc counts: `-l` lines, `-w` words, `-c` bytes, `-m` characters. `wc -l < file` prints just the number ..."
      }
    ],
    "commands": [
      {
        "cmd": "find -name",
        "desc": "Match base name with a glob (case sensitive / insensitive)"
      },
      {
        "cmd": "find -type f|d|l",
        "desc": "Restrict to regular files, directories or symlinks"
      },
      {
        "cmd": "sort -n",
        "desc": "Numeric / human-size / version ordering"
      },
      {
        "cmd": "sort -t: -k3,3n",
        "desc": "Sort by field 3 only, numerically, with : as separator"
      }
    ],
    "realWorldScenario": {
      "title": "A report built with `cut -d: -f3 /etc/passwd | sort | tail -1` claims the highest UID on the system is 999, but `id bob` shows uid 1001.",
      "problem": "Production alert: investigation required in searching and text tools.",
      "steps": [
        "Evidence: `cut -d: -f3 /etc/passwd | sort | tail -n 5` shows 999 sorted after 65534 and 1001.",
        "Hypothesis: sort compared the UIDs as text, so \"999\" sorts after \"65534\", which sorts after \"1001\".",
        "Fix: sort numerically: `cut -d: -f3 /etc/passwd | sort -n | tail -1` (exclude 65534 nobody if needed).",
        "Validate: the result now shows the true numeric maximum."
      ]
    },
    "interviewQuestions": [
      {
        "q": "When would you use locate instead of find, and what is its main limitation?",
        "a": "locate is for fast name lookups across the whole system because it searches a database rather than walking the disk. Its limitation is staleness: the database is only as fresh as the last updatedb run, and pruned paths are never indexed."
      },
      {
        "q": "Why do people write sort | uniq -c instead of just uniq -c?",
        "a": "uniq only merges adjacent duplicate lines. Sorting first brings identical lines together so the counts are correct."
      }
    ]
  },
  {
    "id": "mod-09",
    "levelId": "L02",
    "category": "core",
    "categoryLabel": "Command-Line Mastery",
    "title": "9. Pipes, redirection, exit codes and chaining",
    "icon": "fa-solid fa-terminal",
    "level": "Intermediate",
    "lead": "Control where a command reads input and writes output and errors, connect commands with pipes, tee and xargs, and use exit codes with &&, || and ; to build reliable one-liners.",
    "description": "Control where a command reads input and writes output and errors, connect commands with pipes, tee and xargs, and use exit codes with &&, || and ; to build reliable one-liners.",
    "keyConcepts": [
      {
        "title": "Standard streams and redirection (stdin, stdout, stderr, >, >>, 2>, 2>&1, <)",
        "text": "Every process starts with three open file descriptors (FDs), small integers that refer to open files:\n\n- 0 = standard input (stdin) - where the program reads input; by default the keyboard/terminal\n- 1 = standard output (stdout) - normal results; by default the terminal\n- 2 = standard error (stderr) - error and diagnostic ..."
      },
      {
        "title": "Pipes, tee, xargs, exit codes and command chaining (|, $?, &&, ||, ;)",
        "text": "A pipe (`|`) connects the stdout of one command to the stdin of the next: `ps aux | grep sshd`. Both programs run at the same time; data streams through a small kernel buffer, so pipelines handle gigabytes without temporary files. Only stdout travels through the pipe; stderr still goes to the terminal unless you add `2>&1` bef..."
      }
    ],
    "commands": [
      {
        "cmd": ">",
        "desc": "Redirect stdout, truncating the file first"
      },
      {
        "cmd": ">>",
        "desc": "Redirect stdout, appending"
      },
      {
        "cmd": "|",
        "desc": "Pipe stdout of the left command into stdin of the right"
      },
      {
        "cmd": "tee -a",
        "desc": "Append to the file instead of truncating it"
      }
    ],
    "realWorldScenario": {
      "title": "A deployment script runs `curl -s https://repo.example.com/app.tar.gz | tar xz -C /opt/app && echo \"Deployed\"`. The repository was down, nothing was extracted, but the pipeline log says \"Deployed\" in some runs and the script never stops on download errors.",
      "problem": "Production alert: investigation required in pipes, redirection, exit codes and chaining.",
      "steps": [
        "Evidence: run the pipeline manually and print `${PIPESTATUS[@]}`; curl returns a non-zero code (for example 7, \"failed to connect\") while tar's status determines $?.",
        "Hypothesis: without pipefail, the pipeline status is tar's; curl's failure is invisible, and -s even hides its message. In some runs tar also received an HTML error page.",
        "Fix: add `set -euo pipefail` to the script, use `curl -fsS` so HTTP errors give a non-zero status and a short message, and download to a file, verify a checksum, then extract.",
        "Validate: point the URL at a non-existent path; the script must now exit non-zero and never print \"Deployed\"."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between `cmd > f 2>&1` and `cmd 2>&1 > f`?",
        "a": "Redirections are applied left to right. In the first, stdout is pointed at f and then stderr is made a copy of stdout, so both go to f. In the second, stderr is copied from stdout while stdout still points at the terminal, then only stdout is moved to f, so errors still go to the terminal."
      },
      {
        "q": "What does exit status 127 mean, and what about 137?",
        "a": "127 means the shell could not find the command (not in PATH or misspelled). 137 is 128 + 9: the process was killed by SIGKILL, for example by the OOM killer or kill -9."
      }
    ]
  },
  {
    "id": "mod-10",
    "levelId": "L02",
    "category": "core",
    "categoryLabel": "Command-Line Mastery",
    "title": "10. The shell environment",
    "icon": "fa-solid fa-terminal",
    "level": "Intermediate",
    "lead": "Variables, quoting and command substitution, plus the tools that shape your interactive environment: aliases, history, command lookup with which/type/whereis, and formatted output with echo, printf and date.",
    "description": "Variables, quoting and command substitution, plus the tools that shape your interactive environment: aliases, history, command lookup with which/type/whereis, and formatted output with echo, printf and date.",
    "keyConcepts": [
      {
        "title": "Variables, quoting, escaping and command substitution",
        "text": "A shell variable is a named string stored inside the running shell: `APP=web01` (no spaces around `=`). You read it with `$APP` or `${APP}`; the braces are needed when text follows directly, as in `${APP}_backup`. `unset APP` removes it. Names are case sensitive; by convention UPPERCASE is used for environment variables and lo..."
      },
      {
        "title": "Aliases, history, command lookup and formatted output (alias, history, which, type, whereis, echo, printf, date)",
        "text": "Several features make the interactive shell faster and more predictable.\n\nAliases are text shortcuts expanded by the shell when a command name matches: `alias ll='ls -l --color=auto'`. `alias` alone lists them; `unalias ll` removes one. Aliases defined at the prompt vanish when the shell exits; put them in `~/.bashrc` to keep them. RH..."
      }
    ],
    "commands": [
      {
        "cmd": "export",
        "desc": "Mark a variable for inheritance by child processes"
      },
      {
        "cmd": "unset",
        "desc": "Remove a variable"
      },
      {
        "cmd": "type -a",
        "desc": "Show every alias, function, builtin and PATH match for a name"
      },
      {
        "cmd": "\\cmd",
        "desc": "Bypass an alias (command also bypasses functions)"
      }
    ],
    "realWorldScenario": {
      "title": "An admin runs `python3 --version` and gets 3.9, but `/usr/bin/python3 --version` reports 3.12 after they changed the alternatives link. Another engineer says \"which python3 shows /usr/bin/python3, so it must be 3.12\".",
      "problem": "Production alert: investigation required in the shell environment.",
      "steps": [
        "Evidence: `type -a python3` shows \"python3 is aliased to ...\" or \"python3 is hashed (/usr/local/bin/python3)\" before /usr/bin/python3.",
        "Hypothesis: an alias, function or an earlier PATH entry (or a stale hash) shadows the binary; which only shows part of the picture.",
        "Fix: remove the alias/function from ~/.bashrc or reorder PATH, and run `hash -r` to clear remembered paths.",
        "Validate: `type -a python3` lists /usr/bin/python3 first and `python3 --version` prints the expected version."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between a shell variable and an environment variable?",
        "a": "A shell variable exists only inside the current shell. An environment variable has been exported, so the shell copies it into the environment of every child process it starts. Children cannot modify the parent's environment."
      },
      {
        "q": "How do you find out exactly what will run when you type a command name?",
        "a": "Use type -a NAME. It reports aliases, functions, builtins and every matching file in PATH in the order Bash would use them. which only searches PATH and whereis only lists standard locations."
      }
    ]
  },
  {
    "id": "mod-11",
    "levelId": "L04",
    "category": "server",
    "categoryLabel": "Users, Groups, Ownership, and Permissions",
    "title": "11. Accounts and identity files",
    "icon": "fa-solid fa-user-shield",
    "level": "Advanced (L2/L3)",
    "lead": "The local account databases, the numeric identities behind user and group names, and how the system resolves them through NSS.",
    "description": "The local account databases, the numeric identities behind user and group names, and how the system resolves them through NSS.",
    "keyConcepts": [
      {
        "title": "/etc/passwd, /etc/shadow and /etc/group",
        "text": "Linux does not really care about user names. The kernel tracks every process and every file by numbers: a user ID (UID) and one or more group IDs (GIDs). Names exist for humans, and the mapping between names and numbers lives in a handful of plain-text databases under `/etc`.\n\n /etc/passwd - the account list\nOne line per account,..."
      },
      {
        "title": "UIDs, GIDs and identity resolution with id and getent",
        "text": "Every process carries a set of credentials: a real UID (who started it), an effective UID (whose privileges it uses now), a primary GID, and a list of supplementary GIDs. Permission checks compare these numbers with the owner and group recorded in a file's inode.\n\n UID ranges\n`/etc/login.defs` sets the ranges that `user..."
      }
    ],
    "commands": [
      {
        "cmd": "vipw -s",
        "desc": "Edit /etc/shadow under a lock (vigr -s edits /etc/gshadow)"
      },
      {
        "cmd": "pwck -r",
        "desc": "Read-only consistency check of passwd/shadow (reports, changes nothing)"
      },
      {
        "cmd": "id -u",
        "desc": "Print only the effective UID / primary GID"
      },
      {
        "cmd": "id -Gn",
        "desc": "Print all group names"
      }
    ],
    "realWorldScenario": {
      "title": "An AD user can SSH to one server but `id jsmith@corp.example.com` returns \"no such user\" on another.",
      "problem": "Production alert: investigation required in accounts and identity files.",
      "steps": [
        "Evidence: `getent passwd jsmith@corp.example.com`, `systemctl status sssd`, `grep -E \"^passwd\" /etc/nsswitch.conf`, `realm list`.",
        "Hypothesis: SSSD is stopped, the host is not joined, or nsswitch.conf lacks the sss source (authselect profile not applied).",
        "Fix: start/enable sssd, re-join with realm if needed, or apply the right profile with `authselect select sssd --force` after backing up; clear stale cache with `sss_cache -E`.",
        "Validate: getent returns the user and `id` lists their AD groups."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Why is there an x in the second field of /etc/passwd?",
        "a": "/etc/passwd must be world-readable so programs can map UIDs to names. Storing hashes there would allow offline cracking, so hashes moved to /etc/shadow (root-only); the x tells tools to look there."
      },
      {
        "q": "What is the difference between a primary and a supplementary group?",
        "a": "The primary group (passwd field 4) is the group assigned to new files and the process GID; supplementary groups are additional groups that grant access. Both are evaluated for permission checks, but only the primary group affects default group ownership (unless the directory is setgid)."
      }
    ]
  },
  {
    "id": "mod-12",
    "levelId": "L04",
    "category": "server",
    "categoryLabel": "Users, Groups, Ownership, and Permissions",
    "title": "12. Managing users, groups and password aging",
    "icon": "fa-solid fa-user-shield",
    "level": "Advanced (L2/L3)",
    "lead": "Account lifecycle with useradd, usermod, userdel, groupadd and gpasswd, plus password policy, aging and expiration with passwd and chage.",
    "description": "Account lifecycle with useradd, usermod, userdel, groupadd and gpasswd, plus password policy, aging and expiration with passwd and chage.",
    "keyConcepts": [
      {
        "title": "Creating, modifying and removing users and groups",
        "text": "Account management on RHEL is done with the shadow-utils tools, which update passwd, shadow, group and gshadow atomically and consistently. Editing the files by hand is reserved for emergencies.\n\n useradd - create\n`useradd alice` with no options:\n1. Allocates the next free UID >= `UID_MIN` (1000).\n2. Creates a user private group..."
      },
      {
        "title": "Passwords, password aging and account expiration",
        "text": "Password aging is stored in the numeric fields of `/etc/shadow` and enforced by PAM at login. Three different mechanisms are often confused:\n\n- Password expiry (lastchg + max): the user must change the password at next login.\n- Inactivity (inactive): N days after the password expired, password login is disabled until an admin inte..."
      }
    ],
    "commands": [
      {
        "cmd": "useradd -G g1,g2",
        "desc": "Set supplementary groups at creation"
      },
      {
        "cmd": "useradd -r -s /sbin/nologin",
        "desc": "Create a system/service account without interactive login"
      },
      {
        "cmd": "chage -l USER",
        "desc": "List aging information"
      },
      {
        "cmd": "chage -M 90 -W 7 USER",
        "desc": "Maximum 90 days with 7-day warning"
      }
    ],
    "realWorldScenario": {
      "title": "A user reports \"Your account has expired; please contact your system administrator\" over SSH, but their password was changed last week.",
      "problem": "Production alert: investigation required in managing users, groups and password aging.",
      "steps": [
        "Evidence: `sudo chage -l user`, `sudo getent shadow user` (field 8), `sudo grep user /var/log/secure | tail`.",
        "Hypothesis: the account expiry date (field 8) has passed - this is independent of password age.",
        "Fix: after confirming with the owner/HR that access is still approved, set a new date `sudo chage -E 2027-03-31 user` or remove it with `-E -1`.",
        "Validate: chage -l shows the new date and the user logs in successfully."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between usermod -G and usermod -aG?",
        "a": "-G sets the complete supplementary group list, removing any group not listed; -aG appends to the existing list. Omitting -a is a frequent cause of users losing sudo (wheel) access."
      },
      {
        "q": "Explain password expiry, inactivity and account expiry.",
        "a": "Password expiry (lastchg + max) forces a password change. Inactivity is a grace period after password expiry; once it passes, password login is disabled. Account expiry is an absolute date that disables the account entirely regardless of password state."
      }
    ]
  },
  {
    "id": "mod-13",
    "levelId": "L04",
    "category": "server",
    "categoryLabel": "Users, Groups, Ownership, and Permissions",
    "title": "13. Permissions, ownership and umask",
    "icon": "fa-solid fa-user-shield",
    "level": "Advanced (L2/L3)",
    "lead": "The rwx model for files and directories, octal and symbolic modes, ownership changes with chown/chgrp, and how umask determines the permissions of new files.",
    "description": "The rwx model for files and directories, octal and symbolic modes, ownership changes with chown/chgrp, and how umask determines the permissions of new files.",
    "keyConcepts": [
      {
        "title": "rwx permissions, octal and symbolic modes, chown and chgrp",
        "text": "Every inode stores an owner UID, a group GID and a mode: 12 permission bits plus the file type. `ls -l` shows them:\n\n```\n-rw-r-----. 1 alice finance 4096 Oct  9 09:00 budget.xlsx\ndrwxr-x---. 2 alice finance   26 Oct  9 09:00 reports\n```\n\nThe first character is the type (`-` file, `d` directory, `l` symlink). Then three triplet..."
      },
      {
        "title": "umask and default permissions",
        "text": "When a program creates a file it asks the kernel for a mode: most programs request 666 for regular files and 777 for directories. The kernel then removes every bit that is set in the process's umask:\n\n```\nfinal mode = requested mode AND (NOT umask)\n```\n\nSo umask 022 removes write for group and other: files become 644, director..."
      }
    ],
    "commands": [
      {
        "cmd": "chmod -R",
        "desc": "Recurse into directories"
      },
      {
        "cmd": "chmod X",
        "desc": "Execute only for directories / already-executable files"
      },
      {
        "cmd": "umask -S",
        "desc": "Symbolic display of allowed permissions"
      },
      {
        "cmd": "umask 077",
        "desc": "Private: files 600, directories 700"
      }
    ],
    "realWorldScenario": {
      "title": "Files written by a Java application service are created 644, but policy requires 640. The admin set umask 027 in /etc/profile.d and restarted the service, with no effect.",
      "problem": "Production alert: investigation required in permissions, ownership and umask.",
      "steps": [
        "Evidence: `grep Umask /proc/$(systemctl show -p MainPID --value app)/status`, `systemctl cat app`.",
        "Hypothesis: systemd services do not read shell profile scripts; the service still runs with the default UMask 0022.",
        "Fix: `sudo systemctl edit app` and add `[Service]` / `UMask=0027`, then `sudo systemctl restart app`. Existing files must be fixed separately with chmod.",
        "Validate: /proc status shows Umask 0027 and newly created files are 640."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What do read, write and execute mean on a directory?",
        "a": "r lists entry names, w allows creating, deleting and renaming entries (together with x), and x allows traversing the directory and accessing entries by name. Without x, even a readable directory only shows names; you cannot open or stat its files."
      },
      {
        "q": "With umask 027, what permissions do new files and directories get?",
        "a": "Files 640 (rw-r-----) and directories 750 (rwxr-x---), because the umask clears group write and all other permissions from the requested 666/777."
      }
    ]
  },
  {
    "id": "mod-14",
    "levelId": "L04",
    "category": "server",
    "categoryLabel": "Users, Groups, Ownership, and Permissions",
    "title": "14. Special permission bits and ACLs",
    "icon": "fa-solid fa-user-shield",
    "level": "Advanced (L2/L3)",
    "lead": "The setuid, setgid and sticky bits, how they build safe shared group directories, and how POSIX ACLs (including default ACLs and the mask) grant access beyond one owner and one group.",
    "description": "The setuid, setgid and sticky bits, how they build safe shared group directories, and how POSIX ACLs (including default ACLs and the mask) grant access beyond one owner and one group.",
    "keyConcepts": [
      {
        "title": "setuid, setgid and the sticky bit",
        "text": "The nine rwx bits are not the whole mode. There are three more special bits, written as a leading octal digit: setuid = 4, setgid = 2, sticky = 1. `chmod 2770 dir` means \"setgid + rwxrwx---\".\n\n setuid on executables (4xxx)\nNormally a process runs with the UID of the user who started it. When an executable has the setuid..."
      },
      {
        "title": "POSIX ACLs: getfacl, setfacl, default ACLs and the mask",
        "text": "Classic permissions describe exactly three classes: owner, one group, everyone else. When a file needs access for one more user or group, you either change the group (breaking other access) or loosen \"other\" (too broad). POSIX Access Control Lists add extra entries without touching ownership.\n\n Entry types\n```\nuser::rw-        ..."
      }
    ],
    "commands": [
      {
        "cmd": "u+s",
        "desc": "setuid - run executable with the file owner's effective UID"
      },
      {
        "cmd": "g+s",
        "desc": "setgid - executable runs with file group; directory passes its group to new files"
      },
      {
        "cmd": "-m",
        "desc": "Modify or add entries"
      },
      {
        "cmd": "-x",
        "desc": "Remove specific entries"
      }
    ],
    "realWorldScenario": {
      "title": "A named-user ACL u:deploy:rwx exists on /opt/app/releases, yet deploy gets \"Permission denied\" creating files there.",
      "problem": "Production alert: investigation required in special permission bits and acls.",
      "steps": [
        "Evidence: `getfacl /opt/app/releases` - look for `#effective:` and the mask; `namei -l /opt/app/releases` to check execute on every parent; `ls -Zd` and `ausearch -m AVC -ts recent` for SELinux.",
        "Hypothesis: a later `chmod 750` set the mask to r-x, limiting deploy to r-x; or a parent directory lacks x for deploy.",
        "Fix: restore the mask with `sudo setfacl -m m::rwx /opt/app/releases` (or re-apply the user entry), and add `u:deploy:x` on any parent missing traverse permission.",
        "Validate: `getfacl` shows no effective reduction and `sudo -u deploy touch /opt/app/releases/test` works; remove the test file."
      ]
    },
    "interviewQuestions": [
      {
        "q": "How can a normal user change their own password if /etc/shadow is root-only?",
        "a": "/usr/bin/passwd is setuid root, so the process runs with effective UID 0 and can write shadow; the program itself enforces that a normal user only changes their own entry, using the real UID to know who called it."
      },
      {
        "q": "What is the ACL mask?",
        "a": "The maximum permissions granted to named users, named groups and the owning group. Effective access is the entry ANDed with the mask. On a file with an ACL, chmod and ls group bits operate on the mask."
      }
    ]
  },
  {
    "id": "mod-15",
    "levelId": "L04",
    "category": "server",
    "categoryLabel": "Users, Groups, Ownership, and Permissions",
    "title": "15. Privilege management",
    "icon": "fa-solid fa-user-shield",
    "level": "Advanced (L2/L3)",
    "lead": "Switching identity with su, delegating administration with sudo and sudoers drop-ins, and continuously auditing who holds privilege on a system.",
    "description": "Switching identity with su, delegating administration with sudo and sudoers drop-ins, and continuously auditing who holds privilege on a system.",
    "keyConcepts": [
      {
        "title": "su, sudo, sudoers, visudo and /etc/sudoers.d",
        "text": "Administration needs root, but logging in as root hides who did what and gives every action unlimited power. Linux offers two ways to elevate.\n\n su - switch user\n`su` starts a shell as another user (root by default) after you type that user's password.\n- `su` keeps most of your environment (PATH, current directory).\n- `su -` (or ..."
      },
      {
        "title": "Least privilege and auditing privileges",
        "text": "Least privilege means every account, service and process has only the access its job requires, for only as long as it needs it. Privilege tends to grow: people change roles, contractors leave, someone adds a setuid helper \"just for now\". A sysadmin's job is to inventory, review and remove privilege regularly, with evidence.\n\n W..."
      }
    ],
    "commands": [
      {
        "cmd": "su -",
        "desc": "Login shell as root with a clean environment"
      },
      {
        "cmd": "sudo -i",
        "desc": "Root login shell through sudo (your password, logged)"
      },
      {
        "cmd": "-perm -4000",
        "desc": "Match files with at least the setuid bit"
      },
      {
        "cmd": "-perm /6000",
        "desc": "Match files with setuid or setgid"
      }
    ],
    "realWorldScenario": {
      "title": "A weekly scan reports a new setuid-root file /usr/local/bin/backup-helper that is not in last week's baseline.",
      "problem": "Production alert: investigation required in privilege management.",
      "steps": [
        "Evidence: `ls -l`, `stat`, `rpm -qf` (not owned), `sha256sum`, file type with `file`, and who installed it (`ausearch -f /usr/local/bin/backup-helper -i`, change tickets, /var/log/secure around its ctime).",
        "Hypothesis: either an undocumented admin change for a backup tool, or a persistence mechanism left by an attacker.",
        "Fix: if unexplained, treat as a security incident - preserve a copy and evidence, remove the setuid bit (`chmod u-s`), and escalate; if legitimate, replace it with a sudo rule or a capability-limited service and document it.",
        "Validate: rerun the scan, confirm it matches the approved baseline, and add the check to monitoring."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between su and sudo?",
        "a": "su switches to another user and needs that user's password; sudo runs commands per a policy and needs the caller's own password, logs each command under the caller's name, and can be restricted to specific commands."
      },
      {
        "q": "How do you find all setuid files on a server and decide which are legitimate?",
        "a": "find / -xdev -type f -perm -4000 (or /6000 to include setgid), then rpm -qf to see if a package owns each file and rpm -Vf to see if it was modified, comparing with a baseline. Unowned or modified files are investigated."
      }
    ]
  },
  {
    "id": "mod-16",
    "levelId": "L06",
    "category": "server",
    "categoryLabel": "Package Management",
    "title": "16. RPM fundamentals",
    "icon": "fa-solid fa-box-open",
    "level": "Advanced (L2/L3)",
    "lead": "What an RPM package actually is, how the RPM database records it, and how to query, verify and trust installed software.",
    "description": "What an RPM package actually is, how the RPM database records it, and how to query, verify and trust installed software.",
    "keyConcepts": [
      {
        "title": "RPM package anatomy and the rpm query interface",
        "text": "An RPM package is a single archive that contains three things: a header (metadata: name, version, dependencies, file list with checksums, permissions and owners, scripts, signature), a payload (a compressed cpio archive of the files) and optional scriptlets (shell snippets run before/after install or removal, e.g. `%post` ..."
      },
      {
        "title": "Package verification and GPG signatures",
        "text": "Two different questions protect you from bad software:\n\n1. Is this package genuine? — answered by a GPG signature on the package header, checked against public keys you trust.\n2. Are the installed files still what the package delivered? — answered by verification (`rpm -V`), which compares the files on disk with the metada..."
      }
    ],
    "commands": [
      {
        "cmd": "-a",
        "desc": "Query all installed packages (often piped to grep or sort)"
      },
      {
        "cmd": "-f FILE",
        "desc": "Query the package that owns FILE"
      },
      {
        "cmd": "-V NAME",
        "desc": "Verify the installed files of one package"
      },
      {
        "cmd": "-Va",
        "desc": "Verify every installed package (slow, I/O heavy)"
      }
    ],
    "realWorldScenario": {
      "title": "After a junior admin ran `chmod -R 755 /usr/bin` to \"fix a permission problem\", `sudo` and `passwd` stopped working for normal users.",
      "problem": "Production alert: investigation required in rpm fundamentals.",
      "steps": [
        "Evidence: `rpm -Vf /usr/bin/sudo /usr/bin/passwd` shows `.M.......` — mode changed; `ls -l` shows setuid bit missing.",
        "Hypothesis: recursive chmod cleared setuid/setgid bits on many binaries.",
        "Fix: identify all affected packages with `rpm -Va | awk '$1 ~ /M/ {print $NF}' | grep ^/usr/bin | xargs rpm -qf | sort -u`, then `rpm --setperms` each (or `dnf reinstall`).",
        "Validate: `rpm -Va` shows no M flags under /usr/bin; `sudo -l` and `passwd` work for a test user."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between rpm and dnf, and when would you still use rpm directly?",
        "a": "rpm is the low-level package manager: it installs, erases, queries and verifies individual package files against the rpmdb but does not download packages or resolve dependencies. dnf reads repository metadata, solves dependencies, downloads packages and runs the transaction through the rpm library, recording history. I use rpm for queries (-qa, -qf, -qc, --changelog), verification (-V) and signature checks (-K), and dnf for anything that changes installed software."
      },
      {
        "q": "Explain the output `S.5....T.  c /etc/httpd/conf/httpd.conf` from rpm -V.",
        "a": "It is a %config file (c) whose size (S), content digest (5) and modification time (T) differ from what the package installed; mode, owner, group, device, link target and capabilities are unchanged (dots). That is the normal signature of an admin edit and not by itself a concern."
      }
    ]
  },
  {
    "id": "mod-17",
    "levelId": "L06",
    "category": "server",
    "categoryLabel": "Package Management",
    "title": "17. DNF and repositories",
    "icon": "fa-solid fa-box-open",
    "level": "Advanced (L2/L3)",
    "lead": "Use dnf to search, install and remove software with automatic dependency resolution, and configure the repositories and GPG keys it trusts.",
    "description": "Use dnf to search, install and remove software with automatic dependency resolution, and configure the repositories and GPG keys it trusts.",
    "keyConcepts": [
      {
        "title": "DNF essentials: search, install, remove and provides",
        "text": "DNF (Dandified YUM) is the high-level package manager on RHEL 8, 9 and 10. On these releases `yum` is simply a compatibility name that runs dnf, so old runbooks keep working.\n\n What dnf does for every transaction\n1. Reads its configuration (`/etc/dnf/dnf.conf`) and repository definitions (`/etc/yum.repos.d/.repo`).\n2. Loads reposi..."
      },
      {
        "title": "Repository configuration, GPG keys and AppStream",
        "text": "A repository is a directory (HTTP/HTTPS, FTP, NFS or a local path) containing RPM packages and a `repodata/` folder of metadata. The entry point is `repodata/repomd.xml`, which lists checksums of the other metadata files (primary, filelists, updateinfo, comps groups, modules). dnf downloads repomd.xml first and trusts the rest via..."
      }
    ],
    "commands": [
      {
        "cmd": "-y",
        "desc": "Answer yes to the confirmation prompt (scripts, automation)"
      },
      {
        "cmd": "--assumeno",
        "desc": "Show what would happen and answer no (safe dry run)"
      },
      {
        "cmd": "repolist --all",
        "desc": "Show enabled and disabled repos"
      },
      {
        "cmd": "repolist -v",
        "desc": "Show baseurl, metadata age, package count, expiry"
      }
    ],
    "realWorldScenario": {
      "title": "After adding a local repo, `dnf install tree` fails with \"Cannot download repomd.xml: Curl error (37): Couldn't read a file:// file for file:///mnt/iso/repodata/repomd.xml\".",
      "problem": "Production alert: investigation required in dnf and repositories.",
      "steps": [
        "Evidence: the URL ends in `/mnt/iso/repodata` — dnf looked in the ISO root.",
        "Hypothesis: baseurl points to the ISO root; RHEL 8+ media keeps repodata inside `BaseOS/` and `AppStream/`. Also confirm the ISO is mounted with `findmnt /mnt/iso`.",
        "Fix: set `baseurl=file:///mnt/iso/BaseOS` and a second repo for AppStream; `dnf clean all`.",
        "Validate: `dnf repolist -v` shows package counts; `dnf install tree` succeeds."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What happens, step by step, when you run dnf install httpd?",
        "a": "dnf reads dnf.conf and the enabled .repo files, refreshes metadata if expired, resolves httpd and all its Requires with the libsolv solver, shows the transaction, downloads the packages to the cache, verifies GPG signatures against imported keys (importing configured keys if needed), runs the rpm transaction including scriptlets, then records the transaction in dnf history."
      },
      {
        "q": "What is the difference between BaseOS and AppStream?",
        "a": "BaseOS contains the core OS packages with the full release life cycle. AppStream contains user-space applications, runtimes and databases, which may have shorter or different life cycles; on RHEL 8/9 some are delivered as module streams. Both are needed for a usable system."
      }
    ]
  },
  {
    "id": "mod-18",
    "levelId": "L06",
    "category": "server",
    "categoryLabel": "Package Management",
    "title": "18. Updates, history, rollback and Flatpak",
    "icon": "fa-solid fa-box-open",
    "level": "Advanced (L2/L3)",
    "lead": "Patch systems deliberately, audit and undo package transactions, protect kernels and pinned packages, and manage sandboxed desktop applications with Flatpak.",
    "description": "Patch systems deliberately, audit and undo package transactions, protect kernels and pinned packages, and manage sandboxed desktop applications with Flatpak.",
    "keyConcepts": [
      {
        "title": "Updating safely: errata, dnf history and rollback",
        "text": "Patching is the most frequent change on any fleet, and the one most likely to cause an outage if done carelessly. A disciplined update has four phases: assess, apply, verify, and be ready to back out.\n\n Assess\n- `dnf check-update` lists available updates. Exit code 100 means updates exist, 0 none, 1 error — ..."
      },
      {
        "title": "Flatpak applications and remotes",
        "text": "Flatpak is a packaging and distribution system for (mostly graphical) applications that runs them in a sandbox and bundles them with a shared runtime instead of relying on host libraries. It complements RPM; it does not replace it. RHEL uses RPM for the OS and services, and offers Flatpak for desktop applications. Managing Fla..."
      }
    ],
    "commands": [
      {
        "cmd": "--security",
        "desc": "Limit to packages fixing security advisories"
      },
      {
        "cmd": "--advisory=ID",
        "desc": "Apply one specific erratum"
      },
      {
        "cmd": "--if-not-exists",
        "desc": "remote-add: do not fail if the remote is already configured"
      },
      {
        "cmd": "--user",
        "desc": "Per-user installation or system-wide (default)"
      }
    ],
    "realWorldScenario": {
      "title": "`flatpak install rhel org.gnome.gedit` fails with \"error: Unable to load summary from remote rhel: ... 401 Unauthorized\".",
      "problem": "Production alert: investigation required in updates, history, rollback and flatpak.",
      "steps": [
        "Evidence: `flatpak remotes --show-details` shows the rhel remote URL; `subscription-manager status` shows the system is not registered.",
        "Hypothesis: the Red Hat Flatpak remote requires an entitled/registered system for authentication.",
        "Fix: register the system (`sudo subscription-manager register`, or `rhc connect`), then retry; or use an approved alternate remote.",
        "Validate: `flatpak remote-ls rhel | head` lists apps and the install completes."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between dnf history undo and rollback?",
        "a": "undo reverses a single transaction by ID; rollback reverses all transactions that happened after the given ID, returning the package set to the state at that point. Both depend on the older package versions being available in enabled repos and neither restores configuration or data changes."
      },
      {
        "q": "How is Flatpak different from RPM?",
        "a": "RPM installs packages into the shared OS filesystem with dependencies resolved against host libraries, managed by rpm/dnf. Flatpak installs applications into an OSTree store with a bundled shared runtime, runs them sandboxed with bubblewrap and portals, and updates them independently of the OS. RPM is for the OS and services; Flatpak mainly for desktop apps."
      }
    ]
  },
  {
    "id": "mod-19",
    "levelId": "L06",
    "category": "server",
    "categoryLabel": "Package Management",
    "title": "19. Debian-family packaging",
    "icon": "fa-solid fa-box-open",
    "level": "Advanced (L2/L3)",
    "lead": "Translate RHEL package skills to Debian and Ubuntu: apt and apt-get for repositories and dependency resolution, dpkg for the package database, and the sources that feed them.",
    "description": "Translate RHEL package skills to Debian and Ubuntu: apt and apt-get for repositories and dependency resolution, dpkg for the package database, and the sources that feed them.",
    "keyConcepts": [
      {
        "title": "apt, apt-get and APT sources",
        "text": "Debian, Ubuntu and their derivatives use .deb packages. The layering mirrors RHEL:\n\n- rpm ↔ dpkg — low-level install/query of a single package file, no dependency resolution.\n- dnf ↔ apt / apt-get — repositories, dependency solving, downloads.\n\n Two-step model: index, then act\nUnlike dnf, which refreshes metadata automatica..."
      },
      {
        "title": "dpkg: the Debian package database",
        "text": "`dpkg` is Debian's low-level package tool — the counterpart of rpm. It installs, removes, configures and queries .deb files but does not download packages or resolve dependencies. APT calls dpkg to do the actual work.\n\n Anatomy of a .deb\nA .deb is an `ar` archive with `debian-binary`, `control.tar.` (metadata: Package, Version..."
      }
    ],
    "commands": [
      {
        "cmd": "update",
        "desc": "Refresh indexes from all sources (installs nothing)"
      },
      {
        "cmd": "upgrade",
        "desc": "Upgrade without removing packages"
      },
      {
        "cmd": "-l",
        "desc": "List packages with desired/status/error flags"
      },
      {
        "cmd": "-s",
        "desc": "Status and metadata / installed file list"
      }
    ],
    "realWorldScenario": {
      "title": "After a power cut during `unattended-upgrades`, every apt command says \"E: dpkg was interrupted, you must manually run 'sudo dpkg --configure -a' to correct the problem.\"",
      "problem": "Production alert: investigation required in debian-family packaging.",
      "steps": [
        "Evidence: `dpkg --audit` lists half-configured packages; `tail /var/log/dpkg.log` shows the last package being configured.",
        "Hypothesis: the transaction stopped between unpack and configure.",
        "Fix: ensure no apt/dpkg process runs (`ps aux | grep -E \"apt|dpkg\"`), then `sudo dpkg --configure -a`; follow with `sudo apt-get -f install` if dependencies are broken.",
        "Validate: `dpkg --audit` is empty, `apt-get check` reports no errors, affected services start."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between apt upgrade and apt full-upgrade?",
        "a": "upgrade upgrades installed packages but never removes any; packages whose upgrade requires removing others are kept back. full-upgrade (apt-get dist-upgrade) resolves changed dependencies intelligently and may install new packages and remove existing ones, so its summary must be reviewed."
      },
      {
        "q": "What does the rc state in dpkg -l mean?",
        "a": "Desired state remove (r), current state config-files (c): the package was removed but its configuration files are still on disk. dpkg -P or apt purge removes them."
      }
    ]
  },
  {
    "id": "mod-20",
    "levelId": "L06",
    "category": "server",
    "categoryLabel": "Package Management",
    "title": "20. Troubleshooting package problems",
    "icon": "fa-solid fa-box-open",
    "level": "Advanced (L2/L3)",
    "lead": "Diagnose and fix repository failures, dependency conflicts, rpmdb problems and interrupted transactions with evidence-first methods that never weaken signature checking.",
    "description": "Diagnose and fix repository failures, dependency conflicts, rpmdb problems and interrupted transactions with evidence-first methods that never weaken signature checking.",
    "keyConcepts": [
      {
        "title": "Repository and metadata failures",
        "text": "When `dnf` cannot read a repository, the whole command usually stops (RHEL default `skip_if_unavailable=False`). The error text always contains the repo ID and usually a URL and an error class. Troubleshooting is a matter of walking the path dnf takes, layer by layer:\n\n1. Configuration — is the repo enabled and is baseurl/..."
      },
      {
        "title": "Dependency conflicts, rpmdb problems and interrupted transactions",
        "text": " Dependency conflicts\nThe dnf solver either finds a consistent transaction or prints a Problem report. Common shapes:\n\n- \"nothing provides X needed by Y\" — a dependency is missing from all enabled repos: a repo is disabled (e.g. AppStream, CodeReady Builder) or the package was built for another release (`el8` package on `el9`)...."
      }
    ],
    "commands": [
      {
        "cmd": "dnf -v",
        "desc": "Verbose output including URLs dnf tries"
      },
      {
        "cmd": "--setopt=ID.skip_if_unavailable=True",
        "desc": "One-off override to unblock an urgent install while the repo is fixed (document it)"
      },
      {
        "cmd": "--allowerasing",
        "desc": "Allow removal of installed packages to resolve conflicts (read the list!)"
      },
      {
        "cmd": "--skip-broken",
        "desc": "Skip packages with unresolvable dependencies"
      }
    ],
    "realWorldScenario": {
      "title": "Every `dnf` command on a server hangs with \"Waiting for process with pid 2314 to finish.\" and the on-call engineer proposes deleting the rpmdb lock files.",
      "problem": "Production alert: investigation required in troubleshooting package problems.",
      "steps": [
        "Evidence: `ps -fp 2314` shows `/usr/bin/python3 /usr/bin/dnf-automatic` started 3 minutes ago; `journalctl -u dnf-automatic.service -f` shows it downloading updates.",
        "Hypothesis: a legitimate automated transaction holds the lock; deleting files would cause two writers.",
        "Fix: wait for it to finish (or stop the timer/service cleanly if it conflicts with the change window: `systemctl stop dnf-automatic.timer`), then run your command.",
        "Validate: `dnf history list | head -3` shows the automatic transaction completed; your command proceeds; coordinate future windows with the timer schedule."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Walk me through troubleshooting \"Failed to download metadata for repo X\".",
        "a": "Read the repo ID and curl error, then check layer by layer: repo definition and URL (repolist -v), DNS (getent hosts), connectivity and proxy (curl -v to repomd.xml, proxy settings in dnf.conf), TLS and time (curl error 60, timedatectl), entitlement (403 from the CDN, subscription-manager status), and path/content (404, $releasever). Then clean the cache and retry. I never disable gpgcheck or sslverify as a fix."
      },
      {
        "q": "dnf says \"nothing provides libX.so.2 needed by package Y\". How do you approach it?",
        "a": "Find which package provides that capability with dnf repoquery --whatprovides or dnf provides libX.so.2, then check whether its repo is enabled (CRB, AppStream, vendor) and whether Y was built for my release. Enable the right repo or get the correct build. I would not install with --nodeps."
      }
    ]
  },
  {
    "id": "mod-21",
    "levelId": "L08",
    "category": "server",
    "categoryLabel": "Systemd and Enterprise Service Administration",
    "title": "21. Units and systemctl",
    "icon": "fa-solid fa-gears",
    "level": "Advanced (L2/L3)",
    "lead": "What a unit is, how systemctl changes runtime and boot state, and how to read status, unit-file and target information.",
    "description": "What a unit is, how systemctl changes runtime and boot state, and how to read status, unit-file and target information.",
    "keyConcepts": [
      {
        "title": "Service lifecycle: start vs enable, and reading systemctl status",
        "text": "systemd is PID 1 on RHEL 7 and later. It starts and supervises everything else on the system as units — named objects such as `sshd.service`, `multi-user.target` or `fstrim.timer`. A service unit describes how to run a daemon or a one-shot task.\n\nEvery service has two independent properties that new administrators constantly con..."
      },
      {
        "title": "Unit types, targets and inspecting the unit inventory",
        "text": "A unit is anything systemd manages, identified by name and suffix. The suffix is the type:\n\n- `.service` — a process or one-shot task.\n- `.socket` — a listening socket that starts a service on demand.\n- `.target` — a synchronisation point / group of units (replaces SysV runlevels).\n- `.timer` — schedules activation of another unit (cr..."
      }
    ],
    "commands": [
      {
        "cmd": "--now",
        "desc": "With enable/disable/mask: also start/stop the unit immediately"
      },
      {
        "cmd": "--no-pager",
        "desc": "Print status without paging (useful in scripts and tickets)"
      },
      {
        "cmd": "--type=service",
        "desc": "Restrict listings to one unit type (-t)"
      },
      {
        "cmd": "--state=failed",
        "desc": "Filter by state: failed, running, enabled, masked ..."
      }
    ],
    "realWorldScenario": {
      "title": "`systemctl is-system-running` returns `degraded` on a freshly built VM and the monitoring dashboard is red.",
      "problem": "Production alert: investigation required in units and systemctl.",
      "steps": [
        "Evidence: `systemctl --failed` lists one unit, e.g. `kdump.service`.",
        "Hypothesis: degraded means at least one unit failed; the system is otherwise up.",
        "Investigate the unit: `systemctl status kdump` and `journalctl -u kdump -b` (often no crashkernel memory reserved).",
        "Fix the root cause (e.g. `kdumpctl reset-crashkernel` + reboot) or, if the service is not wanted, disable it and `systemctl reset-failed kdump`; validate `is-system-running` returns running."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between systemctl enable and systemctl start?",
        "a": "`start` changes runtime state: it starts the unit now, and that does not persist across reboot. `enable` changes boot-time configuration: it creates symlinks from the [Install] section (for example into multi-user.target.wants) so the unit is started automatically at boot, but it does not start it now unless `--now` is given."
      },
      {
        "q": "What is the difference between list-units and list-unit-files?",
        "a": "list-units shows units currently loaded in the systemd manager and their runtime state; list-unit-files shows unit files present on disk and their enablement state. A file can exist without being loaded, and a referenced unit can be loaded with LOAD=not-found if its file is missing."
      }
    ]
  },
  {
    "id": "mod-22",
    "levelId": "L08",
    "category": "server",
    "categoryLabel": "Systemd and Enterprise Service Administration",
    "title": "22. Writing unit files",
    "icon": "fa-solid fa-gears",
    "level": "Advanced (L2/L3)",
    "lead": "Unit file anatomy, precedence of unit directories, service types and execution context, and deploying a custom service end to end.",
    "description": "Unit file anatomy, precedence of unit directories, service types and execution context, and deploying a custom service end to end.",
    "keyConcepts": [
      {
        "title": "Anatomy of a unit file: sections, Type= and execution context",
        "text": "A unit file is an INI-style text file. A service unit normally has three sections:\n\n```\n[Unit]\nDescription=Inventory API\nDocumentation=https://wiki.example.com/inventory\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=exec\nUser=inventory\nGroup=inventory\nWorkingDirectory=/opt/inventory\nEnvironmentFile=-/etc/sysconfi..."
      },
      {
        "title": "Building, validating and deploying a custom service",
        "text": "Production services follow a repeatable pattern. Each piece prevents a known class of incident:\n\n1. Dedicated system account — `useradd --system --no-create-home --shell /sbin/nologin appsvc`. The service never runs as root and cannot be used for interactive login.\n2. Standard locations — binaries in `/opt/APP` or `/usr/local/bin`..."
      }
    ],
    "commands": [
      {
        "cmd": "Type=",
        "desc": "simple | exec | forking | oneshot | notify | idle (dbus is used for D-Bus services)"
      },
      {
        "cmd": "ExecStart=",
        "desc": "Commands for start, pre-start checks, stop and reload"
      },
      {
        "cmd": "--force --full (systemctl edit)",
        "desc": "Create a brand-new full unit file in /etc/systemd/system"
      },
      {
        "cmd": "StateDirectory=NAME",
        "desc": "Create /var/lib/NAME owned by the service user at start"
      }
    ],
    "realWorldScenario": {
      "title": "A shell script service written on a Windows workstation fails with 203/EXEC; the file is mode 755, labelled bin_t, and runs fine with `bash /usr/local/bin/sync.sh`.",
      "problem": "Production alert: investigation required in writing unit files.",
      "steps": [
        "Evidence: journal says `Failed to execute /usr/local/bin/sync.sh: No such file or directory` although the file exists.",
        "Hypothesis: the interpreter in the shebang does not exist — CRLF endings make it `/bin/bash\\r`. Check with `head -1 /usr/local/bin/sync.sh | od -c | head -2` (shows \\r \\n).",
        "Fix: `sed -i \"s/\\r$//\" /usr/local/bin/sync.sh` (or dos2unix), then restart the unit.",
        "Validate: `systemctl status sync` shows status=0/SUCCESS; add a CI lint step to reject CRLF scripts."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between Type=simple and Type=exec?",
        "a": "With simple, systemd considers the service started right after fork(), so a missing or non-executable binary is only noticed afterwards and `systemctl start` returns success. With exec, systemd waits until execve() succeeds, so such errors make start fail immediately and units ordered after it start only after the binary actually launched."
      },
      {
        "q": "A custom service fails with status=203/EXEC but the file is executable. What do you check?",
        "a": "That the path in ExecStart is exactly right; the shebang interpreter exists (and the file has no CRLF endings); and the SELinux label (`ls -Z`) — a user_home_t label from moving the file out of a home directory blocks init_t. Confirm with `ausearch -m AVC -ts recent` and fix with restorecon."
      }
    ]
  },
  {
    "id": "mod-23",
    "levelId": "L08",
    "category": "server",
    "categoryLabel": "Systemd and Enterprise Service Administration",
    "title": "23. Dependencies, ordering, drop-ins and restart policies",
    "icon": "fa-solid fa-gears",
    "level": "Advanced (L2/L3)",
    "lead": "Express what a unit needs versus when it starts, change vendor units without forking them, and make services self-heal without restart storms.",
    "description": "Express what a unit needs versus when it starts, change vendor units without forking them, and make services self-heal without restart storms.",
    "keyConcepts": [
      {
        "title": "Requirement dependencies versus ordering",
        "text": "systemd separates two questions that SysV init merged into one sequence number:\n\n1. Which other units must be started together with this one? — requirement dependencies.\n2. In what order? — ordering dependencies.\n\nThey are independent. `Wants=b.service` alone starts b in parallel with a; it does not wait. To wait for b you..."
      },
      {
        "title": "Drop-in overrides and restart policies",
        "text": "You often need to change one setting of a package-provided unit — raise a limit, add an environment variable, add a dependency, change the restart policy. Copying the whole unit into /etc works but freezes it: future package fixes to the vendor unit are ignored. A drop-in changes only what you specify.\n\nA drop-in is any `.conf` file ..."
      }
    ],
    "commands": [
      {
        "cmd": "Wants=",
        "desc": "Pull another unit into the transaction (soft / hard)"
      },
      {
        "cmd": "After=",
        "desc": "Ordering only — never pulls a unit in"
      },
      {
        "cmd": "Restart=",
        "desc": "no | on-success | on-failure | on-abnormal | on-abort | on-watchdog | always"
      },
      {
        "cmd": "RestartSec=",
        "desc": "Delay before restart (default 100ms)"
      }
    ],
    "realWorldScenario": {
      "title": "After a colleague added a drop-in to change httpd options, `systemctl restart httpd` fails with \"Unit httpd.service has a bad unit file setting\".",
      "problem": "Production alert: investigation required in dependencies, ordering, drop-ins and restart policies.",
      "steps": [
        "Evidence: `systemctl status httpd` shows Loaded: bad-setting; `journalctl -b -u httpd` says \"Service has more than one ExecStart= setting, which is only allowed for Type=oneshot services. Refusing.\"",
        "Hypothesis: the drop-in added a second ExecStart without clearing the vendor one.",
        "Fix: `sudo systemctl edit httpd` and insert an empty `ExecStart=` line before the new ExecStart; save (auto daemon-reload).",
        "Validate: `systemctl cat httpd`, `apachectl configtest`, `systemctl restart httpd`, and `systemctl status httpd` is active."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between Requires= and After=?",
        "a": "Requires= is a requirement dependency: it pulls the other unit into the transaction and fails/stops this unit if that one fails or is stopped. After= is purely ordering: if both are starting, start this one after the other. They are independent, so you usually use both."
      },
      {
        "q": "How do you change one setting of a vendor unit safely?",
        "a": "Use `systemctl edit UNIT` to create a drop-in in /etc/systemd/system/UNIT.d/override.conf containing only the changed directives; it is merged on top of the vendor unit, survives package updates and can be removed with `systemctl revert`."
      }
    ]
  },
  {
    "id": "mod-24",
    "levelId": "L08",
    "category": "server",
    "categoryLabel": "Systemd and Enterprise Service Administration",
    "title": "24. Timers, sockets and mount units",
    "icon": "fa-solid fa-gears",
    "level": "Advanced (L2/L3)",
    "lead": "Schedule work with systemd timers, start services on demand with socket activation, and manage mounts and automounts as units.",
    "description": "Schedule work with systemd timers, start services on demand with socket activation, and manage mounts and automounts as units.",
    "keyConcepts": [
      {
        "title": "systemd timers as a cron replacement",
        "text": "A timer unit (`NAME.timer`) activates another unit — by default the service with the same name (`NAME.service`) — on a schedule. Compared with cron, you get the journal for every run, dependency handling, resource limits and sandboxing from the service unit, no overlapping runs (a running service is not started twice), catch-up of mis..."
      },
      {
        "title": "Socket activation, mount and automount units",
        "text": " Socket activation\nA socket unit makes systemd itself open a listening socket (TCP, UDP, UNIX). When the first connection arrives, systemd starts the matching service and hands it the already-open file descriptor. Benefits: the service consumes nothing until used, clients never see \"connection refused\" during a restart (connections..."
      }
    ],
    "commands": [
      {
        "cmd": "OnCalendar=",
        "desc": "Wall-clock schedule (can be repeated for several schedules)"
      },
      {
        "cmd": "OnBootSec=",
        "desc": "Relative triggers after boot / after last activation"
      },
      {
        "cmd": "ListenStream=",
        "desc": "TCP (or UNIX stream) / UDP listener address or port"
      },
      {
        "cmd": "Accept=",
        "desc": "no: one service gets the listener; yes: one template instance per connection"
      }
    ],
    "realWorldScenario": {
      "title": "A hand-written mount unit `/etc/systemd/system/data.mount` with `Where=/srv/data` refuses to load.",
      "problem": "Production alert: investigation required in timers, sockets and mount units.",
      "steps": [
        "Evidence: `systemctl status data.mount` shows `Loaded: bad-setting`; journal says \"Where= setting doesn't match unit name. Refusing.\"",
        "Hypothesis: mount unit names must be the escaped Where= path.",
        "Fix: rename the file to `srv-data.mount` (from `systemd-escape -p --suffix=mount /srv/data`), update any WantedBy/Requires references, daemon-reload.",
        "Validate: `systemctl start srv-data.mount` and `findmnt /srv/data`."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Why would you use a systemd timer instead of cron?",
        "a": "Each run is logged in the journal with exit status; the job inherits service features (dependencies, resource limits, sandboxing, User=); runs do not overlap; Persistent=true catches up missed runs; RandomizedDelaySec spreads load; list-timers shows next/last run."
      },
      {
        "q": "What is socket activation and why use it?",
        "a": "systemd opens the listening socket and starts the service when the first connection arrives, passing the open fd. It saves resources for rarely used services, allows parallel boot and lets connections queue in the kernel across restarts."
      }
    ]
  },
  {
    "id": "mod-25",
    "levelId": "L08",
    "category": "server",
    "categoryLabel": "Systemd and Enterprise Service Administration",
    "title": "25. Service logs, debugging and hardening",
    "icon": "fa-solid fa-gears",
    "level": "Advanced (L2/L3)",
    "lead": "Use the journal and systemd result codes to find root causes fast, then reduce a service's blast radius with sandboxing and resource controls.",
    "description": "Use the journal and systemd result codes to find root causes fast, then reduce a service's blast radius with sandboxing and resource controls.",
    "keyConcepts": [
      {
        "title": "Debugging services with journalctl and systemd results",
        "text": "systemd-journald collects kernel messages, early-boot messages, syslog() calls, and the stdout/stderr of every service, and stores them as structured records with trusted metadata fields: `_SYSTEMD_UNIT`, `_PID`, `_UID`, `_COMM`, `_BOOT_ID`, `PRIORITY` and more. Because services' output is captured automatically, `journalctl -u UNIT` ..."
      },
      {
        "title": "Service hardening and resource control",
        "text": "Running as a non-root user is the first defence, but a compromised service can still read most of the filesystem, write to /tmp shared with other services, load setuid helpers, and use any network family. systemd can wrap the process in kernel namespaces, mount restrictions, capability limits and seccomp filters with a few directives — ..."
      }
    ],
    "commands": [
      {
        "cmd": "-u UNIT",
        "desc": "Entries for one unit (repeatable)"
      },
      {
        "cmd": "-b [N]",
        "desc": "Current (0) or earlier (-1, -2) boot"
      },
      {
        "cmd": "NoNewPrivileges=yes",
        "desc": "Block privilege gain via setuid/file caps"
      },
      {
        "cmd": "ProtectSystem=strict|full|yes",
        "desc": "Read-only filesystem scopes"
      }
    ],
    "realWorldScenario": {
      "title": "After a security team applied a hardening drop-in to an in-house agent, it fails with status=226/NAMESPACE on 10% of hosts.",
      "problem": "Production alert: investigation required in service logs, debugging and hardening.",
      "steps": [
        "Evidence: journal shows \"Failed to set up mount namespacing: /opt/agent/cache: No such file or directory\" and \"Failed at step NAMESPACE\".",
        "Hypothesis: ReadWritePaths=/opt/agent/cache references a directory that only exists on hosts where the agent has already run once.",
        "Fix: prefix the path with `-` (optional) or use CacheDirectory=agent / ExecStartPre-free StateDirectory= so systemd creates it; roll out the corrected drop-in.",
        "Validate: restart on an affected host, status active; `systemd-analyze security agent` score unchanged; add the path existence check to the rollout precheck."
      ]
    },
    "interviewQuestions": [
      {
        "q": "How do you read logs for a service from before the last reboot?",
        "a": "`journalctl -u UNIT -b -1` — but only if the journal is persistent (/var/log/journal exists or Storage=persistent). Otherwise fall back to rsyslog files such as /var/log/messages."
      },
      {
        "q": "How can a non-root service listen on port 443?",
        "a": "Grant CAP_NET_BIND_SERVICE with AmbientCapabilities= (and limit CapabilityBoundingSet= to it) in the unit, or use socket activation where systemd binds the port and passes the fd. Avoid running as root or setting file capabilities ad hoc."
      }
    ]
  },
  {
    "id": "mod-26",
    "levelId": "L10",
    "category": "server",
    "categoryLabel": "Networking",
    "title": "26. TCP/IP fundamentals",
    "icon": "fa-solid fa-network-wired",
    "level": "Advanced (L2/L3)",
    "lead": "The layered model, IPv4 and IPv6 addressing, CIDR subnetting, and how TCP and UDP use ports and sockets.",
    "description": "The layered model, IPv4 and IPv6 addressing, CIDR subnetting, and how TCP and UDP use ports and sockets.",
    "keyConcepts": [
      {
        "title": "The TCP/IP model, IPv4/IPv6 addressing and CIDR",
        "text": "Networking is easier to troubleshoot when you think in layers. Each layer only trusts the one beneath it, so you diagnose bottom-up.\n\n- Link layer — frames on a local segment, addressed by MAC address (48 bits, e.g. `52:54:00:3a:1c:07`). Evidence: `ip link` shows `state UP` and `LOWER_UP` (carrier present).\n- Internet layer..."
      },
      {
        "title": "TCP vs UDP, ports and sockets",
        "text": "IP moves packets between hosts. The transport layer moves data between programs on those hosts, identified by port numbers (0-65535).\n\nTCP (Transmission Control Protocol) is connection-oriented and reliable. Before data flows, the client and server perform the three-way handshake: the client sends SYN, the server rep..."
      }
    ],
    "commands": [
      {
        "cmd": "-br",
        "desc": "Brief one-line-per-interface output from ip"
      },
      {
        "cmd": "-4",
        "desc": "Restrict ip output to IPv4 or IPv6"
      },
      {
        "cmd": "-t",
        "desc": "TCP / UDP sockets"
      },
      {
        "cmd": "-l",
        "desc": "Listening sockets only"
      }
    ],
    "realWorldScenario": {
      "title": "An API server becomes unresponsive every few days; restarting the service fixes it. Monitoring shows open file descriptors climbing steadily.",
      "problem": "Production alert: investigation required in tcp/ip fundamentals.",
      "steps": [
        "Evidence: `ss -tan state close-wait | wc -l` returns several thousand, all with the local port of the API to a database peer.",
        "Hypothesis: the database closes idle connections, but the application never closes its side, leaking sockets and file descriptors until it hits its limit.",
        "Fix: raise the issue with the application team (connection-pool idle timeout / close handling); as a temporary mitigation schedule a controlled restart and monitor.",
        "Validate: after the fix the CLOSE-WAIT count stays low over several days (`ss -tan state close-wait | wc -l` trended in monitoring)."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What does the /24 in 10.1.2.3/24 mean and why does it matter?",
        "a": "It is the prefix length: the first 24 bits are the network, the last 8 the host. It decides which destinations the host treats as on-link (delivered directly via ARP) and which are sent to a gateway, and it defines the network and broadcast addresses."
      },
      {
        "q": "Explain the TCP three-way handshake and what a client sees if nothing listens on the port.",
        "a": "Client sends SYN, server replies SYN-ACK, client sends ACK; then data flows. If no socket listens, the server kernel replies with RST and the client reports \"Connection refused\" immediately."
      }
    ]
  },
  {
    "id": "mod-27",
    "levelId": "L10",
    "category": "server",
    "categoryLabel": "Networking",
    "title": "27. Interface configuration",
    "icon": "fa-solid fa-network-wired",
    "level": "Advanced (L2/L3)",
    "lead": "Inspect links and addresses with ip and nmcli, understand devices versus connection profiles, and build persistent static IPv4/IPv6 configurations and hostnames on RHEL 8, 9 and 10.",
    "description": "Inspect links and addresses with ip and nmcli, understand devices versus connection profiles, and build persistent static IPv4/IPv6 configurations and hostnames on RHEL 8, 9 and 10.",
    "keyConcepts": [
      {
        "title": "Inspecting interfaces: ip, NetworkManager devices and connection profiles",
        "text": "On RHEL 8, 9 and 10, networking is managed by NetworkManager (`NetworkManager.service`). Two tools look at the network from different angles:\n\n- ip (iproute2) talks directly to the kernel. It shows and changes the current state: links, addresses, routes, neighbours. Anything you change with `ip addr add` or `ip route add` is r..."
      },
      {
        "title": "Persistent static IPv4/IPv6 profiles, keyfiles vs ifcfg, and hostname",
        "text": "A static configuration is a set of profile properties. The ones you will use constantly:\n\n- `ipv4.method` — `auto` (DHCP), `manual` (static), `disabled`, `link-local`.\n- `ipv4.addresses` — one or more `ADDRESS/PREFIX` values (comma-separated).\n- `ipv4.gateway` — default gateway.\n- `ipv4.dns` and `ipv4.dns-search` — name servers and se..."
      }
    ],
    "commands": [
      {
        "cmd": "nmcli -t",
        "desc": "Terse, colon-separated output for scripts"
      },
      {
        "cmd": "nmcli -f FIELDS",
        "desc": "Select fields, e.g. -f GENERAL.STATE,IP4.ADDRESS"
      },
      {
        "cmd": "ipv4.method manual|auto",
        "desc": "Static addressing or DHCP"
      },
      {
        "cmd": "ipv4.addresses",
        "desc": "Replace or append addresses (ADDRESS/PREFIX)"
      }
    ],
    "realWorldScenario": {
      "title": "An engineer hand-edited a keyfile to change the gateway, restarted nothing, and later the host rebooted with no network at all.",
      "problem": "Production alert: investigation required in interface configuration.",
      "steps": [
        "Evidence: `nmcli connection show` no longer lists the profile; `journalctl -u NetworkManager -b` shows a warning that the keyfile was ignored because of insecure permissions (the editor wrote it 0644) or a parse error.",
        "Hypothesis: the edited file is invalid or has permissions NetworkManager rejects, so no profile exists for the device.",
        "Fix (from console): `chmod 600` and `chown root:root` the file, correct the syntax (`address1=ADDR/PFX,GW`), then `nmcli connection reload && nmcli connection up NAME`.",
        "Validate: profile listed, device connected, gateway pingable; adopt nmcli for future changes so values are validated."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between a NetworkManager device and a connection?",
        "a": "A device is an actual interface (ens192). A connection is a saved profile of settings that can be activated on a device. One device can have several profiles but one active at a time, and profile names need not match device names."
      },
      {
        "q": "Where are NetworkManager profiles stored on RHEL 8, 9 and 10?",
        "a": "RHEL 8 uses ifcfg files in /etc/sysconfig/network-scripts by default. RHEL 9 writes keyfiles to /etc/NetworkManager/system-connections/*.nmconnection and still reads deprecated ifcfg files. RHEL 10 supports keyfiles only, so ifcfg profiles must be migrated (nmcli connection migrate)."
      }
    ]
  },
  {
    "id": "mod-28",
    "levelId": "L10",
    "category": "server",
    "categoryLabel": "Networking",
    "title": "28. Routing, ARP and MTU",
    "icon": "fa-solid fa-network-wired",
    "level": "Advanced (L2/L3)",
    "lead": "How the kernel chooses a path for every packet, how it finds the next-hop MAC address, and how packet size limits cause some of the most confusing failures in production.",
    "description": "How the kernel chooses a path for every packet, how it finds the next-hop MAC address, and how packet size limits cause some of the most confusing failures in production.",
    "keyConcepts": [
      {
        "title": "The routing table, default gateway and persistent static routes",
        "text": "Every outgoing packet passes through a routing decision: the kernel looks up the destination address in the routing table and picks the entry that matches best. Each entry says \"to reach this prefix, send out this device, optionally via this next-hop gateway\".\n\nRoute types you will see:\n\n- Connected routes (`proto kernel s..."
      },
      {
        "title": "ARP, IPv6 neighbour discovery and MTU problems",
        "text": "Routing tells the kernel which next hop to use; the link layer still needs that hop's MAC address to build an Ethernet frame.\n\nARP (Address Resolution Protocol, IPv4) broadcasts \"who has 10.20.30.1? tell 10.20.30.41\"; the owner replies with its MAC. The answer is cached in the neighbour table. IPv6 uses Neighbour Disco..."
      }
    ],
    "commands": [
      {
        "cmd": "via GW",
        "desc": "Next-hop router for the prefix"
      },
      {
        "cmd": "dev IFACE",
        "desc": "Outgoing interface"
      },
      {
        "cmd": "ip neigh flush dev IFACE",
        "desc": "Clear cached neighbour entries (forces re-resolution)"
      },
      {
        "cmd": "arping -D",
        "desc": "Duplicate address detection; replies indicate a conflict"
      }
    ],
    "realWorldScenario": {
      "title": "After a migration to a new datacentre linked by an IPsec tunnel, users can log in to an application but report that report downloads hang forever. Ping works.",
      "problem": "Production alert: investigation required in routing, arp and mtu.",
      "steps": [
        "Evidence: `curl -o /dev/null https://app/report` stalls after the TLS handshake starts; `ping -M do -s 1472 app` times out with no \"Frag needed\"; `-s 1372` works.",
        "Hypothesis: the tunnel MTU is ~1400 and a firewall drops ICMP fragmentation-needed messages, so PMTUD cannot work (PMTU black hole).",
        "Fix: ask the network team to permit ICMP type 3 code 4 (and ICMPv6 packet-too-big) through the firewalls, or clamp TCP MSS on the tunnel endpoints; as a temporary host-side workaround lower the MTU on the affected profile.",
        "Validate: large downloads complete; `tracepath` shows pmtu 1400 discovered end to end."
      ]
    },
    "interviewQuestions": [
      {
        "q": "How does Linux choose between a default route and a /16 static route?",
        "a": "Longest-prefix match: the most specific matching prefix wins, so the /16 is used for its destinations and the default for everything else. Metric only decides between routes with the same prefix length."
      },
      {
        "q": "What does an ARP entry in state FAILED for the default gateway mean?",
        "a": "The host sent ARP requests for the gateway and received no reply, so it cannot build frames to it; all off-subnet traffic fails. Check link, VLAN tagging, the gateway itself and for a wrong address or prefix."
      }
    ]
  },
  {
    "id": "mod-29",
    "levelId": "L10",
    "category": "server",
    "categoryLabel": "Networking",
    "title": "29. DNS and name resolution",
    "icon": "fa-solid fa-network-wired",
    "level": "Advanced (L2/L3)",
    "lead": "How a name becomes an address on Linux: the NSS order, /etc/hosts, the resolver configuration NetworkManager manages, DNS queries with dig, and the DHCP process that often supplies it all.",
    "description": "How a name becomes an address on Linux: the NSS order, /etc/hosts, the resolver configuration NetworkManager manages, DNS queries with dig, and the DHCP process that often supplies it all.",
    "keyConcepts": [
      {
        "title": "The resolver stack: nsswitch.conf, /etc/hosts and resolv.conf",
        "text": "Applications do not talk to DNS directly. They call the C library (`getaddrinfo()`), and glibc's Name Service Switch (NSS) decides where to look, in the order given by the `hosts:` line of `/etc/nsswitch.conf`:\n\n```\nhosts:      files dns myhostname\n```\n\n- files — `/etc/hosts`, a static table of `ADDRESS  CANONICAL-NAME  [ALIASES]`..."
      },
      {
        "title": "Querying DNS with dig and host, and how DHCP configures clients",
        "text": "DNS is a distributed database of resource records. The types you will meet daily:\n\n- A — IPv4 address; AAAA — IPv6 address.\n- CNAME — alias to another name (the resolver follows it).\n- PTR — reverse mapping from address to name, in `in-addr.arpa` / `ip6.arpa`.\n- MX — mail exchangers; NS — authoritative name..."
      }
    ],
    "commands": [
      {
        "cmd": "getent hosts",
        "desc": "Resolve via NSS (files, dns, ...) like applications do"
      },
      {
        "cmd": "getent ahosts",
        "desc": "Show all addresses getaddrinfo returns (IPv4 and IPv6)"
      },
      {
        "cmd": "@SERVER",
        "desc": "Query this server instead of resolv.conf"
      },
      {
        "cmd": "TYPE",
        "desc": "A, AAAA, MX, NS, SOA, TXT, SRV, PTR, CNAME"
      }
    ],
    "realWorldScenario": {
      "title": "Users report that partner.example.net \"does not resolve\" from all servers since this morning, while other domains work.",
      "problem": "Production alert: investigation required in dns and name resolution.",
      "steps": [
        "Evidence: `dig partner.example.net` returns `status: SERVFAIL` from both corporate resolvers; `dig +cd partner.example.net` (checking disabled) returns an answer; `dig +trace` shows the partner's DNSSEC signatures (RRSIG) expired.",
        "Hypothesis: the partner's zone has an expired DNSSEC signature; validating resolvers correctly refuse the answer. The problem is outside our network.",
        "Fix: contact the partner's DNS team with the dig evidence; do not disable DNSSEC validation on corporate resolvers. If business-critical, the DNS team can add a time-limited negative trust anchor for that domain only.",
        "Validate: after the partner re-signs, `dig partner.example.net` returns NOERROR with the expected record and the `ad` flag."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Why might dig return the right address while the application connects to the wrong server?",
        "a": "dig queries DNS directly. Applications use glibc NSS, which checks /etc/hosts first when nsswitch says \"files dns\". A stale /etc/hosts entry (or a different search domain expansion) wins. Test with getent hosts."
      },
      {
        "q": "What is the difference between NXDOMAIN and SERVFAIL?",
        "a": "NXDOMAIN is an authoritative answer that the name does not exist. SERVFAIL means the resolver failed to obtain an answer: upstream unreachable, lame delegation or DNSSEC validation failure. NXDOMAIN points to the record/name; SERVFAIL points to the resolution path."
      }
    ]
  },
  {
    "id": "mod-30",
    "levelId": "L10",
    "category": "server",
    "categoryLabel": "Networking",
    "title": "30. Network diagnostics",
    "icon": "fa-solid fa-network-wired",
    "level": "Advanced (L2/L3)",
    "lead": "A disciplined, layer-by-layer method for connectivity incidents: sockets with ss, reachability with ping and tracepath, application checks with curl and openssl s_client, packet evidence with tcpdump, and the meaning of each connection error.",
    "description": "A disciplined, layer-by-layer method for connectivity incidents: sockets with ss, reachability with ping and tracepath, application checks with curl and openssl s_client, packet evidence with tcpdump, and the meaning of each connection error.",
    "keyConcepts": [
      {
        "title": "Sockets and reachability: ss, ping, traceroute and tracepath",
        "text": "When a ticket says \"server A cannot reach service B\", work through evidence in a fixed order. Each step either finds the problem or rules a layer out.\n\n1. Is the service listening, on the right address? On B: `ss -tlnp` (TCP) or `ss -ulnp` (UDP). `-t` TCP, `-u` UDP, `-l` listening, `-n` numeric (no slow name lookups), `-p` process (ne..."
      },
      {
        "title": "Application and packet evidence: curl, openssl s_client, tcpdump and connection errors",
        "text": "Connection error messages are precise evidence if you know what produced them.\n\n- Connection refused (`ECONNREFUSED`) — the client received a TCP RST in reply to its SYN (or an ICMP port-unreachable for UDP). The packet reached a host that actively said no: nothing listens on that port/address, or a firewall rule with a TCP-rese..."
      }
    ],
    "commands": [
      {
        "cmd": "ss -p",
        "desc": "Show owning process (root to see all)"
      },
      {
        "cmd": "ss state syn-sent",
        "desc": "Connection attempts awaiting SYN-ACK"
      },
      {
        "cmd": "curl -v",
        "desc": "Verbose: DNS, connect, TLS and HTTP details"
      },
      {
        "cmd": "curl --resolve h:p:ip",
        "desc": "Force a name to an IP without touching DNS"
      }
    ],
    "realWorldScenario": {
      "title": "After a certificate renewal, monitoring (curl-based) reports \"SSL certificate problem: unable to get local issuer certificate\" for portal.example.com, while browsers show the site fine.",
      "problem": "Production alert: investigation required in network diagnostics.",
      "steps": [
        "Evidence: `openssl s_client -connect portal.example.com:443 -servername portal.example.com -showcerts </dev/null` shows only the leaf certificate and `Verify return code: 21`.",
        "Hypothesis: the renewed certificate was installed without the intermediate CA chain; browsers fill the gap via AIA fetching, strict clients do not.",
        "Fix: install the full chain (leaf + intermediates, e.g. the CA's fullchain file) in the web server configuration, validate config syntax, then reload (not restart) the server.",
        "Validate: s_client shows depth 0 and 1 and `Verify return code: 0 (ok)`; the monitoring check passes without -k."
      ]
    },
    "interviewQuestions": [
      {
        "q": "Which command shows listening TCP/UDP sockets with numeric ports and owning processes?",
        "a": "ss -tulnp (TCP, UDP, listening, numeric, processes), run as root to see all processes. It replaces netstat -tulnp and queries the kernel over netlink."
      },
      {
        "q": "What is the difference between 'Connection refused' and 'Connection timed out'?",
        "a": "Refused means the SYN reached a host that answered with a TCP RST: no listener on that port/address (or a reject-with-reset rule). Timed out means no reply at all: the packet or its reply was silently dropped by a firewall DROP rule, a security group, a routing problem or a down host."
      }
    ]
  },
  {
    "id": "mod-31",
    "levelId": "L18",
    "category": "interview",
    "categoryLabel": "RHCSA and RHCE Preparation",
    "title": "31. RHCSA: essential tools, software and scripts",
    "icon": "fa-solid fa-award",
    "level": "Advanced (L2/L3)",
    "lead": "The EX200 foundations: shell tools, files, links, archives, documentation, RPM and Flatpak software management, and simple Bash scripts.",
    "description": "The EX200 foundations: shell tools, files, links, archives, documentation, RPM and Flatpak software management, and simple Bash scripts.",
    "keyConcepts": [
      {
        "title": "Essential tools: shell, files, links, archives and documentation",
        "text": "The RHCSA (exam code EX200) is a performance-based exam: you are given live RHEL systems and a list of tasks, and you are graded on the final state of those systems, usually after a reboot. As of the Red Hat objective page checked on 2026-10-09, EX200 is based on Red Hat Enterprise Linux 10. Objective lists change between releas..."
      },
      {
        "title": "Software with RPM and Flatpak, and simple shell scripts",
        "text": " Managing RPM software\n\nAn RPM package is an archive of files plus metadata (name, version, release, architecture, dependencies, scriptlets). A repository is a directory of RPMs plus metadata that `dnf` downloads to resolve dependencies. On RHEL, repositories come from the Red Hat CDN (after system registration), a Satellite se..."
      }
    ],
    "commands": [
      {
        "cmd": "grep -i",
        "desc": "Case-insensitive / invert match / recursive / extended regex"
      },
      {
        "cmd": "tar -c",
        "desc": "Create / extract / list archive contents"
      },
      {
        "cmd": "dnf provides",
        "desc": "Find which package supplies a file or command (e.g. dnf provides semanage)"
      },
      {
        "cmd": "dnf config-manager --add-repo",
        "desc": "Create a .repo file from a URL (needs dnf-plugins-core)"
      }
    ],
    "realWorldScenario": {
      "title": "`dnf install vsftpd` fails with \"Error: Failed to download metadata for repo 'appstream-local': Cannot download repomd.xml\".",
      "problem": "Production alert: investigation required in rhcsa: essential tools, software and scripts.",
      "steps": [
        "Evidence: `cat /etc/yum.repos.d/*.repo` and test the URL: `curl -I http://content.example.com/rhel10/AppStream/repodata/repomd.xml`.",
        "Hypothesis: baseurl points one directory too high or too low (repodata/ must be directly under baseurl), or a typo in the host name.",
        "Fix: correct baseurl to the directory that contains `repodata/`, then `dnf clean all`.",
        "Validate: `dnf repolist` lists the repo and `dnf install -y vsftpd` succeeds."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between a hard link and a symbolic link?",
        "a": "A hard link is another directory entry for the same inode, so both names are equal and data survives until the last link is removed; it cannot span file systems or point to directories. A symbolic link is a separate inode containing a path; it can span file systems and point to directories, but breaks if the target is moved or deleted."
      },
      {
        "q": "How do you find which package provides a missing command such as `semanage`?",
        "a": "Run `dnf provides semanage` (or `dnf provides */semanage`); on RHEL it returns policycoreutils-python-utils. For an already-installed file use `rpm -qf /path`."
      }
    ]
  },
  {
    "id": "mod-32",
    "levelId": "L18",
    "category": "interview",
    "categoryLabel": "RHCSA and RHCE Preparation",
    "title": "32. RHCSA: operating systems and storage",
    "icon": "fa-solid fa-award",
    "level": "Advanced (L2/L3)",
    "lead": "Operate running systems (boot targets, boot interruption, processes, tuning, journals) and configure local storage, LVM, swap, file systems, NFS and autofs persistently.",
    "description": "Operate running systems (boot targets, boot interruption, processes, tuning, journals) and configure local storage, LVM, swap, file systems, NFS and autofs persistently.",
    "keyConcepts": [
      {
        "title": "Operating running systems: targets, boot access, processes, tuning and journals",
        "text": "The EX200 objective group Operate running systems tests whether you can keep a RHEL system under control at runtime and recover access when locked out.\n\n Boot targets\n\nA systemd target is a named group of units representing a system state. `multi-user.target` is a text-mode server; `graphical.target` adds a display manager; `resc..."
      },
      {
        "title": "Local storage and file systems: GPT, LVM, swap, XFS/ext4/VFAT, NFS and autofs",
        "text": "Storage tasks carry heavy weight in EX200 and are graded after a reboot, so persistence and not destroying existing data are everything.\n\n Partitions\n\nA partition table describes regions of a disk. GPT supports large disks and up to 128 partitions; MBR is legacy. Create partitions with `parted`, `fdisk` or `gdisk`. Exam..."
      }
    ],
    "commands": [
      {
        "cmd": "systemd.unit=rescue.target",
        "desc": "Kernel argument (GRUB edit) to boot once into rescue mode"
      },
      {
        "cmd": "rd.break",
        "desc": "Stop in the initramfs before switching to the real root"
      },
      {
        "cmd": "vgcreate -s 16M",
        "desc": "Set the physical extent size for the VG"
      },
      {
        "cmd": "lvcreate -l 60",
        "desc": "Create an LV of 60 extents (size = 60 x PE size)"
      }
    ],
    "realWorldScenario": {
      "title": "After a reboot the system stops at \"You are in emergency mode\" and the console shows a timeout waiting for device `dev-disk-by\\x2duuid-...device`.",
      "problem": "Production alert: investigation required in rhcsa: operating systems and storage.",
      "steps": [
        "Evidence: log in with the root password; `journalctl -xb | grep -i -E \"timed out|fstab\"` and `cat /etc/fstab`.",
        "Hypothesis: an fstab line references a UUID that does not exist (typo, or the UUID of the LV PV instead of the file system).",
        "Fix: `blkid` to get the correct file-system UUID, `mount -o remount,rw /` if needed, correct the line (or comment it out), `systemctl daemon-reload; mount -a`.",
        "Validate: `findmnt --verify` reports no errors, then reboot and confirm the system reaches the default target."
      ]
    },
    "interviewQuestions": [
      {
        "q": "How do you reset a forgotten root password on RHEL 9?",
        "a": "At GRUB press e, append rd.break to the linux line, Ctrl+x. In the initramfs shell: mount -o remount,rw /sysroot; chroot /sysroot; passwd root; touch /.autorelabel; exit twice. The relabel fixes the SELinux context of /etc/shadow. In production this needs console access and change approval."
      },
      {
        "q": "Why mount by UUID instead of /dev/sdb1 in /etc/fstab?",
        "a": "Kernel device names depend on discovery order and can change when disks are added, removed or reordered, which could mount the wrong file system or block boot. UUIDs (and labels) are stored in the file-system superblock and stay stable."
      }
    ]
  },
  {
    "id": "mod-33",
    "levelId": "L18",
    "category": "interview",
    "categoryLabel": "RHCSA and RHCE Preparation",
    "title": "33. RHCSA: deploy, networking, users and security",
    "icon": "fa-solid fa-award",
    "level": "Advanced (L2/L3)",
    "lead": "Deploy and maintain systems (scheduling, services, time, repos, bootloader), configure IPv4/IPv6 networking and name resolution, manage users and groups, and secure systems with firewalld, SSH keys and SELinux. Ends with an RHCSA revision plan.",
    "description": "Deploy and maintain systems (scheduling, services, time, repos, bootloader), configure IPv4/IPv6 networking and name resolution, manage users and groups, and secure systems with firewalld, SSH keys and SELinux. Ends with an RHCSA revision plan.",
    "keyConcepts": [
      {
        "title": "Deploy and maintain: scheduling, services, time, repositories, bootloader and networking",
        "text": " Scheduling\n\n- at runs a job once: `echo \"tar -czf /root/etc.tgz /etc\" | at now + 10 minutes`; `atq` lists, `atrm N` removes. The `atd` service must be running.\n- cron runs recurring jobs. `crontab -e` (or `crontab -e -u alice` as root) edits a user's table. Fields: minute hour day-of-month month day-of-week command. `/5  ..."
      },
      {
        "title": "Users, groups, firewalld, SSH keys, SELinux and an RHCSA revision plan",
        "text": " Users and groups\n\n`useradd -u 2001 -G wheel -s /bin/bash alice` creates a user with a UID, supplementary group and shell. `usermod -aG devs alice` appends a group (without `-a` you replace all supplementary groups). `groupadd -g 3000 devs`. A user with no interactive login: `useradd -s /sbin/nologin svc1`. Set a password with `passw..."
      }
    ],
    "commands": [
      {
        "cmd": "OnCalendar=",
        "desc": "Calendar expression for a timer (e.g. daily, Mon *-*-* 08:00)"
      },
      {
        "cmd": "Persistent=true",
        "desc": "Run a missed timer job at next boot"
      },
      {
        "cmd": "usermod -aG",
        "desc": "Append supplementary groups (without -a they are replaced)"
      },
      {
        "cmd": "chage -d 0",
        "desc": "Force password change at next login"
      }
    ],
    "realWorldScenario": {
      "title": "httpd fails to start after moving it to port 8888: `journalctl -u httpd` shows \"(13)Permission denied: AH00072: make_sock: could not bind to address [::]:8888\".",
      "problem": "Production alert: investigation required in rhcsa: deploy, networking, users and security.",
      "steps": [
        "Evidence: `ausearch -m AVC -ts recent` shows `denied { name_bind } ... src=8888 ... httpd_t ... tcontext=...unreserved_port_t`.",
        "Hypothesis: SELinux does not label 8888 as an http port, so httpd_t may not bind it.",
        "Fix: `semanage port -a -t http_port_t -p tcp 8888` (use `-m` if the port already has another label), then `systemctl restart httpd`; open the firewall with `firewall-cmd --permanent --add-port=8888/tcp; firewall-cmd --reload`.",
        "Validate: `ss -tlnp | grep 8888` shows httpd and `curl localhost:8888` succeeds with SELinux still enforcing."
      ]
    },
    "interviewQuestions": [
      {
        "q": "cron or systemd timer: which would you choose and why?",
        "a": "Timers integrate with systemd: journal logging per run, dependencies, resource controls, randomised delays and Persistent=true catch-up. cron is simpler and universal. For new system jobs on RHEL I prefer timers; for simple user jobs cron is fine."
      },
      {
        "q": "A website returns 403 after moving DocumentRoot to /srv/site. Permissions are 755. What do you check and fix?",
        "a": "Check `ls -Zd /srv/site` and `ausearch -m AVC -ts recent`. If the type is var_t/default_t, add a rule `semanage fcontext -a -t httpd_sys_content_t \"/srv/site(/.*)?\"` and run `restorecon -Rv /srv/site`. Also confirm httpd.conf has a <Directory> block granting access."
      }
    ]
  },
  {
    "id": "mod-34",
    "levelId": "L18",
    "category": "interview",
    "categoryLabel": "RHCSA and RHCE Preparation",
    "title": "34. RHCE: Ansible core",
    "icon": "fa-solid fa-award",
    "level": "Advanced (L2/L3)",
    "lead": "EX294 foundations: installing Ansible, ansible.cfg and ansible-navigator.yml, static inventories and host groups, preparing managed nodes, then plays and playbooks with modules, variables, facts, register, loops, conditionals, handlers and error handling.",
    "description": "EX294 foundations: installing Ansible, ansible.cfg and ansible-navigator.yml, static inventories and host groups, preparing managed nodes, then plays and playbooks with modules, variables, facts, register, loops, conditionals, handlers and error handling.",
    "keyConcepts": [
      {
        "title": "Installing and configuring Ansible: ansible.cfg, ansible-navigator, inventory and managed nodes",
        "text": "The RHCE exam (EX294) tests automating Linux administration with Ansible. Per the Red Hat objective page checked on 2026-10-09, its objectives \"are based on the most recent Red Hat product version available\" (current RHEL and Red Hat Ansible Automation Platform), include all RHCSA-level tasks, and cover: understanding core Ansible com..."
      },
      {
        "title": "Plays and playbooks: modules, variables, facts, register, loops, conditionals, handlers and error handling",
        "text": " Playbook anatomy\n\n```\n---\n- name: Configure web servers\n  hosts: webservers\n  become: true\n  vars:\n    web_pkgs:\n      - httpd\n      - mod_ssl\n  tasks:\n    - name: Install packages\n      ansible.builtin.dnf:\n        name: \"{{ web_pkgs }}\"\n        state: present\n\n    - name: Deploy index page\n      ansible.builtin.copy:\n        content..."
      }
    ],
    "commands": [
      {
        "cmd": "-i INVENTORY",
        "desc": "Use a specific inventory file or directory"
      },
      {
        "cmd": "-m stdout",
        "desc": "ansible-navigator: print output like ansible-playbook instead of the TUI"
      },
      {
        "cmd": "--syntax-check",
        "desc": "Parse the playbook without running it"
      },
      {
        "cmd": "--check --diff",
        "desc": "Dry run showing changes (modules must support check mode)"
      }
    ],
    "realWorldScenario": {
      "title": "A playbook fails immediately with: \"ERROR! We were unable to read either as JSON nor YAML ... found unacceptable key (unhashable type: 'dict')\" pointing at `name: {{ pkg }}`.",
      "problem": "Production alert: investigation required in rhce: ansible core.",
      "steps": [
        "Evidence: the error line shows an unquoted value starting with `{{`.",
        "Hypothesis: YAML parses `{` as the start of an inline dictionary, so the value must be quoted.",
        "Fix: change to `name: \"{{ pkg }}\"`.",
        "Validate: `ansible-playbook --syntax-check site.yml` passes and the task runs."
      ]
    },
    "interviewQuestions": [
      {
        "q": "In what order does Ansible look for its configuration file?",
        "a": "ANSIBLE_CONFIG environment variable, then ansible.cfg in the current directory, then ~/.ansible.cfg, then /etc/ansible/ansible.cfg. Only the first found is used; settings are not merged."
      },
      {
        "q": "When does a handler run, and what if the play fails before then?",
        "a": "Handlers run once at the end of the play (or at meta: flush_handlers) if any notifying task reported changed. If a later task fails on that host, its pending handlers do not run unless force_handlers is set, which can leave config changed but the service not restarted."
      }
    ]
  },
  {
    "id": "mod-35",
    "levelId": "L18",
    "category": "interview",
    "categoryLabel": "RHCSA and RHCE Preparation",
    "title": "35. RHCE: advanced automation",
    "icon": "fa-solid fa-award",
    "level": "Advanced (L2/L3)",
    "lead": "Jinja2 templates, roles, Content Collections and Ansible Vault; automating RHCSA tasks idempotently, troubleshooting automation, Git basics and an RHCE revision plan.",
    "description": "Jinja2 templates, roles, Content Collections and Ansible Vault; automating RHCSA tasks idempotently, troubleshooting automation, Git basics and an RHCE revision plan.",
    "keyConcepts": [
      {
        "title": "Templates, roles, Content Collections and Ansible Vault",
        "text": " Jinja2 templates\n\nThe `ansible.builtin.template` module renders a Jinja2 file on the control node and copies the result to the managed node. `{{ expr }}` outputs a value, `{% ... %}` is a statement (for/if), `{ ... }` is a comment. Filters transform values: `{{ name | upper }}`, `{{ port | default(80) }}`, `{{ list | join(',') }..."
      },
      {
        "title": "Automating RHCSA tasks, idempotency, troubleshooting, Git basics and an RHCE revision plan",
        "text": "EX294 expects you to automate the same tasks you perform manually for RHCSA. The skill is choosing the right idempotent module: a module that checks current state and only changes what differs, so running a playbook twice produces no changes the second time.\n\n Module map for RHCSA tasks\n\n| Task | Module (FQCN) |\n|---|---|\n| Reposit..."
      }
    ],
    "commands": [
      {
        "cmd": "-p PATH",
        "desc": "ansible-galaxy: install into this path (match roles_path / collections_path)"
      },
      {
        "cmd": "-r FILE",
        "desc": "Install everything listed in a requirements file"
      },
      {
        "cmd": "state: mounted (ansible.posix.mount)",
        "desc": "Add to fstab AND mount now"
      },
      {
        "cmd": "state: present (ansible.posix.mount)",
        "desc": "Only add to fstab"
      }
    ],
    "realWorldScenario": {
      "title": "Every run reports `changed` for the task `Set tuned profile` (`ansible.builtin.command: tuned-adm profile virtual-guest`), breaking the idempotency requirement.",
      "problem": "Production alert: investigation required in rhce: advanced automation.",
      "steps": [
        "Evidence: the recap always shows changed=1; the task uses command with no guard.",
        "Hypothesis: command always reports changed because Ansible cannot know whether the profile was already active.",
        "Fix: register `tuned-adm active` with `changed_when: false`, then run the profile command only `when: \"'virtual-guest' not in current.stdout\"`.",
        "Validate: the second run shows the profile task skipped and changed=0."
      ]
    },
    "interviewQuestions": [
      {
        "q": "What is the difference between role defaults and role vars?",
        "a": "defaults/main.yml has the lowest precedence and is meant to be overridden by inventory or play variables; vars/main.yml has high precedence and is for values the role needs fixed."
      },
      {
        "q": "What makes an Ansible task idempotent, and how do you prove it?",
        "a": "The module checks current state and only acts if it differs from the desired state. Prove it by running the playbook twice: the second run should report changed=0. Use check/diff mode to preview."
      }
    ]
  }
];

const quizData = [
  {
    "id": 1,
    "q": "On a RHEL 9 host you download `bash-5.1.8-9.el9.x86_64.rpm`. In NEVRA terms, which part of the file name is the release?",
    "options": [
      "5.1.8",
      "9.el9",
      "x86_64",
      "bash-5.1.8"
    ],
    "answer": 1,
    "explanation": "NEVRA is Name-Epoch:Version-Release.Arch. Here the name is bash, the upstream version is 5.1.8, the release is 9.el9 (the packager's build number plus the dist tag) and the architecture is x86_64."
  },
  {
    "id": 2,
    "q": "Which command tells you which installed package delivered the file `/etc/chrony.conf`?",
    "options": [
      "rpm -ql /etc/chrony.conf",
      "rpm -qc chrony.conf",
      "rpm -qf /etc/chrony.conf",
      "rpm -qp /etc/chrony.conf"
    ],
    "answer": 2,
    "explanation": "`rpm -qf PATH` looks the path up in the rpmdb and prints the owning package (chrony-...). It maps a file to its package."
  },
  {
    "id": 3,
    "q": "You run `rpm -q nginx` and get:\n`package nginx is not installed`\nWhat does this tell you?",
    "options": [
      "No package named nginx is recorded in the rpmdb on this host",
      "nginx is installed but its service is stopped",
      "The nginx package is not available in any enabled repository",
      "The rpm database is corrupted and must be rebuilt"
    ],
    "answer": 0,
    "explanation": "`rpm -q` only queries the local rpmdb. The message means no installed package with that name exists; it says nothing about repositories or services."
  },
  {
    "id": 4,
    "q": "A security scanner flags `/usr/local/bin/backup.sh`. You run `rpm -qf /usr/local/bin/backup.sh` and see:\n`file /usr/local/bin/backup.sh is not owned by any package`\nWhat is the best next step?",
    "options": [
      "Run `rpm --rebuilddb`, because the file must be missing from a damaged rpmdb",
      "Delete the file immediately, since unpackaged executables are always malicious",
      "Reinstall bash so the script is re-registered in the rpmdb",
      "Establish provenance with `stat`, configuration-management history and audit/journal logs around its mtime, then package or document it"
    ],
    "answer": 3,
    "explanation": "The file was placed outside RPM (manually or by config management). Evidence-first: check timestamps, ownership and change records before deciding whether to package it, document it or remove it."
  },
  {
    "id": 5,
    "q": "Before installing a vendor's `vendor-agent-3.1-2.x86_64.rpm`, you want to read the scripts it will run as root during install and removal. Which command does that?",
    "options": [
      "rpm -q --scripts vendor-agent-3.1-2.x86_64.rpm",
      "rpm -qp --scripts ./vendor-agent-3.1-2.x86_64.rpm",
      "rpm -V ./vendor-agent-3.1-2.x86_64.rpm",
      "dnf history info vendor-agent"
    ],
    "answer": 1,
    "explanation": "`-p` makes rpm read the package file instead of the rpmdb, and `--scripts` prints the %pre/%post/%preun/%postun scriptlets so you can review them before installing."
  },
  {
    "id": 6,
    "q": "Select all that apply: which commands print file paths that the installed package `chrony` placed on the system?",
    "options": [
      "rpm -qc chrony",
      "rpm -qi chrony",
      "rpm -qd chrony",
      "rpm -qR chrony",
      "rpm -ql chrony"
    ],
    "answer": 0,
    "explanation": "`-ql` lists every file, `-qc` only the %config files and `-qd` only the documentation files. All three print paths owned by the package."
  },
  {
    "id": 7,
    "q": "After a maintenance window you run `rpm -qa --last | head -2`:\n`kernel-core-5.14.0-427.13.1.el9_4.x86_64   Tue 14 May 2024 02:11:09 AM UTC`\n`openssl-libs-3.0.7-27.el9.x86_64           Tue 14 May 2024 02:10:41 AM UTC`\nWhat does this output show?",
    "options": [
      "The two oldest packages on the system",
      "Packages with pending updates in the repositories",
      "The two most recently installed or updated packages, newest first, with install time",
      "Packages that failed verification during the window"
    ],
    "answer": 2,
    "explanation": "`--last` sorts the installed packages by install time, newest first. It is a quick way to see what changed during a patch window."
  },
  {
    "id": 8,
    "q": "A scanner reports that a RHEL 9 server is vulnerable to an OpenSSL CVE \"fixed upstream in 3.0.8\". `rpm -q openssl` returns `openssl-3.0.7-27.el9.x86_64`. What is the most accurate assessment?",
    "options": [
      "The scanner may be judging by upstream version only; Red Hat backports fixes into the same version with a new release, so check `rpm -q --changelog openssl | grep CVE-...` or the errata",
      "The host is definitely vulnerable because 3.0.7 is older than 3.0.8",
      "Rebuild OpenSSL 3.0.8 from upstream source and install it over the RPM",
      "The release field 27.el9 is cosmetic and cannot indicate security fixes"
    ],
    "answer": 0,
    "explanation": "RHEL keeps the upstream version stable and backports security fixes, incrementing the release. The changelog and the errata (`dnf updateinfo`) show whether the CVE is fixed in the installed release."
  },
  {
    "id": 9,
    "q": "On a RHEL 10 server, a backup script still copies `/var/lib/rpm` to protect the rpm database. Where does the rpmdb live on RHEL 10, and how should the script determine it?",
    "options": [
      "Always /var/lib/rpm in Berkeley DB format, on every RHEL release",
      "/var/cache/dnf, determined from dnf.conf cachedir",
      "/etc/rpm/db, determined by reading /etc/rpm/macros",
      "Under /usr/lib/sysimage/rpm (a compatibility path is kept); query it with `rpm --eval '%_dbpath'`"
    ],
    "answer": 3,
    "explanation": "RHEL 10 relocates the rpmdb to /usr/lib/sysimage/rpm. RHEL 9 uses SQLite in /var/lib/rpm and RHEL 8 Berkeley DB. `rpm --eval '%_dbpath'` returns the real path on any release."
  },
  {
    "id": 10,
    "q": "In the directory holding a downloaded package you run `rpm -qi vendor-agent-3.1-2.x86_64.rpm` and get `package vendor-agent-3.1-2.x86_64.rpm is not installed`. The file exists. Why?",
    "options": [
      "The package signature is invalid, so rpm refuses to read it",
      "The file is not an RPM because its name lacks a dist tag",
      "Without `-p`, rpm searches the rpmdb for an installed package with that literal name; use `rpm -qip ./vendor-agent-3.1-2.x86_64.rpm`",
      "rpm cannot read packages from the current directory without an absolute path"
    ],
    "answer": 2,
    "explanation": "Query mode defaults to the rpmdb. The `-p` selector tells rpm the argument is a package file to read, so `rpm -qip FILE` shows its header."
  },
  {
    "id": 11,
    "q": "`rpm -V openssh-server` prints:\n`S.5....T.  c /etc/ssh/sshd_config`\nWhat does this line mean?",
    "options": [
      "The sshd binary was replaced and must be reinstalled",
      "The config file's size, digest and modification time differ from the package, which is expected after an admin edits it",
      "The file is missing from disk",
      "The file's owner and group were changed"
    ],
    "answer": 1,
    "explanation": "S = size, 5 = digest, T = mtime differ; `c` marks a %config file. Edited configuration files are normal; investigation focuses on changed binaries and libraries."
  },
  {
    "id": 12,
    "q": "Which command checks the digests and GPG signature of a downloaded package file before you install it?",
    "options": [
      "rpm -K ./pkg.rpm",
      "rpm -V ./pkg.rpm",
      "rpm --import ./pkg.rpm",
      "rpm -qa gpg-pubkey*"
    ],
    "answer": 0,
    "explanation": "`rpm -K` (alias `--checksig`) verifies the package file's digests and signature against the keys imported in the rpmdb."
  },
  {
    "id": 13,
    "q": "After importing a vendor key with `rpm --import`, how does the key appear in the rpm database?",
    "options": [
      "As a file in /etc/yum.repos.d",
      "It is stored only in root's ~/.gnupg keyring",
      "As a line in /etc/dnf/dnf.conf",
      "As a gpg-pubkey-KEYID-DATE pseudo-package listed by `rpm -qa gpg-pubkey*`"
    ],
    "answer": 3,
    "explanation": "rpm stores imported public keys as gpg-pubkey pseudo-packages; `rpm -qi gpg-pubkey-...` shows the key's owner and details."
  },
  {
    "id": 14,
    "q": "After a junior admin ran `chmod -R 755 /usr/bin`, normal users can no longer use `passwd`. `rpm -Vf /usr/bin/passwd` prints:\n`.M.......    /usr/bin/passwd`\nWhat is the correct interpretation and fix?",
    "options": [
      "The digest changed; the binary was tampered with and the host must be rebuilt",
      "The file is a %config file and the change is expected",
      "The mode changed (setuid bit lost); restore it with `rpm --setperms passwd` or `dnf reinstall passwd`",
      "The mtime changed; run `touch /usr/bin/passwd`"
    ],
    "answer": 2,
    "explanation": "M = mode differs. The recursive chmod removed the setuid bit; `rpm --setperms` resets modes to the values recorded in the rpmdb."
  },
  {
    "id": 15,
    "q": "Select all that apply: `rpm -Va` on a production server returns these lines. Which ones warrant investigation as possible tampering?",
    "options": [
      "`S.5....T.  c /etc/httpd/conf/httpd.conf`",
      "`S.5....T.    /usr/sbin/sshd`",
      "`..5......    /usr/lib64/libpam.so.0.85.1`",
      "`.......T.  c /etc/chrony.conf`"
    ],
    "answer": 1,
    "explanation": "Changed digests on non-config binaries and libraries (sshd, libpam) are not expected and need investigation. Lines marked `c` are configuration files that admins routinely edit."
  },
  {
    "id": 16,
    "q": "A vendor's install guide says: \"If you see signature errors, set gpgcheck=0 in the repo file.\" Installing their package fails with a NOKEY error. What is the safe remediation?",
    "options": [
      "Obtain the vendor's public key, verify its fingerprint through an independent channel, import it with `rpm --import` (or gpgkey= in the repo) and confirm with `rpm -K`",
      "Follow the guide and set gpgcheck=0 permanently",
      "Install with `rpm -ivh --nosignature`",
      "Set gpgcheck=0 globally in /etc/dnf/dnf.conf so the change survives repo file updates"
    ],
    "answer": 0,
    "explanation": "NOKEY means the signing key is not trusted yet. Importing a key whose fingerprint was verified out of band keeps the supply-chain control while making the install work."
  },
  {
    "id": 17,
    "q": "`rpm -Kv ./zabbix-agent2-7.0.4-release1.el9.x86_64.rpm` prints (excerpt):\n`Header V4 RSA/SHA512 Signature, key ID 08b40d20: NOKEY`\n`Header SHA256 digest: OK`\n`Payload SHA256 digest: OK`\nWhat is the most likely situation?",
    "options": [
      "The file was corrupted during download",
      "The package is unsigned",
      "The package is signed for a different architecture",
      "The file is intact, but the public key 08b40d20 has not been imported into the rpmdb"
    ],
    "answer": 3,
    "explanation": "Digests are OK, so the content is intact. NOKEY means the signature exists but rpm lacks the matching public key; verify the vendor key's fingerprint and import it."
  },
  {
    "id": 18,
    "q": "After the recursive `chmod -R 755 /usr/bin` incident, sudo, passwd and several other setuid tools are broken. What is the most complete and lowest-risk way to restore correct modes?",
    "options": [
      "Run `chmod u+s` on sudo and passwd only",
      "Use `rpm -Va` to find files with an M flag under /usr/bin, map them to packages with `rpm -qf`, then run `rpm --setperms` on each package and re-verify",
      "rsync /usr/bin from another server with the same release",
      "Run `dnf reinstall '*'` to reinstall every package"
    ],
    "answer": 1,
    "explanation": "The rpmdb records the correct mode for every packaged file. Finding all affected packages and resetting them with --setperms fixes every setuid/setgid binary without replacing content, and `rpm -Va` proves the result."
  },
  {
    "id": 19,
    "q": "A legacy internal package installed fine on RHEL 8 but on RHEL 9 is rejected with a signature error, although the same key is imported. The package was signed with a SHA-1 based signature. What is the right fix?",
    "options": [
      "Have the package re-signed with a SHA-256 (or stronger) signature, because RHEL 9 crypto policies reject SHA-1 signatures by default",
      "Run `update-crypto-policies --set LEGACY` permanently on all RHEL 9 hosts",
      "Install it with `--nosignature` on RHEL 9 only",
      "Re-import the same key with `rpm --import --force`"
    ],
    "answer": 0,
    "explanation": "RHEL 9 default crypto policies no longer trust SHA-1 signatures. The sustainable fix is to re-sign the package with a modern digest, not to weaken the whole system's policy."
  },
  {
    "id": 20,
    "q": "A hardened server has `/etc/myapp/secrets.conf` (a %config file of package myapp) set to mode 0600, while the package ships it as 0644. A colleague wants to run `rpm --setperms myapp` to fix a different file. What is the risk?",
    "options": [
      "--setperms resets every file in the package to the rpmdb modes, so the hardened 0600 secret file becomes 0644 again",
      "--setperms deletes modified config files",
      "There is no risk; --setperms only touches files with an M flag that are binaries",
      "--setperms also changes file contents back to package defaults"
    ],
    "answer": 0,
    "explanation": "`rpm --setperms` applies the packaged mode to all files in the package, including intentionally hardened ones. Check `rpm -V` output first and reapply hardening (or fix only the specific file) afterwards."
  }
];

const scenarioDrills = [
  {
    "id": "INC-01",
    "title": "Root filesystem full on app server",
    "severity": "P2",
    "alert": "Zabbix: Free disk space is less than 1% on volume / (rhel-app-02) | Cron job \"nightly-export\" failed: \"No space left on device\" | Portal users report file uploads failing with HTTP 500",
    "phases": [
      {
        "question": "Diagnostic Step 1: Check filesystem usage",
        "options": [
          {
            "text": "df -hT",
            "feedback": "Block usage on / is 100% with only 104M free. /mnt/share is NFS and must be excluded from any du scan (use du -x) or you will waste minutes walking a 211G remote tree.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Check inode usage",
        "options": [
          {
            "text": "df -i /",
            "feedback": "Inodes are fine (1%). This is a block-space problem, not inode exhaustion.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: Find the largest top-level directories (same filesystem only)",
        "options": [
          {
            "text": "du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -6",
            "feedback": "-x keeps du on the root filesystem. /var holds 39G of the 50G - drill down there.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: Drill into /var/log",
        "options": [
          {
            "text": "du -xh --max-depth=2 /var/log | sort -h | tail -5",
            "feedback": "The application log directory /var/log/portal is 35G. audit (1.4G) and journal (212M) are within their configured limits.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  },
  {
    "id": "INC-02",
    "title": "Mail queue host reports \"No space left\" with free blocks",
    "severity": "P2",
    "alert": "Postfix: \"warning: mail_queue_enter: create file maildrop/...: No space left on device\" | Web form returns \"session_start(): Failed to write session data\" | Disk monitoring shows /var at only 46% used",
    "phases": [
      {
        "question": "Diagnostic Step 1: Check block usage on /var",
        "options": [
          {
            "text": "df -h /var",
            "feedback": "Plenty of free blocks, yet writes fail with ENOSPC. That contradiction is the clue: something other than blocks is exhausted.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Check inode usage on /var",
        "options": [
          {
            "text": "df -i /var",
            "feedback": "All 1,310,720 inodes are used. On ext4 the inode count is fixed at mkfs time, so creating any new file fails with \"No space left on device\" even with free blocks.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: Count files per directory under /var",
        "options": [
          {
            "text": "for d in /var/*; do echo \"$(find \"$d\" -xdev | wc -l) $d\"; done | sort -n | tail -4",
            "feedback": "/var/lib contains almost every inode. Keep narrowing.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: Narrow down inside /var/lib",
        "options": [
          {
            "text": "find /var/lib -xdev -type f | cut -d/ -f1-5 | sort | uniq -c | sort -n | tail -2",
            "feedback": "1.26 million files in /var/lib/php/session - PHP session files. Each is tiny (a few hundred bytes) so they use few blocks but one inode each.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  },
  {
    "id": "INC-03",
    "title": "Load average 30+ on API node after cron jobs pile up",
    "severity": "P2",
    "alert": "Prometheus: node_load1 on rhel-api-03 = 31.6 (8 vCPU) | API p95 latency up from 120 ms to 4.8 s; HAProxy marks the node \"DOWN\" intermittently on health-check timeouts | SSH login to the host takes ~20 seconds",
    "phases": [
      {
        "question": "Diagnostic Step 1: Check load average and uptime",
        "options": [
          {
            "text": "uptime; nproc",
            "feedback": "Load of ~31 on 8 CPUs, and still rising over 15 minutes. Load alone does not tell you whether it is CPU, I/O wait or blocked tasks - look at CPU states next.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Break down CPU time by state",
        "options": [
          {
            "text": "mpstat 1 3",
            "feedback": "~97% user time, near-zero iowait and steal. This is genuine userspace CPU demand from processes on this guest, not storage latency or a noisy neighbour on the hypervisor.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: See which processes are consuming CPU",
        "options": [
          {
            "text": "top -b -n1 -o %CPU | head -14",
            "feedback": "The CPU is dominated by many python3 processes owned by \"reports\", not by the orders API (gunicorn). They have similar memory and long, staggered TIME+ values.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: List the reports processes with start times and command lines",
        "options": [
          {
            "text": "ps -u reports -o pid,lstart,etime,pcpu,args --sort=lstart",
            "feedback": "A new reportgen instance started exactly every 5 minutes since 00:05 and none has finished: 18 copies now compete for 8 CPUs, so each runs slower, which guarantees the next one also overlaps. Classic cron pile-up.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  },
  {
    "id": "INC-04",
    "title": "Orders service repeatedly killed by the OOM killer",
    "severity": "P1",
    "alert": "PagerDuty: orders-svc on rhel-app-07 restarted 6 times in 40 minutes | Customers see intermittent HTTP 503 during checkout | Grafana shows host memory climbing to ~100% before each restart",
    "phases": [
      {
        "question": "Diagnostic Step 1: Check the service status",
        "options": [
          {
            "text": "systemctl status orders-svc --no-pager",
            "feedback": "systemd itself reports the OOM killer. The JVM was SIGKILLed - it did not crash on its own, so there is no Java stack trace to find.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Read the kernel OOM report",
        "options": [
          {
            "text": "journalctl -k --since \"10:00\" | grep -iE \"oom|killed process\"",
            "feedback": "The killed JVM had 12.3G of anonymous memory on a 16G host that also runs Redis. It was allowed to grow larger than the machine can hold.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: Check memory and swap",
        "options": [
          {
            "text": "free -h",
            "feedback": "Three minutes after the restart, used memory is already 13G and available is under 2G, with no swap to absorb spikes.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: Show the largest memory consumers",
        "options": [
          {
            "text": "ps -eo pid,user,rss,args --sort=-rss | head -4",
            "feedback": "The JVM runs with -Xms12g -Xmx12g. Heap alone is 12G; add metaspace, thread stacks, code cache and direct buffers and the process exceeds 13G. Redis holds 3.1G. 13G + 3.1G + OS > 16G.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  },
  {
    "id": "INC-05",
    "title": "portal-app fails after patch reboot: port 8080 already in use",
    "severity": "P1",
    "alert": "PagerDuty: Production Customer Portal is down. Load balancer reports 502 Bad Gateway to backend 10.10.40.15:8080 | Load balancer health check on /health returns 404 instead of 200 | Server came back from the monthly patch reboot a few minutes earlier",
    "phases": [
      {
        "question": "Diagnostic Step 1: Check portal-app status",
        "options": [
          {
            "text": "systemctl status portal-app --no-pager",
            "feedback": "The unit is enabled and was started at boot, but the Java process exited with status 1 after ~10 s of CPU. The journal will say why.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Read the service logs",
        "options": [
          {
            "text": "journalctl -u portal-app -b --no-pager | grep -E \"FAILED|Port|BindException\"",
            "feedback": "Something else owns TCP 8080. The LB gets 404 (not connection refused) because that something answers HTTP but has no /health route.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: Find who is listening on 8080",
        "options": [
          {
            "text": "ss -tlnp \"sport = :8080\"",
            "feedback": "PID 1890, a python3 process, holds 0.0.0.0:8080. A listen backlog of 5 is typical of Python's http.server - not a production component.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: Identify PID 1890 and what started it",
        "options": [
          {
            "text": "ps -o pid,user,lstart,args -p 1890; systemctl status 1890 --no-pager | head -5",
            "feedback": "It is a systemd USER service owned by jsmith, enabled to start automatically. It started at 02:03:58, 53 seconds before portal-app failed, and won the race for port 8080.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  },
  {
    "id": "INC-06",
    "title": "Internal hostnames stop resolving on web tier node",
    "severity": "P2",
    "alert": "App log: \"java.net.UnknownHostException: db01.internal.example.com: Name or service not known\" | Only rhel-web-04 is affected; web-03 and web-05 are healthy | Public names (e.g. dnf repositories on cdn.redhat.com) still resolve on the host",
    "phases": [
      {
        "question": "Diagnostic Step 1: Test name resolution the way applications do",
        "options": [
          {
            "text": "getent hosts db01.internal.example.com; getent hosts cdn.redhat.com",
            "feedback": "Internal names fail (exit 2 = not found) while public names resolve. That points at WHICH resolver is being asked, not at a dead network.",
            "nextPhase": 1
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 0
          }
        ]
      },
      {
        "question": "Diagnostic Step 2: Inspect /etc/resolv.conf",
        "options": [
          {
            "text": "cat /etc/resolv.conf",
            "feedback": "The host is using public resolvers that know nothing about internal.example.com. The file is generated by NetworkManager, so the source of truth is the connection profile, not this file.",
            "nextPhase": 2
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 1
          }
        ]
      },
      {
        "question": "Diagnostic Step 3: Inspect the DNS settings of the connection profile",
        "options": [
          {
            "text": "nmcli -f ipv4.dns,ipv4.ignore-auto-dns,IP4.DNS con show ens192",
            "feedback": "Someone set static public DNS servers and ignore-auto-dns=yes, so the internal servers offered by DHCP are discarded. This is persistent in the profile and survives reboots.",
            "nextPhase": 3
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 2
          }
        ]
      },
      {
        "question": "Diagnostic Step 4: Query the internal DNS server directly",
        "options": [
          {
            "text": "dig +short @10.20.0.10 db01.internal.example.com",
            "feedback": "The internal DNS server is reachable and answers correctly. The DNS infrastructure is healthy; this host is just not asking it.",
            "nextPhase": 4
          },
          {
            "text": "systemctl reboot",
            "feedback": "Blindly rebooting loses forensic logs and does not fix the root cause.",
            "nextPhase": 3
          }
        ]
      }
    ]
  }
];

const enterpriseProjects = [
  {
    "title": "Linux Server Baseline Configuration",
    "level": "Enterprise Architecture",
    "tags": [
      "baseline",
      "nmcli",
      "chrony",
      "dnf",
      "hostnamectl",
      "firewalld",
      "selinux"
    ],
    "summary": "Take a freshly installed RHEL server and bring it to a documented, repeatable baseline: identity, networking, time, packages, core security services and a baseline report. Every later project assumes a server that looks like this, and in real teams a consistent baseline is what makes servers supportable at scale.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "User, Group and Permission Administration",
    "level": "Enterprise Architecture",
    "tags": [
      "users",
      "groups",
      "permissions",
      "sgid",
      "acl",
      "sudo",
      "umask",
      "chage"
    ],
    "summary": "Implement an access model for a small engineering department: accounts with password policy, project groups, shared directories with correct ownership, SGID, sticky bit and ACLs, and least-privilege sudo. Access control mistakes are among the most common causes of both outages and security findings.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Systemd Service Deployment",
    "level": "Enterprise Architecture",
    "tags": [
      "systemd",
      "unit-files",
      "timers",
      "journald",
      "firewalld",
      "service-hardening"
    ],
    "summary": "Package a small internal web application as a production-grade systemd service: dedicated service account, environment file, restart policy, sandboxing, journald logging, firewall exposure and a scheduled maintenance timer. This is the standard way to run anything long-lived on modern RHEL, and doing it well removes a whole class of \"it died overnight\" incidents.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Persistent Storage Using LVM",
    "level": "Enterprise Architecture",
    "tags": [
      "lvm",
      "xfs",
      "parted",
      "fstab",
      "storage",
      "emergency-mode",
      "swap"
    ],
    "summary": "Provision, mount, grow and protect application storage with LVM and XFS, and write the storage expansion and fstab recovery runbook that an on-call engineer can follow at 3 a.m. Storage growth and mount failures are among the most frequent real-world tickets for Linux administrators.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "SSH and Firewall Hardening",
    "level": "Enterprise Architecture",
    "tags": [
      "ssh",
      "sshd",
      "firewalld",
      "zones",
      "selinux",
      "semanage",
      "hardening"
    ],
    "summary": "Harden remote administration of a server: key-only SSH for named admin users, no direct root login, a non-default port labelled correctly for SELinux, and firewalld zones that restrict management access to an admin network. SSH is the front door of every Linux server, and getting it wrong locks out administrators or lets attackers in.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "SELinux Troubleshooting",
    "level": "Enterprise Architecture",
    "tags": [
      "selinux",
      "semanage",
      "restorecon",
      "booleans",
      "audit",
      "httpd",
      "troubleshooting"
    ],
    "summary": "Diagnose and correctly fix the four classic SELinux failure patterns — wrong file context, non-standard port, missing boolean and context lost by `mv` — while keeping SELinux enforcing throughout. \"Just disable SELinux\" is a security finding in any audit; knowing the right fix is a core enterprise skill.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Monitoring and Log Analysis",
    "level": "Enterprise Architecture",
    "tags": [
      "journald",
      "rsyslog",
      "logrotate",
      "sysstat",
      "monitoring",
      "oom",
      "log-analysis"
    ],
    "summary": "Build the observability foundations of a small Linux estate: persistent journald, central log forwarding with rsyslog, log rotation policy, performance history with sysstat, and a log-triage script that surfaces OOM kills, disk-space pressure and failed units before they become outages. You cannot fix what you cannot see, and most incident time is lost in finding evidence.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Bash Operational Automation",
    "level": "Enterprise Architecture",
    "tags": [
      "bash",
      "scripting",
      "automation",
      "idempotency",
      "systemd-timers",
      "git",
      "shellcheck"
    ],
    "summary": "Write a small, production-quality Bash toolkit — bulk user provisioning from CSV, configuration backup with rotation, and a fleet health-check over SSH — using strict mode, argument parsing, logging, locking, idempotency and meaningful exit codes. Good scripts turn repetitive tickets into safe, auditable one-liners; bad scripts cause outages.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Ansible Server Configuration",
    "level": "Enterprise Architecture",
    "tags": [
      "ansible",
      "iac",
      "roles",
      "jinja2",
      "vault",
      "idempotency",
      "selinux",
      "firewalld"
    ],
    "summary": "Codify the server baseline, access model and web service from earlier projects as an idempotent Ansible project: inventory, roles, templates, handlers, vaulted secrets and SELinux/firewalld modules. Configuration as code is how enterprise teams keep hundreds of servers consistent and reviewable.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "P1 Production Incident Resolution",
    "level": "Enterprise Architecture",
    "tags": [
      "incident-response",
      "troubleshooting",
      "rca",
      "httpd",
      "selinux",
      "firewalld",
      "disk-full",
      "lsof"
    ],
    "summary": "Run a realistic priority-1 incident end to end in a lab: injected multi-layer faults take a web service down, and you must triage methodically, restore service, keep a timeline, verify recovery, and write a blameless root cause analysis with preventive actions. Structured incident handling is what separates calm, effective on-call engineers from guesswork under pressure.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Enterprise Linux Hardening",
    "level": "Enterprise Architecture",
    "tags": [
      "hardening",
      "openscap",
      "cis",
      "auditd",
      "aide",
      "faillock",
      "crypto-policies",
      "compliance"
    ],
    "summary": "Measure a server against a published security baseline with OpenSCAP, remediate findings in a controlled, documented way, add audit rules, file integrity monitoring, account lockout and password quality, and produce a before/after compliance report with justified exceptions. This is how regulated organisations demonstrate that servers are hardened, rather than just claiming it.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "Integrated Linux Operations Capstone",
    "level": "Enterprise Architecture",
    "tags": [
      "capstone",
      "networking",
      "lvm",
      "nfs",
      "autofs",
      "httpd",
      "selinux",
      "firewalld",
      "ansible",
      "monitoring",
      "backup",
      "incident-response",
      "rca"
    ],
    "summary": "Design, build, operate and recover a small multi-server service end to end, combining networking, storage, services, permissions, security, monitoring, automation, incident response and root cause analysis. The capstone demonstrates that you can integrate individual skills into a working, documented, supportable system — the actual job of a Linux administrator.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "title": "High-Availability Web Tier with HAProxy and Keepalived",
    "level": "Enterprise Architecture",
    "tags": [
      "high-availability",
      "haproxy",
      "keepalived",
      "vrrp",
      "load-balancing",
      "firewalld",
      "selinux"
    ],
    "summary": "Build an active/passive load-balancing tier: two HAProxy nodes sharing a virtual IP managed by Keepalived (VRRP), distributing traffic across two web servers with health checks. Then measure what actually happens to client requests during backend failure and load balancer failover. This is an optional advanced project that introduces the design thinking behind highly available services.",
    "deliverables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  }
];
