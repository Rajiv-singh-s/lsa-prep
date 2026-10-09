// Level 0 — Computer and Operating System Fundamentals (zero prior knowledge assumed)
export default {
  id: 'L00', number: 0,
  title: 'Computer and Operating System Fundamentals',
  summary: "Build the mental model every Linux administrator relies on: what hardware does, what an operating system and kernel are, where Unix, Linux and GNU came from, how enterprise distributions are supported, and how servers, networks, virtual machines and the cloud fit together. No prior knowledge is assumed.",
  prerequisites: [],
  outcomes: [
    'Describe the role of the CPU, memory (RAM), storage and firmware, and explain what happens when a computer is switched on',
    'Explain what an operating system and a kernel do, and distinguish kernel space, user space, programs, processes and system calls',
    'Tell the story of Unix, Linux, GNU and open source accurately and explain why "Linux" usually means a whole distribution',
    'Compare the major enterprise distributions (RHEL, Rocky, AlmaLinux, Fedora, CentOS Stream, Debian, Ubuntu, SUSE) and their support lifecycles',
    'Explain clients and servers, IP addresses, DNS names, ports, virtual machines, hypervisors, cloud instances and production versus non-production environments'
  ],
  modules: [
    {
      id: 'L00-M1', title: 'Computers and hardware',
      summary: 'The physical building blocks of every server: processor, memory, storage, firmware and devices, and how they cooperate when a machine starts.',
      lessons: [
        {
          id: 'L00-M1-T1',
          title: 'CPU, memory and storage: what a computer is made of',
          minutes: 35,
          objectives: [
            'Define CPU, core, thread, RAM, storage, bit and byte in plain language',
            'Explain why data moves between storage and memory and why memory is volatile',
            'Convert between common units (KB, MB, GB, KiB, MiB, GiB) and read sizes reported by Linux tools',
            'Recognise CPU, memory and disk information in simple Linux command output'
          ],
          prereqs: [],
          concept: `A **computer** is a machine that follows instructions (a **program**) to transform data. Every server you will administer, from a laptop-sized lab VM to a rack of database hosts, is built from the same few parts.

### The processor (CPU)
The **CPU** (Central Processing Unit) executes instructions: add these numbers, compare these values, copy this data. A modern CPU contains several **cores**; each core is an independent processor that can run one stream of instructions at a time. Many CPUs also offer **hardware threads** (Intel calls this Hyper-Threading, generally *SMT*) so one core can interleave two instruction streams. Linux shows each hardware thread as a separate **logical CPU**. The **architecture** is the instruction set the CPU understands, for example **x86_64** (Intel/AMD, the most common for servers) or **aarch64** (64-bit ARM). Software must be built for the right architecture.

### Memory (RAM)
**RAM** (Random Access Memory) is the CPU's fast working area. Programs and the data they are using right now are loaded into RAM because the CPU can read it in nanoseconds. RAM is **volatile**: when power is lost, its contents vanish. This is why unsaved work disappears in a crash and why a server reboot "clears" memory problems temporarily.

### Storage
**Storage** (HDD, SSD, NVMe drive, or a disk presented by a SAN or cloud provider) keeps data **persistently** when power is off. It is much larger and cheaper per gigabyte than RAM, but slower. When you run a program, the operating system copies it from storage into RAM; when you save a file, data flows from RAM back to storage.

### Bits, bytes and units
A **bit** is a single 0 or 1. A **byte** is 8 bits and can hold one simple character. Sizes are measured in two systems:

- **Decimal (SI)**: 1 KB = 1000 bytes, 1 GB = 1000^3 bytes. Disk vendors use these.
- **Binary (IEC)**: 1 KiB = 1024 bytes, 1 GiB = 1024^3 bytes. Many Linux tools use these, often printing just \`G\` or \`Gi\`.

That is why a "500 GB" disk shows as about **465 GiB** in Linux. Nothing is missing; the units differ.

### How the parts cooperate
1. The program lives on storage.
2. The operating system loads it into RAM.
3. The CPU fetches instructions from RAM and executes them.
4. Results are written back to RAM and, if they must survive, to storage.

> When a server is "slow", an administrator's first question is: which resource is exhausted? CPU (busy computing), memory (RAM full, so the system starts using slower disk as overflow, called *swap*), or storage (disk too busy or full). Later levels teach the tools; this lesson gives you the vocabulary.`,
          internals: `Inside the CPU, each core has tiny, extremely fast storage areas called **registers** and several layers of **cache** (L1, L2, L3) that hold recently used data from RAM so the core does not wait. RAM is organised as a long list of numbered **addresses**; the CPU reads and writes by address. Linux reports the CPU details it learns from the hardware in the virtual file \`/proc/cpuinfo\` (summarised by \`lscpu\`), memory statistics in \`/proc/meminfo\` (summarised by \`free\`), and block storage devices under \`/sys/block\` (summarised by \`lsblk\`). These are not ordinary files on disk: the kernel generates their contents on demand when you read them. Storage devices are read and written in **blocks** (commonly 512 bytes or 4096 bytes) rather than single bytes, which is why disks are called **block devices**.`,
          useCases: [
            'Confirming that a newly provisioned server has the CPU count and RAM that were ordered before handing it to an application team',
            'Explaining to a manager why a "1 TB" disk shows roughly 931 GiB in monitoring',
            'Recognising whether a performance complaint is about CPU, memory or storage before escalating',
            'Checking that software is built for the right architecture (x86_64 vs aarch64) before installing it'
          ],
          syntax: 'lscpu\nnproc\nfree -h\nlsblk\ncat /proc/meminfo | head',
          options: [
            ['nproc', 'Print the number of logical CPUs available to the current process'],
            ['free -h', 'Show RAM and swap totals and usage in human-readable binary units (Gi, Mi)'],
            ['lsblk', 'List block (storage) devices and their partitions as a tree'],
            ['lsblk -d', 'List only whole disks, not their partitions'],
            ['lscpu', 'Summarise CPU architecture, sockets, cores per socket and threads per core']
          ],
          examples: [
            {
              title: 'How many CPUs and what architecture?',
              cmd: 'lscpu | head -8',
              out: 'Architecture:            x86_64\n  CPU op-mode(s):        32-bit, 64-bit\n  Byte Order:            Little Endian\nCPU(s):                  4\n  On-line CPU(s) list:   0-3\nVendor ID:               GenuineIntel\n  Model name:            Intel(R) Xeon(R) Gold 6230 CPU @ 2.10GHz\n    Thread(s) per core:  2',
              fields: [
                ['Architecture: x86_64', 'The instruction set; packages must be built for x86_64 (or noarch)'],
                ['CPU(s): 4', 'Logical CPUs visible to Linux (cores multiplied by threads per core)'],
                ['Thread(s) per core: 2', 'SMT/Hyper-Threading is on: 2 physical cores appear as 4 logical CPUs']
              ],
              note: 'In a virtual machine these numbers describe the virtual CPUs the hypervisor gave the VM, not the physical host.'
            },
            {
              title: 'How much memory?',
              cmd: 'free -h',
              out: '               total        used        free      shared  buff/cache   available\nMem:           7.5Gi       1.2Gi       4.9Gi        17Mi       1.7Gi       6.3Gi\nSwap:          2.0Gi          0B       2.0Gi',
              fields: [
                ['total 7.5Gi', 'Usable RAM (an "8 GB" VM shows a little less because the kernel reserves some)'],
                ['buff/cache', 'RAM Linux uses to cache disk data; it is given back when programs need it'],
                ['available 6.3Gi', 'The best estimate of memory still available for new programs'],
                ['Swap', 'Disk space used as overflow when RAM is short; much slower than RAM']
              ]
            },
            {
              title: 'What storage is attached?',
              cmd: 'lsblk -d',
              out: 'NAME  MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS\nsr0    11:0    1 1024M  0 rom\nvda   252:0    0   40G  0 disk',
              fields: [
                ['vda', 'A virtual disk (vd = virtio disk in a KVM VM; physical SATA/SAS disks appear as sda, NVMe as nvme0n1)'],
                ['SIZE 40G', 'Size in binary units (GiB)'],
                ['TYPE rom', 'sr0 is an optical/ISO drive, read-only media']
              ]
            }
          ],
          walkthrough: [
            'Picture a request to a web server: the program file sits on disk, gets loaded into RAM, and the CPU executes it.',
            'On any Linux machine (or the in-browser terminal) run `nproc` and note the number of logical CPUs.',
            'Run `lscpu` and find Architecture, CPU(s) and Thread(s) per core; multiply cores per socket by threads per core by sockets to check the CPU(s) value.',
            'Run `free -h` and compare total with available; remember that buff/cache is reclaimable.',
            'Run `lsblk` and identify the disk name and size, then convert the size mentally: a 40 GiB disk is about 42.9 GB in vendor units.'
          ],
          lab: {
            goal: 'Produce a one-paragraph hardware profile of your Linux machine using read-only commands.',
            steps: [
              'Log in to any Linux system (a lab VM from Level 1, a cloud instance, or the in-browser terminal). No root access is needed.',
              'Record the architecture and logical CPU count: `lscpu | grep -E "Architecture|^CPU\\(s\\)"` and `nproc`.',
              'Record total and available memory: `free -h`.',
              'Record disks and sizes: `lsblk -d -o NAME,SIZE,TYPE`.',
              'Peek at the raw kernel data: `head -3 /proc/meminfo` and `grep -c ^processor /proc/cpuinfo`.',
              'Write the profile, e.g. "x86_64, 4 logical CPUs, 7.5 GiB RAM, one 40 GiB disk".'
            ],
            verify: 'The value from `nproc` equals `grep -c ^processor /proc/cpuinfo`; MemTotal in /proc/meminfo (in kB) divided by 1048576 roughly equals the total shown by `free -h`.'
          },
          troubleshooting: {
            scenario: 'A user says the new "16 GB" server has "lost memory" because monitoring shows only 15.4 GiB total.',
            steps: [
              'Evidence: run `free -h` and `grep MemTotal /proc/meminfo` to see what the kernel reports.',
              'Hypothesis: the difference is units (GB vs GiB) plus memory reserved by firmware and the kernel at boot.',
              'Explain: 16 GB is about 14.9 GiB, 16 GiB is 17.2 GB; firmware and kernel reservations also reduce the usable total slightly.',
              'Validate: compare with the VM or hardware specification; only escalate if the gap is far larger (for example a missing memory module).'
            ]
          },
          mistakes: [
            'Treating `free` column "free" as the memory available to programs; "available" is the meaningful number because cache is reclaimable.',
            'Confusing RAM with storage ("my 500 GB of memory"); the distinction matters when diagnosing performance.',
            'Assuming a logical CPU is a physical core; with SMT, 4 logical CPUs may be only 2 cores.',
            'Mixing GB and GiB and reporting phantom missing capacity.'
          ],
          safety: [
            'Every command in this lesson is read-only and safe for an ordinary user.',
            'Never "free memory" by running random commands found online (for example dropping caches) on production; cache is a feature, not a leak.'
          ],
          distro: 'These commands behave the same on RHEL, Rocky, AlmaLinux, Fedora, Debian and Ubuntu. `lscpu` and `lsblk` come from the util-linux package and `free` from procps-ng, which are installed on virtually every distribution.',
          challenge: {
            task: 'A VM reports `CPU(s): 8`, `Socket(s): 1`, `Core(s) per socket: 4`, `Thread(s) per core: 2`, and `free -h` shows `total 31Gi`, `available 29Gi`. Describe the machine in one sentence for a ticket, and explain whether 8 CPU-heavy processes can each get a full physical core.',
            solution: `The machine has **1 socket x 4 cores x 2 threads = 8 logical CPUs** and roughly **32 GB of RAM** (31 GiB usable, 29 GiB available).

Eight CPU-heavy processes can each get a logical CPU, but only **4 physical cores** exist. Two hardware threads on one core share its execution units, so 8 heavy processes will not run twice as fast as 4. Ticket text: "1 socket, 4 cores / 8 threads (x86_64), 31 GiB RAM usable, 29 GiB available."

\`\`\`
lscpu | grep -E "^CPU\\(s\\)|Socket|Core|Thread"
free -h
\`\`\``
          },
          interview: [
            { q: 'What is the difference between RAM and storage?', a: 'RAM is fast, volatile working memory the CPU uses for running programs and their data; it is cleared on power loss. Storage (SSD, HDD, NVMe, network disks) is slower but persistent and much larger. Programs are loaded from storage into RAM to run, and data that must survive is written back to storage.', mistake: 'Calling both "memory" and being unable to say which one is lost at power-off.', followUp: 'What happens when RAM runs out? (The kernel uses swap on disk, slowing the system, and may eventually kill a process.)' },
            { q: 'Why does a 1 TB disk show as about 931G in lsblk?', a: 'The vendor uses decimal units (1 TB = 10^12 bytes) while lsblk reports binary units (1 GiB = 2^30 bytes). 10^12 / 2^30 is about 931, so no capacity is missing.', mistake: 'Blaming filesystem overhead or a faulty disk.', followUp: 'Which option makes lsblk print exact byte counts? (lsblk -b)' },
            { q: 'What does "logical CPU" mean in lscpu output?', a: 'A logical CPU is a schedulable execution context the kernel sees. It equals sockets x cores per socket x threads per core. With SMT enabled, each physical core provides two logical CPUs that share the core\'s resources.', mistake: 'Equating logical CPUs with physical cores.', followUp: 'Why might a licence be priced per core rather than per logical CPU?' }
          ],
          revision: [
            'CPU executes instructions; cores run streams in parallel; SMT gives 2 logical CPUs per core.',
            'RAM is fast and volatile; storage is slower and persistent.',
            'Programs are loaded from storage into RAM before the CPU runs them.',
            '1 GB = 10^9 bytes; 1 GiB = 2^30 bytes; Linux tools mostly show binary units.',
            '`lscpu`, `nproc`, `free -h`, `lsblk` give a read-only hardware profile.'
          ]
        },
        {
          id: 'L00-M1-T2',
          title: 'Firmware, devices and what happens at power-on',
          minutes: 30,
          objectives: [
            'Explain what firmware is and compare legacy BIOS with UEFI',
            'Describe the high-level startup chain: firmware, boot loader, kernel, first process',
            'Define device, driver, bus and peripheral, and list common server devices',
            'Determine whether a Linux system booted with UEFI or BIOS'
          ],
          prereqs: ['L00-M1-T1'],
          concept: `When you press the power button, RAM is empty and the CPU knows nothing about Linux. Something must bring the machine to life. That something is **firmware**.

### Firmware
**Firmware** is software stored on a chip on the motherboard (flash memory), not on the disk. It runs first, tests the hardware (the **POST**, Power-On Self-Test), initialises devices and then looks for something to boot. There are two generations:

- **BIOS** (Basic Input/Output System) — the original PC firmware from the 1980s. It loads a tiny program from the first sector of a disk (the **MBR**, Master Boot Record).
- **UEFI** (Unified Extensible Firmware Interface) — the modern replacement. It reads boot loader files from a small FAT-formatted partition called the **EFI System Partition (ESP)**, supports large disks with **GPT** partition tables, and offers **Secure Boot**, which only runs boot software signed with trusted keys.

Nearly all current servers and hypervisors use UEFI; BIOS mode (often called "legacy" or "CSM") still appears on old hardware and some VMs.

### The startup chain (high level)
1. **Firmware** (UEFI or BIOS) initialises hardware and finds a boot device.
2. The **boot loader** (on RHEL and most Linux systems, **GRUB2**) shows a menu and loads the kernel and an initial RAM disk into memory.
3. The **kernel** (the core of the operating system, Module 2) takes control of the hardware.
4. The kernel starts the first user program, **systemd** (process ID 1), which starts all services such as networking and SSH.
5. You get a **login prompt**.

Level 7 explores each step in depth. For now, remember the order: firmware, boot loader, kernel, systemd, login.

### Devices, drivers and buses
A **device** is any piece of hardware the computer talks to: disk controller, network card (**NIC**), graphics, USB keyboard. Devices connect through **buses** such as **PCIe** (fast internal expansion slots) and **USB**. A **driver** is software that knows how to talk to one kind of device. In Linux most drivers live inside the kernel or are loaded as **kernel modules**. If a driver is missing, the hardware may be present yet unusable, for example a NIC that never appears.

> Servers are usually managed remotely through a separate **BMC** (Baseboard Management Controller), branded iDRAC (Dell), iLO (HPE) or XClarity (Lenovo). It lets an administrator power-cycle the machine and see its console even when the operating system is down.`,
          internals: `UEFI stores boot entries (which file to load from which disk) in **NVRAM** variables on the motherboard; Linux exposes them under \`/sys/firmware/efi/efivars\` and the \`efibootmgr\` tool lists them. The very existence of the directory \`/sys/firmware/efi\` tells you the running kernel was started by UEFI firmware. On RHEL the ESP is mounted at \`/boot/efi\` and contains files such as \`EFI/redhat/shimx64.efi\` (the Secure Boot-signed first stage) and \`grubx64.efi\`. The kernel discovers devices by walking the buses (PCI enumeration), assigns them names and loads the matching driver modules; \`lspci\` lists PCI devices and \`lsmod\` lists loaded modules. Messages from this discovery are recorded in the kernel ring buffer, readable with \`dmesg\` (root may be required on RHEL because \`kernel.dmesg_restrict\` can be enabled).`,
          useCases: [
            'Confirming a server boots in UEFI mode before a migration project that requires Secure Boot',
            'Using the BMC remote console to see why a server never reached the login prompt after maintenance',
            'Checking whether a new network card was detected (lspci) when the operating system does not show an interface',
            'Explaining to an auditor where the boot chain starts and what Secure Boot protects'
          ],
          syntax: 'ls /sys/firmware/efi\nlspci\nlsusb\nlsmod | head\nsudo dmesg | less\nsudo efibootmgr',
          options: [
            ['/sys/firmware/efi', 'Directory present only when the system booted via UEFI'],
            ['lspci', 'List devices on the PCI/PCIe bus (controllers, NICs, GPUs)'],
            ['lspci -k', 'Also show which kernel driver is in use for each device'],
            ['lsmod', 'List loaded kernel modules (drivers)'],
            ['dmesg', 'Show kernel messages, including hardware detection at boot'],
            ['efibootmgr -v', 'Show UEFI boot entries and order (root required)']
          ],
          examples: [
            {
              title: 'Did this system boot with UEFI?',
              cmd: '[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS',
              out: 'UEFI',
              fields: [['UEFI', 'The kernel was started by UEFI firmware; on BIOS/legacy boots the directory does not exist']],
              note: 'The test checks how the *current* boot happened, regardless of what the hardware could support.'
            },
            {
              title: 'Which network card and driver?',
              cmd: 'lspci -k | grep -A3 -i ethernet',
              out: '00:03.0 Ethernet controller: Red Hat, Inc. Virtio network device\n\tSubsystem: Red Hat, Inc. Device 0001\n\tKernel driver in use: virtio-pci',
              fields: [
                ['00:03.0', 'The PCI address (bus:device.function) of the card'],
                ['Virtio network device', 'A paravirtual NIC presented by the KVM hypervisor'],
                ['Kernel driver in use', 'The driver that makes the device usable; if missing, the device cannot be used']
              ]
            }
          ],
          walkthrough: [
            'Recall the chain: firmware, boot loader (GRUB2), kernel, systemd (PID 1), login.',
            'Run `[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS` to see how your system booted.',
            'Run `lspci` and identify the storage controller and network controller.',
            'Run `lspci -k` and note the "Kernel driver in use" line for the Ethernet controller.',
            'Run `sudo dmesg | head -20` (or `journalctl -k | head`) and notice the first kernel messages describing the hardware.'
          ],
          lab: {
            goal: 'Identify firmware mode, key devices and their drivers on a Linux VM.',
            steps: [
              'Check firmware mode: `[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS`.',
              'If UEFI, list boot entries: `sudo efibootmgr` and note BootCurrent and BootOrder.',
              'List PCI devices: `lspci` and write down the disk controller and NIC names.',
              'Show drivers: `lspci -k | grep -A2 -iE "ethernet|sata|scsi|nvme"`.',
              'Read the first kernel messages: `sudo dmesg | head -30`.',
              'Check whether Secure Boot is enabled (UEFI only): `mokutil --sb-state` (install the mokutil package if missing).'
            ],
            verify: 'You can state "this VM boots in UEFI|BIOS mode, its NIC is X using driver Y" and the output of `lspci -k` supports it.'
          },
          troubleshooting: {
            scenario: 'After adding a second network card to a server, Linux shows no new interface.',
            steps: [
              'Evidence: `lspci | grep -i ethernet` — is the card detected on the bus at all?',
              'If listed, run `lspci -k` and look for a missing "Kernel driver in use" line; check `dmesg` for firmware or driver errors.',
              'Hypothesis: the card is detected but no driver supports it (or it needs firmware files); if not listed at all, it is a hardware/seating/BIOS setting issue.',
              'Fix by installing the vendor-supported driver or firmware package, or re-seating/enabling the card via the BMC; validate with `ip link` showing the new interface.'
            ]
          },
          mistakes: [
            'Calling all firmware "BIOS" and missing that UEFI-specific steps (ESP, efibootmgr, Secure Boot) apply.',
            'Assuming a device is broken when only its driver is missing.',
            'Forgetting the BMC exists and driving to the data centre to see a console.',
            'Disabling Secure Boot as a first reaction to a boot problem instead of finding which component is unsigned.'
          ],
          safety: [
            'Reading /sys, lspci and lsmod is safe; `dmesg` and `efibootmgr` usually need root but are read-only without options.',
            'Changing UEFI boot entries or firmware settings can make a server unbootable; only do it with console (BMC) access and a rollback plan.'
          ],
          distro: 'RHEL 8, 9 and 10 all support UEFI and BIOS boots on x86_64 and use GRUB2 with shim for Secure Boot. Debian and Ubuntu use the same mechanism with distribution-specific signed shims. RHEL 10 continues to support legacy BIOS on x86_64, but new deployments should use UEFI.',
          challenge: {
            task: 'Write a one-line command that prints "UEFI, Secure Boot enabled", "UEFI, Secure Boot disabled" or "BIOS" for the current boot, then explain each part.',
            solution: `\`\`\`
if [ -d /sys/firmware/efi ]; then mokutil --sb-state | grep -q enabled && echo "UEFI, Secure Boot enabled" || echo "UEFI, Secure Boot disabled"; else echo BIOS; fi
\`\`\`

- \`[ -d /sys/firmware/efi ]\` is true only when UEFI started this kernel.
- \`mokutil --sb-state\` prints "SecureBoot enabled" or "SecureBoot disabled"; \`grep -q\` tests silently.
- \`&& ... || ...\` chooses the message from the exit status. Secure Boot does not exist on BIOS boots, so that branch prints only "BIOS".`
          },
          interview: [
            { q: 'What is the difference between BIOS and UEFI?', a: 'Both are firmware that initialise hardware and start a boot loader. BIOS is the legacy design that loads code from the disk\'s MBR and is limited with large disks. UEFI loads boot loader files from an EFI System Partition, works with GPT disks, stores boot entries in NVRAM and supports Secure Boot.', mistake: 'Saying UEFI is "just a newer BIOS screen".', followUp: 'Where is the ESP mounted on RHEL? (/boot/efi)' },
            { q: 'Describe what happens from power-on to the login prompt.', a: 'Firmware runs POST and finds a boot device; the boot loader (GRUB2) loads the kernel and initramfs; the kernel initialises hardware and mounts the root filesystem; it starts systemd as PID 1, which starts services and the login prompt (getty or a display manager).', mistake: 'Skipping the boot loader or initramfs, or not knowing PID 1.', followUp: 'Which tool would you use if it hangs before the kernel loads? (The BMC remote console.)' },
            { q: 'What is a driver?', a: 'Software that translates generic operating system requests into commands a specific device understands. In Linux most drivers are part of the kernel, often loaded as modules.', mistake: 'Confusing a driver with an application.', followUp: 'How do you list loaded modules? (lsmod)' }
          ],
          revision: [
            'Firmware runs first from a motherboard chip: BIOS (legacy, MBR) or UEFI (ESP, GPT, Secure Boot).',
            'Startup chain: firmware, GRUB2, kernel, systemd (PID 1), login.',
            'A device needs a driver; Linux drivers live in the kernel or as modules.',
            '`/sys/firmware/efi` exists only on UEFI boots.',
            'The BMC (iDRAC, iLO) gives out-of-band console and power control.'
          ]
        }
      ]
    },
    {
      id: 'L00-M2', title: 'Operating systems and kernels',
      summary: 'What an operating system is for, the special role of the kernel, and how ordinary programs ask the kernel for help through system calls.',
      lessons: [
        {
          id: 'L00-M2-T1',
          title: 'What an operating system does: kernel space and user space',
          minutes: 35,
          objectives: [
            'Define operating system, kernel, user space and kernel space',
            'List the core jobs of an OS: process scheduling, memory management, storage, devices, networking and security',
            'Explain why applications cannot touch hardware directly',
            'Identify the running kernel version from command output'
          ],
          prereqs: ['L00-M1-T1'],
          concept: `Hardware alone is useless to most people: nobody wants to send electrical signals to a disk controller to save a document. An **operating system (OS)** is the software layer that manages the hardware and offers simple, safe services to programs and people. Linux, Windows and macOS are operating systems.

### The jobs of an operating system
- **Process management** — run many programs at once by rapidly switching the CPU between them (**scheduling**).
- **Memory management** — give each program its own private memory and stop programs reading each other's data.
- **Storage** — organise raw disk blocks into **files** and **directories** through **filesystems**.
- **Devices** — hide device differences behind drivers so programs just "read" or "write".
- **Networking** — send and receive data on behalf of programs.
- **Security** — decide who (which **user**) may do what, and keep a record.

### The kernel
The **kernel** is the central, most privileged part of the OS. It is loaded first at boot and stays in memory until shutdown. It talks to the hardware, schedules processes, allocates memory, implements filesystems and the network stack, and enforces permissions. **Linux**, strictly speaking, is a kernel.

Everything else you use — the shell where you type commands, the SSH server, the web server, the command \`ls\` — is ordinary software running *on top of* the kernel. Together the kernel plus these tools form a complete operating system.

### Kernel space and user space
Modern CPUs have privilege levels. The kernel runs in **kernel space** (also called kernel mode or ring 0) and may execute any instruction and touch any memory or device. Programs run in **user space** (user mode) with restricted privileges: they cannot talk to hardware directly or read another program's memory. If a user-space program crashes, the kernel cleans up and the system keeps running. If the kernel itself crashes (a **kernel panic**), the whole machine stops.

> This separation is a key reason Linux servers run for months without reboots, and why a kernel update (unlike most updates) needs a reboot to take effect.

### Where you fit
As an administrator you mostly work in user space: running commands, editing configuration files, managing services. But you will constantly ask questions about the kernel: Which version is running? Did it detect the disk? Why did it kill that process for using too much memory? Knowing the boundary tells you where to look.`,
          internals: `Each process lives in its own **virtual address space**: the addresses a program sees are translated by the CPU's memory management unit (MMU) using page tables that only the kernel can change. This is how isolation is enforced in hardware. The kernel's code and data are mapped into a protected region user mode cannot access. The kernel image on RHEL is a file such as \`/boot/vmlinuz-5.14.0-570.12.1.el9_6.x86_64\`; the running version is reported by \`uname -r\` and \`/proc/sys/kernel/osrelease\`. Kernel modules (drivers and optional features) are stored under \`/lib/modules/$(uname -r)/\`. The \`/proc\` and \`/sys\` directories are **virtual filesystems**: the kernel invents their contents on the fly so user-space tools can inspect and sometimes tune it.`,
          useCases: [
            'Determining which kernel a server is running before deciding whether a security fix is active',
            'Explaining why a kernel patch requires a maintenance window with a reboot while an application patch might not',
            'Recognising a kernel panic (whole system down) versus an application crash (one service down) in an incident report',
            'Explaining to developers why their program gets "Permission denied" when it tries to access a device directly'
          ],
          syntax: 'uname -r\nuname -a\ncat /proc/version\nls /boot/vmlinuz-*',
          options: [
            ['uname -r', 'Print the running kernel release (e.g. 5.14.0-570.12.1.el9_6.x86_64)'],
            ['uname -m', 'Print the machine hardware architecture (x86_64, aarch64)'],
            ['uname -s', 'Print the kernel name (Linux)'],
            ['uname -a', 'Print all uname fields on one line']
          ],
          examples: [
            {
              title: 'Which kernel is running?',
              cmd: 'uname -r',
              out: '5.14.0-570.12.1.el9_6.x86_64',
              fields: [
                ['5.14.0', 'Upstream Linux kernel version the RHEL 9 kernel is based on'],
                ['570.12.1', 'Red Hat build number; increases with each update and carries backported fixes'],
                ['el9_6', 'Built for Enterprise Linux 9, minor release 9.6'],
                ['x86_64', 'Architecture']
              ],
              note: 'RHEL keeps the same base version (5.14 for RHEL 9, 6.12 for RHEL 10) for the whole major release and backports fixes, so judge freshness by the build number, not the base version.'
            },
            {
              title: 'Kernels installed on disk versus running',
              cmd: 'ls /boot/vmlinuz-* ; uname -r',
              out: '/boot/vmlinuz-0-rescue-3f1c...\n/boot/vmlinuz-5.14.0-503.15.1.el9_5.x86_64\n/boot/vmlinuz-5.14.0-570.12.1.el9_6.x86_64\n5.14.0-503.15.1.el9_5.x86_64',
              fields: [
                ['two vmlinuz files', 'Two kernels are installed; RHEL keeps several so you can fall back'],
                ['uname -r shows 503', 'The older kernel is still running: the newer one was installed but the server has not been rebooted']
              ]
            }
          ],
          walkthrough: [
            'Draw three layers: hardware at the bottom, kernel in the middle, user programs on top.',
            'Run `uname -s` and `uname -r` to see the kernel name and release.',
            'Run `ls /boot` to see the kernel files on disk; compare with `uname -r`.',
            'Run `cat /proc/version` and notice it is generated by the kernel even though it looks like a file.',
            'Explain in your own words what would happen if an application could write directly to the disk controller.'
          ],
          lab: {
            goal: 'Identify the running kernel and relate it to the kernel files installed on disk.',
            steps: [
              'Print the running release: `uname -r`.',
              'List installed kernel images: `ls -l /boot/vmlinuz-*`.',
              'On RHEL-family systems list kernel packages: `rpm -q kernel` (or `rpm -q kernel-core`).',
              'View module directory for the running kernel: `ls /lib/modules/$(uname -r) | head`.',
              'Read the kernel version from /proc: `cat /proc/sys/kernel/osrelease`.'
            ],
            verify: '`uname -r` and `/proc/sys/kernel/osrelease` print the same value, and a matching `/boot/vmlinuz-<release>` file exists.'
          },
          troubleshooting: {
            scenario: 'A vulnerability scanner still reports a kernel CVE on a server that was patched yesterday.',
            steps: [
              'Evidence: compare `uname -r` with `rpm -q kernel` (or `rpm -q kernel-core`).',
              'Hypothesis: the new kernel package is installed but the server was not rebooted, so the old kernel is still running.',
              'Fix: schedule a reboot in the approved maintenance window (check the default boot entry first in Level 7).',
              'Validate: after reboot `uname -r` shows the new release and the scanner finding clears.'
            ]
          },
          mistakes: [
            'Believing installing a kernel package changes the running kernel; it only takes effect after reboot.',
            'Saying "Linux" crashed when only one application crashed; user-space failures do not take down the kernel.',
            'Comparing RHEL kernels by upstream version (5.14) and concluding they are old; Red Hat backports fixes.',
            'Treating /proc files as normal files to edit with a text editor and expecting changes to persist.'
          ],
          safety: [
            'uname and reading /proc are safe and read-only.',
            'Never delete files from /boot or /lib/modules manually; use the package manager so the boot loader stays consistent.',
            'Kernel changes require reboots: plan maintenance windows and console access.'
          ],
          distro: 'RHEL 8 is based on kernel 4.18, RHEL 9 on 5.14 and RHEL 10 on 6.12; the base number stays constant through the major release. Fedora tracks recent upstream kernels closely. Ubuntu LTS releases ship a base kernel and optionally newer "HWE" kernels; Debian stable keeps one kernel series per release.',
          challenge: {
            task: '`uname -r` prints `5.14.0-427.13.1.el9_4.x86_64` and `rpm -q kernel` prints two lines ending in `el9_4` and `el9_6`. What is the state of this server and what should happen next?',
            solution: `The server runs the **RHEL 9.4** build kernel (427.13.1) while a newer **9.6** kernel package is already installed. The update has been applied to disk but is **not active** because the server has not rebooted since.

Next steps: confirm the newer kernel is the default boot entry (\`sudo grubby --default-kernel\`, Level 7), schedule a reboot in a change window, then validate with \`uname -r\`. Until then, fixes in the newer kernel are not protecting the server.`
          },
          interview: [
            { q: 'What is the kernel and how does it differ from the operating system?', a: 'The kernel is the privileged core that manages CPU scheduling, memory, devices, filesystems, networking and security. The operating system is the kernel plus user-space tools and libraries (shell, utilities, services) that make the system usable.', mistake: 'Using the words as exact synonyms.', followUp: 'Why do people say "GNU/Linux"?' },
            { q: 'Why can\'t a normal program write directly to a disk?', a: 'It runs in user mode, where the CPU forbids privileged instructions and direct hardware access. It must ask the kernel via system calls, and the kernel checks permissions and uses the right driver.', mistake: 'Saying "because it lacks root" only; even root processes go through the kernel.', followUp: 'What is a system call?' },
            { q: 'A kernel update was installed. Is the server protected?', a: 'Not until it reboots into the new kernel. Verify with uname -r compared with the installed kernel packages.', mistake: 'Assuming the package installation alone is sufficient.', followUp: 'How would you confirm which kernel will boot next?' }
          ],
          revision: [
            'An OS manages hardware and provides safe services to programs.',
            'The kernel is the privileged core; Linux is, strictly, a kernel.',
            'Kernel space is privileged; user space is isolated and restricted.',
            '`uname -r` shows the running kernel; new kernels need a reboot.',
            '/proc and /sys are virtual filesystems generated by the kernel.'
          ]
        },
        {
          id: 'L00-M2-T2',
          title: 'Programs, processes and system calls',
          minutes: 35,
          objectives: [
            'Distinguish a program (file on disk) from a process (running instance)',
            'Explain PID, parent process and the role of PID 1',
            'Describe a system call conceptually and give common examples (open, read, write, fork, execve)',
            'Read simple process listings and identify who owns a process'
          ],
          prereqs: ['L00-M2-T1'],
          concept: `### Program versus process
A **program** is a file on storage containing instructions, for example \`/usr/bin/ls\`. A **process** is a program that is **running**: the kernel has loaded it into memory and is scheduling it on the CPU. One program can have many processes at once; ten users running \`bash\` means ten bash processes from one program file.

Each process has:
- a **PID** (Process ID), a number unique while it runs;
- a **parent** process that started it (its PPID);
- an **owner** (a user), which decides what it is allowed to do;
- its own private memory and a list of open files.

The first user-space process the kernel starts is **systemd**, which always has **PID 1**. Every other process descends from it. If you could draw the family tree of a running system, systemd would be at the root.

### Applications and libraries
An **application** is a program (or group of programs) that does useful work for people: a web server, a database, a text editor. Most programs reuse **libraries**, shared collections of code. The most important on Linux is the **C library** (glibc on RHEL, Debian and Ubuntu), which wraps the kernel's services in convenient functions.

### System calls
A process in user space cannot touch hardware (Lesson L00-M2-T1). When it needs something only the kernel can do, it makes a **system call** (syscall): a controlled request that switches the CPU into kernel mode, runs the kernel's code, and returns a result. Common examples:

- \`open\` / \`openat\` — open a file; \`read\` / \`write\` — read or write data.
- \`fork\` / \`clone\` — create a new process; \`execve\` — replace the process's program with another.
- \`socket\`, \`connect\` — network communication.
- \`exit\` — finish and return an **exit status**.

When you type \`cat /etc/hostname\`, the shell creates a child process, the child runs \`execve("/usr/bin/cat", ...)\`, cat calls \`openat\` on the file, \`read\`s the bytes, \`write\`s them to your terminal and calls \`exit\`. The kernel checks permissions at the \`openat\` step: that is where "Permission denied" comes from.

> Errors you see as an admin, like "No such file or directory" or "Permission denied", are usually the text of an error code a system call returned (ENOENT, EACCES).`,
          internals: `A system call is entered with a special CPU instruction (\`syscall\` on x86_64). The kernel looks up the requested function by number in its **system call table**, validates every argument (a user process must never trick the kernel into reading memory it does not own), performs the work and returns either a result or a negative error code that the C library converts to \`errno\`. Process information is exposed in \`/proc/<PID>/\`: \`status\` (state, owner, memory), \`cmdline\` (arguments), \`fd/\` (open files) and \`exe\` (link to the program file). The \`strace\` tool (Level 17) uses the kernel's ptrace facility to print every system call a process makes, which makes it one of the most powerful debugging tools available.`,
          useCases: [
            'Identifying which user owns a runaway process before deciding who to contact',
            'Explaining that restarting a service creates new processes with new PIDs, so old PIDs in notes become invalid',
            'Interpreting "Permission denied" or "No such file or directory" as a failed system call and checking the path and permissions',
            'Understanding why a program file can be updated on disk while the old version keeps running in memory until restarted'
          ],
          syntax: 'ps -ef | head\nps -u USER\nps -p PID -o pid,ppid,user,cmd\npstree -p | head\necho $$\ncat /proc/PID/status',
          options: [
            ['ps -ef', 'List every process in full format (UID, PID, PPID, start time, command)'],
            ['ps aux', 'BSD-style list of every process with CPU and memory usage'],
            ['ps -p PID -o ...', 'Show chosen columns for one process'],
            ['pstree -p', 'Show the process family tree with PIDs'],
            ['echo $$', 'Print the PID of the current shell'],
            ['pgrep NAME', 'Print PIDs of processes whose name matches NAME']
          ],
          examples: [
            {
              title: 'Who is PID 1 and who started my shell?',
              cmd: 'ps -p 1,$$ -o pid,ppid,user,cmd',
              out: '    PID    PPID USER     CMD\n      1       0 root     /usr/lib/systemd/systemd --switched-root --system --deserialize=31\n   2741    2740 alice    -bash',
              fields: [
                ['PID 1 / PPID 0', 'systemd is the first process; its parent 0 means it was started by the kernel itself'],
                ['USER root', 'systemd runs as the superuser'],
                ['2741 -bash', 'Your login shell; the leading dash means it is a login shell'],
                ['PPID 2740', 'The process that started your shell (for an SSH login, an sshd session process)']
              ]
            },
            {
              title: 'A failed system call as seen by a user',
              cmd: 'cat /etc/shadow',
              out: 'cat: /etc/shadow: Permission denied',
              fields: [
                ['Permission denied', 'The kernel refused the open system call (error EACCES) because the user lacks read permission'],
                ['cat:', 'The program reporting the error; the kernel only returned an error code']
              ],
              note: '/etc/shadow stores password hashes and is readable only with root privileges by design.'
            }
          ],
          walkthrough: [
            'Run `echo $$` to see the PID of your shell.',
            'Run `ps -p $$ -o pid,ppid,user,cmd` and note your shell\'s parent PID.',
            'Run `sleep 300 &` to start a background process, then `ps -ef | grep sleep` to see its PID and owner.',
            'Kill your own sleep process with `kill %1` (or `kill <PID>`) and confirm it is gone with `pgrep sleep`.',
            'Run `pstree -p | head` and find systemd at the top.',
            'Try `cat /etc/shadow` as an ordinary user and interpret the error as a refused system call.'
          ],
          lab: {
            goal: 'Observe programs becoming processes and trace their parents back to PID 1.',
            steps: [
              'Find the program file for sleep: `command -v sleep` (expect /usr/bin/sleep).',
              'Start two instances: `sleep 600 & sleep 600 &` and list them: `pgrep -a sleep`.',
              'Show their parent: `ps -o pid,ppid,user,cmd -p $(pgrep -d, sleep)`; the PPID equals `echo $$`.',
              'Inspect one in /proc: `cat /proc/$(pgrep -n sleep)/status | head -10` and find State, Pid, PPid and Uid.',
              'Show the tree: `pstree -p $$`.',
              'Clean up: `pkill -u "$USER" sleep` and confirm with `pgrep sleep` (no output).'
            ],
            verify: 'Two sleep PIDs share the same PPID (your shell) and disappear after pkill; `pgrep sleep` returns exit status 1 (`echo $?`).'
          },
          troubleshooting: {
            scenario: 'A junior admin restarts a service and then says the process "disappeared" because PID 3120 from their notes no longer exists.',
            steps: [
              'Evidence: `pgrep -a <service-binary>` or `systemctl status <service>` shows the current Main PID.',
              'Hypothesis: a restart stops the old process and starts a new one with a new PID.',
              'Explain: PIDs are assigned at process creation and are reused only after a process ends; never record them as permanent identifiers.',
              'Validate: the service is active with a different Main PID; refer to processes by service name instead.'
            ]
          },
          mistakes: [
            'Using "program" and "process" interchangeably and getting confused when one program has many processes.',
            'Hard-coding PIDs in scripts or runbooks; they change every restart.',
            'Assuming root processes bypass the kernel; root still makes system calls, the kernel simply permits more.',
            'Killing PID 1 or random root processes to "fix" something; that can crash or reboot the system.'
          ],
          safety: [
            'Listing processes is safe for any user.',
            'Only kill processes you own and understand; as root, double-check the PID before `kill` because a typo can stop a critical service.',
            'Never send signals to PID 1 unless following a documented procedure.'
          ],
          distro: 'ps, pgrep and pstree come from procps-ng and psmisc on RHEL; Debian/Ubuntu use procps and psmisc with the same options. systemd is PID 1 on all current RHEL, Fedora, Debian, Ubuntu and SUSE releases.',
          challenge: {
            task: 'A user reports that `/usr/bin/report-gen` keeps running old behaviour after the vendor replaced the file yesterday. `pgrep -a report-gen` shows a process started three days ago. Explain what is happening and how to fix it safely.',
            solution: `A **process** loaded the program into memory three days ago. Replacing the **program file** on disk does not change a process that is already running; it keeps executing the old code (the old file remains in use until the process exits).

Fix: restart the application in an approved window, ideally through its service manager (\`sudo systemctl restart report-gen\` if it is a service), then confirm a new start time and PID:

\`\`\`
pgrep -a report-gen
ps -o pid,lstart,cmd -p $(pgrep report-gen)
\`\`\``
          },
          interview: [
            { q: 'What is the difference between a program and a process?', a: 'A program is an executable file on disk. A process is a running instance with its own PID, memory, owner and open files. One program can run as many processes.', mistake: 'Treating them as synonyms.', followUp: 'Which process has PID 1 on RHEL 9 and why does it matter?' },
            { q: 'What is a system call? Give examples.', a: 'A controlled request from a user-space process to the kernel for a privileged service, such as openat, read, write, execve, clone, socket or exit. The CPU switches to kernel mode, the kernel validates and performs the work and returns a result or error.', mistake: 'Confusing system calls with shell commands.', followUp: 'Which tool shows the system calls a process makes? (strace)' },
            { q: 'Where does "Permission denied" come from when cat reads a file?', a: 'The kernel rejected the openat system call with EACCES because the process\'s user lacked permission; cat just printed the error text.', mistake: 'Saying cat itself checks permissions.', followUp: 'How would you check the file\'s permissions? (ls -l)' }
          ],
          revision: [
            'Program = file on disk; process = running instance with a PID.',
            'Every process has a parent; systemd is PID 1.',
            'User-space programs request kernel services through system calls.',
            'Common errors (ENOENT, EACCES) are system call failures.',
            'Restarting creates new processes with new PIDs.'
          ]
        }
      ]
    },
    {
      id: 'L00-M3', title: 'Unix, Linux, GNU and open source',
      summary: 'Where Linux came from, the Unix ideas it inherited, the GNU project that supplied its tools, and how open-source licences shape the enterprise software you will run.',
      lessons: [
        {
          id: 'L00-M3-T1',
          title: 'From Unix to Linux: history and the Unix philosophy',
          minutes: 30,
          objectives: [
            'Summarise the history of Unix, POSIX and the Linux kernel accurately',
            'Explain the Unix philosophy: small tools, text streams, everything as a file',
            'Distinguish Unix, Unix-like systems and Linux',
            'Recognise Unix ideas in everyday Linux commands'
          ],
          prereqs: ['L00-M2-T1'],
          concept: `### Unix
**Unix** was created at AT&T Bell Labs starting in **1969** by Ken Thompson, Dennis Ritchie and colleagues. In the early 1970s it was rewritten in the new **C** programming language, which made it portable to different hardware, a radical idea at the time. Universities and companies adopted it, producing many variants: BSD (from the University of California, Berkeley), Sun Solaris, IBM AIX, HP-UX. Several of these commercial Unixes still run in enterprises today.

### POSIX
Because Unix variants drifted apart, the IEEE defined **POSIX** (Portable Operating System Interface), a standard for the system calls, shell and basic utilities a Unix-like system must provide. Scripts written to POSIX run on Linux, BSD and commercial Unix with few changes. Linux is not certified "UNIX" (that is a trademark), but it is largely POSIX-compatible and is called **Unix-like**.

### Linux
In **1991**, Finnish student **Linus Torvalds** announced a free kernel he had written for his PC. Released under the GNU GPL (Lesson L00-M3-T2), it attracted thousands of contributors. Today the Linux kernel runs most of the world's servers, all of the top 500 supercomputers, Android phones, network equipment and the public cloud. Linus still coordinates kernel development; companies such as Red Hat, Intel, Google and Microsoft employ many contributors.

### The Unix philosophy
A few design ideas explain why Linux administration works the way it does:

- **Do one thing well.** \`ls\` lists, \`grep\` searches, \`sort\` sorts.
- **Combine small tools.** The **pipe** \`|\` connects the output of one program to the input of the next: \`ps -ef | grep sshd\`.
- **Text is the universal interface.** Configuration lives in plain-text files under \`/etc\`; tools read and write text streams.
- **Everything is a file.** Disks (\`/dev/sda\`), terminals (\`/dev/tty1\`), and kernel information (\`/proc/cpuinfo\`) all appear as files you can read with the same tools.

> Because configuration is text, an administrator can version-control it, compare it with \`diff\`, and automate it with scripts and Ansible — the foundation of modern infrastructure-as-code.

### Unix-like today
macOS is a certified Unix built on BSD-derived code; FreeBSD and OpenBSD are open-source BSD descendants; Linux is the dominant Unix-like system on servers. Skills transfer between them, but commands and options differ in details.`,
          internals: `The "everything is a file" idea is implemented by the kernel's **Virtual File System (VFS)** layer: a common interface (open, read, write, close) that the kernel routes to the right code — a disk filesystem such as XFS, a device driver for \`/dev\` entries, or kernel-generated content for \`/proc\` and \`/sys\`. A pipe is a small kernel buffer: the shell creates it with the \`pipe\` system call, connects the writing program's **standard output** to one end and the reading program's **standard input** to the other, and both run at the same time. Every process starts with three open file descriptors: 0 (standard input), 1 (standard output) and 2 (standard error), which is why redirection like \`2> errors.txt\` works for any program.`,
          useCases: [
            'Explaining to a team migrating from AIX or Solaris which skills transfer to RHEL and which commands differ',
            'Combining simple tools with pipes to answer operational questions quickly instead of installing new software',
            'Storing /etc configuration in Git because it is plain text',
            'Writing portable POSIX shell scripts that run on both Linux and BSD systems'
          ],
          syntax: 'ps -ef | grep sshd\ncat /etc/hostname\nls /dev | head\nwc -l /etc/passwd\nsort /etc/shells | uniq',
          options: [
            ['|', 'Pipe: send the standard output of the left command to the standard input of the right command'],
            ['>', 'Redirect standard output to a file (overwrites)'],
            ['>>', 'Append standard output to a file'],
            ['2>', 'Redirect standard error (file descriptor 2) to a file'],
            ['wc -l', 'Count lines of input']
          ],
          examples: [
            {
              title: 'Small tools combined',
              cmd: 'cut -d: -f7 /etc/passwd | sort | uniq -c',
              out: '      1 /bin/bash\n      1 /bin/sync\n     18 /sbin/nologin\n      1 /sbin/shutdown\n      1 /sbin/halt',
              fields: [
                ['cut -d: -f7', 'Takes the 7th colon-separated field of each line (the login shell)'],
                ['sort | uniq -c', 'Groups identical lines and counts them'],
                ['18 /sbin/nologin', 'Most accounts are system accounts that cannot log in interactively']
              ],
              note: 'Three programs that know nothing about each other answer a question none could answer alone.'
            },
            {
              title: 'Everything is a file',
              cmd: 'head -2 /proc/cpuinfo ; ls -l /dev/null',
              out: 'processor\t: 0\nvendor_id\t: GenuineIntel\ncrw-rw-rw-. 1 root root 1, 3 Oct  9 08:00 /dev/null',
              fields: [
                ['/proc/cpuinfo', 'Kernel information read like a text file'],
                ['c in crw-rw-rw-', 'A character device file; /dev/null discards anything written to it']
              ]
            }
          ],
          walkthrough: [
            'Run `cat /etc/hostname` and notice the system name is just text in a file.',
            'Run `ps -ef | grep sshd` to filter one program\'s output with another.',
            'Count user accounts: `wc -l /etc/passwd`.',
            'List device files: `ls -l /dev | head` and look for `b` (block) and `c` (character) in the first column.',
            'Combine tools: `cut -d: -f7 /etc/passwd | sort | uniq -c`.'
          ],
          lab: {
            goal: 'Use Unix-style tool composition to answer three questions about your system.',
            steps: [
              'How many accounts have /sbin/nologin as their shell? `grep -c nologin /etc/passwd`.',
              'Which shells are allowed? `cat /etc/shells`.',
              'How many processes run as root? `ps -eo user | grep -c ^root`.',
              'Save the answer to a file: `ps -eo user | sort | uniq -c | sort -rn > ~/process-owners.txt`.',
              'Inspect the result: `cat ~/process-owners.txt`.'
            ],
            verify: '`~/process-owners.txt` lists users with process counts in descending order, with root near the top.'
          },
          troubleshooting: {
            scenario: 'A script written for an old Solaris server fails on RHEL with "illegal option" errors.',
            steps: [
              'Evidence: run the failing line manually and read the exact option the command rejected.',
              'Hypothesis: the script uses a vendor-specific option, not a POSIX one; Linux uses GNU versions of the tools.',
              'Fix: check `man <command>` on RHEL and replace the option with the GNU or POSIX equivalent.',
              'Validate: run the script in a test environment and compare output with the old system.'
            ]
          },
          mistakes: [
            'Claiming Linux is a version of AT&T Unix; it is an independent Unix-like kernel written from scratch.',
            'Assuming every Unix command option works the same on Linux; GNU tools add and change options.',
            'Ignoring the pipe and writing long scripts for jobs that two or three small tools can do.',
            'Editing configuration with tools that save in non-text formats (for example word processors).'
          ],
          safety: [
            'Reading /etc, /proc and /dev entries is safe; writing to device files such as /dev/sda destroys data.',
            'Redirection with `>` overwrites files silently; double-check the target name, especially as root.'
          ],
          distro: 'All Linux distributions share the same kernel heritage and POSIX-style tools. RHEL, Fedora, Debian and Ubuntu ship GNU coreutils; minimal container images (Alpine) use BusyBox, which provides fewer options.',
          challenge: {
            task: 'Using only pipes and standard tools, print the three most common login shells in /etc/passwd with their counts, most common first. Explain each tool.',
            solution: `\`\`\`
cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn | head -3
\`\`\`

- \`cut -d: -f7\` extracts the shell field from each colon-separated line.
- \`sort\` groups identical shells together (uniq only merges *adjacent* duplicates).
- \`uniq -c\` collapses duplicates and prefixes a count.
- \`sort -rn\` sorts numerically in reverse (largest count first).
- \`head -3\` keeps the top three.`
          },
          interview: [
            { q: 'Is Linux Unix?', a: 'Linux is a Unix-like kernel written independently by Linus Torvalds from 1991, largely POSIX-compatible but not derived from AT&T code and not certified UNIX. It follows Unix design ideas and runs Unix-style tools.', mistake: 'Saying Linux is a fork of AT&T Unix.', followUp: 'Name a certified Unix still in enterprise use (AIX, Solaris, macOS).' },
            { q: 'What does "everything is a file" mean in practice?', a: 'Devices, terminals, kernel information and many system interfaces are accessed through file paths with ordinary read/write operations, so generic tools like cat, grep and redirection work on them.', mistake: 'Taking it literally to mean every object is a regular disk file.', followUp: 'Give examples under /dev and /proc.' },
            { q: 'What is POSIX and why does it matter to an administrator?', a: 'An IEEE standard for Unix-like system interfaces, shell and utilities. Writing to it makes scripts portable between Linux distributions and other Unix systems.', mistake: 'Calling it a Linux distribution or a product.', followUp: 'Is Bash strictly POSIX? (It is a superset with extensions.)' }
          ],
          revision: [
            'Unix: Bell Labs 1969, rewritten in C, many commercial descendants.',
            'POSIX standardises Unix-like interfaces; Linux is Unix-like.',
            'Linux kernel: Linus Torvalds, 1991, GPL licensed.',
            'Unix philosophy: small tools, pipes, text, everything is a file.',
            'Standard streams: 0 stdin, 1 stdout, 2 stderr.'
          ]
        },
        {
          id: 'L00-M3-T2',
          title: 'GNU, licences and how open source is developed',
          minutes: 30,
          objectives: [
            'Explain the GNU project and why the term GNU/Linux exists',
            'Define free software, open source, copyleft and permissive licences',
            'Describe upstream and downstream in open-source development',
            'Explain how companies such as Red Hat build a business on open-source software'
          ],
          prereqs: ['L00-M3-T1'],
          concept: `### The GNU project
In **1983** Richard Stallman launched the **GNU project** ("GNU's Not Unix") to build a complete, free Unix-like operating system. By 1991 GNU had produced most of the pieces — the GCC compiler, the **Bash** shell, **coreutils** (\`ls\`, \`cp\`, \`mv\`), the C library **glibc** — but its own kernel was not ready. Linus Torvalds' Linux kernel filled the gap. A typical "Linux" system is therefore the **Linux kernel plus GNU tools** (plus much more), which is why the Free Software Foundation asks people to say **GNU/Linux**. In daily work most people say "Linux".

### Free software and open source
**Free software** (in the sense of freedom, not price) gives users four freedoms: to run, study, modify and share the program. **Open source** is a closely related term, promoted from 1998 by the Open Source Initiative, that emphasises the practical benefits of public source code and collaborative development. Nearly all software you will manage on Linux servers is free/open source.

### Licences
A **licence** is the legal permission to use, modify and distribute software.

- **Copyleft** licences such as the **GNU GPL** require that if you distribute a modified version, you must also provide its source code under the same licence. The Linux kernel is GPL version 2.
- **Permissive** licences such as **MIT**, **BSD** and **Apache 2.0** allow reuse, even in closed products, with minimal conditions (usually keeping the copyright notice).

For an administrator, licences matter when you distribute software (for example bundle open-source code into a product), not when you simply run it internally — but your organisation's legal team may still require an inventory.

### Upstream and downstream
The **upstream** project is where the original software is developed (for example kernel.org for Linux, httpd.apache.org for Apache). A **downstream** project takes it, packages it, tests it and ships it, such as a Linux distribution. Bugs are best fixed upstream so every downstream benefits. Red Hat's model: contribute upstream, integrate in Fedora, stabilise in CentOS Stream, then ship and support RHEL (Module 4).

### Business model
If the code is free, what do customers pay for? With RHEL they buy a **subscription**: certified, signed packages, security errata, a long support lifecycle, certification with hardware and software vendors, and access to support engineers. This is why "free software" and "enterprise support contract" are not contradictory.`,
          internals: `Licence information travels with the software. Each RPM package records its licence in its header; \`rpm -q --queryformat '%{LICENSE}\\n' bash\` prints it. Full licence texts are usually installed under \`/usr/share/licenses/<package>/\` on RHEL and \`/usr/share/doc/<package>/copyright\` on Debian/Ubuntu. Modern projects label source files with **SPDX** identifiers (for example \`SPDX-License-Identifier: GPL-2.0-only\`) so tools can build a software bill of materials (**SBOM**) automatically. Distributions also track which upstream version they ship and which patches they added; on RHEL the source RPM (SRPM) contains the upstream tarball plus Red Hat's patches.`,
          useCases: [
            'Answering a legal team request to list the licences of packages on a product appliance',
            'Explaining to management why the company pays for RHEL subscriptions although the code is open source',
            'Reporting a bug upstream rather than keeping a private patch that must be maintained forever',
            'Choosing a permissively licensed library for a product that will be distributed to customers'
          ],
          syntax: "rpm -q --queryformat '%{NAME}: %{LICENSE}\\n' bash\nls /usr/share/licenses/\nbash --version | head -1",
          options: [
            ['--queryformat \'%{LICENSE}\\n\'', 'Print the licence field from an installed RPM'],
            ['/usr/share/licenses/PKG', 'Directory holding the licence texts shipped with a package (RHEL family)'],
            ['--version', 'Most GNU tools print version and licence information with this option']
          ],
          examples: [
            {
              title: 'What licence does Bash use?',
              cmd: "rpm -q --queryformat '%{NAME}: %{LICENSE}\\n' bash coreutils kernel-core",
              out: 'bash: GPL-3.0-or-later\ncoreutils: GPL-3.0-or-later\nkernel-core: ((GPL-2.0-only WITH Linux-syscall-note) OR BSD-2-Clause) AND ...',
              fields: [
                ['GPL-3.0-or-later', 'SPDX identifier: GNU GPL version 3 or any later version'],
                ['GPL-2.0-only WITH Linux-syscall-note', 'The kernel is GPLv2 only; the note clarifies that programs using system calls are not derived works']
              ],
              note: 'Older RHEL 8 packages may show legacy short names such as GPLv3+ instead of SPDX identifiers.'
            },
            {
              title: 'GNU tools identify themselves',
              cmd: 'ls --version | head -2',
              out: 'ls (GNU coreutils) 8.32\nCopyright (C) 2020 Free Software Foundation, Inc.',
              fields: [['GNU coreutils', 'The ls command on RHEL is part of the GNU project']]
            }
          ],
          walkthrough: [
            'Run `bash --version | head -1` and `ls --version | head -1` and note "GNU" in both.',
            'Run `uname -s` to see the kernel name (Linux) — kernel and tools come from different projects.',
            'Query licences: `rpm -q --queryformat \'%{NAME}: %{LICENSE}\\n\' bash openssh`.',
            'Browse licence texts: `ls /usr/share/licenses | head`.',
            'Write down one copyleft and one permissive licence you found.'
          ],
          lab: {
            goal: 'Build a small licence inventory for five installed packages.',
            steps: [
              'Choose packages: bash, coreutils, openssh, systemd, python3.',
              'Run `rpm -q --queryformat \'%{NAME},%{VERSION},%{LICENSE}\\n\' bash coreutils openssh systemd python3 > ~/licences.csv`.',
              'View it: `cat ~/licences.csv`.',
              'Find licence files: `ls /usr/share/licenses/bash /usr/share/licenses/openssh 2>/dev/null`.',
              'Classify each licence as copyleft (GPL/LGPL) or permissive (MIT, BSD, Apache, PSF).'
            ],
            verify: '`wc -l ~/licences.csv` prints 5 and each line has a licence field.'
          },
          troubleshooting: {
            scenario: 'A developer wants to patch a bug in an RPM-installed open-source library directly on production servers by editing its files.',
            steps: [
              'Evidence: identify the package that owns the file with `rpm -qf <file>` and check whether the bug is already fixed in an update or upstream.',
              'Hypothesis: a local edit will be overwritten by the next update and is unsupported by the vendor.',
              'Fix: install the vendor errata if available, otherwise report the bug to the vendor/upstream and, if urgent, build a properly versioned package through change control.',
              'Validate: `rpm -V <package>` shows no unexpected modifications on production.'
            ]
          },
          mistakes: [
            'Thinking "free software" means "no cost and no support"; it is about freedoms, and enterprise support is sold separately.',
            'Believing the GPL forbids commercial use; it allows it, with source-sharing obligations on distribution.',
            'Maintaining private patches instead of contributing upstream, creating long-term maintenance debt.',
            'Calling the whole operating system "the kernel".'
          ],
          safety: [
            'Licence queries are read-only.',
            'Do not modify packaged files to patch software; changes are lost on update and break verification. Use vendor updates or properly built packages.'
          ],
          distro: 'RHEL 9 and later use SPDX licence identifiers in package metadata (Fedora migrated first); RHEL 8 packages mostly use older short names. Debian records licences in machine-readable `debian/copyright` files installed as `/usr/share/doc/<pkg>/copyright`. Debian\'s policy (the Debian Free Software Guidelines) keeps non-free software in separate components.',
          challenge: {
            task: 'Your manager asks: "If Linux is free, why are we paying Red Hat, and could we legally ship a modified kernel inside our product?" Answer both parts precisely.',
            solution: `**Why pay:** a RHEL subscription buys supported, signed and tested packages, security errata, a long lifecycle (up to 10+ years per major release), hardware and software certifications, and access to support engineers — not the right to use the code itself.

**Shipping a modified kernel:** yes, commercial distribution is allowed, but the kernel is **GPL-2.0**. If you distribute a modified kernel you must make the corresponding source code (including your changes) available to recipients under GPLv2. Your own user-space applications that only use system calls are not affected (the Linux-syscall-note). Involve legal for the final decision.`
          },
          interview: [
            { q: 'Why do some people say GNU/Linux?', a: 'Because a typical system combines the Linux kernel with essential GNU components such as glibc, Bash, coreutils and GCC. "Linux" alone strictly names the kernel.', mistake: 'Saying GNU is a distribution.', followUp: 'Which GNU components would you find on a RHEL server?' },
            { q: 'What is the difference between copyleft and permissive licences?', a: 'Copyleft (GPL) requires distributed modifications to be released under the same licence with source. Permissive (MIT, BSD, Apache) allows reuse in proprietary products with minimal conditions such as attribution.', mistake: 'Saying the GPL forbids selling software.', followUp: 'Which licence does the Linux kernel use? (GPLv2 only)' },
            { q: 'What do upstream and downstream mean?', a: 'Upstream is where the original software is developed; downstream projects such as distributions take, package and ship it. Fixes should go upstream so all downstreams benefit.', mistake: 'Mixing up the direction.', followUp: 'Place Fedora, CentOS Stream and RHEL on that chain.' }
          ],
          revision: [
            'GNU (1983, Stallman) supplied the tools; Linux (1991) supplied the kernel.',
            'Free software = freedom to run, study, modify, share.',
            'GPL is copyleft; MIT/BSD/Apache are permissive.',
            'Upstream develops; downstream packages and ships.',
            'Enterprise customers pay for support, errata, lifecycle and certification.'
          ]
        }
      ]
    },
    {
      id: 'L00-M4', title: 'Linux distributions and the enterprise ecosystem',
      summary: 'What a distribution is, how the RHEL family relates to Fedora, CentOS Stream, Rocky and AlmaLinux, how Debian, Ubuntu and SUSE compare, and why support lifecycles drive enterprise decisions.',
      lessons: [
        {
          id: 'L00-M4-T1',
          title: 'Distributions and families: RHEL, Fedora, CentOS Stream, Rocky, Alma, Debian, Ubuntu, SUSE',
          minutes: 40,
          objectives: [
            'Define a Linux distribution and list what it contains',
            'Place Fedora, CentOS Stream, RHEL, Rocky Linux and AlmaLinux in the RHEL-family flow',
            'Compare the RHEL, Debian/Ubuntu and SUSE families by package format and tools',
            'Identify which distribution family a system belongs to from simple evidence'
          ],
          prereqs: ['L00-M3-T2'],
          concept: `A **Linux distribution** ("distro") is a complete operating system assembled from the Linux kernel, GNU tools, libraries, a package manager, an installer, default configuration, documentation and a release and support policy. Thousands of upstream projects are integrated, tested and shipped together. Distributions differ mostly in **packaging**, **release cadence**, **support length** and **defaults**, not in the kernel.

### Packages and package managers
Software in a distribution is delivered as **packages**: archives containing program files plus metadata such as version and dependencies. A **package manager** installs, updates and removes them from **repositories** (online collections of packages).

- **Red Hat family**: \`.rpm\` packages; low-level tool \`rpm\`, high-level tool \`dnf\` (\`yum\` on RHEL 7; on RHEL 8+ \`yum\` is an alias for dnf).
- **Debian family**: \`.deb\` packages; low-level tool \`dpkg\`, high-level tool \`apt\`.
- **SUSE**: \`.rpm\` packages; low-level tool \`rpm\`, high-level tool \`zypper\`.

### The Red Hat family
- **Fedora** — community distribution sponsored by Red Hat, new release about every 6 months, about 13 months of support. Innovation happens here first.
- **CentOS Stream** — the continuously updated development branch just *ahead* of the next RHEL minor release. Red Hat developers and partners contribute here. It is upstream of RHEL.
- **RHEL** (Red Hat Enterprise Linux) — the commercially supported product, released as major versions (8, 9, 10) with minor releases (9.4, 9.6). Requires a subscription; a free **Red Hat Developer subscription** exists for individuals.
- **Rocky Linux** and **AlmaLinux** — free community distributions built to be compatible with RHEL, created after the original **CentOS Linux** (a free rebuild of RHEL) was discontinued in favour of CentOS Stream. CentOS Linux 8 ended in December 2021 and CentOS Linux 7 in June 2024.
- **Oracle Linux** — another RHEL-compatible distribution with optional Oracle support.

Flow: **Fedora → CentOS Stream → RHEL → (rebuilt as) Rocky, AlmaLinux**.

### The Debian family
- **Debian** — a large community-run distribution known for stability and strict free-software policies; a new stable release roughly every two years.
- **Ubuntu** — based on Debian, by Canonical; **LTS** (Long-Term Support) releases every two years (22.04, 24.04) are popular on servers and cloud.

### SUSE
**SUSE Linux Enterprise Server (SLES)** is a commercial enterprise distribution popular in Europe and with SAP workloads; **openSUSE** is the community counterpart. SUSE uses RPM packages but its own tools (zypper, YaST).

> This course uses **RHEL 9/10** (and compatible Rocky/AlmaLinux) as the primary platform because it dominates enterprise data centres and the RHCSA/RHCE certifications are based on it. Debian/Ubuntu differences are noted throughout.`,
          internals: `Every modern distribution describes itself in \`/etc/os-release\`, a text file of KEY=value pairs defined by systemd. Important keys: \`ID\` (rhel, rocky, almalinux, ubuntu), \`ID_LIKE\` (the family, for example \`rhel centos fedora\` on Rocky or \`debian\` on Ubuntu), \`VERSION_ID\` and \`PRETTY_NAME\`. Scripts and configuration-management tools such as Ansible read these values to decide which package manager to use. RHEL-family systems also have \`/etc/redhat-release\`; Debian has \`/etc/debian_version\`. The package database lives in \`/var/lib/rpm\` (or \`/usr/lib/sysimage/rpm\` on RHEL 10) for RPM systems and \`/var/lib/dpkg\` for Debian systems.`,
          useCases: [
            'Deciding whether a vendor application certified for RHEL 9 will be supported on Rocky Linux 9 or only on RHEL',
            'Planning a migration from end-of-life CentOS Linux 7 to RHEL, Rocky or AlmaLinux',
            'Writing an automation script that chooses dnf or apt from /etc/os-release',
            'Using Fedora or CentOS Stream to preview features coming to the next RHEL release'
          ],
          syntax: 'cat /etc/os-release\ncat /etc/redhat-release\ngrep ^ID /etc/os-release\ncommand -v dnf apt zypper',
          options: [
            ['ID=', '/etc/os-release key: the distribution identifier'],
            ['ID_LIKE=', '/etc/os-release key: the family the distribution is compatible with'],
            ['VERSION_ID=', '/etc/os-release key: version number, e.g. 9.6 or 24.04'],
            ['PRETTY_NAME=', '/etc/os-release key: human-readable name'],
            ['command -v', 'Show whether a command exists and where; useful to detect the package manager']
          ],
          examples: [
            {
              title: 'Identify a Rocky Linux system',
              cmd: 'grep -E "^(ID|ID_LIKE|VERSION_ID|PRETTY_NAME)=" /etc/os-release',
              out: 'ID="rocky"\nID_LIKE="rhel centos fedora"\nVERSION_ID="9.6"\nPRETTY_NAME="Rocky Linux 9.6 (Blue Onyx)"',
              fields: [
                ['ID="rocky"', 'The distribution itself is Rocky Linux'],
                ['ID_LIKE="rhel centos fedora"', 'It belongs to the Red Hat family; RHEL instructions apply'],
                ['VERSION_ID="9.6"', 'Compatible with RHEL 9.6']
              ]
            },
            {
              title: 'Identify an Ubuntu system',
              cmd: 'grep -E "^(ID|ID_LIKE|VERSION_ID)=" /etc/os-release',
              out: 'ID=ubuntu\nID_LIKE=debian\nVERSION_ID="24.04"',
              fields: [
                ['ID_LIKE=debian', 'Debian family: packages are .deb, managed with apt/dpkg'],
                ['24.04', 'An LTS release (April 2024); even-year .04 releases are LTS']
              ]
            }
          ],
          walkthrough: [
            'Run `cat /etc/os-release` and read ID, ID_LIKE and VERSION_ID.',
            'Check for RHEL-family markers: `cat /etc/redhat-release` (it exists on RHEL, Rocky, Alma, Fedora, CentOS Stream).',
            'Detect the package manager: `command -v dnf apt zypper`.',
            'Draw the Red Hat flow: Fedora → CentOS Stream → RHEL → Rocky/Alma.',
            'Note which family each of these belongs to: Ubuntu, AlmaLinux, SLES, Fedora, Debian.'
          ],
          lab: {
            goal: 'Write a small script that reports the distribution family using /etc/os-release.',
            steps: [
              'Show the file: `cat /etc/os-release`.',
              'Load its values into your shell: `. /etc/os-release` (the dot runs the file in the current shell; it only sets variables).',
              'Print them: `echo "$ID / $ID_LIKE / $VERSION_ID"`.',
              'Classify: `case " $ID $ID_LIKE " in *" rhel "*|*" fedora "*) echo RHEL-family;; *" debian "*) echo Debian-family;; *" suse "*) echo SUSE-family;; *) echo unknown;; esac`.',
              'Cross-check: `command -v dnf || command -v apt`.'
            ],
            verify: 'On a RHEL, Rocky or AlmaLinux VM the script prints "RHEL-family" and `command -v dnf` prints /usr/bin/dnf.'
          },
          troubleshooting: {
            scenario: 'A runbook step `sudo apt install nginx` fails with "apt: command not found" on a new server.',
            steps: [
              'Evidence: `cat /etc/os-release` shows ID="almalinux" and ID_LIKE="rhel centos fedora".',
              'Hypothesis: the runbook was written for Ubuntu; this is a RHEL-family system using dnf.',
              'Fix: use `sudo dnf install nginx` and update the runbook to detect the family first.',
              'Validate: `rpm -q nginx` reports the installed package.'
            ]
          },
          mistakes: [
            'Calling CentOS Stream "the free RHEL"; it is upstream of RHEL, not a rebuild of a released version.',
            'Running apt commands on RHEL or dnf commands on Ubuntu because a tutorial said so.',
            'Assuming all RPM-based distributions use dnf; SUSE uses zypper.',
            'Using Fedora for long-lived production servers despite its roughly 13-month support window.'
          ],
          safety: [
            'Reading /etc/os-release is safe.',
            'Never mix repositories from different distributions or major versions; it can break the system on the next update.'
          ],
          distro: 'RHEL 8 and 9 introduced Application Streams for multiple versions of runtimes; RHEL 10 continues the dnf package manager. Debian/Ubuntu use apt with .deb packages. Rocky and AlmaLinux 8/9/10 track RHEL minor releases closely; AlmaLinux describes itself as ABI-compatible with RHEL, while Rocky aims for bug-for-bug compatibility.',
          challenge: {
            task: 'A company runs CentOS Linux 7 servers and wants to stay in the Red Hat family with long support. List three realistic targets, one advantage and one consideration for each.',
            solution: `CentOS Linux 7 reached end of life in **June 2024**, so it receives no security updates.

1. **RHEL 9 or 10** — advantage: vendor support, certifications, long lifecycle, Red Hat migration tooling (Convert2RHEL for in-place conversion, Leapp for upgrades). Consideration: subscription cost.
2. **Rocky Linux 9/10** — advantage: free, RHEL-compatible. Consideration: community support (or third-party commercial support), and some vendors certify only RHEL.
3. **AlmaLinux 9/10** — advantage: free, RHEL ABI-compatible, community foundation backing. Consideration: same vendor-certification question.

Not suitable: **CentOS Stream** for systems that need a frozen minor release, and **Fedora** because of its short lifecycle.`
          },
          interview: [
            { q: 'What is the relationship between Fedora, CentOS Stream and RHEL?', a: 'Fedora is the fast-moving community distribution where features land first; CentOS Stream is the continuously delivered branch just ahead of the next RHEL minor release; RHEL is the supported product built from it.', mistake: 'Saying CentOS Stream is a downstream rebuild of RHEL.', followUp: 'Where do Rocky Linux and AlmaLinux fit?' },
            { q: 'How would a script tell whether it runs on RHEL family or Debian family?', a: 'Read ID and ID_LIKE from /etc/os-release (for example by sourcing it) and branch on rhel/fedora versus debian.', mistake: 'Parsing uname output, which only describes the kernel.', followUp: 'How does Ansible expose this? (ansible_facts os_family)' },
            { q: 'Name the package tools for RHEL, Ubuntu and SUSE.', a: 'RHEL: rpm and dnf. Ubuntu/Debian: dpkg and apt. SUSE: rpm and zypper.', mistake: 'Thinking all RPM systems use dnf.', followUp: 'What replaced yum on RHEL 8?' }
          ],
          revision: [
            'A distribution = kernel + tools + packages + installer + support policy.',
            'Fedora → CentOS Stream → RHEL → rebuilt as Rocky/AlmaLinux.',
            'RHEL family: rpm/dnf; Debian/Ubuntu: dpkg/apt; SUSE: rpm/zypper.',
            '/etc/os-release ID and ID_LIKE identify the distro and family.',
            'CentOS Linux 7 and 8 are end of life.'
          ]
        },
        {
          id: 'L00-M4-T2',
          title: 'Support lifecycles and choosing an enterprise distribution',
          minutes: 35,
          objectives: [
            'Explain major releases, minor releases, errata and end of life (EOL)',
            'Summarise the RHEL lifecycle (Full Support, Maintenance Support, Extended Life) and compare Ubuntu LTS and Debian',
            'Explain why running an EOL system is a business risk',
            'Choose a suitable distribution for a given enterprise scenario and justify it'
          ],
          prereqs: ['L00-M4-T1'],
          concept: `### Releases
Enterprise distributions publish **major releases** (RHEL 8, 9, 10) every few years. A major release may change default tools and remove old features, so upgrading between majors is a project. Within a major release come **minor releases** (RHEL 9.4, 9.5, 9.6), roughly every six months, which add hardware support and features while keeping compatibility. Between minor releases, vendors ship **errata**: package updates that fix security vulnerabilities (**security advisories**), bugs or add small enhancements. Red Hat labels them RHSA (security), RHBA (bug fix) and RHEA (enhancement).

### Lifecycle and end of life
The **lifecycle** is the period during which the vendor ships updates. When it ends, the release reaches **end of life (EOL)**: no more security fixes. A server on an EOL release accumulates unpatched vulnerabilities, fails audits (PCI DSS and ISO 27001 controls expect supported software) and often loses vendor support for the applications on it.

### RHEL lifecycle
RHEL major releases receive about **10 years** of support:
- **Full Support** (about the first 5 years): security and bug fixes, new hardware enablement and minor feature updates.
- **Maintenance Support** (about the next 5 years): mainly security and critical bug fixes.
- **Extended Life Phase** with optional add-ons (Extended Life Cycle Support) for a few more years at extra cost.

Optional add-ons such as **EUS** (Extended Update Support) let you stay on a specific minor release (for example 9.4) longer, useful when an application is certified only on one minor version. Approximate end of maintenance: RHEL 8 in 2029, RHEL 9 in 2032, RHEL 10 in 2035. Always confirm current dates on the vendor's lifecycle page.

Rocky Linux and AlmaLinux follow the RHEL major-release timeline but you only receive updates for the **latest minor release**.

### Other families
- **Ubuntu LTS**: 5 years of standard security maintenance, extendable to 10+ years with Ubuntu Pro / ESM. Non-LTS releases get 9 months.
- **Debian stable**: about 3 years from the Debian security team plus about 2 years of community **LTS**, roughly 5 years total.
- **SLES**: about 10 years general support plus long-term service packs.
- **Fedora**: about 13 months — not for long-lived production.
- **CentOS Stream**: each stream lives for roughly the Full Support phase of the matching RHEL major.

### Choosing
Ask: Which distributions does the **application vendor certify**? What **support** is required (24x7 vendor phone support, or community)? How long must the server run without a major upgrade? What does the team already know? What do **compliance** requirements demand?`,
          internals: `On a RHEL system you can see the release you are on with \`cat /etc/redhat-release\` and whether updates are pending with \`dnf check-update\`. Security errata are described with advisory IDs and CVE numbers; \`dnf updateinfo list --security\` lists the ones applicable to the system, and \`dnf updateinfo info RHSA-2025:1234\` shows details. A minor release is not something you "install" separately: when a RHEL 9.5 system applies all updates after 9.6 is published, its packages (including \`redhat-release\`) move to 9.6 automatically, unless the system is pinned to a release with \`subscription-manager release --set=9.4\` (EUS). On Ubuntu, \`ubuntu-security-status\` and \`pro status\` show coverage.`,
          useCases: [
            'Building a report of servers approaching EOL so budget and migration projects are planned years ahead',
            'Keeping an SAP or database host on a certified minor release using EUS while still receiving security fixes',
            'Justifying a RHEL subscription for a regulated payment system that needs vendor support and certified errata',
            'Choosing Ubuntu LTS for a cloud-native team whose tooling and vendor images target Ubuntu'
          ],
          syntax: 'cat /etc/redhat-release\ndnf check-update\ndnf updateinfo list --security\nsubscription-manager release --show',
          options: [
            ['dnf check-update', 'List packages with available updates (exit status 100 when updates exist)'],
            ['dnf updateinfo summary', 'Count applicable security, bug fix and enhancement advisories'],
            ['dnf updateinfo list --security', 'List applicable security advisories'],
            ['subscription-manager release --show', 'Show whether a RHEL system is pinned to a minor release']
          ],
          examples: [
            {
              title: 'How exposed is this server?',
              cmd: 'sudo dnf updateinfo summary',
              out: 'Updates Information Summary: available\n    7 Security notice(s)\n        2 Important Security notice(s)\n        4 Moderate Security notice(s)\n        1 Low Security notice(s)\n    3 Bugfix notice(s)\n    1 Enhancement notice(s)',
              fields: [
                ['7 Security notice(s)', 'Seven security advisories (RHSA) apply to installed packages'],
                ['Important', 'Red Hat severity rating; Critical and Important are usually patched first'],
                ['Bugfix / Enhancement', 'RHBA and RHEA advisories']
              ]
            },
            {
              title: 'An end-of-life system',
              cmd: 'cat /etc/centos-release',
              out: 'CentOS Linux release 7.9.2009 (Core)',
              fields: [['CentOS Linux 7.9', 'End of life since 30 June 2024: no security updates; migration required']]
            }
          ],
          walkthrough: [
            'Check your release: `cat /etc/redhat-release` or `cat /etc/os-release`.',
            'Look up its lifecycle phase on the vendor\'s lifecycle page and note the end-of-maintenance date.',
            'On RHEL/Rocky/Alma run `sudo dnf updateinfo summary` to see pending advisories.',
            'List security advisories: `sudo dnf updateinfo list --security`.',
            'Write a one-line risk statement: release, EOL date, number of pending security advisories.'
          ],
          lab: {
            goal: 'Produce a lifecycle and patch-exposure statement for your lab VM.',
            steps: [
              'Record the release: `cat /etc/redhat-release`.',
              'Record the kernel: `uname -r`.',
              'Check pending updates: `sudo dnf check-update; echo "exit=$?"` (100 means updates are available, 0 means none).',
              'Summarise advisories: `sudo dnf updateinfo summary`.',
              'Write the statement: "<release>, maintained until <year>, N security advisories pending".'
            ],
            verify: 'Your statement matches the command output; the exit status of dnf check-update agrees with whether updates were listed.'
          },
          troubleshooting: {
            scenario: 'An audit flags 40 servers as "unsupported OS". The team believes they are fine because "they still work".',
            steps: [
              'Evidence: collect `/etc/os-release` from each server (Ansible or a simple SSH loop).',
              'Hypothesis: servers run EOL releases (for example CentOS Linux 7 or Ubuntu 18.04 without ESM).',
              'Remediate: plan migration to supported releases (RHEL/Rocky/Alma 9 or 10, Ubuntu 24.04), or buy extended support as a temporary bridge with a dated exit plan.',
              'Validate: re-run the inventory and confirm every server is on a release with a future EOL date.'
            ]
          },
          mistakes: [
            'Equating "it still boots" with "it is supported": EOL systems silently stop receiving security fixes.',
            'Choosing Fedora or non-LTS Ubuntu for servers expected to run for years.',
            'Assuming Rocky or AlmaLinux provide EUS-style pinning to old minor releases; updates target the latest minor.',
            'Planning major-version upgrades only after EOL, when risk and pressure are highest.'
          ],
          safety: [
            'Listing updates is read-only; applying them on production requires change control and a rollback plan.',
            'Do not pin or freeze a system to avoid updates without a documented security exception.'
          ],
          distro: 'RHEL: about 10 years plus optional extended life; EUS for selected minor releases. Rocky/AlmaLinux: same major timeline, latest minor only. Ubuntu LTS: 5 years standard, up to 12 with Ubuntu Pro and Legacy add-on. Debian: about 5 years with LTS. Lifecycle dates change; verify on official pages before planning.',
          challenge: {
            task: 'Recommend a distribution for each workload and justify it: (a) a payment-processing database certified by its vendor only on RHEL 9.4; (b) a lab of 30 short-lived training VMs with no budget; (c) a long-lived Kubernetes worker fleet whose team standardises on Ubuntu.',
            solution: `(a) **RHEL 9 with EUS pinned to 9.4** (\`subscription-manager release --set=9.4\`): vendor certification, regulated environment needing vendor support and certified security errata on that minor release.

(b) **Rocky Linux or AlmaLinux 9/10** (or RHEL via free developer subscriptions for individuals): RHEL-compatible for training at no cost; short life so lifecycle is not a concern.

(c) **Ubuntu 24.04 LTS**, optionally with Ubuntu Pro: 5 years standard maintenance matches the team's skills and tooling; plan the move to the next LTS before EOL.`
          },
          interview: [
            { q: 'What happens when a distribution reaches end of life?', a: 'The vendor stops shipping security and bug fixes. The system keeps running but accumulates unpatched vulnerabilities, fails compliance checks and usually loses vendor and application support.', mistake: 'Saying the system stops working.', followUp: 'How would you find EOL systems in a fleet?' },
            { q: 'Describe the RHEL lifecycle.', a: 'About 10 years per major release: roughly 5 years Full Support with fixes and enhancements, then Maintenance Support with security and critical fixes, then optional extended life add-ons. EUS allows staying on selected minor releases longer.', mistake: 'Thinking each minor release is a separate product with its own 10 years.', followUp: 'What is the difference between RHSA, RHBA and RHEA?' },
            { q: 'Why might you pick RHEL over Rocky Linux even though they are compatible?', a: 'Vendor certification, Red Hat support contracts, EUS and other add-ons, tooling such as Insights, and compliance requirements for a supported vendor.', mistake: 'Claiming Rocky is technically inferior or insecure.', followUp: 'When is Rocky or Alma a good choice?' }
          ],
          revision: [
            'Major releases change things; minor releases keep compatibility; errata fix issues between them.',
            'EOL = no more security fixes; a compliance and security risk.',
            'RHEL: ~10 years per major (Full then Maintenance), EUS optional.',
            'Ubuntu LTS: 5 years standard; Debian ~5 with LTS; Fedora ~13 months.',
            'Choose by vendor certification, support needs, lifespan and team skills.'
          ]
        }
      ]
    },
    {
      id: 'L00-M5', title: 'Networks, servers, virtualization and cloud basics',
      summary: 'How clients reach servers over IP networks using addresses, names and ports, and how virtual machines, hypervisors and cloud instances host the servers you will administer in production and non-production environments.',
      lessons: [
        {
          id: 'L00-M5-T1',
          title: 'Clients, servers, IP addresses, DNS and ports',
          minutes: 40,
          objectives: [
            'Define client, server, service, network, IP address, subnet and gateway',
            'Explain how DNS turns names into IP addresses',
            'Explain ports and match common services to their default ports (22, 53, 80, 443)',
            'Read simple address, name-resolution and listening-port output on Linux'
          ],
          prereqs: ['L00-M2-T2'],
          concept: `### Clients and servers
A **server** is a computer (or a program) that provides a **service** to others: web pages, databases, file shares, authentication. A **client** is the program that asks for the service, such as your browser or the \`ssh\` command. The same machine can be a client for one service and a server for another. In data centres, "server" usually also means the machine dedicated to running services, managed remotely without a monitor or keyboard.

### Networks and IP addresses
A **network** connects computers so they can exchange data in small units called **packets**. Every network interface needs an **IP address** so packets can be delivered:

- **IPv4** addresses are four numbers from 0-255, for example \`192.168.10.25\`.
- **IPv6** addresses are longer, written in hexadecimal, for example \`2001:db8::25\`. RHCSA on RHEL 10 expects you to configure both.

An address comes with a **prefix** (subnet mask) such as \`/24\`, which says which part identifies the **network** and which part the **host**. Machines on the same subnet talk directly; to reach other networks they send packets to a **default gateway** (a router). Addresses like \`10.x.x.x\`, \`172.16-31.x.x\` and \`192.168.x.x\` are **private** and not routed on the internet. \`127.0.0.1\` (\`::1\` in IPv6) is **localhost**: the machine itself.

### DNS
People remember names, computers need numbers. **DNS** (Domain Name System) is the distributed directory that translates a name such as \`www.example.com\` into an IP address. Your machine asks a **DNS resolver** (configured in \`/etc/resolv.conf\`, usually provided by DHCP or NetworkManager). Before DNS, Linux checks the local file \`/etc/hosts\` for static entries (the order is set in \`/etc/nsswitch.conf\`). Many "the network is down" incidents are really "DNS is broken": the IP works, the name does not.

### Ports
One server runs many services. A **port** number (0-65535) identifies which program on that IP address should receive the traffic. Common well-known ports:

- **22** SSH (remote login), **53** DNS, **80** HTTP, **443** HTTPS, **25** SMTP (mail), **3306** MySQL/MariaDB, **5432** PostgreSQL.

A service **listens** on a port. A connection is identified by source IP and port plus destination IP and port. Two transport protocols carry most traffic: **TCP** (reliable, connection-based: SSH, HTTPS) and **UDP** (lightweight, no connection: most DNS queries, NTP time sync).

> Troubleshooting order for "I can't reach the server": name (DNS) → address and route (IP) → port (is the service listening, is a firewall blocking?) → application.`,
          internals: `On Linux, interfaces and addresses are managed by the kernel and configured on RHEL by **NetworkManager**; \`ip addr\` shows them and \`ip route\` shows the routing table, including the \`default via\` gateway. Name lookups by most programs go through the C library, which follows \`/etc/nsswitch.conf\` (typically \`hosts: files dns myhostname\`): first \`/etc/hosts\`, then the DNS servers listed in \`/etc/resolv.conf\`. \`getent hosts NAME\` performs exactly this library lookup, while \`dig\` and \`host\` (bind-utils package) query DNS servers directly. Listening sockets are kernel objects; \`ss -tlnp\` lists TCP listeners with the owning process (root needed to see other users' processes). Ports below 1024 are **privileged**: binding to them normally requires root or a capability.`,
          useCases: [
            'Separating a DNS failure from a network outage when users report a website is down',
            'Verifying that a newly installed web server is actually listening on port 443',
            'Adding a temporary /etc/hosts entry to test a new server before DNS is changed',
            'Explaining to an application team which ports their firewall request must include'
          ],
          syntax: 'ip -br addr\nip route\ngetent hosts NAME\ncat /etc/resolv.conf\nss -tln\nping -c 3 HOST',
          options: [
            ['ip -br addr', 'Brief list of interfaces, their state and addresses'],
            ['ip route', 'Show the routing table, including the default gateway'],
            ['getent hosts NAME', 'Resolve a name the same way applications do (files then DNS)'],
            ['ss -tln', 'List TCP sockets in LISTEN state with numeric ports'],
            ['ss -tlnp', 'Also show the process owning each listener (root to see all)'],
            ['ping -c 3', 'Send 3 ICMP echo requests to test basic reachability']
          ],
          examples: [
            {
              title: 'What is my address and gateway?',
              cmd: 'ip -br addr ; ip route',
              out: 'lo               UNKNOWN        127.0.0.1/8 ::1/128\nenp1s0           UP             192.168.122.50/24 fe80::5054:ff:fe12:3456/64\ndefault via 192.168.122.1 dev enp1s0 proto dhcp src 192.168.122.50 metric 100\n192.168.122.0/24 dev enp1s0 proto kernel scope link src 192.168.122.50 metric 100',
              fields: [
                ['lo 127.0.0.1/8', 'Loopback interface: the machine talking to itself'],
                ['192.168.122.50/24', 'This host\'s private IPv4 address; /24 means the first three numbers identify the network'],
                ['fe80::...', 'IPv6 link-local address, automatically created on every interface'],
                ['default via 192.168.122.1', 'The gateway that receives traffic for all other networks']
              ]
            },
            {
              title: 'Which services are listening?',
              cmd: 'ss -tln',
              out: 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port\nLISTEN  0       128            0.0.0.0:22          0.0.0.0:*\nLISTEN  0       511            0.0.0.0:80          0.0.0.0:*\nLISTEN  0       128               [::]:22             [::]:*',
              fields: [
                ['0.0.0.0:22', 'SSH listens on port 22 on all IPv4 addresses'],
                ['0.0.0.0:80', 'A web server listens for HTTP on port 80'],
                ['[::]:22', 'SSH also listens on all IPv6 addresses']
              ],
              note: 'A service listening on 127.0.0.1 only would be reachable from the machine itself, not from the network.'
            },
            {
              title: 'Name resolution',
              cmd: 'getent hosts www.redhat.com',
              out: '2600:1408:9000:38c::d44 e3396.dscx.akamaiedge.net www.redhat.com',
              fields: [['2600:...', 'The name resolved to an IPv6 address via DNS (through a CDN alias)']]
            }
          ],
          walkthrough: [
            'Run `ip -br addr` and find your main interface and its IPv4/IPv6 addresses.',
            'Run `ip route` and find the default gateway.',
            'Run `cat /etc/resolv.conf` to see which DNS servers you use.',
            'Resolve a name: `getent hosts redhat.com`; then look at `/etc/hosts`.',
            'List listening services: `ss -tln` and match ports to services (22 = SSH).',
            'Test reachability of the gateway: `ping -c 3 <gateway>`.'
          ],
          lab: {
            goal: 'Map the network identity and services of your lab VM.',
            steps: [
              'Record addresses: `ip -br addr`.',
              'Record the gateway: `ip route | grep default`.',
              'Record DNS servers: `grep nameserver /etc/resolv.conf`.',
              'Test name resolution: `getent hosts localhost` and `getent hosts redhat.com`.',
              'List TCP listeners with their programs: `sudo ss -tlnp`.',
              'Test the SSH port locally: `timeout 3 bash -c "</dev/tcp/127.0.0.1/22" && echo open`.'
            ],
            verify: 'You can state "IP 192.168.x.y/24, gateway 192.168.x.1, DNS <server>, sshd listening on 22", each backed by command output.'
          },
          troubleshooting: {
            scenario: 'Users report "the intranet is down". From a Linux host, `ping 10.20.0.15` works but `ping intranet.corp.example` fails with "Name or service not known".',
            steps: [
              'Evidence: the IP is reachable, the name is not; run `getent hosts intranet.corp.example` and `cat /etc/resolv.conf`.',
              'Hypothesis: DNS resolution is failing (wrong resolver, DNS server down or missing record), not the network or the web server.',
              'Fix: query the configured DNS server directly (`dig @<server> intranet.corp.example` if bind-utils is installed) and escalate to the DNS team or correct the resolver configuration via NetworkManager.',
              'Validate: `getent hosts intranet.corp.example` returns 10.20.0.15 and the site loads by name.'
            ]
          },
          mistakes: [
            'Declaring "the network is down" when only DNS fails; test the IP and the name separately.',
            'Assuming a service is reachable because it is running; it may listen only on 127.0.0.1 or be blocked by a firewall.',
            'Editing /etc/resolv.conf by hand on RHEL when NetworkManager manages it; the change is overwritten.',
            'Confusing ports with IP addresses ("open IP 443").'
          ],
          safety: [
            'ip, ss, getent and ping are read-only diagnostics.',
            'Changing addresses or routes on a remote server can cut off your own SSH session; have console access and a rollback plan (Level 9).'
          ],
          distro: 'RHEL 8/9/10 use NetworkManager and the `ip`/`ss` tools from iproute; the old `ifconfig`/`netstat` (net-tools) are deprecated and not installed by default. Ubuntu Server configures networks with netplan (rendering to systemd-networkd or NetworkManager) but uses the same `ip` and `ss` commands.',
          challenge: {
            task: 'A colleague says "The new app server 10.1.5.20 is broken: http://app01 does not load." Give an ordered, evidence-first checklist of commands that isolates whether the problem is DNS, routing, the service, or the application.',
            solution: `Work from the bottom of the dependency chain upward:

1. **Name**: \`getent hosts app01\` — does it resolve to 10.1.5.20? If not, it is DNS/hosts.
2. **Reachability**: \`ping -c 3 10.1.5.20\` and \`ip route get 10.1.5.20\` — is there a route? (Some networks block ping; absence of reply is a hint, not proof.)
3. **Port**: \`timeout 3 bash -c "</dev/tcp/10.1.5.20/80" && echo open\` — is anything accepting on 80?
4. **On the server**: \`sudo ss -tlnp | grep ':80 '\` — is the web server listening, and on 0.0.0.0 or only 127.0.0.1? Then check the firewall (Level 13).
5. **Application**: \`curl -sI http://10.1.5.20/\` — does it return an HTTP status?

Each step only proceeds if the previous one passes, so the first failing step names the layer at fault.`
          },
          interview: [
            { q: 'What is the difference between an IP address and a port?', a: 'The IP address identifies the host (network interface); the port identifies which service on that host receives the traffic. A connection uses both, e.g. 10.0.0.5:443.', mistake: 'Treating them as the same thing.', followUp: 'Which port does SSH use by default?' },
            { q: 'A server is reachable by IP but not by name. What do you check?', a: 'Name resolution: getent hosts NAME, /etc/hosts, /etc/resolv.conf and the DNS server itself (dig). The network path is evidently fine.', mistake: 'Restarting the network or the application.', followUp: 'What order does Linux use for hosts lookups? (nsswitch.conf: files then dns)' },
            { q: 'What does it mean when ss shows 127.0.0.1:8080 in LISTEN state?', a: 'A service is listening on port 8080 only on the loopback address, so only local clients can connect; remote clients cannot.', mistake: 'Assuming the service is reachable from the network.', followUp: 'How would you make it reachable? (Change its bind address in its configuration, then open the firewall.)' }
          ],
          revision: [
            'Clients request services; servers provide them.',
            'IP address = host; port = service; /24 prefix = network part.',
            'DNS maps names to IPs; /etc/hosts is checked first by default.',
            'Ports: 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS.',
            'Diagnose in order: name → IP/route → port → application.'
          ]
        },
        {
          id: 'L00-M5-T2',
          title: 'Virtualization, cloud instances and production environments',
          minutes: 35,
          objectives: [
            'Define virtual machine, hypervisor (type 1 and type 2), guest and host',
            'Explain how cloud instances, images and regions relate to virtualization',
            'Distinguish VMs from containers at a high level',
            'Explain production, staging, test and development environments and why change control exists'
          ],
          prereqs: ['L00-M5-T1'],
          concept: `### Virtual machines
A **virtual machine (VM)** is a software-defined computer: it has virtual CPUs, virtual RAM, virtual disks and virtual network cards, and runs a complete operating system called the **guest**. The real physical machine is the **host**. One host can run dozens of VMs, isolating them from each other. VMs made it cheap to create, copy and delete servers, which transformed operations.

### Hypervisors
The **hypervisor** is the software that creates and runs VMs and shares the physical hardware among them, using CPU virtualization features (Intel VT-x, AMD-V).

- **Type 1 (bare-metal)** hypervisors run directly on the hardware: **KVM** (built into the Linux kernel, used by RHEL, OpenShift Virtualization and most clouds), VMware **ESXi**, Microsoft **Hyper-V**, Xen.
- **Type 2 (hosted)** hypervisors run as an application on a desktop OS: **VirtualBox**, VMware Workstation/Fusion. Ideal for learning labs (Level 1).

KVM blurs the line: it turns the Linux kernel itself into a type 1 hypervisor, managed on RHEL with **libvirt** tools such as \`virsh\` and the Cockpit web console.

### Cloud instances
**Cloud computing** rents compute, storage and networking on demand over the internet. In **IaaS** (Infrastructure as a Service) clouds such as AWS EC2, Azure Virtual Machines and Google Compute Engine, a server is called an **instance**: a VM created from an **image** (a prepared OS disk, for example an official RHEL 9 AMI) in a **region** and **availability zone**, with an **instance type** that sets its CPU and RAM. Instances are often treated as disposable: rebuilt from images and automation rather than repaired by hand. Logging in usually uses **SSH keys** supplied at creation time and an initial user such as \`ec2-user\` (RHEL on AWS) or \`cloud-user\`, configured by **cloud-init** at first boot.

### Containers (preview)
A **container** packages an application with its libraries but **shares the host's kernel**, so it starts in milliseconds and uses fewer resources than a VM. VMs virtualise hardware; containers isolate processes. RHEL uses **Podman** for containers (Level 16).

### Environments
Organisations separate systems by purpose:

- **Development (dev)** — where engineers build; frequent change, low risk.
- **Test / QA** — where changes are tested.
- **Staging / pre-production** — as close to production as possible; final rehearsal.
- **Production (prod)** — serves real users, real money, real data. Outages cost the business.

Changes are promoted dev → test → staging → prod under **change control**: a documented plan, approval, a **maintenance window**, a tested **rollback plan** and **validation** afterwards. Administrators always check which environment a terminal is connected to before typing.`,
          internals: `KVM is a kernel module (\`kvm\` plus \`kvm_intel\` or \`kvm_amd\`) that exposes \`/dev/kvm\`. Each VM is an ordinary user-space process (QEMU) whose virtual CPUs run as threads; the CPU's hardware virtualization extensions let guest code run directly on the processor until it touches something that must be emulated. Inside a guest, \`systemd-detect-virt\` reports the hypervisor (kvm, vmware, microsoft, oracle for VirtualBox, amazon) or \`none\` on bare metal, and \`lscpu\` shows a "Hypervisor vendor" line. Paravirtual **virtio** devices (\`vda\` disks, virtio NICs) avoid slow hardware emulation. In the cloud, the instance metadata service (reachable at the link-local address 169.254.169.254) supplies cloud-init with the hostname, SSH keys and user data at boot.`,
          useCases: [
            'Building a disposable lab on a laptop with VirtualBox or KVM to practise without risk',
            'Consolidating dozens of lightly used physical servers onto a few KVM or VMware hosts',
            'Launching RHEL instances in AWS from an official image with SSH keys injected by cloud-init',
            'Testing a patch in staging before a scheduled production maintenance window'
          ],
          syntax: 'systemd-detect-virt\nlscpu | grep -i hypervisor\nhostnamectl\ngrep -cE "vmx|svm" /proc/cpuinfo',
          options: [
            ['systemd-detect-virt', 'Print the virtualization technology in use (kvm, vmware, oracle, microsoft, none)'],
            ['systemd-detect-virt -c', 'Detect only container environments'],
            ['lscpu', 'Shows "Hypervisor vendor" and "Virtualization type" when running in a VM'],
            ['grep -cE "vmx|svm" /proc/cpuinfo', 'Count CPUs advertising hardware virtualization (needed to host KVM VMs)']
          ],
          examples: [
            {
              title: 'Am I on a VM?',
              cmd: 'systemd-detect-virt ; lscpu | grep -i hypervisor',
              out: 'kvm\nHypervisor vendor:                    KVM',
              fields: [
                ['kvm', 'This system is a guest running under the KVM hypervisor'],
                ['Hypervisor vendor: KVM', 'Same information reported by the CPU identification']
              ],
              note: 'On a physical server systemd-detect-virt prints "none" and exits with status 1.'
            },
            {
              title: 'Production banner check',
              cmd: 'hostnamectl',
              out: ' Static hostname: pay-db-prod-01.corp.example\n       Icon name: computer-vm\n         Chassis: vm\n  Virtualization: vmware\nOperating System: Red Hat Enterprise Linux 9.6 (Plow)\n          Kernel: Linux 5.14.0-570.12.1.el9_6.x86_64\n    Architecture: x86-64',
              fields: [
                ['pay-db-prod-01', 'Naming convention reveals a production payment database: slow down and follow change control'],
                ['Chassis: vm / Virtualization: vmware', 'A VMware guest'],
                ['Operating System', 'Distribution and minor release']
              ]
            }
          ],
          walkthrough: [
            'Run `systemd-detect-virt` to learn whether your system is virtual.',
            'Run `hostnamectl` and read Chassis, Virtualization and Operating System.',
            'Check whether your CPU can host VMs: `grep -cE "vmx|svm" /proc/cpuinfo` (0 means no hardware virtualization exposed).',
            'Draw the layers: hardware → hypervisor → VMs (each with its own kernel) versus hardware → kernel → containers.',
            'Write down which environment (dev/test/staging/prod) your lab represents and what that allows you to do.'
          ],
          lab: {
            goal: 'Document the virtualization context and environment of your lab system.',
            steps: [
              'Detect virtualization: `systemd-detect-virt`.',
              'Capture identity: `hostnamectl`.',
              'Confirm hardware virtualization support (for nested labs): `grep -cE "vmx|svm" /proc/cpuinfo`.',
              'Check for cloud-init (cloud images only): `rpm -q cloud-init` and `cloud-init status` if installed.',
              'Set a clear prompt reminder by adding a login message: `echo "LAB - non-production" | sudo tee /etc/motd`.',
              'Log out and back in to see the message.'
            ],
            verify: 'Logging in shows "LAB - non-production"; `systemd-detect-virt` output matches the hypervisor you used.'
          },
          troubleshooting: {
            scenario: 'An administrator restarts a database "in staging" but the payments team immediately reports a production outage.',
            steps: [
              'Evidence: shell history and `hostnamectl` on the affected host show it was pay-db-prod-01, not the staging server.',
              'Root cause: the admin had several SSH sessions open and typed into the wrong terminal; nothing distinguished production.',
              'Remediation: restore service following the incident process, then add safeguards: coloured or tagged prompts for production, login banners, separate accounts or jump hosts, and change-control approval for restarts.',
              'Validate: production prompts are visibly different and the change process records host names before execution.'
            ]
          },
          mistakes: [
            'Treating snapshots of VMs as backups; they usually live on the same storage and are not a recovery strategy alone.',
            'Assuming containers are lightweight VMs with their own kernel; they share the host kernel.',
            'Making changes directly in production that were never tested in staging.',
            'Not checking the hostname before running a disruptive command.'
          ],
          safety: [
            'Always confirm the host and environment (`hostnamectl`, prompt, banner) before disruptive commands.',
            'Production changes need approval, a maintenance window, a rollback plan and post-change validation.',
            'Writing /etc/motd needs root; it is harmless, but keep a copy if the file already has content.'
          ],
          distro: 'RHEL includes KVM, libvirt and the Cockpit web console (cockpit-machines) for VMs; RHEL 9 deprecated the older virt-manager GUI in favour of Cockpit. Ubuntu also uses KVM/libvirt. Official RHEL, Rocky, AlmaLinux and Ubuntu images exist on all major clouds; RHEL cloud images use cloud-init and default users such as ec2-user (AWS) or cloud-user.',
          challenge: {
            task: 'Your team must decide where to run a new internal wiki: a physical server, a KVM VM on an existing host, or a cloud instance. List one decisive question per option and say which environments (dev/test/prod) you would create.',
            solution: `- **Physical server**: "Does the workload need dedicated hardware (special devices, licensing tied to cores, extreme performance)?" A wiki rarely does.
- **KVM VM**: "Does the existing host have spare capacity and is it backed up and monitored?" Usually the cheapest, fastest option on-premises.
- **Cloud instance**: "Do we need elastic capacity or global access, and are data-residency and cost controls in place?"

Create at least **dev/test** and **prod** VMs (staging if upgrades are risky), built from the same image and automation so changes can be rehearsed before production. Use names that reveal the environment (wiki-test-01, wiki-prod-01).`
          },
          interview: [
            { q: 'What is the difference between a type 1 and a type 2 hypervisor?', a: 'Type 1 runs directly on hardware (KVM, ESXi, Hyper-V) and is used in data centres and clouds; type 2 runs as an application on a desktop OS (VirtualBox, VMware Workstation) and suits labs.', mistake: 'Calling KVM a type 2 because it runs inside Linux.', followUp: 'How do you check whether a CPU supports hardware virtualization?' },
            { q: 'How is a container different from a VM?', a: 'A VM virtualises hardware and runs its own kernel; a container isolates processes and shares the host kernel, so it is lighter and starts faster but must be compatible with that kernel.', mistake: 'Saying containers are just small VMs.', followUp: 'Which container tool does RHEL use? (Podman)' },
            { q: 'Why separate production and non-production environments?', a: 'To test changes safely before they affect real users and data; production changes then follow change control with approval, a window, rollback plan and validation.', mistake: 'Seeing environments only as a bureaucratic burden.', followUp: 'How would you make production terminals visibly different?' }
          ],
          revision: [
            'VM = virtual computer with its own guest OS on a physical host.',
            'Type 1 hypervisors (KVM, ESXi, Hyper-V) run on hardware; type 2 (VirtualBox) on a desktop OS.',
            'Cloud instance = VM from an image, sized by instance type, configured by cloud-init.',
            'Containers share the host kernel; VMs do not.',
            'dev → test → staging → prod, with change control for production.'
          ]
        }
      ]
    }
  ]
};
