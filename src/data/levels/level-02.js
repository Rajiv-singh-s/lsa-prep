// Level 2 - Command-Line Mastery
// Authoring format: docs/CONTENT_SPEC.md. Modules are declared as constants and assembled at the end of the file.

const M1 = {
  id: 'L02-M1',
  title: 'Shell basics and navigation',
  summary: 'How the shell reads a command line, how to get help offline, and how to move around the directory tree with absolute paths, relative paths and wildcards.',
  lessons: [
    {
      id: 'L02-M1-T1',
      title: 'The shell, the prompt, getting help and moving around (pwd, cd, ls, man)',
      minutes: 40,
      objectives: [
        'Read a Bash prompt and tell an unprivileged shell from a root shell',
        'Navigate the tree with pwd, cd (including cd -, cd ~ and cd ..) and list it with ls',
        'Interpret every column of ls -l output',
        'Find documentation offline with man, man -k/apropos, --help and clear the screen'
      ],
      prereqs: [],
      concept: `A **shell** is an ordinary user-space program that reads a line of text, splits it into words, expands special characters and then asks the kernel to run a program. On RHEL the default interactive shell is **Bash** (\`/bin/bash\`, which is really \`/usr/bin/bash\`). A **terminal** (or SSH session) only carries characters back and forth; the shell is what interprets them.

The **prompt** is the shell telling you it is ready. The RHEL default looks like \`[alice@web01 ~]$\`: user name, short host name, the *basename* of the current directory (\`~\` means your home directory) and a final character. **\`$\` means an unprivileged user; \`#\` means root.** Checking that last character before pressing Enter is a habit that prevents outages.

Every process, including your shell, has a **current working directory** (CWD). Relative paths are resolved from it. Three commands manage it:

- \`pwd\` prints the CWD. \`pwd -P\` resolves symbolic links and prints the physical path.
- \`cd DIR\` changes it. \`cd\` alone or \`cd ~\` goes home, \`cd -\` returns to the previous directory (stored in \`$OLDPWD\`), \`cd ..\` goes to the parent.
- \`ls\` lists directory contents. Without arguments it lists the CWD and hides names starting with a dot.

The most important listing is **\`ls -l\`** (long format). Each line shows the file type and permission string, the hard-link count, owner, group, size in bytes, modification time and name. Adding \`-a\` shows dot files, \`-h\` prints sizes as K/M/G, \`-t\` sorts by modification time, \`-r\` reverses the sort and \`-d\` lists a directory itself instead of its contents. \`ls -ltr\` (newest last) is the classic way to find the file that changed most recently in a log directory.

You will forget options constantly, and that is fine: Linux ships its documentation. **\`man ls\`** opens the manual page; inside it, \`/word\` searches, \`n\` jumps to the next hit and \`q\` quits. Manual pages are grouped into **sections**: 1 user commands, 5 file formats, 8 administration commands, so \`man 5 passwd\` documents the file while \`man 1 passwd\` documents the command. When you do not know the command name, **\`man -k keyword\`** (identical to \`apropos keyword\`) searches page names and short descriptions. Most GNU tools also accept \`--help\` for a quick summary. \`clear\` (or Ctrl+L) wipes the visible screen without affecting anything else.

> In the RHCSA exam there is no internet access. Being fluent with \`man\`, \`man -k\` and \`/usr/share/doc\` is an exam skill in its own right.`,
      internals: `When you press Enter, Bash tokenizes the line, performs expansions (tilde, variables, command substitution, globbing), then checks whether the first word is an alias, keyword, function or **builtin**. \`cd\` and \`pwd\` are builtins because a child process cannot change its parent's working directory: the kernel stores the CWD per process (visible as the symlink \`/proc/<PID>/cwd\`), so \`cd\` must run inside the shell itself. \`ls\` is an external program (\`/usr/bin/ls\` from coreutils): Bash calls \`fork()\` to create a child, the child calls \`execve()\` to load \`ls\`, and the parent waits for it. \`ls\` uses \`getdents64()\` to read directory entries and \`statx()\`/\`lstat()\` on each one to obtain the metadata shown by \`-l\`. \`man\` locates pages through the \`manpath\`, decompresses them from \`/usr/share/man\` and pipes them through a pager (usually \`less\`). \`man -k\` searches an index database that \`mandb\` builds; on a fresh minimal system you may need to run \`mandb\` as root once before \`apropos\` returns anything.`,
      useCases: [
        'Confirming you are in the right directory before running a recursive or destructive command',
        'Finding the newest log or core file in a busy directory with ls -ltr',
        'Looking up a configuration file format offline with man 5 during an incident or exam',
        'Discovering which tool manages a subsystem with man -k (for example man -k partition)'
      ],
      syntax: 'pwd [-L|-P]\ncd [DIR | - | ~ | ..]\nls [-l] [-a] [-h] [-t] [-r] [-d] [-R] [PATH...]\nman [SECTION] NAME\nman -k KEYWORD   (same as: apropos KEYWORD)\nCOMMAND --help\nclear',
      options: [
        ['ls -l', 'Long format: type+permissions, link count, owner, group, size, mtime, name'],
        ['ls -a / -A', 'Include dot files (-A omits the . and .. entries)'],
        ['ls -h', 'Human-readable sizes with -l (K, M, G)'],
        ['ls -t / -r', 'Sort by modification time / reverse the sort order'],
        ['ls -d', 'List the directory itself, not its contents'],
        ['cd -', 'Return to the previous directory ($OLDPWD)'],
        ['pwd -P', 'Print the physical path with symbolic links resolved'],
        ['man -k', 'Search manual page names and descriptions (apropos)']
      ],
      examples: [
        {
          title: 'Long listing of a log directory, newest last',
          cmd: 'ls -lhtr /var/log | tail -n 4',
          out: '-rw-------. 1 root root  12K Oct  9 08:01 cron\n-rw-------. 1 root root 1.1M Oct  9 08:14 secure\n-rw-------. 1 root root 3.4M Oct  9 08:15 messages\ndrwx------. 2 root root    23 Oct  9 08:15 audit',
          fields: [
            ['-rw-------.', 'First character is the type (- file, d directory, l symlink). The trailing dot means the file has an SELinux context'],
            ['1', 'Hard-link count'],
            ['root root', 'Owning user and owning group'],
            ['3.4M', 'Size (human readable because of -h)'],
            ['Oct  9 08:15', 'Last modification time (mtime)']
          ],
          note: 'Sorting with -t and reversing with -r puts the most recently written file at the bottom, right above your prompt.'
        },
        {
          title: 'Search the manuals when you do not know the command name',
          cmd: 'man -k "logical volume" | head -n 3',
          out: 'lvcreate (8)         - Create a logical volume\nlvdisplay (8)        - Display information about a logical volume\nlvextend (8)         - Add space to a logical volume',
          fields: [
            ['lvcreate', 'Name of the manual page'],
            ['(8)', 'Section 8: system administration commands'],
            ['- Create a ...', 'One-line description that apropos matched']
          ],
          note: 'If man -k prints "nothing appropriate", the index is probably missing: run sudo mandb once.'
        }
      ],
      walkthrough: [
        'Run `pwd` and `echo $HOME`. As a normal user both usually print `/home/<you>` right after login.',
        'Run `cd /etc/sysconfig`, then `cd /var/log`, then `cd -`. Bash prints the directory it returned to (`/etc/sysconfig`).',
        'Run `ls`, then `ls -a`, then `ls -la ~`. Notice the dot files (`.bashrc`, `.bash_profile`) that plain `ls` hides.',
        'Run `ls -ld /tmp` and compare it with `ls -l /tmp`: `-d` describes the directory itself (note the `t` sticky bit in `drwxrwxrwt`).',
        'Open `man ls`, type `/-t` and press Enter, press `n` to jump between hits, then `q` to quit.',
        'Run `man -k crontab` and then `man 5 crontab` to read the file format rather than the command.'
      ],
      lab: {
        goal: 'Become fluent with navigation, long listings and offline documentation on a RHEL 9/10 VM.',
        steps: [
          'Log in as a normal user and record the prompt. Run `sudo -i`, note how the prompt changes to end in `#`, then `exit`.',
          'Run `cd /usr/share/doc && pwd`, then `cd` with no argument and `pwd` again to prove you are home.',
          'Run `ls -lhS /var/log | head -n 5` (as root or with sudo) to list the largest entries first (`-S` sorts by size).',
          'Run `ls -ltr /etc | tail -n 3` to see which files under /etc changed most recently.',
          'Run `man -k "network interface"` and pick one page from section 8. Open it and find the EXAMPLES section with `/EXAMPLES`.',
          'Run `ls --help | grep -- --sort` to see the sort keys GNU ls accepts.'
        ],
        verify: '`cd -` returns you to the previous directory and prints it; `ls -ld /tmp` prints a single line beginning with `drwxrwxrwt`; `man -k crontab` lists entries in sections 1 and 5.'
      },
      troubleshooting: {
        scenario: 'A junior admin reports that `man -k firewall` prints "firewall: nothing appropriate" on a freshly built minimal VM, although `man firewall-cmd` works.',
        steps: [
          'Evidence: `man firewall-cmd` works, so the page exists; only the keyword search fails.',
          'Hypothesis: the whatis/apropos index has not been built yet (it is normally refreshed by a systemd timer, which may not have run).',
          'Fix: run `sudo mandb` to build the index.',
          'Validate: `man -k firewall` now lists firewall-cmd(1) and related pages.'
        ]
      },
      mistakes: [
        'Not reading the prompt: running a destructive command in a `#` root shell you thought was a normal one.',
        'Assuming `cd` failed silently: if the directory does not exist Bash prints an error and you stay where you were, so the next relative command runs in the wrong place.',
        'Using `ls -l DIR` to check a directory\'s own permissions; it lists the contents. Use `ls -ld DIR`.',
        'Reading `man passwd` when you needed the file format in `man 5 passwd`.'
      ],
      safety: [
        'Navigation and listing are read-only and safe, but always run `pwd` before relative destructive commands such as `rm -r *`.',
        'Some directories (/root, /var/log/audit) are readable only by root; use `sudo ls` rather than switching to a persistent root shell.'
      ],
      distro: 'RHEL, Rocky and AlmaLinux use Bash with the prompt format `[user@host dir]$` (set in /etc/bashrc). Debian/Ubuntu use `user@host:~/dir$`, often coloured. GNU `ls` on all of them prints a trailing `.` (SELinux context) or `+` (ACL) after the permission string when present; on Ubuntu, where SELinux is not used, you will mostly see no dot.',
      challenge: {
        task: 'Without leaving your home directory (no `cd`), list only the five most recently modified entries under `/etc`, newest first, in long format with human-readable sizes. Then find which manual section documents the format of `/etc/fstab`.',
        solution: `Use a path argument instead of changing directory, and let \`ls\` sort by time:

\`\`\`
ls -lht /etc | head -n 6
\`\`\`

\`-t\` sorts newest first; \`head -n 6\` keeps the "total" line plus five entries. For the documentation:

\`\`\`
man -k fstab
man 5 fstab
\`\`\`

\`man -k\` shows \`fstab (5)\`: section 5 is file formats, which is exactly what you want when editing the file.`
      },
      interview: [
        {
          q: 'Why is cd a shell builtin rather than a program in /usr/bin?',
          a: 'The current working directory is a per-process attribute. An external program runs in a child process, so changing its directory would not affect the parent shell. cd therefore has to execute inside the shell process itself.',
          mistake: 'Saying it is a builtin "for speed".',
          followUp: 'Which other commands must be builtins for the same reason? (export, source/., exit, umask, ulimit)'
        },
        {
          q: 'How do you find a command when you only know what it should do?',
          a: 'Use man -k keyword (apropos) to search page names and descriptions, narrow by section (for example man -k -s 8 keyword), then read the page. If nothing is found, rebuild the index with mandb.',
          mistake: 'Saying "Google it" - often impossible on secured servers and in the exam.',
          followUp: 'What do manual sections 1, 5 and 8 contain?'
        },
        {
          q: 'What does the dot after the permission string in ls -l mean?',
          a: 'It indicates the file has an SELinux security context. A plus sign instead indicates an ACL is present.',
          mistake: 'Ignoring it or calling it a hidden-file marker.',
          followUp: 'How do you display the SELinux context? (ls -Z)'
        }
      ],
      revision: [
        '`$` prompt = normal user, `#` prompt = root.',
        '`cd -` toggles to the previous directory; `cd` alone goes home.',
        '`ls -l` columns: type/perms, links, owner, group, size, mtime, name. `ls -ld` for the directory itself.',
        '`man N page` picks a section: 1 commands, 5 file formats, 8 admin commands.',
        '`man -k` = `apropos`; run `mandb` if the index is empty.'
      ]
    },
    {
      id: 'L02-M1-T2',
      title: 'Absolute and relative paths, and wildcards (globbing)',
      minutes: 35,
      objectives: [
        'Distinguish absolute paths from relative paths and resolve . , .. and ~',
        'Use the glob characters *, ?, [...] and [!...] to match file names',
        'Explain that the shell, not the command, expands wildcards',
        'Predict what happens when a glob matches nothing or matches hidden files'
      ],
      prereqs: ['L02-M1-T1'],
      concept: `A **path** names a location in the single directory tree. An **absolute path** starts with \`/\` and is resolved from the root directory, so it means the same thing no matter where you are: \`/etc/ssh/sshd_config\`. A **relative path** does not start with \`/\` and is resolved from the current working directory: if you are in \`/etc\`, then \`ssh/sshd_config\` names the same file.

Every directory contains two special entries: **\`.\`** (the directory itself) and **\`..\`** (its parent). In \`/var/log\`, the path \`../lib\` means \`/var/lib\`, and \`./script.sh\` means "the file called script.sh right here". The \`./\` is needed to run a program in the current directory because the shell only searches the directories listed in \`$PATH\`, and \`.\` is deliberately not in it. The **tilde** \`~\` is expanded by the shell to your home directory, and \`~bob\` to bob's home directory.

**Wildcards** (also called **globs**) let one word match many file names:

- \`*\` matches any string, including the empty string: \`*.conf\`
- \`?\` matches exactly one character: \`file?.txt\` matches \`file1.txt\` but not \`file10.txt\`
- \`[abc]\` matches one character from the set; \`[0-9]\` a range; \`[!0-9]\` (or \`[^0-9]\`) any character *not* in the set
- Character classes such as \`[[:digit:]]\` and \`[[:upper:]]\` are locale-safe alternatives to ranges

The crucial idea is **who expands the wildcard: the shell does**, before the command starts. When you type \`ls *.log\`, \`ls\` never sees the asterisk; it receives the list \`a.log b.log c.log\` as separate arguments. Consequences follow:

- By default a \`*\` does **not match names that begin with a dot**, so \`rm -r *\` leaves dot files behind and \`ls *\` hides them.
- If a glob matches **nothing**, Bash passes the pattern **literally** (\`ls *.bak\` then complains \`cannot access '*.bak'\`).
- A huge match can exceed the kernel's argument size limit, producing \`Argument list too long\`; the fix is \`find\` (Module 3) rather than a bigger glob.
- Quoting a glob (\`'*.log'\`) stops the shell expanding it, which is exactly what you want when passing a pattern to \`find -name\`.

**Brace expansion** looks similar but is different: \`mkdir app/{bin,etc,log}\` generates the words whether or not they exist, while globs only match existing names.`,
      internals: `Path resolution is done by the kernel on every system call that takes a path (\`openat()\`, \`stat()\`, \`execve()\`). For an absolute path it starts at the process's root directory; for a relative one it starts at the process's CWD, then walks one component at a time, looking each name up in the directory's entries (using the dentry cache), checking execute (search) permission on every directory along the way and following symbolic links. \`..\` at \`/\` stays at \`/\`.

Glob expansion happens entirely in Bash, in user space, after variable and command substitution and word splitting. Bash reads the directories involved, matches each name against the pattern with \`fnmatch()\`-style rules and replaces the word with the sorted list of matches. Shell options change the rules: \`shopt -s dotglob\` lets \`*\` match dot files, \`shopt -s nullglob\` makes an unmatched glob expand to nothing, \`shopt -s failglob\` turns it into an error and \`shopt -s globstar\` enables recursive \`**\`. The total size of the argument list passed to \`execve()\` is limited (see \`getconf ARG_MAX\`, typically 2 MiB on x86_64).`,
      useCases: [
        'Writing scripts and cron jobs with absolute paths so they work regardless of the starting directory',
        'Selecting rotated logs such as messages-2026* for archiving',
        'Listing only numbered device nodes with /dev/sd[a-d] or /dev/nvme?n1',
        'Creating a standard directory skeleton in one command with brace expansion'
      ],
      syntax: 'cd /absolute/path\ncd relative/path\ncd ..   cd ../sibling   ./program\nls *.conf   ls file?.txt   ls [a-c]*   ls [!0-9]*\nshopt -s dotglob | nullglob | globstar\nmkdir -p dir/{a,b,c}',
      options: [
        ['*', 'Any string (including empty); does not match a leading dot by default'],
        ['?', 'Exactly one character'],
        ['[a-z] / [!a-z]', 'One character in / not in the set or range'],
        ['[[:digit:]]', 'POSIX character class, locale independent'],
        ['{a,b}', 'Brace expansion: generates words, does not check the filesystem'],
        ['shopt -s nullglob', 'Unmatched globs expand to nothing instead of the literal pattern'],
        ['shopt -s dotglob', 'Let * and ? match names starting with a dot']
      ],
      examples: [
        {
          title: 'Relative navigation with ..',
          cmd: 'cd /var/log/httpd && cd ../../lib && pwd',
          out: '/var/lib',
          fields: [['/var/lib', 'From /var/log/httpd, two levels up is /var, then into lib']],
          note: 'The && ensures the second cd only runs if the first succeeded.'
        },
        {
          title: 'See exactly what a glob expands to before using it',
          cmd: 'echo /etc/*.conf | tr \' \' \'\\n\' | head -n 4',
          out: '/etc/chrony.conf\n/etc/dnf.conf\n/etc/host.conf\n/etc/kdump.conf',
          fields: [['/etc/chrony.conf ...', 'The shell replaced /etc/*.conf with the sorted list of matching names before echo ran']],
          note: 'Previewing with echo or ls before rm is the cheapest safety check there is.'
        },
        {
          title: 'An unmatched glob is passed literally',
          cmd: 'ls /tmp/*.bak',
          out: 'ls: cannot access \'/tmp/*.bak\': No such file or directory',
          fields: [['\'/tmp/*.bak\'', 'No file matched, so Bash handed the literal pattern to ls, which looked for a file with an asterisk in its name']]
        }
      ],
      walkthrough: [
        'Create a sandbox: `mkdir -p ~/globlab && cd ~/globlab && touch a.log b.log c.txt file1 file2 file10 .hidden`.',
        'Run `ls *`. Notice `.hidden` is missing: `*` skips leading dots.',
        'Run `echo file?` (prints file1 file2) and `echo file*` (adds file10).',
        'Run `echo [ab].log` and `echo [!a]*` to practise sets and negation.',
        'Run `echo *.bak` and see the literal pattern printed; then `shopt -s nullglob; echo *.bak` prints an empty line. Turn it off with `shopt -u nullglob`.',
        'From `~/globlab` run `ls ../globlab/a.log` and `ls ~/globlab/a.log`: two different paths, same file.'
      ],
      lab: {
        goal: 'Use absolute and relative paths confidently and predict glob expansion on a RHEL VM.',
        steps: [
          'Run `cd /usr/share/doc` then reach `/usr/share/man` using only a relative path (`cd ../man`) and confirm with `pwd`.',
          'Run `ls -d /etc/[a-c]*` to list entries in /etc starting with a, b or c.',
          'Run `ls /dev/tty?` and then `ls /dev/tty[0-9][0-9]` and compare the counts with `| wc -l`.',
          'Create a skeleton: `mkdir -p ~/app/{bin,conf,logs}` and verify with `ls ~/app`.',
          'Run `cd /tmp && touch -- -n && ls` then remove the oddly named file with `rm -- -n` (or `rm ./-n`).',
          'Run `getconf ARG_MAX` to see the argument-list size limit on your system.'
        ],
        verify: '`pwd` printed `/usr/share/man`; `ls ~/app` shows bin conf logs; `ls /tmp/-n` reports no such file after cleanup.'
      },
      troubleshooting: {
        scenario: 'A cleanup script runs `rm /data/spool/*` and fails with `/usr/bin/rm: Argument list too long`.',
        steps: [
          'Evidence: count the files with `ls -f /data/spool | wc -l` (hundreds of thousands).',
          'Hypothesis: the shell expanded the glob into more argument bytes than ARG_MAX allows, so execve() failed before rm even started.',
          'Fix: let find walk the directory without building a giant argument list: `find /data/spool -maxdepth 1 -type f -delete` (preview first without -delete).',
          'Validate: re-count with `ls -f /data/spool | wc -l` and check the job log.'
        ]
      },
      mistakes: [
        'Using relative paths in cron jobs or systemd units: they run with a different working directory, so the path resolves somewhere else.',
        'Expecting `*` to include dot files; it does not unless dotglob is set.',
        'Forgetting that an unmatched glob is passed literally, which can make scripts operate on a file literally named `*.log`.',
        'Not quoting the pattern in `find . -name *.log`: if the current directory contains a .log file the shell expands it first and find receives the wrong pattern.'
      ],
      safety: [
        'Preview any glob with `echo` or `ls -d` before using it with rm, mv or chmod.',
        'Never run `rm -rf` with a path built from a variable that might be empty (`rm -rf "$DIR"/*` becomes `rm -rf /*`); use `${DIR:?}` or check first.',
        'Files whose names start with `-` can be misread as options; use `--` or `./` before them.'
      ],
      distro: 'Globbing is a shell feature and is identical in Bash on RHEL, Debian and Ubuntu. Debian/Ubuntu use `/bin/sh` -> dash for scripts, which supports `*`, `?` and `[...]` but not brace expansion or globstar; RHEL\'s `/bin/sh` is Bash running in POSIX mode.',
      challenge: {
        task: 'In a directory containing `report1.csv`, `report2.csv`, `report10.csv`, `report_old.csv` and `.report.csv`, write one glob that matches only the single-digit numbered reports, and one command that lists every file including the hidden one without using `ls -a`.',
        solution: `Single-digit reports:

\`\`\`
ls report[0-9].csv
\`\`\`

\`[0-9]\` matches exactly one digit, so \`report10.csv\` (two characters before .csv) and \`report_old.csv\` are excluded.

All files including the hidden one:

\`\`\`
ls -d .??* *
\`\`\`

or enable dotglob for one command in a subshell: \`(shopt -s dotglob; ls -d *)\`. Using \`.*\` alone would also match \`.\` and \`..\` in older shells, which is why \`.??*\` or dotglob is preferred.`
      },
      interview: [
        {
          q: 'Who expands wildcards such as *.log, the shell or the command?',
          a: 'The shell. It replaces the pattern with a sorted list of matching names before executing the command, so the program only sees ordinary arguments. That is why quoting the pattern passes it unexpanded to tools like find that do their own matching.',
          mistake: 'Saying ls or rm understand wildcards.',
          followUp: 'What does Bash do by default when a glob matches nothing?'
        },
        {
          q: 'Why do you need ./ to run a script in the current directory?',
          a: 'The shell searches for commands only in the directories listed in PATH, and the current directory is not in PATH for security reasons (to avoid running a malicious file named like a common command). ./script gives an explicit relative path, so no PATH search happens.',
          mistake: 'Saying ./ is needed to make the script executable.',
          followUp: 'Why is putting . at the start of PATH dangerous?'
        },
        {
          q: 'How would you delete a million files from one directory when rm * fails?',
          a: 'The glob exceeds ARG_MAX. Use find DIR -maxdepth 1 -type f -delete, or find ... -print0 | xargs -0 rm, which batch the work. Preview with find ... -print first.',
          mistake: 'Suggesting rm -rf DIR, which also removes the directory and anything else in it.',
          followUp: 'How can you check the ARG_MAX limit?'
        }
      ],
      revision: [
        'Absolute paths start with `/`; relative paths start from the CWD.',
        '`.` = this directory, `..` = parent, `~` = home (expanded by the shell).',
        'Globs: `*` any string, `?` one char, `[...]` one char from a set, `[!...]` negated set.',
        'The shell expands globs; `*` skips dot files; unmatched globs stay literal by default.',
        'Brace expansion `{a,b}` generates words even if no file exists.'
      ]
    }
  ]
};

const M2 = {
  id: 'L02-M2',
  title: 'Working with files',
  summary: 'Create, copy, move, rename and delete files and directories safely, then inspect them with cat, less, head, tail, file and stat.',
  lessons: [
    {
      id: 'L02-M2-T1',
      title: 'Creating, copying, moving and deleting (mkdir, touch, cp, mv, rm, rmdir)',
      minutes: 40,
      objectives: [
        'Create directory trees with mkdir -p and empty files or timestamp updates with touch',
        'Copy files and directories with cp -r and preserve metadata with cp -a',
        'Rename and move with mv and understand when a move is a rename versus a copy',
        'Delete safely with rm, rm -i, rmdir and the -- end-of-options marker'
      ],
      prereqs: ['L02-M1-T2'],
      concept: `These six commands are the core of everyday file management and an explicit RHCSA objective ("create, delete, copy, and move files and directories").

**mkdir** creates directories. \`mkdir a/b/c\` fails if \`a/b\` does not exist; **\`mkdir -p a/b/c\`** creates every missing parent and does not complain if the target already exists, which makes it safe to repeat in scripts. \`-m 750\` sets the mode at creation time.

**touch** updates a file's access and modification timestamps to now, and **creates an empty file if it does not exist**. \`touch -d '2026-01-01 00:00' f\` sets a specific time; \`touch -r ref f\` copies times from another file.

**cp SRC DEST** copies. If DEST is an existing directory the copy goes inside it. Copying a directory needs **\`-r\`** (recursive). A plain \`cp\` creates a new file owned by *you* with a fresh mtime; to keep ownership, permissions, timestamps, links and (with SELinux) contexts use **\`cp -a\`** (archive, equivalent to \`-dR --preserve=all\`). \`-i\` asks before overwriting, \`-v\` shows each action, and \`-p\` preserves mode, ownership and timestamps.

**mv SRC DEST** moves or renames. Within one filesystem a move is just a **rename**: the data never moves, only the directory entry changes, so it is instantaneous even for huge files. Across filesystems (for example from \`/home\` to \`/var\` on separate partitions) \`mv\` must copy the data and then delete the source.

**rm** removes directory entries. There is **no recycle bin**: once the last name is removed and no process holds the file open, the space is released. \`rm -r\` removes directories recursively, \`-f\` suppresses prompts and errors, and \`-i\` asks for each file. On RHEL, root's \`~/.bashrc\` defines \`alias rm='rm -i'\`, \`cp='cp -i'\` and \`mv='mv -i'\` as a safety net - but scripts and other users do not get these aliases.

**rmdir** removes only **empty** directories, which makes it a safe way to clean up: it refuses rather than deleting contents.

Two more rules prevent accidents. First, a file named \`-rf\` or \`-n\` looks like an option; **\`--\`** marks the end of options (\`rm -- -rf\`), or use \`./-rf\`. Second, a trailing slash matters with directories in some tools, so be deliberate about whether you are naming a directory or its contents.`,
      internals: `A directory is a table of names pointing to inodes. \`touch\` on a new name calls \`openat(..., O_CREAT)\` which allocates an inode and adds a directory entry; on an existing name it calls \`utimensat()\` to change timestamps. \`mkdir\` calls \`mkdir()\`, which creates the \`.\` and \`..\` entries. \`mv\` within a filesystem calls \`rename()\`, an atomic operation that swaps a directory entry - this is why "write to a temp file then mv over the original" is the standard way to update config files atomically. If \`rename()\` fails with \`EXDEV\` (cross-device), coreutils falls back to copy + unlink. \`rm\` calls \`unlink()\` (or \`unlinkat()\`), which removes one name and decrements the inode's link count; the data blocks are freed only when the link count is zero **and** no process has the file open. \`rmdir()\` succeeds only if the directory contains nothing but \`.\` and \`..\`. \`cp\` opens the source, creates the destination and copies bytes (GNU cp may use \`copy_file_range()\` or reflinks on XFS when \`--reflink\` is allowed).`,
      useCases: [
        'Taking a timestamped backup before editing a config file: cp -a /etc/ssh/sshd_config{,.bak.$(date +%F)}',
        'Migrating an application directory to a new volume while preserving ownership and SELinux labels with cp -a',
        'Atomically replacing a file by writing a temp copy and renaming it with mv',
        'Creating a deployment directory tree idempotently with mkdir -p in automation'
      ],
      syntax: 'mkdir [-p] [-m MODE] DIR...\ntouch [-d DATE | -r REF] FILE...\ncp [-i] [-r] [-a|-p] [-v] SRC... DEST\nmv [-i] [-n] [-v] SRC... DEST\nrm [-i|-f] [-r] [--] FILE...\nrmdir [-p] DIR...',
      options: [
        ['mkdir -p', 'Create missing parents; no error if the directory already exists'],
        ['cp -r / -R', 'Copy directories recursively'],
        ['cp -a', 'Archive: recursive, keep links, mode, ownership, timestamps, xattrs/SELinux context'],
        ['cp -i / mv -i', 'Prompt before overwriting an existing destination'],
        ['mv -n', 'Never overwrite an existing destination'],
        ['rm -r / -f', 'Recursive removal / force (no prompts, ignore missing files)'],
        ['--', 'End of options: everything after it is a file name'],
        ['touch -d', 'Set an explicit timestamp instead of now']
      ],
      examples: [
        {
          title: 'Back up a config file with metadata preserved',
          cmd: 'sudo cp -a /etc/chrony.conf /etc/chrony.conf.bak && ls -l /etc/chrony.conf*',
          out: '-rw-r--r--. 1 root root 1384 Apr  2  2026 /etc/chrony.conf\n-rw-r--r--. 1 root root 1384 Apr  2  2026 /etc/chrony.conf.bak',
          fields: [['Apr  2  2026', 'The backup keeps the original mtime because of -a; a plain cp would show the current time']],
          note: 'Keep backups next to the original only briefly; files ending in .bak inside *.d directories can still be read by some services.'
        },
        {
          title: 'rmdir refuses to delete a non-empty directory',
          cmd: 'mkdir -p ~/demo/sub && touch ~/demo/sub/f && rmdir ~/demo/sub',
          out: 'rmdir: failed to remove \'/home/alice/demo/sub\': Directory not empty',
          fields: [['Directory not empty', 'rmdir only removes empty directories; this is a safety feature']]
        },
        {
          title: 'Verbose recursive copy',
          cmd: 'cp -rv ~/app/conf /tmp/',
          out: '\'/home/alice/app/conf\' -> \'/tmp/conf\'\n\'/home/alice/app/conf/app.ini\' -> \'/tmp/conf/app.ini\'',
          fields: [['->', 'Each source and the destination it was written to']]
        }
      ],
      walkthrough: [
        'Run `mkdir -p ~/files/{src,dst}/nested` and `ls -R ~/files` to see the tree.',
        'Run `touch ~/files/src/a.txt`, wait a minute, run `stat -c \'%y %n\' ~/files/src/a.txt`, then `touch` it again and compare the time.',
        'Copy with `cp ~/files/src/a.txt ~/files/dst/` and with `cp -a`; compare mtimes using `ls -l --time-style=full-iso`.',
        'Rename with `mv ~/files/dst/a.txt ~/files/dst/b.txt` and confirm the inode number is unchanged with `ls -i` before and after.',
        'Try `rmdir ~/files/src` (fails, not empty), then `rm -ri ~/files/src` and answer the prompts.',
        'Create and remove a hostile name: `touch ~/files/-f && rm -- ~/files/-f`.'
      ],
      lab: {
        goal: 'Perform safe, metadata-aware file operations as you would during a change window.',
        steps: [
          'As root, back up the SSH daemon config with a date suffix: `cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.$(date +%F)`.',
          'Compare original and backup: `ls -lZ /etc/ssh/sshd_config*` (same owner, mode, SELinux type and mtime).',
          'Create `/srv/web/{html,logs}` with `mkdir -p` and copy `/etc/hosts` into html as `index.txt`.',
          'Move `/srv/web/html/index.txt` to `/srv/web/logs/` and verify with `ls -i` that the inode number did not change (same filesystem).',
          'Remove the backup with `rm -i` and the tree with `rm -r /srv/web` after confirming the path with `ls -R /srv/web`.',
          'Check root\'s aliases with `alias | grep -E "rm|cp|mv"`.'
        ],
        verify: '`ls -lZ` shows identical metadata on the backup; `ls -i` before and after mv shows the same inode; `ls /srv/web` fails with "No such file or directory" after cleanup.'
      },
      troubleshooting: {
        scenario: 'After restoring /var/www/html from a backup with plain `cp -r`, Apache returns 403 Forbidden although the files are present.',
        steps: [
          'Evidence: `ls -lZ /var/www/html` shows files owned by the admin user and labelled `user_home_t` or `admin_home_t` instead of `httpd_sys_content_t`.',
          'Hypothesis: plain cp created new files with the copier\'s ownership and default contexts instead of preserving the originals.',
          'Fix: restore correct labels with `restorecon -Rv /var/www/html` and fix ownership/modes as required; in future copy with `cp -a` or restore with tar/rsync preserving attributes.',
          'Validate: `ls -Z` shows httpd_sys_content_t and `curl -I http://localhost/` returns 200.'
        ]
      },
      mistakes: [
        'Relying on root\'s `rm -i` alias in scripts; scripts run non-interactively without it.',
        'Using plain `cp` for backups or migrations, losing ownership, timestamps and SELinux contexts.',
        'Expecting `rm` to free space instantly when a process still has the file open (covered in Level 3).',
        'Typing `rm -rf / tmp/x` (stray space): GNU rm refuses `/` thanks to --preserve-root, but `rm -rf ./ *` style typos still destroy data.'
      ],
      safety: [
        'rm is irreversible: list the target first (`ls -d path`), prefer `-i` interactively and have backups.',
        'Use `cp -a` (or `cp --preserve=all`) when copying system files to keep ownership and SELinux labels.',
        'Root is required to modify files under /etc, /usr and /srv; use sudo for the single command rather than a root shell.'
      ],
      distro: 'GNU coreutils behaves the same on RHEL and Debian/Ubuntu. The interactive `rm -i`, `cp -i`, `mv -i` aliases are a RHEL-family default for root (in /root/.bashrc); Debian/Ubuntu do not define them by default. `cp -a` copies SELinux contexts on RHEL; on systems without SELinux it simply preserves the other attributes.',
      challenge: {
        task: 'You must replace `/etc/app/app.conf` with a new version `/tmp/app.conf.new` so that the application never sees a half-written file, while keeping a dated backup with the original metadata. Both paths are on the same filesystem as /etc. Give the commands and explain why they are safe.',
        solution: `\`\`\`
cp -a /etc/app/app.conf /etc/app/app.conf.$(date +%F)
cp /tmp/app.conf.new /etc/app/.app.conf.tmp
chown --reference=/etc/app/app.conf /etc/app/.app.conf.tmp
chmod --reference=/etc/app/app.conf /etc/app/.app.conf.tmp
mv /etc/app/.app.conf.tmp /etc/app/app.conf
restorecon -v /etc/app/app.conf
\`\`\`

The backup uses \`cp -a\` so ownership, mode, timestamps and SELinux context are kept. The new content is written to a temporary name *in the same directory* (so it is on the same filesystem); \`mv\` then performs an atomic \`rename()\`, so any reader opens either the complete old file or the complete new one. \`restorecon\` ensures the final file has the correct SELinux label for its path.`
      },
      interview: [
        {
          q: 'Why is mv of a 50 GB file instantaneous in one case and slow in another?',
          a: 'Within the same filesystem mv calls rename(), which only changes directory entries; the data blocks are untouched. Across filesystems rename() fails with EXDEV, so mv copies all the data and then deletes the source.',
          mistake: 'Saying mv always copies and deletes.',
          followUp: 'How can you tell whether two paths are on the same filesystem? (df PATH or stat -c %d / findmnt -T)'
        },
        {
          q: 'What is the difference between cp -r and cp -a?',
          a: 'cp -r copies recursively but creates new files with the current user as owner, default mode (umask) and new timestamps, and it follows symlinks given on the command line. cp -a is -dR --preserve=all: recursive, keeps symlinks as symlinks and preserves mode, ownership, timestamps, xattrs and SELinux context.',
          mistake: 'Saying they are the same.',
          followUp: 'Which tools would you use for a large migration that may be interrupted? (rsync -aAXH)'
        },
        {
          q: 'How do you remove a file named -rf?',
          a: 'Use rm -- -rf, where -- ends option parsing, or rm ./-rf so the argument no longer starts with a dash.',
          mistake: 'Quoting it as rm "-rf"; quotes are removed by the shell and rm still sees an option.',
          followUp: 'What other commands accept -- ?'
        }
      ],
      revision: [
        '`mkdir -p` creates parents and is idempotent.',
        '`touch` creates empty files or updates timestamps.',
        '`cp -a` preserves metadata; plain `cp` does not.',
        '`mv` on one filesystem is an atomic rename; across filesystems it is copy + delete.',
        '`rm` is permanent; `rmdir` only removes empty directories; use `--` for names starting with `-`.'
      ]
    },
    {
      id: 'L02-M2-T2',
      title: 'Viewing and identifying files (cat, less, more, head, tail, file, stat)',
      minutes: 35,
      objectives: [
        'Choose between cat, less, more, head and tail for a given viewing task',
        'Follow a growing log with tail -f / tail -F and less +F',
        'Identify a file\'s real type with file regardless of its extension',
        'Read stat output: size, blocks, inode, links, permissions and the atime/mtime/ctime timestamps'
      ],
      prereqs: ['L02-M2-T1'],
      concept: `Linux does not care about file extensions; a file is a sequence of bytes, and different tools show those bytes in different ways.

**cat** (concatenate) writes one or more files to standard output. It is ideal for short files and for joining files (\`cat part1 part2 > whole\`). \`cat -n\` numbers lines and \`cat -A\` makes invisible characters visible (\`$\` at line ends, \`^I\` for tabs, \`^M\` for Windows carriage returns) - invaluable when a config "looks right" but fails to parse. Never \`cat\` a large or binary file into your terminal.

**less** is a **pager**: it shows one screen at a time and lets you move both directions without loading the whole file into memory, so it is safe on multi-gigabyte logs. Keys: Space/b page forward/back, \`g\`/\`G\` start/end, \`/pattern\` search forward, \`?pattern\` backwards, \`n\`/\`N\` next/previous match, \`F\` follow the file like tail -f (Ctrl+C to stop following), \`q\` quit. \`less -N\` shows line numbers and \`less -S\` chops long lines instead of wrapping. **more** is the older, forward-oriented pager; you will meet it on minimal systems, but prefer less.

**head** prints the first 10 lines (\`-n N\` for another count, \`-c N\` for bytes). **tail** prints the last 10. **\`tail -f\`** keeps the file open and prints new lines as they are appended - the standard way to watch a service log during a test. **\`tail -F\`** additionally re-opens the file by name if it is rotated (renamed and recreated), which is what you want for logs managed by logrotate. \`tail -n +5\` prints from line 5 to the end.

**file** inspects the content (magic numbers, text encoding) and tells you what a file really is: an ELF executable, a gzip archive, ASCII text with CRLF line terminators, a symbolic link.

**stat** prints the inode metadata in full: size in bytes, number of allocated blocks, device, inode number, link count, permissions in octal and symbolic form, owner, SELinux context and the timestamps:

- **Access (atime)**: last read (updated lazily on RHEL because of the \`relatime\` mount option)
- **Modify (mtime)**: last change to the *content*
- **Change (ctime)**: last change to the *inode* (content, permissions, owner, links). It cannot be set by \`touch\`, which makes it useful in investigations.
- **Birth**: creation time, shown when the filesystem and kernel support it (XFS and ext4 on RHEL 9 do).

\`stat -c\` prints selected fields with a format, e.g. \`stat -c '%a %U %n' file\`.`,
      internals: `\`cat\`, \`head\` and \`tail\` are coreutils programs that \`read()\` from file descriptors and \`write()\` to standard output. \`tail\` on a regular file seeks near the end instead of reading from the start, so \`tail\` on a 20 GB log is instant. \`tail -f\` uses inotify (falling back to polling) to learn about appends; \`-F\` also watches the name and re-opens it when the inode behind the name changes. \`less\` reads lazily and keeps an index of line positions, which is why jumping to the end (\`G\`) of a huge file may take a moment while it counts lines. \`file\` reads the first bytes and compares them with the magic database (\`/usr/share/misc/magic\`) - for example \`7f 45 4c 46\` is ELF and \`1f 8b\` is gzip. \`stat\` calls the \`statx()\` system call and formats the returned \`struct statx\`; it does not read file content at all, which is why it works on files you cannot read as long as you can search the directory.`,
      useCases: [
        'Watching /var/log/messages or an application log with tail -F while restarting a service',
        'Finding hidden CRLF characters in a script copied from Windows with cat -A or file',
        'Confirming when a config file was last changed (mtime) versus when its permissions changed (ctime) during an audit',
        'Browsing a multi-gigabyte log with less and searching for the first error'
      ],
      syntax: 'cat [-n] [-A] FILE...\nless [-N] [-S] [+F] FILE\nmore FILE\nhead [-n N | -c N] FILE\ntail [-n N | -n +N] [-f | -F] FILE\nfile FILE...\nstat [-c FORMAT] FILE...',
      options: [
        ['cat -A', 'Show non-printing characters: $ line end, ^I tab, ^M carriage return'],
        ['less +F / F', 'Follow mode inside less (Ctrl+C returns to normal browsing)'],
        ['head -n N', 'First N lines (default 10)'],
        ['tail -n +N', 'Start output at line N'],
        ['tail -f', 'Follow appended data on the open file descriptor'],
        ['tail -F', 'Follow by name: survives log rotation'],
        ['stat -c FORMAT', 'Custom output, e.g. %a octal mode, %i inode, %h links, %y mtime']
      ],
      examples: [
        {
          title: 'Full stat output',
          cmd: 'stat /etc/hosts',
          out: '  File: /etc/hosts\n  Size: 158       \tBlocks: 8          IO Block: 4096   regular file\nDevice: fd00h/64768d\tInode: 16777347    Links: 1\nAccess: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)\nContext: system_u:object_r:net_conf_t:s0\nAccess: 2026-10-09 07:58:12.413020374 +0000\nModify: 2023-06-23 10:20:05.000000000 +0000\nChange: 2026-05-14 09:31:44.682130921 +0000\n Birth: 2026-05-14 09:31:44.681130921 +0000',
          fields: [
            ['Size: 158', 'Logical size in bytes'],
            ['Blocks: 8', 'Allocated 512-byte units (8 x 512 = one 4 KiB filesystem block)'],
            ['Inode: 16777347 / Links: 1', 'Inode number and hard-link count'],
            ['Access: (0644/-rw-r--r--)', 'Permission bits in octal and symbolic form'],
            ['Modify vs Change', 'mtime is the content change; ctime is any inode change (here the package install set metadata later)']
          ],
          note: 'A Modify time older than Change is normal after package installation, which preserves the packaged mtime.'
        },
        {
          title: 'Identify a script with Windows line endings',
          cmd: 'file deploy.sh; head -n 1 deploy.sh | cat -A',
          out: 'deploy.sh: Bourne-Again shell script, ASCII text executable, with CRLF line terminators\n#!/bin/bash^M$',
          fields: [
            ['with CRLF line terminators', 'Lines end in \\r\\n; the kernel will look for an interpreter called "/bin/bash\\r"'],
            ['^M$', 'cat -A shows the carriage return (^M) before the end of line ($)']
          ],
          note: 'Fix with `sed -i \'s/\\r$//\' deploy.sh` (or dos2unix if installed).'
        }
      ],
      walkthrough: [
        'Run `head -n 3 /etc/passwd` and `tail -n 3 /etc/passwd`.',
        'Run `less /usr/share/dict/words` if present, or `less /etc/services`; practise `/ssh`, `n`, `G`, `g` and `q`.',
        'In one terminal run `sudo tail -F /var/log/messages`; in another run `logger "lesson test"` and watch the line appear.',
        'Run `file /usr/bin/ls /etc/hosts /usr/share/man/man1/ls.1.gz /bin` to see four different types.',
        'Run `stat -c \'%n inode=%i links=%h mode=%a\' /etc/hosts /etc/shadow`.',
        'Change permissions on a test file with `chmod 600` and note that `stat` shows a new Change time but the same Modify time.'
      ],
      lab: {
        goal: 'Inspect files and logs efficiently and interpret their metadata on a RHEL VM.',
        steps: [
          'Create `printf "line1\\r\\nline2\\r\\n" > ~/crlf.txt` and diagnose it with `file ~/crlf.txt` and `cat -A ~/crlf.txt`.',
          'Print lines 5 to 10 of /etc/services with `head -n 10 /etc/services | tail -n +5`.',
          'Run `sudo tail -n 20 -F /var/log/secure` and open a second SSH session to see the authentication entries arrive.',
          'Run `stat ~/crlf.txt`, then `chmod 640 ~/crlf.txt` and `stat` again; record which timestamps changed.',
          'Open `/var/log/messages` with `sudo less +G /var/log/messages` to start at the end, then search backwards with `?error`.'
        ],
        verify: '`file` reports CRLF terminators, cat -A shows `^M$`, and after chmod only the Change timestamp moved while Modify stayed the same.'
      },
      troubleshooting: {
        scenario: 'An engineer runs `tail -f /var/log/app/app.log` overnight to watch for errors, but after midnight no new lines appear even though the application is busy.',
        steps: [
          'Evidence: `ls -li /var/log/app/` shows a new app.log with a different inode and app.log-20261009 holding the old one.',
          'Hypothesis: logrotate renamed the file at midnight; tail -f keeps following the old file descriptor (the renamed file), which no longer grows.',
          'Fix: use `tail -F` (follow by name, retry) so tail re-opens the new app.log after rotation.',
          'Validate: run `logrotate -f` on a test config or wait for rotation and confirm tail prints "has been replaced; following new file".'
        ]
      },
      mistakes: [
        'Running `cat` on huge or binary files: it floods the terminal and can leave it in a garbled state (fix with `reset`).',
        'Using `tail -f` on rotated logs instead of `tail -F`.',
        'Trusting a file extension instead of checking with `file`.',
        'Confusing ctime with "creation time"; ctime is the inode change time. Creation time is Birth.'
      ],
      safety: [
        'Viewing is read-only, but some logs (/var/log/secure, /var/log/audit/audit.log) require root: use sudo for the single command.',
        'Avoid opening production logs in an editor such as vi just to read them; an accidental save can change the file. Use less.'
      ],
      distro: 'All tools are GNU coreutils/util-linux/file on RHEL and Debian. On RHEL 9/10 the main syslog file is /var/log/messages; on Debian/Ubuntu it is /var/log/syslog and authentication goes to /var/log/auth.log rather than /var/log/secure. Birth time in stat requires coreutils 8.31+ with statx support (RHEL 9 and later).',
      challenge: {
        task: 'A 12 GB log must be checked for the first occurrence of "OutOfMemoryError" and the 5 lines that follow it, plus the very last 20 lines of the file. Do it without loading the whole file into an editor.',
        solution: `First occurrence plus context, stopping at the first match so the rest of the file is not read:

\`\`\`
grep -m1 -A5 'OutOfMemoryError' /var/log/app/app.log
\`\`\`

Interactively you can instead use \`less /var/log/app/app.log\` and type \`/OutOfMemoryError\`. The last 20 lines:

\`\`\`
tail -n 20 /var/log/app/app.log
\`\`\`

\`tail\` seeks to the end of the file rather than reading 12 GB, and \`less\` only reads what it displays, so neither exhausts memory, unlike opening the file in an editor.`
      },
      interview: [
        {
          q: 'What is the difference between tail -f and tail -F?',
          a: 'tail -f follows the open file descriptor, so after a rotation it keeps watching the renamed old file. tail -F follows the name: it notices the name now points to a new inode and re-opens it, and it retries if the file is temporarily missing.',
          mistake: 'Saying -F means "force".',
          followUp: 'How does logrotate create the new file, and when would copytruncate be used?'
        },
        {
          q: 'Explain atime, mtime and ctime.',
          a: 'atime is the last access (read), mtime the last content modification and ctime the last inode change (content, permissions, ownership or link count). touch can set atime and mtime arbitrarily but ctime is always set by the kernel to the current time.',
          mistake: 'Calling ctime the creation time.',
          followUp: 'Why is atime not updated on every read on RHEL? (relatime mount option)'
        },
        {
          q: 'A shell script fails with "bad interpreter: No such file or directory" but the shebang looks correct. How do you investigate?',
          a: 'Check for CRLF line endings with file script.sh or cat -A script.sh | head -1. A trailing ^M makes the kernel look for "/bin/bash\\r". Convert the line endings and retry.',
          mistake: 'Reinstalling bash.',
          followUp: 'How do you strip the carriage returns without dos2unix?'
        }
      ],
      revision: [
        '`cat` for short files and joining; `cat -A` reveals hidden characters.',
        '`less` for big files: `/` search, `G` end, `F` follow, `q` quit.',
        '`head`/`tail -n N`; `tail -F` survives log rotation.',
        '`file` identifies content by magic bytes, not extension.',
        '`stat`: mtime = content, ctime = inode change, Birth = creation (if supported).'
      ]
    }
  ]
};

const M3 = {
  id: 'L02-M3',
  title: 'Searching and text tools',
  summary: 'Locate files by name and attributes with find and locate, search content with grep and regular expressions, and reshape text with wc, sort, uniq, cut, tr and paste.',
  lessons: [
    {
      id: 'L02-M3-T1',
      title: 'Finding files and searching content (find, locate, grep)',
      minutes: 45,
      objectives: [
        'Search the live filesystem with find by name, type, size, age, owner and permissions',
        'Act on results safely with -exec ... {} + and -delete after previewing',
        'Use locate/updatedb for fast name lookups and explain why it can be stale',
        'Search file content with grep, including -i, -v, -r, -n, -l, -c, -w, -o and basic/extended regular expressions'
      ],
      prereqs: ['L02-M1-T2'],
      concept: `There are two different questions: "**where is a file?**" and "**which files contain this text?**". \`find\` and \`locate\` answer the first, \`grep\` the second. Both are RHCSA skills ("use grep and regular expressions to analyze text", "create, delete, copy and move files").

**find** walks the directory tree *right now* and tests every entry against an expression: \`find START... TESTS ACTIONS\`. Common tests:

- \`-name 'pat'\` / \`-iname 'pat'\` - glob on the base name (quote it so the shell does not expand it)
- \`-type f|d|l\` - regular file, directory, symlink
- \`-size +100M\` / \`-size -1k\` - bigger/smaller than (units c, k, M, G)
- \`-mtime -1\` / \`-mtime +30\` - modified less than 1 day / more than 30 days ago; \`-mmin\` uses minutes
- \`-user alice\`, \`-group wheel\`, \`-perm -4000\` (SUID bit set), \`-perm /o+w\` (world-writable)
- \`-maxdepth N\` limits recursion; \`-xdev\` stays on one filesystem

Tests are ANDed by default; use \`-o\` for OR and escaped parentheses to group. The default action is \`-print\`. **\`-exec cmd {} \\;\`** runs a command once per file; **\`-exec cmd {} +\`** passes many files per command (much faster). \`-delete\` removes matches - always run the same expression with \`-print\` first, and put \`-delete\` last, because find evaluates left to right.

**locate** answers name queries instantly by searching a pre-built database instead of the disk. The database is refreshed by \`updatedb\` (run daily by a systemd timer), so **locate cannot see files created since the last update** and may show files already deleted. Run \`sudo updatedb\` to refresh it. \`locate -i\` ignores case and \`locate -c\` only counts matches.

**grep** prints lines matching a **regular expression** (regex). Key options: \`-i\` ignore case, \`-v\` invert, \`-n\` line numbers, \`-c\` count matching lines, \`-l\` list matching file names only, \`-r\` recurse into directories, \`-w\` whole words, \`-o\` print only the matched part, \`-A/-B/-C N\` context lines, \`-E\` extended regex, \`-F\` fixed strings (no regex). Regex essentials: \`^\` start of line, \`$\` end of line, \`.\` any one character, \`*\` zero or more of the previous item, \`[...]\` character class. With \`-E\` you also get \`+\`, \`?\`, \`{n,m}\`, \`|\` alternation and \`( )\` grouping. A classic: \`grep -Ev '^[[:space:]]*(#|$)' file\` shows a config without comments and blank lines.

Remember that **globs and regexes are different languages**: in a glob \`*\` means "anything"; in a regex \`.*\` means anything and \`*\` alone repeats the preceding character.`,
      internals: `\`find\` uses \`openat()\`/\`getdents64()\` to read each directory and \`fstatat()\` to obtain metadata only when a test needs it (name tests need no stat, which is why putting \`-name\` before \`-size\` is cheaper). It is I/O heavy on large trees, hence \`-xdev\` and \`-maxdepth\`. \`-exec ... +\` builds argument lists up to the ARG_MAX limit, like xargs.

\`locate\` reads a compact database (\`/var/lib/mlocate/mlocate.db\` or \`/var/lib/plocate/plocate.db\` depending on the implementation). \`updatedb\` honours \`/etc/updatedb.conf\`, which excludes paths such as /tmp and pseudo or network filesystems (PRUNEPATHS, PRUNEFS). Results are filtered by your permissions, so unprivileged users do not see names in directories they cannot read.

\`grep\` reads input in large buffers and runs a compiled matcher (fixed strings with \`-F\` are fastest). Its **exit status** is meaningful: 0 = at least one line matched, 1 = no match, 2 = error (for example an unreadable file). Scripts rely on this, as you will see in Module 4. \`grep -r\` does not follow symlinks met during recursion; \`-R\` does.`,
      useCases: [
        'Finding files larger than 1 GB filling a filesystem: find /var -xdev -type f -size +1G',
        'Security audit: listing SUID binaries with find / -xdev -perm -4000 -type f',
        'Finding every config file that references an old hostname with grep -rl oldhost /etc',
        'Showing only active directives of a config file by stripping comments and blank lines'
      ],
      syntax: "find START... [-maxdepth N] [-xdev] TESTS [-print | -exec CMD {} + | -delete]\nlocate [-i] [-c] PATTERN\nupdatedb\ngrep [-i] [-v] [-n] [-c] [-l] [-r] [-w] [-o] [-E|-F] [-A N] PATTERN [FILE...]",
      options: [
        ["find -name / -iname", "Match base name with a glob (case sensitive / insensitive)"],
        ["find -type f|d|l", "Restrict to regular files, directories or symlinks"],
        ["find -size +N / -mtime -N", "Size and age tests (+ more than, - less than)"],
        ["find -exec ... {} +", "Run a command on batches of results"],
        ["grep -r / -l", "Recurse into directories / print only file names"],
        ["grep -v / -c", "Invert match / count matching lines"],
        ["grep -E / -F", "Extended regex / fixed string"],
        ["grep -w / -o", "Whole-word matches / print only the matching part"]
      ],
      examples: [
        {
          title: 'Large, old files on the /var filesystem only',
          cmd: 'sudo find /var -xdev -type f -size +500M -mtime +30 -exec ls -lh {} +',
          out: '-rw-------. 1 root root 2.1G Jul  2 03:10 /var/crash/127.0.0.1-2026-07-02-03:10:44/vmcore\n-rw-r--r--. 1 root root 812M Aug 14 11:02 /var/tmp/export_2026-08.tar',
          fields: [
            ['-xdev', 'Did not descend into other filesystems mounted under /var'],
            ['-size +500M -mtime +30', 'Both tests had to be true (implicit AND)'],
            ['2.1G ... vmcore', 'A kernel crash dump: review before deleting, it may be needed for a support case']
          ]
        },
        {
          title: 'Active configuration lines only',
          cmd: "grep -Ev '^[[:space:]]*(#|$)' /etc/chrony.conf",
          out: 'pool 2.rhel.pool.ntp.org iburst\nsourcedir /run/chrony-dhcp\ndriftfile /var/lib/chrony/drift\nmakestep 1.0 3\nrtcsync\nkeyfile /etc/chrony.keys\nleapsectz right/UTC\nlogdir /var/log/chrony',
          fields: [
            ['-E', 'Extended regex so ( | ) work without backslashes'],
            ['-v', 'Print lines that do NOT match comments or blank lines'],
            ['^[[:space:]]*(#|$)', 'Optional leading whitespace, then either # or end of line']
          ]
        },
        {
          title: 'Which files mention a hostname, with counts',
          cmd: 'sudo grep -rc "db-old.example.com" /etc/httpd/conf.d | grep -v ":0$"',
          out: '/etc/httpd/conf.d/app.conf:3\n/etc/httpd/conf.d/proxy.conf:1',
          fields: [['file:N', 'grep -c prints a count per file; the second grep hides files with zero matches']],
          note: 'grep -rl would list just the names.'
        }
      ],
      walkthrough: [
        'Run `find /etc -maxdepth 1 -name "*.conf" | head`. Then `cd /etc` and run `find . -maxdepth 1 -name *.conf`: the unquoted glob is expanded by the shell first and find usually errors with "paths must precede expression".',
        'Run `sudo find / -xdev -type f -perm -4000 2>/dev/null` to list SUID files on the root filesystem.',
        'Run `touch ~/locate-test.txt; locate locate-test.txt` (nothing), then `sudo updatedb; locate locate-test.txt`.',
        'Run `grep -n root /etc/passwd`, `grep -c nologin /etc/passwd` and `grep -v nologin /etc/passwd`.',
        'Run `grep -E "^(root|adm):" /etc/passwd` to practise alternation and anchors.',
        'Run `grep -q sshd /etc/passwd; echo $?` and `grep -q nosuchuser /etc/passwd; echo $?` to see exit codes 0 and 1.'
      ],
      lab: {
        goal: 'Locate files by attributes and extract information from text with grep on a RHEL VM.',
        steps: [
          'Find all files owned by user `nobody` or group `wheel` under /home and /srv: `sudo find /home /srv \\( -user nobody -o -group wheel \\) -print`.',
          'Find files under /etc modified in the last 2 days: `sudo find /etc -type f -mtime -2`.',
          'Create 3 old files: `mkdir ~/old && touch -d "40 days ago" ~/old/f{1..3}`. Preview with `find ~/old -type f -mtime +30 -print`, then delete with `find ~/old -type f -mtime +30 -delete`.',
          'Ensure locate is installed (`dnf provides /usr/bin/locate` tells you the package; install it with dnf), run `sudo updatedb`, then `locate -c sshd_config`.',
          'List accounts with an interactive shell: `grep -Ev "(nologin|false|sync|shutdown|halt)$" /etc/passwd`.',
          'Save all "Failed password" lines from /var/log/secure: `sudo grep "Failed password" /var/log/secure > ~/failed.txt`.'
        ],
        verify: '`ls ~/old` is empty after -delete; `locate -c sshd_config` returns at least 1; `grep -vc "Failed password" ~/failed.txt` prints 0.'
      },
      troubleshooting: {
        scenario: 'A script uses `locate app.lock` to decide whether a lock file exists and keeps starting a second copy of the job.',
        steps: [
          'Evidence: `ls -l /run/app.lock` shows the file exists, but `locate app.lock` prints nothing.',
          'Hypothesis: locate searches a database updated once a day, and tmpfs paths such as /run are normally pruned; it can never reflect a lock created a minute ago.',
          'Fix: test the real filesystem with `[ -e /run/app.lock ]`, or better use `flock` for locking.',
          'Validate: run two copies of the job and confirm the second exits because the lock is detected.'
        ]
      },
      mistakes: [
        'Not quoting the pattern in `find -name *.log`.',
        'Putting `-delete` before the tests (`find . -delete -name "*.tmp"` deletes everything under the start path).',
        'Using locate for anything that must reflect the current state of the disk.',
        'Forgetting that basic grep treats `+`, `?`, `|` and `{}` literally; use `grep -E` for extended syntax.',
        'Searching the whole filesystem without `-xdev`, wandering into /proc or NFS mounts.'
      ],
      safety: [
        'Always preview a find expression with -print before adding -delete or -exec rm.',
        'Large find or grep -r runs on production can cause heavy I/O; restrict the start path, use -xdev, and consider `ionice -c3`.',
        'Root is needed to search directories like /root or /var/log/audit; redirect permission errors with 2>/dev/null only when you understand what you are hiding.'
      ],
      distro: 'find and grep are GNU findutils/grep on both RHEL and Debian. The locate implementation differs between releases: RHEL 8 ships mlocate (mlocate-updatedb.timer), while newer Fedora, Debian and Ubuntu releases use plocate. Check with `dnf provides /usr/bin/locate`. The command names locate and updatedb are the same everywhere.',
      challenge: {
        task: 'Produce a list of all regular files under /etc that contain the string "PermitRootLogin" (case insensitive) and were modified in the last 7 days, showing the matching line numbers.',
        solution: `Use find to select files by type and age, then hand them to grep in batches:

\`\`\`
sudo find /etc -type f -mtime -7 -exec grep -Hin 'permitrootlogin' {} +
\`\`\`

\`-mtime -7\` keeps files modified less than 7 days ago; \`-exec ... {} +\` runs grep on many files at once; \`-H\` forces the file-name prefix (useful if only one file is passed), \`-i\` ignores case and \`-n\` prints line numbers. An equivalent pipeline is \`find /etc -type f -mtime -7 -print0 | xargs -0 grep -Hin permitrootlogin\`.`
      },
      interview: [
        {
          q: 'When would you use locate instead of find, and what is its main limitation?',
          a: 'locate is for fast name lookups across the whole system because it searches a database rather than walking the disk. Its limitation is staleness: the database is only as fresh as the last updatedb run, and pruned paths are never indexed.',
          mistake: 'Saying locate and find are interchangeable.',
          followUp: 'How do you refresh the database and where is its exclusion list configured?'
        },
        {
          q: 'What is the difference between -exec cmd {} \\; and -exec cmd {} + in find?',
          a: 'With \\; find runs the command once per matching file. With + it appends as many file names as fit into one command line, like xargs, so it starts far fewer processes and is much faster.',
          mistake: 'Not knowing why the semicolon has to be escaped (so the shell does not treat it as a command separator).',
          followUp: 'When must you still use \\; ? (when {} must appear in the middle of the command, once per file)'
        },
        {
          q: 'How do you show a configuration file without comments and empty lines?',
          a: "grep -Ev '^[[:space:]]*(#|$)' file - invert-match lines that are blank or whose first non-space character is #.",
          mistake: "grep -v '#' file, which also drops valid lines with inline comments or # inside values.",
          followUp: 'What do ^ and $ mean in a regular expression?'
        },
        {
          q: 'What exit codes does grep return?',
          a: '0 if a line matched, 1 if nothing matched, 2 if an error occurred. grep -q suppresses output so scripts can test only the status.',
          mistake: 'Assuming a non-zero exit always means an error.',
          followUp: 'How does set -e interact with grep returning 1?'
        }
      ],
      revision: [
        '`find` searches the live tree; tests are ANDed; quote `-name` patterns.',
        '`-exec ... {} +` batches; preview before `-delete`, and put `-delete` last.',
        '`locate` is fast but only as fresh as `updatedb`.',
        'grep: `-i -v -n -c -l -r -w -o -E -F`; anchors `^` and `$`.',
        'grep exit status: 0 match, 1 no match, 2 error.'
      ]
    },
    {
      id: 'L02-M3-T2',
      title: 'Text processing: wc, sort, uniq, cut, tr and paste',
      minutes: 40,
      objectives: [
        'Count lines, words and bytes with wc',
        'Sort numerically, by field and by human-readable size with sort',
        'Count and de-duplicate with sort | uniq -c and explain why uniq needs sorted input',
        'Extract fields with cut, translate or delete characters with tr, and join columns with paste'
      ],
      prereqs: ['L02-M3-T1'],
      concept: `Unix text tools each do one small job on lines of text and are combined with pipes (\`|\`, covered fully in Module 4). Learning six of them lets you answer most "how many / which / top N" questions directly from logs and config files.

**wc** counts: \`-l\` lines, \`-w\` words, \`-c\` bytes, \`-m\` characters. \`wc -l < file\` prints just the number without the file name.

**sort** orders lines. By default it compares text according to the locale, so \`10\` sorts before \`9\`. Use **\`-n\`** for numbers, **\`-h\`** for human-readable sizes (\`2K\`, \`1.5G\`, as printed by \`du -h\`), **\`-r\`** to reverse, **\`-k N\`** to sort by field N and **\`-t ':'\`** to set the field separator (default: the transition from non-blank to blank). \`-u\` removes duplicate lines and \`-V\` sorts version strings (\`5.14.0-70\` before \`5.14.0-162\`).

**uniq** collapses **adjacent** identical lines. Because it only compares neighbours, **you must sort first**: \`sort | uniq\`. \`uniq -c\` prefixes each line with its count, \`-d\` prints only duplicated lines and \`-u\` only lines that are not repeated. The idiom **\`sort | uniq -c | sort -rn | head\`** produces a "top N" report and is one of the most useful pipelines in operations.

**cut** extracts parts of each line: \`-d ':' -f 1,7\` selects fields 1 and 7 using colon as the delimiter; \`-c 1-10\` selects characters. cut's delimiter is a **single character** and every occurrence starts a new field, so in space-aligned output (like \`ps\` or \`df\`) repeated spaces create empty fields. Squeeze them first with \`tr -s ' '\` or use \`awk '{print $2}'\`.

**tr** translates or deletes **characters** (not strings) and only reads standard input: \`tr 'a-z' 'A-Z'\` upper-cases, \`tr -d '\\r'\` deletes carriage returns, \`tr -s ' '\` squeezes runs of spaces into one, \`tr ':' '\\n'\` splits a PATH onto separate lines.

**paste** joins files side by side, line by line, separated by tabs (\`-d\` changes the separator). \`paste -sd+ file\` joins all lines of one file into a single line - for example turning a column of numbers into \`12+7+30\` that you can feed to \`bc\`.

Together: \`cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn\` tells you how many accounts use each login shell.`,
      internals: `All six programs are GNU coreutils **filters**: they read standard input (or files given as arguments), process line by line and write to standard output, so they stream data with a small memory footprint. \`sort\` is the exception: it must see all input before printing anything, so for large inputs it writes sorted chunks to temporary files (in \`$TMPDIR\` or /tmp; change with \`-T\`) and merges them; \`-S\` sets its memory buffer and \`--parallel\` uses several threads.

Locale matters: under a UTF-8 locale sort uses collation rules (case and punctuation are weighted differently), whereas \`LC_ALL=C sort\` compares raw bytes, which is faster and gives predictable ASCII ordering - important when scripts compare sorted lists with \`comm\` or \`join\`. \`tr\` works on characters, not multi-character strings: \`tr 'abc' 'xyz'\` maps a to x, b to y and c to z; it does not replace the word "abc".`,
      useCases: [
        'Top 10 IP addresses hitting a web server from the access log',
        'Counting accounts per login shell from /etc/passwd',
        'Finding the largest directories by sorting du -h output with sort -h',
        'Normalising messy input (CRLF, repeated spaces, case) before comparing lists'
      ],
      syntax: "wc [-l|-w|-c|-m] [FILE]\nsort [-n|-h|-V] [-r] [-u] [-t SEP] [-k N[,M]] [FILE]\nuniq [-c] [-d|-u]\ncut -d SEP -f LIST | -c LIST [FILE]\ntr [-d] [-s] SET1 [SET2]   (stdin only)\npaste [-d SEP] [-s] FILE...",
      options: [
        ["sort -n / -h / -V", "Numeric / human-size / version ordering"],
        ["sort -t: -k3,3n", "Sort by field 3 only, numerically, with : as separator"],
        ["uniq -c", "Prefix each distinct line with its count (input must be sorted)"],
        ["cut -d: -f1,7", "Fields 1 and 7, colon-delimited"],
        ["tr -s ' '", "Squeeze repeated spaces into one"],
        ["tr -d '\\r'", "Delete carriage returns"],
        ["paste -sd,", "Join all lines of a file with commas"]
      ],
      examples: [
        {
          title: 'Top client IPs in an Apache access log',
          cmd: "sudo cut -d' ' -f1 /var/log/httpd/access_log | sort | uniq -c | sort -rn | head -n 3",
          out: '   4821 203.0.113.45\n    977 198.51.100.7\n    310 192.0.2.18',
          fields: [
            ['4821', 'Number of requests from that address (uniq -c count)'],
            ['203.0.113.45', 'The first space-separated field of each log line is the client IP'],
            ['sort -rn', 'The second sort orders by the count, largest first']
          ]
        },
        {
          title: 'Accounts per login shell',
          cmd: 'cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn',
          out: '     21 /sbin/nologin\n      3 /bin/bash\n      1 /sbin/shutdown\n      1 /sbin/halt\n      1 /bin/sync',
          fields: [['21 /sbin/nologin', 'Most entries are service accounts that cannot log in interactively']]
        },
        {
          title: 'Human-sized sort of du output',
          cmd: 'sudo du -sh /var/* 2>/dev/null | sort -rh | head -n 3',
          out: '1.9G\t/var/lib\n812M\t/var/cache\n356M\t/var/log',
          fields: [['sort -rh', 'Understands K/M/G suffixes; plain -n would place 812M above 1.9G']]
        }
      ],
      walkthrough: [
        'Run `wc -l /etc/passwd` and `wc -l < /etc/passwd` and compare the output format.',
        'Run `printf "10\\n9\\n100\\n" | sort` and then the same with `sort -n`.',
        'Run `printf "a\\nb\\na\\n" | uniq` (a appears twice) and `printf "a\\nb\\na\\n" | sort | uniq` (once).',
        'Run `cut -d: -f1,3 /etc/passwd | head -n 3` to get user names and UIDs.',
        'Run `echo "$PATH" | tr ":" "\\n"` to see one directory per line.',
        'Run `sort -t: -k3,3n /etc/passwd | tail -n 3` to list the three highest UIDs.'
      ],
      lab: {
        goal: 'Build "top N" and summary reports from real system files.',
        steps: [
          'Count failed SSH logins per source IP: `sudo grep "Failed password" /var/log/secure | grep -oE "from [0-9.]+" | cut -d" " -f2 | sort | uniq -c | sort -rn`.',
          'List the five largest installed packages: `rpm -qa --qf "%{SIZE} %{NAME}\\n" | sort -rn | head -n 5`.',
          'Create two files with `seq 1 5 > a; seq 11 15 > b` and run `paste a b` and `paste -d, a b`.',
          'Sum a column: `seq 1 10 | paste -sd+ | bc` (install bc with dnf if needed).',
          'Normalise CRLF input: `printf "x\\r\\ny\\r\\n" | tr -d "\\r" | cat -A`.'
        ],
        verify: 'The paste output shows two columns; the sum prints 55; cat -A shows `x$` and `y$` with no `^M`.'
      },
      troubleshooting: {
        scenario: 'A report built with `cut -d: -f3 /etc/passwd | sort | tail -1` claims the highest UID on the system is 999, but `id bob` shows uid 1001.',
        steps: [
          'Evidence: `cut -d: -f3 /etc/passwd | sort | tail -n 5` shows 999 sorted after 65534 and 1001.',
          'Hypothesis: sort compared the UIDs as text, so "999" sorts after "65534", which sorts after "1001".',
          'Fix: sort numerically: `cut -d: -f3 /etc/passwd | sort -n | tail -1` (exclude 65534 nobody if needed).',
          'Validate: the result now shows the true numeric maximum.'
        ]
      },
      mistakes: [
        'Running uniq without sort first, so non-adjacent duplicates are not merged.',
        'Sorting numbers or sizes without -n or -h.',
        'Using cut -d" " on column-aligned output with multiple spaces, producing empty fields.',
        'Expecting tr to replace words: it maps individual characters.',
        'Passing a file name to tr (`tr a b file`): tr only reads stdin; use `tr a b < file`.'
      ],
      safety: [
        'These are read-only filters; the classic accident is redirecting output over an input file (`sort f > f` truncates f before sort reads it). Use `sort -o f f` or a temporary file.',
        'sort on huge files can fill /tmp; use -T to point it at a filesystem with space.'
      ],
      distro: 'Identical GNU coreutils behaviour on RHEL and Debian. Sort order can differ between systems with different locales (en_US.UTF-8 vs C.UTF-8); set LC_ALL=C in scripts for byte-wise, reproducible ordering. Apache logs live in /var/log/httpd on RHEL and /var/log/apache2 on Debian/Ubuntu.',
      challenge: {
        task: 'From /etc/passwd, print the login names of all accounts whose shell is /bin/bash, sorted alphabetically, on a single comma-separated line.',
        solution: `\`\`\`
grep ':/bin/bash$' /etc/passwd | cut -d: -f1 | sort | paste -sd,
\`\`\`

\`grep\` anchors on the end of line so only the shell field is matched, \`cut\` keeps field 1 (the login name), \`sort\` orders them and \`paste -s\` joins all lines into one with \`-d,\` as the separator. Example output: \`alice,bob,root\`. An awk alternative is \`awk -F: '$7=="/bin/bash"{print $1}' /etc/passwd | sort | paste -sd,\`.`
      },
      interview: [
        {
          q: 'Why do people write sort | uniq -c instead of just uniq -c?',
          a: 'uniq only merges adjacent duplicate lines. Sorting first brings identical lines together so the counts are correct.',
          mistake: 'Thinking uniq deduplicates the whole file.',
          followUp: 'How would you then show the five most frequent lines?'
        },
        {
          q: 'How do you get the 5 largest directories under /var sorted correctly when du prints sizes like 812M and 1.9G?',
          a: 'du -sh /var/* | sort -rh | head -5. The -h option of sort understands the unit suffixes; -n would compare only the leading numbers.',
          mistake: 'Using sort -rn on human-readable sizes.',
          followUp: 'Why might du -x be important here?'
        },
        {
          q: 'What is the difference between cut and awk for extracting columns?',
          a: 'cut uses a single fixed delimiter character, so consecutive spaces produce empty fields. awk splits on runs of whitespace by default and supports conditions and arithmetic, so it suits aligned command output like ps or df.',
          mistake: 'Saying cut cannot use delimiters other than tab.',
          followUp: 'How could you make cut work on space-aligned output? (squeeze with tr -s " " first)'
        }
      ],
      revision: [
        '`wc -l` lines, `-w` words, `-c` bytes.',
        '`sort -n` numbers, `-h` K/M/G sizes, `-k` field, `-t` separator, `-r` reverse.',
        '`uniq` works on adjacent lines: always `sort | uniq -c`.',
        '`cut -d: -f1,7` fields; `tr` maps characters from stdin; `paste` joins columns or lines.',
        'Top-N idiom: `... | sort | uniq -c | sort -rn | head`.'
      ]
    }
  ]
};

const M4 = {
  id: 'L02-M4',
  title: 'Pipes, redirection, exit codes and chaining',
  summary: 'Control where a command reads input and writes output and errors, connect commands with pipes, tee and xargs, and use exit codes with &&, || and ; to build reliable one-liners.',
  lessons: [
    {
      id: 'L02-M4-T1',
      title: 'Standard streams and redirection (stdin, stdout, stderr, >, >>, 2>, 2>&1, <)',
      minutes: 40,
      objectives: [
        'Name the three standard streams and their file descriptor numbers',
        'Redirect output with >, >>, 2>, &> and 2>&1 and predict the effect of their order',
        'Feed input from a file with < and from inline text with here-documents and here-strings',
        'Discard noise safely with /dev/null and protect files with set -o noclobber'
      ],
      prereqs: ['L02-M2-T2'],
      concept: `Every process starts with three open **file descriptors** (FDs), small integers that refer to open files:

- **0 = standard input (stdin)** - where the program reads input; by default the keyboard/terminal
- **1 = standard output (stdout)** - normal results; by default the terminal
- **2 = standard error (stderr)** - error and diagnostic messages; also the terminal by default

Because stdout and stderr are *separate* streams that happen to share a screen, you can send them to different places. **Redirection** is the shell rewiring these descriptors *before* the command starts; the command itself does not know or care.

- **\`> file\`** sends stdout to a file, **truncating** (emptying) it first or creating it.
- **\`>> file\`** appends stdout to the end of the file.
- **\`2> file\`** sends stderr to a file; \`2>> file\` appends.
- **\`2>&1\`** means "make FD 2 point wherever FD 1 points *right now*".
- **\`&> file\`** (Bash) sends both stdout and stderr to the file; \`&>> file\` appends both.
- **\`< file\`** connects stdin to a file: \`wc -l < /etc/passwd\` prints only the number because wc never sees a file name.

**Order matters** because redirections are processed left to right. \`cmd > out.log 2>&1\` first points stdout at out.log, then copies that to stderr, so both land in the file. \`cmd 2>&1 > out.log\` first copies stderr to *the terminal* (where stdout currently points), then moves only stdout to the file - errors still appear on screen.

**/dev/null** is a special device that discards everything written to it and returns end-of-file when read. \`find / -name x 2>/dev/null\` hides "Permission denied" noise - but you also hide real errors, so do it deliberately.

Two input conveniences: a **here-document** feeds several literal lines to stdin until a delimiter:

\`\`\`
cat > /etc/motd <<'EOF'
Authorised use only
EOF
\`\`\`

Quoting the delimiter (\`'EOF'\`) stops variable expansion inside the text. A **here-string** \`<<< "text"\` feeds a single string, e.g. \`tr a-z A-Z <<< "hello"\`.

Finally, the most common accident is \`>\` over a file you needed. **\`set -o noclobber\`** makes \`>\` refuse to overwrite existing files (use \`>|\` to force when you mean it).`,
      internals: `Before running a command the shell forks a child; in the child it calls \`open()\` on the target file (with \`O_TRUNC\` for \`>\`, \`O_APPEND\` for \`>>\`) and then \`dup2()\` to place the new descriptor onto 0, 1 or 2, closing the temporary one. Only then does it call \`execve()\`. The new program inherits the descriptor table unchanged, which is why redirection works for every program without special support. \`2>&1\` is literally \`dup2(1, 2)\`: FD 2 becomes a copy of whatever FD 1 refers to at that moment, which explains the order rule. You can inspect a running process's descriptors as symlinks under \`/proc/<PID>/fd/\`. With \`O_APPEND\` the kernel moves to end-of-file atomically on every write, so several processes appending to one log do not overwrite each other; with \`>\` each writer keeps its own offset. Because the truncation happens before the command runs, \`sort file > file\` empties file before sort ever reads it.`,
      useCases: [
        'Capturing a cron job\'s output and errors into one log: job.sh >> /var/log/job.log 2>&1',
        'Separating results from errors when auditing: find / -perm -4000 > suid.txt 2> errors.txt',
        'Writing a small config or banner file non-interactively with a quoted here-document',
        'Silencing expected noise in scripts while still checking the exit code'
      ],
      syntax: 'cmd > file      cmd >> file\ncmd 2> file     cmd 2>> file\ncmd > file 2>&1   (same as: cmd &> file)\ncmd < file\ncmd <<\'EOF\' ... EOF\ncmd <<< "string"\ncmd 2>/dev/null\nset -o noclobber   cmd >| file',
      options: [
        ['>', 'Redirect stdout, truncating the file first'],
        ['>>', 'Redirect stdout, appending'],
        ['2>', 'Redirect stderr (FD 2)'],
        ['2>&1', 'Duplicate FD 2 onto wherever FD 1 currently points'],
        ['&> / &>>', 'Bash shorthand: stdout and stderr to the same file (truncate / append)'],
        ['<', 'Read stdin from a file'],
        ['<<\'EOF\'', 'Here-document with quoted delimiter: no expansion inside'],
        ['set -o noclobber', 'Refuse to overwrite existing files with >; override with >|']
      ],
      examples: [
        {
          title: 'Separate results from errors',
          cmd: 'find /etc -name "*.repo" > repos.txt 2> errors.txt; wc -l repos.txt errors.txt',
          out: ' 3 repos.txt\n 2 errors.txt\n 5 total',
          fields: [
            ['3 repos.txt', 'stdout (matching paths) went to repos.txt'],
            ['2 errors.txt', 'stderr ("Permission denied" lines for unreadable directories) went to errors.txt']
          ],
          note: 'Run as a normal user; as root there would be no permission errors.'
        },
        {
          title: 'Why the order of 2>&1 matters',
          cmd: 'ls /etc/hosts /nope 2>&1 > out.txt; echo ---; cat out.txt',
          out: 'ls: cannot access \'/nope\': No such file or directory\n---\n/etc/hosts',
          fields: [
            ['ls: cannot access ...', 'stderr was duplicated to the terminal before stdout moved, so the error still appeared on screen'],
            ['/etc/hosts', 'Only stdout reached out.txt']
          ],
          note: 'Write `> out.txt 2>&1` (or `&> out.txt`) to capture both.'
        },
        {
          title: 'Count lines without the file name',
          cmd: 'wc -l /etc/passwd; wc -l < /etc/passwd',
          out: '27 /etc/passwd\n27',
          fields: [['27', 'With < the shell opened the file; wc read stdin and had no name to print']]
        }
      ],
      walkthrough: [
        'Run `ls /etc/hosts /nope`; both lines appear on screen. Now run `ls /etc/hosts /nope > out.txt` and notice only the error remains visible.',
        'Run `ls /etc/hosts /nope > out.txt 2> err.txt` and inspect both files with `cat`.',
        'Run `ls /etc/hosts /nope > all.txt 2>&1` and `cat all.txt`: both lines are captured.',
        'Run `date >> log.txt` three times, then `cat log.txt` to see appending. Run `date > log.txt` once and see the history disappear.',
        'Run `set -o noclobber; date > log.txt` (refused: "cannot overwrite existing file"), then `date >| log.txt`, then `set +o noclobber`.',
        'Write a file with a here-document: `cat > note.txt <<\'EOF\'` then type `Home is $HOME`, then `EOF`; `cat note.txt` shows the literal `$HOME`.'
      ],
      lab: {
        goal: 'Control all three streams of real commands on a RHEL VM and capture logs the way cron jobs and scripts need them.',
        steps: [
          'As a normal user run `find /var -name "*.log" > ~/logs.txt 2> ~/find-errors.txt` and count each with `wc -l`.',
          'Repeat with `&> ~/both.txt` and confirm the file contains both kinds of lines with `grep -c "Permission denied" ~/both.txt`.',
          'Create a script `~/job.sh` containing `echo start; ls /nonexistent; echo end`, make it executable and run `~/job.sh >> ~/job.log 2>&1` twice. Inspect the log.',
          'Use a here-document to create `~/banner.txt` with two lines, then display it with `cat`.',
          'Run `tr a-z A-Z <<< "redirection works"`.',
          'Start `sleep 300 > ~/sleep.out 2>&1 &` and run `ls -l /proc/$!/fd` to see FDs 1 and 2 pointing at the same file. Then `kill %1`.'
        ],
        verify: '`grep -c start ~/job.log` prints 2 and the log also contains the two "cannot access" errors; `ls -l /proc/<PID>/fd` showed 1 and 2 -> /home/<you>/sleep.out.'
      },
      troubleshooting: {
        scenario: 'A nightly backup cron job sometimes fails, but its log file /var/log/backup.log only ever shows the "Backup started" line and no error message. The crontab entry is `0 2 * * * /usr/local/bin/backup.sh 2>&1 > /var/log/backup.log`.',
        steps: [
          'Evidence: the log contains stdout lines only; root\'s local mail (`mail` or /var/spool/mail/root) contains the error text cron captured.',
          'Hypothesis: `2>&1` was written before `>`, so stderr was duplicated to cron\'s original output (mailed or discarded), not the log file. Also `>` truncates the log every night, losing history.',
          'Fix: change the entry to `/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1`.',
          'Validate: run the same command line manually with a forced error and confirm both the message and earlier runs are in the log.'
        ]
      },
      mistakes: [
        'Writing `2>&1 > file` and expecting both streams in the file.',
        'Using `>` instead of `>>` on a log and wiping its history (or a config file) in one keystroke.',
        'Running `sort data > data` or `sed ... file > file`: the shell truncates the input before the command reads it.',
        'Sending everything to /dev/null in scripts and then having no evidence when the job fails.',
        'Expecting `sudo echo x > /etc/file` to work: the redirection is done by your unprivileged shell, not by sudo (use `echo x | sudo tee /etc/file`).'
      ],
      safety: [
        '`>` destroys the previous content instantly and there is no undo; back up important files first or enable noclobber in interactive shells.',
        'Redirecting into system files requires root and must be done by a root process (sudo tee), not by prefixing sudo to the command.',
        'Only discard stderr when you have confirmed the errors are expected; keep the exit code check.'
      ],
      distro: 'Redirection syntax is defined by the shell, so it is identical in Bash on RHEL and Debian/Ubuntu. `&>` and `<<<` are Bash extensions: Debian/Ubuntu run `/bin/sh` scripts with dash, where you must write `> file 2>&1` and avoid here-strings. On RHEL `/bin/sh` is Bash, but portable scripts should still use the POSIX forms.',
      challenge: {
        task: 'Run `df -h /` and `ls /missing` in one command line so that: normal output is appended to `~/report.log`, error messages go to `~/report.err` (overwriting it), and nothing at all appears on the terminal.',
        solution: `Use a command group so one set of redirections applies to both commands:

\`\`\`
{ df -h /; ls /missing; } >> ~/report.log 2> ~/report.err
\`\`\`

The braces run both commands in the current shell (note the spaces and the final \`;\`). \`>>\` appends stdout to report.log and \`2>\` truncates and writes stderr to report.err. Nothing reaches the terminal because both FD 1 and FD 2 have been redirected. Verify with \`tail -n 3 ~/report.log\` and \`cat ~/report.err\`.`
      },
      interview: [
        {
          q: 'What is the difference between `cmd > f 2>&1` and `cmd 2>&1 > f`?',
          a: 'Redirections are applied left to right. In the first, stdout is pointed at f and then stderr is made a copy of stdout, so both go to f. In the second, stderr is copied from stdout while stdout still points at the terminal, then only stdout is moved to f, so errors still go to the terminal.',
          mistake: 'Saying they are equivalent.',
          followUp: 'What is the Bash shorthand for sending both streams to a file?'
        },
        {
          q: 'Why does `sudo echo "nameserver 10.0.0.2" > /etc/resolv.conf` fail with Permission denied?',
          a: 'The redirection is performed by the calling, unprivileged shell before sudo runs, so the file is opened without root privileges. Use `echo ... | sudo tee /etc/resolv.conf` (or `sudo sh -c "..."`) so a root process opens the file.',
          mistake: 'Saying sudo is misconfigured.',
          followUp: 'How would you append instead of overwrite with tee?'
        },
        {
          q: 'What happens when you read from or write to /dev/null?',
          a: 'Writes succeed and the data is discarded; reads immediately return end-of-file. It is a character device (major 1, minor 3).',
          mistake: 'Thinking it is a regular file that grows.',
          followUp: 'Why might a broken /dev/null (replaced by a regular file) cause disk usage problems?'
        }
      ],
      revision: [
        'FD 0 stdin, FD 1 stdout, FD 2 stderr.',
        '`>` truncates, `>>` appends, `2>` is stderr, `&>` is both (Bash).',
        '`> file 2>&1` captures both; `2>&1 > file` does not - order matters.',
        '`< file` feeds stdin; here-docs `<<EOF` and here-strings `<<<` feed inline text.',
        '`/dev/null` discards; `set -o noclobber` protects against accidental `>`.'
      ]
    },
    {
      id: 'L02-M4-T2',
      title: 'Pipes, tee, xargs, exit codes and command chaining (|, $?, &&, ||, ;)',
      minutes: 45,
      objectives: [
        'Connect commands with | and explain what flows through a pipe',
        'Save and display a stream at the same time with tee and write root-owned files with sudo tee',
        'Turn input lines into arguments with xargs, safely handling spaces with -0',
        'Read exit codes with $? and PIPESTATUS, and chain commands with &&, || and ;'
      ],
      prereqs: ['L02-M4-T1', 'L02-M3-T2'],
      concept: `A **pipe** (\`|\`) connects the **stdout** of one command to the **stdin** of the next: \`ps aux | grep sshd\`. Both programs run at the same time; data streams through a small kernel buffer, so pipelines handle gigabytes without temporary files. Only stdout travels through the pipe; stderr still goes to the terminal unless you add \`2>&1\` before the \`|\` (or use Bash's \`|&\`).

**tee** copies its stdin to stdout *and* to one or more files - a T-junction in the pipe. \`dnf update -y | tee update.log\` lets you watch progress and keep a record; \`tee -a\` appends. Because tee opens the file itself, **\`echo text | sudo tee /etc/file\`** is the correct way to write a root-owned file from an unprivileged shell (add \`> /dev/null\` if you do not want the echo on screen).

**xargs** solves a different problem: many commands do not read names from stdin, they want **arguments** (\`rm\`, \`chmod\`, \`ls -l\`). xargs reads items from stdin and appends them to a command line, running it as few times as possible. \`find /tmp -name '*.tmp' | xargs rm\` works until a name contains a space or newline; the robust form is **\`find ... -print0 | xargs -0 rm\`**, which separates names with NUL bytes. \`-n 1\` passes one item per run, \`-I {}\` places the item anywhere in the command, \`-r\` (\`--no-run-if-empty\`) avoids running the command with no arguments, and \`-P 4\` runs four in parallel.

Every command finishes with an **exit status** (0-255). **0 means success; anything else means some kind of failure** whose meaning is command-specific (grep: 1 = no match, 2 = error). The shell stores the last status in **\`$?\`** - read it immediately, because the next command overwrites it. Conventions: 126 = found but not executable, 127 = command not found, 128+N = killed by signal N (130 = Ctrl+C/SIGINT, 137 = SIGKILL). For a pipeline, \`$?\` is the status of the **last** command; Bash keeps all of them in the array \`PIPESTATUS\`, and \`set -o pipefail\` makes the pipeline fail if any member fails.

**Chaining** operators use exit codes:

- **\`a ; b\`** - run a, then b, regardless of the result
- **\`a && b\`** - run b only if a **succeeded** (exit 0)
- **\`a || b\`** - run b only if a **failed**

\`sshd -t && systemctl reload sshd\` reloads only if the config test passes. \`mkdir /data || exit 1\` stops a script early. Beware \`a && b || c\`: c runs if a fails **or if b fails**, so it is not a true if/else.`,
      internals: `For \`a | b\` the shell calls \`pipe()\`, which returns two connected descriptors, then forks a child for each command: in the first it \`dup2()\`s the write end onto FD 1, in the second the read end onto FD 0, closes the unused ends and \`execve()\`s. The kernel buffers up to 64 KiB by default (\`/proc/sys/fs/pipe-max-size\` limits resizing); a writer blocks when the buffer is full and a reader blocks when it is empty, giving natural flow control. When the reader exits (for example \`head\`), the next write gets **SIGPIPE** and the writer terminates quietly - status 141 (128+13) in PIPESTATUS. Each pipeline member runs in its own subshell in Bash, so \`echo x | read v\` does not set v in your shell. Exit statuses come from the child's \`exit()\` value, collected by the shell's \`waitpid()\`; a signal death is encoded and reported as 128+signal. xargs computes how many arguments fit under the system's argument-length limit and splits the work into multiple \`execve()\` calls accordingly.`,
      useCases: [
        'Validating a configuration before applying it: nginx -t && systemctl reload nginx',
        'Recording an upgrade session while watching it: dnf -y upgrade 2>&1 | tee /root/upgrade-$(date +%F).log',
        'Bulk-changing permissions on files found by find with -print0 | xargs -0 chmod 640',
        'Making scripts fail fast and report which pipeline stage broke using pipefail and PIPESTATUS'
      ],
      syntax: 'cmd1 | cmd2 | cmd3\ncmd1 2>&1 | cmd2      (Bash: cmd1 |& cmd2)\ncmd | tee [-a] FILE...\ncmd | sudo tee FILE > /dev/null\nfind ... -print0 | xargs -0 [-r] [-n N] [-I {}] [-P N] CMD\necho $?   echo "${PIPESTATUS[@]}"\nset -o pipefail\ncmd1 ; cmd2   cmd1 && cmd2   cmd1 || cmd2',
      options: [
        ['|', 'Pipe stdout of the left command into stdin of the right'],
        ['tee -a', 'Append to the file instead of truncating it'],
        ['xargs -0', 'Input items are NUL-separated (pair with find -print0)'],
        ['xargs -I {}', 'Replace {} in the command with each input item (one run per item)'],
        ['xargs -r', 'Do not run the command if input is empty (GNU)'],
        ['$? / PIPESTATUS', 'Exit status of the last command / of every pipeline member'],
        ['set -o pipefail', 'Pipeline returns the last non-zero status of any member'],
        ['&& / || / ;', 'Run next on success / on failure / always']
      ],
      examples: [
        {
          title: 'Exit codes of success, no match and missing command',
          cmd: 'grep -q root /etc/passwd; echo $?; grep -q zzz /etc/passwd; echo $?; nosuchcmd; echo $?',
          out: '0\n1\nbash: nosuchcmd: command not found...\n127',
          fields: [
            ['0', 'grep found a match'],
            ['1', 'grep ran correctly but found nothing'],
            ['127', 'The shell could not find the command']
          ],
          note: 'On RHEL the "command not found..." message may be followed by a PackageKit suggestion if that handler is installed.'
        },
        {
          title: 'PIPESTATUS shows a hidden failure',
          cmd: 'cat /nope | sort | head -n 1; echo "last=$? all=${PIPESTATUS[*]}"',
          out: 'cat: /nope: No such file or directory\nlast=0 all=1 0 0',
          fields: [
            ['last=0', '$? reports only the final command (head), which succeeded'],
            ['all=1 0 0', 'cat failed (1); sort and head succeeded']
          ],
          note: 'Expand PIPESTATUS before running anything else: here it is in the same echo, before $? is reset. With set -o pipefail, $? would be 1.'
        },
        {
          title: 'Safe bulk action with find and xargs',
          cmd: 'find /srv/data -type f -name "*.csv" -print0 | xargs -0 -r ls -l | head -n 2',
          out: '-rw-r--r--. 1 app app 2048 Oct  8 22:10 /srv/data/q3 report.csv\n-rw-r--r--. 1 app app 1024 Oct  8 22:11 /srv/data/sales.csv',
          fields: [['q3 report.csv', 'A name with a space survived intact because items are NUL-separated']]
        }
      ],
      walkthrough: [
        'Run `ls /etc | wc -l` and `ls /etc | head -n 3`. Each pipeline has two processes running at once.',
        'Run `ls /etc/hosts /nope | wc -l` (prints 1, the error still shows) and then `ls /etc/hosts /nope 2>&1 | wc -l` (prints 2).',
        'Run `true; echo $?` and `false; echo $?`, then `ls /nope; echo $?` (2 for GNU ls "serious trouble").',
        'Run `mkdir /tmp/demo && echo created` twice; the second time mkdir fails and echo does not run. Then `mkdir /tmp/demo || echo "already there"`.',
        'Run `echo "hello" | sudo tee /root/t.txt` and `sudo cat /root/t.txt`, then compare with `sudo echo hi > /root/t2.txt` (Permission denied).',
        'Create files with spaces: `mkdir -p /tmp/x && touch "/tmp/x/a b" /tmp/x/c` and compare `find /tmp/x -type f | xargs ls` (errors) with `find /tmp/x -type f -print0 | xargs -0 ls`.'
      ],
      lab: {
        goal: 'Build reliable pipelines and command chains as used in operations runbooks on a RHEL VM.',
        steps: [
          'Report the top 5 memory-using processes: `ps -eo pid,comm,%mem --sort=-%mem | head -n 6`.',
          'Validate and reload SSH safely: `sudo sshd -t && sudo systemctl reload sshd && echo "reloaded" || echo "NOT reloaded"` and explain each step.',
          'Append a line to a root-owned file: `echo "# lab $(date +%F)" | sudo tee -a /etc/motd > /dev/null`, then `tail -n1 /etc/motd`.',
          'Count words in all .conf files under /etc/security: `find /etc/security -name "*.conf" -print0 | xargs -0 wc -w | tail -n1`.',
          'Run `set -o pipefail; grep sshd /nope | sort; echo $?` and compare with the result after `set +o pipefail`.',
          'Run `seq 1 5 | xargs -I {} echo "item {}"` and `seq 1 6 | xargs -n 2 echo`.'
        ],
        verify: 'The chain prints "reloaded" when sshd -t passes; `tail -n1 /etc/motd` shows your lab line; with pipefail the status is 2, without it 0.'
      },
      troubleshooting: {
        scenario: 'A deployment script runs `curl -s https://repo.example.com/app.tar.gz | tar xz -C /opt/app && echo "Deployed"`. The repository was down, nothing was extracted, but the pipeline log says "Deployed" in some runs and the script never stops on download errors.',
        steps: [
          'Evidence: run the pipeline manually and print `${PIPESTATUS[@]}`; curl returns a non-zero code (for example 7, "failed to connect") while tar\'s status determines $?.',
          'Hypothesis: without pipefail, the pipeline status is tar\'s; curl\'s failure is invisible, and -s even hides its message. In some runs tar also received an HTML error page.',
          'Fix: add `set -euo pipefail` to the script, use `curl -fsS` so HTTP errors give a non-zero status and a short message, and download to a file, verify a checksum, then extract.',
          'Validate: point the URL at a non-existent path; the script must now exit non-zero and never print "Deployed".'
        ]
      },
      mistakes: [
        'Checking `$?` after another command (even an echo) has already overwritten it.',
        'Assuming a pipeline\'s status reflects every stage; without pipefail only the last command counts.',
        'Using `a && b || c` as an if/else: c also runs when b fails.',
        'Feeding find output to xargs without -print0/-0, breaking on spaces, quotes or newlines in names.',
        'Piping to grep and grepping the grep itself (`ps aux | grep nginx` lists the grep process); use `pgrep -a nginx`.'
      ],
      safety: [
        'xargs with rm or chmod acts on every input line: preview by replacing the command with `echo` first, and use -r so empty input does nothing.',
        'Gate risky actions on validation: `visudo -c`, `sshd -t`, `nginx -t`, `named-checkconf` before reload with &&.',
        'When writing system files via `sudo tee`, remember tee truncates without -a: back up the file first.'
      ],
      distro: 'Pipes, exit codes and &&/|| are POSIX and identical on RHEL and Debian. PIPESTATUS, `|&` and (before POSIX 2024) `set -o pipefail` are Bash features; dash on Debian/Ubuntu (/bin/sh) lacks PIPESTATUS, and older dash releases lack pipefail. GNU xargs (findutils) provides -0, -r and -P on both families.',
      challenge: {
        task: 'Write one command line that finds all regular files under /var/log larger than 50 MB, prints them with human-readable sizes sorted largest first, saves that list to `~/biglogs.txt` while also showing it on screen, and prints "nothing large" only if no file matched.',
        solution: `\`\`\`
sudo find /var/log -xdev -type f -size +50M -print0 | sudo xargs -0 -r du -h | sort -rh | tee ~/biglogs.txt; [ -s ~/biglogs.txt ] || echo "nothing large"
\`\`\`

Reasoning: \`find -print0 | xargs -0 -r du -h\` safely sizes each match (NUL separation survives odd names) and \`-r\` runs nothing when there are no matches. \`sort -rh\` orders human-readable sizes. \`tee\` writes the file *and* passes the data on to the terminal. After the pipeline, \`;\` always runs the test: \`[ -s file ]\` is true when the file is non-empty, so \`|| echo\` fires only when nothing matched. Testing the file is more reliable than testing the pipeline's \`$?\`, which would only reflect \`tee\`.`
      },
      interview: [
        {
          q: 'What does exit status 127 mean, and what about 137?',
          a: '127 means the shell could not find the command (not in PATH or misspelled). 137 is 128 + 9: the process was killed by SIGKILL, for example by the OOM killer or kill -9.',
          mistake: 'Treating every non-zero code as the same generic error.',
          followUp: 'What does 126 indicate?'
        },
        {
          q: 'Why is `find ... | xargs rm` dangerous and how do you fix it?',
          a: 'xargs splits input on whitespace and treats quotes specially, so a file named "a b" becomes two arguments and could delete the wrong files. Use find -print0 | xargs -0, or simply find ... -delete / -exec rm {} +. Add -r to avoid running with no arguments.',
          mistake: 'Saying xargs is just slower than -exec.',
          followUp: 'When is xargs -P useful?'
        },
        {
          q: 'A pipeline `cmd1 | cmd2` returned 0 but cmd1 failed. How is that possible and how do you detect it?',
          a: 'A pipeline returns the status of its last command by default. Check ${PIPESTATUS[@]} immediately after it, or enable set -o pipefail so any failing stage makes the pipeline non-zero.',
          mistake: 'Blaming $? as unreliable.',
          followUp: 'Why might pipefail report 141 for `yes | head -1`?'
        },
        {
          q: 'Explain `sshd -t && systemctl reload sshd`.',
          a: 'sshd -t parses the configuration and exits 0 only if it is valid. && makes the reload conditional on that success, so a broken config never gets loaded and you keep a working SSH daemon.',
          mistake: 'Using ; so the reload happens even if validation fails.',
          followUp: 'Why is reload preferable to restart for sshd?'
        }
      ],
      revision: [
        '`|` sends stdout only; add `2>&1` (or `|&`) to include stderr.',
        '`tee` = save and pass through; `sudo tee` writes root-owned files.',
        '`xargs` turns lines into arguments; use `-print0 | xargs -0 -r`.',
        '`$?`: 0 success, 1-255 failure; 127 not found, 126 not executable, 128+N signal.',
        '`;` always, `&&` on success, `||` on failure; `set -o pipefail` and PIPESTATUS for pipelines.'
      ]
    }
  ]
};

const M5 = {
  id: 'L02-M5',
  title: 'The shell environment',
  summary: 'Variables, quoting and command substitution, plus the tools that shape your interactive environment: aliases, history, command lookup with which/type/whereis, and formatted output with echo, printf and date.',
  lessons: [
    {
      id: 'L02-M5-T1',
      title: 'Variables, quoting, escaping and command substitution',
      minutes: 45,
      objectives: [
        'Create, read, export and unset shell variables and explain shell versus environment variables',
        'Predict the effect of single quotes, double quotes and backslash escaping on expansion',
        'Capture command output with $(...) and use it in other commands',
        'Persist variables correctly in ~/.bashrc, ~/.bash_profile or /etc/profile.d'
      ],
      prereqs: ['L02-M1-T2'],
      concept: `A **shell variable** is a named string stored inside the running shell: \`APP=web01\` (no spaces around \`=\`). You read it with **\`$APP\`** or **\`\${APP}\`**; the braces are needed when text follows directly, as in \`\${APP}_backup\`. \`unset APP\` removes it. Names are case sensitive; by convention UPPERCASE is used for environment variables and lowercase for your own script variables, which avoids clobbering important names such as \`PATH\`.

A plain variable exists only in the current shell. **\`export APP\`** (or \`export APP=web01\`) marks it as an **environment variable**, which is copied into every child process the shell starts. \`env\` or \`printenv\` lists the environment; \`set\` lists all shell variables and functions. A child can never change its parent's variables, which is why \`./setvars.sh\` appears to "do nothing" while **\`source setvars.sh\`** (or \`. setvars.sh\`) runs the file in the current shell. \`VAR=value command\` sets a variable only for that one command, e.g. \`LC_ALL=C sort file\`.

Important variables: \`PATH\` (colon-separated directories searched for commands), \`HOME\`, \`USER\`, \`SHELL\`, \`PWD\`, \`HOSTNAME\`, \`PS1\` (the prompt), \`LANG\`/\`LC_*\` (locale), \`EDITOR\`. Extend PATH by appending: \`export PATH="$PATH:/opt/app/bin"\`. Never overwrite it with a single directory.

**Quoting** controls which expansions happen:

- **Single quotes \`'...'\`** - everything is literal; no variables, no globs, no backslash escapes. \`echo '$HOME'\` prints \`$HOME\`.
- **Double quotes \`"..."\`** - variables (\`$\`), command substitution and backslash escapes of the dollar sign, backtick, double quote and backslash still work, but **word splitting and globbing do not**. \`echo "$HOME"\` prints the path.
- **Backslash \`\\\`** - escapes the single next character: \`echo \\$HOME\`, \`touch my\\ file\`.

The golden rule: **quote your variable expansions** (\`"$file"\`). Unquoted, a value containing spaces is split into several arguments and any \`*\` in it is globbed - the source of countless script bugs.

**Command substitution** \`$(command)\` runs a command and replaces itself with its output (trailing newlines removed): \`today=$(date +%F)\`, \`kill $(pgrep -f stuckjob)\`. The legacy form uses backticks; prefer \`$( )\`, which nests cleanly. Arithmetic uses \`$(( ))\`: \`echo $((1024 * 4))\`.

To make variables permanent, put them in a startup file. For Bash on RHEL: **login shells** read \`/etc/profile\` (which sources \`/etc/profile.d/*.sh\`) and then \`~/.bash_profile\`, which normally sources \`~/.bashrc\`; **interactive non-login shells** read \`~/.bashrc\` (which sources \`/etc/bashrc\`). Put per-user settings in \`~/.bashrc\` and system-wide ones in a new file under \`/etc/profile.d/\`.`,
      internals: `Bash keeps variables in its own memory. When it starts a program it builds an \`envp\` array from the exported variables and passes it to \`execve()\`; the kernel places those \`NAME=value\` strings on the new process's stack. You can read any process's initial environment (NUL-separated) in \`/proc/<PID>/environ\` - changes the process makes later are not reflected there. Expansion happens in a fixed order: brace expansion, tilde, parameter/variable, arithmetic and command substitution (left to right), then **word splitting** on the characters in \`IFS\` (space, tab, newline) for unquoted results, then **pathname expansion** (globbing), and finally **quote removal**. Double quotes suppress the last two steps for the text inside them, which is exactly why \`"$var"\` is safe. \`$(...)\` is implemented by forking a subshell with stdout connected to a pipe; the parent reads the pipe until EOF and strips trailing newlines.`,
      useCases: [
        'Adding a vendor tool directory to PATH for all users with a file in /etc/profile.d',
        'Building timestamped file names in scripts: backup_$(hostname -s)_$(date +%F).tar.gz',
        'Running one command with a temporary setting such as LC_ALL=C or TZ=UTC',
        'Safely handling file names with spaces in loops by quoting "$f"'
      ],
      syntax: 'NAME=value        (no spaces)\necho "$NAME"  "${NAME}_suffix"\nexport NAME[=value]   unset NAME\nVAR=value command\nenv | printenv NAME | set\nsource FILE   (. FILE)\nvar=$(command)   echo $((2 + 3))\n\'literal\'  "expand $vars"  \\c',
      options: [
        ['export', 'Mark a variable for inheritance by child processes'],
        ['unset', 'Remove a variable'],
        ['env / printenv', 'Show environment variables (exported only)'],
        ['set', 'Show all shell variables and functions'],
        ['source / .', 'Run a file in the current shell so its variables persist'],
        ['$( )', 'Command substitution'],
        ['$(( ))', 'Integer arithmetic expansion'],
        ['${VAR:-default}', 'Use default if VAR is unset or empty']
      ],
      examples: [
        {
          title: 'Quoting changes what the command receives',
          cmd: 'name="web 01"; echo \'$name\'; echo "$name"; echo \\$name',
          out: '$name\nweb 01\n$name',
          fields: [
            ['$name (first line)', 'Single quotes: no expansion at all'],
            ['web 01', 'Double quotes: variable expanded, space preserved as one argument'],
            ['$name (third line)', 'Backslash escaped the dollar sign']
          ]
        },
        {
          title: 'Shell variable versus environment variable',
          cmd: 'COLOR=blue; bash -c \'echo "child sees: [$COLOR]"\'; export COLOR; bash -c \'echo "child sees: [$COLOR]"\'',
          out: 'child sees: []\nchild sees: [blue]',
          fields: [
            ['[]', 'Before export the child bash process did not inherit COLOR'],
            ['[blue]', 'After export it is part of the environment passed to children']
          ]
        },
        {
          title: 'Command substitution in a file name',
          cmd: 'tar czf /tmp/etc_$(hostname -s)_$(date +%F).tgz -C / etc/hosts && ls /tmp/etc_*',
          out: '/tmp/etc_web01_2026-10-09.tgz',
          fields: [['web01 / 2026-10-09', 'Output of hostname -s and date +%F inserted into the argument']]
        }
      ],
      walkthrough: [
        'Run `greeting=hello; echo $greeting; echo ${greeting}world; echo $greetingworld` (the last prints an empty line: no such variable).',
        'Run `bash` to start a child, `echo $greeting` (empty), then `exit`. Now `export greeting` and repeat: the child sees it.',
        'Run `echo "PATH has $(echo "$PATH" | tr ":" "\\n" | wc -l) directories"`.',
        'Create files with spaces: `touch "a b.txt"; f="a b.txt"; ls $f` (two errors) then `ls "$f"` (works).',
        'Run `echo \'single $HOME\' "double $HOME" escaped\\ \\$HOME`.',
        'Append `export EDITOR=vim` to `~/.bashrc`, run `source ~/.bashrc` and confirm with `printenv EDITOR`.'
      ],
      lab: {
        goal: 'Manage variables and quoting the way login scripts and automation require on RHEL 9/10.',
        steps: [
          'As root create `/etc/profile.d/apptools.sh` containing `export PATH="$PATH:/opt/apptools/bin"` and `export APP_ENV=prod`.',
          'Open a new login shell (`su - <user>` or a new SSH session) and check `echo "$PATH"` and `printenv APP_ENV`.',
          'Run `env -i bash --noprofile --norc -c env` to see how small an empty environment is, then compare with `env | wc -l`.',
          'Write `~/snap.sh` that sets `stamp=$(date +%Y%m%d-%H%M)` and runs `cp -a /etc/hosts "/tmp/hosts.$stamp"`; run it and list /tmp/hosts.*.',
          'Run `x=5; echo $((x * 3)); echo "${undefined:-fallback}"`.',
          'Clean up: remove /etc/profile.d/apptools.sh and start a new login shell to confirm APP_ENV is gone.'
        ],
        verify: 'In the new login shell `printenv APP_ENV` printed `prod` and PATH ended in `/opt/apptools/bin`; after cleanup `printenv APP_ENV` prints nothing and exits 1.'
      },
      troubleshooting: {
        scenario: 'After a colleague edited `~/.bashrc` on a jump host, every command except builtins fails with "command not found" (ls, vim, sudo). The last line they added was `export PATH=/opt/tools/bin`.',
        steps: [
          'Evidence: `echo $PATH` prints only `/opt/tools/bin`; builtins such as `echo` and `cd` still work because they need no PATH lookup.',
          'Hypothesis: PATH was overwritten instead of extended, so /usr/bin and /usr/sbin are no longer searched.',
          'Fix: repair the current shell with `export PATH=/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin`, then edit ~/.bashrc with `/usr/bin/vi` to `export PATH="$PATH:/opt/tools/bin"`.',
          'Validate: open a new shell; `type ls` resolves to /usr/bin/ls and `/opt/tools/bin` is at the end of PATH.'
        ]
      },
      mistakes: [
        'Putting spaces around `=` (`VAR = x` runs a command called VAR).',
        'Leaving variables unquoted, so values with spaces or `*` are split and globbed.',
        'Using single quotes when you wanted expansion (`echo \'$HOME\'`).',
        'Running a script that sets variables (`./env.sh`) and expecting them in the current shell; use `source`.',
        'Overwriting PATH instead of appending to it.'
      ],
      safety: [
        'Never put secrets in exported variables on shared systems: they are visible to child processes and stored in shell history if typed inline.',
        'Edit system-wide profile files only as root, add a new file in /etc/profile.d rather than editing /etc/profile, and test in a new session before closing your current one.',
        'Use `${VAR:?message}` in destructive commands so an empty variable aborts instead of expanding to nothing.'
      ],
      distro: 'RHEL uses ~/.bash_profile (sourcing ~/.bashrc) and /etc/bashrc; Debian/Ubuntu use ~/.profile (sourcing ~/.bashrc) and /etc/bash.bashrc. Both read /etc/profile and /etc/profile.d/*.sh for login shells. Debian\'s /bin/sh (dash) supports $( ), $(( )) and quoting rules but not Bash arrays or ${PIPESTATUS}.',
      challenge: {
        task: 'A script contains `for f in $(ls /data/in); do mv $f /data/done/; done` and fails on files such as "Q3 report.csv". Rewrite it correctly and explain both bugs.',
        solution: `\`\`\`
for f in /data/in/*; do
  [ -e "$f" ] || continue
  mv -- "$f" /data/done/
done
\`\`\`

Bug 1: \`$(ls ...)\` produces text that is then **word-split** on spaces, so "Q3 report.csv" becomes two items. Using a glob produces one word per file name, with spaces intact. Bug 2: \`$f\` was unquoted, so even a correct name would be split again (and globbed). The original also used bare names relative to the CWD rather than paths under /data/in. \`"$f"\` passes exactly one argument; \`--\` protects names starting with \`-\`; the \`[ -e ]\` test skips the literal pattern when the directory is empty.`
      },
      interview: [
        {
          q: 'What is the difference between a shell variable and an environment variable?',
          a: 'A shell variable exists only inside the current shell. An environment variable has been exported, so the shell copies it into the environment of every child process it starts. Children cannot modify the parent\'s environment.',
          mistake: 'Saying environment variables are global to the whole system.',
          followUp: 'How do you inspect the environment of a running daemon? (/proc/PID/environ)'
        },
        {
          q: 'Explain the difference between single and double quotes in Bash.',
          a: 'Single quotes make everything literal. Double quotes still allow variable, command and arithmetic expansion and a few backslash escapes, but prevent word splitting and globbing of the result.',
          mistake: 'Saying they are interchangeable.',
          followUp: 'How do you print a single quote inside single quotes?'
        },
        {
          q: 'Why does running ./setenv.sh not change your current environment while source setenv.sh does?',
          a: 'Running it starts a child process; its variable changes die with it. source executes the commands in the current shell process.',
          mistake: 'Suggesting chmod +x fixes it.',
          followUp: 'Which files does a login shell read on RHEL?'
        }
      ],
      revision: [
        '`VAR=value` (no spaces); read with `"$VAR"` or `"${VAR}"`.',
        '`export` passes variables to children; `source` runs a file in the current shell.',
        '`\'...\'` literal; `"..."` expands `$` but stops splitting/globbing; `\\` escapes one char.',
        '`$(cmd)` command substitution, `$((expr))` arithmetic.',
        'Persist per-user in ~/.bashrc, system-wide in /etc/profile.d/*.sh; extend PATH, never replace it.'
      ]
    },
    {
      id: 'L02-M5-T2',
      title: 'Aliases, history, command lookup and formatted output (alias, history, which, type, whereis, echo, printf, date)',
      minutes: 35,
      objectives: [
        'Create, list, persist and bypass aliases',
        'Search and re-run commands with history, !n, !! and Ctrl+R, and tune HISTSIZE/HISTCONTROL',
        'Determine what a command name really resolves to with type, which and whereis',
        'Produce precise output with echo, printf and date format strings'
      ],
      prereqs: ['L02-M5-T1'],
      concept: `Several features make the interactive shell faster and more predictable.

**Aliases** are text shortcuts expanded by the shell when a command name matches: \`alias ll='ls -l --color=auto'\`. \`alias\` alone lists them; \`unalias ll\` removes one. Aliases defined at the prompt vanish when the shell exits; put them in \`~/.bashrc\` to keep them. RHEL already defines some (for root: \`rm -i\`, \`cp -i\`, \`mv -i\`; for everyone \`ll\`, \`grep --color=auto\`). To bypass an alias for one run, use **\`\\rm\`**, \`command rm\` or the full path \`/usr/bin/rm\`. Aliases are not expanded in non-interactive scripts by default, so never rely on them there.

**History**: Bash records commands in memory and writes them to \`~/.bash_history\` when the shell exits. \`history\` lists them with numbers; \`history 20\` shows the last 20. Re-run with **\`!!\`** (last command, as in \`sudo !!\`), **\`!n\`** (command number n), **\`!string\`** (most recent command starting with string) and **\`!$\`** (last argument of the previous command). **Ctrl+R** searches backwards interactively - the fastest way to find a long command. Variables tune it: \`HISTSIZE\` (lines kept in memory), \`HISTFILESIZE\` (lines kept in the file), \`HISTCONTROL=ignoreboth\` (skip duplicates and commands starting with a space) and \`HISTTIMEFORMAT='%F %T '\` (show timestamps).

**Which program runs?** When you type a name, Bash checks, in order: aliases, keywords, functions, builtins, then the directories in \`PATH\` (remembering found paths in a hash table). **\`type -a name\`** is the authoritative answer because it is a builtin that knows all of these: \`type ls\` may say "ls is aliased to ls --color=auto". **\`which\`** only searches PATH (on RHEL it is wrapped by an alias that also shows aliases), and **\`whereis\`** reports the binary, source and man page locations from standard directories. Use \`hash -r\` if a command moved and Bash keeps running the old path.

**Output tools**: \`echo\` prints its arguments followed by a newline; \`echo -n\` omits the newline and \`echo -e\` interprets escapes like \`\\t\`, but these options differ between shells. **\`printf\`** is portable and precise: \`printf '%-10s %5d\\n' "$user" "$count"\` formats columns; it does not add a newline unless you write \`\\n\`, and it reuses the format for extra arguments. **\`date\`** prints or formats time: \`date +%F\` (2026-10-09), \`date '+%F %T'\`, \`date +%s\` (seconds since the epoch), \`date -d '2 days ago' +%F\`, \`date -u\` (UTC), \`date -d @1760000000\` (convert epoch). Setting the clock is a root operation done with \`timedatectl\` on systemd systems, not with \`date -s\` in production.`,
      internals: `Aliases are expanded during parsing, before any other expansion, and only for the first word of a simple command (or the word after an alias ending in a space). They are controlled by \`shopt expand_aliases\`, on for interactive shells and off for scripts. History is implemented by the GNU Readline and history libraries inside Bash; the in-memory list is appended to \`$HISTFILE\` on exit (\`shopt -s histappend\` appends instead of overwriting, \`history -a\` writes immediately). History expansion (\`!\`) happens before the line is parsed, which is why \`!\` inside double quotes can surprise you; single quotes stop it. Command lookup for a name without a slash consults the alias table, function table and builtin table, then the hash table, then walks \`PATH\` calling \`stat()\` on each candidate until it finds an executable file; \`type\` reports exactly that decision. \`date\` calls \`clock_gettime()\` and formats with \`strftime()\`, applying the \`TZ\` variable or /etc/localtime.`,
      useCases: [
        'Reproducing exactly what was run during an incident by reviewing history with timestamps',
        'Discovering that a "broken" command is actually an alias or function shadowing the real binary',
        'Generating aligned reports in scripts with printf',
        'Creating sortable, timestamped log and backup names with date +%F_%H%M'
      ],
      syntax: 'alias NAME=\'command\'   alias   unalias NAME   \\NAME\nhistory [N]   history -c   !!   !n   !string   !$   Ctrl+R\ntype [-a] NAME   which NAME   whereis NAME   hash -r\necho [-n] [-e] TEXT\nprintf FORMAT [ARG...]\ndate [+FORMAT] [-d STRING] [-u]',
      options: [
        ['type -a', 'Show every alias, function, builtin and PATH match for a name'],
        ['\\cmd / command cmd', 'Bypass an alias (command also bypasses functions)'],
        ['!! / !n / !$', 'Previous command / command number n / last argument of previous command'],
        ['HISTTIMEFORMAT', 'Add timestamps to history output, e.g. \'%F %T \''],
        ['HISTCONTROL=ignoreboth', 'Skip duplicates and lines starting with a space'],
        ['printf %-10s %5d', 'Left-aligned string in 10 columns, right-aligned integer in 5'],
        ['date +%F / %T / %s', 'YYYY-MM-DD / HH:MM:SS / epoch seconds'],
        ['date -d', 'Display a time described by a string (e.g. "yesterday", @EPOCH)']
      ],
      examples: [
        {
          title: 'What does "ls" really run?',
          cmd: 'type -a ls; whereis ls',
          out: 'ls is aliased to `ls --color=auto\'\nls is /usr/bin/ls\nls: /usr/bin/ls /usr/share/man/man1/ls.1.gz /usr/share/man/man1p/ls.1p.gz',
          fields: [
            ['aliased to', 'An alias is checked first and wins'],
            ['ls is /usr/bin/ls', 'The executable found via PATH'],
            ['whereis ...', 'Binary plus man page locations (section 1 and POSIX 1p)']
          ]
        },
        {
          title: 'History with timestamps',
          cmd: 'HISTTIMEFORMAT="%F %T " history 3',
          out: ' 1012  2026-10-09 09:14:02 sudo systemctl restart httpd\n 1013  2026-10-09 09:14:20 sudo journalctl -u httpd -n 20\n 1014  2026-10-09 09:15:01 HISTTIMEFORMAT="%F %T " history 3',
          fields: [
            ['1012', 'History number usable with !1012'],
            ['2026-10-09 09:14:02', 'When the command was entered (only accurate for commands recorded while timestamps were being saved)']
          ]
        },
        {
          title: 'Aligned output with printf and dates',
          cmd: 'printf \'%-12s %8s\\n\' HOST DATE "$(hostname -s)" "$(date +%F)"; date -d \'@1760000000\' -u',
          out: 'HOST             DATE\nweb01      2026-10-09\nThu Oct  9 08:53:20 UTC 2025',
          fields: [
            ['%-12s', 'First argument left-aligned in 12 columns'],
            ['%8s', 'Second argument right-aligned in 8 columns; the format repeats for the next two arguments'],
            ['@1760000000', 'An epoch timestamp converted to a readable UTC date']
          ]
        }
      ],
      walkthrough: [
        'Run `alias` to list defined aliases, then `alias ll` and `type ll`.',
        'Create `alias gs=\'git status\'`, use it, then `unalias gs`. As root, compare `rm somefile` (prompts) with `\\rm somefile` (no prompt) on a test file.',
        'Run `history | tail -n 5`, re-run one with `!<number>`, then press Ctrl+R and type part of an earlier command.',
        'Run `ls /etc/hosts` then `cat !$` to reuse the last argument.',
        'Run `type cd echo ls`, `which ls` and `whereis passwd`; note that cd and echo are builtins.',
        'Run `date +%F_%H%M`, `date -d "next monday" +%A\\ %F`, and `printf "%05d|%-6s|\\n" 42 ok`.'
      ],
      lab: {
        goal: 'Customise and audit the interactive shell environment on RHEL 9/10.',
        steps: [
          'Add to `~/.bashrc`: `alias ports=\'ss -tulpn\'`, `export HISTTIMEFORMAT="%F %T "`, `export HISTCONTROL=ignoreboth` and `shopt -s histappend`; then `source ~/.bashrc`.',
          'Run `sudo ports` (note: aliases are not expanded after sudo unless the alias ends with a space, e.g. `alias sudo=\'sudo \'`) and then `ports` as your user.',
          'Run `history 5` and confirm timestamps are shown.',
          'Prove a command starting with a space is not recorded: ` echo secret-test` then `history 2`.',
          'Use `type -a` on `ll`, `cd`, `ls` and `python3` and classify each as alias, builtin or file.',
          'Write a one-line report: `printf "%-20s %s\\n" "Kernel:" "$(uname -r)" "Uptime since:" "$(uptime -s)" "Report date:" "$(date \'+%F %T %Z\')"`.'
        ],
        verify: '`alias ports` prints the definition in a new shell; `history 5` shows dates; the " echo secret-test" line is absent from history; the printf report has aligned values.'
      },
      troubleshooting: {
        scenario: 'An admin runs `python3 --version` and gets 3.9, but `/usr/bin/python3 --version` reports 3.12 after they changed the alternatives link. Another engineer says "which python3 shows /usr/bin/python3, so it must be 3.12".',
        steps: [
          'Evidence: `type -a python3` shows "python3 is aliased to ..." or "python3 is hashed (/usr/local/bin/python3)" before /usr/bin/python3.',
          'Hypothesis: an alias, function or an earlier PATH entry (or a stale hash) shadows the binary; which only shows part of the picture.',
          'Fix: remove the alias/function from ~/.bashrc or reorder PATH, and run `hash -r` to clear remembered paths.',
          'Validate: `type -a python3` lists /usr/bin/python3 first and `python3 --version` prints the expected version.'
        ]
      },
      mistakes: [
        'Using aliases in scripts or cron jobs, where they are not expanded.',
        'Trusting `which` over `type`; which can miss functions and builtins.',
        'Typing passwords or tokens on the command line where they end up in ~/.bash_history.',
        'Using `echo -e` or `echo -n` in portable scripts; behaviour varies between shells, use printf.',
        'Changing the clock with `date -s` on servers instead of fixing NTP/chrony with timedatectl.'
      ],
      safety: [
        'History files can contain sensitive data; protect them (mode 600) and clear specific entries with `history -d N` rather than sharing them.',
        '`history -c` only clears memory; the file may still hold entries, and wiping history on shared systems may conflict with audit policy.',
        'Setting the system time requires root and can break Kerberos, TLS and log correlation; use timedatectl and chrony, not date -s.'
      ],
      distro: 'Identical Bash features on RHEL and Debian/Ubuntu. RHEL defines `which` as an alias that pipes aliases and functions into `/usr/bin/which --read-alias --read-functions`, so it shows more than plain which on Debian. Ubuntu\'s default ~/.bashrc sets HISTCONTROL=ignoreboth and histappend; RHEL\'s does not. Both ship GNU date with -d and +FORMAT.',
      challenge: {
        task: 'You want every command run by members of the ops team to be stored with timestamps, kept for 10000 lines and never lose history when several sessions are open. Implement it system-wide for interactive Bash shells and explain the limitation of this approach for auditing.',
        solution: `Create \`/etc/profile.d/history.sh\` (root):

\`\`\`
export HISTTIMEFORMAT="%F %T "
export HISTSIZE=10000
export HISTFILESIZE=10000
shopt -s histappend
PROMPT_COMMAND="history -a\${PROMPT_COMMAND:+; $PROMPT_COMMAND}"
\`\`\`

\`histappend\` appends instead of overwriting on exit; \`history -a\` in PROMPT_COMMAND writes each command as soon as it completes, so concurrent sessions do not overwrite each other. Login shells read /etc/profile.d. **Limitation:** shell history is user-controlled - users can unset variables, delete the file or use another shell - so it is a convenience, not an audit trail. For real auditing use auditd (for example execve rules) and centralised logging.`
      },
      interview: [
        {
          q: 'How do you find out exactly what will run when you type a command name?',
          a: 'Use type -a NAME. It reports aliases, functions, builtins and every matching file in PATH in the order Bash would use them. which only searches PATH and whereis only lists standard locations.',
          mistake: 'Answering only "which".',
          followUp: 'How do you clear Bash\'s remembered command paths? (hash -r)'
        },
        {
          q: 'How do you run a command without its alias?',
          a: 'Prefix it with a backslash (\\rm), use command rm, or call the full path /usr/bin/rm.',
          mistake: 'Running unalias globally just to run one command.',
          followUp: 'Why are aliases not available inside scripts?'
        },
        {
          q: 'Why prefer printf over echo in scripts?',
          a: 'echo options and escape handling differ between shells and implementations; printf is specified by POSIX, supports field widths and formats, and never adds unexpected newlines.',
          mistake: 'Saying printf is only for numbers.',
          followUp: 'How do you print a timestamp in ISO 8601 format? (date +%F or date -Is)'
        }
      ],
      revision: [
        'Aliases: `alias x=\'...\'`, persist in ~/.bashrc, bypass with `\\x` or `command x`.',
        'History: `!!`, `!n`, `!$`, Ctrl+R; HISTTIMEFORMAT, HISTCONTROL, histappend.',
        '`type -a` is authoritative; `which` searches PATH; `whereis` adds man pages.',
        '`printf` for precise output; `date +%F %T %s`, `date -d`.',
        'Set time with timedatectl/chrony, not `date -s`.'
      ]
    }
  ]
};

export default {
  id: 'L02',
  number: 2,
  title: 'Command-Line Mastery',
  summary: 'Become fluent at the Bash prompt: navigate, manage and inspect files, search and transform text, wire commands together with redirection, pipes and exit codes, and control your shell environment.',
  prerequisites: ['L01'],
  outcomes: [
    'Navigate the filesystem and find documentation offline with man, man -k and --help',
    'Create, copy, move, delete and inspect files safely while preserving metadata',
    'Locate files with find and analyse text with grep, regular expressions, sort, uniq, cut and tr',
    'Control stdin, stdout and stderr with redirection, pipes, tee and xargs, and chain commands on exit codes',
    'Manage variables, quoting, command substitution, aliases and history to work quickly and predictably'
  ],
  modules: [M1, M2, M3, M4, M5]
};
