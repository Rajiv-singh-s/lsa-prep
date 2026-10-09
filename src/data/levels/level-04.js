// Level 4 - Users, Groups, Ownership, and Permissions
// Authoring format: see docs/CONTENT_SPEC.md
export default {
  id: 'L04', number: 4,
  title: 'Users, Groups, Ownership, and Permissions',
  summary: 'How Linux identifies users and groups, how accounts and password aging are managed, and how ownership, mode bits, special bits, ACLs and sudo combine to enforce least privilege on RHEL systems.',
  prerequisites: ['L03'],
  outcomes: [
    'Read and explain /etc/passwd, /etc/shadow and /etc/group, and resolve identities with id and getent',
    'Create, modify, lock, expire and remove users and groups safely with useradd, usermod, userdel, groupadd, passwd and chage',
    'Set ownership, mode bits and umask to produce exactly the access a workload needs',
    'Build collaborative directories with setgid, the sticky bit and POSIX ACLs (including default ACLs and the mask)',
    'Grant and audit administrative privilege with su, sudo, sudoers drop-ins and visudo following least privilege'
  ],
  modules: [
    {
      id: 'L04-M1', title: 'Accounts and identity files',
      summary: 'The local account databases, the numeric identities behind user and group names, and how the system resolves them through NSS.',
      lessons: [
        {
          id: 'L04-M1-T1',
          title: '/etc/passwd, /etc/shadow and /etc/group',
          minutes: 35,
          objectives: [
            'Name every field of /etc/passwd, /etc/shadow and /etc/group',
            'Explain why password hashes live in /etc/shadow and who can read it',
            'Recognise locked, never-set and expired account states from shadow fields',
            'Check the account databases for consistency with pwck and grpck'
          ],
          prereqs: [],
          concept: `Linux does not really care about user *names*. The kernel tracks every process and every file by **numbers**: a user ID (UID) and one or more group IDs (GIDs). Names exist for humans, and the mapping between names and numbers lives in a handful of plain-text databases under \`/etc\`.

### /etc/passwd - the account list
One line per account, seven colon-separated fields:

\`\`\`
alice:x:1001:1001:Alice Ng,Ops:/home/alice:/bin/bash
name :pw:UID :GID :GECOS       :home       :shell
\`\`\`

- **name** - login name.
- **pw** - historically the hash; today an \`x\` meaning "look in /etc/shadow".
- **UID** - the number the kernel actually uses. UID 0 is root, regardless of the name.
- **GID** - the **primary group**; new files get this group by default.
- **GECOS** - free-text comment (full name, phone).
- **home** - the login directory.
- **shell** - program started at login. \`/sbin/nologin\` refuses interactive logins.

\`/etc/passwd\` must be world-readable (mode 644) because ordinary programs such as \`ls\` translate UIDs into names.

### /etc/shadow - secrets and aging
Because passwd is readable by everyone, hashes were moved to \`/etc/shadow\`, which on RHEL has mode \`0000\` (only root, via capabilities that bypass mode bits, can read it). Nine fields:

\`\`\`
alice:$6$Qx...$Hk...:20362:1:90:7:14:20819:
name:hash:lastchg:min:max:warn:inactive:expire:reserved
\`\`\`

- **hash** - \`$6$\` = SHA-512 (the RHEL 8/9 default). A leading \`!\` means the password is **locked**; \`!!\` on RHEL means no password has ever been set; \`*\` means no password login at all (typical for system accounts).
- **lastchg** - day of the last change, counted in days since 1970-01-01. \`0\` forces a change at next login.
- **min / max / warn / inactive** - password aging (covered in M2).
- **expire** - absolute account expiry date, again in days since the epoch.

### /etc/group and /etc/gshadow
\`\`\`
devops:x:2001:alice,bob
\`\`\`
Group name, password placeholder, GID, and a comma-separated list of **supplementary** members. Users are *not* listed here for their primary group - that relationship is in passwd field 4. \`/etc/gshadow\` holds group passwords and group administrators.

### Editing safely
Never edit these files with a normal editor while the system is busy: use the account tools (\`useradd\`, \`usermod\`...) or \`vipw\` / \`vigr\`, which lock the file and edit a copy. \`pwck\` and \`grpck\` verify consistency (duplicate names, missing homes, mismatched shadow entries).`,
          internals: `When a program needs a name for UID 1001 it calls the C library function \`getpwuid()\`. glibc consults **NSS** (\`/etc/nsswitch.conf\`), which on RHEL normally lists \`files sss systemd\` for passwd and group: the \`files\` module reads \`/etc/passwd\` line by line; \`sss\` asks SSSD (LDAP/IdM/AD); \`systemd\` supplies dynamic users.

Authentication is different: PAM (\`pam_unix\`) reads \`/etc/shadow\` through a setuid-free helper (\`unix_chkpwd\`) or as root, hashes the typed password with the salt and algorithm encoded in the \`$id$salt$\` prefix, and compares. Tools that modify the files take a lock (\`/etc/passwd.lock\`, \`/etc/shadow.lock\`), write a new copy, and rename it into place so readers never see half a file. A backup of the previous version is kept as \`/etc/passwd-\`, \`/etc/shadow-\`, \`/etc/group-\`.`,
          useCases: [
            'Auditing a server for unexpected UID 0 accounts after a suspected compromise',
            'Confirming that service accounts use /sbin/nologin and a * or ! password field',
            'Explaining to an auditor where password hashes are stored and who can read them',
            'Recovering from a typo in /etc/passwd by comparing it with /etc/passwd-'
          ],
          syntax: 'getent passwd NAME\ngetent group NAME\nsudo getent shadow NAME\nvipw  |  vipw -s  |  vigr\npwck -r\ngrpck -r',
          options: [
            ['vipw -s', 'Edit /etc/shadow under a lock (vigr -s edits /etc/gshadow)'],
            ['pwck -r', 'Read-only consistency check of passwd/shadow (reports, changes nothing)'],
            ['grpck -r', 'Read-only consistency check of group/gshadow'],
            ['getent passwd', 'List accounts from every NSS source, not just local files'],
            ['awk -F: \'$3==0\' /etc/passwd', 'Find every account with UID 0'],
            ['ls -l /etc/shadow', 'Verify shadow permissions (----------. root root on RHEL)']
          ],
          examples: [
            {
              title: 'Read a passwd entry field by field',
              cmd: 'grep "^alice:" /etc/passwd',
              out: 'alice:x:1001:1001:Alice Ng,Ops:/home/alice:/bin/bash',
              fields: [
                ['alice', 'Login name'],
                ['x', 'Hash is stored in /etc/shadow'],
                ['1001', 'UID used by the kernel for ownership and permission checks'],
                ['1001', 'Primary GID (user private group alice on RHEL)'],
                ['Alice Ng,Ops', 'GECOS comment'],
                ['/home/alice', 'Home directory'],
                ['/bin/bash', 'Login shell']
              ]
            },
            {
              title: 'Inspect shadow state for a locked account',
              cmd: 'sudo getent shadow bob',
              out: 'bob:!$6$rT0f...$8VvR...:20340:0:99999:7:::',
              fields: [
                ['!$6$...', 'Leading ! = locked; the original SHA-512 hash is preserved after it'],
                ['20340', 'Last change, days since 1970-01-01'],
                ['0:99999:7', 'min 0 days, max 99999 (effectively never expires), warn 7 days'],
                ['::', 'No inactivity period and no account expiry set']
              ],
              note: 'Locking only blocks password authentication. An SSH key in ~/.ssh/authorized_keys can still log in unless the account is also expired or its shell changed.'
            },
            {
              title: 'Check database consistency',
              cmd: 'sudo pwck -r',
              out: "user 'olddev': directory '/home/olddev' does not exist\npwck: no changes",
              fields: [['directory ... does not exist', 'Home directory was deleted while the account remains - an orphan to review']]
            }
          ],
          walkthrough: [
            'Run `getent passwd $USER` and label each of the seven fields aloud.',
            'Run `ls -l /etc/passwd /etc/shadow /etc/group` and note the different modes; explain why shadow is `----------`.',
            'Run `sudo getent shadow $USER` and convert the lastchg field to a date with `date -d "1970-01-01 +NNNNN days"`.',
            'List all UID 0 accounts: `awk -F: \'$3==0 {print $1}\' /etc/passwd` - only `root` should appear.',
            'List accounts with a real shell: `grep -v -E "nologin|false" /etc/passwd`.',
            'Run `sudo pwck -r` and `sudo grpck -r` and investigate anything reported.'
          ],
          lab: {
            goal: 'Interpret the local account databases on a RHEL 9/10 VM and detect inconsistencies without modifying anything.',
            steps: [
              'Show your own entries: `getent passwd $USER; getent group $USER; sudo getent shadow $USER`.',
              'Count system vs regular accounts: `awk -F: \'$3<1000\' /etc/passwd | wc -l` and `awk -F: \'$3>=1000 && $3<60000\' /etc/passwd | wc -l`.',
              'Identify accounts whose shadow hash field starts with `!` or `*`: `sudo awk -F: \'$2 ~ /^[!*]/ {print $1, substr($2,1,2)}\' /etc/shadow`.',
              'Compare the live file with its backup: `sudo diff /etc/passwd- /etc/passwd`.',
              'Show which NSS sources are consulted: `grep -E "^(passwd|group|shadow):" /etc/nsswitch.conf`.',
              'Run `sudo pwck -r; sudo grpck -r` and record findings.'
            ],
            verify: '`awk -F: \'$3==0\' /etc/passwd` prints only the root line; `ls -l /etc/shadow` shows `----------` owned by root:root; pwck -r reports "no changes".'
          },
          troubleshooting: {
            scenario: 'After a colleague hand-edited /etc/passwd, nobody except root can log in and `ls -l /home` shows numeric UIDs instead of names.',
            steps: [
              'Evidence: `ls -l /etc/passwd` (mode and owner), `tail -5 /etc/passwd`, `sudo pwck -r` for malformed lines.',
              'Hypothesis: the file lost read permission for others (e.g. mode 600) or a line has the wrong number of fields, so name lookups fail.',
              'Fix: restore mode with `sudo chmod 644 /etc/passwd` and correct syntax using `sudo vipw`, comparing with `/etc/passwd-`; run `restorecon -v /etc/passwd` if the SELinux label changed.',
              'Validate: `ls -l /home` shows names again, `pwck -r` is clean, and a test user can log in over SSH.'
            ]
          },
          mistakes: [
            'Editing /etc/passwd or /etc/shadow with vi directly - a concurrent useradd can overwrite your edit or you can leave a broken line; use vipw/vigr or the account tools.',
            'Assuming the account named "root" is the only superuser - any account with UID 0 has full root power.',
            'Expecting /etc/group to list a user under their primary group - primary membership is defined in /etc/passwd field 4.',
            'Believing a locked password (`!`) blocks every login method - SSH keys and other PAM paths may still work.'
          ],
          safety: [
            'Reading /etc/shadow requires root; never copy it to world-readable locations or paste hashes into tickets.',
            'Before any manual change keep a copy: `sudo cp -a /etc/passwd /root/passwd.$(date +%F)`; keep a root shell open while testing logins.',
            'Malformed passwd/shadow lines can lock everyone out - validate with `pwck -r` before closing your session.'
          ],
          distro: 'RHEL uses mode 0000 for /etc/shadow and /etc/gshadow; Debian/Ubuntu use 0640 root:shadow so members of group shadow can read it. RHEL 8/9 hash passwords with SHA-512 (`$6$`); Fedora and Debian 11+ default to yescrypt (`$y$`). On RHEL 9 the `nobody` user is UID 65534 (it was 99 on RHEL 7).',
          challenge: {
            task: 'Without using any account-management command, produce a report of: (1) all UID 0 accounts, (2) accounts with an empty password field in /etc/shadow, (3) human accounts (UID >= 1000) whose shell is an interactive shell.',
            solution: `Use awk on the colon-separated files:

\`\`\`
awk -F: '$3==0 {print "UID0:", $1}' /etc/passwd
sudo awk -F: '$2=="" {print "EMPTY-PW:", $1}' /etc/shadow
awk -F: '$3>=1000 && $3<60000 && $7 !~ /(nologin|false)$/ {print "LOGIN:", $1, $7}' /etc/passwd
\`\`\`

Reasoning: UID - not name - grants root, so field 3 is checked. An empty field 2 in shadow means no password is required (a critical finding), whereas \`!\`, \`!!\` or \`*\` mean password login is impossible. Shell field 7 tells you who can get an interactive session; the 60000 upper bound excludes nobody (65534).`
          },
          interview: [
            {
              q: 'Why is there an x in the second field of /etc/passwd?',
              a: '/etc/passwd must be world-readable so programs can map UIDs to names. Storing hashes there would allow offline cracking, so hashes moved to /etc/shadow (root-only); the x tells tools to look there.',
              mistake: 'Saying the x means the account is disabled.',
              followUp: 'What do !, !! and * mean in the shadow hash field?'
            },
            {
              q: 'An account called "backup" has UID 0. Is that a problem?',
              a: 'Yes. Privilege comes from the UID, so "backup" is a full superuser. Unless documented and justified, it is a backdoor indicator - investigate when and how it was created (journal, /var/log/secure, audit logs) and remove or re-number it.',
              mistake: 'Thinking only the name root matters.',
              followUp: 'How would you find every UID 0 account across NSS sources, not just local files?'
            },
            {
              q: 'How do you safely edit /etc/shadow by hand if you must?',
              a: 'Use `vipw -s`, which locks the file and edits a temporary copy, then run `pwck -r` to validate. Prefer `usermod`, `chage` or `passwd` for routine changes.',
              mistake: 'Opening it with vi directly.',
              followUp: 'Where does RHEL keep the previous version of the file?'
            }
          ],
          revision: [
            'passwd: name:x:UID:GID:GECOS:home:shell - world-readable 644.',
            'shadow: name:hash:lastchg:min:max:warn:inactive:expire:reserved - mode 0000 on RHEL.',
            'Hash prefix ! = locked, !! = never set (RHEL), * = no password login, empty = no password needed (dangerous).',
            'group: name:x:GID:supplementary,members - primary group comes from passwd.',
            'Use vipw/vigr and pwck -r/grpck -r; backups are passwd-, shadow-, group-.'
          ]
        },
        {
          id: 'L04-M1-T2',
          title: 'UIDs, GIDs and identity resolution with id and getent',
          minutes: 30,
          objectives: [
            'Distinguish system and regular UID/GID ranges defined in /etc/login.defs',
            'Explain primary versus supplementary groups and when membership takes effect',
            'Use id, groups and getent to resolve identities from all NSS sources',
            'Diagnose stale group membership and numeric-only ownership'
          ],
          prereqs: ['L04-M1-T1'],
          concept: `Every process carries a set of credentials: a **real UID** (who started it), an **effective UID** (whose privileges it uses now), a primary **GID**, and a list of **supplementary GIDs**. Permission checks compare these numbers with the owner and group recorded in a file's inode.

### UID ranges
\`/etc/login.defs\` sets the ranges that \`useradd\` allocates from. On RHEL 9:

- **0** - root.
- **1-999** - system accounts for daemons (\`SYS_UID_MIN\`/\`SYS_UID_MAX\`; RHEL 9 uses 201-999 for dynamically allocated ones, lower numbers are statically assigned by packages).
- **1000-60000** - regular human accounts (\`UID_MIN\`/\`UID_MAX\`).
- **65534** - \`nobody\`, the overflow/unmapped identity.

The ranges are policy, not kernel rules: the kernel only treats UID 0 specially.

### Primary vs supplementary groups
The **primary group** (passwd field 4) is the group new files receive. RHEL uses **user private groups** (UPG): each user gets a group of the same name and number, so a permissive group bit does not accidentally expose files to everyone in a shared group. **Supplementary groups** (from /etc/group or a directory service) grant extra access, e.g. \`wheel\` for sudo.

Group membership is copied into a process **at login**. If you add alice to \`devops\` while she is logged in, her existing shells still lack it; she must log out and back in, or start a new shell with \`newgrp devops\` or \`sg devops -c cmd\`. The same applies to long-running services: restart them after changing their account's groups.

### Resolving identities
- \`id [user]\` prints uid, gid and groups (and the SELinux context for your own shell). Without an argument it shows the credentials of the **current process**; with a name it shows the database view - comparing the two reveals stale sessions.
- \`groups [user]\` lists group names only.
- \`getent passwd|group|shadow KEY\` queries through **NSS**, so it returns local *and* directory (SSSD/IdM/AD) accounts. \`grep /etc/passwd\` only sees local accounts - a classic blind spot on domain-joined servers.

### Orphaned ownership
Files keep their numeric UID after the account is deleted. \`ls -l\` then shows a bare number. If a new user later receives the same UID, they silently inherit those files - which is why you should clean up or reassign ownership when removing accounts (\`find / -nouser -o -nogroup\`).`,
          internals: `Credentials live in the kernel's \`struct cred\` attached to every task, visible in \`/proc/PID/status\` as \`Uid:\` and \`Gid:\` lines (real, effective, saved, filesystem) and \`Groups:\`. \`login\`, \`sshd\` and \`su\` call \`initgroups()\`, which asks NSS for every group containing the user and calls \`setgroups()\` before dropping to the user's UID with \`setuid()\`. After that, the list is fixed for that process tree; children inherit it on \`fork()\`.

\`getent\` is a thin wrapper around the same NSS calls (\`getpwnam\`, \`getgrnam\`, \`getspnam\`), so its answer is exactly what applications see, including SSSD caching. \`id\` combines \`getuid()/getgroups()\` for the current process, or NSS lookups when given a user name.`,
          useCases: [
            'Explaining why a user still gets "Permission denied" right after being added to a group',
            'Verifying that an IdM/AD user resolves on a server with getent before granting access',
            'Choosing a fixed UID for a service account so NFS ownership is consistent across hosts',
            'Finding orphaned files after accounts are removed'
          ],
          syntax: 'id [-u|-g|-G|-n] [USER]\ngroups [USER]\ngetent passwd|group [KEY]\nnewgrp GROUP\nsg GROUP -c "COMMAND"\nfind PATH -nouser -o -nogroup',
          options: [
            ['id -u / -g', 'Print only the effective UID / primary GID'],
            ['id -Gn', 'Print all group names'],
            ['getent group wheel', 'Show members of wheel from all NSS sources'],
            ['newgrp GROUP', 'Start a new shell with GROUP as primary group (picks up new membership)'],
            ['grep -E "^(UID|GID|SYS_UID)_" /etc/login.defs', 'Show allocation ranges'],
            ['find / -xdev -nouser', 'Find files whose UID has no account']
          ],
          examples: [
            {
              title: 'Stale membership: database vs current process',
              cmd: 'id alice; id',
              out: 'uid=1001(alice) gid=1001(alice) groups=1001(alice),10(wheel),2001(devops)\nuid=1001(alice) gid=1001(alice) groups=1001(alice),10(wheel) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023',
              fields: [
                ['id alice', 'What the account database says now - includes devops'],
                ['id', 'What the running shell actually holds - devops missing'],
                ['context=', 'SELinux context of the current process (only shown for your own process)']
              ],
              note: 'Log out and back in, or run newgrp devops, to pick up the new group.'
            },
            {
              title: 'Resolve a directory-service user',
              cmd: 'getent passwd jsmith@corp.example.com',
              out: 'jsmith@corp.example.com:*:1855401104:1855400513:John Smith:/home/jsmith@corp.example.com:/bin/bash',
              fields: [
                ['1855401104', 'UID mapped by SSSD from the AD SID - not present in /etc/passwd'],
                ['*', 'Password field placeholder; authentication is done by SSSD/Kerberos']
              ]
            },
            {
              title: 'Credentials of a running process',
              cmd: 'grep -E "^(Uid|Gid|Groups)" /proc/$$/status',
              out: 'Uid:\t1001\t1001\t1001\t1001\nGid:\t1001\t1001\t1001\t1001\nGroups:\t10 1001',
              fields: [['Uid: r e s fs', 'Real, effective, saved and filesystem UID'], ['Groups:', 'Supplementary GIDs fixed at login']]
            }
          ],
          walkthrough: [
            'Run `id` and `id $USER` and compare the output.',
            'Read the ranges: `grep -E "^(UID_MIN|UID_MAX|SYS_UID_MIN|SYS_UID_MAX|GID_MIN)" /etc/login.defs`.',
            'Check how lookups are routed: `grep -E "^(passwd|group)" /etc/nsswitch.conf`.',
            'Inspect your shell credentials in `/proc/$$/status`.',
            'Search for orphaned files on the root filesystem: `sudo find / -xdev \\( -nouser -o -nogroup \\) -ls 2>/dev/null | head`.'
          ],
          lab: {
            goal: 'Demonstrate that supplementary group membership is applied at login, and find orphaned files.',
            steps: [
              'Create a test group and user: `sudo groupadd labgrp; sudo useradd labuser; sudo passwd labuser`.',
              'Open a session as labuser: `sudo -iu labuser` and run `id`.',
              'In another root terminal add the group: `sudo usermod -aG labgrp labuser`.',
              'Back in labuser\'s shell run `id` (no labgrp) and `id labuser` (labgrp present). Then `exit` and `sudo -iu labuser` again and re-run `id`.',
              'Create a file as labuser (`touch /tmp/labfile`), then delete the account without removing files: `sudo userdel labuser` and run `ls -l /tmp/labfile`.',
              'Find and clean it: `sudo find /tmp -nouser -ls` then `sudo rm /tmp/labfile; sudo groupdel labgrp; sudo rm -rf /home/labuser /var/spool/mail/labuser`.'
            ],
            verify: 'The first id in the old session lacks labgrp while the new session includes it; after userdel, ls -l shows a numeric owner and find -nouser lists the file.'
          },
          troubleshooting: {
            scenario: 'An AD user can SSH to one server but `id jsmith@corp.example.com` returns "no such user" on another.',
            steps: [
              'Evidence: `getent passwd jsmith@corp.example.com`, `systemctl status sssd`, `grep -E "^passwd" /etc/nsswitch.conf`, `realm list`.',
              'Hypothesis: SSSD is stopped, the host is not joined, or nsswitch.conf lacks the sss source (authselect profile not applied).',
              'Fix: start/enable sssd, re-join with realm if needed, or apply the right profile with `authselect select sssd --force` after backing up; clear stale cache with `sss_cache -E`.',
              'Validate: getent returns the user and `id` lists their AD groups.'
            ]
          },
          mistakes: [
            'Telling a user "you are in the group" based on `id username` while their session still runs with old credentials.',
            'Using `grep /etc/passwd` to check accounts on IdM/AD-joined systems - directory users never appear there.',
            'Reusing a deleted user\'s UID for a new hire - they inherit every orphaned file the old UID owned.',
            'Assigning different UIDs to the same service account on different NFS clients, causing ownership mismatches.'
          ],
          safety: [
            'id, groups and getent are read-only and safe on production.',
            'Changing a UID with `usermod -u` re-owns files only inside the home directory; plan a find/chown for the rest and stop the user\'s processes first.',
            'Run broad `find /` scans with `-xdev` and off-peak to avoid crawling network filesystems.'
          ],
          distro: 'RHEL, Debian and Ubuntu all start regular UIDs at 1000. RHEL configures NSS with authselect (do not hand-edit nsswitch.conf on RHEL 8+ - authselect may overwrite it); Debian uses pam-auth-update and edits nsswitch.conf directly. On RHEL 7, UID_MIN was also 1000 but older RHEL 6 systems started at 500.',
          challenge: {
            task: 'A developer insists she is in group `appdata` but gets "Permission denied" writing to /srv/appdata (mode 2770, group appdata). Prove the cause and fix it without rebooting anything.',
            solution: `Compare the database view with her live credentials:

\`\`\`
id dev1                 # shows appdata -> database is correct
sudo cat /proc/$(pgrep -u dev1 -n bash)/status | grep Groups   # GID of appdata missing
getent group appdata    # confirm GID
\`\`\`

If the GID is absent from the live process, the membership was added after she logged in. Fix: she logs out/in, or runs \`newgrp appdata\` (or \`sg appdata -c 'touch /srv/appdata/x'\`). If the GID is present, move on to checking the directory's parent path permissions (\`namei -l /srv/appdata\`) and SELinux denials (\`ausearch -m avc -ts recent\`). Evidence first, then fix.`
          },
          interview: [
            {
              q: 'What is the difference between a primary and a supplementary group?',
              a: 'The primary group (passwd field 4) is the group assigned to new files and the process GID; supplementary groups are additional groups that grant access. Both are evaluated for permission checks, but only the primary group affects default group ownership (unless the directory is setgid).',
              mistake: 'Saying a user can only be in one group.',
              followUp: 'How does setgid on a directory change which group a new file receives?'
            },
            {
              q: 'Why prefer getent over cat /etc/passwd?',
              a: 'getent goes through NSS, so it returns exactly what applications see from every configured source - local files, SSSD (LDAP/IdM/AD) and systemd. cat only shows local accounts.',
              mistake: 'Thinking getent is just a prettier cat.',
              followUp: 'Which file controls the order of NSS sources, and how is it managed on RHEL?'
            },
            {
              q: 'A user was added to a group but access still fails. What do you check?',
              a: 'Whether their current session has the group (id with no argument, or /proc/PID/status Groups). Membership is applied at login, so they need a new login or newgrp. Then verify path permissions with namei -l and SELinux.',
              mistake: 'Immediately chmod 777 on the directory.',
              followUp: 'How does this affect a systemd service running as that user?'
            }
          ],
          revision: [
            'Kernel uses numbers: UID 0 = root; 1-999 system; 1000+ regular (login.defs).',
            'Primary group = passwd field 4; supplementary groups grant extra access.',
            'Group membership is loaded at login - re-login, newgrp or restart the service.',
            'getent queries NSS (files + sss + systemd); grep /etc/passwd sees only local users.',
            'Deleted users leave numeric-owned files: find -nouser -o -nogroup.'
          ]
        }
      ]
    },
    {
      id: 'L04-M2', title: 'Managing users, groups and password aging',
      summary: 'Account lifecycle with useradd, usermod, userdel, groupadd and gpasswd, plus password policy, aging and expiration with passwd and chage.',
      lessons: [
        {
          id: 'L04-M2-T1',
          title: 'Creating, modifying and removing users and groups',
          minutes: 40,
          objectives: [
            'Create users and groups with explicit UIDs, GIDs, shells and supplementary groups',
            'Modify accounts safely with usermod, especially appending groups with -aG',
            'Remove accounts with userdel and clean up remaining files',
            'Explain where useradd defaults come from (/etc/login.defs, /etc/default/useradd, /etc/skel)'
          ],
          prereqs: ['L04-M1-T2'],
          concept: `Account management on RHEL is done with the **shadow-utils** tools, which update passwd, shadow, group and gshadow atomically and consistently. Editing the files by hand is reserved for emergencies.

### useradd - create
\`useradd alice\` with no options:
1. Allocates the next free UID >= \`UID_MIN\` (1000).
2. Creates a **user private group** \`alice\` with the same number (\`USERGROUPS_ENAB yes\`).
3. Creates \`/home/alice\` (\`CREATE_HOME yes\` in login.defs on RHEL) and copies the contents of \`/etc/skel\` (default \`.bashrc\`, \`.bash_profile\`...).
4. Sets the shell from \`/etc/default/useradd\` (\`/bin/bash\`).
5. Leaves the password field as \`!!\` - **no password login is possible until you set one**.

Common options: \`-u UID\`, \`-g PRIMARY\`, \`-G grp1,grp2\` (supplementary), \`-c "comment"\`, \`-d HOME\`, \`-s SHELL\`, \`-e YYYY-MM-DD\` (expiry), \`-r\` (system account: UID below 1000, no home by default), \`-M\` (no home). View defaults with \`useradd -D\`.

### usermod - change
- \`usermod -aG devops alice\` - **append** a supplementary group. Without \`-a\`, \`-G\` *replaces* the whole list and silently removes alice from wheel and every other group. This is the most common account-management mistake.
- \`-s /sbin/nologin\` - change shell; \`-c\` comment; \`-e\` expiry; \`-L\`/\`-U\` lock/unlock password.
- \`-l newname\` - rename login (home and group are *not* renamed automatically).
- \`-d /new/home -m\` - change and move the home directory.
- \`-u NEWUID\` - renumber; only files inside the home directory are re-owned.

### userdel - remove
\`userdel alice\` removes the account entries but keeps \`/home/alice\`. \`userdel -r alice\` also removes the home directory and mail spool. Neither touches files the user owns elsewhere (\`/srv\`, \`/tmp\`, shared project trees), and userdel refuses if the user still has running processes. Professional offboarding usually **locks and expires first**, archives data, then deletes later.

### Groups
- \`groupadd -g 3000 finance\` (\`-r\` for a system group).
- \`groupmod -n newname\` / \`-g newgid\`.
- \`groupdel finance\` - refused if it is any user's primary group.
- \`gpasswd -a user group\` / \`gpasswd -d user group\` - add or remove a single member without touching other memberships; \`gpasswd -A user group\` delegates group administration.`,
          internals: `The tools lock the databases, write updated copies and rename them into place, keeping \`-\` backups. \`useradd\` reads policy from \`/etc/login.defs\` (UID/GID ranges, CREATE_HOME, PASS_* aging defaults, UMASK and HOME_MODE for the new home) and \`/etc/default/useradd\` (HOME base, SHELL, SKEL, INACTIVE, EXPIRE). The home is created with mode from HOME_MODE (0700 on RHEL 9) and receives the SELinux label \`user_home_dir_t\`.

On systems joined to IdM or AD, these tools manage only **local** accounts; directory users are managed in the directory (\`ipa user-add\`, AD tools). SSSD caches directory data, so changes there may take a few minutes, or \`sss_cache -E\`, to appear.`,
          useCases: [
            'Onboarding a new engineer with consistent UID, comment, shell and team groups',
            'Creating a non-login service account for an application under /opt',
            'Offboarding: lock, expire, archive home, then delete',
            'Delegating team-group membership management with gpasswd -A'
          ],
          syntax: 'useradd [-u UID] [-g GROUP] [-G G1,G2] [-c COMMENT] [-d HOME] [-s SHELL] [-e DATE] [-r] NAME\nusermod -aG GROUP NAME\nusermod -L|-U|-s SHELL|-e DATE NAME\nuserdel [-r] NAME\ngroupadd [-g GID] [-r] NAME\ngpasswd -a|-d USER GROUP',
          options: [
            ['useradd -G g1,g2', 'Set supplementary groups at creation'],
            ['useradd -r -s /sbin/nologin', 'Create a system/service account without interactive login'],
            ['usermod -aG GROUP', 'Append a supplementary group (keep existing ones)'],
            ['usermod -G GROUP', 'REPLACE the supplementary list - dangerous without -a'],
            ['userdel -r', 'Delete account plus home directory and mail spool'],
            ['useradd -D', 'Show useradd defaults'],
            ['gpasswd -d USER GROUP', 'Remove one user from one group']
          ],
          examples: [
            {
              title: 'Onboard a user with explicit settings',
              cmd: 'sudo useradd -u 1501 -c "Priya Rao, DBA" -G wheel,dba priya && id priya',
              out: 'uid=1501(priya) gid=1501(priya) groups=1501(priya),10(wheel),3005(dba)',
              fields: [['gid=1501(priya)', 'User private group created automatically'], ['10(wheel),3005(dba)', 'Supplementary groups from -G']]
            },
            {
              title: 'The usermod -G trap',
              cmd: 'sudo usermod -G backup priya && id priya',
              out: 'uid=1501(priya) gid=1501(priya) groups=1501(priya),3010(backup)',
              fields: [['groups=...backup', 'wheel and dba were removed because -a was omitted']],
              note: 'Recover with: sudo usermod -aG wheel,dba priya'
            },
            {
              title: 'Create a service account',
              cmd: 'sudo useradd -r -d /opt/payapp -s /sbin/nologin -c "payapp service" payapp && getent passwd payapp',
              out: 'payapp:x:985:982:payapp service:/opt/payapp:/sbin/nologin',
              fields: [['985', 'System UID below 1000 allocated by -r'], ['/sbin/nologin', 'Interactive logins refused']]
            }
          ],
          walkthrough: [
            'Inspect defaults: `useradd -D` and `grep -vE "^#|^$" /etc/login.defs | head -30`.',
            'Create a group with a fixed GID: `sudo groupadd -g 3005 dba`.',
            'Create a user in it: `sudo useradd -c "Test DBA" -G dba tdba && sudo passwd tdba`.',
            'Add another group the right way: `sudo usermod -aG wheel tdba`; confirm with `id tdba`.',
            'Lock and expire before deletion: `sudo usermod -L -e 1 tdba`.',
            'Delete with home: `sudo userdel -r tdba`; then check for leftovers with `sudo find / -xdev -nouser 2>/dev/null`.'
          ],
          lab: {
            goal: 'Run a complete onboarding and offboarding cycle for a team account on a RHEL VM.',
            steps: [
              'Create the team group: `sudo groupadd -g 4100 webteam`.',
              'Create two users: `sudo useradd -G webteam -c "Web dev 1" wdev1` and `sudo useradd -G webteam -c "Web dev 2" wdev2`; set passwords with `sudo passwd wdev1` and `sudo passwd wdev2`.',
              'Delegate membership management: `sudo gpasswd -A wdev1 webteam`.',
              'Remove wdev2 from the team without touching other groups: `sudo gpasswd -d wdev2 webteam`.',
              'Offboard wdev2: `sudo usermod -L -e 1 -s /sbin/nologin wdev2`, archive `sudo tar czf /root/wdev2-home.tgz /home/wdev2`, then `sudo userdel -r wdev2`.',
              'Clean up: `sudo userdel -r wdev1; sudo groupdel webteam`.'
            ],
            verify: '`getent group webteam` lists only wdev1 after step 4; `sudo getent shadow wdev2` shows `!` and expire field 1 after step 5; `id wdev2` returns "no such user" after deletion.'
          },
          troubleshooting: {
            scenario: '`sudo userdel -r olduser` fails with "userdel: user olduser is currently used by process 4321".',
            steps: [
              'Evidence: `ps -fu olduser`, `loginctl list-sessions`, `who`.',
              'Hypothesis: an SSH session, cron job or the user systemd instance (user@UID.service) is still running.',
              'Fix: lock first (`usermod -L -e 1 olduser`), end sessions with `loginctl terminate-user olduser`, confirm with `ps -u olduser`; only then run userdel -r. Avoid `userdel -f` on production - it removes the account while processes keep running under an orphaned UID.',
              'Validate: `id olduser` fails, `/home/olduser` is gone, `find / -xdev -nouser` lists only files you intend to reassign.'
            ]
          },
          mistakes: [
            'Running `usermod -G group user` without -a, silently stripping wheel and other memberships.',
            'Assuming useradd sets a password - the account stays at !! until passwd is run.',
            'Deleting accounts immediately on offboarding, losing data needed for audits; lock and expire first.',
            'Renaming a login with -l and forgetting that the home directory and private group keep the old name.',
            'Running groupdel on a group that still owns shared data, leaving numeric GIDs on files.'
          ],
          safety: [
            'All account changes need root; changes take effect for new logins immediately.',
            'Back up the databases before bulk changes: `sudo tar czf /root/accounts.tgz /etc/passwd /etc/shadow /etc/group /etc/gshadow`.',
            'userdel -r is destructive: archive the home directory first.',
            'Never remove your own wheel membership while it is your only route to root - keep a second admin session open.'
          ],
          distro: 'On Debian/Ubuntu, `useradd` does not create a home directory unless -m is given and its default shell is /bin/sh; the friendlier `adduser` wrapper is common there. On RHEL, `adduser` is just a symlink to useradd. RHEL uses group `wheel` for sudo; Debian/Ubuntu use group `sudo`.',
          challenge: {
            task: 'Create a service account `reportsvc` with UID/GID 2500, home /var/lib/reportsvc (created), no interactive login, and membership in an existing group `analytics`, then prove every property.',
            solution: `\`\`\`
sudo groupadd -g 2500 reportsvc
sudo useradd -u 2500 -g 2500 -G analytics -d /var/lib/reportsvc -m -s /sbin/nologin -c "Reports service" reportsvc
getent passwd reportsvc        # 2500:2500, home and shell
id reportsvc                   # groups include analytics
ls -ld /var/lib/reportsvc      # exists, owned by reportsvc
sudo getent shadow reportsvc   # !! - no password, correct for a service
\`\`\`

The group is created first so UID and GID can match (useradd would refuse to create a private group whose name already exists, so we pass -g explicitly). \`-m\` documents that the home must be created. No password is set: services should never log in with one.`
          },
          interview: [
            {
              q: 'What is the difference between usermod -G and usermod -aG?',
              a: '-G sets the complete supplementary group list, removing any group not listed; -aG appends to the existing list. Omitting -a is a frequent cause of users losing sudo (wheel) access.',
              mistake: 'Saying they are equivalent.',
              followUp: 'Which command removes a user from exactly one group without affecting others?'
            },
            {
              q: 'How would you offboard an employee from a Linux server?',
              a: 'Lock and expire the account (usermod -L -e 1), remove SSH keys and sudo rules, end their sessions, archive the home directory and any owned data, reassign ownership of shared files, review crontabs, then delete with userdel -r after the retention period. Document everything.',
              mistake: 'Just running userdel -r right away.',
              followUp: 'Why does expiring the account matter if the password is already locked?'
            },
            {
              q: 'Where does useradd get its defaults?',
              a: '/etc/login.defs (UID/GID ranges, CREATE_HOME, PASS_* aging, UMASK/HOME_MODE), /etc/default/useradd (shell, home base, skel, inactive, expire) and /etc/skel (initial dotfiles).',
              mistake: 'Only knowing about /etc/skel.',
              followUp: 'Does changing PASS_MAX_DAYS in login.defs affect existing users?'
            }
          ],
          revision: [
            'useradd creates UPG, home (RHEL) and copies /etc/skel; password stays !! until set.',
            'usermod -aG appends; -G alone replaces.',
            'userdel -r removes home + mail spool only; find leftovers with -nouser.',
            'gpasswd -a/-d edits one membership; groupdel refuses a primary group.',
            'Offboard: lock + expire + archive, delete later.'
          ]
        },
        {
          id: 'L04-M2-T2',
          title: 'Passwords, password aging and account expiration',
          minutes: 35,
          objectives: [
            'Set, lock, unlock and force-expire passwords with passwd',
            'Configure password aging and account expiry with chage',
            'Explain the difference between password expiry, inactivity and account expiry',
            'Diagnose login failures caused by aging, locking and faillock'
          ],
          prereqs: ['L04-M2-T1'],
          concept: `Password aging is stored in the numeric fields of \`/etc/shadow\` and enforced by PAM at login. Three different mechanisms are often confused:

- **Password expiry** (lastchg + max): the user must change the password at next login.
- **Inactivity** (inactive): N days after the password expired, password login is disabled until an admin intervenes.
- **Account expiry** (expire): on that date the account is disabled entirely, regardless of the password.

### passwd
- \`passwd\` - change your own password (requires the old one).
- \`sudo passwd alice\` - root sets a password without knowing the old one.
- \`passwd -l\` / \`-u\` - lock/unlock (prefixes the hash with \`!\`).
- \`passwd -e alice\` - expire the password now (forces change at next login).
- \`passwd -S alice\` - status summary.
- \`--stdin\` (RHEL-specific) reads a password from a pipe; for scripts \`chpasswd\` is portable.

### chage
- \`chage -l alice\` - human-readable aging status (a user can list their own).
- \`-M 90\` max days, \`-m 1\` min days between changes, \`-W 7\` warning days, \`-I 14\` inactive days.
- \`-E 2026-12-31\` account expiry date; \`-E -1\` removes it.
- \`-d 0\` sets "last change" to the epoch, forcing a change at next login - common for new accounts.

\`chage USER\` with no options runs interactively.

### Defaults vs existing accounts
\`PASS_MAX_DAYS\`, \`PASS_MIN_DAYS\` and \`PASS_WARN_AGE\` in \`/etc/login.defs\` are copied into shadow **only when an account is created**. Changing them does nothing for existing users - you must run \`chage\` per account.

### Complexity and lockout
Password quality (length, character classes, dictionary checks) is enforced by **pam_pwquality** (\`/etc/security/pwquality.conf\`). Repeated failures are counted by **pam_faillock** (\`/etc/security/faillock.conf\`); check with \`faillock --user alice\` and reset with \`faillock --user alice --reset\`. On RHEL these PAM stacks are managed with \`authselect\` (e.g. \`authselect enable-feature with-faillock\`), not by editing /etc/pam.d by hand.

### Locking vs expiring
A locked password stops password authentication only. **Account expiry** is checked in PAM's account phase, which sshd runs even for key-based logins (UsePAM yes on RHEL), so \`usermod -e 1\` or \`chage -E 0\` is the reliable way to stop every login.`,
          internals: `All dates are integers counting days since 1970-01-01 (UTC). At login, \`pam_unix\` in the **account** phase reads the shadow entry: if \`expire\` is set and has passed, it returns "account expired"; if lastchg + max is in the past it requires a new password, or refuses login once the inactive window has also passed. In the **auth** phase the typed password is hashed with the salt and algorithm encoded in the stored hash and compared. \`chage\` and \`passwd\` only rewrite these fields - nothing runs in the background; enforcement happens at the next authentication. When root uses \`su - user\` no password is asked, but PAM still runs the account phase, so an expired account is still reported.`,
          useCases: [
            'Meeting a compliance rule of 90-day maximum password age for local accounts',
            'Giving contractors accounts that expire automatically at the end of the contract',
            'Forcing a password change on first login for newly created users',
            'Unlocking a user locked out by pam_faillock after failed attempts'
          ],
          syntax: 'passwd [-l|-u|-e|-S] [USER]\nchage -l USER\nchage [-M MAX] [-m MIN] [-W WARN] [-I INACTIVE] [-E YYYY-MM-DD|-1] [-d LASTDAY] USER\nchpasswd < FILE   (lines of user:password)\nfaillock --user USER [--reset]',
          options: [
            ['chage -l USER', 'List aging information'],
            ['chage -M 90 -W 7 USER', 'Maximum 90 days with 7-day warning'],
            ['chage -d 0 USER', 'Force password change at next login'],
            ['chage -E 2026-12-31 USER', 'Account expires on that date (-E -1 removes)'],
            ['chage -I 14 USER', 'Disable password login 14 days after the password expires'],
            ['passwd -S USER', 'Short status: locked/set, last change, aging values'],
            ['faillock --user USER --reset', 'Clear the failed-login counter']
          ],
          examples: [
            {
              title: 'Read aging information',
              cmd: 'sudo chage -l alice',
              out: 'Last password change\t\t\t\t\t: Oct 01, 2026\nPassword expires\t\t\t\t\t: Dec 30, 2026\nPassword inactive\t\t\t\t\t: Jan 13, 2027\nAccount expires\t\t\t\t\t\t: Mar 31, 2027\nMinimum number of days between password change\t\t: 1\nMaximum number of days between password change\t\t: 90\nNumber of days of warning before password expires\t: 7',
              fields: [
                ['Password expires', 'lastchg + 90 days: must change password from this date'],
                ['Password inactive', '14 days after expiry, password login is disabled'],
                ['Account expires', 'Absolute date when every login stops'],
                ['Minimum ... 1', 'User cannot change password again within 1 day']
              ]
            },
            {
              title: 'Status after a forced change',
              cmd: 'sudo chage -d 0 bob && sudo passwd -S bob',
              out: 'bob PS 1970-01-01 0 99999 7 -1 (Password set, SHA512 crypt.)',
              fields: [['PS', 'Password set (LK = locked, NP = no password)'], ['1970-01-01', 'lastchg = 0, so a change is required at next login'], ['-1', 'No inactivity period']]
            },
            {
              title: 'Locked out by faillock',
              cmd: 'sudo faillock --user carol',
              out: 'carol:\nWhen                Type  Source                                           Valid\n2026-10-09 08:14:02 RHOST 10.0.4.21                                            V\n2026-10-09 08:14:09 RHOST 10.0.4.21                                            V\n2026-10-09 08:14:17 RHOST 10.0.4.21                                            V',
              fields: [['V', 'Valid failure counted toward the deny threshold (deny = 3 by default in faillock.conf)'], ['RHOST', 'Failures came over the network from this address']],
              note: 'Confirm the failures were the user (not an attack) before resetting with --reset.'
            }
          ],
          walkthrough: [
            'Create a test user and set a password: `sudo useradd agetest && sudo passwd agetest`.',
            'Apply policy: `sudo chage -M 90 -m 1 -W 7 -I 14 agetest` and inspect with `sudo chage -l agetest`.',
            'Force change at next login: `sudo chage -d 0 agetest`; log in with `ssh agetest@localhost` and observe the forced-change prompt.',
            'Set an account expiry in the past: `sudo chage -E 2020-01-01 agetest`; try to log in and read `sudo tail /var/log/secure`.',
            'Remove expiry with `sudo chage -E -1 agetest`, then delete the user with `sudo userdel -r agetest`.'
          ],
          lab: {
            goal: 'Implement a contractor account policy: 60-day passwords, 7-day warning, change on first login, account ends on a fixed date.',
            steps: [
              'Create the account: `sudo useradd -c "Contractor" contractor1 && sudo passwd contractor1`.',
              'Apply aging: `sudo chage -M 60 -m 1 -W 7 -I 7 -E $(date -d "+30 days" +%F) contractor1`.',
              'Force first-login change: `sudo chage -d 0 contractor1`.',
              'Verify with `sudo chage -l contractor1` and `sudo getent shadow contractor1`, mapping each number to its field.',
              'Test: `ssh contractor1@localhost` and complete the forced change.',
              'Simulate contract end: `sudo chage -E 0 contractor1`; attempt login again; then `sudo userdel -r contractor1`.'
            ],
            verify: 'chage -l shows max 60, warn 7, inactive 7 and the expiry date; the first SSH login demands a new password; after -E 0 the login fails and /var/log/secure records an expired account.'
          },
          troubleshooting: {
            scenario: 'A user reports "Your account has expired; please contact your system administrator" over SSH, but their password was changed last week.',
            steps: [
              'Evidence: `sudo chage -l user`, `sudo getent shadow user` (field 8), `sudo grep user /var/log/secure | tail`.',
              'Hypothesis: the account expiry date (field 8) has passed - this is independent of password age.',
              'Fix: after confirming with the owner/HR that access is still approved, set a new date `sudo chage -E 2027-03-31 user` or remove it with `-E -1`.',
              'Validate: chage -l shows the new date and the user logs in successfully.'
            ]
          },
          mistakes: [
            'Changing PASS_MAX_DAYS in login.defs and expecting existing users to be affected.',
            'Confusing -E (account expiry date) with -M (password maximum age).',
            'Relying on passwd -l to disable a user who authenticates with SSH keys.',
            'Resetting faillock counters without checking whether the failures were an attack.',
            'Using passwd --stdin in scripts meant to run on Debian/Ubuntu, where it does not exist.'
          ],
          safety: [
            'Do not put passwords on command lines (visible in ps and shell history); use passwd interactively or chpasswd from a root-only file.',
            'Applying -E or -M to service accounts can break applications that authenticate as them - check before applying blanket policies.',
            'Never apply an account expiry to root or your only admin account without an alternative access path.'
          ],
          distro: 'RHEL configures pwquality and faillock through authselect profiles (RHEL 8+); pam_tally2 was removed in RHEL 8. Debian/Ubuntu edit /etc/pam.d/common-* via pam-auth-update. `passwd --stdin` exists on RHEL/Fedora only. RHEL 9 defaults to SHA-512 hashes; Fedora and Debian default to yescrypt.',
          challenge: {
            task: 'Bring every existing human account (UID 1000-60000) into compliance with a 90-day maximum and 7-day warning without touching service accounts, and list accounts whose password is already older than 90 days.',
            solution: `\`\`\`
for u in $(awk -F: '$3>=1000 && $3<60000 {print $1}' /etc/passwd); do
  sudo chage -M 90 -W 7 "$u"
done
today=$(( $(date +%s) / 86400 ))
sudo awk -F: -v t="$today" '$3 ~ /^[0-9]+$/ && $3 > 0 && t-$3 > 90 {print $1, t-$3, "days"}' /etc/shadow
\`\`\`

The UID range filter from /etc/passwd excludes system accounts. login.defs changes would not affect existing users, so chage is required per account. The second command converts today to days-since-epoch (shadow's unit) and compares it with field 3 (lastchg); those users will be forced to change at their next login. Also update PASS_MAX_DAYS/PASS_WARN_AGE in login.defs so future accounts inherit the policy.`
          },
          interview: [
            {
              q: 'Explain password expiry, inactivity and account expiry.',
              a: 'Password expiry (lastchg + max) forces a password change. Inactivity is a grace period after password expiry; once it passes, password login is disabled. Account expiry is an absolute date that disables the account entirely regardless of password state.',
              mistake: 'Treating them as the same thing.',
              followUp: 'Which one stops SSH key logins and why?'
            },
            {
              q: 'How do you force a user to change their password at next login?',
              a: '`chage -d 0 user` (or `passwd -e user`), which sets the last-change date to the epoch so the password is considered expired.',
              mistake: 'Deleting and recreating the password.',
              followUp: 'How would you verify the change took effect without logging in as the user?'
            },
            {
              q: 'A user is locked out after three bad passwords. How do you handle it?',
              a: 'Check `faillock --user name` and /var/log/secure for the source of the failures; if they are genuine user mistakes, reset with `faillock --user name --reset`. If they come from unknown hosts, treat it as a possible attack before unlocking.',
              mistake: 'Editing /etc/shadow to unlock.',
              followUp: 'Where are faillock thresholds configured on RHEL 9?'
            }
          ],
          revision: [
            'Shadow aging fields: min, max, warn, inactive, expire - dates in days since epoch.',
            'chage -l to read; -M/-m/-W/-I aging; -E account expiry; -d 0 force change.',
            'login.defs PASS_* only affect newly created accounts.',
            'Lock (!) stops passwords; account expiry stops all PAM logins including SSH keys.',
            'faillock --user X [--reset]; pwquality.conf for complexity; authselect manages PAM on RHEL.'
          ]
        }
      ]
    },
    {
      id: 'L04-M3', title: 'Permissions, ownership and umask',
      summary: 'The rwx model for files and directories, octal and symbolic modes, ownership changes with chown/chgrp, and how umask determines the permissions of new files.',
      lessons: [
        {
          id: 'L04-M3-T1',
          title: 'rwx permissions, octal and symbolic modes, chown and chgrp',
          minutes: 40,
          objectives: [
            'Read a mode string and convert between symbolic and octal notation',
            'Explain how r, w and x differ for files versus directories',
            'Predict access using the owner, group, other evaluation order',
            'Change ownership and group with chown and chgrp, including recursively and safely'
          ],
          prereqs: ['L04-M1-T2'],
          concept: `Every inode stores an **owner UID**, a **group GID** and a **mode**: 12 permission bits plus the file type. \`ls -l\` shows them:

\`\`\`
-rw-r-----. 1 alice finance 4096 Oct  9 09:00 budget.xlsx
drwxr-x---. 2 alice finance   26 Oct  9 09:00 reports
\`\`\`

The first character is the type (\`-\` file, \`d\` directory, \`l\` symlink). Then three triplets: **user (owner)**, **group**, **other**. A trailing \`.\` means the file has an SELinux context and no ACL; \`+\` means it has an ACL.

### Octal notation
r = 4, w = 2, x = 1, summed per triplet: \`rw-r-----\` = 640, \`rwxr-x---\` = 750, \`rwxr-xr-x\` = 755.

### Meaning for files vs directories
- **r** - file: read contents; directory: list entry names (\`ls\`).
- **w** - file: modify contents; directory: create, delete and rename entries (needs x too).
- **x** - file: execute as a program; directory: enter/traverse and access entries by name.

Consequences people get wrong:
- **Deleting a file is a directory operation.** You can delete a read-only file you do not own if you have w+x on the directory (unless the sticky bit is set).
- To reach \`/srv/app/conf/app.yml\` you need **x on every directory in the path**. \`namei -l\` shows them all.
- A shell script needs r *and* x, because the interpreter must read it.

### Evaluation order
The kernel picks **one** class: if your effective UID equals the owner, the **owner** bits apply - even if the group bits are more generous. Otherwise, if any of your groups matches the file group, the **group** bits apply; otherwise **other**. Root (CAP_DAC_OVERRIDE) bypasses read/write checks, but can only execute a file if at least one x bit is set.

### chmod
- Octal: \`chmod 640 file\`.
- Symbolic: \`chmod u+x,g-w,o= file\`; \`a\` = all. \`=\` sets exactly.
- \`X\` (capital) adds execute only to directories and files that are already executable by someone: \`chmod -R u=rwX,g=rX,o= /srv/app\` fixes trees safely without making every data file executable.

### chown and chgrp
- \`chown alice file\`, \`chown alice:finance file\`, \`chown :finance file\` (group only), \`chgrp finance file\`.
- \`-R\` recursive; \`--reference=REF\` copy ownership.
- **Only root can change the owner** (otherwise users could give away files to dodge quotas or plant files). The owner may change the group to any group **they belong to**.
- Changing ownership of an executable clears its setuid/setgid bits - a safety feature.`,
          internals: `\`chmod\` calls \`fchmodat()\`, \`chown\` calls \`fchownat()\`; both update the inode and its ctime. Access checks happen in the kernel at \`open()\`/\`execve()\`/path lookup time (\`generic_permission()\`), comparing the process's fsuid/fsgid and supplementary groups against the inode. After the DAC check, LSMs such as **SELinux** make their own decision, so "the mode bits allow it" is not the end of the story - a denial can still come from SELinux (check \`ausearch -m avc\`). Permission is checked at open: a process that already holds an open file descriptor keeps its access even after you chmod the file.`,
          useCases: [
            'Locking down configuration files that contain secrets to 600 or 640 root:app',
            'Fixing a web root after a deployment left files owned by a developer',
            'Explaining why a user can delete a file they cannot read',
            'Repairing a tree where every file was made executable by chmod -R 755'
          ],
          syntax: 'chmod MODE FILE...        (MODE: 640 | u+x,g-w,o= | a=rX)\nchmod -R u=rwX,g=rX,o= DIR\nchown [-R] USER[:GROUP] FILE...\nchgrp [-R] GROUP FILE...\nstat -c "%A %a %U %G %n" FILE\nnamei -l /path/to/file',
          options: [
            ['chmod -R', 'Recurse into directories'],
            ['chmod X', 'Execute only for directories / already-executable files'],
            ['chown -R user:group', 'Recursively change owner and group'],
            ['chown --reference=REF', 'Copy owner/group from another file'],
            ['chmod -c / -v', 'Report changes made (useful for audits)'],
            ['namei -l PATH', 'Show owner, group and mode of every path component'],
            ['stat -c %a', 'Print octal mode']
          ],
          examples: [
            {
              title: 'Read octal and symbolic modes together',
              cmd: 'stat -c "%A %a %U:%G %n" /etc/ssh/sshd_config /usr/bin/passwd /tmp',
              out: '-rw-------. 600 root:root /etc/ssh/sshd_config\n-rwsr-xr-x. 4755 root:root /usr/bin/passwd\ndrwxrwxrwt. 1777 root:root /tmp',
              fields: [['600', 'Owner read/write only'], ['4755 / s', 'setuid bit plus rwxr-xr-x (covered in M4)'], ['1777 / t', 'Sticky bit on a world-writable directory']]
            },
            {
              title: 'Find the blocking directory in a path',
              cmd: 'namei -l /srv/app/conf/app.yml',
              out: 'f: /srv/app/conf/app.yml\ndr-xr-xr-x root    root    /\ndrwxr-xr-x root    root    srv\ndrwxr-x--- appsvc  appsvc  app\ndrwxr-xr-x appsvc  appsvc  conf\n-rw-r--r-- appsvc  appsvc  app.yml',
              fields: [['drwxr-x--- appsvc appsvc app', 'Others have no x here, so nobody outside appsvc can reach app.yml even though the file itself is world-readable']]
            },
            {
              title: 'Fix a tree without making data executable',
              cmd: 'sudo chown -R web:web /srv/www && sudo chmod -R u=rwX,g=rX,o=rX /srv/www && ls -l /srv/www',
              out: 'drwxr-xr-x. 2 web web  23 Oct  9 10:02 css\n-rw-r--r--. 1 web web 812 Oct  9 10:02 index.html',
              fields: [['drwxr-xr-x', 'Directories got x from X'], ['-rw-r--r--', 'Regular files stayed non-executable']]
            }
          ],
          walkthrough: [
            'Create a test tree: `mkdir -p ~/perm/{a,b} && touch ~/perm/a/f1 ~/perm/b/f2`.',
            'Show modes with `ls -l ~/perm ~/perm/a` and convert each to octal with `stat -c %a`.',
            'Remove x from directory a for yourself: `chmod u-x ~/perm/a` and try `cat ~/perm/a/f1` and `ls ~/perm/a` - note which works.',
            'Restore: `chmod u+x ~/perm/a`. Make f2 read-only (`chmod 444 ~/perm/b/f2`) and delete it with `rm -f` - it succeeds because the directory is writable.',
            'Practise symbolic modes: `chmod u=rw,g=r,o= ~/perm/a/f1` and confirm `640`.',
            'Use sudo to change ownership: `sudo chown root:wheel ~/perm/a/f1`, then try writing to it as yourself.'
          ],
          lab: {
            goal: 'Set up an application directory with correct ownership and modes, and prove access for owner, group and others.',
            steps: [
              'Create a group and two users: `sudo groupadd appteam; sudo useradd -G appteam dev1; sudo useradd outsider`.',
              'Create the tree: `sudo mkdir -p /srv/app/{bin,conf,data}` and `sudo touch /srv/app/conf/app.conf /srv/app/bin/run.sh`.',
              'Set ownership: `sudo chown -R root:appteam /srv/app`.',
              'Set modes: `sudo chmod 750 /srv/app /srv/app/bin /srv/app/conf; sudo chmod 770 /srv/app/data; sudo chmod 640 /srv/app/conf/app.conf; sudo chmod 750 /srv/app/bin/run.sh`.',
              'Test: `sudo -u dev1 cat /srv/app/conf/app.conf` (works), `sudo -u dev1 touch /srv/app/data/x` (works), `sudo -u outsider ls /srv/app` (Permission denied).',
              'Inspect with `namei -l /srv/app/conf/app.conf` and `stat -c "%a %U:%G %n" /srv/app/*`.'
            ],
            verify: 'dev1 can read the config and write in data but cannot write app.conf; outsider is denied at /srv/app; stat shows 750/770/640 as set.'
          },
          troubleshooting: {
            scenario: 'After a deployment, nginx returns 403 for /srv/www/site/index.html although the file is mode 644.',
            steps: [
              'Evidence: `namei -l /srv/www/site/index.html`, `ps -o user= -C nginx`, `tail /var/log/nginx/error.log`, `ls -Z /srv/www/site/index.html`.',
              'Hypothesis: a parent directory lacks x for the nginx user (e.g. /srv/www is 700), or the SELinux type is wrong (not httpd_sys_content_t).',
              'Fix: grant traverse only where needed, e.g. `chmod o+x /srv/www` or group-based access; for SELinux use `semanage fcontext -a -t httpd_sys_content_t "/srv/www(/.*)?"` and `restorecon -Rv /srv/www`. Do not chmod -R 777.',
              'Validate: `sudo -u nginx cat /srv/www/site/index.html` succeeds and `curl -I http://localhost/` returns 200.'
            ]
          },
          mistakes: [
            'Using chmod -R 777 or 755 on a tree - it makes data files executable and world-accessible, and is an audit finding.',
            'Checking only the file mode and ignoring the x bit on parent directories.',
            'Assuming a group member gets group rights even when they own the file - owner bits take precedence.',
            'Forgetting that chown on an executable strips setuid/setgid bits.',
            'Running chown -R across a path that contains symlinks or mount points without checking (-h, -xdev style care).'
          ],
          safety: [
            'Recursive chmod/chown on system paths (/, /etc, /usr, /var) can make a system unbootable or break sudo/ssh - double-check the path and never run them on / by mistake.',
            'Record the current state before mass changes: `getfacl -R -p /srv/app > /root/app-perms.acl` lets you restore with `setfacl --restore`.',
            'RPM-owned files can be reset with `rpm --setperms PKG` and `rpm --setugids PKG` if you damage them.'
          ],
          distro: 'Mode semantics are identical across distributions. RHEL shows a trailing `.` in ls -l for SELinux-labelled files; Ubuntu (AppArmor, no SELinux labels) normally shows none. coreutils behaviour of `chmod X` and `--reference` is the same everywhere.',
          challenge: {
            task: 'User alice owns `/shared/report.txt` with mode `0074` and group `staff`; alice is a member of staff. Can alice read the file? Can bob (member of staff) read it? Can root? Explain, then fix it so alice and staff can read and write and others get nothing.',
            solution: `Mode 0074 = owner \`---\`, group \`rwx\`, other \`r--\`.
- **alice**: she is the owner, so **only the owner bits** apply: no access, even though her group has rwx. \`cat\` fails.
- **bob**: not the owner, member of staff, so group bits apply: read and write allowed.
- **root**: bypasses read/write checks, so it can read.

Fix:
\`\`\`
sudo chmod 660 /shared/report.txt      # or: chmod u=rw,g=rw,o= /shared/report.txt
stat -c "%a %U:%G" /shared/report.txt   # 660 alice:staff
\`\`\`
alice can also run the chmod herself because she owns the file - no root needed.`
          },
          interview: [
            {
              q: 'What do read, write and execute mean on a directory?',
              a: 'r lists entry names, w allows creating, deleting and renaming entries (together with x), and x allows traversing the directory and accessing entries by name. Without x, even a readable directory only shows names; you cannot open or stat its files.',
              mistake: 'Saying x on a directory means you can run the directory.',
              followUp: 'Why can a user delete a file they have no permissions on?'
            },
            {
              q: 'Why can an ordinary user not chown a file to someone else?',
              a: 'Giving away files would let users evade quotas, plant files that appear to belong to others, or create setuid traps. Changing the owner requires CAP_CHOWN (root); owners may only change the group to one they belong to.',
              mistake: 'Saying it is just a configuration default.',
              followUp: 'What happens to setuid bits when ownership changes?'
            },
            {
              q: 'What does chmod -R u=rwX,g=rX,o= do and why is it preferred over chmod -R 750?',
              a: 'Capital X adds execute only to directories and files that are already executable, so directories remain traversable while plain data files stay non-executable. chmod -R 750 would make every file executable.',
              mistake: 'Not knowing the difference between x and X.',
              followUp: 'How would you achieve the same with find?'
            }
          ],
          revision: [
            'r=4 w=2 x=1 per triplet: user, group, other.',
            'Directory: r=list, w=create/delete (with x), x=traverse. Delete is a directory permission.',
            'Exactly one class applies: owner, else group, else other.',
            'Only root changes the owner; owners can chgrp to their own groups.',
            'Use X for recursive fixes; namei -l to find a blocking path component; SELinux can still deny.'
          ]
        },
        {
          id: 'L04-M3-T2',
          title: 'umask and default permissions',
          minutes: 25,
          objectives: [
            'Calculate the permissions of new files and directories from a umask',
            'Explain why umask is a mask (bitwise) rather than a subtraction',
            'Find where umask is set for shells, PAM and systemd services',
            'Set a persistent umask for a user, for all users, and for a service'
          ],
          prereqs: ['L04-M3-T1'],
          concept: `When a program creates a file it asks the kernel for a mode: most programs request **666** for regular files and **777** for directories. The kernel then removes every bit that is set in the process's **umask**:

\`\`\`
final mode = requested mode AND (NOT umask)
\`\`\`

So umask 022 removes write for group and other: files become 644, directories 755.

- **022** - files 644, directories 755 (root, general servers).
- **002** - files 664, directories 775 (users with user private groups, team work).
- **027** - files 640, directories 750 (hardened servers).
- **077** - files 600, directories 700 (private data, secrets).

### Mask, not subtraction
People often teach "666 minus umask", which breaks for odd values. With umask **033**: 666 - 033 = 633 (wrong); the correct answer is 666 AND NOT 033 = **644**, because a bit that was never requested cannot be removed. Execute is never added by umask: regular files do not get x unless the program explicitly asks for it (compilers, \`cp\` of an executable, \`install -m\`).

### Umask belongs to the process
umask is inherited from the parent process. Changing it with \`umask 027\` in a shell affects only that shell and its children. To persist:
- **One user**: add \`umask 027\` to \`~/.bashrc\` (and \`~/.bash_profile\` if login shells do not source it).
- **All users** (shells): a file in \`/etc/profile.d/\`, e.g. \`/etc/profile.d/umask.sh\`.
- **Login defaults**: \`UMASK\` in \`/etc/login.defs\` (applied by \`pam_umask\` where enabled, and used by useradd together with \`HOME_MODE\`).
- **systemd services**: \`UMask=0027\` in the unit or a drop-in (services do not read shell profiles; their default is 0022).

On RHEL, root typically gets 0022 and regular users with a user private group get 0002 (the group bits are relaxed because their group is private). The exact mechanism differs between releases, so always **verify with \`umask\`** rather than assume.

### Display
\`umask\` prints octal (e.g. \`0022\`; the leading digit relates to special bits, which umask never adds). \`umask -S\` prints the *allowed* permissions symbolically: \`u=rwx,g=rx,o=rx\`.`,
          internals: `umask is a field of the task's \`fs_struct\`, read at creation time by \`open(O_CREAT)\`, \`mkdir()\`, \`mknod()\` and similar calls. The \`umask()\` syscall sets it and returns the old value; \`/proc/PID/status\` shows it as \`Umask:\`, which is the easiest way to check a running daemon. One exception: if the parent directory has a **default ACL**, the kernel ignores the umask and uses the default ACL instead (masked by the requested mode). Programs that create sensitive files (ssh-keygen, gpg) request restrictive modes like 0600 themselves, independent of umask.`,
          useCases: [
            'Ensuring application log files are not world-readable by setting UMask=0027 on the service',
            'Letting team members edit each other\'s files in a shared directory with umask 002',
            'Hardening interactive users with umask 027 via /etc/profile.d',
            'Explaining why newly generated reports were readable by everyone'
          ],
          syntax: 'umask            # show (octal)\numask -S         # show symbolic allowed bits\numask 027        # set for this shell\ngrep Umask /proc/PID/status\nsystemctl edit SERVICE   -> [Service] UMask=0027',
          options: [
            ['umask -S', 'Symbolic display of allowed permissions'],
            ['umask 077', 'Private: files 600, directories 700'],
            ['UMASK in /etc/login.defs', 'Default umask for logins and useradd home creation'],
            ['/etc/profile.d/*.sh', 'Shell-wide setting for login shells'],
            ['UMask= (systemd)', 'Service umask; default 0022'],
            ['grep Umask /proc/PID/status', 'Show the umask of a running process']
          ],
          examples: [
            {
              title: 'See umask effects directly',
              cmd: 'umask 027; touch f; mkdir d; ls -ld f d',
              out: '-rw-r-----. 1 alice alice 0 Oct  9 11:00 f\ndrwxr-x---. 2 alice alice 6 Oct  9 11:00 d',
              fields: [['-rw-r-----', '666 & ~027 = 640'], ['drwxr-x---', '777 & ~027 = 750']]
            },
            {
              title: 'Odd umask values',
              cmd: 'umask 033; touch g; stat -c %a g',
              out: '644',
              fields: [['644', 'Not 633: umask only clears bits that were requested; 666 has no x bits to remove']]
            },
            {
              title: 'Check a running service',
              cmd: 'grep Umask /proc/$(systemctl show -p MainPID --value app.service)/status',
              out: 'Umask:\t0022',
              fields: [['0022', 'systemd default UMask for services; the unit does not override it']],
              note: 'Some daemons call umask() themselves, so always read the live value from /proc rather than assuming.'
            }
          ],
          walkthrough: [
            'Run `umask` and `umask -S` and note your current value.',
            'In a subshell try several values: `(umask 077; touch a; mkdir da; ls -ld a da)`.',
            'Show the parent shell is unchanged: `umask` again.',
            'Check how logins set it: `grep -E "^UMASK|^HOME_MODE|^USERGROUPS_ENAB" /etc/login.defs` and `grep -n umask /etc/profile /etc/bashrc`.',
            'Read the umask of your shell from the kernel: `grep Umask /proc/$$/status`.'
          ],
          lab: {
            goal: 'Configure persistent umask values for a user, for all login shells, and for a systemd service, and verify each.',
            steps: [
              'For one user: `echo "umask 027" >> ~/.bashrc`; open a new shell and run `umask` (expect 0027).',
              'System-wide for shells: `echo "umask 027" | sudo tee /etc/profile.d/zz-umask.sh`; log in again as another user and run `umask`.',
              'Create a test service: `sudo systemd-run --unit=umasktest --property=UMask=0077 /bin/sh -c "touch /tmp/umasktest.out; sleep 60"`.',
              'Verify: `stat -c %a /tmp/umasktest.out` (expect 600) and `grep Umask /proc/$(systemctl show -p MainPID --value umasktest)/status`.',
              'Clean up: `sudo systemctl stop umasktest; sudo rm /etc/profile.d/zz-umask.sh /tmp/umasktest.out`; remove the line from ~/.bashrc.'
            ],
            verify: 'New shells report 0027 while the profile.d file exists; the transient service creates a 600 file and its /proc status shows Umask 0077.'
          },
          troubleshooting: {
            scenario: 'Files written by a Java application service are created 644, but policy requires 640. The admin set umask 027 in /etc/profile.d and restarted the service, with no effect.',
            steps: [
              'Evidence: `grep Umask /proc/$(systemctl show -p MainPID --value app)/status`, `systemctl cat app`.',
              'Hypothesis: systemd services do not read shell profile scripts; the service still runs with the default UMask 0022.',
              'Fix: `sudo systemctl edit app` and add `[Service]` / `UMask=0027`, then `sudo systemctl restart app`. Existing files must be fixed separately with chmod.',
              'Validate: /proc status shows Umask 0027 and newly created files are 640.'
            ]
          },
          mistakes: [
            'Computing modes by subtraction (666 - 033 = 633) instead of masking.',
            'Expecting umask to add execute permission to new files.',
            'Setting umask in /etc/profile.d and expecting systemd services or cron jobs to inherit it.',
            'Assuming umask changes existing files - it only affects files created afterwards.',
            'Forgetting that a default ACL on the parent directory overrides the umask.'
          ],
          safety: [
            'A too-strict system-wide umask (077) can break shared directories and package-installed software that expects 022; test on one host first.',
            'Use a dedicated file in /etc/profile.d rather than editing /etc/profile or /etc/bashrc, which package updates may replace (.rpmnew).',
            'Changing a service umask needs a restart - schedule it in a maintenance window for critical services.'
          ],
          distro: 'Debian/Ubuntu set the default through pam_umask and UMASK in /etc/login.defs (typically 022). RHEL sets values through login.defs and the shell startup files, commonly giving 0002 to users with a user private group and 0022 to root; check with `umask` on your release (RHEL 8, 9 and 10 differ in where it is configured). systemd UMask= works identically everywhere.',
          challenge: {
            task: 'Without running any command, give the resulting modes for a new file and a new directory under umask 0026 and umask 0037. Then explain how you would make every file a backup service writes mode 600.',
            solution: `Mask each bit (requested AND NOT umask):
- umask 026: file 666 & ~026 = **640**; directory 777 & ~026 = **751**.
- umask 037: file 666 & ~037 = **640**; directory 777 & ~037 = **740**.

For the service, set the umask where the service starts - not in a shell profile:
\`\`\`
sudo systemctl edit backup.service
# [Service]
# UMask=0077
sudo systemctl restart backup.service
grep Umask /proc/$(systemctl show -p MainPID --value backup.service)/status
\`\`\`
New files will be 600 and directories 700. Existing files need a one-off \`chmod\`.`
          },
          interview: [
            {
              q: 'With umask 027, what permissions do new files and directories get?',
              a: 'Files 640 (rw-r-----) and directories 750 (rwxr-x---), because the umask clears group write and all other permissions from the requested 666/777.',
              mistake: 'Answering 750 for files.',
              followUp: 'What do you get with umask 033 and why is subtraction wrong?'
            },
            {
              q: 'How do you set the umask for a systemd service?',
              a: 'With the UMask= directive in a drop-in created by systemctl edit, then restart. Services do not read /etc/profile or ~/.bashrc.',
              mistake: 'Putting umask in /etc/bashrc.',
              followUp: 'How can you confirm the umask of the running process?'
            },
            {
              q: 'Can umask give a file execute permission?',
              a: 'No. umask only removes bits from the mode the program requests. Execute appears only if the program asks for it, e.g. a compiler or cp of an executable.',
              mistake: 'Saying umask 000 makes files 777.',
              followUp: 'What overrides umask in a directory with a default ACL?'
            }
          ],
          revision: [
            'Final mode = requested (666 file / 777 dir) AND NOT umask.',
            '022 -> 644/755; 002 -> 664/775; 027 -> 640/750; 077 -> 600/700.',
            'umask is per process and inherited; it never changes existing files.',
            'Persist via ~/.bashrc, /etc/profile.d, login.defs UMASK, or systemd UMask=.',
            'Check a daemon with grep Umask /proc/PID/status.'
          ]
        }
      ]
    }
  ]
};
