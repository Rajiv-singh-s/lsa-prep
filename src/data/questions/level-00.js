export default {
  "L00-M1-T1": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M1-T2": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M2-T1": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M2-T2": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M3-T1": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M3-T2": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M4-T1": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M4-T2": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M5-T1": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ],
  "L00-M5-T2": [
    {
      "d": "b",
      "t": "concept",
      "q": "In enterprise Linux server hardware architecture, what is the primary functional difference between RAM and storage?",
      "o": [
        "RAM is non-volatile persistent storage while SSDs are temporary working registers",
        "RAM is volatile memory where running code executes, while storage holds data persistently across reboots",
        "RAM is only accessible by peripheral devices while storage is accessible directly by CPU registers",
        "There is no difference in Linux architecture"
      ],
      "a": [
        1
      ],
      "e": "RAM is volatile high-speed working memory for the CPU. Disks/SSDs provide non-volatile persistent storage across reboots.",
      "w": [
        "SSDs are non-volatile and RAM is volatile.",
        "",
        "CPU registers are inside the processor core.",
        "They serve fundamentally different memory hierarchy tiers."
      ],
      "c": "free -m",
      "s": "Distinguish RAM from persistent storage"
    },
    {
      "d": "b",
      "t": "concept",
      "q": "Why does a 500 GB physical hard drive typically report approximately 465 GiB when queried with lsblk in Linux?",
      "o": [
        "The manufacturer secretly reserved 35 GB for hidden diagnostics",
        "Hard drive vendors measure capacity in decimal powers of 10 (1000^3) while Linux tools often report in binary IEC GiB (1024^3)",
        "The partition table always wastes exactly 7% of disk blocks",
        "The Linux kernel compresses storage on creation"
      ],
      "a": [
        1
      ],
      "e": "Storage manufacturers sell drives using decimal metric units (1 GB = 10^9 bytes), whereas binary operating system measurements use GiB (1024^3 = 1,073,741,824 bytes). 500 * (10^9) / (1024^3) = ~465.66 GiB.",
      "w": [
        "Drive vendors do not hide 35GB of diagnostics.",
        "",
        "Partition tables take a tiny fraction of a megabyte.",
        "Linux does not compress raw block devices automatically."
      ],
      "c": "lsblk",
      "s": "Explain binary vs decimal storage units"
    },
    {
      "d": "b",
      "t": "command",
      "q": "Which command on Enterprise Linux provides a clean summary of CPU architecture, core counts, and sockets?",
      "o": [
        "lscpu",
        "lsblk",
        "lspci",
        "lsdev"
      ],
      "a": [
        0
      ],
      "e": "lscpu gathers CPU architecture information from sysfs and /proc/cpuinfo and prints it in an easy-to-read table.",
      "w": [
        "",
        "lsblk lists block storage devices.",
        "lspci lists PCI peripheral buses.",
        "lsdev is not a standard RHEL utility."
      ],
      "c": "lscpu",
      "s": "Query CPU topology"
    },
    {
      "d": "i",
      "t": "output",
      "q": "Given the following command output on a production RHEL node:\\nModel name: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\\nSocket(s): 2\\nCore(s) per socket: 24\\nThread(s) per core: 2\\nHow many total logical CPUs does the Linux kernel see?",
      "o": [
        "24",
        "48",
        "96",
        "192"
      ],
      "a": [
        2
      ],
      "e": "Total logical CPUs = Sockets * Cores per socket * Threads per core = 2 * 24 * 2 = 96 logical CPUs.",
      "w": [
        "24 is only the cores in a single socket.",
        "48 is the physical core count across both sockets without hyperthreading.",
        "",
        "192 would require 4 sockets or 4 threads per core."
      ],
      "c": "lscpu",
      "s": "Calculate logical CPUs from topology"
    },
    {
      "d": "i",
      "t": "concept",
      "q": "What is a System Call (syscall) in the Linux operating system?",
      "o": [
        "A phone call to Red Hat enterprise technical support",
        "The programmatic interface that unprivileged user space processes use to request privileged services from the Linux Kernel",
        "A cron job executed by root",
        "A hardware interrupt generated exclusively by the keyboard"
      ],
      "a": [
        1
      ],
      "e": "System calls (syscalls like open, read, write, fork) are the gatekeepers through which user space applications safely request kernel space services.",
      "w": [
        "Syscalls are operating system software mechanisms.",
        "",
        "Cron jobs are scheduled user space tasks.",
        "Syscalls are software instructions, not keyboard hardware interrupts."
      ],
      "c": "strace",
      "s": "Define system calls and privilege boundaries"
    },
    {
      "d": "i",
      "t": "command",
      "q": "Which tool allows a systems engineer to trace the system calls made by a running program in real time?",
      "o": [
        "lsof",
        "strace",
        "sar",
        "netstat"
      ],
      "a": [
        1
      ],
      "e": "strace intercepts and records system calls made by a process and signals received by it.",
      "w": [
        "lsof lists open files.",
        "",
        "sar records historical system activity.",
        "netstat queries network sockets."
      ],
      "c": "strace",
      "s": "Trace process system calls"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "In Linux memory architecture, what is the fundamental difference between Kernel Space and User Space?",
      "o": [
        "User space has direct unrestricted execution access to CPU registers and memory pages while kernel space is sandboxed",
        "Kernel space executes in privileged CPU ring 0 with direct hardware access, while user space executes in ring 3 with virtualized memory",
        "Kernel space only exists on disk while user space exists in RAM",
        "User space is only for desktop GUI applications while servers run 100% in kernel space"
      ],
      "a": [
        1
      ],
      "e": "x86 CPU protection rings isolate kernel space (ring 0) from user applications (ring 3), enforcing memory isolation and system stability.",
      "w": [
        "User space cannot directly access raw hardware.",
        "",
        "Both execute in physical RAM.",
        "All Linux servers run system daemons in user space."
      ],
      "c": "uname",
      "s": "Explain kernel vs user space protection rings"
    },
    {
      "d": "a",
      "t": "troubleshoot",
      "q": "A high-throughput application process crashes with SIGSEGV (Segmentation Fault). What does this typically mean at the OS level?",
      "o": [
        "The server hard drive has run out of free inodes",
        "The application attempted to read or write to a virtual memory address that it did not have permission to access or that was not mapped by the MMU",
        "SELinux permanently shut down the network card",
        "The CPU fan stopped spinning"
      ],
      "a": [
        1
      ],
      "e": "A segmentation fault (SIGSEGV) is sent by the Linux kernel when a user process attempts to access an invalid memory page address or violate memory page permissions.",
      "w": [
        "Inode exhaustion returns ENOSPC, not SIGSEGV.",
        "",
        "SELinux generates AVC audit logs, not immediate SIGSEGV on generic heap pointers.",
        "Hardware thermal throttles or panics the kernel globally."
      ],
      "c": "dmesg",
      "s": "Diagnose segmentation fault signals"
    },
    {
      "d": "a",
      "t": "distro",
      "q": "Select all that apply: which of the following Linux distributions are enterprise downstream binary-compatible rebuilds of Red Hat Enterprise Linux (RHEL)?",
      "o": [
        "Rocky Linux",
        "Ubuntu Server",
        "AlmaLinux",
        "Arch Linux"
      ],
      "a": [
        0,
        2
      ],
      "e": "Rocky Linux and AlmaLinux are enterprise 1:1 binary-compatible rebuilds designed to match RHEL releases without subscription fees.",
      "w": [
        "",
        "Ubuntu is based on Debian packaging (dpkg/apt).",
        "",
        "Arch Linux is a rolling-release community distribution."
      ],
      "c": "cat /etc/os-release",
      "s": "Identify RHEL enterprise rebuild distributions",
      "env": "RHEL/Rocky/AlmaLinux"
    },
    {
      "d": "a",
      "t": "concept",
      "q": "What is the role of the hypervisor in enterprise virtualization (e.g., KVM or VMware ESXi)?",
      "o": [
        "It formats hard drives with XFS filesystems exclusively",
        "It manages hardware resources and virtualizes CPU, RAM, and I/O devices to allow multiple guest operating systems to run concurrently on physical hardware",
        "It translates Python code into machine language",
        "It replaces DNS servers in local networks"
      ],
      "a": [
        1
      ],
      "e": "A hypervisor (virtual machine monitor) abstracts physical server resources to provision and isolate virtual machines (VMs).",
      "w": [
        "Filesystem formatting is performed by guest OS tools like mkfs.",
        "",
        "Compilers and interpreters handle language translation.",
        "DNS is handled by domain name servers, not hypervisors."
      ],
      "c": "virsh",
      "s": "Explain hypervisor roles in enterprise virtualization"
    }
  ]
};
