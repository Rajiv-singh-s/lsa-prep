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
