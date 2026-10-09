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
    },
    {
      id: 'L04-M4', title: 'Special permission bits and ACLs',
      summary: 'The setuid, setgid and sticky bits, how they build safe shared group directories, and how POSIX ACLs (including default ACLs and the mask) grant access beyond one owner and one group.',
      lessons: [
        {
          id: 'L04-M4-T1',
          title: 'setuid, setgid and the sticky bit',
          minutes: 35,
          objectives: [
            'Explain what setuid and setgid do on executables and what setgid does on directories',
            'Explain how the sticky bit restricts deletion in world-writable directories',
            'Set and clear special bits with symbolic and octal chmod and read them in ls -l output',
            'Build a shared group directory with setgid and the sticky bit'
          ],
          prereqs: ['L04-M3-T1', 'L04-M3-T2'],
          concept: `The nine rwx bits are not the whole mode. There are three more **special bits**, written as a leading octal digit: **setuid = 4**, **setgid = 2**, **sticky = 1**. \`chmod 2770 dir\` means "setgid + rwxrwx---".

### setuid on executables (4xxx)
Normally a process runs with the UID of the user who started it. When an executable has the setuid bit, the kernel sets the process's **effective UID** to the file's **owner** at \`execve()\`. That is how an ordinary user can change their password: \`/usr/bin/passwd\` is owned by root and setuid, so it can update \`/etc/shadow\`.

\`\`\`
-rwsr-xr-x. 1 root root 32648 /usr/bin/passwd
\`\`\`

The \`s\` in the owner execute position means setuid **and** execute. A capital \`S\` means setuid is set but execute is not - almost always a mistake. Linux ignores setuid on interpreted scripts (\`#!\` files) and on filesystems mounted \`nosuid\`.

Every setuid-root binary is attack surface: a bug in it can become root access. Treat the list of such files as something to audit (M5).

### setgid (2xxx)
- On an **executable**: the process's effective GID becomes the file's group (used by a few tools such as \`write\` with group \`tty\`).
- On a **directory**: new files and subdirectories created inside get the **directory's group** instead of the creator's primary group, and new subdirectories inherit the setgid bit too. This is the foundation of **shared group directories**.

### Sticky bit (1xxx) on directories
In a directory anyone can write to, any user could delete anyone else's files, because deletion needs write permission on the *directory*, not the file. With the sticky bit, a file can be deleted or renamed only by the **file owner**, the **directory owner**, or root. \`/tmp\` is \`drwxrwxrwt\` (1777). A \`t\` means sticky + others execute; \`T\` means sticky without others execute.

### The shared group directory recipe
\`\`\`
groupadd finance
mkdir /srv/finance
chgrp finance /srv/finance
chmod 2770 /srv/finance     # setgid: files get group finance
# optionally 3770: also stop members deleting each other's files
\`\`\`
setgid fixes the *group* of new files; it does not fix their *mode*. Members still need a umask of 002 (or a default ACL, next lesson) so the group write bit is set on what they create.`,
          internals: `The bits live in the inode's \`i_mode\` field next to the file type and rwx bits (\`S_ISUID\` 04000, \`S_ISGID\` 02000, \`S_ISVTX\` 01000). During \`execve()\` the kernel checks S_ISUID/S_ISGID and the mount's \`nosuid\` flag, then sets the effective and saved UID/GID in the new \`struct cred\`; the real UID stays the caller's, so the program can tell who invoked it. For directories, \`inode_init_owner()\` copies the parent's GID (and S_ISGID for subdirectories) when the parent has S_ISGID. The sticky check is in \`may_delete()\`: if the directory has S_ISVTX, the caller must own the file or the directory, or hold CAP_FOWNER.

As a protection, the kernel clears setuid (and setgid when group-executable) when an unprivileged process writes to the file or when its owner changes via \`chown\`.`,
          useCases: [
            'Creating a project directory where every new file belongs to the team group',
            'Protecting a world-writable upload or scratch directory so users cannot delete each other\'s files',
            'Explaining to an auditor why passwd, sudo and su must be setuid root',
            'Investigating an unexpected setuid file found during a security scan'
          ],
          syntax: 'chmod u+s FILE | chmod u-s FILE\nchmod g+s DIR  | chmod g-s DIR\nchmod +t DIR   | chmod -t DIR\nchmod 4755 FILE | chmod 2770 DIR | chmod 1777 DIR\nstat -c "%a %A %U:%G %n" PATH',
          options: [
            ['u+s / 4xxx', 'setuid - run executable with the file owner\'s effective UID'],
            ['g+s / 2xxx', 'setgid - executable runs with file group; directory passes its group to new files'],
            ['+t / 1xxx', 'sticky - only file owner, directory owner or root may delete/rename entries'],
            ['stat -c %a', 'Show the full octal mode including the special-bit digit'],
            ['chmod 00770 DIR', 'GNU chmod: a fifth leading zero is needed to clear setgid on a directory with a numeric mode'],
            ['mount -o nosuid', 'Filesystem option that makes the kernel ignore setuid/setgid bits']
          ],
          examples: [
            {
              title: 'Read special bits in ls -l',
              cmd: 'ls -ld /usr/bin/passwd /tmp /srv/finance',
              out: '-rwsr-xr-x. 1 root root    32648 Feb 15 09:12 /usr/bin/passwd\ndrwxrwxrwt. 18 root root    4096 Oct  9 10:02 /tmp\ndrwxrws---. 2 root finance   6 Oct  9 10:05 /srv/finance',
              fields: [
                ['rws (owner)', 'setuid + owner execute on passwd'],
                ['rwt (others)', 'sticky + others execute on /tmp'],
                ['rws (group)', 'setgid + group execute on /srv/finance'],
                ['root finance', 'Directory group that new files will inherit']
              ]
            },
            {
              title: 'Prove setgid inheritance',
              cmd: 'touch /srv/finance/q3.xlsx; ls -l /srv/finance',
              out: '-rw-rw-r--. 1 alice finance 0 Oct  9 10:07 q3.xlsx',
              fields: [
                ['alice', 'Owner is still the creator'],
                ['finance', 'Group comes from the directory, not alice\'s primary group'],
                ['rw-rw-r--', 'Group write came from alice\'s umask 002, not from setgid']
              ],
              note: 'If the file shows group alice, the directory lacks setgid or the file was moved in with mv (mv keeps the original group).'
            },
            {
              title: 'Spot a misconfigured capital S',
              cmd: 'stat -c "%a %A %n" /opt/tool/runme',
              out: '4644 -rwSr--r-- /opt/tool/runme',
              fields: [['S', 'setuid set but owner execute missing - the bit is useless and indicates a mistake']]
            }
          ],
          walkthrough: [
            'Run `ls -l /usr/bin/passwd /usr/bin/su /usr/bin/sudo` and identify the `s` in each.',
            'Run `ls -ld /tmp /var/tmp` and explain the trailing `t`.',
            'Create a group and directory: `sudo groupadd demo; sudo mkdir /srv/demo; sudo chgrp demo /srv/demo; sudo chmod 2770 /srv/demo`.',
            'Add yourself (`sudo usermod -aG demo $USER`), start a new login shell, and create a file; check its group.',
            'Add the sticky bit with `sudo chmod +t /srv/demo` and confirm `stat -c %a /srv/demo` prints 3770.',
            'Clean up the demo group and directory when finished.'
          ],
          lab: {
            goal: 'Build a team directory where files are owned by the team group and members cannot delete each other\'s files.',
            steps: [
              'Create the group and users: `sudo groupadd projx; sudo useradd -G projx dev1; sudo useradd -G projx dev2`.',
              'Create the directory: `sudo mkdir -p /srv/projx && sudo chown root:projx /srv/projx && sudo chmod 3770 /srv/projx`.',
              'As dev1 create a file: `sudo -u dev1 bash -c "umask 002; echo v1 > /srv/projx/plan.txt"`.',
              'Check ownership: `ls -l /srv/projx` - group must be projx and mode rw-rw-r--.',
              'As dev2 append to the file: `sudo -u dev2 bash -c "echo v2 >> /srv/projx/plan.txt"` (succeeds through group write).',
              'As dev2 try to delete it: `sudo -u dev2 rm /srv/projx/plan.txt` - expect "Operation not permitted" because of the sticky bit.'
            ],
            verify: '`stat -c "%a %G" /srv/projx` prints `3770 projx`; plan.txt has group projx; dev2 can write but not delete dev1\'s file.'
          },
          troubleshooting: {
            scenario: 'Team members report that files created in /srv/shared belong to their personal groups, so colleagues get "Permission denied" opening them.',
            steps: [
              'Evidence: `ls -ld /srv/shared` (look for s in the group execute slot), `ls -l` of recent files, and the users\' `umask`.',
              'Hypothesis: setgid is missing (someone ran `chmod -R 770` with symbolic g-s, or recreated the directory), or files were moved in with mv, which preserves their group.',
              'Fix: `sudo chmod g+s /srv/shared`, then correct existing content with `sudo chgrp -R team /srv/shared` and `sudo find /srv/shared -type d -exec chmod g+s {} +`.',
              'Validate: a new file created by a member shows group team; a colleague can open it.'
            ]
          },
          mistakes: [
            'Expecting setgid to make files group-writable - it only sets the group; the mode still comes from umask or a default ACL.',
            'Setting setuid on a shell script - Linux ignores it, and adding it to a binary copy of a shell would be a root backdoor.',
            'Using `chmod 0770 dir` and believing setgid was cleared - GNU chmod preserves directory setuid/setgid unless you use `g-s` or a five-digit mode like 00770.',
            'Using chmod 777 on a shared directory instead of a group plus setgid and sticky bits.',
            'Assuming mv into a setgid directory changes the file\'s group - only newly created files inherit it.'
          ],
          safety: [
            'Never add setuid to a binary without a security review; a setuid-root program with a bug is a root exploit.',
            'Recursive chmod on a tree can strip or add special bits everywhere - preview with `find` first and keep `getfacl -R`/`stat` output as a rollback record.',
            'Mount untrusted or removable filesystems with nosuid,nodev to neutralise setuid files on them.'
          ],
          distro: 'Behaviour is identical on RHEL and Debian/Ubuntu; it is kernel and coreutils behaviour. RHEL adds an SELinux label to every file (the trailing `.` in ls -l), which is checked in addition to mode bits. The GNU chmod rule about preserving directory setgid with numeric modes applies on all current distributions.',
          challenge: {
            task: 'A directory /srv/drop must let members of group uploaders create files that all belong to group uploaders, let everyone in the group read them, and prevent any member from deleting someone else\'s upload. Others get no access. Give the commands and the octal mode, and explain each bit.',
            solution: `\`\`\`
sudo mkdir -p /srv/drop
sudo chown root:uploaders /srv/drop
sudo chmod 3770 /srv/drop
stat -c "%a %A %G" /srv/drop    # 3770 drwxrws--T uploaders
\`\`\`
- **2** (setgid): new files take group uploaders.
- **1** (sticky): only the file owner, directory owner (root) or root can delete or rename entries.
- **770**: owner and group get rwx (create needs w+x on the directory); others nothing, which is why ls shows \`T\` (sticky without others execute).

Group *read* of each file depends on the creator's umask (022 or 002 both keep group read); a default ACL \`setfacl -d -m g:uploaders:r /srv/drop\` would make it independent of umask.`
          },
          interview: [
            {
              q: 'How can a normal user change their own password if /etc/shadow is root-only?',
              a: '/usr/bin/passwd is setuid root, so the process runs with effective UID 0 and can write shadow; the program itself enforces that a normal user only changes their own entry, using the real UID to know who called it.',
              mistake: 'Saying the user has write permission on /etc/shadow.',
              followUp: 'Why does Linux ignore setuid on shell scripts?'
            },
            {
              q: 'What is the difference between setgid on a file and on a directory?',
              a: 'On an executable it sets the process effective GID to the file group. On a directory it makes new entries inherit the directory group, and new subdirectories inherit setgid, which is used for team directories.',
              mistake: 'Describing only one of the two meanings.',
              followUp: 'Does setgid affect files moved into the directory?'
            },
            {
              q: 'Why does /tmp have the sticky bit?',
              a: 'It is world-writable, and deleting a file needs only write permission on the directory. The sticky bit restricts deletion and rename to the file owner, the directory owner or root.',
              mistake: 'Saying the sticky bit keeps files in memory or prevents modification of file contents.',
              followUp: 'What does a capital T in the mode string mean?'
            }
          ],
          revision: [
            'Special digit: 4 setuid, 2 setgid, 1 sticky - e.g. 4755, 2770, 1777.',
            'Lower-case s/t = special bit + execute; upper-case S/T = special bit without execute.',
            'setuid/setgid on executables change effective UID/GID; ignored on scripts and nosuid mounts.',
            'setgid on a directory = group inheritance; sticky on a directory = only owners delete.',
            'Shared dir recipe: group + chgrp + chmod 2770 (3770 with sticky) + umask 002 or default ACL.'
          ]
        },
        {
          id: 'L04-M4-T2',
          title: 'POSIX ACLs: getfacl, setfacl, default ACLs and the mask',
          minutes: 40,
          objectives: [
            'Read getfacl output, including effective permissions and the mask',
            'Grant and remove access for named users and groups with setfacl',
            'Use default ACLs so new files in a directory inherit access',
            'Explain how chmod interacts with the ACL mask and diagnose "ACL is set but access denied"',
            'Back up and restore ACLs and preserve them when copying'
          ],
          prereqs: ['L04-M4-T1'],
          concept: `Classic permissions describe exactly three classes: owner, one group, everyone else. When a file needs access for **one more user or group**, you either change the group (breaking other access) or loosen "other" (too broad). **POSIX Access Control Lists** add extra entries without touching ownership.

### Entry types
\`\`\`
user::rw-          owner (same as the owner bits)
user:alice:rw-     named user
group::r--         owning group
group:audit:r--    named group
mask::rw-          upper limit for named users, named groups and the owning group
other::---         everyone else
\`\`\`
A file with any named entry shows a **\`+\`** after the mode in \`ls -l\`.

### The mask
The **mask** is the maximum permission that named users, named groups and the owning group can actually use. Effective access = entry AND mask. \`getfacl\` prints \`#effective:\` when the mask cuts an entry down.

Crucially, once an ACL exists, the **group bits shown by \`ls -l\` and changed by \`chmod g=\` are the mask**, not the owning group's entry. So \`chmod 640 file\` after granting \`u:alice:rw\` silently reduces alice to read-only. \`setfacl -m\` recalculates the mask to cover all entries (unless \`-n\` is given).

### Default ACLs
A directory can carry a second list, the **default ACL** (\`default:\` lines, set with \`setfacl -d\`). It is not used for access checks on the directory itself; it is the template copied into every new file and subdirectory created inside. New subdirectories also inherit the default ACL, so it propagates down. When a parent has a default ACL, the **umask is not applied**; the creating program's requested mode (e.g. 666 for files) is ANDed with the inherited entries instead.

Default ACLs affect only **new** objects. For existing content use \`setfacl -R -m\` as well.

### Common commands
\`\`\`
setfacl -m u:alice:rw report.txt        # add/modify
setfacl -m g:audit:rX -R /srv/data       # X = execute only for dirs/already-executable
setfacl -d -m g:team:rwX /srv/team       # default ACL
setfacl -x u:alice report.txt           # remove one entry
setfacl -k /srv/team                     # remove default ACL
setfacl -b report.txt                   # remove all extended entries
\`\`\`

ACLs are still evaluated in order: owner, then named users, then owning and named groups (any matching group grants), then other. SELinux and the mode/ACL check must *both* allow access.`,
          internals: `ACLs are stored as extended attributes: \`system.posix_acl_access\` and, on directories, \`system.posix_acl_default\`. XFS (the RHEL default) and ext4 support them out of the box; ext4 mounts with \`acl\` by default. When an ACL exists, the inode's group mode bits are kept in sync with the ACL mask, which is why \`chmod\` and \`ls\` operate on the mask.

At \`open()\`/\`access()\` time, \`posix_acl_permission()\` walks the entries: owner match uses user:: directly; named user and group matches are ANDed with the mask; other uses other::. On create, \`posix_acl_create()\` copies the parent default ACL into the new inode and ANDs it with the requested mode, skipping the umask.

Tools must explicitly preserve xattrs: \`cp -a\` and \`cp --preserve=mode\` keep ACLs, \`tar\` needs \`--acls\`, \`rsync\` needs \`-A\`.`,
          useCases: [
            'Giving an auditor read access to application logs without adding them to the application group',
            'Letting two teams share a directory where each needs different rights',
            'Ensuring every file created in a project directory is writable by the team regardless of individual umasks',
            'Granting a service account access to one path without changing ownership managed by a package'
          ],
          syntax: 'getfacl [-R] PATH\nsetfacl -m u:USER:PERMS PATH\nsetfacl -m g:GROUP:PERMS PATH\nsetfacl -d -m g:GROUP:PERMS DIR\nsetfacl -x u:USER PATH\nsetfacl -k DIR | setfacl -b PATH\ngetfacl -R DIR > acl.bak ; setfacl --restore=acl.bak',
          options: [
            ['-m', 'Modify or add entries'],
            ['-x', 'Remove specific entries'],
            ['-d', 'Apply the operation to the default ACL'],
            ['-R', 'Recurse into directories'],
            ['-b / -k', 'Remove all extended entries / remove the default ACL only'],
            ['-n', 'Do not recalculate the mask'],
            ['X (capital)', 'Execute only on directories or files that are already executable'],
            ['--restore=FILE', 'Restore ACLs saved with getfacl -R']
          ],
          examples: [
            {
              title: 'Read an ACL with a restrictive mask',
              cmd: 'getfacl /srv/reports/q3.csv',
              out: 'getfacl: Removing leading \'/\' from absolute path names\n# file: srv/reports/q3.csv\n# owner: root\n# group: finance\nuser::rw-\nuser:alice:rw-\t\t#effective:r--\ngroup::r--\nmask::r--\nother::---',
              fields: [
                ['user:alice:rw-', 'Named user entry grants read and write'],
                ['#effective:r--', 'Mask limits alice to read'],
                ['mask::r--', 'Usually the result of a later chmod 640 or setfacl -n'],
                ['other::---', 'No access for anyone else']
              ],
              note: 'Fix with `setfacl -m m::rw /srv/reports/q3.csv` or re-run `setfacl -m u:alice:rw` which recalculates the mask.'
            },
            {
              title: 'Default ACL on a team directory',
              cmd: 'sudo setfacl -m g:web:rwX /srv/site; sudo setfacl -d -m g:web:rwX /srv/site; getfacl -p /srv/site',
              out: '# file: /srv/site\n# owner: root\n# group: root\n# flags: -s-\nuser::rwx\ngroup::r-x\ngroup:web:rwx\nmask::rwx\nother::r-x\ndefault:user::rwx\ndefault:group::r-x\ndefault:group:web:rwx\ndefault:mask::rwx\ndefault:other::r-x',
              fields: [
                ['# flags: -s-', 'setgid is set on the directory'],
                ['group:web:rwx', 'Access entry - applies to the directory itself'],
                ['default:group:web:rwx', 'Template copied to new files and subdirectories'],
                ['default:mask::rwx', 'Mask that new objects will start with']
              ]
            },
            {
              title: 'Spot an ACL from ls',
              cmd: 'ls -l /var/log/app.log',
              out: '-rw-r-----+ 1 app app 81234 Oct  9 10:11 /var/log/app.log',
              fields: [['+', 'An extended ACL exists; group bits r-- shown here are the mask']]
            }
          ],
          walkthrough: [
            'Create a test file and run `getfacl` on it; note there is no mask without named entries.',
            'Grant a user: `setfacl -m u:nobody:r file`, then `ls -l` to see the `+`.',
            'Run `chmod 600 file` and `getfacl file` - observe `#effective:---` for the named user.',
            'Add a default ACL to a directory with `setfacl -d -m g:wheel:rwX dir` and create a file inside; run getfacl on the new file.',
            'Back up ACLs: `getfacl -R dir > /tmp/acl.bak`, remove them with `setfacl -R -b dir`, restore with `setfacl --restore=/tmp/acl.bak` from the same working directory.',
            'Copy the file with `cp` and with `cp -a` and compare the ACLs of the copies.'
          ],
          lab: {
            goal: 'Grant an auditor read-only access to an application log directory, including future files, without changing ownership.',
            steps: [
              'Prepare: `sudo useradd auditor; sudo mkdir -p /srv/applogs; sudo touch /srv/applogs/app.log; sudo chmod 750 /srv/applogs; sudo chmod 640 /srv/applogs/app.log`.',
              'Grant existing content: `sudo setfacl -R -m u:auditor:rX /srv/applogs`.',
              'Grant future content: `sudo setfacl -d -m u:auditor:rX /srv/applogs`.',
              'Create a new file as root: `sudo touch /srv/applogs/new.log` and run `getfacl /srv/applogs/new.log`.',
              'Test: `sudo -u auditor cat /srv/applogs/app.log` succeeds; `sudo -u auditor touch /srv/applogs/x` fails.',
              'Save a backup: `cd / && sudo getfacl -R srv/applogs > /root/applogs.acl`.'
            ],
            verify: 'getfacl on both files shows `user:auditor:r--` with no `#effective` reduction; auditor can read but not create files; /root/applogs.acl exists.'
          },
          troubleshooting: {
            scenario: 'A named-user ACL u:deploy:rwx exists on /opt/app/releases, yet deploy gets "Permission denied" creating files there.',
            steps: [
              'Evidence: `getfacl /opt/app/releases` - look for `#effective:` and the mask; `namei -l /opt/app/releases` to check execute on every parent; `ls -Zd` and `ausearch -m AVC -ts recent` for SELinux.',
              'Hypothesis: a later `chmod 750` set the mask to r-x, limiting deploy to r-x; or a parent directory lacks x for deploy.',
              'Fix: restore the mask with `sudo setfacl -m m::rwx /opt/app/releases` (or re-apply the user entry), and add `u:deploy:x` on any parent missing traverse permission.',
              'Validate: `getfacl` shows no effective reduction and `sudo -u deploy touch /opt/app/releases/test` works; remove the test file.'
            ]
          },
          mistakes: [
            'Running chmod on a file with an ACL and unknowingly shrinking the mask, which revokes named-user access.',
            'Setting only a default ACL and expecting existing files to change - use -R -m for existing content as well.',
            'Using lowercase x recursively, which makes every regular file executable - use capital X.',
            'Copying with plain cp, tar without --acls, or rsync without -A and losing ACLs on the destination.',
            'Forgetting that every parent directory still needs execute (traverse) for the user.'
          ],
          safety: [
            'Back up ACLs before bulk changes: `getfacl -R DIR > backup.acl`; restore with `setfacl --restore=backup.acl` from the same working directory.',
            '`setfacl -R -b` removes all extended entries in a tree and can break applications - preview with `getfacl -R -s` (lists only files with extended ACLs) first.',
            'Changing ACLs on paths owned by packages may be reported by `rpm -V`; document the change in configuration management.'
          ],
          distro: 'The acl package (getfacl/setfacl) is installed by default on RHEL 8/9/10 and on most Debian/Ubuntu installs. XFS and ext4 support ACLs by default on both families. NFSv4 uses a different ACL model (nfs4_getfacl/nfs4_setfacl); POSIX ACL tools may not apply on NFSv4 mounts.',
          challenge: {
            task: 'In /srv/proj (group proj, setgid), team proj needs rw on everything now and in future, group qa needs read-only, and nobody else any access. A developer later runs `chmod 640` on one file and QA complains they still can read but proj members cannot write it. Explain and fix.',
            solution: `Setup:
\`\`\`
sudo chmod 2770 /srv/proj
sudo setfacl -R -m g:proj:rwX,g:qa:rX,o::--- /srv/proj
sudo setfacl -R -d -m g:proj:rwX,g:qa:rX,o::--- /srv/proj
\`\`\`
After \`chmod 640 file\`, the group bits (4 = r--) became the **mask**, so g:proj:rw is effectively r--, while g:qa:r is unaffected. Fix:
\`\`\`
sudo setfacl -m m::rw /srv/proj/file
getfacl /srv/proj/file    # no #effective reductions
\`\`\`
Prevent it by telling users to use setfacl rather than chmod on ACL-managed trees.`
          },
          interview: [
            {
              q: 'What is the ACL mask?',
              a: 'The maximum permissions granted to named users, named groups and the owning group. Effective access is the entry ANDed with the mask. On a file with an ACL, chmod and ls group bits operate on the mask.',
              mistake: 'Confusing it with umask.',
              followUp: 'Which entries are not limited by the mask?'
            },
            {
              q: 'What is a default ACL and when does it apply?',
              a: 'An ACL on a directory that is copied to new files and subdirectories created inside it. It does not change existing files and replaces umask processing for new files.',
              mistake: 'Saying it applies retroactively to existing files.',
              followUp: 'How do you apply the same access to existing files?'
            },
            {
              q: 'How do you migrate a directory tree to another server keeping ACLs?',
              a: 'Use rsync -aAX, or tar --acls --xattrs on both ends, or back up with getfacl -R and restore with setfacl --restore. Verify with getfacl on samples.',
              mistake: 'Using plain scp -r or cp -r.',
              followUp: 'What else does -X preserve and why does it matter on RHEL?'
            }
          ],
          revision: [
            'ls -l shows + when an extended ACL exists.',
            'Effective = named entry AND mask; chmod g= changes the mask.',
            'setfacl -m add, -x remove, -b remove all, -k remove default, -d default, -R recurse.',
            'Default ACLs apply to new objects only and override umask.',
            'Use capital X and preserve ACLs with cp -a, tar --acls, rsync -A.'
          ]
        }
      ]
    },
    {
      id: 'L04-M5', title: 'Privilege management',
      summary: 'Switching identity with su, delegating administration with sudo and sudoers drop-ins, and continuously auditing who holds privilege on a system.',
      lessons: [
        {
          id: 'L04-M5-T1',
          title: 'su, sudo, sudoers, visudo and /etc/sudoers.d',
          minutes: 40,
          objectives: [
            'Contrast su, su - and sudo, including which password each asks for',
            'Read and write sudoers rules, aliases and Defaults safely with visudo',
            'Delegate a narrow set of commands through a drop-in in /etc/sudoers.d',
            'Check what a user may run with sudo -l and validate syntax with visudo -c'
          ],
          prereqs: ['L04-M1-T2', 'L04-M2-T1'],
          concept: `Administration needs root, but logging in as root hides *who* did what and gives every action unlimited power. Linux offers two ways to elevate.

### su - switch user
\`su\` starts a shell as another user (root by default) after you type **that user's** password.
- \`su\` keeps most of your environment (PATH, current directory).
- \`su -\` (or \`su -l\`) starts a **login shell**: clean environment, target user's home, their profile scripts. Prefer it to avoid running root with a user's PATH.
- \`su - oracle -c 'cmd'\` runs one command.

Sharing the root password with a team means no individual accountability and painful rotation.

### sudo - delegated, logged privilege
\`sudo cmd\` runs one command as root (or another user with \`-u\`) after you type **your own** password, if the security policy in \`/etc/sudoers\` allows it. Every use is logged with the caller's name. After a successful authentication, a timestamp lets you skip the password for 5 minutes by default (per terminal); \`sudo -k\` drops it.

Useful forms: \`sudo -i\` (root login shell), \`sudo -u postgres psql\`, \`sudo -l\` (list what I may run), \`sudoedit /etc/file\` (edit as root with your own unprivileged editor).

### sudoers rule syntax
\`\`\`
WHO   WHERE = (AS_USER[:AS_GROUP])  [TAGS:] COMMANDS
%wheel ALL  = (ALL)                        ALL
alice  ALL  = (root) NOPASSWD: /usr/bin/systemctl restart httpd
\`\`\`
- \`%name\` means a group. RHEL ships \`%wheel ALL=(ALL) ALL\`, so adding a user to **wheel** makes them a full administrator.
- Commands must be **full paths**; arguments, if given, must match exactly. A command with no arguments listed allows any arguments; \`""\` allows none.
- Aliases (\`User_Alias\`, \`Cmnd_Alias\`, \`Host_Alias\`, \`Runas_Alias\`, names in CAPITALS) group items. \`Defaults\` lines tune behaviour (e.g. \`Defaults:alice timestamp_timeout=0\`).
- When several rules match, the **last match wins**.

### Edit safely: visudo and drop-ins
A syntax error in sudoers can stop **everyone** using sudo. \`visudo\` locks the file, opens a copy, and refuses to save invalid syntax. \`/etc/sudoers\` on RHEL ends with \`#includedir /etc/sudoers.d\` (the \`#\` is part of the directive, not a comment), so put your rules in separate files:

\`\`\`
sudo visudo -f /etc/sudoers.d/web-ops
sudo visudo -c        # check all sudoers files
\`\`\`
Drop-in files whose names contain a \`.\` or end in \`~\` are **ignored**, and files should be mode 0440 owned by root. Keep one file per purpose so rules can be deployed and removed by configuration management.

### Dangerous delegations
Allowing editors, pagers, interpreters, \`find\`, \`tar\` or \`systemctl edit\` gives a shell escape - effectively full root. Wildcards in arguments (\`/usr/bin/cat /var/log/*\`) can be abused with \`../\`. Delegate exact commands, use \`sudoedit\` for file editing, and prefer wrapper scripts owned by root.`,
          internals: `\`sudo\` is a setuid-root binary. It reads its policy through the sudoers plugin (\`/etc/sudo.conf\` selects plugins), resolves the user's groups through NSS, authenticates through PAM (\`/etc/pam.d/sudo\`), then forks and executes the command with the target credentials, a sanitised environment (\`env_reset\`, \`secure_path\`) and, on RHEL, an SELinux context unchanged unless a role/type is specified. Timestamps are stored under \`/run/sudo/ts/USER\`, keyed by terminal (tty_tickets is the default).

\`su\` is also setuid root; it uses \`/etc/pam.d/su\`. On RHEL you can restrict su to wheel members by enabling the \`pam_wheel.so use_uid\` line in that file.

Each sudo invocation is logged via syslog (authpriv facility, \`/var/log/secure\` on RHEL) and the journal, and generates audit events (USER_CMD) when auditd runs.`,
          useCases: [
            'Letting a web team restart and check httpd without any other root rights',
            'Giving a DBA a shell as the postgres user without knowing its password',
            'Removing shared root passwords and gaining per-person audit trails',
            'Deploying identical sudo policy to hundreds of hosts as a drop-in file'
          ],
          syntax: 'su [-] [USER] [-c CMD]\nsudo [-u USER] CMD\nsudo -i | sudo -s | sudo -l [-U USER] | sudo -k\nsudoedit FILE\nvisudo [-c] [-f FILE]\nUSER HOST=(RUNAS) [NOPASSWD:] /full/path/cmd [args]',
          options: [
            ['su -', 'Login shell as root with a clean environment'],
            ['sudo -i', 'Root login shell through sudo (your password, logged)'],
            ['sudo -l / -l -U alice', 'List allowed commands for yourself / for alice (root)'],
            ['sudo -u USER', 'Run as a user other than root'],
            ['visudo -f FILE', 'Edit a drop-in safely with syntax checking'],
            ['visudo -c', 'Check syntax and permissions of sudoers and all included files'],
            ['NOPASSWD:', 'Tag: skip authentication for the listed commands'],
            ['sudoedit FILE', 'Edit a root-owned file without running the editor as root']
          ],
          examples: [
            {
              title: 'List a user\'s sudo rights',
              cmd: 'sudo -l -U webop',
              out: 'Matching Defaults entries for webop on web01:\n    !visiblepw, always_set_home, match_group_by_gid, always_query_group_plugin, env_reset, secure_path=/sbin\\:/bin\\:/usr/sbin\\:/usr/bin\n\nUser webop may run the following commands on web01:\n    (root) NOPASSWD: /usr/bin/systemctl restart httpd, /usr/bin/systemctl status httpd',
              fields: [
                ['env_reset', 'Environment is cleaned before running the command'],
                ['secure_path=...', 'PATH used for the command, ignoring the caller\'s PATH'],
                ['(root) NOPASSWD:', 'Runs as root without asking for a password'],
                ['/usr/bin/systemctl restart httpd', 'Only this exact command and arguments are allowed']
              ]
            },
            {
              title: 'Create and validate a drop-in',
              cmd: 'sudo visudo -f /etc/sudoers.d/web-ops; sudo visudo -c',
              out: '/etc/sudoers: parsed OK\n/etc/sudoers.d/web-ops: parsed OK',
              fields: [['parsed OK', 'Syntax valid; visudo -c also warns about wrong owner or mode']],
              note: 'Content of the drop-in: `Cmnd_Alias WEB = /usr/bin/systemctl restart httpd, /usr/bin/systemctl status httpd` and `%webops ALL=(root) WEB`.'
            },
            {
              title: 'A denied attempt',
              cmd: 'sudo systemctl stop sshd',
              out: 'Sorry, user webop is not allowed to execute \'/bin/systemctl stop sshd\' as root on web01.',
              fields: [['not allowed to execute', 'The user has sudo rights, but not for this command; the attempt is logged']]
            }
          ],
          walkthrough: [
            'Compare `su` and `su -` by running `pwd; echo $PATH` in each (then exit).',
            'Run `sudo -l` to see your own rights and identify the wheel rule.',
            'Read `/etc/sudoers` with `sudo grep -v "^#" /etc/sudoers | grep -v "^$"` and find the `#includedir` line.',
            'Create a drop-in with `sudo visudo -f /etc/sudoers.d/ops-status` granting `%ops ALL=(root) /usr/bin/systemctl status httpd, /usr/bin/systemctl status sshd` - explicit units, no wildcards.',
            'Run `sudo visudo -c` and `ls -l /etc/sudoers.d`; ensure mode 0440 and owner root.',
            'Test as a member with `sudo -l -U opsuser` before telling the user it is ready.'
          ],
          lab: {
            goal: 'Delegate httpd restart/status to group webops through a validated drop-in, keeping a root session open as a safety net.',
            steps: [
              'Open a second terminal with `sudo -i` and leave it open until the end of the lab.',
              'Create the group and user: `sudo groupadd webops; sudo useradd -G webops webop; sudo passwd webop`.',
              'Write the rule: `sudo visudo -f /etc/sudoers.d/webops` with `%webops ALL=(root) /usr/bin/systemctl restart httpd, /usr/bin/systemctl status httpd`.',
              'Validate: `sudo visudo -c` and `sudo chmod 0440 /etc/sudoers.d/webops`.',
              'Check: `sudo -l -U webop`.',
              'Test as webop: `su - webop -c "sudo systemctl status httpd"` works; `su - webop -c "sudo systemctl stop sshd"` is refused.'
            ],
            verify: '`sudo visudo -c` reports parsed OK for every file; sudo -l -U webop lists only the two commands; the refused attempt appears in `sudo grep webop /var/log/secure`.'
          },
          troubleshooting: {
            scenario: 'After an engineer edited /etc/sudoers with vi, every sudo command fails with ">>> /etc/sudoers: syntax error near line 101 <<<" and "sudo: no valid sudoers sources found, quitting".',
            steps: [
              'Evidence: the error names the file and line; confirm nobody still has a root shell (`who`, existing sessions).',
              'Hypothesis: a typo (missing comma, lower-case alias name, wrong path) broke parsing, so sudo refuses to run at all.',
              'Fix: obtain root another way - an existing root shell, `su -` with the root password, the console, or `pkexec visudo` on hosts with polkit - then run `visudo` to correct the line (visudo shows the error and lets you re-edit).',
              'Validate: `visudo -c` reports parsed OK, `sudo -l` works for an admin, and the change is moved into a drop-in managed by configuration management.'
            ]
          },
          mistakes: [
            'Editing /etc/sudoers with a plain editor - a syntax error disables sudo for everyone; always use visudo.',
            'Naming a drop-in web.conf or web-ops~ - files with a dot or trailing tilde in /etc/sudoers.d are silently ignored.',
            'Granting editors, less, find, tar, python or systemctl edit through sudo - they allow a shell escape to full root.',
            'Assuming `%wheel` rules apply immediately to an existing session - group membership requires a new login.',
            'Using wildcards in command arguments, which can match far more than intended.'
          ],
          safety: [
            'Keep a root shell open while changing sudo or PAM configuration, and test from a second session before closing it.',
            'Validate with `visudo -c` after every change and deploy drop-ins with mode 0440 root:root.',
            'Prefer named groups and exact commands over NOPASSWD: ALL; review NOPASSWD rules regularly.'
          ],
          distro: 'RHEL grants admin rights via group **wheel** (`%wheel ALL=(ALL) ALL`); Debian/Ubuntu use group **sudo** (`%sudo ALL=(ALL:ALL) ALL`). RHEL 9/10 ship sudo 1.9, which also accepts `@includedir` (the legacy `#includedir` still works). On RHEL 9 and later the installer can leave root locked and create an admin user in wheel; root SSH password login is disabled by default (`PermitRootLogin prohibit-password`).',
          challenge: {
            task: 'Group dba must be able to (1) run any command as user postgres, (2) restart postgresql as root, and nothing else as root. Write the drop-in, validate it, and show how a member gets a postgres shell.',
            solution: `\`\`\`
sudo visudo -f /etc/sudoers.d/dba
# content:
Cmnd_Alias PGSVC = /usr/bin/systemctl restart postgresql, /usr/bin/systemctl status postgresql
%dba ALL=(postgres) ALL
%dba ALL=(root) PGSVC

sudo chmod 0440 /etc/sudoers.d/dba
sudo visudo -c
sudo -l -U dbauser
\`\`\`
A member opens a postgres shell with \`sudo -iu postgres\` using their own password - nobody needs the postgres password. The root rule lists exact commands with arguments, so \`systemctl stop sshd\` remains denied. The file name has no dot so it is not ignored.`
          },
          interview: [
            {
              q: 'What is the difference between su and sudo?',
              a: 'su switches to another user and needs that user\'s password; sudo runs commands per a policy and needs the caller\'s own password, logs each command under the caller\'s name, and can be restricted to specific commands.',
              mistake: 'Saying they are the same except for the name.',
              followUp: 'What does su - change compared with su?'
            },
            {
              q: 'Why must you use visudo?',
              a: 'It locks the file and validates syntax before saving. A broken sudoers makes sudo refuse to run, which can lock out all administrators on hosts without a root password.',
              mistake: 'Answering only "because it is the convention".',
              followUp: 'How do you recover if sudoers is already broken?'
            },
            {
              q: 'Why is "alice ALL=(root) /usr/bin/vim" dangerous?',
              a: 'vim can run shell commands (:!bash), so alice gets a root shell. Use sudoedit, which runs the editor as alice on a temporary copy and writes back as root.',
              mistake: 'Thinking only ALL is dangerous.',
              followUp: 'Name other binaries with shell escapes.'
            },
            {
              q: 'A drop-in /etc/sudoers.d/app.conf seems to have no effect. Why?',
              a: 'Files in sudoers.d containing a dot or ending with ~ are skipped. Rename it (e.g. app) and validate with visudo -c.',
              mistake: 'Restarting a sudo service - there is none; sudo reads the policy on every run.',
              followUp: 'What permissions should the file have?'
            }
          ],
          revision: [
            'su needs the target\'s password; sudo needs yours and logs each command.',
            'su - / sudo -i give login shells with clean environments.',
            'Rule: WHO WHERE=(RUNAS) [NOPASSWD:] /full/path [args]; %group; last match wins.',
            'RHEL: wheel = admins; #includedir /etc/sudoers.d; names with . or ~ ignored; mode 0440.',
            'Always visudo / visudo -f / visudo -c; avoid shell-escape commands, use sudoedit.'
          ]
        },
        {
          id: 'L04-M5-T2',
          title: 'Least privilege and auditing privileges',
          minutes: 35,
          objectives: [
            'Inventory setuid/setgid files with find -perm and compare them with the RPM database',
            'Review sudo usage and failures in /var/log/secure, the journal and the audit log',
            'Review privileged group membership and sudo rules for every account',
            'Review account expiry and inactivity to remove stale privilege'
          ],
          prereqs: ['L04-M4-T1', 'L04-M5-T1', 'L04-M2-T2'],
          concept: `**Least privilege** means every account, service and process has only the access its job requires, for only as long as it needs it. Privilege tends to grow: people change roles, contractors leave, someone adds a setuid helper "just for now". A sysadmin's job is to **inventory, review and remove** privilege regularly, with evidence.

### Where privilege hides on a Linux host
1. **UID 0 accounts** - anything other than root is suspicious (M1).
2. **Privileged groups** - \`wheel\` (full sudo on RHEL), plus groups named in sudoers rules.
3. **sudoers rules** - especially \`ALL\`, \`NOPASSWD\`, and commands with shell escapes.
4. **setuid/setgid executables** - run with their owner's or group's identity.
5. **File capabilities** - fine-grained root powers on binaries (\`getcap\`).
6. **Stale accounts** - users who left but whose account, keys or group memberships remain.

### Finding special-bit files
\`find\` has three \`-perm\` forms:
- \`-perm -4000\` - **all** of these bits set (setuid, any other bits).
- \`-perm /6000\` - **any** of these bits (setuid **or** setgid).
- \`-perm 4755\` - **exactly** this mode.

\`\`\`
sudo find / -xdev -type f -perm /6000 -exec ls -l {} + 2>/dev/null
\`\`\`
Then decide for each file: does a package own it (\`rpm -qf FILE\`) and is it unmodified (\`rpm -Vf FILE\`, where \`M\` = mode differs and \`5\` = content differs)? A setuid file that **no package owns**, in a home directory, \`/tmp\` or \`/dev/shm\`, is a red flag. Keep a **baseline** list and compare it after changes.

### Reviewing sudo activity
Every sudo use is logged. On RHEL look in \`/var/log/secure\` and \`journalctl _COMM=sudo\`; with auditd, \`ausearch -m USER_CMD\`. Look for "incorrect password attempts", "user NOT in sudoers", and commands that should not be run.

### Reviewing accounts and expiry
- \`getent group wheel\` - who has full sudo.
- \`sudo -l -U user\` - what a specific user can run.
- \`chage -l user\` - password age, inactivity and **account expiry**; set expiry for contractors with \`chage -E YYYY-MM-DD\` or \`usermod -e\`.
- \`last\` / \`lastlog\` - when accounts last logged in; long-unused privileged accounts should be locked and expired.

Removing privilege is a change: record it, notify owners, and have a rollback.`,
          internals: `\`find -perm\` compares the requested bits with each inode's mode: the \`-\` form tests \`(mode & bits) == bits\`, the \`/\` form tests \`(mode & bits) != 0\`. \`rpm -V\` compares installed files with the size, digest, mode, owner and group recorded in the RPM database and prints a nine-character code (S 5 M D L U G T P) for each difference.

sudo writes its log line through syslog with facility authpriv; rsyslog routes \`authpriv.*\` to \`/var/log/secure\`, and journald stores it with \`_COMM=sudo\`. With auditd, PAM generates USER_AUTH / USER_ACCT events and sudo emits USER_CMD with the command (hex-encoded when it contains spaces; \`ausearch -i\` decodes). Account expiry is the shadow field 8; once passed, PAM's account stage (\`pam_unix\`) rejects logins, including SSH key logins, which is why expiry is a stronger off-boarding control than locking the password.`,
          useCases: [
            'Quarterly access review evidence for an auditor (who is in wheel, who has NOPASSWD)',
            'Detecting a planted setuid shell after a compromise',
            'Automatically expiring contractor accounts at the end of the contract',
            'Investigating who restarted a service at 03:00 using sudo logs'
          ],
          syntax: 'find / -xdev -type f -perm /6000 [-ls]\nfind / -xdev -perm -4000 -user root\nrpm -qf FILE ; rpm -Vf FILE\ngetcap -r / 2>/dev/null\ngrep sudo /var/log/secure ; journalctl _COMM=sudo\nausearch -m USER_CMD -i\nchage -l USER ; chage -E YYYY-MM-DD USER\nlastlog -b 90 ; last USER',
          options: [
            ['-perm -4000', 'Match files with at least the setuid bit'],
            ['-perm /6000', 'Match files with setuid or setgid'],
            ['-xdev', 'Do not descend into other filesystems (skip /proc, NFS...)'],
            ['rpm -Vf FILE', 'Verify a file against the package database (M = mode changed)'],
            ['journalctl _COMM=sudo --since', 'sudo events from the journal'],
            ['chage -E -1 USER', 'Remove the account expiry date'],
            ['lastlog -b 90', 'Accounts whose last login is more than 90 days ago']
          ],
          examples: [
            {
              title: 'Inventory setuid/setgid files and spot an outsider',
              cmd: 'sudo find / -xdev -type f -perm /6000 -printf "%m %u:%g %p\\n" 2>/dev/null | sort -k3',
              out: '4755 root:root /home/jdoe/.cache/.x\n4755 root:root /usr/bin/chage\n4755 root:root /usr/bin/passwd\n4111 root:root /usr/bin/sudo\n2755 root:utmp /usr/libexec/utempter/utempter',
              fields: [
                ['4755 /home/jdoe/.cache/.x', 'setuid-root file in a home directory - not from any package; treat as an incident'],
                ['4111 /usr/bin/sudo', 'Expected setuid binary'],
                ['2755 root:utmp', 'setgid helper owned by a package']
              ],
              note: 'Confirm with `rpm -qf /home/jdoe/.cache/.x` ("not owned by any package") and preserve evidence before removing it.'
            },
            {
              title: 'Read sudo log lines',
              cmd: 'sudo grep sudo /var/log/secure | tail -3',
              out: 'Oct  9 03:02:11 web01 sudo[41233]:   alice : TTY=pts/1 ; PWD=/home/alice ; USER=root ; COMMAND=/usr/bin/systemctl restart httpd\nOct  9 03:05:40 web01 sudo[41301]:     bob : user NOT in sudoers ; TTY=pts/2 ; PWD=/home/bob ; USER=root ; COMMAND=/bin/bash\nOct  9 03:06:02 web01 sudo[41320]:   carol : 3 incorrect password attempts ; TTY=pts/3 ; PWD=/home/carol ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow',
              fields: [
                ['alice : ... COMMAND=', 'Successful command, with caller, terminal, directory and target user'],
                ['user NOT in sudoers', 'bob has no sudo rights at all and tried to get a root shell'],
                ['3 incorrect password attempts', 'Possible password guessing or a forgotten password']
              ]
            },
            {
              title: 'Review an account\'s expiry',
              cmd: 'sudo chage -l contractor1',
              out: 'Last password change\t\t\t\t\t: Jul 01, 2026\nPassword expires\t\t\t\t\t: Sep 29, 2026\nPassword inactive\t\t\t\t\t: Oct 13, 2026\nAccount expires\t\t\t\t\t\t: Dec 31, 2026\nMinimum number of days between password change\t\t: 1\nMaximum number of days between password change\t\t: 90\nNumber of days of warning before password expires\t: 7',
              fields: [
                ['Account expires: Dec 31, 2026', 'After this date all logins are refused'],
                ['Password inactive', 'Date after which an expired password can no longer be changed at login']
              ]
            }
          ],
          walkthrough: [
            'Create a baseline: `sudo find / -xdev -type f -perm /6000 2>/dev/null | sort > /root/suid-baseline.txt`.',
            'For each entry run `rpm -qf` and note any file not owned by a package.',
            'Run `rpm -Va 2>/dev/null | grep "^..M"` to find packaged files whose mode was changed.',
            'List privileged people: `getent group wheel` and `sudo grep -rhv "^#" /etc/sudoers.d`.',
            'Review the last week of sudo use: `sudo journalctl _COMM=sudo --since "-7d" | grep -E "NOT in sudoers|incorrect password|COMMAND"`.',
            'Find dormant accounts: `sudo lastlog -b 90` and check their expiry with `chage -l`.'
          ],
          lab: {
            goal: 'Produce a small privilege-review report and remediate one stale account and one unexpected setuid file safely.',
            steps: [
              'Plant a test finding: `sudo cp /usr/bin/id /tmp/idcopy && sudo chmod 4755 /tmp/idcopy` (lab VM only).',
              'Scan: `sudo find / -xdev -type f -perm -4000 -printf "%p\\n" 2>/dev/null | while read f; do rpm -qf "$f" >/dev/null 2>&1 || echo "UNOWNED $f"; done`.',
              'Remediate the finding: `sudo chmod u-s /tmp/idcopy` then `sudo rm /tmp/idcopy`, recording the action.',
              'Create a test contractor: `sudo useradd -G wheel temp1` and set expiry: `sudo chage -E $(date -d "+30 days" +%F) temp1`.',
              'Remove the unnecessary privilege: `sudo gpasswd -d temp1 wheel` and confirm `getent group wheel`.',
              'Check sudo log evidence: `sudo journalctl _COMM=sudo --since today | tail`.'
            ],
            verify: 'The scan prints UNOWNED /tmp/idcopy before remediation and nothing afterwards; `chage -l temp1` shows an Account expires date; temp1 is no longer listed in `getent group wheel`.'
          },
          troubleshooting: {
            scenario: 'A weekly scan reports a new setuid-root file /usr/local/bin/backup-helper that is not in last week\'s baseline.',
            steps: [
              'Evidence: `ls -l`, `stat`, `rpm -qf` (not owned), `sha256sum`, file type with `file`, and who installed it (`ausearch -f /usr/local/bin/backup-helper -i`, change tickets, /var/log/secure around its ctime).',
              'Hypothesis: either an undocumented admin change for a backup tool, or a persistence mechanism left by an attacker.',
              'Fix: if unexplained, treat as a security incident - preserve a copy and evidence, remove the setuid bit (`chmod u-s`), and escalate; if legitimate, replace it with a sudo rule or a capability-limited service and document it.',
              'Validate: rerun the scan, confirm it matches the approved baseline, and add the check to monitoring.'
            ]
          },
          mistakes: [
            'Mixing up -perm -4000 (at least setuid) and -perm 4000 (exactly 4000, which matches almost nothing).',
            'Scanning without -xdev and spending hours in network filesystems or getting /proc noise.',
            'Only locking the password of a departed user - SSH keys may still work; expire the account (chage -E 0 or a past date) and remove keys and group memberships.',
            'Deleting a suspicious file immediately and destroying forensic evidence.',
            'Reviewing wheel membership but ignoring rules for other groups in /etc/sudoers.d.'
          ],
          safety: [
            'Do not strip setuid from packaged binaries (passwd, sudo, su) - it breaks password changes and administration; verify with rpm before changing anything.',
            'Removing someone\'s privilege can stop production work; confirm with the account owner or manager and record the change and rollback (re-adding the group).',
            'Treat unexplained setuid files and UID 0 accounts as potential incidents: preserve evidence before remediation.'
          ],
          distro: 'On Debian/Ubuntu use `dpkg -S FILE` instead of `rpm -qf` and `debsums` or `dpkg --verify` instead of `rpm -V`; auth logs go to /var/log/auth.log and the admin group is sudo. RHEL 9 uses /var/log/secure via rsyslog plus the journal. Newer distributions are moving from `lastlog` to `lastlog2`; check which your release ships. File capabilities (getcap) are increasingly used instead of setuid on RHEL 9/10.',
          challenge: {
            task: 'Write a one-screen review that prints: (1) setuid/setgid files not owned by any RPM, (2) members of wheel, (3) every sudoers rule containing NOPASSWD, (4) accounts with UID >= 1000 that have no account expiry set. Explain how you would act on each section.',
            solution: `\`\`\`
echo "== Unowned setuid/setgid"; sudo find / -xdev -type f -perm /6000 2>/dev/null | while read f; do rpm -qf "$f" >/dev/null 2>&1 || echo "$f"; done
echo "== wheel"; getent group wheel
echo "== NOPASSWD"; sudo grep -rn NOPASSWD /etc/sudoers /etc/sudoers.d
echo "== No expiry"; sudo awk -F: '$8=="" {print $1}' /etc/shadow | while read u; do id -u "$u" 2>/dev/null | awk -v u="$u" '$1>=1000 && $1<60000 {print u}'; done
\`\`\`
Actions: (1) unowned special-bit files are investigated as possible compromise, evidence preserved, then removed or replaced by a sudo rule; (2) each wheel member is confirmed with their manager, others removed with \`gpasswd -d\`; (3) NOPASSWD rules are justified (automation accounts) or removed; (4) contractors and temporary accounts receive \`chage -E\` dates. Each change is ticketed with rollback.`
          },
          interview: [
            {
              q: 'How do you find all setuid files on a server and decide which are legitimate?',
              a: 'find / -xdev -type f -perm -4000 (or /6000 to include setgid), then rpm -qf to see if a package owns each file and rpm -Vf to see if it was modified, comparing with a baseline. Unowned or modified files are investigated.',
              mistake: 'Stopping at the find output without verifying ownership.',
              followUp: 'What is the difference between -perm -4000 and -perm /6000?'
            },
            {
              q: 'An employee left yesterday. What do you do with their Linux account?',
              a: 'Expire the account (chage -E 0 or usermod -e with a past date) so all PAM logins including SSH keys fail, lock the password, remove privileged group memberships and sudo rules, remove or archive authorized_keys, check for their cron jobs and running processes, then delete or archive per retention policy.',
              mistake: 'Only running passwd -l.',
              followUp: 'Where would you check if they used sudo recently?'
            },
            {
              q: 'Where are sudo events logged on RHEL?',
              a: 'Through syslog authpriv to /var/log/secure, in the journal (journalctl _COMM=sudo), and as USER_CMD audit records if auditd is running.',
              mistake: 'Saying ~/.bash_history.',
              followUp: 'How would you send these logs off-host for tamper resistance?'
            }
          ],
          revision: [
            'Least privilege: inventory, justify, remove, and repeat regularly.',
            'find -perm -4000 = at least setuid; -perm /6000 = setuid or setgid; use -xdev.',
            'rpm -qf / rpm -Vf separate packaged binaries from planted or modified ones.',
            'sudo logs: /var/log/secure, journalctl _COMM=sudo, ausearch -m USER_CMD.',
            'Off-boarding: expire the account (chage -E), not just lock the password; review wheel and sudoers.d.'
          ]
        }
      ]
    }
  ]
};
