// Level 18: RHCSA (EX200, RHEL 10) and RHCE (EX294, Ansible) preparation question bank.
// M1-M3 questions are tagged 'rhcsa'; M4-M5 questions are tagged 'rhce' (used to build mock exams).
export default {
  'L18-M1-T1': [
    {
      d: 'b', t: 'concept',
      q: 'Which statement about hard links and symbolic links on an XFS file system is correct?',
      o: ['A symbolic link shares the inode of its target, so deleting the target leaves the link working', 'A hard link can point to a directory and across file systems', 'A hard link is another directory entry for the same inode, so the data survives until the last link is removed', 'Creating a hard link copies the file data into a new inode'],
      a: [2],
      e: 'A hard link is simply another name (directory entry) for an existing inode; the link count drops as names are removed and the data is freed only when it reaches zero. Hard links cannot cross file systems and cannot normally point to directories.',
      w: ['That describes a hard link. A symbolic link has its own inode that stores a path; if the target is removed the symlink dangles.', 'Hard links are limited to one file system and directories cannot be hard-linked by users; symbolic links can do both.', '', 'No data is copied; both names refer to the same inode and the link count increases by one.'],
      c: 'ln / ln -s', s: 'Distinguish hard and symbolic links', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'You must create a bzip2-compressed tar archive of /etc named /root/etc.tar.bz2. Which command does this?',
      o: ['tar -cjf /root/etc.tar.bz2 /etc', 'tar -czf /root/etc.tar.bz2 /etc', 'tar -xjf /root/etc.tar.bz2 /etc', 'bzip2 -r /etc > /root/etc.tar.bz2'],
      a: [0],
      e: '-c creates an archive, -j filters it through bzip2 and -f names the archive file. Use -z for gzip and -J for xz.',
      w: ['', '-z produces gzip compression, so the file name would lie about its format.', '-x extracts an existing archive rather than creating one.', 'bzip2 compresses individual files in place and does not build a tar archive; -r is not a bzip2 recursion option.'],
      c: 'tar -cjf', s: 'Create compressed archives', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'You want the normal output of find saved to /root/found.txt while error messages such as Permission denied are discarded. Which command line is correct?',
      o: ['find / -name core 2>&1 > /root/found.txt', 'find / -name core | /root/found.txt 2>/dev/null', 'find / -name core &> /root/found.txt', 'find / -name core > /root/found.txt 2>/dev/null'],
      a: [3],
      e: '> redirects file descriptor 1 (stdout) to the file and 2>/dev/null sends file descriptor 2 (stderr) to /dev/null.',
      w: ['2>&1 is evaluated first and points stderr at the terminal (where stdout pointed at that moment), so errors still appear on screen and nothing is discarded.', 'A pipe sends output to a command, not to a file; the shell would try to execute /root/found.txt.', '&> sends both stdout and stderr into the file, which is the opposite of discarding errors.', ''],
      c: 'I/O redirection', s: 'Redirect stdout and stderr separately', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`$ ls -li /srv/a.txt /srv/b.txt`\n`50331781 -rw-r--r--. 2 root root 120 Oct  9 10:02 /srv/a.txt`\n`50331781 -rw-r--r--. 2 root root 120 Oct  9 10:02 /srv/b.txt`\nWhat does this output show?',
      o: ['b.txt is a symbolic link to a.txt', 'a.txt and b.txt are hard links to the same inode', 'b.txt is an independent copy made with cp -a', 'Both files are open by two processes'],
      a: [1],
      e: 'Both names share inode 50331781 and the link count column shows 2, which is the signature of two hard links to the same file.',
      w: ['A symbolic link would show an l file type, its own inode number and an arrow to the target.', '', 'A copy, even with cp -a, gets a new inode and a link count of 1.', 'The second column is the hard link count, not the number of open file handles.'],
      c: 'ls -li', s: 'Interpret inode numbers and link counts', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: 'You must save every line of /etc/passwd that begins with root into /root/root-lines.txt. The command `grep \'^root$\' /etc/passwd > /root/root-lines.txt` produces an empty file. Which command fixes it?',
      o: ['grep -v \'^root\' /etc/passwd > /root/root-lines.txt', 'grep \'root$\' /etc/passwd > /root/root-lines.txt', 'grep \'^root\' /etc/passwd > /root/root-lines.txt', 'grep -x root /etc/passwd > /root/root-lines.txt'],
      a: [2],
      e: '^root$ requires the whole line to be exactly root, which never happens in /etc/passwd. ^root anchors only the start of the line, matching root:x:0:0:... (and any other account whose name starts with root).',
      w: ['-v inverts the match and would output every line that does not start with root.', 'root$ matches lines ending in root, not lines beginning with it.', '', '-x also requires the whole line to equal root, so the file stays empty.'],
      c: 'grep regular expressions', s: 'Use anchors in grep patterns', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`$ ls -l /opt/report`\n`lrwxrwxrwx. 1 root root 16 Oct  9 09:00 /opt/report -> /data/report.txt`\n`$ cat /opt/report`\n`cat: /opt/report: No such file or directory`\nWhat is the most likely explanation?',
      o: ['The link target /data/report.txt does not exist (dangling symbolic link)', 'The symbolic link has wrong permissions; it needs chmod 644', 'Symbolic links cannot be read with cat; use readlink instead', 'The link count of 1 means the inode was deleted'],
      a: [0],
      e: 'cat follows the symlink to /data/report.txt; the error means that path is missing (moved, deleted or on an unmounted file system). Check with ls -l /data/report.txt or readlink -f /opt/report.',
      w: ['', 'Permissions on a symbolic link itself are always shown as rwxrwxrwx and are not used; access is decided by the target.', 'cat and other programs transparently follow symbolic links; readlink only prints the stored path.', 'The symlink has its own inode with link count 1, which is normal and says nothing about the target.'],
      c: 'ln -s / readlink', s: 'Diagnose a dangling symbolic link', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'concept',
      q: 'You need to learn the file format of /etc/passwd without internet access. Select all that apply: which sources will help on a standard RHEL system?',
      o: ['man 5 passwd', 'man -k passwd (apropos) to find related manual pages', 'Documentation under /usr/share/doc for the relevant package, if present', 'passwd --help, which prints the full /etc/passwd field layout', 'whatis /etc/passwd, which prints the file contents with annotations'],
      a: [0, 1, 2],
      e: 'Section 5 of the manual describes file formats (man 5 passwd); man -k / apropos searches page names and descriptions (requires the mandb index); /usr/share/doc holds package documentation where shipped.',
      w: ['', '', '', 'passwd --help only describes options of the passwd command (changing passwords), not the file format.', 'whatis prints one-line descriptions of manual pages by name; it does not annotate file contents.'],
      c: 'man / apropos', s: 'Locate local documentation', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'remediation',
      q: 'Members of group devs must collaborate in /shared/devs. Files they create there must automatically belong to group devs, users must not delete each other\'s files, and others get no access. Which command set achieves this?',
      o: ['chgrp devs /shared/devs; chmod 0777 /shared/devs', 'chgrp devs /shared/devs; chmod 4770 /shared/devs', 'chown :devs /shared/devs; chmod g+x /shared/devs', 'chgrp devs /shared/devs; chmod 3770 /shared/devs'],
      a: [3],
      e: 'Mode 3770 sets setgid (2000), so new files inherit the directory group, plus the sticky bit (1000), so only a file owner (or the directory owner/root) can delete or rename a file; 770 gives owner and group full access and others none.',
      w: ['0777 lets anyone write and delete, with no group inheritance.', '4000 is setuid, which does not provide group inheritance on a directory.', 'Execute alone does not let group members create files and does not set group inheritance.', ''],
      c: 'chmod setgid sticky', s: 'Configure a collaborative directory', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'log',
      q: 'Running `tar -cjf /root/etc.tar.bz2 /etc` prints:\n`tar: Removing leading \'/\' from member names`\nA colleague later runs `tar -xjf /root/etc.tar.bz2 -C /tmp/restore`. Where do the files land and what did the message mean?',
      o: ['Files overwrite /etc because absolute paths are restored by default; the message warns that the archive is corrupt', 'Files land under /tmp/restore/etc because tar stored relative paths (etc/...) to prevent accidental overwrites of the live system', 'Extraction fails because the archive has no leading slash and tar cannot locate /etc', 'Files land directly in /tmp/restore without the etc directory'],
      a: [1],
      e: 'GNU tar strips the leading slash when creating, so members are stored as etc/hosts and so on. Extracting with -C /tmp/restore therefore creates /tmp/restore/etc/... and the live /etc is untouched.',
      w: ['The message is informational, not a corruption warning, and absolute paths are not stored unless -P was used at creation.', '', 'Relative member names are the normal case and extract without problems.', 'The directory structure (etc/...) is preserved; only the leading slash was removed.'],
      c: 'tar -C', s: 'Understand tar path handling', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'An admin ran `sort /etc/app/users.txt > /etc/app/users.txt` to sort the file in place. Afterwards the file is empty. What is the root cause?',
      o: ['The shell opened and truncated users.txt for output before sort read it, so sort read an empty file', 'sort cannot read files in /etc without root privileges', 'sort writes its output to stderr, which was not redirected', 'The file system was mounted read-only, so sort discarded the data'],
      a: [0],
      e: 'Redirections are set up by the shell before the command runs, and > truncates the target immediately. Use sort -o file file, or write to a temporary file and move it into place.',
      w: ['', 'A permission problem would produce an error message, and an unwritable file would also make the redirection fail.', 'sort writes its results to stdout; stderr is only for errors.', 'A read-only file system would make the redirection itself fail with an error, leaving the file unchanged.'],
      c: 'shell redirection order', s: 'Explain redirection side effects', tags: ['rhcsa']
    }
  ],

  'L18-M1-T2': [
    {
      d: 'b', t: 'command',
      q: 'Which command shows which installed package owns the file /etc/ssh/sshd_config?',
      o: ['rpm -ql /etc/ssh/sshd_config', 'rpm -qf /etc/ssh/sshd_config', 'dnf list /etc/ssh/sshd_config', 'rpm -qi sshd_config'],
      a: [1],
      e: 'rpm -qf (query file) prints the package that installed a path, here openssh-server. dnf provides can also search repositories for a path.',
      w: ['-ql lists the files in a package and expects a package name, not a file path.', '', 'dnf list takes package names or globs, not file paths.', '-qi shows package information and needs a package name; there is no package named sshd_config.'],
      c: 'rpm -qf', s: 'Find the owning package of a file', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'config',
      q: 'You must configure a repository at http://repo.example.com/BaseOS with GPG checking enabled. Which /etc/yum.repos.d/baseos.repo content is valid?',
      o: ['baseurl http://repo.example.com/BaseOS\nenabled yes', '[BaseOS]\nurl=http://repo.example.com/BaseOS\nenable=1', 'repo BaseOS {\n  baseurl = "http://repo.example.com/BaseOS"\n}', '[BaseOS]\nname=BaseOS\nbaseurl=http://repo.example.com/BaseOS\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release'],
      a: [3],
      e: 'A repo file is INI format: a [repoid] section with name, baseurl, enabled and gpgcheck, plus gpgkey pointing at the trusted key. dnf config-manager can also generate a basic stanza.',
      w: ['There is no [section] header and the key=value syntax is wrong.', 'The keys url and enable are not recognised; dnf needs baseurl (or mirrorlist/metalink) and enabled.', 'Repo files are INI files, not written in this block syntax.', ''],
      c: '/etc/yum.repos.d', s: 'Write a repository file', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command lists the Flatpak remotes configured on the system?',
      o: ['flatpak remotes', 'flatpak list --repos', 'dnf repolist flatpak', 'flatpak search remotes'],
      a: [0],
      e: 'flatpak remotes (alias remote-list) shows configured remotes and whether they belong to the system or user installation. Add one with flatpak remote-add --if-not-exists NAME URL.',
      w: ['', 'flatpak list shows installed applications and runtimes; --repos is not a valid option.', 'dnf manages RPM repositories and knows nothing about Flatpak remotes.', 'flatpak search searches application metadata in remotes; it does not list remotes.'],
      c: 'flatpak remotes', s: 'Inspect Flatpak remotes', env: 'RHEL 10', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: 'You copied the provided repository definition to /etc/yum.repos.d/appstream.repo.orig, but `dnf repolist` does not show the repository. The URL works with curl. What is the most likely cause?',
      o: ['The file must be named after the repo id exactly, without any suffix', 'dnf caches repolist output for 24 hours, so the new repository appears tomorrow', 'dnf only reads files ending in .repo, so the .orig file is ignored', 'Repositories added by hand stay disabled until rpm --import is run'],
      a: [2],
      e: 'dnf loads /etc/yum.repos.d/*.repo only. Rename the file to a .repo name and run dnf repolist again; the file name does not need to match the repo id.',
      w: ['File names are arbitrary as long as they end in .repo; the [id] inside defines the repository.', 'Repository configuration is read every time dnf runs; caching affects metadata, not whether a configured repo is listed.', '', 'GPG keys affect package installation; an enabled repository still appears in repolist without an imported key.'],
      c: 'dnf repolist', s: 'Troubleshoot a missing repository', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'log',
      q: 'A script fails with:\n`./check.sh: line 5: [: missing \']\'`\nLine 5 is `if [ -f "$1"]; then`. What is the fix?',
      o: ['Replace the double quotes with single quotes around $1', 'Add a space before the closing bracket: if [ -f "$1" ]; then', 'Change -f to -e, because -f is not a valid test operator', 'Use #!/bin/sh as the first line instead of #!/bin/bash'],
      a: [1],
      e: '[ is a command and ] must be its separate last argument. Without the space the shell passes "$1"] as one word, so [ never sees a closing ].',
      w: ['Single quotes would stop $1 from expanding, so the test would check for a file literally named $1.', '', '-f is valid (true for a regular file); the problem is word splitting around ].', 'The interpreter is not the problem; both sh and bash require the space.'],
      c: 'test / [', s: 'Debug shell test syntax', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`# rpm -V openssh-server`\n`S.5....T.  c /etc/ssh/sshd_config`\nWhat does this tell you?',
      o: ['sshd_config is a configuration file whose size, digest and modification time differ from the packaged version', 'sshd_config is missing and must be reinstalled', 'The package signature is invalid and the package is compromised', 'The file ownership and SELinux context have changed'],
      a: [0],
      e: 'rpm -V prints a line only for changed files: S size, 5 digest (checksum), T mtime; c marks a %config file. Locally edited config files are expected to show this.',
      w: ['', 'A missing file is reported as missing followed by the path.', 'rpm -V verifies file attributes against the RPM database, not package signatures; use rpm -K for signatures.', 'Ownership changes show U or G, and those positions are dots in this output.'],
      c: 'rpm -V', s: 'Read RPM verify output', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'concept',
      q: 'Inside a bash script, select all that apply: which statements about special parameters are correct?',
      o: ['$# expands to the number of positional arguments', '$? expands to the exit status of the most recently executed command', '"$@" expands to each positional argument as a separate quoted word', '$0 expands to the first argument passed to the script', '$$ expands to the PID of the parent shell that launched the script'],
      a: [0, 1, 2],
      e: '$# is the argument count, $? the last exit status, and "$@" preserves each argument as its own word (safe for arguments containing spaces).',
      w: ['', '', '', '$0 is the script name as invoked; the first argument is $1.', '$$ is the PID of the shell running the script itself; the parent is $PPID.'],
      c: 'bash special parameters', s: 'Use script arguments correctly', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'Installing from a newly added internal repository fails with:\n`Public key for tool-2.1-1.el10.x86_64.rpm is not installed`\nThe security team publishes the signing key at /etc/pki/rpm-gpg/RPM-GPG-KEY-internal. What is the correct remediation?',
      o: ['Set gpgcheck=0 in the repo file so the package installs', 'Run dnf install --nogpgcheck tool every time', 'Ask for the package to be rebuilt unsigned so no key is needed', 'Add gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-internal to the repo (or rpm --import that key), then retry the install'],
      a: [3],
      e: 'dnf needs the vendor public key to verify the signature. Pointing gpgkey at the trusted key (dnf imports it on first use) or importing it with rpm --import keeps signature verification enabled.',
      w: ['Disabling GPG checking removes protection against tampered packages and is not an acceptable fix.', 'Bypassing verification on every install carries the same risk and does not fix the configuration.', 'Unsigned packages are less trustworthy; the problem is the missing key, not the signature.', ''],
      c: 'rpm --import / gpgkey', s: 'Fix repository GPG key errors safely', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'output',
      q: 'Given /root/check.sh:\n`#!/bin/bash`\n`for u in "$@"; do`\n`  if id "$u" &>/dev/null; then echo "$u exists"; else echo "$u missing"; fi`\n`done`\nWhat does `/root/check.sh root nosuchuser` print (nosuchuser does not exist)?',
      o: ['uid=0(root) gid=0(root) groups=0(root)\nnosuchuser missing', 'root exists\nnosuchuser exists', 'root exists\nnosuchuser missing', 'root missing\nnosuchuser missing'],
      a: [2],
      e: 'The loop iterates over each argument; id returns 0 for an existing user and non-zero otherwise, and &>/dev/null hides its output, so only the echo lines appear.',
      w: ['&>/dev/null discards the id output, so the uid line is never printed.', 'id fails for a non-existent user, so the else branch runs for nosuchuser.', '', 'root exists on every system, so id succeeds and the then branch runs.'],
      c: 'for / if / exit status', s: 'Predict script output', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'This script is used by a monitoring job:\n`#!/bin/bash`\n`cp /data/db.dump /backup/`\n`echo "backup finished"`\nThe copy failed because /backup was full, yet the monitor recorded success (exit status 0). What is the root cause?',
      o: ['cp does not set an exit status when the disk is full', 'A script exits with the status of its last command, which was the successful echo', 'The monitor reads stderr, and cp writes its errors to stdout', 'Bash scripts always exit 0 unless exit 1 is written explicitly at the end'],
      a: [1],
      e: 'Without an explicit exit or error handling, the script returns the status of its last command. Check cp, for example if ! cp ...; then echo "copy failed" >&2; exit 1; fi (or use set -e).',
      w: ['cp returns non-zero when a write fails, including when the disk is full.', '', 'cp writes errors to stderr, and the stream used is not why the status was 0.', 'Scripts return the last command status, not a fixed 0; a failing last command would yield non-zero.'],
      c: 'exit status / set -e', s: 'Propagate errors from scripts', tags: ['rhcsa']
    }
  ],

  'L18-M2-T1': [
    {
      d: 'b', t: 'command',
      q: 'A server must boot to a text console (no graphical login) by default from now on. Which command sets this?',
      o: ['systemctl isolate multi-user.target', 'systemctl enable multi-user.target', 'systemctl set-default multi-user.target', 'grub2-set-default multi-user.target'],
      a: [2],
      e: 'systemctl set-default changes the default.target symlink, which takes effect at every subsequent boot. Verify with systemctl get-default.',
      w: ['isolate switches the running system now but does not change what happens at the next boot.', 'Targets are not enabled as defaults this way; enabling does not change default.target.', '', 'grub2-set-default selects a boot menu entry (kernel), not a systemd target.'],
      c: 'systemctl set-default', s: 'Set the default boot target', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: 'Which nice value gives a process the highest CPU scheduling priority?',
      o: ['-20', '0', '19', '99'],
      a: [0],
      e: 'Nice values range from -20 (highest priority, least nice) to 19 (lowest priority). Only root can set negative values or lower an existing value.',
      w: ['', '0 is the default nice value, in the middle of the range.', '19 is the lowest priority (most nice to other processes).', '99 is outside the nice range; it relates to real-time priorities, which are a different mechanism.'],
      c: 'nice / renice', s: 'Understand nice values', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command shows only messages of priority err and more severe from the current boot?',
      o: ['journalctl -u err -b', 'journalctl -b -1 --priority=err', 'journalctl -f err', 'journalctl -p err -b'],
      a: [3],
      e: '-p err shows priorities err, crit, alert and emerg; -b limits output to the current boot.',
      w: ['-u filters by systemd unit, and there is no unit named err.', '-b -1 selects the previous boot, not the current one.', '-f follows new messages; err would be treated as an invalid match argument.', ''],
      c: 'journalctl -p', s: 'Filter the journal by priority', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`# tuned-adm active`\n`Current active profile: balanced`\n`# tuned-adm recommend`\n`virtual-guest`\nThe task says: apply the recommended tuning profile. What should you run?',
      o: ['tuned-adm recommend --apply', 'tuned-adm profile virtual-guest', 'systemctl set-default virtual-guest.target', 'echo virtual-guest > /etc/tuned/active_profile'],
      a: [1],
      e: 'tuned-adm profile NAME switches the profile and records it so it persists, provided the tuned service is enabled. Confirm with tuned-adm active.',
      w: ['recommend only prints a suggestion; it has no --apply option.', '', 'Tuning profiles are not systemd targets.', 'Editing the state file directly bypasses tuned and does not apply the settings until the daemon reloads; use tuned-adm.'],
      c: 'tuned-adm profile', s: 'Apply a tuned profile', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: 'After a reboot, `journalctl -b -1` reports that no previous boot is available. You must keep journal data across reboots. Select all that apply: which actions achieve this?',
      o: ['Create /etc/systemd/journald.conf.d/persistent.conf with [Journal] and Storage=persistent, then restart systemd-journald', 'With the default Storage=auto, create /var/log/journal (systemd-tmpfiles --create --prefix /var/log/journal) and restart systemd-journald', 'Set Storage=volatile so the journal is written to disk', 'Enable rsyslog, which makes journalctl -b -1 work', 'Run journalctl --vacuum-size=1G to reserve space for previous boots'],
      a: [0, 1],
      e: 'Storage=persistent forces disk storage in /var/log/journal; with Storage=auto, journald writes persistently only if /var/log/journal exists. Restarting journald (or journalctl --flush) moves data from /run to /var.',
      w: ['', '', 'volatile keeps the journal only in /run/log/journal, which is lost at reboot.', 'rsyslog writes text files such as /var/log/messages; it does not make journalctl keep boots.', 'Vacuuming deletes old journal files to stay under a size; it does not enable persistence.'],
      c: 'journald Storage=', s: 'Preserve the systemd journal', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`# ps aux --sort=-%cpu | head -4`\n`USER  PID   %CPU %MEM COMMAND`\n`alice 4321  97.5  0.4 /usr/bin/report-gen`\n`root  812    1.2  0.9 /usr/sbin/NetworkManager`\n`bob   5510   0.8  6.3 /usr/bin/python3 app.py`\nWhich process uses the most CPU and which uses the most memory?',
      o: ['812 most CPU, 5510 most memory', '4321 most CPU, 4321 most memory', '5510 most CPU, 4321 most memory', '4321 most CPU, 5510 most memory'],
      a: [3],
      e: 'The list is sorted by %CPU descending, so PID 4321 (97.5%) is the CPU hog; among the rows shown, PID 5510 has the highest %MEM (6.3).',
      w: ['812 uses only 1.2% CPU.', '4321 uses only 0.4% memory.', '5510 uses 0.8% CPU, far below 4321.', ''],
      c: 'ps --sort', s: 'Identify resource-intensive processes', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'remediation',
      q: 'PID 4321 (report-gen, owned by alice) must keep running but should yield CPU to interactive users. What is the correct action as root?',
      o: ['renice -n 15 -p 4321', 'kill -9 4321', 'renice -n -15 -p 4321', 'kill -STOP 4321'],
      a: [0],
      e: 'Raising the nice value to 15 lowers its priority so other processes get CPU first, while the job continues.',
      w: ['', 'SIGKILL terminates the process, but it must keep running.', 'A negative nice value raises its priority, the opposite of what is required.', 'SIGSTOP freezes the process completely, so the report would never finish until resumed.'],
      c: 'renice', s: 'Adjust process scheduling priority', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'After resetting the root password through rd.break, no one can log in on the console. /var/log/audit/audit.log shows:\n`avc: denied { read } for comm="unix_chkpwd" name="shadow" ... tcontext=system_u:object_r:unlabeled_t:s0 tclass=file`\nWhat is the root cause and fix?',
      o: ['The new password is too short; boot again and choose a longer one', 'SELinux must be set to permissive permanently in /etc/selinux/config', '/etc/shadow was rewritten without an SELinux label because /.autorelabel was not created; boot with rd.break again and touch /.autorelabel (or run restorecon -v /etc/shadow once policy is loaded)', 'unix_chkpwd lost its setuid bit; run chmod u+s /usr/sbin/unix_chkpwd'],
      a: [2],
      e: 'In the initramfs no SELinux policy is loaded, so passwd creates a new /etc/shadow with no label (unlabeled_t). Confined login components are then denied. Relabelling restores shadow_t.',
      w: ['Password quality would give a different error at change time, not an AVC denial on reading shadow.', 'Disabling enforcement hides the problem and weakens security; the correct fix is restoring the label.', '', 'The AVC is about the target file label, not about permissions of unix_chkpwd.'],
      c: 'rd.break / autorelabel', s: 'Recover SELinux labels after a password reset', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'You booted with rd.break. At the switch_root prompt you type `passwd root` and it fails (the command is not found or cannot update the password). Which sequence is correct?',
      o: ['passwd root; mount -o remount,rw /sysroot; chroot /sysroot; touch /.autorelabel', 'mount -o remount,rw /sysroot; chroot /sysroot; passwd root; touch /.autorelabel; exit; exit', 'chroot /sysroot; passwd root; mount -o remount,rw /; exit', 'mount -o remount,rw /; passwd root; touch /sysroot/.autorelabel; reboot'],
      a: [1],
      e: 'The real root is mounted read-only at /sysroot. Remount it read-write, chroot into it so passwd edits the real /etc/shadow, request a relabel, then exit twice to continue booting.',
      w: ['passwd runs before remounting and before chroot, so it edits nothing on the real system.', '', 'passwd runs while /sysroot is still read-only, so it cannot write /etc/shadow.', 'Remounting / affects the initramfs root, not /sysroot, and passwd outside the chroot does not touch the real shadow file.'],
      c: 'rd.break', s: 'Reset the root password from the initramfs', env: 'RHEL 9/10', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'command',
      q: 'You need to boot a server once into emergency.target for maintenance without changing its default target. What is the correct method?',
      o: ['Run systemctl set-default emergency.target, reboot, then set it back afterwards', 'Edit /etc/default/grub to add systemd.unit=emergency.target and run grub2-mkconfig', 'Run systemctl isolate emergency.target on every boot from cron', 'At the GRUB menu press e, append systemd.unit=emergency.target to the line starting with linux, and press Ctrl+x'],
      a: [3],
      e: 'Editing the entry at the GRUB menu affects only that boot. emergency.target mounts only the root file system read-only, which is useful when fstab or other services are broken.',
      w: ['This works but changes the persistent default, which you were told not to do, and risks forgetting to revert it.', 'This makes the change persistent for every boot until reverted.', 'That would happen after a normal boot and is not a one-time boot into the target.', ''],
      c: 'systemd.unit=', s: 'Boot once into a specific target', tags: ['rhcsa']
    }
  ],

  'L18-M2-T2': [
    {
      d: 'b', t: 'command',
      q: 'Which command writes a new GPT partition table to /dev/vdb? (This destroys the existing partition table.)',
      o: ['parted /dev/vdb mkpart gpt', 'parted /dev/vdb mklabel gpt', 'mkfs.gpt /dev/vdb', 'fdisk -t gpt /dev/vdb'],
      a: [1],
      e: 'parted mklabel gpt creates an empty GPT label. Check the disk with lsblk first, because any existing partitions become inaccessible.',
      w: ['mkpart creates a partition inside an existing label; gpt is not a partition name argument here.', '', 'There is no mkfs.gpt; GPT is a partition table, not a file system.', 'fdisk has no -t gpt option for creating a label; inside fdisk the g command creates a GPT label.'],
      c: 'parted mklabel', s: 'Create a GPT partition table', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'You must mount a file system by UUID in /etc/fstab. Which command shows the UUID of /dev/vdb1?',
      o: ['df -h /dev/vdb1', 'mount -U /dev/vdb1', 'fdisk -l /dev/vdb1', 'blkid /dev/vdb1'],
      a: [3],
      e: 'blkid prints the UUID, TYPE and LABEL of a block device; lsblk -f shows the same for all devices.',
      w: ['df shows usage of mounted file systems, not UUIDs.', 'mount -U mounts by a UUID you supply; it does not display one.', 'fdisk -l shows partitions and the disk identifier, not the file system UUID.', ''],
      c: 'blkid', s: 'Find file system UUIDs', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'config',
      q: 'Which /etc/fstab line activates a swap partition persistently by UUID?',
      o: ['UUID=6c3b...e1 none swap defaults 0 0', 'UUID=6c3b...e1 /swap xfs defaults 0 0', '/dev/vdb2 swap auto noauto 1 2', 'UUID=6c3b...e1 swap none swapon 0 0'],
      a: [0],
      e: 'Swap entries use none (or swap) as the mount point and swap as the type. After editing, swapon -a activates it and swapon --show verifies.',
      w: ['', 'The type must be swap, not xfs, and swap is not mounted on a directory.', 'noauto prevents activation at boot, the type is wrong, and swap should not be fsck-checked.', 'The mount point and type fields are swapped and swapon is not a valid mount option.'],
      c: 'fstab swap', s: 'Persist swap space', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'log',
      q: 'Running `lvextend -L +2G /dev/vgdata/lvdata` fails with:\n`Insufficient free space: 512 extents needed, but only 0 available`\nA new empty disk /dev/vdc is attached. What is the correct sequence?',
      o: ['mkfs.xfs /dev/vdc; lvextend -L +2G /dev/vgdata/lvdata', 'lvcreate -L 2G -n lvdata vgdata /dev/vdc', 'pvcreate /dev/vdc; vgextend vgdata /dev/vdc; lvextend -r -L +2G /dev/vgdata/lvdata', 'vgcreate vgdata /dev/vdc; lvextend -L +2G /dev/vgdata/lvdata'],
      a: [2],
      e: 'The VG has no free extents. Initialise the disk as a PV, add it to the VG, then extend the LV; -r resizes the file system at the same time.',
      w: ['A file system on the raw disk cannot be used by LVM.', 'This tries to create a second LV with an existing name instead of extending it.', '', 'vgdata already exists; vgcreate would fail, and vgextend is needed to add a PV to it.'],
      c: 'pvcreate / vgextend', s: 'Add capacity to a volume group', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'command',
      q: 'An XFS file system on /dev/vgdata/lvweb is mounted at /web. You must grow it by 1 GiB without unmounting. Which single command does this?',
      o: ['xfs_growfs -L +1G /dev/vgdata/lvweb', 'lvextend -r -L +1G /dev/vgdata/lvweb', 'resize2fs /dev/vgdata/lvweb 1G', 'lvresize -L 1G /dev/vgdata/lvweb'],
      a: [1],
      e: 'lvextend -r grows the LV and then calls fsadm, which runs xfs_growfs for XFS while mounted. XFS can grow online but cannot be shrunk.',
      w: ['xfs_growfs grows a file system to fill its device; it does not extend the LV and takes a mount point.', '', 'resize2fs is for ext2/3/4, not XFS.', 'This sets the size to 1 GiB (possibly shrinking it) rather than adding 1 GiB, and without -r the file system is not grown.'],
      c: 'lvextend -r', s: 'Extend a logical volume online', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'config',
      q: 'Remote home directories from nfs.example.com:/home/<user> must be mounted on demand under /rhome/<user> using autofs. Select all that apply: which are required?',
      o: ['A master map entry such as /etc/auto.master.d/rhome.autofs containing: /rhome /etc/auto.rhome', 'A map file /etc/auto.rhome containing: * -rw,sync nfs.example.com:/home/&', 'systemctl enable --now autofs', 'Creating every /rhome/<user> directory by hand before autofs starts', 'An /etc/fstab entry for nfs.example.com:/home with the auto option'],
      a: [0, 1, 2],
      e: 'An indirect wildcard map needs a master entry naming the parent directory and map file, a map line where * matches the key and & substitutes it, and the autofs service enabled and running.',
      w: ['', '', '', 'autofs creates the key directories on access; pre-creating them is unnecessary.', 'fstab mounts are static and conflict with the autofs approach.'],
      c: 'autofs indirect map', s: 'Configure autofs for NFS homes', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: 'Given:\n`# mount -a`\n`mount: /data: wrong fs type, bad option, bad superblock on /dev/vdb1, missing codepage or helper program, or other error.`\n`# lsblk -f /dev/vdb1`\n`NAME FSTYPE LABEL UUID`\n`vdb1 xfs    data  9f1e...`\nThe fstab line is `UUID=9f1e... /data ext4 defaults 0 0`. What is the fix?',
      o: ['Reformat /dev/vdb1 with mkfs.ext4 to match fstab', 'Add the nofail option so the error is suppressed', 'Run fsck.ext4 on /dev/vdb1', 'Change the type field in fstab from ext4 to xfs, then run mount -a again'],
      a: [3],
      e: 'The device holds XFS but fstab declares ext4, so the mount fails. Correct the type field (and use 0 for the fsck pass, as XFS is not checked at boot by fsck), then test with mount -a or findmnt --verify.',
      w: ['Reformatting destroys the data on the existing file system.', 'nofail only stops the boot from failing; the file system still would not mount.', 'Running an ext4 checker on an XFS file system is wrong and will not fix the type mismatch.', ''],
      c: 'fstab type', s: 'Fix an fstab file system type mismatch', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'After editing /etc/fstab, a server boots into emergency mode. The journal shows:\n`Timed out waiting for device /dev/disk/by-uuid/3a8c41d2-...`\n`Dependency failed for /archive.`\n`blkid` shows the archive disk UUID is 3a8c41d7-... What is the root cause and best fix?',
      o: ['The UUID in fstab has a typo; correct it from blkid output, then verify with findmnt --verify and mount -a before rebooting', 'The kernel lacks the XFS driver; rebuild the initramfs with dracut -f', 'systemd mounts are too slow; increase DefaultTimeoutStartSec globally', 'The archive disk is failing; replace it'],
      a: [0],
      e: 'systemd waits for a device that does not exist because the UUID is wrong, and a failed local mount drops the system to emergency mode. Fix the UUID (remount / rw in emergency mode if needed) and validate before rebooting; add nofail only for genuinely optional disks.',
      w: ['', 'A missing driver would not cause a device-path timeout for a wrong UUID, and blkid sees the disk.', 'The device will never appear under the wrong UUID, so waiting longer does not help.', 'blkid reads the disk successfully, so there is no evidence of hardware failure.'],
      c: 'fstab UUID / findmnt --verify', s: 'Diagnose fstab boot failures', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'You created partition /dev/vdb2 (type Linux swap), added it to fstab by UUID, and ran `swapon -a`, but `swapon --show` does not list it. `lsblk -f /dev/vdb2` shows an empty FSTYPE and no UUID. What was missed?',
      o: ['The partition type code must be changed to 8e00 (Linux LVM)', 'swapon -a only works after a reboot', 'mkswap /dev/vdb2 was never run, so there is no swap signature or UUID; run it, update fstab with the new UUID, then swapon -a', 'The swap priority must be set with pri= before it activates'],
      a: [2],
      e: 'The partition type is only a label in the table; mkswap writes the swap signature and UUID that swapon and fstab rely on.',
      w: ['8e00 marks an LVM partition, which is not what is wanted for a swap partition.', 'swapon -a activates fstab swap entries immediately.', '', 'Priority is optional; without it swap uses a default priority.'],
      c: 'mkswap / swapon', s: 'Create and activate swap', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'remediation',
      q: 'An admin ran `lvextend -L +5G /dev/vgapp/lvlogs` without -r. lvs shows the new size, but df still shows the old size for /logs, which is ext4. What completes the change online?',
      o: ['xfs_growfs /logs', 'resize2fs /dev/vgapp/lvlogs', 'umount /logs; mkfs.ext4 /dev/vgapp/lvlogs; mount /logs', 'lvreduce -L -5G /dev/vgapp/lvlogs and repeat with -r'],
      a: [1],
      e: 'The LV grew but the file system did not. resize2fs grows a mounted ext4 file system to fill the device; for XFS you would use xfs_growfs on the mount point.',
      w: ['xfs_growfs only works on XFS, and this file system is ext4.', '', 'mkfs destroys all data on the volume.', 'Reducing an LV under an ext4 file system without shrinking the file system first risks data loss and is unnecessary.'],
      c: 'resize2fs', s: 'Grow ext4 after extending an LV', tags: ['rhcsa']
    }
  ],

  'L18-M3-T1': [
    {
      d: 'b', t: 'config',
      q: 'Which crontab entry runs /usr/local/bin/report.sh at 02:30 every Monday to Friday?',
      o: ['2 30 * * 1-5 /usr/local/bin/report.sh', '30 2 1-5 * * /usr/local/bin/report.sh', '30 2 * * 1-5 /usr/local/bin/report.sh', '*/30 2 * * 1-5 /usr/local/bin/report.sh'],
      a: [2],
      e: 'Field order is minute, hour, day of month, month, day of week. 30 2 * * 1-5 means 02:30 on weekdays (1 = Monday).',
      w: ['Minute and hour are swapped; hour 30 is invalid.', '1-5 is in the day-of-month field, so it runs on the 1st to 5th of every month.', '', '*/30 runs at 02:00 and 02:30, so it runs twice.'],
      c: 'crontab', s: 'Write a cron schedule', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'The httpd service must start now and at every boot. Which command does both?',
      o: ['systemctl enable --now httpd', 'systemctl start httpd', 'systemctl enable httpd', 'systemctl unmask httpd'],
      a: [0],
      e: 'enable --now creates the boot-time symlinks and starts the unit immediately. Verify with systemctl is-active and is-enabled.',
      w: ['', 'start only runs it now; it would not start after a reboot.', 'enable only affects future boots; the service is not started now.', 'unmask only removes a mask; it neither starts nor enables the service.'],
      c: 'systemctl enable --now', s: 'Enable and start a service', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'You must run /usr/local/bin/cleanup.sh once at 23:00 today. Which command schedules it?',
      o: ['crontab -e and add 0 23 * * * /usr/local/bin/cleanup.sh', 'systemctl start cleanup.sh --at 23:00', 'batch 23:00 /usr/local/bin/cleanup.sh', 'echo "/usr/local/bin/cleanup.sh" | at 23:00'],
      a: [3],
      e: 'at reads commands from stdin and runs them once at the given time (atd must be running). Check with atq.',
      w: ['A crontab entry repeats every day rather than running once.', 'systemctl has no --at option and cleanup.sh is not a unit.', 'batch runs jobs when the load average is low; it does not take a time argument like this.', ''],
      c: 'at', s: 'Schedule a one-time job', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`# chronyc sources`\n`MS Name/IP address         Stratum Poll Reach LastRx Last sample`\n`^* classroom.example.com         2   6   377    35   +120us[ +150us] +/- 12ms`\n`^? 10.0.0.5                      0   6     0     -     +0ns[   +0ns] +/-    0ns`\nWhat does this show?',
      o: ['The system is not synchronised because 10.0.0.5 has never replied', 'The system is synchronised to classroom.example.com; 10.0.0.5 is unreachable', 'Both servers are used equally for synchronisation', 'classroom.example.com is a local reference clock (stratum 2)'],
      a: [1],
      e: '^* marks the currently selected source and Reach 377 means the last eight polls succeeded. ^? with Reach 0 means 10.0.0.5 has never answered.',
      w: ['One good selected source is enough to stay synchronised.', '', 'Only the source marked * is selected for synchronisation.', '^ means a server reached over the network; stratum 2 means it is two steps from a reference clock.'],
      c: 'chronyc sources', s: 'Verify time synchronisation', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'config',
      q: 'Connection eth0 must get static IPv4 192.0.2.10/24 (gateway 192.0.2.1, DNS 192.0.2.53) and static IPv6 2001:db8::10/64, persistently. Which command set is correct?',
      o: ['ip addr add 192.0.2.10/24 dev eth0; ip -6 addr add 2001:db8::10/64 dev eth0', 'nmcli con mod eth0 ipv4.addresses 192.0.2.10/24 ipv6.addresses 2001:db8::10/64; systemctl restart network', 'nmcli con mod eth0 ipv4.method manual ipv4.addresses 192.0.2.10/24 ipv4.gateway 192.0.2.1 ipv4.dns 192.0.2.53 ipv6.method manual ipv6.addresses 2001:db8::10/64; nmcli con up eth0', 'Edit /etc/sysconfig/network-scripts/ifcfg-eth0 and run ifup eth0'],
      a: [2],
      e: 'NetworkManager profiles persist settings; set the method to manual for each family, add addresses, gateway and DNS, then reactivate the connection to apply them.',
      w: ['ip commands change the running state only and are lost at reboot.', 'Gateway, DNS and manual methods are missing, and there is no network service on RHEL 9 and 10.', '', 'RHEL 10 no longer supports ifcfg network-scripts; profiles are NetworkManager keyfiles.'],
      c: 'nmcli con mod', s: 'Configure static IPv4 and IPv6', env: 'RHEL 10', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: '`ping -c1 192.0.2.20` works but `ping -c1 serverb.lab.example.com` fails with `Name or service not known`. `nmcli -g ipv4.dns con show eth0` prints nothing and /etc/resolv.conf has no nameserver line. What is the fix?',
      o: ['nmcli con mod eth0 ipv4.dns 192.0.2.53; nmcli con up eth0', 'Edit /etc/resolv.conf by hand and make it immutable with chattr +i', 'Open port 53 in firewalld on the client', 'Change hosts: files dns to hosts: dns in /etc/nsswitch.conf'],
      a: [0],
      e: 'IP connectivity works but no DNS server is configured. Setting DNS on the NetworkManager profile and reactivating it makes NetworkManager write resolv.conf persistently.',
      w: ['', 'NetworkManager manages resolv.conf; manual edits are fragile and chattr hides the real misconfiguration.', 'Outbound DNS queries from a client are not blocked by its own firewalld zone by default; the problem is no server configured.', 'Removing files from the lookup order does not provide a DNS server.'],
      c: 'nmcli ipv4.dns', s: 'Fix hostname resolution', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'concept',
      q: 'You created /etc/systemd/system/backup.service and /etc/systemd/system/backup.timer (OnCalendar=daily). Select all that apply: which statements are correct?',
      o: ['Run systemctl daemon-reload, then systemctl enable --now backup.timer', 'By default the timer activates the service with the same name, backup.service', 'systemctl list-timers shows when backup.timer runs next', 'backup.service must also be enabled or the timer will not trigger it', 'OnCalendar uses five-field crontab syntax such as 0 0 * * *'],
      a: [0, 1, 2],
      e: 'A timer is enabled and started like any unit and triggers the same-named service by default (or the one named in Unit=). list-timers shows next and last runs.',
      w: ['', '', '', 'The service is started by the timer; it normally has no [Install] section and does not need enabling.', 'OnCalendar uses systemd calendar event syntax (for example *-*-* 02:00:00 or daily), not crontab fields.'],
      c: 'systemd timers', s: 'Schedule work with timers', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'command',
      q: 'The kernel argument console=ttyS0,115200 must be added persistently to every installed kernel, including future ones. Which command is the supported approach on RHEL?',
      o: ['Edit /boot/loader/entries/*.conf by hand only', 'grubby --update-kernel=ALL --args="console=ttyS0,115200"', 'Append it at the GRUB menu with e and Ctrl+x', 'echo console=ttyS0,115200 >> /proc/cmdline'],
      a: [1],
      e: 'grubby updates the BLS entries and the default kernel command line used for new kernels. Verify with grubby --info=ALL or after reboot in /proc/cmdline.',
      w: ['Editing entries by hand changes current kernels only and is easy to get wrong.', '', 'Editing at the menu affects only that one boot.', '/proc/cmdline is read-only and shows the arguments of the running kernel.'],
      c: 'grubby --args', s: 'Modify the bootloader persistently', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'A crontab entry runs `dbdump.sh` nightly. Run by hand it works. From cron, /var/log/cron shows the job started, and the job output mailed to root contains:\n`dbdump.sh: line 4: pg_dump: command not found`\npg_dump is in /usr/pgsql/bin. What is the root cause?',
      o: ['crond is not running', 'The script lacks execute permission', 'SELinux blocks cron from running scripts in /usr/local/bin', 'cron runs jobs with a minimal PATH that does not include /usr/pgsql/bin; use the full path or set PATH in the script or crontab'],
      a: [3],
      e: 'cron does not load the interactive login environment. The script started (it reached line 4), but the PATH lookup failed. Use absolute paths or define PATH explicitly.',
      w: ['The log shows the job started, so crond is running.', 'Without execute permission the script would not reach line 4.', 'An SELinux denial would appear as an AVC in the audit log, not as command not found.', ''],
      c: 'cron environment', s: 'Debug cron job failures', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'output',
      q: 'Given:\n`# systemctl enable --now httpd`\n`Failed to enable unit: Unit file /etc/systemd/system/httpd.service is masked.`\n`# systemctl status httpd`\n`Loaded: masked (Reason: Unit httpd.service is masked.)`\n`Active: inactive (dead)`\nWhat is the correct next step?',
      o: ['systemctl unmask httpd; systemctl enable --now httpd', 'dnf reinstall httpd, because the unit file is corrupt', 'systemctl daemon-reload, which clears masks', 'Delete /usr/lib/systemd/system/httpd.service and rerun enable'],
      a: [0],
      e: 'A masked unit is linked to /dev/null in /etc/systemd/system so it cannot be started. unmask removes that link; then enable and start it.',
      w: ['', 'The unit file is intact; masking is a deliberate administrative state, not corruption.', 'daemon-reload rereads unit files but does not remove a mask.', 'Deleting the vendor unit file breaks the package and does not remove the mask link.'],
      c: 'systemctl unmask', s: 'Recover a masked service', tags: ['rhcsa']
    }
  ],

  'L18-M3-T2': [
    {
      d: 'b', t: 'command',
      q: 'Create user alice with the supplementary group wheel (keeping her own primary group). Which command is correct?',
      o: ['useradd -g wheel alice', 'useradd -G wheel alice', 'usermod -G wheel alice', 'groupadd -U alice wheel'],
      a: [1],
      e: 'useradd -G sets supplementary groups at creation. For an existing user use usermod -aG to append.',
      w: ['-g sets the primary group, replacing alice\'s own private group.', '', 'usermod modifies an existing user; alice does not exist yet.', 'groupadd creates groups; it does not create users.'],
      c: 'useradd -G', s: 'Create users with supplementary groups', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: 'With umask 027, what permissions do newly created regular files and directories get by default?',
      o: ['Files 750, directories 640', 'Files 755, directories 755', 'Files 640, directories 750', 'Files 027, directories 027'],
      a: [2],
      e: 'The default base is 666 for files and 777 for directories; masking out 027 gives 640 and 750.',
      w: ['The values are reversed; files are not created executable by default.', '755 results from umask 022 for directories, and files never get execute by default.', '', 'umask removes bits; it is not the resulting mode.'],
      c: 'umask', s: 'Calculate default permissions', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: 'SELinux is currently permissive. Which command switches it to enforcing immediately (until the next boot)?',
      o: ['setenforce 1', 'getenforce enforcing', 'sestatus --enforce', 'setsebool enforcing on'],
      a: [0],
      e: 'setenforce 1 switches the running mode. Set SELINUX=enforcing in /etc/selinux/config to make it persistent.',
      w: ['', 'getenforce only displays the current mode.', 'sestatus shows status; it has no option to change the mode.', 'setsebool changes booleans, not the SELinux mode.'],
      c: 'setenforce', s: 'Change SELinux mode', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`# chage -l bob`\n`Last password change          : Oct 01, 2026`\n`Password expires              : Dec 30, 2026`\n`Minimum number of days between password change : 0`\n`Maximum number of days between password change : 90`\n`Number of days of warning before password expires : 7`\nWhich command produced the maximum and warning values?',
      o: ['passwd -n 90 -w 7 bob', 'usermod -e 90 -w 7 bob', 'chage -E 90 -W 7 bob', 'chage -M 90 -W 7 bob'],
      a: [3],
      e: 'chage -M sets the maximum password age and -W the warning period. Defaults for new users come from /etc/login.defs.',
      w: ['passwd -n sets the minimum age, not the maximum.', 'usermod -e sets an account expiry date and has no -w option.', '-E sets the account expiration date, not the maximum password age.', ''],
      c: 'chage -M', s: 'Configure password aging', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'log',
      q: 'httpd serves a 403 for files in a custom DocumentRoot /web. The audit log shows:\n`avc: denied { getattr } for comm="httpd" path="/web/index.html" scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:default_t:s0 tclass=file`\nWhat is the correct persistent fix?',
      o: ['chcon -R -t httpd_sys_content_t /web', 'setenforce 0', 'semanage fcontext -a -t httpd_sys_content_t "/web(/.*)?"; restorecon -Rv /web', 'chmod -R 777 /web'],
      a: [2],
      e: 'semanage fcontext adds a persistent labelling rule to the policy and restorecon applies it. The new context survives relabels.',
      w: ['chcon changes labels now, but a relabel or restorecon would revert them to default_t.', 'Permissive mode disables enforcement instead of fixing the label.', '', 'The denial is an SELinux type mismatch; wide-open permissions do not fix it and are unsafe.'],
      c: 'semanage fcontext / restorecon', s: 'Fix SELinux file contexts', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'config',
      q: 'Members of group sysops must run any command as root with sudo after entering their own password. Which configuration is correct?',
      o: ['Add sysops to /etc/group with GID 0', 'visudo -f /etc/sudoers.d/sysops containing: %sysops ALL=(ALL) ALL', 'echo "sysops ALL=(ALL) ALL" >> /etc/sudoers.d/sysops', 'Add sysops to the root group with usermod -aG root sysops'],
      a: [1],
      e: '% marks a group in sudoers. visudo -f validates syntax before saving, protecting against a broken sudo configuration.',
      w: ['Sharing GID 0 does not grant sudo rights and is a poor security practice.', '', 'Without % the rule matches a user named sysops, not the group, and the file is not syntax-checked.', 'usermod expects a user, and membership of group root does not grant sudo rights.'],
      c: 'sudoers', s: 'Grant sudo to a group', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'command',
      q: 'HTTPS must be allowed through firewalld in the default zone, both immediately and after reboot. Select all that apply: which sequences achieve this?',
      o: ['firewall-cmd --permanent --add-service=https; firewall-cmd --reload', 'firewall-cmd --add-service=https; firewall-cmd --runtime-to-permanent', 'firewall-cmd --add-service=https', 'firewall-cmd --permanent --add-service=https (with no reload)', 'systemctl stop firewalld'],
      a: [0, 1],
      e: 'Permanent rules apply after a reload; runtime rules can be saved with --runtime-to-permanent. Check with firewall-cmd --list-services and --permanent --list-services.',
      w: ['', '', 'A runtime-only rule is lost at reload or reboot.', 'The permanent rule is saved but not active until reload or reboot.', 'Stopping the firewall removes protection and is never the correct fix.'],
      c: 'firewall-cmd', s: 'Open services in firewalld', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'httpd was configured with `Listen 82` and fails to start. The journal shows:\n`AH00072: make_sock: could not bind to address [::]:82`\n`(13)Permission denied`\nNothing else listens on port 82. What is the correct fix?',
      o: ['Run httpd as root by changing User root in httpd.conf', 'setsebool -P httpd_can_network_connect on', 'Set SELinux to permissive for httpd_t with semanage permissive', 'semanage port -a -t http_port_t -p tcp 82; systemctl restart httpd; then allow 82/tcp in firewalld for clients'],
      a: [3],
      e: 'SELinux only lets httpd_t bind to ports labelled http_port_t; 82 is not one by default. Labelling the port fixes binding, and firewalld must also permit inbound traffic.',
      w: ['httpd already starts as root to bind; the denial comes from SELinux policy, and running workers as root is unsafe.', 'That boolean controls outbound connections, not binding to a listening port.', 'Making the domain permissive weakens enforcement instead of fixing the port label.', ''],
      c: 'semanage port', s: 'Label a non-standard port for SELinux', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'rca',
      q: 'Key-based SSH login for carol keeps falling back to a password prompt. /var/log/secure on the server shows:\n`Authentication refused: bad ownership or modes for directory /home/carol/.ssh`\nWhat is the root cause and fix?',
      o: ['sshd StrictModes rejects a group- or world-writable .ssh directory; set chmod 700 ~carol/.ssh and chmod 600 ~carol/.ssh/authorized_keys with carol as owner', 'The key is too short; generate a 16384-bit RSA key', 'PasswordAuthentication must be set to no for keys to work', 'The SSH port must be changed so keys are used'],
      a: [0],
      e: 'With StrictModes (default yes) sshd ignores authorized_keys if the home, .ssh or key file is writable by others or wrongly owned. Correct ownership and modes, and restorecon -Rv ~carol/.ssh if contexts are wrong.',
      w: ['', 'Key length is not related to a modes or ownership error.', 'Disabling passwords does not make sshd accept a key it refuses for permission reasons.', 'The port has nothing to do with authorized_keys validation.'],
      c: 'ssh StrictModes', s: 'Fix SSH key authentication', tags: ['rhcsa']
    },
    {
      d: 'a', t: 'remediation',
      q: 'A PHP app on httpd cannot connect to a remote PostgreSQL database. The audit log shows httpd_t denied name_connect to postgresql_port_t. What is the appropriate persistent remediation?',
      o: ['semanage port -a -t http_port_t -p tcp 5432', 'setsebool -P httpd_can_network_connect_db on', 'setenforce 0 and add it to rc.local', 'chcon -t httpd_sys_content_t /usr/bin/psql'],
      a: [1],
      e: 'The policy provides a boolean for this case. -P makes it persistent; check with getsebool httpd_can_network_connect_db.',
      w: ['Relabelling the database port as http_port_t would not allow outbound connections and could conflict with the existing label.', '', 'Disabling enforcement is not an acceptable remediation.', 'The denial is about a network connection, not a file label.'],
      c: 'setsebool -P', s: 'Use SELinux booleans', tags: ['rhcsa']
    }
  ],

  'L18-M4-T1': [
    {
      d: 'b', t: 'concept',
      q: 'ANSIBLE_CONFIG is not set. You run ansible from ~/project, which contains ansible.cfg; ~/.ansible.cfg and /etc/ansible/ansible.cfg also exist. Which file is used?',
      o: ['/etc/ansible/ansible.cfg', '~/.ansible.cfg', '~/project/ansible.cfg', 'All three are merged, with /etc/ansible/ansible.cfg winning'],
      a: [2],
      e: 'Ansible uses the first file found in this order: ANSIBLE_CONFIG, ./ansible.cfg in the current directory, ~/.ansible.cfg, /etc/ansible/ansible.cfg. Only one file is used; settings are not merged.',
      w: ['The system-wide file is the last fallback.', 'The home-directory file is used only when there is no ansible.cfg in the current directory.', '', 'Configuration files are not merged; the first one found wins.'],
      c: 'ansible.cfg precedence', s: 'Know which config file Ansible uses', tags: ['rhce']
    },
    {
      d: 'b', t: 'concept',
      q: 'What does a RHEL managed node need so the control node can run ordinary Ansible modules on it?',
      o: ['SSH access for the remote user and a Python interpreter', 'The ansible-core package and an Ansible agent service', 'ansible-navigator and podman', 'An open TCP port 5986 for the Ansible daemon'],
      a: [0],
      e: 'Ansible is agentless: modules are copied over SSH and executed with the node\'s Python. Privilege escalation typically uses sudo for the remote user.',
      w: ['', 'No agent or ansible-core is needed on managed nodes.', 'ansible-navigator and podman are used on the control node to run execution environments.', '5986 is WinRM over HTTPS for Windows hosts; Linux nodes use SSH.'],
      c: 'managed nodes', s: 'Prepare managed nodes', tags: ['rhce']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command runs site.yml with ansible-navigator and prints output like ansible-playbook instead of the interactive text UI?',
      o: ['ansible-navigator site.yml --stdout', 'ansible-navigator exec site.yml', 'ansible-navigator play site.yml -o text', 'ansible-navigator run site.yml -m stdout'],
      a: [3],
      e: 'The run subcommand executes a playbook inside the execution environment, and -m stdout (mode stdout) prints plain output. mode can also be set in ansible-navigator.yml.',
      w: ['A subcommand (run) is required and the option is -m stdout, not --stdout.', 'exec runs an arbitrary command inside the EE; it does not run a playbook with this syntax.', 'There is no play subcommand or -o text option.', ''],
      c: 'ansible-navigator run', s: 'Run playbooks with ansible-navigator', tags: ['rhce']
    },
    {
      d: 'i', t: 'output',
      q: 'Given the inventory:\n`[web]`\n`servera`\n`serverb`\n`[db]`\n`serverc`\n`[dev]`\n`serverd`\n`[prod:children]`\n`web`\n`db`\nA play uses `hosts: prod`. Select all that apply: which hosts does it target?',
      o: ['servera', 'serverb', 'serverc', 'serverd'],
      a: [0, 1, 2],
      e: '[prod:children] makes web and db child groups of prod, so prod contains all their hosts. ansible-inventory --graph prod confirms this.',
      w: ['', '', '', 'serverd is only in dev, which is not a child of prod.'],
      c: 'inventory groups', s: 'Read nested inventory groups', tags: ['rhce']
    },
    {
      d: 'i', t: 'log',
      q: 'Running `ansible all -m ansible.builtin.ping` gives:\n`serverc | UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: devops@serverc: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).", "unreachable": true}`\nOther hosts succeed. What is the most likely fix?',
      o: ['Install python3 on serverc', 'Install the control node public key for devops on serverc (for example ssh-copy-id devops@serverc)', 'Add become: true to the command', 'Set host_key_checking = True in ansible.cfg'],
      a: [1],
      e: 'The SSH layer rejected authentication for devops, so the key is missing or not accepted on serverc. Fix SSH key access for the remote_user; become only applies after login.',
      w: ['A missing interpreter gives a module failure after a successful connection, not an SSH permission denial.', '', 'Privilege escalation happens after login; it cannot fix an authentication failure.', 'Host key checking concerns verifying the server identity and would not fix a publickey rejection.'],
      c: 'ssh-copy-id', s: 'Fix managed node SSH access', tags: ['rhce']
    },
    {
      d: 'i', t: 'config',
      q: 'Tasks must run as root via sudo by default for the whole project, without prompting for a password. Which ansible.cfg section is correct?',
      o: ['[defaults]\nsudo = yes\nsudo_user = root', '[privilege_escalation]\nbecome = root\nbecome_method = su', '[become]\nenabled = true\nuser = root', '[privilege_escalation]\nbecome = True\nbecome_method = sudo\nbecome_user = root\nbecome_ask_pass = False'],
      a: [3],
      e: 'Privilege escalation settings live in [privilege_escalation]. The remote user also needs NOPASSWD sudo rights (for example in /etc/sudoers.d) for prompting to be unnecessary.',
      w: ['sudo and sudo_user are legacy settings that current ansible-core no longer uses; privilege escalation is configured with the become settings.', 'become is a boolean, not a user name, and su is not sudo.', 'There is no [become] section with these keys.', ''],
      c: 'privilege_escalation', s: 'Configure become in ansible.cfg', tags: ['rhce']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: 'Your project has ./ansible.cfg with inventory = ./inventory, yet `ansible all --list-hosts` returns only localhost warnings. `ansible --version` shows:\n`config file = /etc/ansible/ansible.cfg`\nWhat is the most likely cause?',
      o: ['You ran the command from a directory other than the project directory', 'ansible.cfg must be named .ansible.cfg in the project', 'The inventory must be in YAML, not INI', 'ansible-core ignores project config files unless ANSIBLE_CONFIG is set'],
      a: [0],
      e: './ansible.cfg is relative to the current working directory. cd into the project (or set ANSIBLE_CONFIG) and recheck with ansible --version.',
      w: ['', 'The project file is named ansible.cfg; .ansible.cfg applies only in the home directory.', 'INI and YAML inventories are both supported.', 'The current-directory file is used automatically (unless the directory is world-writable).'],
      c: 'ansible --version', s: 'Verify the active configuration', tags: ['rhce']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'Running `ansible web -m ansible.builtin.command -a "id -un" -b` fails on every web host with:\n`"msg": "Missing sudo password"`\nThe environment requires passwordless automation. What should you do?',
      o: ['Set become_method = su in ansible.cfg', 'Give the remote user root\'s password with -u root', 'On each node create /etc/sudoers.d/devops with devops ALL=(ALL) NOPASSWD: ALL (validated with visudo -cf), then rerun', 'Remove -b so the command runs without escalation'],
      a: [2],
      e: 'SSH works, but sudo on the nodes requires a password. A NOPASSWD rule for the automation user allows non-interactive become; alternatively -K prompts for the sudo password.',
      w: ['su needs the root password, which is still interactive.', 'Logging in directly as root bypasses the sudo design and needs root SSH access and credentials.', '', 'The command would then run as devops and print devops, not test privilege escalation.'],
      c: 'become / NOPASSWD', s: 'Configure non-interactive privilege escalation', tags: ['rhce']
    },
    {
      d: 'a', t: 'rca',
      q: 'site.yml uses role apache, installed earlier into ~/.ansible/roles. `ansible-playbook site.yml` works, but `ansible-navigator run site.yml -m stdout` fails with:\n`ERROR! the role \'apache\' was not found in /home/student/project/roles:/home/runner/.ansible/roles:...`\nWhat is the root cause?',
      o: ['ansible-navigator does not support roles', 'The playbook runs inside the execution environment container, which mounts the project directory but not your ~/.ansible/roles', 'The role needs a meta/main.yml with galaxy_info before navigator can use it', 'The execution environment image is too old to load roles'],
      a: [1],
      e: 'The EE only sees the project directory and its own content. Install roles and collections into the project (for example roles_path = ./roles and ansible-galaxy role install -p roles).',
      w: ['Roles work normally inside execution environments.', '', 'Local roles do not require galaxy metadata to be found.', 'The search path in the error shows the role directory is simply not visible inside the container.'],
      c: 'execution environment', s: 'Understand EE file visibility', tags: ['rhce']
    },
    {
      d: 'a', t: 'config',
      q: 'The variable http_port: 8080 must apply only to hosts in group web from the project inventory at ./inventory. Where should it go to follow standard layout?',
      o: ['./group_vars/web.yml next to the inventory', './host_vars/web.yml', 'In ansible.cfg under [defaults] as http_port = 8080', './roles/web/vars/web.yml'],
      a: [0],
      e: 'Ansible loads group_vars/<group>.yml (or a group_vars/<group>/ directory) relative to the inventory or playbook directory, applying the values to that group\'s hosts.',
      w: ['', 'host_vars files are named after individual hosts, not groups.', 'ansible.cfg configures Ansible itself; it does not define play variables.', 'Role vars apply wherever the role runs, not by inventory group, and the file would not be loaded by that name.'],
      c: 'group_vars', s: 'Place group variables', tags: ['rhce']
    }
  ],

  'L18-M4-T2': [
    {
      d: 'b', t: 'concept',
      q: 'When does a handler run in a play?',
      o: ['Immediately after every task that lists it in notify', 'After the tasks section completes, only if a task that notifies it reported changed', 'At the start of every play, before tasks', 'Only when a task fails'],
      a: [1],
      e: 'Notified handlers run once at the end of the tasks section (or when meta: flush_handlers is used), and only if a notifying task changed something.',
      w: ['Handlers are deferred; even multiple notifications result in one run.', '', 'Handlers are not run at play start.', 'Failure does not notify handlers; a failed host normally stops before handlers run.'],
      c: 'handlers', s: 'Understand handler execution', tags: ['rhce']
    },
    {
      d: 'b', t: 'config',
      q: 'Which task installs httpd and firewalld in one transaction?',
      o: ['- name: Install packages\n  ansible.builtin.dnf: httpd firewalld', '- name: Install packages\n  ansible.builtin.package:\n    install: httpd,firewalld', '- name: Install packages\n  ansible.builtin.command: dnf install httpd firewalld', '- name: Install packages\n  ansible.builtin.dnf:\n    name:\n      - httpd\n      - firewalld\n    state: present'],
      a: [3],
      e: 'The dnf module accepts a list in name, which installs all packages in a single transaction and is idempotent.',
      w: ['Module arguments must be key/value pairs; a bare package list is not valid.', 'package has no install option; it uses name and state.', 'command is not idempotent, reports changed every time and would prompt without -y.', ''],
      c: 'ansible.builtin.dnf', s: 'Install packages with a module', tags: ['rhce']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command checks site.yml for syntax errors without running any tasks?',
      o: ['ansible-navigator run site.yml -m stdout --syntax-check', 'ansible-navigator lint site.yml --run', 'ansible-playbook site.yml --check-syntax-only', 'ansible-doc --syntax site.yml'],
      a: [0],
      e: 'ansible-navigator passes --syntax-check through to ansible-playbook; ansible-playbook --syntax-check site.yml also works.',
      w: ['', 'lint is a separate linting tool and has no --run option to perform a syntax check.', 'The option is --syntax-check.', 'ansible-doc shows module documentation, not playbook syntax.'],
      c: '--syntax-check', s: 'Check playbook syntax', tags: ['rhce']
    },
    {
      d: 'i', t: 'output',
      q: 'Given:\n`- name: Read release\n  ansible.builtin.command: cat /etc/redhat-release\n  register: rel\n  changed_when: false\n- name: Show it\n  ansible.builtin.debug:\n    var: rel.stdout`\nWhat does the second task print on a RHEL 10.0 host?',
      o: ['"rel.stdout": "0"', '"rel.stdout": "changed"', '"rel.stdout": "Red Hat Enterprise Linux release 10.0 (Coughlan)"', 'The full JSON of rel including rc, stderr and cmd'],
      a: [2],
      e: 'register stores the module result; stdout holds the command output. debug var prints just that key.',
      w: ['0 is the rc (return code), not stdout.', 'changed_when: false makes the task report ok; that status is not stdout.', '', 'var: rel would print the whole dictionary; var: rel.stdout prints only stdout.'],
      c: 'register / debug', s: 'Use registered variables', env: 'RHEL 10', tags: ['rhce']
    },
    {
      d: 'i', t: 'config',
      q: 'A task must run only on RHEL 10 hosts. Which when clause is correct?',
      o: ['when: "{{ ansible_facts[\'distribution\'] }} == RedHat"', 'when: ansible_facts[\'distribution\'] == \'RedHat\' and ansible_facts[\'distribution_major_version\'] == \'10\'', 'when: distribution == RedHat and version == 10', 'when: ansible_facts.os == \'rhel10\''],
      a: [1],
      e: 'when takes a raw Jinja2 expression without braces. distribution_major_version is a string, so compare it to \'10\' (or cast with | int).',
      w: ['when must not use {{ }}, RedHat is unquoted, and it does not check the version.', '', 'These variables do not exist and the strings are unquoted.', 'There is no os fact with value rhel10.'],
      c: 'when / facts', s: 'Write conditionals with facts', tags: ['rhce']
    },
    {
      d: 'i', t: 'log',
      q: 'A playbook fails before running any tasks with:\n`ERROR! The requested handler \'restart httpd\' was not found in either the main handlers list nor in the listening handlers list`\nThe handlers section contains `- name: Restart httpd`. What is the fix?',
      o: ['Make the notify string match the handler name exactly (for example notify: Restart httpd)', 'Move the handler into the tasks section', 'Add become: true to the handler', 'Install the handler from a collection'],
      a: [0],
      e: 'Handler names are matched exactly and case-sensitively. Alternatively give the handler listen: restart httpd and notify that topic.',
      w: ['', 'Handlers must be in handlers, not tasks, to be notified.', 'Privilege escalation does not affect name resolution.', 'Handlers are part of the play or role, not installed from collections.'],
      c: 'notify', s: 'Match notify and handler names', tags: ['rhce']
    },
    {
      d: 'i', t: 'concept',
      q: 'Select all that apply: which statements about Ansible error handling are correct?',
      o: ['Tasks in rescue run only if a task in the block fails', 'Tasks in always run whether the block succeeded or failed', 'ignore_errors: true lets the play continue after that task fails', 'failed_when replaces the need for handlers', 'rescue runs after every block even when nothing failed'],
      a: [0, 1, 2],
      e: 'block/rescue/always works like try/catch/finally. ignore_errors continues past a failed task; failed_when changes what counts as failure.',
      w: ['', '', '', 'failed_when defines failure conditions; it is unrelated to handlers.', 'rescue runs only when a block task fails.'],
      c: 'block / rescue / always', s: 'Handle task errors', tags: ['rhce']
    },
    {
      d: 'a', t: 'output',
      q: 'Given:\n`TASK [Create users] ****`\n`changed: [servera] => (item=alice)`\n`ok: [servera] => (item=bob)`\nThe task uses ansible.builtin.user with name: "{{ item }}" and loop: "{{ users }}". What happened?',
      o: ['The loop ran twice for each user', 'bob failed and was skipped', 'Both users were created', 'alice was created or modified; bob already matched the desired state'],
      a: [3],
      e: 'Each loop iteration reports its own status: changed means the module altered the system, ok means it was already correct.',
      w: ['Each item appears once, so each ran once.', 'A failure would show failed:, not ok:.', 'ok means no change, so bob already existed as required.', ''],
      c: 'loop', s: 'Interpret loop output', tags: ['rhce']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'group_vars/web.yml sets http_port: 80, but the deployed template shows 8080. The play has:\n`- name: Web\n  hosts: web\n  vars:\n    http_port: 8080`\nNo extra vars were passed. Why?',
      o: ['group_vars always override play variables', 'Templates ignore group_vars', 'Play vars have higher precedence than inventory group_vars, so 8080 wins', 'Ansible reads only the first variable source it finds'],
      a: [2],
      e: 'In Ansible variable precedence, play vars outrank inventory group_vars and host_vars; extra vars (-e) outrank everything. Remove the play var or pass the desired value consistently.',
      w: ['The opposite is true.', 'Templates see all variables applicable to the host.', '', 'Variables from all sources are merged according to precedence.'],
      c: 'variable precedence', s: 'Debug variable precedence', tags: ['rhce']
    },
    {
      d: 'a', t: 'remediation',
      q: 'On the second run this task fails:\n`- name: Add alice\n  ansible.builtin.command: useradd alice`\n`"stderr": "useradd: user \'alice\' already exists", "rc": 9`\nWhat is the best remediation?',
      o: ['Add ignore_errors: true', 'Replace it with ansible.builtin.user: name=alice state=present', 'Wrap it in block/rescue that deletes and recreates alice', 'Change to ansible.builtin.shell: useradd alice || true'],
      a: [1],
      e: 'The user module checks current state and only changes what is needed, making the task idempotent and reporting changed correctly.',
      w: ['This hides real failures and still reports the task as failed (ignored).', '', 'Deleting and recreating a user is destructive and changes UIDs and files.', 'This hides errors and still reports changed every run.'],
      c: 'ansible.builtin.user', s: 'Write idempotent tasks', tags: ['rhce']
    }
  ],

  'L18-M5-T1': [
    {
      d: 'b', t: 'concept',
      q: 'In a role, which file holds default variables that users of the role are expected to override easily (lowest precedence)?',
      o: ['vars/main.yml', 'meta/main.yml', 'defaults/main.yml', 'tasks/defaults.yml'],
      a: [2],
      e: 'defaults/main.yml has the lowest variable precedence, so inventory, play and extra vars override it.',
      w: ['Role vars have high precedence and are hard to override.', 'meta/main.yml holds role metadata and dependencies.', '', 'This file is not loaded automatically.'],
      c: 'role defaults', s: 'Know role variable locations', tags: ['rhce']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command creates a new encrypted variables file group_vars/all/vault.yml, opening an editor?',
      o: ['ansible-vault create group_vars/all/vault.yml', 'ansible-vault encrypt_string group_vars/all/vault.yml', 'ansible-vault new group_vars/all/vault.yml', 'ansible-galaxy vault init group_vars/all/vault.yml'],
      a: [0],
      e: 'ansible-vault create prompts for a vault password and opens $EDITOR; the file is saved encrypted with a $ANSIBLE_VAULT;1.1;AES256 header.',
      w: ['', 'encrypt_string encrypts a single string value for pasting into YAML.', 'There is no new subcommand.', 'ansible-galaxy manages roles and collections, not vault files.'],
      c: 'ansible-vault create', s: 'Create vault-encrypted files', tags: ['rhce']
    },
    {
      d: 'b', t: 'command',
      q: 'Which command installs the collections listed in collections/requirements.yml into the project collections directory?',
      o: ['ansible-galaxy role install -r collections/requirements.yml', 'dnf install -r collections/requirements.yml', 'ansible-navigator collections install -r collections/requirements.yml', 'ansible-galaxy collection install -r collections/requirements.yml -p collections'],
      a: [3],
      e: 'ansible-galaxy collection install -r reads the requirements file and -p installs into ./collections/ansible_collections/<namespace>/<name>, which should match collections_path in ansible.cfg.',
      w: ['role install installs roles; collections need the collection subcommand.', 'dnf installs RPM packages, not Galaxy collections.', 'ansible-navigator collections lists collections in the EE; it does not install from a file.', ''],
      c: 'ansible-galaxy collection install', s: 'Install Content Collections', tags: ['rhce']
    },
    {
      d: 'i', t: 'output',
      q: 'Given templates/hosts.j2:\n`{% for h in groups[\'all\'] %}`\n`{{ hostvars[h][\'ansible_facts\'][\'default_ipv4\'][\'address\'] }} {{ hostvars[h][\'ansible_facts\'][\'fqdn\'] }} {{ hostvars[h][\'ansible_facts\'][\'hostname\'] }}`\n`{% endfor %}`\nFacts were gathered for all hosts. What does a rendered line look like?',
      o: ['servera 172.25.250.10 servera.lab.example.com', '172.25.250.10 servera.lab.example.com servera', '{{ 172.25.250.10 }} servera', 'h servera.lab.example.com h'],
      a: [1],
      e: 'For each inventory host the loop prints its IPv4 address, FQDN and short hostname from its facts, producing /etc/hosts style lines.',
      w: ['The order in the template is address, FQDN, hostname.', '', 'Expressions are replaced by values; braces do not appear in the output.', 'h is the loop variable name and is not printed literally.'],
      c: 'ansible.builtin.template', s: 'Predict Jinja2 template output', tags: ['rhce']
    },
    {
      d: 'i', t: 'config',
      q: 'Which collections/requirements.yml is valid for installing ansible.posix and community.general?',
      o: ['collections: ansible.posix, community.general', 'roles:\n  - ansible.posix\n  - community.general', '---\ncollections:\n  - name: ansible.posix\n  - name: community.general', '[collections]\nansible.posix\ncommunity.general'],
      a: [2],
      e: 'A collection requirements file is YAML with a collections list of entries containing name (and optionally version or source).',
      w: ['A comma-separated string is not a valid list of collection entries.', 'These are collections, not roles, so they belong under collections.', '', 'Requirements files are YAML, not INI.'],
      c: 'requirements.yml', s: 'Write a collections requirements file', tags: ['rhce']
    },
    {
      d: 'i', t: 'log',
      q: 'Running `ansible-navigator run site.yml -m stdout` fails with:\n`ERROR! Attempting to decrypt but no vault secrets found`\nWhat is the correct fix that keeps the secrets encrypted?',
      o: ['Supply the vault password, for example --vault-password-file vault-pass.txt with the file inside the project (permissions 600, excluded from Git), or --ask-vault-pass with playbook artifacts disabled', 'Run ansible-vault decrypt on the file before every run', 'Move the secrets into ansible.cfg', 'Rename vault.yml to vault.yml.disabled'],
      a: [0],
      e: 'The playbook loads a vaulted file but no password was provided. Navigator runs in a container, so a password file must be inside the project directory; interactive prompting needs --pae false with stdout mode.',
      w: ['', 'Decrypting leaves the secrets in plain text on disk.', 'ansible.cfg is not a variable store and would expose the secrets.', 'Removing the file breaks tasks that need the variables.'],
      c: 'vault password', s: 'Run playbooks with vaulted data', tags: ['rhce']
    },
    {
      d: 'i', t: 'concept',
      q: 'Select all that apply: which statements about role structure created by `ansible-galaxy role init roles/apache` are correct?',
      o: ['tasks/main.yml is the entry point loaded when the role runs', 'A template task inside the role can use src: httpd.conf.j2 to find roles/apache/templates/httpd.conf.j2', 'meta/main.yml can list role dependencies', 'Values in defaults/main.yml override group_vars', 'Handlers placed in tasks/handlers.yml are loaded automatically as handlers'],
      a: [0, 1, 2],
      e: 'Roles have fixed directories: tasks/main.yml runs first, templates/ and files/ are searched by relative name, meta/main.yml holds dependencies, handlers/main.yml holds handlers.',
      w: ['', '', '', 'Role defaults have the lowest precedence; group_vars override them.', 'Handlers are loaded from handlers/main.yml.'],
      c: 'role structure', s: 'Organise content in roles', tags: ['rhce']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'A playbook using `ansible.posix.firewalld` fails with:\n`ERROR! couldn\'t resolve module/action \'ansible.posix.firewalld\'. This often indicates a misspelling, missing collection, or incorrect module path.`\nThe FQCN is spelled correctly. What should you do?',
      o: ['Replace it with ansible.builtin.firewalld', 'Use ansible.builtin.command: firewall-cmd ... instead', 'Install python3-firewall on the control node', 'Install ansible.posix into a path the run can see (for example ansible-galaxy collection install ansible.posix -p collections with collections_path set), or use an EE that includes it'],
      a: [3],
      e: 'The collection is not available to the controller. Installing it into the project collections path (visible inside the EE) or using an EE that ships it resolves the module.',
      w: ['firewalld is not in ansible.builtin.', 'Shelling out loses idempotency and does not fix the missing collection.', 'Module resolution happens on the controller from installed collections; managed node Python bindings are a different requirement.', ''],
      c: 'collections_path', s: 'Resolve missing collections', tags: ['rhce']
    },
    {
      d: 'a', t: 'rca',
      q: 'A template task fails with:\n`AnsibleUndefinedVariable: \'dict object\' has no attribute \'default_ipv4\'`\nThe play header is:\n`- name: Configure hosts file\n  hosts: all\n  gather_facts: false`\nWhat is the root cause?',
      o: ['default_ipv4 was renamed in recent ansible-core', 'Facts were not gathered, so ansible_facts has no default_ipv4; enable gather_facts (or run ansible.builtin.setup) for the hosts the template references', 'The template must use a .yml extension', 'The managed hosts have no IPv4 address'],
      a: [1],
      e: 'With gather_facts: false the ansible_facts dictionary lacks network facts. When a template uses hostvars of other hosts, facts must be gathered for those hosts too.',
      w: ['default_ipv4 is still a standard fact.', '', 'Templates are Jinja2 files, usually .j2; the extension does not matter to rendering.', 'There is no evidence of that; the facts were never collected.'],
      c: 'gather_facts', s: 'Diagnose undefined facts in templates', tags: ['rhce']
    },
    {
      d: 'a', t: 'remediation',
      q: 'A reviewer finds `db_password: S3cret!` in plain text in group_vars/db.yml, which is committed to Git. What is the best remediation?',
      o: ['Delete the line and hard-code the password in the template', 'Change file permissions to 600 and keep it in Git', 'Rotate the password, move it to an encrypted file such as group_vars/db/vault.yml (vault_db_password), reference it from group_vars/db/vars.yml as db_password: "{{ vault_db_password }}", and keep the vault password file out of Git', 'Rename the variable to something less obvious'],
      a: [2],
      e: 'The secret is exposed in history, so it must be rotated; storing it with ansible-vault and referencing it by a vault_ prefixed variable keeps playbooks readable and the secret encrypted.',
      w: ['Hard-coding moves the secret into another plain text file.', 'Git history still contains the plain text secret and clones ignore local permissions.', '', 'Obscuring the name does not protect the value.'],
      c: 'ansible-vault', s: 'Protect secrets with Vault', tags: ['rhce']
    }
  ],

  'L18-M5-T2': [
    {
      d: 'b', t: 'command',
      q: 'You edited site.yml in a cloned Git repository. Which commands record the change locally?',
      o: ['git commit site.yml', 'git add site.yml; git commit -m "Update site playbook"', 'git push site.yml', 'git clone site.yml'],
      a: [1],
      e: 'git add stages the change and git commit records it with a message; git push then sends commits to the remote.',
      w: ['Without -m an editor opens, and the intended habit is staging with add first.', '', 'push sends existing commits; it does not take a file argument to commit.', 'clone copies a repository; it does not commit changes.'],
      c: 'git add / commit', s: 'Commit changes with Git', tags: ['rhce']
    },
    {
      d: 'b', t: 'concept',
      q: 'What does it mean for a playbook to be idempotent?',
      o: ['It runs on all hosts at the same time', 'It never fails', 'It runs each task only once per host', 'Running it again on already-configured hosts makes no changes (changed=0)'],
      a: [3],
      e: 'Idempotent tasks describe a desired state and only act when the current state differs, so repeated runs report ok rather than changed.',
      w: ['Parallelism (forks) is unrelated to idempotency.', 'Idempotent playbooks can still fail on errors.', 'Tasks run once per host per play anyway; idempotency is about not changing state again.', ''],
      c: 'idempotency', s: 'Define idempotency', tags: ['rhce']
    },
    {
      d: 'b', t: 'config',
      q: 'Which task allows the https service through firewalld permanently and immediately?',
      o: ['- name: Allow https\n  ansible.posix.firewalld:\n    service: https\n    permanent: true\n    immediate: true\n    state: enabled', '- name: Allow https\n  ansible.builtin.firewalld:\n    service: https\n    state: started', '- name: Allow https\n  ansible.posix.firewalld:\n    port: https\n    permanent: yes', '- name: Allow https\n  ansible.builtin.service:\n    name: https\n    state: enabled'],
      a: [0],
      e: 'permanent: true writes the permanent configuration and immediate: true also applies it to the runtime configuration; state: enabled adds the service.',
      w: ['', 'firewalld is not in ansible.builtin, and started is not a valid state for this module.', 'port expects a value like 443/tcp, no state is given, and without immediate it is not active until reload.', 'The service module manages systemd units, not firewall rules.'],
      c: 'ansible.posix.firewalld', s: 'Automate firewall rules', tags: ['rhce']
    },
    {
      d: 'i', t: 'config',
      q: 'You are automating: create VG vgdata on /dev/vdb, a 1 GiB LV, an XFS file system and a persistent mount. Select all that apply: which module FQCNs are correct?',
      o: ['community.general.lvg', 'community.general.lvol', 'ansible.posix.mount', 'ansible.builtin.lvol', 'ansible.builtin.filesystem'],
      a: [0, 1, 2],
      e: 'LVM and file system modules (lvg, lvol, filesystem, parted) are in community.general; mount (fstab plus mounting) is in ansible.posix.',
      w: ['', '', '', 'lvol is not part of ansible.builtin.', 'filesystem is community.general.filesystem, not ansible.builtin.'],
      c: 'community.general.lvol', s: 'Automate storage tasks', tags: ['rhce']
    },
    {
      d: 'i', t: 'output',
      q: 'A second run of site.yml shows:\n`TASK [Set motd] ****`\n`changed: [servera]`\n`PLAY RECAP`\n`servera : ok=9 changed=1 unreachable=0 failed=0 skipped=0`\nThe task is `ansible.builtin.shell: echo "Authorized use only" >> /etc/motd`. What does this indicate?',
      o: ['The play is idempotent because failed=0', 'servera is drifting and another tool changes /etc/motd', 'The task is not idempotent: it appends a line on every run; use ansible.builtin.copy with content: (or lineinfile) instead', 'changed=1 is expected for every shell task and is harmless'],
      a: [2],
      e: 'Appending with shell adds a duplicate line each run and always reports changed. A state-based module writes the file only if it differs.',
      w: ['Idempotency is about changed=0 on rerun, not just the absence of failures.', 'The task itself caused the change by appending.', '', 'It is not harmless: /etc/motd grows each run and changed results lose meaning.'],
      c: 'PLAY RECAP', s: 'Prove idempotency', tags: ['rhce']
    },
    {
      d: 'i', t: 'config',
      q: 'httpd must listen on 82/tcp with SELinux enforcing. Which module labels the port for http_port_t?',
      o: ['ansible.posix.selinux:\n  port: 82\n  type: http_port_t', 'community.general.seport:\n  ports: 82\n  proto: tcp\n  setype: http_port_t\n  state: present', 'ansible.builtin.sefcontext:\n  target: 82\n  setype: http_port_t', 'ansible.posix.seboolean:\n  name: http_port_82\n  state: true'],
      a: [1],
      e: 'community.general.seport manages SELinux port labels, equivalent to semanage port -a -t http_port_t -p tcp 82.',
      w: ['ansible.posix.selinux sets the SELinux mode and policy, not port labels.', '', 'sefcontext is community.general.sefcontext and manages file contexts, not ports.', 'There is no boolean that labels a specific port.'],
      c: 'community.general.seport', s: 'Automate SELinux port labels', tags: ['rhce']
    },
    {
      d: 'i', t: 'log',
      q: '`git push` fails with:\n`! [rejected]        main -> main (fetch first)`\n`hint: Updates were rejected because the remote contains work that you do not have locally.`\nWhat is the correct next step?',
      o: ['git push --force', 'Delete the local clone and copy files into a new clone', 'git commit --amend', 'git pull (merging or rebasing the remote commits), resolve any conflicts, then git push'],
      a: [3],
      e: 'Someone pushed commits you do not have. Integrate them first with git pull (or fetch plus rebase), then push.',
      w: ['Force pushing overwrites colleagues\' commits on the remote.', 'Recopying files is error prone and loses local history.', 'Amending rewrites your last commit and does not bring in the remote commits.', ''],
      c: 'git pull', s: 'Resolve rejected pushes', tags: ['rhce']
    },
    {
      d: 'a', t: 'rca',
      q: 'A playbook had:\n`- ansible.builtin.lineinfile:\n    path: /etc/ssh/sshd_config\n    line: PermitRootLogin yes`\nIt was later changed to `line: PermitRootLogin no`. After the run, sshd still permits root login and the file contains both lines, with yes appearing first. What is the root cause?',
      o: ['lineinfile without regexp only checks for the exact line; it appended the new line, and sshd uses the first value it reads. Add regexp: \'^#?PermitRootLogin\' so the existing line is replaced', 'sshd ignores sshd_config edits made by Ansible', 'lineinfile cannot edit files in /etc/ssh', 'The handler restarted sshd before the file was written'],
      a: [0],
      e: 'Without regexp, lineinfile adds the line if that exact text is missing. sshd takes the first occurrence of a keyword, so yes stays effective. Also restart sshd via a handler and validate with sshd -t.',
      w: ['', 'sshd reads the file at start; who edited it does not matter.', 'lineinfile can edit any file the become user can write.', 'Handlers run after tasks; the result shows both lines are present, which is the real problem.'],
      c: 'ansible.builtin.lineinfile', s: 'Edit configuration files idempotently', tags: ['rhce']
    },
    {
      d: 'a', t: 'remediation',
      q: 'A play creates users with:\n`- ansible.builtin.user:\n    name: alice\n    password: "{{ alice_pw }}"`\nalice_pw is a plain text password from Vault. alice cannot log in with it. What is the correct remediation?',
      o: ['Store the password unencrypted so Ansible can read it', 'Use ansible.builtin.command: echo pass | passwd --stdin alice on each run', 'Pass a hash: password: "{{ alice_pw | password_hash(\'sha512\') }}" (with update_password: on_create if it should only be set once)', 'Set password_lock: false'],
      a: [2],
      e: 'The user module expects an already hashed password and writes it directly to /etc/shadow. The password_hash filter produces a crypt hash.',
      w: ['Vault is not the problem; the module still needs a hash.', 'This is not idempotent, reports changed every run and can leak the password in logs.', '', 'The account is not locked; the stored value is simply not a valid hash.'],
      c: 'password_hash', s: 'Set user passwords with Ansible', tags: ['rhce']
    },
    {
      d: 'a', t: 'troubleshoot',
      q: 'On a fresh node, a play fails at:\n`TASK [Start httpd]`\n`fatal: [serverb]: FAILED! => {"msg": "Could not find the requested service httpd: host"}`\nThe play installs httpd in a later task. What is the fix?',
      o: ['Add ignore_errors: true to the service task', 'Order tasks so the ansible.builtin.dnf task that installs httpd runs before ansible.builtin.service starts it', 'Use state: restarted instead of started', 'Run systemctl daemon-reexec with ansible.builtin.command first'],
      a: [1],
      e: 'Tasks run in order; the unit file does not exist until the package is installed. Put install, configure, then start (enabled: true, state: started) in that order.',
      w: ['Ignoring the error leaves httpd not running.', '', 'Restarting a missing service fails the same way.', 'Re-executing systemd does not create a missing unit file.'],
      c: 'task ordering', s: 'Debug failing service tasks', tags: ['rhce']
    }
  ]
};
