// Level 18 - RHCSA and RHCE Preparation.
// Objective lists were checked against redhat.com on 2026-10-09 (EX200 on RHEL 10; EX294 on the most
// recent Red Hat product versions). Objectives change: learners must re-check redhat.com before booking.
const F = '```';

export default {
  id: 'L18', number: 18,
  title: 'RHCSA and RHCE Preparation',
  summary: 'Objective-by-objective preparation for Red Hat EX200 (RHCSA, RHEL 10) and EX294 (RHCE, Ansible Automation Platform), with practical labs, timed practice guidance and revision plans.',
  prerequisites: ['L17'],
  outcomes: [
    'Map every published EX200 and EX294 objective to a command or module you can perform from memory on a lab VM',
    'Complete RHCSA-style tasks (storage, SELinux, networking, users, boot access) so that they survive a reboot',
    'Write, run and debug idempotent Ansible playbooks with ansible-navigator and ansible-playbook',
    'Use roles, Content Collections, Jinja2 templates and Ansible Vault to automate standard RHCSA tasks',
    'Follow a timed practice and revision plan, and re-verify the current objectives on redhat.com before booking an exam'
  ],
  modules: [
    {
      id: 'L18-M1',
      title: 'RHCSA: essential tools, software and scripts',
      summary: 'The EX200 foundations: shell tools, files, links, archives, documentation, RPM and Flatpak software management, and simple Bash scripts.',
      lessons: [
        {
          id: 'L18-M1-T1',
          title: 'Essential tools: shell, files, links, archives and documentation',
          minutes: 50,
          objectives: [
            'Use redirection, pipes and grep with regular expressions to extract information quickly',
            'Create, copy, move and remove files and directories, and create hard and symbolic links correctly',
            'Archive and compress with tar, gzip and bzip2, and set standard ugo/rwx permissions',
            'Find answers offline with man, info and /usr/share/doc during a timed exam'
          ],
          prereqs: [],
          concept: `The RHCSA (exam code **EX200**) is a performance-based exam: you are given live RHEL systems and a list of tasks, and you are graded on the *final state* of those systems, usually after a reboot. As of the Red Hat objective page checked on 2026-10-09, EX200 is based on **Red Hat Enterprise Linux 10**. Objective lists change between releases, so always re-read the official page on redhat.com before booking; nothing in this course guarantees a pass.

The first objective group, *Understand and use essential tools*, is the toolkit every other task depends on:

- **Shell and redirection**: \`>\` overwrites a file with stdout, \`>>\` appends, \`2>\` redirects stderr, \`&>\` redirects both, and \`|\` sends stdout of one command into the next. \`tee\` writes to a file *and* passes data on.
- **grep and regular expressions**: \`grep\` prints lines that match a pattern. \`^\` anchors to the start of a line, \`$\` to the end, \`.\` matches one character, \`*\` repeats the previous item. \`grep -E\` enables extended regex (\`+\`, \`?\`, \`|\`, \`{n}\`).
- **Remote access and identity**: \`ssh user@host\` opens a remote shell; \`su - user\` starts a full login shell as another user; \`sudo\` runs one command with delegated privilege.
- **Archives**: \`tar\` bundles files; \`-z\` uses gzip, \`-j\` uses bzip2, \`-J\` uses xz. \`gzip\`/\`bzip2\` compress single files.
- **Links**: a *hard link* is a second directory entry pointing at the same inode (same file, same data, cannot cross file systems, cannot point at directories). A *symbolic link* is a small file containing a path; it can cross file systems and breaks if the target is removed.
- **Permissions**: each file has an owner (u), group (g) and others (o), each with read (r=4), write (w=2) and execute (x=1). For directories, x means "may enter" and r means "may list".
- **Documentation**: \`man\` pages are split into sections (1 user commands, 5 file formats, 8 admin commands); \`man -k keyword\` searches descriptions; \`info\` holds longer GNU manuals; \`/usr/share/doc/<package>\` often contains example configuration files.

There is no Internet access in the exam. Being fast with \`man\` (search with \`/pattern\`, \`n\` for next) is a real exam skill, not a fallback.

> Exam habit: after each task, verify it with a read-only command (\`ls -l\`, \`stat\`, \`tar -tf\`) before moving on.`,
          internals: `A file's metadata (owner, mode bits, timestamps, link count, block pointers) lives in its **inode**. A directory is a table mapping names to inode numbers, which is why \`ln\` (hard link) simply adds another name and increases the link count shown in column 2 of \`ls -l\`. Data blocks are released only when the link count reaches zero *and* no process holds the file open.

A symbolic link has its own inode whose content is the target path; the kernel resolves it at open time (\`ls -l\` shows \`l\` and \`-> target\`). Permission bits on symlinks are ignored; the target's bits apply.

Redirection is performed by the shell before the command runs: it opens the file and duplicates the descriptor onto fd 1 or fd 2. That is why \`cmd > out 2>&1\` (stderr follows the already-redirected stdout) differs from \`cmd 2>&1 > out\` (stderr still goes to the terminal).

\`tar\` writes a stream of 512-byte headers and file data; the compression flag pipes that stream through gzip/bzip2/xz.`,
          useCases: [
            'Collecting all ERROR lines from an application log into a report file for a ticket',
            'Creating a compressed backup of /etc before a change and restoring a single file from it',
            'Replacing a hard-coded path with a symlink so a versioned install directory can be switched atomically'
          ],
          syntax: 'cmd > file 2>&1 | cmd 2> errors.log | cmd | tee file\ngrep -E \'^(root|admin):\' /etc/passwd\ntar -czf archive.tar.gz dir/ | tar -cjf archive.tar.bz2 dir/ | tar -xf archive.tar.gz -C /dest\nln target hardlink | ln -s target symlink\nchmod 750 dir | chmod u+x,g-w file | chown user:group file\nman -k keyword | man 5 fstab | info coreutils',
          options: [
            ['grep -i / -v / -r / -E', 'Case-insensitive / invert match / recursive / extended regex'],
            ['tar -c / -x / -t', 'Create / extract / list archive contents'],
            ['tar -z / -j / -J', 'Compress with gzip / bzip2 / xz'],
            ['tar -C dir', 'Change to dir before extracting or archiving'],
            ['ln -s', 'Create a symbolic (soft) link instead of a hard link'],
            ['chmod -R', 'Apply mode recursively (use carefully: also sets x on files if you use numeric modes)'],
            ['man -k', 'Search man page names and short descriptions (same as apropos)']
          ],
          examples: [
            {
              title: 'Extract matching lines into a file',
              cmd: 'grep -E \'^[^#].*nologin$\' /etc/passwd > /root/nologin-users.txt; wc -l /root/nologin-users.txt',
              out: '38 /root/nologin-users.txt',
              fields: [['38', 'Number of lines (accounts) whose shell ends in nologin and that are not comments'], ['/root/nologin-users.txt', 'The file now holding the grep output']],
              note: 'The ^ and $ anchors make the match exact; without $ you would also match lines containing nologin elsewhere.'
            },
            {
              title: 'Create and inspect a bzip2 archive of /etc',
              cmd: 'tar -cjf /root/etc-backup.tar.bz2 /etc 2>/dev/null; tar -tjf /root/etc-backup.tar.bz2 | head -3',
              out: 'etc/\netc/mtab\netc/fstab',
              fields: [['etc/', 'tar strips the leading / so extraction is relative to the current directory or -C target'], ['-t', 'Listing proves the archive is valid without extracting it']]
            },
            {
              title: 'Hard link versus symbolic link',
              cmd: 'ln /root/data.txt /root/data.hard; ln -s /root/data.txt /root/data.sym; ls -li /root/data.*',
              out: '1311 -rw-r--r--. 2 root root 12 Oct  9 10:02 /root/data.hard\n1325 lrwxrwxrwx. 1 root root 14 Oct  9 10:02 /root/data.sym -> /root/data.txt\n1311 -rw-r--r--. 2 root root 12 Oct  9 10:02 /root/data.txt',
              fields: [['1311', 'Same inode number: data.hard and data.txt are the same file'], ['2', 'Link count is 2 after the hard link'], ['lrwxrwxrwx', 'Symlink type l; its own permissions are not used'], ['-> /root/data.txt', 'The path stored in the symlink']]
            }
          ],
          walkthrough: [
            'Run `man -k archive` and identify which section documents `tar`; open `man tar` and search with `/--bzip2`.',
            'Use `grep -E` with anchors to extract every user with UID 1000 or above: `awk -F: \'$3>=1000\' /etc/passwd` is an alternative; compare both.',
            'Redirect stdout and stderr separately: `find /etc -name "*.conf" > found.txt 2> errors.txt` as a regular user, then inspect both files.',
            'Create a gzip archive of /var/log/*.log with `tar -czf`, list it with `tar -tzf`, and extract one file into /tmp/restore using `-C`.',
            'Create a hard link and a symlink to the same file, delete the original, and observe which one still shows the data.',
            'Set a directory to 2770 owned by a shared group and explain each digit (SGID 2, owner 7, group 7, other 0).'
          ],
          lab: {
            goal: 'Complete five essential-tools tasks on a RHEL 9/10 (or Rocky/Alma) VM and verify each one.',
            steps: [
              'As root: `grep -E \'^(root|daemon|bin):\' /etc/passwd > /root/core-users.txt`',
              'Find all files owned by user `nobody` and copy them to /root/nobody-files preserving attributes: `mkdir -p /root/nobody-files; find / -user nobody -type f -exec cp -a {} /root/nobody-files/ \\; 2>/dev/null`',
              'Create `/root/logs.tar.gz` containing /var/log/messages* (or /var/log/dnf* if messages is absent): `tar -czf /root/logs.tar.gz /var/log/dnf*`',
              'Create `/srv/shared` owned by group `wheel`, mode 2770: `mkdir /srv/shared; chgrp wheel /srv/shared; chmod 2770 /srv/shared`',
              'Create a symlink `/root/latest-log` pointing to `/var/log/dnf.log` and a hard link `/root/passwd.hard` to `/etc/passwd`',
              'Use `man 5 crontab` to find the field order, and write it into /root/notes.txt'
            ],
            verify: '`cat /root/core-users.txt` shows exactly the 3 lines; `tar -tzf /root/logs.tar.gz` lists files; `ls -ld /srv/shared` shows `drwxrws---. root wheel`; `ls -l /root/latest-log` shows `-> /var/log/dnf.log`; `stat -c %h /etc/passwd` shows 2.'
          },
          troubleshooting: {
            scenario: 'A task asks you to extract an archive into /opt/app, but after `tar -xzf app.tar.gz` the files appear under /root/opt/app instead.',
            steps: [
              'Evidence: `tar -tzf app.tar.gz | head` shows member names like `opt/app/bin/start` (leading slash was stripped at creation).',
              'Hypothesis: tar extracts relative to the current working directory, which was /root.',
              'Fix: remove the misplaced copy after checking it is yours (`rm -rf /root/opt`), then run `tar -xzf app.tar.gz -C /`.',
              'Validate: `ls -l /opt/app/bin/start` and compare ownership/permissions with `tar -tvzf`.'
            ]
          },
          mistakes: [
            'Writing `cmd 2>&1 > file` and expecting stderr in the file: order matters; use `cmd > file 2>&1` or `cmd &> file`.',
            'Using `chmod -R 755` on a tree of files: every file becomes executable. Use `chmod -R u=rwX,go=rX` (capital X only adds x to directories and already-executable files).',
            'Forgetting `-C` when extracting and unpacking into the wrong directory.',
            'Creating a relative symlink from the wrong directory: `ln -s ../data link` is resolved relative to the link location, not your shell location.',
            'Not checking the grader-visible result: a file created in the wrong path or with the wrong owner earns no credit.'
          ],
          safety: [
            'Root is needed for files under /etc and /srv; prefer working as a normal user with sudo outside the exam.',
            '`tar -x` overwrites existing files silently; list the archive with `-t` first and extract into a scratch directory if unsure.',
            '`rm -rf` with a variable or glob is destructive and irreversible; echo the expanded command first.'
          ],
          distro: 'All tools in this lesson behave the same on RHEL 8, 9 and 10. On RHEL 9 and later, `scp` uses the SFTP protocol by default (OpenSSH 9). Debian/Ubuntu ship the same GNU tools; only package names for documentation differ.',
          challenge: {
            task: 'Create `/root/archive/configs.tar.bz2` containing only the files in /etc that end in `.conf` and were modified in the last 30 days, and save the list of included names to `/root/archive/list.txt`. Do it without copying files elsewhere first.',
            solution: `Use find to produce the list, then feed it to tar:

${F}
mkdir -p /root/archive
find /etc -maxdepth 2 -type f -name '*.conf' -mtime -30 > /root/archive/list.txt
tar -cjf /root/archive/configs.tar.bz2 -T /root/archive/list.txt
tar -tjf /root/archive/configs.tar.bz2 | wc -l
wc -l < /root/archive/list.txt
${F}

**Reasoning:** \`find -mtime -30\` selects files changed in the last 30 days; \`-T file\` tells tar to read member names from a file, so the list and archive always agree. Comparing the two line counts validates the result. Remove \`-maxdepth\` if the task wants the whole tree.`
          },
          interview: [
            { q: 'What is the difference between a hard link and a symbolic link?', a: 'A hard link is another directory entry for the same inode, so both names are equal and data survives until the last link is removed; it cannot span file systems or point to directories. A symbolic link is a separate inode containing a path; it can span file systems and point to directories, but breaks if the target is moved or deleted.', mistake: 'Saying a hard link is a "copy" of the file.', followUp: 'How do you find every hard link to a given file? (`find / -samefile file` or `find / -inum N -xdev`.)' },
            { q: 'Explain `cmd > out.log 2>&1` versus `cmd 2>&1 > out.log`.', a: 'Redirections are processed left to right. In the first, stdout is pointed at out.log, then stderr is duplicated from stdout so both go to the file. In the second, stderr is duplicated from the terminal before stdout is redirected, so errors still appear on screen.', mistake: 'Claiming the two are equivalent.', followUp: 'What does `&>>` do in Bash?' },
            { q: 'In the exam you cannot remember the fstab field order. What do you do?', a: 'Use offline documentation: `man 5 fstab`, or look for examples with `man -k fstab` and under /usr/share/doc. Searching inside man with `/` is fast.', mistake: 'Guessing and moving on without verification.', followUp: 'Which man section holds file formats, and which holds admin commands?' }
          ],
          revision: [
            '`>` overwrite, `>>` append, `2>` stderr, `&>` both; order matters for `2>&1`.',
            '`grep -E` for extended regex; `^` start, `$` end, `-v` invert, `-i` ignore case.',
            '`tar -c/-x/-t` with `-z` gzip, `-j` bzip2, `-J` xz; use `-C` to choose the destination.',
            'Hard link = same inode (link count rises); symlink = path, may dangle.',
            'Numeric modes: r4 w2 x1; directory x = enter, r = list; capital X in symbolic mode is safer recursively.',
            '`man -k`, `man 5 <file>`, `info`, `/usr/share/doc` are your exam references.'
          ]
        },
        {
          id: 'L18-M1-T2',
          title: 'Software with RPM and Flatpak, and simple shell scripts',
          minutes: 55,
          objectives: [
            'Configure access to RPM repositories and install, update, query and remove packages with dnf and rpm',
            'Add a Flatpak remote and install, list and remove Flatpak applications',
            'Write Bash scripts using conditionals, test/[ ], loops, positional parameters and command substitution',
            'Debug a failing script with bash -x and exit codes'
          ],
          prereqs: ['L18-M1-T1'],
          concept: `### Managing RPM software

An **RPM package** is an archive of files plus metadata (name, version, release, architecture, dependencies, scriptlets). A **repository** is a directory of RPMs plus metadata that \`dnf\` downloads to resolve dependencies. On RHEL, repositories come from the Red Hat CDN (after system registration), a Satellite server, or a local/remote mirror defined in a \`.repo\` file under \`/etc/yum.repos.d/\`.

A minimal repo file:

${F}
[baseos-local]
name=BaseOS from exam server
baseurl=http://content.example.com/rhel10/BaseOS
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
${F}

If the task gives no GPG key, \`gpgcheck=0\` is sometimes used in labs; in production keep signature checking on. \`dnf repolist\` proves the repo is reachable.

\`dnf\` handles dependencies (\`install\`, \`remove\`, \`update\`, \`search\`, \`provides\`, \`info\`, \`history\`). \`rpm\` queries the local database (\`rpm -qa\`, \`-qi\`, \`-ql\` files, \`-qf\` which package owns a file, \`-qc\` config files). Install a local RPM with \`dnf install ./file.rpm\` so dependencies are still resolved.

### Flatpak

**Flatpak** delivers desktop applications as sandboxed bundles that carry their own runtime, independent of system RPMs. A **remote** is a Flatpak repository. EX200 objectives on RHEL 10 include configuring Flatpak repositories and installing/removing Flatpaks:

${F}
flatpak remote-add --if-not-exists <name> <url-to-.flatpakrepo>
flatpak remote-ls <name>
flatpak install <name> <application-id>
flatpak list --app
flatpak uninstall <application-id>
${F}

Run as root, Flatpaks install system-wide (\`--system\` is the default for root); \`--user\` installs into the user's home.

### Simple shell scripts

A script is a text file starting with \`#!/bin/bash\`, made executable with \`chmod +x\`. Key building blocks:

- **Positional parameters**: \`$1\`, \`$2\` … ; \`$#\` count; \`"$@"\` all, quoted individually; \`$?\` exit status of the last command (0 = success).
- **Conditionals**: \`if [ -f "$1" ]; then … elif …; else …; fi\`. \`[ ]\` is the \`test\` command: \`-f\` file, \`-d\` directory, \`-z\` empty string, \`-eq/-ne/-lt/-gt\` integers, \`=\`/\`!=\` strings.
- **Loops**: \`for u in $(cat users.txt); do …; done\`, \`while read -r line; do …; done < file\`.
- **Command substitution**: \`today=$(date +%F)\` stores command output in a variable.

Always quote variables (\`"$1"\`) so spaces and empty values do not break tests.`,
          internals: `\`dnf\` (DNF 4 on RHEL 8, 9 and 10) reads \`/etc/dnf/dnf.conf\` and every \`*.repo\` file, downloads repository metadata (repomd.xml, primary, filelists) into \`/var/cache/dnf\`, uses the libsolv solver to compute a transaction, verifies GPG signatures, then hands packages to the RPM library, which writes files, runs scriptlets and records the result in the RPM database (\`/var/lib/rpm\`, SQLite format on RHEL 9+). \`dnf history\` is stored separately so transactions can be undone.

Flatpak stores system installations in \`/var/lib/flatpak\` as OSTree repositories; applications run inside bubblewrap sandboxes with portals for controlled access. Remotes are listed in \`/var/lib/flatpak/repo/config\`.

When Bash runs a script it forks, \`execve()\`s the interpreter named in the shebang, and each command returns an 8-bit exit code that \`if\`, \`&&\` and \`||\` test.`,
          useCases: [
            'Pointing a disconnected server at an internal mirror of BaseOS and AppStream',
            'Delivering a desktop tool to RHEL workstations as a Flatpak without changing system libraries',
            'A short script that creates users from a list and reports failures with non-zero exit codes'
          ],
          syntax: 'dnf repolist | dnf install pkg | dnf remove pkg | dnf provides /path | dnf history\ndnf config-manager --add-repo URL\nrpm -qa | rpm -qi pkg | rpm -ql pkg | rpm -qf /path | rpm -qc pkg\nflatpak remote-add --if-not-exists NAME URL | flatpak install NAME APPID | flatpak list | flatpak uninstall APPID\nbash -n script.sh | bash -x script.sh',
          options: [
            ['dnf provides', 'Find which package supplies a file or command (e.g. dnf provides semanage)'],
            ['dnf config-manager --add-repo', 'Create a .repo file from a URL (needs dnf-plugins-core)'],
            ['rpm -qf', 'Which installed package owns this file'],
            ['rpm -qc / -qd', 'List configuration / documentation files of an installed package'],
            ['flatpak remote-ls', 'List applications available from a remote'],
            ['flatpak --user', 'Install into the current user instead of system-wide'],
            ['bash -x', 'Trace each command as it executes (debugging)']
          ],
          examples: [
            {
              title: 'Verify repositories after adding a repo file',
              cmd: 'dnf repolist',
              out: 'repo id                   repo name\nappstream-local           AppStream from exam server\nbaseos-local              BaseOS from exam server',
              fields: [['repo id', 'The [section] name inside the .repo file'], ['repo name', 'The name= value']],
              note: 'If a repo is missing, check enabled=1 and the baseurl with `curl -I <baseurl>/repodata/repomd.xml`.'
            },
            {
              title: 'Which package owns a file',
              cmd: 'rpm -qf /etc/chrony.conf',
              out: 'chrony-4.5-3.el10.x86_64',
              fields: [['chrony', 'Package name'], ['4.5-3', 'Version-release (representative)'], ['el10', 'Built for RHEL 10']]
            },
            {
              title: 'A script using arguments, test and a loop',
              cmd: 'cat /usr/local/bin/mkusers; /usr/local/bin/mkusers /root/users.txt; echo $?',
              out: '#!/bin/bash\nif [ $# -ne 1 ] || [ ! -f "$1" ]; then\n  echo "Usage: $0 <file>" >&2; exit 2\nfi\nfor u in $(cat "$1"); do\n  id "$u" &>/dev/null || useradd "$u"\ndone\n0',
              fields: [['$#', 'Number of arguments; must be exactly 1'], ['[ ! -f "$1" ]', 'Fails if the argument is not a regular file'], ['id ... || useradd', 'Only create the user if it does not exist (idempotent)'], ['0', 'Exit status printed by echo $?']]
            }
          ],
          walkthrough: [
            'Create `/etc/yum.repos.d/local.repo` with BaseOS and AppStream sections (use a mounted ISO: `mount -o loop rhel.iso /mnt` and `baseurl=file:///mnt/BaseOS`).',
            'Run `dnf clean all; dnf repolist` and install `tree` with `dnf install -y tree`.',
            'Query: `rpm -qi tree`, `rpm -ql tree`, `rpm -qf $(which tree)`.',
            'Add a Flatpak remote you are given (or Flathub on a lab workstation) and run `flatpak remote-ls`.',
            'Install one application, confirm with `flatpak list --app`, then uninstall it.',
            'Write a script that prints "big" or "small" depending on whether the size of $1 exceeds 1 MiB, using `$(stat -c %s "$1")`.'
          ],
          lab: {
            goal: 'Configure local repositories, manage RPM and Flatpak software, and deliver a working script.',
            steps: [
              'Mount the RHEL DVD/ISO at /mnt (`mount -o loop,ro /path/rhel.iso /mnt`) and create /etc/yum.repos.d/dvd.repo with [dvd-baseos] baseurl=file:///mnt/BaseOS and [dvd-appstream] baseurl=file:///mnt/AppStream, gpgcheck=1, gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release.',
              '`dnf repolist` then `dnf install -y httpd`; record `dnf history | head -3`.',
              'Remove the package with `dnf remove -y httpd` and confirm `rpm -q httpd` reports not installed.',
              'If the VM has a GUI and network: `flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo`; `flatpak install -y flathub org.gnome.Calculator`; `flatpak list --app`.',
              'Create `/usr/local/bin/svccheck` that takes service names as arguments and prints `NAME: active|inactive` for each using `systemctl is-active`; exit 1 if any is inactive.',
              'Run `bash -n /usr/local/bin/svccheck` (syntax check) then `svccheck sshd crond chronyd`.'
            ],
            verify: '`dnf repolist` shows both repos; `rpm -q httpd` says not installed after removal; `flatpak list --app` shows the app (then empty after uninstall); `svccheck sshd nosuch; echo $?` prints `sshd: active`, `nosuch: inactive` and `1`.'
          },
          troubleshooting: {
            scenario: '`dnf install vsftpd` fails with "Error: Failed to download metadata for repo \'appstream-local\': Cannot download repomd.xml".',
            steps: [
              'Evidence: `cat /etc/yum.repos.d/*.repo` and test the URL: `curl -I http://content.example.com/rhel10/AppStream/repodata/repomd.xml`.',
              'Hypothesis: baseurl points one directory too high or too low (repodata/ must be directly under baseurl), or a typo in the host name.',
              'Fix: correct baseurl to the directory that contains `repodata/`, then `dnf clean all`.',
              'Validate: `dnf repolist` lists the repo and `dnf install -y vsftpd` succeeds.'
            ]
          },
          mistakes: [
            'Setting baseurl to the ISO root instead of the BaseOS or AppStream directory that contains repodata/.',
            'Installing a local RPM with `rpm -ivh` and hitting dependency failures; `dnf install ./pkg.rpm` resolves them.',
            'Forgetting to make the script executable or to include the shebang, so it runs with the wrong shell or not at all.',
            'Unquoted variables in tests (`[ -f $1 ]`) that break when the argument is empty or contains spaces.',
            'Running `flatpak install` as a normal user and expecting a system-wide installation.'
          ],
          safety: [
            'Package installation and repo changes need root; review `dnf` transaction summaries before confirming.',
            '`gpgcheck=0` disables signature verification; use it only in isolated labs and say so in documentation.',
            '`dnf history undo N` can roll back a transaction, but check what else it will remove first.'
          ],
          distro: 'RHEL 8, 9 and 10 use DNF 4 (`yum` is an alias). Fedora 41+ moved to DNF 5, whose syntax differs slightly (e.g. `dnf config-manager addrepo`). RHEL 10 objectives add Flatpak; Debian/Ubuntu use apt/dpkg and also support Flatpak. Registration on RHEL uses `subscription-manager register` (RHEL 10 also offers `rhc connect`).',
          challenge: {
            task: 'Write `/root/bin/pkgreport.sh` that takes one or more package names. For each, print `PKG installed VERSION` or `PKG missing`, and exit with the number of missing packages (0 if all present).',
            solution: `${F}
#!/bin/bash
missing=0
if [ $# -eq 0 ]; then
  echo "Usage: $0 pkg [pkg...]" >&2
  exit 255
fi
for p in "$@"; do
  if v=$(rpm -q --qf '%{VERSION}-%{RELEASE}' "$p" 2>/dev/null); then
    echo "$p installed $v"
  else
    echo "$p missing"
    missing=$((missing + 1))
  fi
done
exit $missing
${F}

\`chmod +x /root/bin/pkgreport.sh\`, then test with \`/root/bin/pkgreport.sh bash nosuchpkg; echo $?\` (expect 1).

**Reasoning:** \`rpm -q\` returns non-zero for missing packages, so it works directly as the \`if\` condition; command substitution captures the version. \`"$@"\` preserves each argument. Exit codes above 255 wrap, which is acceptable for this scale.`
          },
          interview: [
            { q: 'How do you find which package provides a missing command such as `semanage`?', a: 'Run `dnf provides semanage` (or `dnf provides */semanage`); on RHEL it returns policycoreutils-python-utils. For an already-installed file use `rpm -qf /path`.', mistake: 'Searching the Internet or guessing package names.', followUp: 'How do you list the configuration files a package installed?' },
            { q: 'What is the difference between an RPM and a Flatpak?', a: 'An RPM installs files into the shared system tree and depends on system libraries resolved by dnf. A Flatpak bundles an application with a runtime, installs into /var/lib/flatpak or ~/.local/share/flatpak, and runs sandboxed, so it does not alter system libraries.', mistake: 'Treating Flatpak as a replacement for server packages.', followUp: 'Where does a system-wide Flatpak installation live?' },
            { q: 'What does `$?` contain and why does it matter in scripts?', a: 'The exit status of the last command: 0 means success, non-zero means failure. Scripts use it (directly or via `if cmd; then`) to decide what to do next and should return meaningful codes themselves.', mistake: 'Believing non-zero always means a crash.', followUp: 'What is the difference between `$@` and `$*` when quoted?' }
          ],
          revision: [
            'Repo file: [id], name, baseurl (dir containing repodata/), enabled=1, gpgcheck, gpgkey.',
            '`dnf provides`, `rpm -qf`, `rpm -ql`, `rpm -qc` answer most package questions.',
            'Flatpak: `remote-add --if-not-exists`, `remote-ls`, `install`, `list --app`, `uninstall`.',
            'Scripts: shebang, `chmod +x`, quote `"$1"`, `[ ]` is `test`, `$(cmd)` captures output.',
            'Debug with `bash -n` (syntax) and `bash -x` (trace).'
          ]
        }
      ]
    },
    {
      id: 'L18-M2',
      title: 'RHCSA: operating systems and storage',
      summary: 'Operate running systems (boot targets, boot interruption, processes, tuning, journals) and configure local storage, LVM, swap, file systems, NFS and autofs persistently.',
      lessons: [
        {
          id: 'L18-M2-T1',
          title: 'Operating running systems: targets, boot access, processes, tuning and journals',
          minutes: 55,
          objectives: [
            'Boot, reboot and shut down cleanly, and boot into a chosen systemd target manually',
            'Interrupt the boot process to regain root access and restore SELinux labels afterwards',
            'Identify CPU- and memory-intensive processes, adjust scheduling priority and kill processes',
            'Apply tuned profiles, locate logs and journals, and make the journal persistent'
          ],
          prereqs: ['L18-M1-T1'],
          concept: `The EX200 objective group *Operate running systems* tests whether you can keep a RHEL system under control at runtime and recover access when locked out.

### Boot targets

A **systemd target** is a named group of units representing a system state. \`multi-user.target\` is a text-mode server; \`graphical.target\` adds a display manager; \`rescue.target\` is single-user with local file systems mounted; \`emergency.target\` mounts only the root file system read-only. Check and change the persistent default with \`systemctl get-default\` / \`systemctl set-default multi-user.target\`. Switch now with \`systemctl isolate multi-user.target\`. For a one-off boot into a target, press \`e\` at the GRUB menu and append \`systemd.unit=rescue.target\` to the line beginning with \`linux\`, then press **Ctrl+x**.

### Interrupting boot to gain access (root password reset)

A common method on RHEL 9 and 10 is to append \`rd.break\` to the kernel line. The initramfs stops before switching to the real root, which is mounted read-only at \`/sysroot\`:

${F}
mount -o remount,rw /sysroot
chroot /sysroot
passwd root
touch /.autorelabel      # shadow file was written without an SELinux label
exit; exit
${F}

The autorelabel causes a full relabel on next boot (slow on large systems). Red Hat documentation also describes using installation media in rescue mode; practise the method on the exact RHEL version you will be tested on, because console behaviour has changed between releases.

### Processes and scheduling

\`top\` (sort with **P** CPU, **M** memory) and \`ps aux --sort=-%cpu | head\` identify hogs. \`kill PID\` sends SIGTERM (15, polite), \`kill -9\` sends SIGKILL (cannot be caught; last resort). \`pkill -u user\` and \`killall name\` target by attribute. The **nice value** ranges from -20 (highest priority) to 19 (lowest); \`nice -n 10 cmd\` starts a process with it, \`renice -n 5 -p PID\` changes it. Only root may lower a nice value.

### Tuning profiles

The **tuned** daemon applies sets of kernel and device settings. \`tuned-adm list\`, \`tuned-adm active\`, \`tuned-adm recommend\`, \`tuned-adm profile virtual-guest\`. The service must be enabled to persist.

### Logs and journals

\`systemd-journald\` collects kernel, service and syslog messages. \`journalctl -u sshd\`, \`-p err\`, \`-b\` (this boot), \`-b -1\` (previous boot), \`--since "1 hour ago"\`, \`-f\` follow. \`rsyslog\` still writes \`/var/log/messages\` and \`/var/log/secure\`. By default (\`Storage=auto\`) the journal is persistent only if \`/var/log/journal\` exists; otherwise it lives in \`/run/log/journal\` and is lost at reboot.

### Network service status and secure file transfer

\`systemctl status sshd\`, \`ss -tlnp\` and \`systemctl is-enabled\` confirm a network service. Copy files securely with \`scp\`, \`sftp\` or \`rsync -av -e ssh\`.`,
          internals: `GRUB2 loads the kernel and initramfs; dracut's initramfs runs a small systemd that finds the root device, mounts it at /sysroot and calls \`switch_root\`. \`rd.break\` stops just before that switch, giving a shell in the initramfs. Files written there get no SELinux context because no policy is loaded, so \`/etc/shadow\` would be unreadable by confined services; \`/.autorelabel\` triggers \`selinux-autorelabel\` on the next boot.

The scheduler (EEVDF in newer kernels, CFS before) weights runnable tasks by nice value; each nice step is roughly a 10% CPU-share change relative to competing tasks.

journald stores binary, indexed, field-structured entries (\`_SYSTEMD_UNIT\`, \`PRIORITY\`, \`_PID\`) and rotates them according to \`SystemMaxUse\` and related settings. tuned applies profile plugins (sysctl, cpu governor, disk elevator, etc.) defined under /usr/lib/tuned/<profile>/tuned.conf.`,
          useCases: [
            'Recovering a server whose root password was lost after staff turnover, with change approval',
            'Lowering the priority of a batch report so interactive users are not affected',
            'Making the journal persistent so a crash during the night can be investigated the next morning'
          ],
          syntax: 'systemctl get-default | systemctl set-default TARGET | systemctl isolate TARGET\nsystemctl reboot | systemctl poweroff\nps aux --sort=-%cpu | top | kill [-SIGNAL] PID | pkill PATTERN\nnice -n N cmd | renice -n N -p PID\ntuned-adm list | tuned-adm active | tuned-adm recommend | tuned-adm profile NAME\njournalctl -u UNIT -p err -b -1 --since TIME\nscp file user@host:/path | rsync -av -e ssh src/ user@host:/dst/',
          options: [
            ['systemd.unit=rescue.target', 'Kernel argument (GRUB edit) to boot once into rescue mode'],
            ['rd.break', 'Stop in the initramfs before switching to the real root'],
            ['ps -o pid,ni,pcpu,comm', 'Custom ps columns including the nice value'],
            ['journalctl -b -1', 'Messages from the previous boot (needs persistent journal)'],
            ['journalctl -p err', 'Show priority err and more severe'],
            ['tuned-adm recommend', 'Profile tuned suggests for this hardware/virtualisation'],
            ['Storage=persistent', 'journald setting that keeps logs in /var/log/journal']
          ],
          examples: [
            {
              title: 'Find the top CPU consumer and its nice value',
              cmd: 'ps -eo pid,ni,pcpu,pmem,comm --sort=-pcpu | head -4',
              out: '    PID  NI %CPU %MEM COMMAND\n   4211   0 98.7  0.0 dd\n   1032   0  1.2  2.1 firewalld\n    887   0  0.3  0.5 NetworkManager',
              fields: [['PID 4211', 'Process to act on'], ['NI 0', 'Default nice value'], ['%CPU 98.7', 'Using almost one full CPU']],
              note: 'Decide: renice it (`renice -n 19 -p 4211`) if the work is legitimate, or terminate with `kill 4211` if it is a runaway.'
            },
            {
              title: 'Make the journal persistent with a drop-in',
              cmd: 'mkdir -p /etc/systemd/journald.conf.d; printf \'[Journal]\\nStorage=persistent\\n\' > /etc/systemd/journald.conf.d/persist.conf; systemctl restart systemd-journald; journalctl --list-boots | tail -2',
              out: ' -1 5c0f... Thu 2026-10-08 21:10:03 UTC Thu 2026-10-08 23:59:41 UTC\n  0 9a7e... Fri 2026-10-09 08:01:12 UTC Fri 2026-10-09 10:22:05 UTC',
              fields: [['-1', 'Previous boot is listed, so it was retained'], ['0', 'Current boot']],
              note: 'Creating /var/log/journal with Storage=auto also works. After the change you only see older boots once a reboot has happened.'
            },
            {
              title: 'Apply a tuning profile',
              cmd: 'tuned-adm recommend; tuned-adm profile virtual-guest; tuned-adm active',
              out: 'virtual-guest\nCurrent active profile: virtual-guest',
              fields: [['virtual-guest', 'Profile for VMs (based on throughput-performance)']]
            }
          ],
          walkthrough: [
            'Run `systemctl get-default`, set `multi-user.target`, reboot and confirm a text login; set it back if needed.',
            'Reboot, press `e` at GRUB, append `systemd.unit=rescue.target`, Ctrl+x; log in with the root password, then `systemctl default` to continue.',
            'Practise the `rd.break` root-password reset on a snapshot of your VM, including `touch /.autorelabel`.',
            'Start `dd if=/dev/zero of=/dev/null &`, find it with `top`, renice it to 15, then kill it.',
            'Run `tuned-adm recommend` and apply the recommended profile; confirm tuned is enabled.',
            'Make the journal persistent, reboot, and read the previous boot with `journalctl -b -1 -p warning`.'
          ],
          lab: {
            goal: 'Practise boot control, process control, tuning and persistent logging on a disposable RHEL 9/10 VM.',
            steps: [
              'Take a VM snapshot first. Reset the root password using `rd.break` and the remount/chroot/passwd/autorelabel sequence.',
              'After the relabel reboot, log in as root with the new password and run `ls -Z /etc/shadow` (expect `shadow_t`).',
              'Set the default target to multi-user: `systemctl set-default multi-user.target`.',
              'Start two CPU hogs: `nice -n 5 sha1sum /dev/zero &` and `sha1sum /dev/zero &`; compare their %CPU in top, then `pkill sha1sum`.',
              'Enable tuned and set the recommended profile: `systemctl enable --now tuned; tuned-adm profile $(tuned-adm recommend)`.',
              'Create the journald drop-in with `Storage=persistent`, restart journald, reboot and run `journalctl --list-boots`.'
            ],
            verify: '`systemctl get-default` prints multi-user.target; `tuned-adm active` shows the profile; `journalctl --list-boots` lists at least two boots; `pgrep sha1sum` returns nothing.'
          },
          troubleshooting: {
            scenario: 'After resetting the root password via rd.break, root can log in at the console but sshd and several services fail, and `ausearch -m avc` shows denials on /etc/shadow.',
            steps: [
              'Evidence: `ls -Z /etc/shadow` shows `unlabeled_t` instead of `shadow_t`.',
              'Hypothesis: the file was rewritten in the initramfs without a policy loaded and /.autorelabel was not created.',
              'Fix: `restorecon -v /etc/shadow` (or `touch /.autorelabel` and reboot for a full relabel).',
              'Validate: `ls -Z /etc/shadow` shows `system_u:object_r:shadow_t:s0` and services authenticate normally.'
            ]
          },
          mistakes: [
            'Forgetting `touch /.autorelabel` after an rd.break password reset, leaving /etc/shadow mislabelled.',
            'Using `kill -9` first: it gives the process no chance to clean up (temp files, locks, child processes).',
            'Confusing nice direction: a higher nice value means *lower* priority.',
            'Assuming the journal is persistent: without /var/log/journal or Storage=persistent, `journalctl -b -1` shows nothing.',
            'Running `systemctl isolate` and expecting it to persist after reboot; use set-default for that.'
          ],
          safety: [
            'Interrupting boot and resetting passwords requires console access and, in production, a change ticket; snapshot VMs before practising.',
            'Killing processes can lose data; identify the owner and purpose (`ps -o user,cmd -p PID`) first.',
            'A full SELinux relabel can take a long time on large file systems; schedule it.'
          ],
          distro: 'RHEL 8, 9 and 10 all support rd.break; Red Hat has also documented alternative recovery methods, and console behaviour can differ by minor release, so practise on the target version. On RHEL 10, default configuration files for some systemd components may live under /usr/lib; prefer drop-ins in /etc/systemd/*.conf.d/. Debian/Ubuntu commonly use `init=/bin/bash` style recovery and AppArmor instead of SELinux.',
          challenge: {
            task: 'A colleague says "the journal only shows today". Prove whether logs are persistent, make them persistent without editing any vendor file, limit journal disk use to 500 MiB, and show the previous boot\'s error messages after a reboot.',
            solution: `${F}
journalctl --list-boots            # only boot 0 => volatile
ls -d /run/log/journal /var/log/journal
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/50-persist.conf <<'EOF'
[Journal]
Storage=persistent
SystemMaxUse=500M
EOF
systemctl restart systemd-journald
journalctl --disk-usage
systemctl reboot
journalctl -b -1 -p err
${F}

**Reasoning:** a drop-in survives package updates and is easy to roll back (delete the file). \`Storage=persistent\` creates /var/log/journal; \`SystemMaxUse\` caps usage. Only after a reboot does \`-b -1\` have data.`
          },
          interview: [
            { q: 'How do you reset a forgotten root password on RHEL 9?', a: 'At GRUB press e, append rd.break to the linux line, Ctrl+x. In the initramfs shell: mount -o remount,rw /sysroot; chroot /sysroot; passwd root; touch /.autorelabel; exit twice. The relabel fixes the SELinux context of /etc/shadow. In production this needs console access and change approval.', mistake: 'Omitting the autorelabel step or forgetting to remount /sysroot read-write.', followUp: 'What could you do instead of a full relabel to save time?' },
            { q: 'What does a nice value of 19 mean?', a: 'The lowest scheduling priority: the process gets CPU only when higher-priority work does not need it. Values run from -20 (highest) to 19; only root can decrease a nice value.', mistake: 'Saying 19 is the highest priority.', followUp: 'How do you change the nice value of a running process?' },
            { q: 'Why might `journalctl -b -1` return "Specified boot ID has no entries"?', a: 'The journal is volatile (stored in /run/log/journal) so previous boots were discarded, or the system has not rebooted since persistence was enabled.', mistake: 'Assuming journald is broken.', followUp: 'How do you enable persistence without editing vendor files?' }
          ],
          revision: [
            '`systemctl set-default` persists; `isolate` is immediate only; GRUB `systemd.unit=` is one boot only.',
            'rd.break: remount,rw /sysroot → chroot → passwd → touch /.autorelabel → exit, exit.',
            'nice -20 highest, 19 lowest; `renice -n N -p PID`; SIGTERM before SIGKILL.',
            '`tuned-adm recommend|profile|active`; keep tuned enabled.',
            'Persistent journal: /var/log/journal or Storage=persistent (drop-in), then `journalctl -b -1`.'
          ]
        },
        {
          id: 'L18-M2-T2',
          title: 'Local storage and file systems: GPT, LVM, swap, XFS/ext4/VFAT, NFS and autofs',
          minutes: 65,
          objectives: [
            'Create GPT partitions, physical volumes, volume groups and logical volumes non-destructively',
            'Create VFAT, ext4 and XFS file systems and mount them persistently by UUID or label',
            'Add swap and extend a logical volume and its file system online',
            'Mount NFS exports manually and on demand with autofs, and diagnose permission problems'
          ],
          prereqs: ['L18-M1-T1'],
          concept: `Storage tasks carry heavy weight in EX200 and are graded after a reboot, so **persistence** and **not destroying existing data** are everything.

### Partitions

A **partition table** describes regions of a disk. **GPT** supports large disks and up to 128 partitions; MBR is legacy. Create partitions with \`parted\`, \`fdisk\` or \`gdisk\`. Example with parted:

${F}
parted /dev/vdb mklabel gpt          # ONLY on an empty disk
parted /dev/vdb mkpart data xfs 1MiB 1025MiB
parted /dev/vdb set 1 lvm on         # when the partition will be an LVM PV
udevadm settle; lsblk /dev/vdb
${F}

Add new partitions in free space only; never relabel a disk that already holds data.

### LVM

**LVM** layers storage: a **physical volume (PV)** is a partition or disk initialised for LVM; a **volume group (VG)** pools PVs and is divided into **physical extents** (default 4 MiB; \`vgcreate -s 16M\` changes it); a **logical volume (LV)** is a block device carved from extents. \`lvcreate -n data -L 500M vg01\` sizes in bytes; \`-l 50\` sizes in extents (tasks often specify extents). Extend with \`lvextend -r -L +200M /dev/vg01/data\`; \`-r\` grows the file system too.

### File systems

\`mkfs.xfs\`, \`mkfs.ext4\`, \`mkfs.vfat\`. XFS can grow online (\`xfs_growfs\`) but **cannot shrink**; ext4 can grow online and shrink offline. Labels: \`-L name\` for XFS/ext4, \`-n NAME\` for VFAT.

### Persistent mounts

Device names (\`/dev/vdb1\`) can change; mount by **UUID** or **LABEL**. Get them with \`blkid\` or \`lsblk -f\`. An \`/etc/fstab\` line has six fields: device, mount point, type, options, dump, fsck order.

${F}
UUID=1b2c...  /data   xfs   defaults  0 0
LABEL=backup  /backup ext4  defaults  0 0
UUID=9f8e...  none    swap  defaults  0 0
${F}

After editing, run \`systemctl daemon-reload\` then \`mount -a\` (and \`swapon -a\` for swap) and fix any error *before* rebooting; a broken fstab can drop the system into emergency mode.

### NFS and autofs

**NFS** shares directories over the network. Manual: \`mount -t nfs server:/export /mnt/x\`; persistent fstab entries should include \`_netdev\`. **autofs** mounts on access and unmounts when idle. The master map (\`/etc/auto.master\` or a file in \`/etc/auto.master.d/*.autofs\`) maps a base directory to a map file:

${F}
# /etc/auto.master.d/shares.autofs
/shares  /etc/auto.shares
# /etc/auto.shares  (indirect map)
work  -rw,sync  nfs.example.com:/exports/work
*     -rw,sync  nfs.example.com:/home/&
${F}

\`*\` and \`&\` form a wildcard map (e.g. home directories). A **direct map** uses \`/-\` in the master map with absolute paths in the map file. Then \`systemctl enable --now autofs\`.

### Diagnosing permission problems

When access fails, check in order: mode bits and ownership (\`ls -ld\` along the whole path, \`namei -l /path\`), ACLs (\`getfacl\`), SELinux context (\`ls -Z\`, \`ausearch -m avc\`), and for NFS the export options (root squash, uid mapping).`,
          internals: `The kernel exposes disks as block devices; udev creates /dev nodes and /dev/disk/by-uuid and by-label symlinks from metadata read by blkid. LVM metadata (PV/VG/LV layout) is stored on each PV and backed up in /etc/lvm/backup; device-mapper presents each LV as /dev/dm-N with friendly links /dev/vg/lv and /dev/mapper/vg-lv.

At boot, systemd-fstab-generator converts each fstab line into a .mount (or .swap) unit; \`systemctl daemon-reload\` reruns generators after you edit fstab. \`nofail\` lets boot continue if a device is missing; \`_netdev\` orders network mounts after the network is online.

autofs runs the automount daemon, which registers autofs kernel mount points; first access to a key triggers a mount, and the timeout (default 300 s on RHEL, configurable) unmounts idle shares. NFS clients on RHEL 9/10 negotiate NFSv4.2 by default and fall back to older versions if the server requires it.`,
          useCases: [
            'Adding a new data disk as LVM so it can grow later without downtime',
            'Mounting user home directories from NFS on demand with a wildcard autofs map',
            'Adding swap space on a memory-constrained VM without repartitioning the root disk'
          ],
          syntax: 'lsblk -f | blkid | parted DISK print | parted DISK mkpart NAME FSTYPE START END\npvcreate DEV | vgcreate [-s SIZE] VG DEV | lvcreate -n LV -L SIZE|-l EXTENTS VG\nlvextend -r -L +SIZE /dev/VG/LV | vgextend VG DEV\nmkfs.xfs [-L label] DEV | mkfs.ext4 DEV | mkfs.vfat DEV | mkswap DEV | swapon -a\nmount -a | findmnt --verify | systemctl daemon-reload\nmount -t nfs server:/export /mnt | showmount -e server\nsystemctl enable --now autofs',
          options: [
            ['vgcreate -s 16M', 'Set the physical extent size for the VG'],
            ['lvcreate -l 60', 'Create an LV of 60 extents (size = 60 x PE size)'],
            ['lvextend -r', 'Resize the file system together with the LV'],
            ['findmnt --verify', 'Check /etc/fstab syntax and devices before rebooting'],
            ['_netdev', 'fstab option for network file systems'],
            ['nofail', 'Do not fail boot if this device is absent'],
            ['swapon --show', 'List active swap devices and sizes']
          ],
          examples: [
            {
              title: 'Inspect block devices and file systems',
              cmd: 'lsblk -f /dev/vdb',
              out: 'NAME           FSTYPE      LABEL  UUID                                   MOUNTPOINTS\nvdb\n├─vdb1         LVM2_member        Zx3k1p-...\n│ └─vg01-data  xfs         data   1b2c3d4e-0f1a-4b2c-9d8e-7f6a5b4c3d2e   /data\n└─vdb2         swap               9f8e7d6c-...                           [SWAP]',
              fields: [['LVM2_member', 'vdb1 is an LVM physical volume'], ['vg01-data', 'LV "data" in VG "vg01" (device-mapper name)'], ['UUID', 'Use this in /etc/fstab'], ['[SWAP]', 'vdb2 is active swap']]
            },
            {
              title: 'Extend an LV and its XFS file system online',
              cmd: 'lvextend -r -L +300M /dev/vg01/data',
              out: '  Size of logical volume vg01/data changed from 500.00 MiB (125 extents) to 800.00 MiB (200 extents).\n  Logical volume vg01/data successfully resized.\nmeta-data=/dev/mapper/vg01-data isize=512 agcount=4, agsize=32000 blks\ndata blocks changed from 128000 to 204800',
              fields: [['125 -> 200 extents', '4 MiB extents: +75 extents = +300 MiB'], ['data blocks changed', 'xfs_growfs ran because of -r']]
            },
            {
              title: 'Test an autofs indirect map',
              cmd: 'ls /shares; ls /shares/work; mount | grep /shares/work',
              out: '\nreport.txt  plans\nnfs.example.com:/exports/work on /shares/work type nfs4 (rw,relatime,vers=4.2,...)',
              fields: [['(empty first ls)', 'Keys are not shown until accessed (unless browse mode is enabled)'], ['type nfs4 vers=4.2', 'Mounted on access via NFSv4.2']]
            }
          ],
          walkthrough: [
            'Attach a spare disk (e.g. /dev/vdb). Inspect with `lsblk` and `parted /dev/vdb print`; create a GPT label only if it is empty.',
            'Create a 1 GiB partition flagged lvm, then `pvcreate`, `vgcreate -s 8M vg01`, `lvcreate -n data -l 64 vg01` (= 512 MiB).',
            'Format with `mkfs.xfs -L data /dev/vg01/data`, add a LABEL= or UUID= fstab line, `systemctl daemon-reload`, `mount -a`.',
            'Create a 512 MiB swap partition, `mkswap`, add `UUID=... none swap defaults 0 0`, `swapon -a`, `swapon --show`.',
            'Extend the LV by 200 MiB with `lvextend -r`, then confirm with `df -h /data`.',
            'Configure autofs for an NFS export (set up a second VM as NFS server with `/etc/exports` if needed) and confirm on-demand mounting.'
          ],
          lab: {
            goal: 'Build persistent storage that survives a reboot without touching existing partitions.',
            steps: [
              'On /dev/vdb (empty spare disk): `parted -s /dev/vdb mklabel gpt mkpart lvm1 1MiB 2049MiB set 1 lvm on mkpart swap1 linux-swap 2049MiB 2561MiB`',
              '`pvcreate /dev/vdb1; vgcreate -s 16M vgdata /dev/vdb1; lvcreate -n lvweb -l 40 vgdata` (40 x 16 MiB = 640 MiB)',
              '`mkfs.ext4 -L web /dev/vgdata/lvweb; mkdir /web; echo "LABEL=web /web ext4 defaults 0 0" >> /etc/fstab`',
              '`mkswap /dev/vdb2; echo "UUID=$(blkid -s UUID -o value /dev/vdb2) none swap defaults 0 0" >> /etc/fstab`',
              '`systemctl daemon-reload; findmnt --verify; mount -a; swapon -a`',
              'On a second VM, export /exports/home/user1 via NFS; on the client create `/etc/auto.master.d/home.autofs` with `/rhome /etc/auto.rhome` and `/etc/auto.rhome` with `* -rw,sync nfsserver:/exports/home/&`; `dnf install -y autofs nfs-utils; systemctl enable --now autofs`',
              'Reboot and re-check everything.'
            ],
            verify: 'After reboot: `df -h /web` shows ~620 MiB ext4; `swapon --show` lists /dev/vdb2; `lvs vgdata` shows lvweb 640.00m; `ls /rhome/user1` triggers a mount visible in `mount | grep rhome`.'
          },
          troubleshooting: {
            scenario: 'After a reboot the system stops at "You are in emergency mode" and the console shows a timeout waiting for device `dev-disk-by\\x2duuid-...device`.',
            steps: [
              'Evidence: log in with the root password; `journalctl -xb | grep -i -E "timed out|fstab"` and `cat /etc/fstab`.',
              'Hypothesis: an fstab line references a UUID that does not exist (typo, or the UUID of the LV PV instead of the file system).',
              'Fix: `blkid` to get the correct file-system UUID, `mount -o remount,rw /` if needed, correct the line (or comment it out), `systemctl daemon-reload; mount -a`.',
              'Validate: `findmnt --verify` reports no errors, then reboot and confirm the system reaches the default target.'
            ]
          },
          mistakes: [
            'Running `mklabel` on a disk with existing partitions, destroying data the grader expects to remain.',
            'Using the PV/partition UUID (from LVM2_member) instead of the file-system UUID in fstab.',
            'Forgetting `-r` with lvextend: the LV grows but `df` still shows the old size.',
            'Trying to shrink XFS: it is not possible; back up, recreate and restore instead.',
            'Writing autofs maps but not enabling the autofs service, or using a mount point that already has a local directory with content.'
          ],
          safety: [
            'Partitioning, mkfs and pvcreate are destructive: confirm the target disk with `lsblk` and `blkid` twice before running them.',
            'Always run `findmnt --verify` and `mount -a` before rebooting after an fstab edit; keep console access available.',
            'Back up /etc/fstab (`cp -a /etc/fstab /etc/fstab.bak`) before changes for a quick rollback.'
          ],
          distro: 'RHEL 9 and 10 default to XFS for root and NFSv4.2 on clients. RHEL 10 has removed some legacy storage tools and features; Stratis and VDO-on-LVM remain options outside the core objectives. Debian/Ubuntu default to ext4 and do not label autofs maps differently, but package names differ (autofs, nfs-common).',
          challenge: {
            task: 'The VG `vgapp` has an LV `lvlogs` (XFS, mounted at /logs) that is full. The VG has no free extents. A new disk /dev/vdc is available. Grow /logs by 1 GiB online and make sure nothing is lost on reboot.',
            solution: `${F}
lsblk /dev/vdc                  # confirm it is empty
pvcreate /dev/vdc
vgextend vgapp /dev/vdc
vgs vgapp                       # VFree now >= 1G
lvextend -r -L +1G /dev/vgapp/lvlogs
df -h /logs
grep /logs /etc/fstab           # existing entry by UUID still valid
${F}

**Reasoning:** extending the VG with a new PV adds free extents; \`lvextend -r\` grows the LV and runs \`xfs_growfs\` while mounted. The file-system UUID does not change when growing, so fstab needs no edit.`
          },
          interview: [
            { q: 'Why mount by UUID instead of /dev/sdb1 in /etc/fstab?', a: 'Kernel device names depend on discovery order and can change when disks are added, removed or reordered, which could mount the wrong file system or block boot. UUIDs (and labels) are stored in the file-system superblock and stay stable.', mistake: 'Saying UUIDs are faster.', followUp: 'Which UUID do you use for an LVM-backed file system?' },
            { q: 'What does `lvextend -r` do?', a: 'It extends the logical volume and then calls fsadm to grow the file system on it (xfs_growfs for XFS, resize2fs for ext4), so the new space is usable immediately.', mistake: 'Thinking -r means "recursive".', followUp: 'Can you shrink an XFS logical volume?' },
            { q: 'When would you use autofs instead of an fstab NFS entry?', a: 'When shares are numerous or used intermittently (e.g. home directories): autofs mounts on access and unmounts when idle, avoiding boot delays and stale mounts when the server is down.', mistake: 'Believing autofs caches the files locally.', followUp: 'What do `*` and `&` mean in an autofs map?' }
          ],
          revision: [
            'GPT via parted/gdisk/fdisk; only add partitions in free space.',
            'PV → VG (extent size `-s`) → LV (`-L` bytes, `-l` extents); `lvextend -r` grows FS too.',
            'XFS grows, never shrinks; ext4 grows online, shrinks offline.',
            'fstab by UUID/LABEL; `daemon-reload`, `findmnt --verify`, `mount -a` before reboot.',
            'Swap: mkswap, fstab `none swap defaults 0 0`, `swapon -a`.',
            'autofs: master map → map file; `*` + `&` wildcard; enable autofs; NFS needs `_netdev` in fstab.'
          ]
        }
      ]
    },
    {
      id: 'L18-M3',
      title: 'RHCSA: deploy, networking, users and security',
      summary: 'Deploy and maintain systems (scheduling, services, time, repos, bootloader), configure IPv4/IPv6 networking and name resolution, manage users and groups, and secure systems with firewalld, SSH keys and SELinux. Ends with an RHCSA revision plan.',
      lessons: [
        {
          id: 'L18-M3-T1',
          title: 'Deploy and maintain: scheduling, services, time, repositories, bootloader and networking',
          minutes: 60,
          objectives: [
            'Schedule tasks with at, cron and systemd timers',
            'Enable services at boot, set the default target and configure a chrony time client',
            'Modify kernel arguments and GRUB settings persistently',
            'Configure IPv4 and IPv6 addresses, gateway, DNS and hostname with nmcli and hostnamectl'
          ],
          prereqs: ['L18-M2-T1'],
          concept: `### Scheduling

- **at** runs a job once: \`echo "tar -czf /root/etc.tgz /etc" | at now + 10 minutes\`; \`atq\` lists, \`atrm N\` removes. The \`atd\` service must be running.
- **cron** runs recurring jobs. \`crontab -e\` (or \`crontab -e -u alice\` as root) edits a user's table. Fields: *minute hour day-of-month month day-of-week command*. \`*/5 * * * *\` = every 5 minutes; \`30 2 * * 1-5\` = 02:30 Monday to Friday. System jobs go in \`/etc/cron.d/\` with an extra *user* field.
- **systemd timers** pair a \`.timer\` unit with a \`.service\` unit of the same name. \`OnCalendar=*-*-* 02:30:00\` is calendar time; \`OnBootSec=15min\` is relative; \`Persistent=true\` runs a missed job after downtime. \`systemctl enable --now backup.timer\`; \`systemctl list-timers\`; \`systemd-analyze calendar "Mon..Fri 02:30"\` checks expressions.

### Services and targets

\`systemctl enable --now httpd\` starts now *and* at boot. \`systemctl is-enabled\`, \`is-active\`, \`mask\` (prevent starting at all). Default target: \`systemctl set-default\`.

### Time service client

RHEL uses **chrony**. In \`/etc/chrony.conf\` add \`server classroom.example.com iburst\` (or \`pool\`), remove unwanted lines, \`systemctl restart chronyd\`, verify with \`chronyc sources -v\` (\`^*\` = currently selected source). \`timedatectl set-timezone\`, \`timedatectl set-ntp true\`.

### Installing and updating from repositories

From the Red Hat CDN after registration (\`subscription-manager register\`), from a remote repo (\`.repo\` file with \`baseurl=http://...\`), or a local repo (\`baseurl=file:///...\`). \`dnf update\` / \`dnf upgrade\` apply updates; kernels are installed side by side.

### Modifying the bootloader

Use \`grubby\` for kernel arguments: \`grubby --update-kernel=ALL --args="console=ttyS0"\`, \`--remove-args=\`, \`grubby --default-kernel\`, \`grubby --set-default /boot/vmlinuz-...\`. GRUB menu settings such as \`GRUB_TIMEOUT\` live in \`/etc/default/grub\`; regenerate with \`grub2-mkconfig -o /boot/grub2/grub.cfg\` (this path is correct for both BIOS and UEFI on RHEL 9 and 10).

### Basic networking

NetworkManager owns network configuration. A **connection profile** holds settings; a **device** is the interface.

${F}
nmcli con add type ethernet con-name static-eth0 ifname eth0 \\
  ipv4.method manual ipv4.addresses 192.168.10.20/24 ipv4.gateway 192.168.10.1 \\
  ipv4.dns 192.168.10.1 ipv6.method manual ipv6.addresses 2001:db8:10::20/64 \\
  connection.autoconnect yes
nmcli con up static-eth0
hostnamectl set-hostname server1.example.com
${F}

Use \`nmcli con mod\` to change an existing profile, then \`nmcli con up\` to apply. Static name resolution goes in \`/etc/hosts\`; \`/etc/nsswitch.conf\` sets lookup order; \`/etc/resolv.conf\` is generated by NetworkManager from \`ipv4.dns\`/\`ipv6.dns\`. Verify with \`ip -br addr\`, \`ip route\`, \`ip -6 route\`, \`getent hosts name\`.`,
          internals: `crond wakes every minute, reads /var/spool/cron/<user>, /etc/crontab and /etc/cron.d/*, and runs matching jobs through the user's shell with a minimal environment (no login PATH), which is why scripts should use absolute paths. Output is mailed or logged to the journal.

A systemd timer is a unit whose activation triggers the matching service; elapse times are tracked by systemd itself, and \`Persistent=true\` stores the last trigger time under /var/lib/systemd/timers.

NetworkManager stores profiles as keyfiles in /etc/NetworkManager/system-connections/*.nmconnection (mode 600). The legacy ifcfg format was deprecated in RHEL 9 and is not used in RHEL 10. chronyd adjusts the clock gradually (slewing) and can step it at startup (\`makestep\`).

grubby edits BLS (Boot Loader Specification) entries in /boot/loader/entries/*.conf and the kernelopts in the GRUB environment, so changes apply to the selected kernels without regenerating grub.cfg.`,
          useCases: [
            'Nightly backups via a systemd timer that catches up after maintenance downtime',
            'Consistent time across a cluster for Kerberos and log correlation using chrony',
            'Adding a serial console kernel argument to all kernels for out-of-band troubleshooting'
          ],
          syntax: 'at now + 5 minutes | atq | atrm N\ncrontab -e [-u USER] | crontab -l\nsystemctl enable --now NAME.timer | systemctl list-timers | systemd-analyze calendar EXPR\nchronyc sources -v | timedatectl\ngrubby --update-kernel=ALL --args="ARG" | grub2-mkconfig -o /boot/grub2/grub.cfg\nnmcli con add|mod|up|show | nmcli dev status | hostnamectl set-hostname NAME',
          options: [
            ['OnCalendar=', 'Calendar expression for a timer (e.g. daily, Mon *-*-* 08:00)'],
            ['Persistent=true', 'Run a missed timer job at next boot'],
            ['iburst', 'chrony option: send a burst of requests at start for fast sync'],
            ['--update-kernel=ALL', 'grubby: apply to all installed kernels'],
            ['ipv4.method manual', 'nmcli: static addressing (auto = DHCP)'],
            ['connection.autoconnect yes', 'Bring the profile up at boot'],
            ['+ipv4.dns', 'Add (instead of replace) a value in nmcli con mod']
          ],
          examples: [
            {
              title: 'Check chrony synchronisation',
              cmd: 'chronyc sources -v | tail -2',
              out: 'MS Name/IP address         Stratum Poll Reach LastRx Last sample\n^* classroom.example.com         2   6   377    34   +112us[ +140us] +/-  21ms',
              fields: [['^*', 'Server (^) currently selected for synchronisation (*)'], ['Reach 377', 'Last 8 polls all succeeded (octal)'], ['+/- 21ms', 'Estimated error bound']]
            },
            {
              title: 'A daily timer and its next run',
              cmd: 'systemctl cat backup.timer; systemctl list-timers backup.timer',
              out: '# /etc/systemd/system/backup.timer\n[Unit]\nDescription=Nightly backup\n[Timer]\nOnCalendar=*-*-* 02:30:00\nPersistent=true\n[Install]\nWantedBy=timers.target\nNEXT                        LEFT     LAST PASSED UNIT         ACTIVATES\nSat 2026-10-10 02:30:00 UTC 16h left -    -      backup.timer backup.service',
              fields: [['WantedBy=timers.target', 'Lets enable start the timer at boot'], ['ACTIVATES backup.service', 'Service with the same base name runs the work']]
            },
            {
              title: 'Verify static IPv4/IPv6 and DNS',
              cmd: 'ip -br addr show eth0; ip route | head -1; grep nameserver /etc/resolv.conf',
              out: 'eth0  UP  192.168.10.20/24 2001:db8:10::20/64 fe80::5054:ff:fe12:3456/64\ndefault via 192.168.10.1 dev eth0 proto static metric 100\nnameserver 192.168.10.1',
              fields: [['192.168.10.20/24', 'Static IPv4'], ['2001:db8:10::20/64', 'Static IPv6 (global)'], ['fe80::...', 'Automatic link-local IPv6'], ['proto static', 'Gateway came from a manual profile']]
            }
          ],
          walkthrough: [
            'Schedule a one-time job with at and remove it with atrm; schedule a cron job for user alice at 14:23 daily using `crontab -e -u alice`.',
            'Write /etc/systemd/system/cleanup.service (Type=oneshot) and cleanup.timer (OnCalendar=hourly), `systemctl daemon-reload`, `systemctl enable --now cleanup.timer`.',
            'Configure chrony to use a given server, restart chronyd, and confirm with `chronyc sources`.',
            'Add `audit=1` to all kernels with grubby and confirm with `grubby --info=ALL | grep args`.',
            'Create a static nmcli profile with IPv4 and IPv6, set the hostname, and add a host entry to /etc/hosts.',
            'Reboot and confirm every setting persisted.'
          ],
          lab: {
            goal: 'Deploy a set of maintenance and networking settings that persist across reboot.',
            steps: [
              'As root: `crontab -e -u alice` with `*/30 9-17 * * 1-5 /usr/bin/logger "alice heartbeat"`.',
              'Create /etc/systemd/system/df-report.service (`[Service] Type=oneshot ExecStart=/usr/bin/sh -c "df -h > /root/df-report.txt"`) and df-report.timer (`OnCalendar=*:0/15`, `Persistent=true`, `WantedBy=timers.target`), then `systemctl daemon-reload; systemctl enable --now df-report.timer`.',
              'Edit /etc/chrony.conf: comment existing pool line, add `server <your NTP server> iburst`; `systemctl restart chronyd`.',
              '`grubby --update-kernel=ALL --args="console=tty0 console=ttyS0,115200"`.',
              'Use `nmcli con mod` on your existing connection to add a secondary IPv6 address `+ipv6.addresses fd00:10::5/64` and set `ipv6.method manual` (or keep auto if your lab relies on SLAAC), then `nmcli con up <name>`.',
              '`hostnamectl set-hostname node1.lab.example.com`; add `192.168.10.30 node2.lab.example.com node2` to /etc/hosts.',
              'Reboot.'
            ],
            verify: '`crontab -l -u alice` shows the line; `systemctl list-timers df-report.timer` shows a next run; `chronyc sources` shows `^*`; `cat /proc/cmdline` contains console=ttyS0; `ip -6 addr` shows fd00:10::5; `hostname` and `getent hosts node2` return the expected values.'
          },
          troubleshooting: {
            scenario: 'A new timer never runs: `systemctl list-timers` does not list it at all.',
            steps: [
              'Evidence: `systemctl status report.timer` shows `inactive (dead)` and `disabled`; `systemctl cat report.timer` shows no [Install] section.',
              'Hypothesis: the timer was created but never enabled/started, and without `WantedBy=timers.target` enable has nothing to hook into.',
              'Fix: add `[Install] WantedBy=timers.target`, `systemctl daemon-reload`, `systemctl enable --now report.timer`.',
              'Validate: `systemctl list-timers report.timer` shows NEXT; after it fires, `journalctl -u report.service` shows the run.'
            ]
          },
          mistakes: [
            'Using the /etc/crontab format (with a user field) inside `crontab -e`, so cron tries to run the user name as a command.',
            'Enabling the .service instead of the .timer, so the job runs once at boot and never on schedule.',
            'Editing grub.cfg by hand: it is regenerated and changes are lost; use grubby or /etc/default/grub + grub2-mkconfig.',
            'Changing a profile with `nmcli con mod` but not reactivating it with `nmcli con up`, then being surprised nothing changed (until reboot).',
            'Editing /etc/resolv.conf directly on a NetworkManager system: it will be overwritten; set ipv4.dns on the profile.'
          ],
          safety: [
            'Network changes over SSH can lock you out; use the console or a scheduled rollback (`at now + 5 min` to restore a profile) when changing the active interface.',
            'Kernel argument changes take effect at reboot; keep at least one known-good kernel entry.',
            'Root is required for system timers, chrony, grubby and nmcli changes to system profiles.'
          ],
          distro: 'RHEL 9 and 10 store NetworkManager profiles as keyfiles; RHEL 8 used ifcfg files and `network-scripts` (removed). RHEL uses chronyd; Debian/Ubuntu often use systemd-timesyncd and netplan/ifupdown. `grubby` is RHEL/Fedora-specific; Debian uses `update-grub`.',
          challenge: {
            task: 'Configure server1 so that: (1) a job runs `/usr/local/bin/rotate.sh` at 23:45 every Sunday as root even if the machine was off at that time, (2) the system boots to multi-user.target, (3) IPv4 is static 172.25.250.11/24, gateway 172.25.250.254, DNS 172.25.250.254, (4) time comes from 172.25.254.254.',
            solution: `${F}
cat > /etc/systemd/system/rotate.service <<'EOF'
[Unit]
Description=Weekly rotate
[Service]
Type=oneshot
ExecStart=/usr/local/bin/rotate.sh
EOF
cat > /etc/systemd/system/rotate.timer <<'EOF'
[Unit]
Description=Weekly rotate timer
[Timer]
OnCalendar=Sun *-*-* 23:45:00
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload && systemctl enable --now rotate.timer
systemctl set-default multi-user.target
nmcli con mod "System eth0" ipv4.method manual ipv4.addresses 172.25.250.11/24 \\
  ipv4.gateway 172.25.250.254 ipv4.dns 172.25.250.254 connection.autoconnect yes
nmcli con up "System eth0"
sed -i 's/^pool /#pool /' /etc/chrony.conf
echo 'server 172.25.254.254 iburst' >> /etc/chrony.conf
systemctl restart chronyd && chronyc sources
${F}

**Reasoning:** "even if the machine was off" requires a timer with \`Persistent=true\` rather than cron. The connection name must match \`nmcli con show\`.`
          },
          interview: [
            { q: 'cron or systemd timer: which would you choose and why?', a: 'Timers integrate with systemd: journal logging per run, dependencies, resource controls, randomised delays and Persistent=true catch-up. cron is simpler and universal. For new system jobs on RHEL I prefer timers; for simple user jobs cron is fine.', mistake: 'Saying cron is deprecated on RHEL.', followUp: 'How do you test an OnCalendar expression?' },
            { q: 'How do you add a kernel argument permanently on RHEL 9?', a: '`grubby --update-kernel=ALL --args="arg=value"`, confirm with `grubby --info=ALL`, reboot, and check `/proc/cmdline`. After the next kernel update, confirm the new kernel entry carries the argument too. Editing GRUB_CMDLINE_LINUX in /etc/default/grub and running grub2-mkconfig is the alternative.', mistake: 'Editing /boot/grub2/grub.cfg directly.', followUp: 'Where are BLS entries stored?' },
            { q: 'You set a DNS server but /etc/resolv.conf reverted. Why?', a: 'NetworkManager generates resolv.conf from connection profiles. The DNS must be set on the profile (`nmcli con mod NAME ipv4.dns X`) and the profile reactivated.', mistake: 'Making resolv.conf immutable with chattr.', followUp: 'How do you check name resolution in the same way applications do? (`getent hosts`)' }
          ],
          revision: [
            'at once, cron recurring (5 fields), timers with OnCalendar + Persistent=true + WantedBy=timers.target.',
            '`systemctl enable --now`; `set-default`; enable the *.timer* not the service.',
            'chrony: `server X iburst` in /etc/chrony.conf, restart chronyd, `chronyc sources` shows `^*`.',
            'grubby for kernel args; /etc/default/grub + grub2-mkconfig -o /boot/grub2/grub.cfg for menu settings.',
            'nmcli con add/mod then `con up`; hostnamectl; DNS via the profile; verify with ip and getent.'
          ]
        },
        {
          id: 'L18-M3-T2',
          title: 'Users, groups, firewalld, SSH keys, SELinux and an RHCSA revision plan',
          minutes: 70,
          objectives: [
            'Create and manage users, groups, password aging and sudo privileges',
            'Restrict network access with firewalld services, ports, zones and sources',
            'Configure key-based SSH authentication and default file permissions',
            'Manage SELinux modes, contexts, port labels and booleans without disabling SELinux',
            'Follow a structured, timed RHCSA revision plan'
          ],
          prereqs: ['L18-M3-T1'],
          concept: `### Users and groups

\`useradd -u 2001 -G wheel -s /bin/bash alice\` creates a user with a UID, supplementary group and shell. \`usermod -aG devs alice\` *appends* a group (without \`-a\` you replace all supplementary groups). \`groupadd -g 3000 devs\`. A user with no interactive login: \`useradd -s /sbin/nologin svc1\`. Set a password with \`passwd alice\` (or \`echo 'alice:Secret#1' | chpasswd\` in scripts).

**Password aging** with \`chage\`: \`-M 90\` maximum days, \`-m 7\` minimum days, \`-W 7\` warning, \`-E 2026-12-31\` account expiry, \`-d 0\` force change at next login. \`chage -l alice\` lists. Defaults for *new* users come from \`/etc/login.defs\` (\`PASS_MAX_DAYS\` etc.).

**Privileged access** uses sudo. Members of \`wheel\` may run any command (with their own password) by default on RHEL. For custom rules create a file in \`/etc/sudoers.d/\` and validate with \`visudo -cf\`:

${F}
%devs  ALL=(ALL)  /usr/bin/systemctl restart httpd
${F}

### Firewalld

firewalld groups rules into **zones**; an interface or source address belongs to one zone. Runtime changes are lost at reload; \`--permanent\` changes are saved but need \`--reload\` to apply. Typical tasks:

${F}
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --permanent --zone=trusted --add-source=192.168.50.0/24
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" service name="ssh" reject'
firewall-cmd --reload; firewall-cmd --list-all
${F}

### SSH key authentication

\`ssh-keygen -t ed25519\` creates a key pair; \`ssh-copy-id user@host\` appends the public key to \`~/.ssh/authorized_keys\` on the server. Permissions must be strict (\`~/.ssh\` 700, \`authorized_keys\` 600) or sshd ignores the key. Server policy goes in drop-ins under \`/etc/ssh/sshd_config.d/\` (e.g. \`PasswordAuthentication no\`); test with \`sshd -t\` before \`systemctl reload sshd\`.

### Default file permissions

The **umask** removes bits from the base modes (files 666, directories 777). umask 022 gives 644/755; 027 gives 640/750; 077 gives 600/700. Set per user in \`~/.bashrc\` or \`~/.bash_profile\`; system-wide via a script in \`/etc/profile.d/\`.

### SELinux

SELinux labels every process and file with a context \`user:role:type:level\`; the **type** is what policy uses. Modes: enforcing, permissive (logs but allows), disabled. \`getenforce\`, \`setenforce 0|1\` (runtime), \`SELINUX=enforcing\` in /etc/selinux/config (persistent). Views: \`ls -Z\`, \`ps -eZ\`. Fixes, in order of preference:

1. **Restore contexts**: \`restorecon -Rv /var/www/html\` resets to policy defaults.
2. **Define a new default**: \`semanage fcontext -a -t httpd_sys_content_t '/web(/.*)?'\` then \`restorecon -Rv /web\`.
3. **Port labels**: \`semanage port -a -t http_port_t -p tcp 82\`; list with \`semanage port -l\`.
4. **Booleans**: \`getsebool -a | grep httpd\`, \`setsebool -P httpd_enable_homedirs on\` (-P persists).

Denials are logged as AVC messages: \`ausearch -m AVC -ts recent\`, \`sealert -a /var/log/audit/audit.log\`. Never treat \`setenforce 0\` as the fix; use permissive only briefly to confirm a diagnosis.

### RHCSA revision plan (suggested, adapt to your schedule)

Re-check the EX200 objective list on redhat.com before you book; this plan follows the list as published for RHEL 10 at the time of writing.

1. **Weeks 1-2**: one objective group per day (tools, software, scripts, running systems, storage). Do each task twice from memory on a fresh VM.
2. **Week 3**: file systems, deploy/maintain, networking, users, security. Keep an "error log" of every mistake.
3. **Week 4**: timed mixed sets of 15-20 tasks in about 2.5 hours (check the current official exam duration), on two VMs, followed by a reboot and self-grading against a checklist.
4. **Final days**: drill the weak items from your error log, rd.break recovery, LVM + fstab, autofs, SELinux contexts/ports, firewalld.

Exam-time habits: read every task fully; do quick wins first; verify after each task; reboot once mid-way and once at the end to catch persistence errors.`,
          internals: `Accounts live in /etc/passwd (name, UID, GID, home, shell), /etc/shadow (hash and aging fields), /etc/group and /etc/gshadow. useradd reads /etc/login.defs and /etc/default/useradd and copies /etc/skel into the new home.

firewalld is a D-Bus daemon that translates zones into nftables rule sets (the nftables backend is the default on RHEL 9/10); permanent configuration is XML under /etc/firewalld/.

sshd checks StrictModes: if the home directory, ~/.ssh or authorized_keys is writable by others, key authentication is refused and logged in the journal.

SELinux decisions are made by the kernel against the loaded policy and cached in the access vector cache; denials are written by auditd to /var/log/audit/audit.log. File contexts are stored in the security.selinux extended attribute; semanage writes local customisations to the policy store, which restorecon reads via file_contexts.local.`,
          useCases: [
            'Onboarding a team with a shared group, sudo rights limited to service restarts and 90-day password aging',
            'Serving a website from a non-default directory and port without weakening SELinux',
            'Allowing SSH only from the management network and disabling password logins'
          ],
          syntax: 'useradd [-u UID] [-G GROUPS] [-s SHELL] USER | usermod -aG GROUP USER | groupadd [-g GID] GROUP\nchage -M -m -W -E -d USER | chage -l USER\nvisudo -cf /etc/sudoers.d/FILE\nfirewall-cmd [--permanent] --add-service|--add-port|--add-source|--add-rich-rule ... | --reload | --list-all\nssh-keygen -t ed25519 | ssh-copy-id USER@HOST | sshd -t\nls -Z | ps -eZ | semanage fcontext -a -t TYPE \'PATH(/.*)?\' | restorecon -Rv PATH\nsemanage port -a -t TYPE -p tcp PORT | setsebool -P BOOL on | ausearch -m AVC -ts recent',
          options: [
            ['usermod -aG', 'Append supplementary groups (without -a they are replaced)'],
            ['chage -d 0', 'Force password change at next login'],
            ['firewall-cmd --permanent', 'Write to saved config; apply with --reload'],
            ['firewall-cmd --add-source', 'Bind a source network to a zone'],
            ['semanage port -a -t http_port_t', 'Allow a confined service to bind a non-standard port'],
            ['setsebool -P', 'Change a boolean persistently'],
            ['restorecon -Rv', 'Recursively reset file contexts to policy defaults, verbose']
          ],
          examples: [
            {
              title: 'Read password aging',
              cmd: 'chage -l alice',
              out: 'Last password change                                    : Oct 09, 2026\nPassword expires                                        : Jan 07, 2027\nPassword inactive                                       : never\nAccount expires                                         : never\nMinimum number of days between password change          : 0\nMaximum number of days between password change          : 90\nNumber of days of warning before password expires       : 7',
              fields: [['Maximum ... 90', 'Set by chage -M 90'], ['Password expires', 'Last change + 90 days'], ['Account expires never', 'chage -E not set']]
            },
            {
              title: 'Diagnose a web content denial',
              cmd: 'ls -Zd /web; ausearch -m AVC -ts recent | tail -1',
              out: 'unconfined_u:object_r:default_t:s0 /web\ntype=AVC msg=audit(1791540000.123:412): avc:  denied  { getattr } for  pid=2211 comm="httpd" path="/web/index.html" scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:default_t:s0 tclass=file permissive=0',
              fields: [['default_t', 'Wrong type: httpd cannot read default_t'], ['scontext ... httpd_t', 'The confined process'], ['permissive=0', 'Enforcing: access was actually denied']],
              note: 'Fix: semanage fcontext -a -t httpd_sys_content_t \'/web(/.*)?\'; restorecon -Rv /web.'
            },
            {
              title: 'Firewall state after changes',
              cmd: 'firewall-cmd --list-all',
              out: 'public (active)\n  target: default\n  interfaces: eth0\n  services: cockpit dhcpv6-client http ssh\n  ports: 8080/tcp\n  rich rules:\n\trule family="ipv4" source address="10.0.0.0/8" service name="ssh" reject',
              fields: [['public (active)', 'Zone in use by eth0'], ['services', 'Allowed predefined services'], ['ports 8080/tcp', 'Allowed extra port'], ['rich rules', 'Fine-grained rule: reject SSH from 10.0.0.0/8']]
            }
          ],
          walkthrough: [
            'Create group `sysops` (GID 4000) and users `amy` and `ben` in it; `carl` with shell /sbin/nologin; set passwords.',
            'Give `sysops` full sudo via /etc/sudoers.d/sysops and validate with `visudo -cf`.',
            'Set `chage -M 60 -W 10 amy` and `chage -d 0 ben`; for all new users set PASS_MAX_DAYS 60 in /etc/login.defs.',
            'Run httpd on port 82 serving /web: semanage fcontext + restorecon, semanage port, firewall-cmd --add-port=82/tcp; check with `curl http://localhost:82`.',
            'Generate an ed25519 key for amy, copy it to a second VM, and disable password authentication there via a sshd_config.d drop-in.',
            'Set umask 027 for amy and confirm new files are 640.'
          ],
          lab: {
            goal: 'Secure a RHEL 9/10 web server end-to-end while keeping SELinux enforcing and firewalld running.',
            steps: [
              '`dnf install -y httpd; mkdir /web; echo hello > /web/index.html`; set `DocumentRoot "/web"` and a matching `<Directory "/web">` block with `Require all granted`, plus `Listen 82` in /etc/httpd/conf/httpd.conf.',
              '`semanage fcontext -a -t httpd_sys_content_t \'/web(/.*)?\'; restorecon -Rv /web`',
              '`semanage port -a -t http_port_t -p tcp 82; systemctl enable --now httpd`',
              '`firewall-cmd --permanent --add-port=82/tcp; firewall-cmd --reload`',
              'Create `webadmins` group and user `wanda` in it; `/etc/sudoers.d/webadmins`: `%webadmins ALL=(root) /usr/bin/systemctl restart httpd`; `visudo -cf /etc/sudoers.d/webadmins`.',
              'Set `chage -M 30 wanda` and confirm with `chage -l wanda`.'
            ],
            verify: '`getenforce` = Enforcing; `curl -s http://localhost:82` prints hello (and from another host); `semanage port -l | grep ^http_port_t` includes 82; `sudo -l -U wanda` shows only the restart command; `firewall-cmd --list-ports` shows 82/tcp.'
          },
          troubleshooting: {
            scenario: 'httpd fails to start after moving it to port 8888: `journalctl -u httpd` shows "(13)Permission denied: AH00072: make_sock: could not bind to address [::]:8888".',
            steps: [
              'Evidence: `ausearch -m AVC -ts recent` shows `denied { name_bind } ... src=8888 ... httpd_t ... tcontext=...unreserved_port_t`.',
              'Hypothesis: SELinux does not label 8888 as an http port, so httpd_t may not bind it.',
              'Fix: `semanage port -a -t http_port_t -p tcp 8888` (use `-m` if the port already has another label), then `systemctl restart httpd`; open the firewall with `firewall-cmd --permanent --add-port=8888/tcp; firewall-cmd --reload`.',
              'Validate: `ss -tlnp | grep 8888` shows httpd and `curl localhost:8888` succeeds with SELinux still enforcing.'
            ]
          },
          mistakes: [
            '`usermod -G devs alice` without `-a`, silently removing alice from her other groups.',
            'Using `chcon` for a permanent fix: a relabel or restorecon reverts it; use semanage fcontext + restorecon.',
            'Adding a firewall rule with `--permanent` and not reloading, or without `--permanent` and losing it at reboot.',
            'Setting `setenforce 0` and leaving it, or editing /etc/selinux/config to disabled; the task and production both expect enforcing.',
            'Leaving ~/.ssh group-writable so sshd silently ignores authorized_keys.'
          ],
          safety: [
            'Test sudoers files with `visudo -cf` before relying on them; a syntax error can block all sudo access.',
            'Disabling SSH password authentication without a working key (and console access) can lock you out; test key login in a second session first.',
            'Firewall changes on remote hosts: add the new rule before removing the old, and keep a console available.'
          ],
          distro: 'RHEL 9 and 10 default to `PermitRootLogin prohibit-password` and use sshd_config.d drop-ins; RHEL 8 permitted root password logins by default. SELinux tools (semanage) come from policycoreutils-python-utils. Debian/Ubuntu use AppArmor and ufw/nftables by default and use the `sudo` group instead of `wheel`.',
          challenge: {
            task: 'User `dave` must be able to log in from the management network 192.168.100.0/24 by SSH key only; nobody else may SSH from anywhere else. Dave\'s password must expire every 45 days and he must change it at first login. Do not disable SELinux or firewalld.',
            solution: `${F}
useradd dave && passwd dave
chage -M 45 -d 0 dave
# on dave's workstation: ssh-keygen -t ed25519; ssh-copy-id dave@server
firewall-cmd --permanent --zone=public --remove-service=ssh
firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.100.0/24" service name="ssh" accept'
firewall-cmd --reload
cat > /etc/ssh/sshd_config.d/50-keys.conf <<'EOF'
PasswordAuthentication no
EOF
sshd -t && systemctl reload sshd
${F}

**Reasoning:** the rich rule allows SSH only from the management network while the service is removed from the zone. Test the key login from 192.168.100.0/24 in a second session before closing the first. Note the tension: "change password at first login" only matters for console or sudo use once password SSH is off; mention this to the requester.`
          },
          interview: [
            { q: 'A website returns 403 after moving DocumentRoot to /srv/site. Permissions are 755. What do you check and fix?', a: 'Check `ls -Zd /srv/site` and `ausearch -m AVC -ts recent`. If the type is var_t/default_t, add a rule `semanage fcontext -a -t httpd_sys_content_t "/srv/site(/.*)?"` and run `restorecon -Rv /srv/site`. Also confirm httpd.conf has a <Directory> block granting access.', mistake: 'Answering "disable SELinux" or "chmod 777".', followUp: 'Why is chcon not enough?' },
            { q: 'Explain firewalld runtime versus permanent configuration.', a: 'Runtime rules apply immediately but are lost at reload or reboot. Permanent rules are saved to /etc/firewalld but only become active after `--reload` (or use both, or `--runtime-to-permanent`).', mistake: 'Assuming --permanent applies immediately.', followUp: 'How do you allow a service only from one subnet?' },
            { q: 'How does umask 027 affect new files and directories?', a: 'It removes write for group and all bits for others: files become 640 (from 666), directories 750 (from 777).', mistake: 'Subtracting arithmetically from 777 for files and claiming 750 for files.', followUp: 'Where would you set a umask for one user versus all users?' },
            { q: 'What is the difference between `semanage port` and `setsebool`?', a: 'semanage port changes which ports carry a type (e.g. labelling 82 as http_port_t); setsebool toggles predefined policy switches such as httpd_can_network_connect. Both persist when used with semanage or `-P`.', mistake: 'Using booleans to solve a port-binding denial.', followUp: 'How do you list the booleans relevant to httpd with descriptions?' }
          ],
          revision: [
            '`usermod -aG` appends; `chage -M/-m/-W/-E/-d 0`; defaults in /etc/login.defs.',
            'sudo rules in /etc/sudoers.d, validate with `visudo -cf`; wheel = full sudo on RHEL.',
            'firewalld: `--permanent` + `--reload`; services, ports, sources, rich rules; `--list-all`.',
            'SSH keys: ed25519, ssh-copy-id, 700/600 permissions, drop-ins + `sshd -t`.',
            'SELinux: restorecon → semanage fcontext → semanage port → setsebool -P; diagnose with ausearch/sealert; stay enforcing.',
            'Revision: objective-by-objective drills, timed mixed sets, reboot-and-verify, error log; re-check objectives on redhat.com.'
          ]
        }
      ]
    },
    {
      id: 'L18-M4',
      title: 'RHCE: Ansible core',
      summary: 'EX294 foundations: installing Ansible, ansible.cfg and ansible-navigator.yml, static inventories and host groups, preparing managed nodes, then plays and playbooks with modules, variables, facts, register, loops, conditionals, handlers and error handling.',
      lessons: [
        {
          id: 'L18-M4-T1',
          title: 'Installing and configuring Ansible: ansible.cfg, ansible-navigator, inventory and managed nodes',
          minutes: 55,
          objectives: [
            'Describe the EX294 objective areas and how the exam relates to RHCSA',
            'Write ansible.cfg and ansible-navigator.yml for a project directory',
            'Build a static inventory with host groups, nested groups and host variables',
            'Prepare managed nodes with SSH keys and privilege escalation, and test with ad hoc commands'
          ],
          prereqs: ['L18-M3-T2'],
          concept: `The RHCE exam (**EX294**) tests automating Linux administration with Ansible. Per the Red Hat objective page checked on 2026-10-09, its objectives "are based on the most recent Red Hat product version available" (current RHEL and Red Hat Ansible Automation Platform), include all RHCSA-level tasks, and cover: understanding core Ansible components, installing and configuring an Ansible control node, configuring managed nodes, running playbooks with **ansible-navigator** and **ansible-playbook**, basic Git and familiarity with VS Code, roles and Content Collections, automating standard RHCSA tasks, and managing content with templates and Ansible Vault. Objectives change; re-read the official page before booking. This course cannot promise a pass.

### Core vocabulary

- **Control node**: where Ansible runs. **Managed nodes**: hosts Ansible configures over SSH (no agent needed, Python required on the node).
- **Inventory**: list of managed nodes and groups. **Module**: a unit of work (e.g. \`ansible.builtin.dnf\`). **Task**: one module call. **Play**: tasks mapped to hosts. **Playbook**: a YAML file of plays.
- **FQCN** (fully qualified collection name) such as \`ansible.posix.firewalld\` identifies which collection a module comes from.

### Installing

On RHEL, \`ansible-core\` is available from AppStream (\`dnf install ansible-core\`). **ansible-navigator** comes with Red Hat Ansible Automation Platform; it runs playbooks inside an **execution environment (EE)**, a container image holding ansible-core, Python dependencies and collections. Exam-style environments usually provide the EE image and a registry.

### Configuration files

Ansible uses the first config it finds: \`ANSIBLE_CONFIG\` env var, then \`./ansible.cfg\` in the current directory, then \`~/.ansible.cfg\`, then \`/etc/ansible/ansible.cfg\`. Keep one per project:

${F}
[defaults]
inventory = ./inventory
remote_user = devops
roles_path = ./roles
collections_path = ./collections
host_key_checking = False

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
${F}

\`ansible-navigator.yml\` (also read from the project directory) sets navigator behaviour:

${F}
---
ansible-navigator:
  execution-environment:
    image: registry.example.com/ee-supported-rhel9:latest
    pull:
      policy: missing
  mode: stdout
  playbook-artifact:
    enable: false
${F}

### Inventory

An INI static inventory:

${F}
[web]
servera.lab.example.com
serverb.lab.example.com

[db]
serverc.lab.example.com ansible_host=172.25.250.12

[prod:children]
web
db
${F}

\`all\` and \`ungrouped\` exist implicitly. Group and host variables go in \`group_vars/<group>.yml\` and \`host_vars/<host>.yml\` next to the inventory.

### Managed nodes

Each node needs an account reachable by SSH key and sudo rights for privilege escalation (\`become\`). A typical bootstrap: create user \`devops\`, install the control node's public key, add \`devops ALL=(ALL) NOPASSWD: ALL\` in /etc/sudoers.d/devops. Test with \`ansible all -m ansible.builtin.ping\`.`,
          internals: `For each task Ansible builds a Python module payload on the control node, copies it over SSH to a temporary directory on the managed node (or pipes it when pipelining is enabled), runs it with the node's Python interpreter (optionally via sudo when become is set), parses the JSON result (changed, failed, msg, return values) and deletes the temporary files. Connections are parallelised by \`forks\` (default 5).

ansible-navigator starts a container (podman by default on RHEL) from the EE image, bind-mounts the project directory, runs \`ansible-playbook\` inside it, and streams the events back; it can also save a playbook artifact JSON for replay. Because the playbook runs inside the container, files referenced by the playbook (inventory, vault password files, collections) must be inside the project directory or otherwise available to the container.`,
          useCases: [
            'Standardising a project directory so every engineer runs the same Ansible version through the same EE',
            'Grouping hosts by role and environment (web, db, prod) to target changes safely',
            'Bootstrapping a fresh fleet with an automation user and sudo rules'
          ],
          syntax: 'ansible --version | ansible-config dump --only-changed\nansible-inventory -i inventory --graph | ansible-inventory --list\nansible all -m ansible.builtin.ping | ansible web -m ansible.builtin.command -a "uptime"\nansible-navigator run site.yml -m stdout | ansible-navigator inventory -i inventory -m stdout --graph\nansible-navigator doc ansible.builtin.dnf -m stdout | ansible-doc -l',
          options: [
            ['-i INVENTORY', 'Use a specific inventory file or directory'],
            ['-m stdout', 'ansible-navigator: print output like ansible-playbook instead of the TUI'],
            ['--eei / --pp', 'ansible-navigator: execution environment image / pull policy'],
            ['-b / --become', 'Run with privilege escalation'],
            ['-u USER', 'Remote user'],
            ['ansible-config dump --only-changed', 'Show effective settings that differ from defaults (and which file set them)'],
            ['ansible-doc -s MODULE', 'Snippet of module options for quick reference']
          ],
          examples: [
            {
              title: 'Which configuration file is in use',
              cmd: 'ansible --version | head -3',
              out: 'ansible [core 2.16.3]\n  config file = /home/student/project/ansible.cfg\n  configured module search path = [\'/home/student/.ansible/plugins/modules\', ...]',
              fields: [['core 2.16.3', 'Version is representative'], ['config file', 'Proves ./ansible.cfg was picked up because you ran from the project directory']]
            },
            {
              title: 'Graph the inventory',
              cmd: 'ansible-inventory --graph',
              out: '@all:\n  |--@ungrouped:\n  |--@prod:\n  |  |--@web:\n  |  |  |--servera.lab.example.com\n  |  |  |--serverb.lab.example.com\n  |  |--@db:\n  |  |  |--serverc.lab.example.com',
              fields: [['@prod', 'Parent group created with [prod:children]'], ['@web / @db', 'Child groups and their hosts']]
            },
            {
              title: 'Ad hoc connectivity and privilege test',
              cmd: 'ansible all -m ansible.builtin.command -a "id -un" -b',
              out: 'servera.lab.example.com | CHANGED | rc=0 >>\nroot\nserverc.lab.example.com | UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password).", "unreachable": true}',
              fields: [['CHANGED rc=0 root', 'SSH and sudo work on servera'], ['UNREACHABLE ... publickey', 'SSH key not installed for remote_user on serverc']]
            }
          ],
          walkthrough: [
            'Create `~/project` and write ansible.cfg and inventory as shown; run `ansible --version` from inside it.',
            'Run `ansible-inventory --graph` and fix any group errors.',
            'Bootstrap managed nodes: create the `devops` user, sudoers drop-in, and copy the control node key (`ssh-copy-id devops@node`).',
            'Run `ansible all -m ansible.builtin.ping` and `ansible all -b -m ansible.builtin.command -a "id"`.',
            'Write ansible-navigator.yml with the provided EE image and run `ansible-navigator run -m stdout` on a one-task playbook.',
            'Use `ansible-navigator doc ansible.builtin.user -m stdout` (or `ansible-doc`) to look up options offline.'
          ],
          lab: {
            goal: 'Set up a working Ansible control node project for three RHEL VMs (one control, two managed).',
            steps: [
              'Control node: `sudo dnf install -y ansible-core` (and ansible-navigator if your AAP subscription/lab provides it).',
              'On each managed node: `useradd devops; echo "devops ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/devops; chmod 440 /etc/sudoers.d/devops; visudo -cf /etc/sudoers.d/devops`.',
              'Control node as your user: `ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519; ssh-copy-id devops@node1; ssh-copy-id devops@node2`.',
              'Create ~/project/ansible.cfg (inventory, remote_user=devops, become settings) and ~/project/inventory with groups [dev] node1, [test] node2, [all_servers:children] dev test.',
              'From ~/project: `ansible-inventory --graph; ansible all_servers -m ansible.builtin.ping`.',
              'If navigator and an EE are available: write ansible-navigator.yml and run `ansible-navigator run -m stdout ping.yml`.'
            ],
            verify: '`ansible --version` shows ~/project/ansible.cfg; ping returns `"ping": "pong"` for both nodes; `ansible all -b -a "whoami"` returns root on both.'
          },
          troubleshooting: {
            scenario: 'Playbooks work when run from ~/project but fail with "provided hosts list is empty, only localhost is available" when run from your home directory.',
            steps: [
              'Evidence: `cd ~; ansible --version` shows `config file = /etc/ansible/ansible.cfg` (or None).',
              'Hypothesis: ansible.cfg is found relative to the current directory; from ~ the project config and inventory are not used.',
              'Fix: always run from the project directory, or use `-i ~/project/inventory`, or export ANSIBLE_CONFIG for the session.',
              'Validate: `ansible --version` shows the project config and `ansible-inventory --graph` lists the hosts.'
            ]
          },
          mistakes: [
            'Running from the wrong directory so a different ansible.cfg (or none) is used.',
            'Using `[group:children]` but listing hosts under it instead of group names.',
            'Forgetting `become` and then debugging "permission denied" module failures.',
            'Referencing a vault password file or inventory outside the project directory when using ansible-navigator, which runs inside a container.',
            'Setting `host_key_checking = False` in production; it is a lab convenience, not a security best practice.'
          ],
          safety: [
            'NOPASSWD sudo for an automation account is powerful; restrict who can use the private key and audit its use.',
            'Test new inventories with read-only ad hoc commands (ping, `command -a uptime`) before running changes.',
            'Ad hoc commands with `-m shell` run immediately on many hosts: scope with a group or `--limit`.'
          ],
          distro: 'RHEL 8.6+, 9 and 10 ship `ansible-core` in AppStream (the full "ansible" community package is not in RHEL); additional collections come from Automation Hub, Galaxy or EEs. ansible-navigator is part of AAP. On Debian/Ubuntu, Ansible is installed via apt or pip.',
          challenge: {
            task: 'Create a project at ~/rhce with: inventory groups `dev` (node1), `prod` (node2, node3) and `webservers` containing `prod`; all connections as `devops` with sudo; navigator using EE image `utility.lab.example.com/ee-supported-rhel9:latest` only pulled if missing, stdout mode, and no playbook artifacts. Prove the setup.',
            solution: `${F}
mkdir -p ~/rhce && cd ~/rhce
cat > inventory <<'EOF'
[dev]
node1
[prod]
node2
node3
[webservers:children]
prod
EOF
cat > ansible.cfg <<'EOF'
[defaults]
inventory = ./inventory
remote_user = devops
[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
EOF
cat > ansible-navigator.yml <<'EOF'
---
ansible-navigator:
  execution-environment:
    image: utility.lab.example.com/ee-supported-rhel9:latest
    pull:
      policy: missing
  mode: stdout
  playbook-artifact:
    enable: false
EOF
ansible-inventory --graph
ansible webservers -m ansible.builtin.ping
${F}

**Reasoning:** \`webservers\` must be a parent of \`prod\` via \`:children\`. The graph output proves the structure; the ping proves SSH and Python on the nodes.`
          },
          interview: [
            { q: 'In what order does Ansible look for its configuration file?', a: 'ANSIBLE_CONFIG environment variable, then ansible.cfg in the current directory, then ~/.ansible.cfg, then /etc/ansible/ansible.cfg. Only the first found is used; settings are not merged.', mistake: 'Saying all files are merged.', followUp: 'Why is a world-writable current directory a risk for ansible.cfg?' },
            { q: 'What does ansible-navigator add compared with ansible-playbook?', a: 'It runs content inside an execution environment container so the Ansible version, Python libraries and collections are consistent, offers a TUI to explore runs, docs, collections and inventory, and can save playbook artifacts for replay.', mistake: 'Calling it a GUI replacement for YAML.', followUp: 'What must you consider about file paths when running inside an EE?' },
            { q: 'What does a managed node need for Ansible to work?', a: 'SSH access (usually key-based) for the remote user, a Python interpreter for most modules, and sudo or another become method for privileged tasks. No agent is required.', mistake: 'Saying an Ansible agent must be installed.', followUp: 'Which modules work without Python on the node? (raw, and script to an extent.)' }
          ],
          revision: [
            'EX294: most recent RHEL/AAP, all RHCSA tasks plus Ansible; re-check objectives on redhat.com.',
            'Config precedence: ANSIBLE_CONFIG → ./ansible.cfg → ~/.ansible.cfg → /etc/ansible/ansible.cfg.',
            'ansible-navigator.yml: execution-environment.image, pull.policy, mode stdout, playbook-artifact.enable.',
            'Inventory groups, `:children`, group_vars/host_vars; verify with `ansible-inventory --graph`.',
            'Managed nodes: user + SSH key + sudo; test with `ansible all -m ansible.builtin.ping`.'
          ]
        },
        {
          id: 'L18-M4-T2',
          title: 'Plays and playbooks: modules, variables, facts, register, loops, conditionals, handlers and error handling',
          minutes: 65,
          objectives: [
            'Write valid YAML playbooks using common ansible.builtin modules with FQCNs',
            'Use variables, facts, magic variables and register to make decisions',
            'Apply loops, conditionals and handlers correctly',
            'Handle failure with block/rescue/always, failed_when, changed_when and ignore_errors'
          ],
          prereqs: ['L18-M4-T1'],
          concept: `### Playbook anatomy

${F}
---
- name: Configure web servers
  hosts: webservers
  become: true
  vars:
    web_pkgs:
      - httpd
      - mod_ssl
  tasks:
    - name: Install packages
      ansible.builtin.dnf:
        name: "{{ web_pkgs }}"
        state: present

    - name: Deploy index page
      ansible.builtin.copy:
        content: "Welcome to {{ ansible_facts['fqdn'] }}\\n"
        dest: /var/www/html/index.html
        mode: '0644'
      notify: Restart httpd

    - name: Start and enable httpd
      ansible.builtin.service:
        name: httpd
        state: started
        enabled: true

  handlers:
    - name: Restart httpd
      ansible.builtin.service:
        name: httpd
        state: restarted
${F}

YAML indentation is significant (spaces only). A value that starts with \`{{\` must be quoted.

### Variables and precedence

Variables come from many places; simplified precedence from low to high: role defaults → inventory group_vars → inventory host_vars → play \`vars\` / \`vars_files\` → role vars → task vars → \`set_fact\`/registered vars → **extra vars** (\`-e\`, always win). Put environment data in \`group_vars/\` and \`host_vars/\`.

### Facts and magic variables

**Facts** are gathered by the \`setup\` module at play start (\`gather_facts: true\` by default): \`ansible_facts['distribution']\`, \`['distribution_major_version']\`, \`['default_ipv4']['address']\`, \`['memtotal_mb']\`, \`['devices']\`. Custom facts in \`/etc/ansible/facts.d/*.fact\` on a node appear under \`ansible_facts['ansible_local']\`. **Magic variables** describe Ansible itself: \`inventory_hostname\`, \`group_names\`, \`groups['web']\`, \`hostvars['node1']\`.

### register, loops and conditionals

${F}
- name: Check whether a file exists
  ansible.builtin.stat:
    path: /etc/app.conf
  register: appconf

- name: Create users
  ansible.builtin.user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    append: true
  loop:
    - { name: alice, groups: wheel }
    - { name: bob, groups: devs }

- name: Only on RHEL 9 web hosts when the file is missing
  ansible.builtin.debug:
    msg: "app.conf missing on {{ inventory_hostname }}"
  when:
    - ansible_facts['distribution_major_version'] == "9"
    - "'webservers' in group_names"
    - not appconf.stat.exists
${F}

A list under \`when\` is an implicit AND. \`when\` uses raw Jinja2 expressions without \`{{ }}\`.

### Handlers

A handler runs **once, at the end of the play** (or at \`meta: flush_handlers\`), only if a notifying task reported *changed*. If the play fails before handlers run, they are skipped unless \`force_handlers: true\`.

### Error handling

- \`ignore_errors: true\` continues after a failed task (the task still shows failed).
- \`failed_when:\` / \`changed_when:\` override the module's own verdict (e.g. \`changed_when: false\` for read-only commands).
- \`block\` / \`rescue\` / \`always\` give try/catch/finally semantics.
- \`any_errors_fatal: true\` and \`max_fail_percentage\` stop a rolling change early.`,
          internals: `Ansible processes a play by host and task: with the default \`linear\` strategy each task runs on all hosts (in batches of \`forks\`) before the next task begins. Hosts that fail are removed from the rest of the play. Each module returns JSON; \`register\` stores that whole dictionary (rc, stdout, stdout_lines, changed, failed, plus module-specific keys such as \`stat\`). With \`loop\`, the registered variable contains a \`results\` list with one entry per item.

Idempotent modules (dnf, user, service, copy, template, lineinfile) compare desired and current state and report \`changed\` only when they act; \`command\`/\`shell\` always report changed unless you use \`creates\`, \`removes\` or \`changed_when\`. Handlers are queued by name (or \`listen\` topic) and deduplicated.`,
          useCases: [
            'Installing and configuring a web stack consistently across dozens of hosts',
            'Restarting a service only when its configuration file actually changed',
            'Rolling back gracefully with block/rescue when a deployment step fails'
          ],
          syntax: 'ansible-navigator run site.yml -m stdout [--limit HOST] [-e var=value]\nansible-playbook site.yml --syntax-check | --check --diff | --list-tasks | --start-at-task "NAME"\nansible HOST -m ansible.builtin.setup -a "filter=ansible_default_ipv4"',
          options: [
            ['--syntax-check', 'Parse the playbook without running it'],
            ['--check --diff', 'Dry run showing changes (modules must support check mode)'],
            ['-e / --extra-vars', 'Highest-precedence variables'],
            ['--limit', 'Restrict to a subset of hosts'],
            ['-v / -vvv', 'More verbose output for debugging'],
            ['loop_control: label', 'Shorter per-item output in loops'],
            ['meta: flush_handlers', 'Run pending handlers now instead of at end of play']
          ],
          examples: [
            {
              title: 'Syntax check then run',
              cmd: 'ansible-playbook web.yml --syntax-check && ansible-navigator run web.yml -m stdout',
              out: 'playbook: web.yml\n\nPLAY [Configure web servers] ***\nTASK [Gathering Facts] *** ok: [servera]\nTASK [Install packages] *** changed: [servera]\nTASK [Deploy index page] *** changed: [servera]\nTASK [Start and enable httpd] *** changed: [servera]\nRUNNING HANDLER [Restart httpd] *** changed: [servera]\nPLAY RECAP ***\nservera : ok=5 changed=4 unreachable=0 failed=0 skipped=0 rescued=0 ignored=0',
              fields: [['changed=4', 'First run made changes'], ['RUNNING HANDLER', 'Notified because the copy task changed'], ['failed=0', 'Run succeeded']],
              note: 'A second run should show changed=0: that proves idempotency.'
            },
            {
              title: 'Read a fact before using it',
              cmd: 'ansible servera -m ansible.builtin.setup -a "filter=ansible_default_ipv4"',
              out: 'servera | SUCCESS => {\n    "ansible_facts": {\n        "ansible_default_ipv4": {\n            "address": "172.25.250.10",\n            "interface": "eth0",\n            "gateway": "172.25.250.254"\n        }\n    }\n}',
              fields: [['address', 'Use as ansible_facts[\'default_ipv4\'][\'address\'] in plays'], ['interface', 'Interface carrying the default route']]
            },
            {
              title: 'block / rescue / always',
              cmd: 'cat deploy.yml',
              out: '- name: Update app safely\n  hosts: app\n  tasks:\n    - name: Upgrade with rollback\n      block:\n        - name: Install new version\n          ansible.builtin.dnf:\n            name: myapp-2.0\n            state: present\n      rescue:\n        - name: Report failure\n          ansible.builtin.debug:\n            msg: "Upgrade failed on {{ inventory_hostname }}, keeping old version"\n      always:\n        - name: Make sure the service runs\n          ansible.builtin.service:\n            name: myapp\n            state: started',
              fields: [['block', 'Tasks attempted'], ['rescue', 'Runs only if a block task fails; the host is then not counted as failed'], ['always', 'Runs regardless']]
            }
          ],
          walkthrough: [
            'Write web.yml as in the concept; run `--syntax-check`, then run it, then run it again and confirm changed=0.',
            'Move web_pkgs to group_vars/webservers.yml and override it once with `-e` to see precedence.',
            'Add a stat + register + when combination that creates a file only if missing.',
            'Loop over a list of dictionaries to create users with different groups.',
            'Add `changed_when: false` to a `command: uptime` task and observe the recap.',
            'Wrap a deliberately failing task in block/rescue/always and confirm the recap shows rescued=1.'
          ],
          lab: {
            goal: 'Write a playbook that configures a web server idempotently and handles failures.',
            steps: [
              'In ~/project create group_vars/webservers.yml with `web_port: 80` and `web_message: "Managed by Ansible"`.',
              'Write site.yml: install httpd and firewalld, start/enable both, open service http with ansible.posix.firewalld (permanent: true, immediate: true, state: enabled).',
              'Deploy /var/www/html/index.html with ansible.builtin.copy content including `{{ web_message }}` and `{{ inventory_hostname }}`; notify a handler that restarts httpd.',
              'Add a task with ansible.builtin.uri to http://{{ inventory_hostname }} delegated to localhost and register the result; fail with `failed_when: result.status != 200`.',
              'Run with `ansible-navigator run site.yml -m stdout`, then run again.'
            ],
            verify: 'Second run reports `changed=0` for every host; `curl http://servera` shows the message; the handler appears only on the first run.'
          },
          troubleshooting: {
            scenario: 'A playbook fails immediately with: "ERROR! We were unable to read either as JSON nor YAML ... found unacceptable key (unhashable type: \'dict\')" pointing at `name: {{ pkg }}`.',
            steps: [
              'Evidence: the error line shows an unquoted value starting with `{{`.',
              'Hypothesis: YAML parses `{` as the start of an inline dictionary, so the value must be quoted.',
              'Fix: change to `name: "{{ pkg }}"`.',
              'Validate: `ansible-playbook --syntax-check site.yml` passes and the task runs.'
            ]
          },
          mistakes: [
            'Not quoting values that begin with `{{`.',
            'Using `{{ }}` inside `when:` (it is already a Jinja2 expression; Ansible warns about templating delimiters).',
            'Expecting a handler to run immediately after the task that notifies it.',
            'Using `command`/`shell` when an idempotent module exists, so every run reports changed.',
            'Testing a registered loop result as if it were a single result (it has a `results` list).'
          ],
          safety: [
            'Use `--check --diff` and `--limit` on a canary host before a fleet-wide run.',
            'ignore_errors can hide real failures; prefer explicit failed_when or block/rescue.',
            'Privileged tasks run as root on every targeted host; review host patterns carefully.'
          ],
          distro: 'Module names use FQCNs (ansible.builtin.*, ansible.posix.*, community.general.*). ansible-core 2.14+ is in RHEL 9; RHEL 10 ships a newer ansible-core. Modules such as ansible.builtin.dnf work on RHEL; on Debian/Ubuntu use ansible.builtin.apt or the generic ansible.builtin.package.',
          challenge: {
            task: 'Write a playbook that, on hosts in `dev`, creates users from a variable list (name, uid) only if the host has more than 1 GiB RAM; otherwise print a message. Ensure it is idempotent and reports a clear failure if user creation fails on any host.',
            solution: `${F}
---
- name: Create users on capable hosts
  hosts: dev
  become: true
  vars:
    new_users:
      - { name: ana, uid: 3001 }
      - { name: raj, uid: 3002 }
  tasks:
    - name: Create users
      when: ansible_facts['memtotal_mb'] > 1024
      block:
        - name: Ensure users exist
          ansible.builtin.user:
            name: "{{ item.name }}"
            uid: "{{ item.uid }}"
            state: present
          loop: "{{ new_users }}"
      rescue:
        - name: Report failure
          ansible.builtin.fail:
            msg: "User creation failed on {{ inventory_hostname }}"

    - name: Too little memory
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} has only {{ ansible_facts['memtotal_mb'] }} MB"
      when: ansible_facts['memtotal_mb'] <= 1024
${F}

**Reasoning:** \`when\` on a block applies to every task inside it. The user module is idempotent; the rescue converts any failure into an explicit, readable fail message.`
          },
          interview: [
            { q: 'When does a handler run, and what if the play fails before then?', a: 'Handlers run once at the end of the play (or at meta: flush_handlers) if any notifying task reported changed. If a later task fails on that host, its pending handlers do not run unless force_handlers is set, which can leave config changed but the service not restarted.', mistake: 'Saying handlers run immediately after the task.', followUp: 'How would you guarantee a restart before a later verification task?' },
            { q: 'What is the highest-precedence variable source?', a: 'Extra vars passed with -e on the command line override everything else.', mistake: 'Saying host_vars.', followUp: 'Where should environment-specific values live instead?' },
            { q: 'How do you make a command task idempotent?', a: 'Prefer a dedicated module. If command is required, use creates/removes so it only runs when needed, and changed_when to report change accurately (e.g. changed_when: false for read-only checks).', mistake: 'Saying ignore_errors makes it idempotent.', followUp: 'What does `failed_when` do?' }
          ],
          revision: [
            'Playbook = plays (hosts, become, vars, tasks, handlers); quote values starting with `{{`.',
            'Extra vars win; role defaults lose; use group_vars/host_vars for data.',
            'Facts: `ansible_facts[...]`; magic vars: inventory_hostname, group_names, groups, hostvars.',
            '`register` + `when`; loops with `loop`; looped registers have `.results`.',
            'Handlers run at end of play when notified by a changed task.',
            'block/rescue/always, failed_when, changed_when, ignore_errors (sparingly).'
          ]
        }
      ]
    },
    {
      id: 'L18-M5',
      title: 'RHCE: advanced automation',
      summary: 'Jinja2 templates, roles, Content Collections and Ansible Vault; automating RHCSA tasks idempotently, troubleshooting automation, Git basics and an RHCE revision plan.',
      lessons: [
        {
          id: 'L18-M5-T1',
          title: 'Templates, roles, Content Collections and Ansible Vault',
          minutes: 65,
          objectives: [
            'Generate configuration files from Jinja2 templates using variables, facts, loops and conditionals',
            'Create roles with ansible-galaxy and install roles from a requirements file',
            'Install Content Collections and use their modules with FQCNs',
            'Protect secrets with Ansible Vault and run vaulted playbooks'
          ],
          prereqs: ['L18-M4-T2'],
          concept: `### Jinja2 templates

The \`ansible.builtin.template\` module renders a **Jinja2** file on the control node and copies the result to the managed node. \`{{ expr }}\` outputs a value, \`{% ... %}\` is a statement (for/if), \`{# ... #}\` is a comment. Filters transform values: \`{{ name | upper }}\`, \`{{ port | default(80) }}\`, \`{{ list | join(',') }}\`.

A classic exam-style template that builds /etc/hosts from inventory facts:

${F}
# {{ ansible_managed }}
127.0.0.1 localhost localhost.localdomain
{% for host in groups['all'] %}
{{ hostvars[host]['ansible_facts']['default_ipv4']['address'] }} {{ hostvars[host]['ansible_facts']['fqdn'] }} {{ hostvars[host]['ansible_facts']['hostname'] }}
{% endfor %}
${F}

Facts for other hosts exist only if they were gathered in the same run, so the play must target all those hosts (or gather facts for them first).

### Roles

A **role** packages tasks, handlers, templates, files, variables and metadata in a standard layout so it can be reused:

${F}
roles/apache/
  defaults/main.yml   # lowest-precedence defaults, meant to be overridden
  vars/main.yml       # higher-precedence role variables
  tasks/main.yml
  handlers/main.yml
  templates/  files/  meta/main.yml
${F}

Create one with \`ansible-galaxy role init roles/apache\`. Use it in a play with \`roles:\` (runs before \`tasks:\`) or dynamically with \`ansible.builtin.import_role\` / \`include_role\`. Install external roles from a requirements file:

${F}
# roles/requirements.yml
- name: phpinfo
  src: http://materials.example.com/phpinfo.tar.gz
${F}

\`ansible-galaxy role install -r roles/requirements.yml -p roles\`.

### Content Collections

A **collection** distributes modules, roles, plugins and docs under a namespace (e.g. \`ansible.posix\`, \`community.general\`, \`redhat.rhel_system_roles\`). Install from Automation Hub, Galaxy, a private hub or a tarball:

${F}
# collections/requirements.yml
---
collections:
  - name: ansible.posix
  - name: http://materials.example.com/community-general-9.0.0.tar.gz
    type: url
${F}

\`ansible-galaxy collection install -r collections/requirements.yml -p collections\`. List with \`ansible-galaxy collection list\` or \`ansible-navigator collections\`. Make sure \`collections_path\` in ansible.cfg includes the directory. **RHEL System Roles** (package \`rhel-system-roles\` or the \`redhat.rhel_system_roles\` collection) provide supported roles for timesync, selinux, storage, network, firewall and more.

### Ansible Vault

**Vault** encrypts files (AES256) so secrets can live in version control.

${F}
ansible-vault create group_vars/all/vault.yml
ansible-vault edit | view | encrypt | decrypt | rekey FILE
ansible-playbook site.yml --ask-vault-pass
ansible-playbook site.yml --vault-password-file vault-pass.txt
${F}

You can also set \`vault_password_file\` in ansible.cfg. With ansible-navigator the password file must be accessible inside the execution environment (keep it in the project directory, mode 600, and never commit it). A common pattern keeps the encrypted \`vault_db_password\` in one file and references it from a plain variable \`db_password: "{{ vault_db_password }}"\` so variables remain discoverable.`,
          internals: `Templates are rendered on the control node using all variables available for the target host, then transferred like \`copy\`; \`ansible_managed\` is a configurable header string. The template module compares checksums and reports changed only when the rendered result differs.

Role loading: Ansible searches roles_path, the playbook's roles/ directory and installed collections. \`roles:\` and \`import_role\` are static (parsed at playbook load), \`include_role\` is dynamic (evaluated at run time, so it can be looped or conditional).

Collections are directories \`ansible_collections/<namespace>/<name>/\` on the collections path; FQCNs resolve through them. A vault file begins with \`$ANSIBLE_VAULT;1.1;AES256\`; Ansible decrypts it in memory at load time using a key derived from the password (PBKDF2), so plaintext is not written to disk on the control node.`,
          useCases: [
            'Rendering per-host configuration (MOTD, hosts files, application configs) from one template',
            'Sharing a hardened baseline role across teams via a private Automation Hub',
            'Keeping database passwords encrypted in Git while CI runs the playbooks'
          ],
          syntax: 'ansible-galaxy role init roles/NAME | ansible-galaxy role install -r roles/requirements.yml -p roles\nansible-galaxy collection install NAME|URL|TARBALL -p collections | ansible-galaxy collection list\nansible-navigator collections -m stdout\nansible-vault create|edit|view|encrypt|decrypt|rekey FILE\nansible-playbook site.yml --vault-password-file FILE | --ask-vault-pass',
          options: [
            ['-p PATH', 'ansible-galaxy: install into this path (match roles_path / collections_path)'],
            ['-r FILE', 'Install everything listed in a requirements file'],
            ['--force', 'Reinstall even if already present'],
            ['--ask-vault-pass', 'Prompt for the vault password'],
            ['--vault-id label@source', 'Use labelled vault IDs for multiple passwords'],
            ['| default(value)', 'Jinja2 filter: fallback when a variable is undefined'],
            ['lstrip_blocks / trim_blocks', 'Template whitespace control options']
          ],
          examples: [
            {
              title: 'Rendered hosts file',
              cmd: 'ansible all -m ansible.builtin.command -a "cat /etc/myhosts" --limit servera',
              out: 'servera | CHANGED | rc=0 >>\n# Ansible managed\n127.0.0.1 localhost localhost.localdomain\n172.25.250.10 servera.lab.example.com servera\n172.25.250.11 serverb.lab.example.com serverb',
              fields: [['# Ansible managed', 'Header from {{ ansible_managed }}'], ['one line per host', 'Generated by the for loop over groups[\'all\']']]
            },
            {
              title: 'Install collections from a requirements file',
              cmd: 'ansible-galaxy collection install -r collections/requirements.yml -p collections',
              out: 'Starting galaxy collection install process\nProcess install dependency map\nInstalling \'ansible.posix:1.5.4\' to \'/home/student/project/collections/ansible_collections/ansible/posix\'\nansible.posix:1.5.4 was installed successfully',
              fields: [['ansible_collections/ansible/posix', 'namespace/name layout under the -p path'], ['1.5.4', 'Version installed (representative)']],
              note: 'A warning that the path is not in the configured collections path means ansible.cfg collections_path is missing or wrong.'
            },
            {
              title: 'A vault-encrypted file',
              cmd: 'head -2 group_vars/all/vault.yml',
              out: '$ANSIBLE_VAULT;1.1;AES256\n62313365396662343061393464336163383764373764613633653634306231386433626436623361',
              fields: [['$ANSIBLE_VAULT;1.1;AES256', 'Vault format version and cipher'], ['hex lines', 'Encrypted payload']]
            }
          ],
          walkthrough: [
            'Write templates/motd.j2 using facts and a default() filter; deploy it with ansible.builtin.template.',
            'Create a role with `ansible-galaxy role init roles/apache`, move your web tasks and handler into it, and call it from a play.',
            'Write roles/requirements.yml and collections/requirements.yml; install both into the project with -p.',
            'Use a module from an installed collection (e.g. ansible.posix.firewalld) and confirm with `ansible-navigator doc` or `ansible-doc`.',
            'Create an encrypted vault file with a password variable and use it to set a user password via `password_hash(\'sha512\')`.',
            'Run with `--vault-password-file` and confirm the plaintext never appears in output (use `no_log: true` where appropriate).'
          ],
          lab: {
            goal: 'Build a role-based project that uses a collection, a template and a vaulted secret.',
            steps: [
              '`ansible-galaxy role init roles/webapp`; in roles/webapp/defaults/main.yml set `webapp_port: 80`.',
              'roles/webapp/templates/index.html.j2: `Host {{ ansible_facts[\'hostname\'] }} on {{ ansible_facts[\'default_ipv4\'][\'address\'] }} port {{ webapp_port }}`; tasks install httpd, template index.html, start/enable httpd.',
              'collections/requirements.yml with ansible.posix; install it with `ansible-galaxy collection install -r collections/requirements.yml -p collections`; add a task using ansible.posix.firewalld to open http.',
              '`ansible-vault create vars/secret.yml` containing `app_user_pass: S3cret!`; `echo "vaultpw" > vault-pass.txt; chmod 600 vault-pass.txt`.',
              'In site.yml load vars/secret.yml with vars_files and create user `appuser` with `password: "{{ app_user_pass | password_hash(\'sha512\') }}"` and `no_log: true`.',
              'Run `ansible-playbook site.yml --vault-password-file vault-pass.txt` (or with navigator if your EE has the collections).'
            ],
            verify: '`curl http://servera` shows the hostname and IP; `ansible-vault view vars/secret.yml --vault-password-file vault-pass.txt` shows the secret while `cat` shows ciphertext; `ssh appuser@servera` works with the vaulted password; a second run reports changed=0 for the template task.'
          },
          troubleshooting: {
            scenario: 'A play using `ansible.posix.firewalld` fails with "couldn\'t resolve module/action \'ansible.posix.firewalld\'".',
            steps: [
              'Evidence: `ansible-galaxy collection list` does not show ansible.posix in any path Ansible searches; ansible.cfg has `collections_path = ./collection` (typo).',
              'Hypothesis: the collection was installed into ./collections but the configured path differs, or it was never installed for this execution environment.',
              'Fix: correct collections_path (or reinstall with -p matching it); with navigator, confirm the EE contains it (`ansible-navigator collections -m stdout`).',
              'Validate: `ansible-doc ansible.posix.firewalld` works and the play runs.'
            ]
          },
          mistakes: [
            'Building a hosts template from hostvars of hosts that were not in the play, so their facts are undefined.',
            'Putting overridable values in role vars/ instead of defaults/, making them hard to override from inventory.',
            'Installing collections to a path that is not in collections_path.',
            'Committing the vault password file to Git, defeating the encryption.',
            'Logging secrets: forgetting no_log on tasks that handle passwords.'
          ],
          safety: [
            'Vault encrypts at rest only; anyone with the password can decrypt. Store the password in a secret manager and restrict file modes.',
            'Templates overwrite target files completely; use `backup: true` on the template task for important configs.',
            'Only install collections and roles from trusted sources (Automation Hub, validated content, internal hub).'
          ],
          distro: 'RHEL provides supported content via Automation Hub and `rhel-system-roles`. `ansible-galaxy role init` is the current form (plain `ansible-galaxy init` still works). On older Ansible the setting was `collections_paths` (plural); current ansible-core uses `collections_path`.',
          challenge: {
            task: 'Create a role `motd` that writes /etc/motd as "Welcome to HOSTNAME (ENVIRONMENT)" where ENVIRONMENT comes from a role default `motd_env: development`, overridden to `production` for the prod group via group_vars. Use it in a playbook for all hosts.',
            solution: `${F}
ansible-galaxy role init roles/motd
echo 'motd_env: development' >> roles/motd/defaults/main.yml
cat > roles/motd/templates/motd.j2 <<'EOF'
Welcome to {{ ansible_facts['hostname'] }} ({{ motd_env }})
EOF
cat > roles/motd/tasks/main.yml <<'EOF'
---
- name: Deploy motd
  ansible.builtin.template:
    src: motd.j2
    dest: /etc/motd
    owner: root
    group: root
    mode: '0644'
EOF
mkdir -p group_vars && echo 'motd_env: production' > group_vars/prod.yml
cat > motd.yml <<'EOF'
---
- name: Apply motd role
  hosts: all
  become: true
  roles:
    - motd
EOF
ansible-navigator run motd.yml -m stdout
${F}

**Reasoning:** role defaults have the lowest precedence, so inventory group_vars for prod override them while other hosts keep the default.`
          },
          interview: [
            { q: 'What is the difference between role defaults and role vars?', a: 'defaults/main.yml has the lowest precedence and is meant to be overridden by inventory or play variables; vars/main.yml has high precedence and is for values the role needs fixed.', mistake: 'Saying they are interchangeable.', followUp: 'Where would you put a port number users should change?' },
            { q: 'What is a Content Collection and why use FQCNs?', a: 'A distributable bundle of modules, plugins, roles and docs under a namespace.name. FQCNs make it explicit which collection a module comes from, avoid name clashes and make playbooks portable across EEs.', mistake: 'Calling collections just "a folder of roles".', followUp: 'How do you install a collection from a tarball URL?' },
            { q: 'How do you use a vaulted variable without hiding the variable name?', a: 'Store `vault_db_pass` encrypted in a vault file and define `db_pass: "{{ vault_db_pass }}"` in a plain vars file, so readers can grep for db_pass while the value stays encrypted.', mistake: 'Encrypting entire inventories, making them unreadable.', followUp: 'How do you change the vault password on existing files? (ansible-vault rekey)' }
          ],
          revision: [
            'Template: `{{ }}` values, `{% for/if %}`, filters (default, join, upper); ansible_managed header.',
            'hosts-file templates need facts for every host in groups[\'all\'].',
            'Role layout: defaults (low precedence), vars (high), tasks, handlers, templates, files, meta.',
            '`ansible-galaxy role|collection install -r requirements.yml -p path`; match roles_path/collections_path.',
            'Vault: create/edit/view/encrypt/decrypt/rekey; --vault-password-file or --ask-vault-pass; no_log for secrets.'
          ]
        },
        {
          id: 'L18-M5-T2',
          title: 'Automating RHCSA tasks, idempotency, troubleshooting, Git basics and an RHCE revision plan',
          minutes: 70,
          objectives: [
            'Automate packages and repositories, services, firewall, storage, file content, archives, scheduling, SELinux and users with modules',
            'Design and verify idempotent playbooks',
            'Troubleshoot automation failures from output, verbosity and check mode',
            'Use basic Git (clone, add, commit) and follow a timed RHCE revision plan'
          ],
          prereqs: ['L18-M5-T1', 'L18-M3-T2'],
          concept: `EX294 expects you to automate the same tasks you perform manually for RHCSA. The skill is choosing the right **idempotent module**: a module that checks current state and only changes what differs, so running a playbook twice produces no changes the second time.

### Module map for RHCSA tasks

| Task | Module (FQCN) |
|---|---|
| Repositories | \`ansible.builtin.yum_repository\`, \`ansible.builtin.rpm_key\` |
| Packages | \`ansible.builtin.dnf\` (or \`package\`) |
| Services / timers | \`ansible.builtin.service\`, \`ansible.builtin.systemd_service\` |
| Firewall | \`ansible.posix.firewalld\` |
| Partitions / LVM / FS | \`community.general.parted\`, \`community.general.lvg\`, \`community.general.lvol\`, \`community.general.filesystem\`, \`ansible.posix.mount\` |
| File content | \`ansible.builtin.copy\`, \`template\`, \`lineinfile\`, \`blockinfile\`, \`file\` |
| Archiving | \`community.general.archive\`, \`ansible.builtin.unarchive\` |
| Scheduling | \`ansible.builtin.cron\`, \`ansible.posix.at\` |
| SELinux | \`ansible.posix.selinux\`, \`ansible.posix.seboolean\`, \`community.general.sefcontext\`, \`community.general.seport\` |
| Users / groups / keys | \`ansible.builtin.user\`, \`group\`, \`ansible.posix.authorized_key\` |

(The table renders as plain lines in this app; read it as task → module.) **RHEL System Roles** (e.g. \`redhat.rhel_system_roles.timesync\`, \`.selinux\`, \`.storage\`) are an alternative for several of these.

Example: a repository plus a package plus a firewall rule:

${F}
- name: Configure repo, package and firewall
  hosts: dev
  become: true
  tasks:
    - name: BaseOS repo
      ansible.builtin.yum_repository:
        name: baseos-internal
        description: Internal BaseOS
        baseurl: http://content.example.com/rhel9/BaseOS
        gpgcheck: true
        gpgkey: http://content.example.com/RPM-GPG-KEY-redhat-release
        enabled: true
    - name: Install chrony
      ansible.builtin.dnf:
        name: chrony
        state: present
    - name: Allow NTP
      ansible.posix.firewalld:
        service: ntp
        permanent: true
        immediate: true
        state: enabled
${F}

### Idempotency checks

Run every playbook twice; the second recap must show \`changed=0\`. Avoid \`command\`/\`shell\` for things modules can do; if you must, add \`creates:\`, \`removes:\` or \`changed_when:\`. Use \`--check --diff\` to preview changes.

### Troubleshooting automation

Read the failing task's message first; then increase verbosity (\`-v\` to \`-vvvv\` for connection issues); use \`ansible.builtin.debug: var=result\` to inspect registered data; \`--start-at-task\` and \`--step\` to iterate; \`ansible-navigator run -m interactive\` to drill into a replayed run. Typical root causes: YAML indentation, unquoted \`{{\`, wrong FQCN or missing collection, undefined variable, missing become, wrong host pattern.

### Git basics and VS Code

Exam objectives list basic Git: \`git clone URL\`, \`git add FILE\`, \`git commit -m "msg"\`, \`git status\`, \`git log --oneline\`, \`git push\`. Set identity once with \`git config --global user.name\` / \`user.email\`. VS Code with the Ansible and YAML extensions gives linting and autocompletion; familiarity is listed, but do not depend on a GUI you have not practised with.

### RHCE revision plan (suggested; re-check the official objectives first)

1. **Week 1**: control node setup from scratch (ansible.cfg, navigator config, inventory, managed node bootstrap) until you can do it in under 15 minutes.
2. **Week 2**: one playbook per RHCSA area (repo/packages, services, firewall, storage, users, SELinux, cron, archive, file content), each run twice for idempotency.
3. **Week 3**: templates (hosts file, MOTD), roles (create + install from requirements), collections from tarball/hub, vault with password file.
4. **Week 4**: timed full-practice exams (about 15-20 tasks in the official duration; check redhat.com), then fix every weak area. Practise with both ansible-navigator and ansible-playbook.

Exam-time habits: keep \`ansible-doc\`/\`ansible-navigator doc\` open for module options; build playbooks incrementally with \`--syntax-check\`; re-run everything at the end to prove idempotency.`,
          internals: `Idempotency is implemented inside each module: e.g. \`lineinfile\` reads the file, searches for the regexp, and only writes if the result differs; \`community.general.lvol\` compares requested size with the current LV size; \`ansible.posix.mount\` with \`state: mounted\` both writes fstab and mounts, while \`state: present\` only edits fstab.

Check mode passes \`_ansible_check_mode\` to modules; modules that support it report what would change without changing it; \`command\` and \`shell\` skip unless \`check_mode: false\`.

Git stores content as objects (blobs, trees, commits) in .git; \`git add\` stages a snapshot in the index and \`git commit\` records it with your identity. Remote collaboration (clone/push) moves those objects over HTTPS or SSH.`,
          useCases: [
            'Converting a manual RHCSA build checklist into a single repeatable playbook stored in Git',
            'Detecting configuration drift by running playbooks in check mode on a schedule',
            'Delegating storage expansion to a role so operators do not run LVM commands by hand'
          ],
          syntax: 'ansible-playbook site.yml --check --diff | -vvv | --start-at-task "NAME" | --step\nansible-navigator run site.yml -m stdout | -m interactive\nansible-doc community.general.lvol | ansible-navigator doc ansible.posix.mount -m stdout\ngit clone URL | git add FILE | git commit -m MSG | git status | git push',
          options: [
            ['state: mounted (ansible.posix.mount)', 'Add to fstab AND mount now'],
            ['state: present (ansible.posix.mount)', 'Only add to fstab'],
            ['creates: PATH', 'command/shell: skip if PATH exists (idempotency)'],
            ['changed_when: false', 'Report a read-only task as unchanged'],
            ['--check --diff', 'Preview changes with file diffs'],
            ['-vvvv', 'Maximum verbosity including SSH connection debugging'],
            ['git add -A', 'Stage all changes including deletions']
          ],
          examples: [
            {
              title: 'Storage with community.general modules',
              cmd: 'cat storage.yml',
              out: '- name: Create LV and mount it\n  hosts: db\n  become: true\n  tasks:\n    - name: VG on /dev/vdb\n      community.general.lvg:\n        vg: vgdata\n        pvs: /dev/vdb\n    - name: 1 GiB LV\n      community.general.lvol:\n        vg: vgdata\n        lv: lvdb\n        size: 1g\n    - name: XFS file system\n      community.general.filesystem:\n        fstype: xfs\n        dev: /dev/vgdata/lvdb\n    - name: Mount persistently\n      ansible.posix.mount:\n        path: /db\n        src: /dev/vgdata/lvdb\n        fstype: xfs\n        state: mounted',
              fields: [['lvg/lvol', 'Idempotent LVM'], ['filesystem', 'Creates FS only if none exists (does not reformat without force)'], ['state: mounted', 'fstab + mount']],
              note: 'For exam tasks that say "if the VG does not exist, print a message", use a `when: "\'vgdata\' in ansible_facts[\'lvm\'][\'vgs\']"` style test (facts include an lvm key when lvm2 is installed).'
            },
            {
              title: 'Proving idempotency',
              cmd: 'ansible-navigator run site.yml -m stdout | tail -3',
              out: 'PLAY RECAP *********\nservera : ok=12 changed=0 unreachable=0 failed=0 skipped=1 rescued=0 ignored=0\nserverb : ok=12 changed=0 unreachable=0 failed=0 skipped=1 rescued=0 ignored=0',
              fields: [['changed=0', 'Second run made no changes: idempotent'], ['skipped=1', 'A conditional task did not apply']]
            },
            {
              title: 'Commit the project to Git',
              cmd: 'git clone http://git.example.com/rhce.git; cd rhce; cp ../site.yml .; git add site.yml; git commit -m "Add site playbook"; git log --oneline -1',
              out: 'Cloning into \'rhce\'...\n[main 3f2a9c1] Add site playbook\n 1 file changed, 42 insertions(+)\n3f2a9c1 (HEAD -> main) Add site playbook',
              fields: [['3f2a9c1', 'Abbreviated commit hash'], ['1 file changed', 'Staged content recorded']]
            }
          ],
          walkthrough: [
            'Automate a yum_repository + dnf + service + firewalld chain and run it twice.',
            'Automate storage with lvg/lvol/filesystem/mount, including a `when` that skips hosts without /dev/vdb (`ansible_facts[\'devices\']`).',
            'Automate cron, an archive of /etc with community.general.archive, and a lineinfile change to /etc/ssh/sshd_config.d/ with a handler to reload sshd.',
            'Automate SELinux: ensure enforcing with ansible.posix.selinux, a boolean with ansible.posix.seboolean, and a file context with community.general.sefcontext + a restorecon command guarded by a handler.',
            'Break a playbook on purpose (bad indentation, wrong FQCN, undefined variable) and diagnose each from the error.',
            'Initialise or clone a Git repo, add your playbooks, commit and push.'
          ],
          lab: {
            goal: 'Build an idempotent "RHCSA baseline" playbook and store it in Git.',
            steps: [
              'Create baseline.yml for all hosts: install chrony and tuned; template /etc/chrony.conf with your NTP server; notify a chronyd restart handler; ensure tuned profile via `command: tuned-adm profile virtual-guest` guarded by a `command: tuned-adm active` register and `when` (or use changed_when).',
              'Add users from a vaulted list with ansible.builtin.user and a sudoers drop-in with ansible.builtin.copy + `validate: /usr/sbin/visudo -cf %s`.',
              'Add a cron job with ansible.builtin.cron (name, minute, hour, job) and a weekly archive with community.general.archive to /root/etc.tar.gz.',
              'Add firewalld rules and SELinux enforcing via ansible.posix modules.',
              'Run twice; the second recap must show changed=0. Fix any task that reports change.',
              '`git init` (or clone the provided repo), `git add baseline.yml templates/ group_vars/`, `git commit -m "RHCSA baseline"`.'
            ],
            verify: 'Second run `changed=0` on all hosts; `chronyc sources` on a node shows your server; `crontab -l` shows the Ansible-managed entry (`#Ansible: <name>` comment); `git log --oneline` shows the commit; the vault password file is not tracked (`git status --ignored`).'
          },
          troubleshooting: {
            scenario: 'Every run reports `changed` for the task `Set tuned profile` (`ansible.builtin.command: tuned-adm profile virtual-guest`), breaking the idempotency requirement.',
            steps: [
              'Evidence: the recap always shows changed=1; the task uses command with no guard.',
              'Hypothesis: command always reports changed because Ansible cannot know whether the profile was already active.',
              'Fix: register `tuned-adm active` with `changed_when: false`, then run the profile command only `when: "\'virtual-guest\' not in current.stdout"`.',
              'Validate: the second run shows the profile task skipped and changed=0.'
            ]
          },
          mistakes: [
            'Using shell for everything: works once, fails the idempotency check.',
            'Using `ansible.posix.mount state: present` and expecting the file system to be mounted now.',
            'Forgetting to install community.general or ansible.posix, or using short module names that resolve differently.',
            'Committing vault password files or secrets to Git; add them to .gitignore.',
            'Not re-running all playbooks at the end of a practice exam, missing a broken earlier task.'
          ],
          safety: [
            'Storage modules (parted, filesystem with force, lvol shrink) can destroy data; guard with `when` conditions on device existence and never use force without a reason.',
            'Run `--check --diff --limit canary` before fleet-wide changes, and commit to Git so changes can be reverted.',
            'validate: with copy/template for sudoers and sshd configs prevents deploying a file that locks you out.'
          ],
          distro: 'community.general and ansible.posix are not part of ansible-core; on RHEL they come from Automation Hub collections, EEs or RHEL System Roles dependencies. Module behaviour is the same on RHEL 9 and 10 managed nodes; Debian/Ubuntu nodes need apt-specific modules for packages.',
          challenge: {
            task: 'Write `cron_and_archive.yml` that on all `prod` hosts: (1) creates user `backup` with UID 5000, (2) adds a cron job for `backup` running `/usr/local/bin/backup.sh` at 01:15 daily, (3) archives /etc into /var/backups/etc.tar.bz2 owned by backup, and (4) is idempotent. Then commit it to Git.',
            solution: `${F}
---
- name: Backup user, cron and archive
  hosts: prod
  become: true
  tasks:
    - name: Backup user
      ansible.builtin.user:
        name: backup
        uid: 5000
        state: present
    - name: Backup directory
      ansible.builtin.file:
        path: /var/backups
        state: directory
        owner: backup
        mode: '0750'
    - name: Daily cron
      ansible.builtin.cron:
        name: nightly backup
        user: backup
        minute: "15"
        hour: "1"
        job: /usr/local/bin/backup.sh
    - name: Archive /etc
      community.general.archive:
        path: /etc
        dest: /var/backups/etc.tar.bz2
        format: bz2
        owner: backup
        mode: '0640'
${F}

${F}
ansible-navigator run cron_and_archive.yml -m stdout   # run twice
git add cron_and_archive.yml && git commit -m "Add backup automation"
${F}

**Reasoning:** cron's \`name\` makes the entry idempotent (Ansible tracks it by the \`#Ansible: nightly backup\` marker). Note: \`archive\` re-creates the archive when source files change, so a strictly unchanged second run depends on /etc being unchanged between runs.`
          },
          interview: [
            { q: 'What makes an Ansible task idempotent, and how do you prove it?', a: 'The module checks current state and only acts if it differs from the desired state. Prove it by running the playbook twice: the second run should report changed=0. Use check/diff mode to preview.', mistake: 'Equating idempotent with "does not fail".', followUp: 'How would you make a shell task idempotent?' },
            { q: 'A play fails with "couldn\'t resolve module/action". What are the likely causes?', a: 'The collection providing the module is not installed in a searched path (or not in the EE), the FQCN is misspelled, or collections_path points elsewhere. Check with ansible-galaxy collection list or ansible-navigator collections.', mistake: 'Reinstalling ansible-core.', followUp: 'How do you install a collection from a URL in a requirements file?' },
            { q: 'Why keep automation in Git?', a: 'History and review of every change, the ability to roll back, collaboration through branches and merge requests, and a single source of truth that CI/AAP can pull from.', mistake: 'Treating Git only as a backup.', followUp: 'What must never be committed?' }
          ],
          revision: [
            'Map each RHCSA task to an idempotent module; know ansible.posix and community.general names.',
            'Run twice: second run changed=0. Guard command/shell with creates/removes/changed_when.',
            'mount: state mounted = fstab + mount; present = fstab only.',
            'Troubleshoot: read the message, -vvv, debug registered vars, --syntax-check, --check --diff.',
            'Git: clone, add, commit -m, status, log, push; never commit vault passwords.',
            'Revision: setup speed, one playbook per RHCSA area, templates/roles/collections/vault, timed mocks; re-check objectives on redhat.com.'
          ]
        }
      ]
    }
  ]
};
