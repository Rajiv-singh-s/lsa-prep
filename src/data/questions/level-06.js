// Level 6 MCQ bank: Package Management (RPM, DNF, repositories, Flatpak, APT/dpkg, troubleshooting)
export default {
  'L06-M1-T1': [
    {
      d: 'b', t: 'concept',
      q: "On a RHEL 9 host you download `bash-5.1.8-9.el9.x86_64.rpm`. In NEVRA terms, which part of the file name is the release?",
      o: ["5.1.8", "9.el9", "x86_64", "bash-5.1.8"],
      a: [1],
      e: "NEVRA is Name-Epoch:Version-Release.Arch. Here the name is bash, the upstream version is 5.1.8, the release is 9.el9 (the packager's build number plus the dist tag) and the architecture is x86_64.",
      w: ["5.1.8 is the upstream version, not the release.", "", "x86_64 is the architecture field.", "bash-5.1.8 is the name plus version; it does not include the release."],
      c: 'NEVRA', s: 'Decode an RPM file name', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: "Which command tells you which installed package delivered the file `/etc/chrony.conf`?",
      o: ["rpm -ql /etc/chrony.conf", "rpm -qc chrony.conf", "rpm -qf /etc/chrony.conf", "rpm -qp /etc/chrony.conf"],
      a: [2],
      e: "`rpm -qf PATH` looks the path up in the rpmdb and prints the owning package (chrony-...). It maps a file to its package.",
      w: ["-l lists the files of a package name; given a path it searches for a package literally named /etc/chrony.conf.", "-c lists config files of a package, and chrony.conf is not a package name.", "", "-p reads an uninstalled .rpm file; /etc/chrony.conf is not a package file."],
      c: 'rpm -qf', s: 'Map a file to its owning package', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'output',
      q: "You run `rpm -q nginx` and get:\n`package nginx is not installed`\nWhat does this tell you?",
      o: ["No package named nginx is recorded in the rpmdb on this host", "nginx is installed but its service is stopped", "The nginx package is not available in any enabled repository", "The rpm database is corrupted and must be rebuilt"],
      a: [0],
      e: "`rpm -q` only queries the local rpmdb. The message means no installed package with that name exists; it says nothing about repositories or services.",
      w: ["", "rpm does not know about service state; a stopped service would still show the installed NEVRA.", "rpm -q does not consult repositories; use `dnf list nginx` or `dnf info nginx` for availability.", "A missing package is normal output, not a sign of rpmdb corruption."],
      c: 'rpm -q', s: 'Interpret rpm query results'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "A security scanner flags `/usr/local/bin/backup.sh`. You run `rpm -qf /usr/local/bin/backup.sh` and see:\n`file /usr/local/bin/backup.sh is not owned by any package`\nWhat is the best next step?",
      o: ["Run `rpm --rebuilddb`, because the file must be missing from a damaged rpmdb", "Delete the file immediately, since unpackaged executables are always malicious", "Reinstall bash so the script is re-registered in the rpmdb", "Establish provenance with `stat`, configuration-management history and audit/journal logs around its mtime, then package or document it"],
      a: [3],
      e: "The file was placed outside RPM (manually or by config management). Evidence-first: check timestamps, ownership and change records before deciding whether to package it, document it or remove it.",
      w: ["Unowned files are normal for /usr/local; rebuilding the rpmdb will not create ownership.", "Deleting without evidence can break a legitimate backup job and destroys forensic evidence.", "bash never owned this script; reinstalling it changes nothing.", ""],
      c: 'rpm -qf', s: 'Investigate unpackaged files'
    },
    {
      d: 'i', t: 'command',
      q: "Before installing a vendor's `vendor-agent-3.1-2.x86_64.rpm`, you want to read the scripts it will run as root during install and removal. Which command does that?",
      o: ["rpm -q --scripts vendor-agent-3.1-2.x86_64.rpm", "rpm -qp --scripts ./vendor-agent-3.1-2.x86_64.rpm", "rpm -V ./vendor-agent-3.1-2.x86_64.rpm", "dnf history info vendor-agent"],
      a: [1],
      e: "`-p` makes rpm read the package file instead of the rpmdb, and `--scripts` prints the %pre/%post/%preun/%postun scriptlets so you can review them before installing.",
      w: ["Without -p, rpm searches the rpmdb for an installed package named after the file and reports it is not installed.", "", "rpm -V verifies files of an installed package; it does not print scriptlets of a file.", "dnf history shows past transactions, not the content of an uninstalled package."],
      c: 'rpm -qp --scripts', s: 'Review scriptlets before install'
    },
    {
      d: 'i', t: 'command',
      q: "Select all that apply: which commands print file paths that the installed package `chrony` placed on the system?",
      o: ["rpm -qc chrony", "rpm -qi chrony", "rpm -qd chrony", "rpm -qR chrony", "rpm -ql chrony"],
      a: [0, 2, 4],
      e: "`-ql` lists every file, `-qc` only the %config files and `-qd` only the documentation files. All three print paths owned by the package.",
      w: ["", "-qi prints the package header (version, vendor, summary), not file paths.", "", "-qR prints required capabilities (libraries, packages), not installed files.", ""],
      c: 'rpm -ql / -qc / -qd', s: 'List files installed by a package', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "After a maintenance window you run `rpm -qa --last | head -2`:\n`kernel-core-5.14.0-427.13.1.el9_4.x86_64   Tue 14 May 2024 02:11:09 AM UTC`\n`openssl-libs-3.0.7-27.el9.x86_64           Tue 14 May 2024 02:10:41 AM UTC`\nWhat does this output show?",
      o: ["The two oldest packages on the system", "Packages with pending updates in the repositories", "The two most recently installed or updated packages, newest first, with install time", "Packages that failed verification during the window"],
      a: [2],
      e: "`--last` sorts the installed packages by install time, newest first. It is a quick way to see what changed during a patch window.",
      w: ["--last puts the newest first, not the oldest.", "rpm does not query repositories; use `dnf check-update` for pending updates.", "", "Verification results come from `rpm -V`, not from `--last`."],
      c: 'rpm -qa --last', s: 'Review recent package changes'
    },
    {
      d: 'a', t: 'rca',
      q: "A scanner reports that a RHEL 9 server is vulnerable to an OpenSSL CVE \"fixed upstream in 3.0.8\". `rpm -q openssl` returns `openssl-3.0.7-27.el9.x86_64`. What is the most accurate assessment?",
      o: ["The scanner may be judging by upstream version only; Red Hat backports fixes into the same version with a new release, so check `rpm -q --changelog openssl | grep CVE-...` or the errata", "The host is definitely vulnerable because 3.0.7 is older than 3.0.8", "Rebuild OpenSSL 3.0.8 from upstream source and install it over the RPM", "The release field 27.el9 is cosmetic and cannot indicate security fixes"],
      a: [0],
      e: "RHEL keeps the upstream version stable and backports security fixes, incrementing the release. The changelog and the errata (`dnf updateinfo`) show whether the CVE is fixed in the installed release.",
      w: ["", "Version comparison alone ignores backports; this is a classic false positive.", "Replacing a vendor library with an unpackaged build breaks support, updates and dependent packages.", "The release changes with each rebuild and is exactly where backported fixes show up."],
      c: 'rpm -q --changelog', s: 'Assess backported security fixes'
    },
    {
      d: 'a', t: 'distro',
      q: "On a RHEL 10 server, a backup script still copies `/var/lib/rpm` to protect the rpm database. Where does the rpmdb live on RHEL 10, and how should the script determine it?",
      o: ["Always /var/lib/rpm in Berkeley DB format, on every RHEL release", "/var/cache/dnf, determined from dnf.conf cachedir", "/etc/rpm/db, determined by reading /etc/rpm/macros", "Under /usr/lib/sysimage/rpm (a compatibility path is kept); query it with `rpm --eval '%_dbpath'`"],
      a: [3],
      e: "RHEL 10 relocates the rpmdb to /usr/lib/sysimage/rpm. RHEL 9 uses SQLite in /var/lib/rpm and RHEL 8 Berkeley DB. `rpm --eval '%_dbpath'` returns the real path on any release.",
      w: ["Berkeley DB was RHEL 8; RHEL 9 uses SQLite and RHEL 10 moves the location.", "/var/cache/dnf holds repository metadata and downloaded packages, not the rpmdb.", "/etc/rpm holds macros, not the database.", ""],
      c: "rpm --eval '%_dbpath'", s: 'Locate the rpmdb across releases', env: 'RHEL 10 (RHEL 9: SQLite in /var/lib/rpm; RHEL 8: Berkeley DB)'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "In the directory holding a downloaded package you run `rpm -qi vendor-agent-3.1-2.x86_64.rpm` and get `package vendor-agent-3.1-2.x86_64.rpm is not installed`. The file exists. Why?",
      o: ["The package signature is invalid, so rpm refuses to read it", "The file is not an RPM because its name lacks a dist tag", "Without `-p`, rpm searches the rpmdb for an installed package with that literal name; use `rpm -qip ./vendor-agent-3.1-2.x86_64.rpm`", "rpm cannot read packages from the current directory without an absolute path"],
      a: [2],
      e: "Query mode defaults to the rpmdb. The `-p` selector tells rpm the argument is a package file to read, so `rpm -qip FILE` shows its header.",
      w: ["A bad signature produces a signature warning or error, not \"is not installed\".", "Dist tags are optional; this is not how rpm detects package files.", "", "Relative paths work fine with -p."],
      c: 'rpm -qp', s: 'Query an uninstalled package file'
    }
  ],
  'L06-M1-T2': [
    {
      d: 'b', t: 'output',
      q: "`rpm -V openssh-server` prints:\n`S.5....T.  c /etc/ssh/sshd_config`\nWhat does this line mean?",
      o: ["The sshd binary was replaced and must be reinstalled", "The config file's size, digest and modification time differ from the package, which is expected after an admin edits it", "The file is missing from disk", "The file's owner and group were changed"],
      a: [1],
      e: "S = size, 5 = digest, T = mtime differ; `c` marks a %config file. Edited configuration files are normal; investigation focuses on changed binaries and libraries.",
      w: ["The path is the config file, not the binary.", "", "A missing file is reported as `missing`, not with flags.", "Owner and group changes show as U and G, which are dots here."],
      c: 'rpm -V', s: 'Interpret rpm -V flags', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: "Which command checks the digests and GPG signature of a downloaded package file before you install it?",
      o: ["rpm -K ./pkg.rpm", "rpm -V ./pkg.rpm", "rpm --import ./pkg.rpm", "rpm -qa gpg-pubkey*"],
      a: [0],
      e: "`rpm -K` (alias `--checksig`) verifies the package file's digests and signature against the keys imported in the rpmdb.",
      w: ["", "rpm -V verifies the files of an installed package, not a package file.", "--import imports a public key, not a package.", "That lists the imported keys; it does not check any package."],
      c: 'rpm -K', s: 'Check a package signature'
    },
    {
      d: 'b', t: 'concept',
      q: "After importing a vendor key with `rpm --import`, how does the key appear in the rpm database?",
      o: ["As a file in /etc/yum.repos.d", "It is stored only in root's ~/.gnupg keyring", "As a line in /etc/dnf/dnf.conf", "As a gpg-pubkey-KEYID-DATE pseudo-package listed by `rpm -qa gpg-pubkey*`"],
      a: [3],
      e: "rpm stores imported public keys as gpg-pubkey pseudo-packages; `rpm -qi gpg-pubkey-...` shows the key's owner and details.",
      w: ["Repo files reference keys via gpgkey=, they do not store imported keys.", "rpm has its own keyring in the rpmdb and does not use the user's GnuPG keyring.", "dnf.conf holds options, not keys.", ""],
      c: 'rpm -qa gpg-pubkey*', s: 'Inspect imported signing keys'
    },
    {
      d: 'i', t: 'output',
      q: "After a junior admin ran `chmod -R 755 /usr/bin`, normal users can no longer use `passwd`. `rpm -Vf /usr/bin/passwd` prints:\n`.M.......    /usr/bin/passwd`\nWhat is the correct interpretation and fix?",
      o: ["The digest changed; the binary was tampered with and the host must be rebuilt", "The file is a %config file and the change is expected", "The mode changed (setuid bit lost); restore it with `rpm --setperms passwd` or `dnf reinstall passwd`", "The mtime changed; run `touch /usr/bin/passwd`"],
      a: [2],
      e: "M = mode differs. The recursive chmod removed the setuid bit; `rpm --setperms` resets modes to the values recorded in the rpmdb.",
      w: ["The digest flag (5) is a dot; content is unchanged.", "There is no `c` marker, and a changed mode on a setuid binary is not expected.", "", "T (mtime) is a dot; the problem is the mode."],
      c: 'rpm --setperms', s: 'Repair permission drift', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "Select all that apply: `rpm -Va` on a production server returns these lines. Which ones warrant investigation as possible tampering?",
      o: ["`S.5....T.  c /etc/httpd/conf/httpd.conf`", "`S.5....T.    /usr/sbin/sshd`", "`..5......    /usr/lib64/libpam.so.0.85.1`", "`.......T.  c /etc/chrony.conf`"],
      a: [1, 2],
      e: "Changed digests on non-config binaries and libraries (sshd, libpam) are not expected and need investigation. Lines marked `c` are configuration files that admins routinely edit.",
      w: ["A changed %config file (c) is normal after configuration.", "", "", "A config file with only an mtime change is expected."],
      c: 'rpm -Va', s: 'Separate config drift from tampering'
    },
    {
      d: 'i', t: 'remediation',
      q: "A vendor's install guide says: \"If you see signature errors, set gpgcheck=0 in the repo file.\" Installing their package fails with a NOKEY error. What is the safe remediation?",
      o: ["Obtain the vendor's public key, verify its fingerprint through an independent channel, import it with `rpm --import` (or gpgkey= in the repo) and confirm with `rpm -K`", "Follow the guide and set gpgcheck=0 permanently", "Install with `rpm -ivh --nosignature`", "Set gpgcheck=0 globally in /etc/dnf/dnf.conf so the change survives repo file updates"],
      a: [0],
      e: "NOKEY means the signing key is not trusted yet. Importing a key whose fingerprint was verified out of band keeps the supply-chain control while making the install work.",
      w: ["", "This disables the signature check and lets any tampered package install silently.", "--nosignature skips the same control for this install; it is a debugging option, not a fix.", "A global gpgcheck=0 removes the protection for every repository."],
      c: 'rpm --import', s: 'Trust a vendor key safely'
    },
    {
      d: 'i', t: 'output',
      q: "`rpm -Kv ./zabbix-agent2-7.0.4-release1.el9.x86_64.rpm` prints (excerpt):\n`Header V4 RSA/SHA512 Signature, key ID 08b40d20: NOKEY`\n`Header SHA256 digest: OK`\n`Payload SHA256 digest: OK`\nWhat is the most likely situation?",
      o: ["The file was corrupted during download", "The package is unsigned", "The package is signed for a different architecture", "The file is intact, but the public key 08b40d20 has not been imported into the rpmdb"],
      a: [3],
      e: "Digests are OK, so the content is intact. NOKEY means the signature exists but rpm lacks the matching public key; verify the vendor key's fingerprint and import it.",
      w: ["Corruption would make the digests fail.", "An unsigned package shows no signature line rather than NOKEY.", "Signatures are not architecture-specific.", ""],
      c: 'rpm -K', s: 'Read signature check output'
    },
    {
      d: 'a', t: 'remediation',
      q: "After the recursive `chmod -R 755 /usr/bin` incident, sudo, passwd and several other setuid tools are broken. What is the most complete and lowest-risk way to restore correct modes?",
      o: ["Run `chmod u+s` on sudo and passwd only", "Use `rpm -Va` to find files with an M flag under /usr/bin, map them to packages with `rpm -qf`, then run `rpm --setperms` on each package and re-verify", "rsync /usr/bin from another server with the same release", "Run `dnf reinstall '*'` to reinstall every package"],
      a: [1],
      e: "The rpmdb records the correct mode for every packaged file. Finding all affected packages and resetting them with --setperms fixes every setuid/setgid binary without replacing content, and `rpm -Va` proves the result.",
      w: ["Fixing only two binaries leaves other setuid/setgid tools (e.g. su, newgrp, crontab) broken.", "", "Copying binaries between hosts risks version mismatches and overwrites content that is not damaged.", "Reinstalling everything is slow, risky and needs every package to be available in repos."],
      c: 'rpm --setperms', s: 'Restore package permissions at scale'
    },
    {
      d: 'a', t: 'distro',
      q: "A legacy internal package installed fine on RHEL 8 but on RHEL 9 is rejected with a signature error, although the same key is imported. The package was signed with a SHA-1 based signature. What is the right fix?",
      o: ["Have the package re-signed with a SHA-256 (or stronger) signature, because RHEL 9 crypto policies reject SHA-1 signatures by default", "Run `update-crypto-policies --set LEGACY` permanently on all RHEL 9 hosts", "Install it with `--nosignature` on RHEL 9 only", "Re-import the same key with `rpm --import --force`"],
      a: [0],
      e: "RHEL 9 default crypto policies no longer trust SHA-1 signatures. The sustainable fix is to re-sign the package with a modern digest, not to weaken the whole system's policy.",
      w: ["", "Switching to LEGACY lowers crypto for every application on the host to accept one package.", "Skipping signature checks removes the supply-chain control.", "The key is already present; the problem is the signature algorithm."],
      c: 'rpm -K', s: 'Handle SHA-1 signature rejection', env: 'RHEL 9/10 (RHEL 8 accepted SHA-1 signatures)'
    },
    {
      d: 'a', t: 'security',
      q: "A hardened server has `/etc/myapp/secrets.conf` (a %config file of package myapp) set to mode 0600, while the package ships it as 0644. A colleague wants to run `rpm --setperms myapp` to fix a different file. What is the risk?",
      o: ["--setperms resets every file in the package to the rpmdb modes, so the hardened 0600 secret file becomes 0644 again", "--setperms deletes modified config files", "There is no risk; --setperms only touches files with an M flag that are binaries", "--setperms also changes file contents back to package defaults"],
      a: [0],
      e: "`rpm --setperms` applies the packaged mode to all files in the package, including intentionally hardened ones. Check `rpm -V` output first and reapply hardening (or fix only the specific file) afterwards.",
      w: ["", "It changes modes only; it never deletes files.", "It does not distinguish binaries from config files or check M flags.", "Contents are untouched; use `dnf reinstall` to restore non-config file contents."],
      c: 'rpm --setperms', s: 'Assess side effects of permission resets'
    }
  ],
  'L06-M2-T1': [
    {
      d: 'b', t: 'command',
      q: "A runbook needs the `semanage` command, which is not installed on a RHEL 9 host. Which command finds the package that provides it?",
      o: ["dnf search semanage", "dnf info semanage", "dnf provides semanage", "rpm -qf semanage"],
      a: [2],
      e: "`dnf provides` searches repository metadata for packages that provide a file or capability; it reports policycoreutils-python-utils for semanage.",
      w: ["search matches package names and summaries, not the files inside packages.", "info needs a package name; semanage is a command, not a package.", "", "rpm -qf only works on files that already exist on disk from installed packages."],
      c: 'dnf provides', s: 'Find the package that provides a command', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: "On RHEL 8, 9 and 10, what is `yum`?",
      o: ["An alias (symlink) for dnf, so yum commands run DNF", "The original Python 2 yum, kept alongside dnf", "A separate tool used only for package groups", "A deprecated tool that fails with an error"],
      a: [0],
      e: "From RHEL 8 onward, `yum` is provided as a compatibility alias for dnf. The original Python 2 yum was RHEL 7 and earlier.",
      w: ["", "The Python 2 yum was removed with RHEL 8.", "Groups are handled by dnf itself (`dnf group ...`).", "yum still works because it simply invokes dnf."],
      c: 'yum / dnf', s: 'Relate yum and dnf', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: "You copied `vendor-agent-3.1-2.el9.x86_64.rpm` to a RHEL 9 server. It depends on packages from AppStream. Which command installs it and resolves those dependencies?",
      o: ["rpm -ivh vendor-agent-3.1-2.el9.x86_64.rpm", "rpm -ivh --nodeps vendor-agent-3.1-2.el9.x86_64.rpm", "dnf download ./vendor-agent-3.1-2.el9.x86_64.rpm", "dnf install ./vendor-agent-3.1-2.el9.x86_64.rpm"],
      a: [3],
      e: "`dnf install ./file.rpm` treats the local file as part of the transaction and pulls its dependencies from enabled repositories, with signature checks and history.",
      w: ["rpm does not resolve dependencies; it fails listing the missing ones.", "--nodeps installs a package whose dependencies are missing, leaving it broken.", "dnf download fetches packages from repositories; it does not install a local file.", ""],
      c: 'dnf install ./file.rpm', s: 'Install a local RPM with dependencies', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "You preview a cleanup with `sudo dnf remove --assumeno python3-libs`. The output includes:\n`Removing dependent packages:`\n` dnf  firewalld  python3-dnf  tuned ...`\n`Operation aborted.`\nWhat should you conclude?",
      o: ["The removal failed because python3-libs is protected", "Confirming this removal would also uninstall dnf, firewalld and other critical packages, so it must not proceed", "Only python3-libs would be removed; the dependent list is informational", "dnf could not resolve dependencies and needs --allowerasing"],
      a: [1],
      e: "`--assumeno` shows the full transaction and answers no. The \"Removing dependent packages\" list is what would actually be removed, which here includes the package manager itself.",
      w: ["\"Operation aborted\" is the result of --assumeno, not of a protection rule.", "", "Dependent packages are removed together with the requested one.", "The transaction was resolved successfully; it was simply declined."],
      c: 'dnf remove --assumeno', s: 'Preview removals safely'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "An old runbook says `yum install mysql`. On RHEL 9 it fails with `No match for argument: mysql`. What is the best first diagnostic step?",
      o: ["Run `dnf repolist` to confirm AppStream is enabled and `dnf search mysql` / `dnf provides` to find the current package name", "Download the MySQL RPM from a random mirror and install it with rpm -ivh", "Run `rpm --rebuilddb`", "Set skip_if_unavailable=True in dnf.conf and retry"],
      a: [0],
      e: "\"No match\" means no enabled repo offers that name. Check that the right repositories (AppStream) are enabled and look up the correct package name before changing anything.",
      w: ["", "Untrusted downloads bypass repository trust and dependency resolution.", "The rpmdb is not involved in finding available packages.", "skip_if_unavailable deals with unreachable repos, not missing package names."],
      c: 'dnf search / dnf repolist', s: 'Diagnose missing packages'
    },
    {
      d: 'i', t: 'command',
      q: "Select all that apply: you must find out what removing `openssl-libs` would affect on a RHEL 9 server WITHOUT changing the system. Which commands are appropriate?",
      o: ["sudo dnf remove --assumeno openssl-libs", "sudo dnf autoremove -y", "dnf repoquery --installed --whatrequires openssl-libs", "sudo dnf remove -y openssl-libs", "sudo dnf reinstall openssl-libs"],
      a: [0, 2],
      e: "`--assumeno` prints the transaction and declines it, and `repoquery --installed --whatrequires` lists installed packages depending on it. Both are read-only.",
      w: ["", "autoremove -y removes packages immediately.", "", "remove -y performs the removal.", "reinstall changes files on disk and is not a preview."],
      c: 'dnf repoquery --whatrequires', s: 'Assess removal impact read-only'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "A developer runs `dnf search libcrypto.so.3` to find which package ships that library and gets `No matches found`. Why, and what should they run instead?",
      o: ["The library does not exist on RHEL 9", "dnf search requires root privileges", "dnf search only matches names and summaries; use `dnf provides '*/libcrypto.so.3'` (or the capability `libcrypto.so.3()(64bit)`)", "The metadata cache is stale; run `dnf clean all` first"],
      a: [2],
      e: "Searching for a file or capability is the job of `dnf provides`, which consults file lists and provides in repo metadata.",
      w: ["openssl-libs provides libcrypto.so.3 on RHEL 9.", "Searching works as a normal user.", "", "A stale cache would not explain zero matches for a file name that search never indexes."],
      c: 'dnf provides', s: 'Choose search vs provides'
    },
    {
      d: 'a', t: 'rca',
      q: "After a junior admin ran `dnf autoremove -y` on a production server, a cron job using Python `requests` fails with ImportError. `dnf history info last` shows python3-requests was removed. What is the root cause?",
      o: ["autoremove deletes every package not updated in the last 30 days", "python3-requests was corrupted and dnf removed it", "The cron job ran as the wrong user", "python3-requests had been installed only as a dependency of a package removed earlier, so autoremove saw it as unneeded; the script's need was never recorded"],
      a: [3],
      e: "autoremove removes packages installed as dependencies that nothing installed still requires. Mark packages your scripts need as user-installed (`dnf mark install python3-requests`) and review autoremove output before confirming.",
      w: ["autoremove is based on install reason and dependencies, not age.", "dnf does not remove packages for corruption.", "History shows the package was removed, so the user is not the cause.", ""],
      c: 'dnf autoremove', s: 'Explain autoremove side effects'
    },
    {
      d: 'a', t: 'log',
      q: "During `dnf install vendor-tool`, dnf downloads all packages, then prints `Error: GPG check FAILED`. In which stage did the failure occur, and what state is the system in?",
      o: ["During dependency solving; some packages may be half-installed", "During the rpm transaction; the rpmdb must be rebuilt", "During signature verification after download and before the rpm transaction, so no installed packages were changed", "During metadata download; the repo is unreachable"],
      a: [2],
      e: "dnf's pipeline is metadata, solver, download, signature check, rpm transaction, history. The GPG check happens before rpm modifies anything, so the system is unchanged.",
      w: ["The solver already succeeded because packages were downloaded.", "No transaction ran, so the rpmdb is untouched.", "", "Metadata was fetched successfully, otherwise nothing would download."],
      c: 'dnf transaction pipeline', s: 'Locate failures in the dnf pipeline'
    },
    {
      d: 'a', t: 'remediation',
      q: "You must patch 200 RHEL 9 hosts in a 30-minute window during which the repository mirror will be overloaded. Which approach reduces the risk?",
      o: ["Run `dnf upgrade -y --nogpgcheck` in the window to save time", "Pre-stage packages the day before with `dnf upgrade --downloadonly`, then run `dnf upgrade` in the window from the cache", "Copy /var/lib/rpm from an already patched host", "Use `rpm -Uvh --nodeps` with packages copied over scp"],
      a: [1],
      e: "--downloadonly resolves the transaction and caches the packages ahead of time; during the window dnf installs from cache, still checking signatures and dependencies.",
      w: ["Skipping signature checks saves almost no time and removes a security control.", "", "Copying the rpmdb makes it disagree with the files on disk.", "--nodeps bypasses dependency resolution and can break the system."],
      c: 'dnf --downloadonly', s: 'Pre-stage updates for a change window'
    }
  ],
  'L06-M2-T2': [
    {
      d: 'b', t: 'config',
      q: "In a `.repo` file, which line makes dnf verify package signatures for that repository?",
      o: ["enabled=1", "sslverify=1", "gpgcheck=1", "metadata_expire=1"],
      a: [2],
      e: "`gpgcheck=1` tells dnf to check each package's GPG signature against the key(s) referenced by `gpgkey=`.",
      w: ["enabled controls whether the repo is used, not signature checks.", "sslverify checks the TLS certificate of the server, not package signatures.", "", "metadata_expire controls cache lifetime."],
      c: 'gpgcheck', s: 'Configure repository trust', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: "Which command lists both enabled and disabled repositories?",
      o: ["dnf repolist", "dnf repolist --all", "dnf list repos", "dnf repoinfo --enabled"],
      a: [1],
      e: "`dnf repolist` shows enabled repositories only; `--all` adds the disabled ones.",
      w: ["Without --all only enabled repos are shown.", "", "`dnf list` lists packages, not repositories.", "--enabled limits output to enabled repos."],
      c: 'dnf repolist --all', s: 'List repositories', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: "Why should you never hand-edit `/etc/yum.repos.d/redhat.repo` on a subscribed RHEL host?",
      o: ["It is a binary file", "dnf ignores it", "Editing it voids the subscription", "subscription-manager regenerates it, so manual changes are overwritten; use `subscription-manager repos --enable/--disable`"],
      a: [3],
      e: "redhat.repo is generated from the system's entitlements. The supported way to change which Red Hat repos are enabled is `subscription-manager repos`.",
      w: ["It is a normal text .repo file.", "dnf reads it like any other repo file.", "Edits do not affect the subscription; they are simply lost.", ""],
      c: 'subscription-manager repos', s: 'Manage Red Hat repositories'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "After creating a local repo from a mounted RHEL 9 ISO, `dnf install tree` fails with:\n`Curl error (37): Couldn't read a file:// file for file:///mnt/iso/repodata/repomd.xml`\nThe ISO is mounted on /mnt/iso. What is wrong?",
      o: ["baseurl points to the ISO root; RHEL 8+ media keeps repodata in /mnt/iso/BaseOS and /mnt/iso/AppStream, so define one repo for each", "The ISO must be copied to local disk; dnf cannot read mounted media", "gpgcheck must be disabled for local repositories", "file:// URLs are not supported; use http://"],
      a: [0],
      e: "The URL shows dnf looked for /mnt/iso/repodata. On RHEL 8+ media the repositories live in the BaseOS and AppStream subdirectories, each with its own repodata.",
      w: ["", "dnf reads mounted media fine with file:// URLs.", "Signature checking has nothing to do with a missing repomd.xml.", "file:// is a valid baseurl scheme."],
      c: 'baseurl', s: 'Fix local ISO repository paths', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'config',
      q: "This repo file exists on an offline RHEL 9 host:\n`[local-baseos]`\n`name=Local BaseOS`\n`baseurl=file:///mnt/iso/BaseOS`\n`enabled=1`\n`gpgcheck=1`\n`gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release`\nInstalls of httpd fail with \"No match for argument\". What must be added?",
      o: ["`gpgcheck=0` so local packages can be used", "A `mirrorlist=` line pointing at the ISO", "A second section, e.g. `[local-appstream]`, with `baseurl=file:///mnt/iso/AppStream` and the same gpg settings", "`priority=1` so BaseOS wins over other repos"],
      a: [2],
      e: "httpd ships in AppStream. A local ISO repository setup needs two repo definitions: BaseOS and AppStream.",
      w: ["The failure is a missing repository, not a signature problem.", "mirrorlist is for lists of remote mirrors and would not add AppStream.", "", "Priority does not help when the package is in a repo that is not defined at all."],
      c: '.repo file', s: 'Configure BaseOS and AppStream locally', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'command',
      q: "Select all that apply: which commands PERSISTENTLY enable the CodeReady Builder repository?",
      o: ["dnf --enablerepo=crb install ninja-build", "sudo dnf config-manager --set-enabled crb   (Rocky/Alma)", "sudo dnf repolist --enable crb", "sudo subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms   (RHEL)", "echo enabled=1 >> /etc/yum.repos.d/redhat.repo"],
      a: [1, 3],
      e: "On community rebuilds `dnf config-manager --set-enabled` writes enabled=1 to the .repo file; on subscribed RHEL, subscription-manager manages redhat.repo.",
      w: ["--enablerepo affects only that single command.", "", "repolist has no option to enable repositories.", "", "Appending to redhat.repo is overwritten and does not even target a section."],
      c: 'dnf config-manager --set-enabled', s: 'Enable repositories persistently'
    },
    {
      d: 'i', t: 'config',
      q: "A vendor repo has `priority=10`; AppStream has the default priority. Both provide `nodejs`, and AppStream's build is newer. What does `dnf install nodejs` install?",
      o: ["The AppStream build, because dnf always picks the highest version", "dnf fails with a conflict between repositories", "Whichever repo is listed first alphabetically", "The vendor build, because a lower priority number wins and dnf only considers the higher-priority repo for that package"],
      a: [3],
      e: "Repo priority (default 99) is evaluated before version: packages from the repo with the lowest priority number are preferred, even if another repo has a newer version.",
      w: ["Version comparison happens only among repos of equal priority.", "dnf resolves this deterministically via priority.", "Alphabetical order does not affect package selection.", ""],
      c: 'priority', s: 'Predict repository priority behaviour'
    },
    {
      d: 'a', t: 'distro',
      q: "A runbook written for RHEL 8 says `dnf module enable nodejs:20 && dnf install nodejs`. On RHEL 10 the module command fails. Why?",
      o: ["The AppStream repo is disabled by default on RHEL 10", "RHEL 10 removed modularity; alternative versions ship as separately named packages, so install the versioned package directly", "Module streams must be enabled with subscription-manager on RHEL 10", "nodejs is only available as a Flatpak on RHEL 10"],
      a: [1],
      e: "Module streams exist on RHEL 8 and 9. RHEL 10 dropped modularity; check `dnf list --available 'nodejs*'` for the versioned packages.",
      w: ["AppStream is enabled by default on RHEL 10.", "", "subscription-manager manages repositories, not module streams.", "nodejs is still delivered as RPMs."],
      c: 'dnf module', s: 'Handle modularity removal', env: 'RHEL 10 (dnf module exists on RHEL 8/9)'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "You add a vendor repository from a bare URL with `dnf config-manager --add-repo https://repo.vendor.example/el9/`. The install then fails because the package signature cannot be checked. What is the correct fix?",
      o: ["Add `gpgkey=` pointing at the vendor's key (after verifying its fingerprint) to the generated .repo file, keep gpgcheck=1, and retry", "Add gpgcheck=0 to the generated file", "Run the install with --nogpgcheck once and leave the repo as is", "Delete the repo and install the vendor RPMs with rpm -ivh --nosignature"],
      a: [0],
      e: "A .repo file generated from a bare URL contains only name/baseurl/enabled. dnf still enforces gpgcheck from dnf.conf, so it needs a trusted key; supply a verified gpgkey instead of disabling the check.",
      w: ["", "Disabling gpgcheck removes the supply-chain control for every future package from that repo.", "--nogpgcheck skips verification for this install and leaves the root cause unfixed.", "Bypassing both dnf and signatures is the least safe option."],
      c: 'dnf config-manager --add-repo', s: 'Complete generated repo files safely'
    },
    {
      d: 'a', t: 'config',
      q: "An offline server mounts installation media from the virtual DVD drive via /etc/fstab for its local repo. After the media was detached, the server booted into emergency mode. Which fstab line avoids this while keeping the repo working when media is present?",
      o: ["`/dev/sr0  /mnt/iso  iso9660  defaults  0 0`", "`/dev/sr0  /mnt/iso  iso9660  rw  0 2`", "`/dev/sr0  /mnt/iso  iso9660  ro,nofail  0 0`", "`/dev/sr0  /mnt/iso  xfs  ro  0 0`"],
      a: [2],
      e: "`nofail` lets boot continue if the device is missing, and `ro` matches read-only media. The repo still works whenever the media is attached and mounted.",
      w: ["Without nofail a missing device fails local-fs.target and drops to emergency mode.", "Optical media is read-only and fsck pass 2 is meaningless for iso9660; it still lacks nofail.", "", "The filesystem type of installation media is iso9660, not xfs, and nofail is still missing."],
      c: '/etc/fstab nofail', s: 'Mount repo media safely', tags: ['rhcsa']
    }
  ],
  'L06-M3-T1': [
    {
      d: 'b', t: 'output',
      q: "A patch script runs `dnf check-update; echo $?`. It prints a list of packages followed by `100`. What does the exit code mean?",
      o: ["dnf hit an error contacting a repository", "No updates are available", "100 packages will be updated", "Updates are available"],
      a: [3],
      e: "`dnf check-update` exits 100 when updates are available, 0 when there are none and 1 on error, which makes it easy to use in scripts.",
      w: ["Errors return exit code 1.", "No updates returns 0.", "The exit code is a status, not a count of packages.", ""],
      c: 'dnf check-update', s: 'Use dnf exit codes in scripts'
    },
    {
      d: 'b', t: 'command',
      q: "Change policy allows only security fixes this week on a RHEL 9 server. Which command applies only updates that fix security advisories?",
      o: ["sudo dnf upgrade --security", "sudo dnf upgrade --bugfix --exclude=*", "sudo dnf update-minimal --all", "sudo dnf distro-sync --security-only"],
      a: [0],
      e: "`dnf upgrade --security` limits the transaction to packages with security errata; `--sec-severity` or `--advisory=ID` narrow it further.",
      w: ["", "--bugfix selects bug-fix errata, and excluding everything installs nothing.", "update-minimal without a security filter is not a security-only update and --all is not a valid option.", "distro-sync has no --security-only option and may downgrade packages."],
      c: 'dnf upgrade --security', s: 'Apply security-only updates', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: "After `dnf upgrade` installs a new kernel, `rpm -q kernel` lists both the old and the new kernel. Why?",
      o: ["The upgrade failed and must be retried", "rpm shows cached entries until the next reboot", "Kernels are install-only packages installed side by side; dnf keeps up to installonly_limit (default 3) as fallbacks", "dnf always keeps two copies of every package"],
      a: [2],
      e: "Kernels are never upgraded in place. Keeping older kernels lets you boot a known-good one from GRUB if the new kernel fails.",
      w: ["Two kernels after an upgrade is the expected result.", "rpm reads the live rpmdb; both kernels really are installed.", "", "Only install-only packages such as the kernel are kept side by side."],
      c: 'installonly_limit', s: 'Explain kernel retention', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "`sudo dnf history info 27` shows:\n`Command Line   : upgrade php`\n`Return-Code    : Success`\n`Packages Altered:`\n`    Upgrade  php-8.0.30-1.el9_4.x86_64 @appstream`\n`    Upgraded php-8.0.27-1.el9_2.x86_64 @@System`\nWhat would `dnf history undo 27` do?",
      o: ["Restore php configuration files and application data from before the upgrade", "Downgrade php back to 8.0.27-1.el9_2, provided that version is still available in an enabled repo or cache", "Delete transaction 27 from the history database", "Reinstall php-8.0.30 to repair it"],
      a: [1],
      e: "undo reverses the package operations of one transaction. Downgrading needs the old package from a repo or cache, and it does not touch configuration or data.",
      w: ["dnf history undo only changes packages; config and data are not restored.", "", "History entries are never deleted by undo; a new transaction is recorded.", "That would be a reinstall, not an undo."],
      c: 'dnf history undo', s: 'Predict the effect of history undo', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'command',
      q: "Transactions 26, 27 and 28 were applied after a known-good state at transaction 25. You want to reverse all three at once. Which command does that?",
      o: ["dnf history undo 25", "dnf history redo 25", "dnf history undo 28", "dnf history rollback 25"],
      a: [3],
      e: "`rollback ID` reverses every transaction after ID, returning the package set to its state after transaction 25. `undo` reverses only a single transaction.",
      w: ["This would reverse transaction 25 itself, not the later ones.", "redo repeats a transaction.", "This only reverses transaction 28, leaving 26 and 27.", ""],
      c: 'dnf history rollback', s: 'Choose undo vs rollback'
    },
    {
      d: 'i', t: 'output',
      q: "After patching, `sudo dnf needs-restarting -r; echo \"exit=$?\"` prints:\n`Core libraries or services have been updated since boot-up:`\n`  * kernel`\n`  * systemd`\n`Reboot is required to fully utilize these updates.`\n`exit=1`\nWhat should you do?",
      o: ["Schedule a reboot in the change window and verify the new kernel with `uname -r` afterwards", "Nothing; exit 1 means the check failed to run", "Restart systemd with `systemctl daemon-reexec` and close the change", "Run `dnf history undo last` because the update failed"],
      a: [0],
      e: "With -r, exit 1 means a reboot is required (here: new kernel and systemd). Plan the reboot, then confirm the running kernel matches the installed one.",
      w: ["", "Exit 1 with -r is the documented \"reboot needed\" result, not an error.", "daemon-reexec does not load a new kernel, which needs a reboot.", "The update succeeded; it just is not active until reboot."],
      c: 'dnf needs-restarting -r', s: 'Decide whether a reboot is needed'
    },
    {
      d: 'i', t: 'config',
      q: "Select all that apply: which configurations prevent `nginx` from being upgraded by a routine `dnf upgrade` on RHEL 9?",
      o: ["`installonly_limit=1` in /etc/dnf/dnf.conf", "`dnf history undo last` after each upgrade", "`sudo dnf versionlock add nginx` (versionlock plugin)", "`dnf mark install nginx`", "`exclude=nginx*` in /etc/dnf/dnf.conf"],
      a: [2, 4],
      e: "versionlock pins the currently installed version, and exclude= hides matching packages from transactions. Both stop routine upgrades; versionlock is more precise and easier to audit.",
      w: ["installonly_limit controls how many kernels are kept, not upgrades of nginx.", "Undoing after the fact does not prevent the upgrade.", "", "mark install only records install reason for autoremove.", ""],
      c: 'dnf versionlock', s: 'Pin package versions'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "On a server that uses only a local ISO repository, `dnf history undo 41` fails:\n`No package php-8.0.27-1.el9_2.x86_64 available.`\n`Error: no package matched`\nTransaction 41 upgraded php from a vendor-provided update set. What is the cause and fix?",
      o: ["The history database is corrupt; run `rpm --rebuilddb`", "undo needs the old package version; point to a repo or cache that still contains it (CDN, Satellite content view, keepcache) or restore the pre-patch snapshot", "undo cannot reverse upgrades, only installs", "Run the undo with --nogpgcheck"],
      a: [1],
      e: "Reversing an upgrade means downgrading, which requires the old build to be available. `dnf list --showduplicates php` shows which versions enabled repos offer.",
      w: ["History and rpmdb are fine; the package file is simply unavailable.", "", "undo reverses upgrades by downgrading when the old version is available.", "Signatures are not the problem; the package cannot be found."],
      c: 'dnf history undo', s: 'Diagnose failed undo operations'
    },
    {
      d: 'a', t: 'rca',
      q: "A RHEL 9 server patched weekly with `dnf upgrade -y` is still running a kernel from eight months ago and has no newer kernel installed. `grep -r exclude /etc/dnf/` returns `/etc/dnf/dnf.conf:exclude=kernel*`. What is the root cause?",
      o: ["installonly_limit is too low", "The server was never rebooted", "The kernel repo is not enabled", "A forgotten global exclude hides every kernel package from dnf, so no kernel security fixes have been installed"],
      a: [3],
      e: "exclude= in dnf.conf applies to every transaction. Kernels were silently skipped; remove the exclude (or use a deliberate, documented versionlock) and apply the pending kernel errata.",
      w: ["A low limit removes old kernels; it does not block new ones.", "No newer kernel is installed, so a reboot would not change anything.", "Kernels come from BaseOS like other core packages; the exclude is what hides them.", ""],
      c: 'exclude=', s: 'Find why kernel updates are skipped'
    },
    {
      d: 'a', t: 'remediation',
      q: "After an OpenSSL security update, `dnf needs-restarting -s` lists `httpd.service`, `sshd.service` and `postfix.service`. A reboot is not allowed this week. What is the correct remediation?",
      o: ["Nothing; the update is active as soon as the RPM is installed", "Run `ldconfig` so running processes pick up the new library", "Restart the listed services in the window, then re-run `dnf needs-restarting -s` to confirm nothing still uses the old library", "Downgrade OpenSSL until the next reboot"],
      a: [2],
      e: "Running processes keep the old, vulnerable library mapped until restarted. Restarting the affected services activates the fix; re-checking proves it.",
      w: ["Long-running processes still have the old library loaded in memory.", "ldconfig updates the linker cache for new processes; it does not affect running ones.", "", "Downgrading reintroduces the vulnerability for new processes too."],
      c: 'dnf needs-restarting -s', s: 'Activate library updates without reboot'
    }
  ],
  'L06-M3-T2': [
    {
      d: 'b', t: 'command',
      q: "Which command adds the Flathub remote system-wide without failing if it already exists?",
      o: ["sudo flatpak install flathub https://dl.flathub.org/repo/flathub.flatpakrepo", "sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo", "sudo dnf config-manager --add-repo https://dl.flathub.org/repo/", "sudo flatpak remotes --add flathub"],
      a: [1],
      e: "`flatpak remote-add NAME LOCATION` configures a remote; `--if-not-exists` makes it idempotent for scripts.",
      w: ["install installs applications from a configured remote; it does not add remotes.", "", "Flatpak remotes are not dnf repositories.", "`flatpak remotes` lists remotes; it has no --add option."],
      c: 'flatpak remote-add', s: 'Add a Flatpak remote', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'concept',
      q: "A user installed GNOME Calculator with Flatpak, but `rpm -qa | grep -i calculator` shows nothing. Why?",
      o: ["Flatpak keeps its own installation database separate from the rpmdb; use `flatpak list`", "The install failed silently", "rpm needs `--flatpak` to show Flatpak apps", "Flatpak apps appear in rpm only after a reboot"],
      a: [0],
      e: "Flatpak stores applications and runtimes in OSTree repositories under /var/lib/flatpak or ~/.local/share/flatpak and tracks them itself; rpm/dnf know nothing about them.",
      w: ["", "The empty rpm output is expected even when the install succeeded.", "rpm has no such option.", "Flatpak apps never appear in the rpmdb."],
      c: 'flatpak list', s: 'Distinguish Flatpak from RPM', tags: ['rhcsa']
    },
    {
      d: 'b', t: 'command',
      q: "The flathub remote is configured. Which command installs GNOME Calculator system-wide from it?",
      o: ["sudo dnf install org.gnome.Calculator", "flatpak run flathub org.gnome.Calculator", "sudo flatpak remote-add flathub org.gnome.Calculator", "sudo flatpak install flathub org.gnome.Calculator"],
      a: [3],
      e: "`flatpak install REMOTE APPID` installs the app and any runtime it needs; system scope is the default when run with privileges.",
      w: ["dnf installs RPMs, not Flatpak application IDs.", "run starts an installed app; it does not install.", "remote-add configures remotes, not applications.", ""],
      c: 'flatpak install', s: 'Install a Flatpak application', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "`flatpak list --app --columns=application,version,origin,installation` run by user alice shows:\n`org.gnome.Calculator  46.1  flathub  user`\nUser bob on the same workstation cannot find the app. Why?",
      o: ["The flathub remote is disabled for bob", "Bob needs to run `flatpak update` first", "Alice installed it in her per-user installation (~/.local/share/flatpak), which other users cannot see", "The app is installed system-wide but bob lacks sudo"],
      a: [2],
      e: "The installation column says `user`. Per-user installs live in that user's home; install system-wide (default, with privileges) for all users.",
      w: ["Remotes do not hide installed apps from users.", "Updating cannot make another user's install visible.", "", "A system-wide install is usable by all users without sudo."],
      c: 'flatpak --user', s: 'Distinguish user and system installs', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "On a RHEL 10 workstation, `sudo flatpak install rhel org.gnome.TextEditor` fails with:\n`error: Unable to load summary from remote rhel: ... 401 Unauthorized`\n`subscription-manager status` shows `Overall Status: Unknown`. What is the fix?",
      o: ["Register the system (e.g. `sudo subscription-manager register` or `rhc connect`), then retry the install", "Delete the rhel remote and add Flathub instead without approval", "Add `--no-gpg-verify` to the remote", "Install with `--user` to avoid authentication"],
      a: [0],
      e: "The Red Hat Flatpak remote authenticates with the system's entitlement. An unregistered system gets 401; registering it fixes access.",
      w: ["", "Replacing a vendor source without approval sidesteps policy and does not fix the root cause.", "GPG verification is unrelated to an HTTP 401 authorization error.", "A user installation still needs to authenticate to the same remote."],
      c: 'flatpak remote', s: 'Fix Red Hat Flatpak remote access', env: 'RHEL 9/10', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'concept',
      q: "Select all that apply: which statements about Flatpak installation scopes are correct?",
      o: ["System-wide installations are stored under /var/lib/flatpak", "Apps installed with --user are visible to all users", "Per-user installations are stored under ~/.local/share/flatpak", "System-wide installs require root or polkit authorization", "Flatpak apps are registered in the rpmdb"],
      a: [0, 2, 3],
      e: "System scope (/var/lib/flatpak) is shared by all users and needs privileges; --user installs go into the user's home directory.",
      w: ["", "--user installations are private to that user.", "", "", "Flatpak keeps its own database; rpm does not track Flatpak apps."],
      c: 'flatpak scopes', s: 'Explain Flatpak storage and scope', tags: ['rhcsa']
    },
    {
      d: 'i', t: 'output',
      q: "`flatpak info --show-permissions org.example.Notes` prints:\n`[Context]`\n`shared=network;ipc;`\n`sockets=x11;wayland;`\n`filesystems=home;`\nWhat does this tell a security reviewer?",
      o: ["The app is fully isolated with no file or network access", "The app runs as root", "The app can only access files the user opens through a portal", "The app has network access and read/write access to the user's whole home directory"],
      a: [3],
      e: "`shared=network` grants network access and `filesystems=home` exposes the home directory. These are broad permissions worth reviewing or restricting with `flatpak override`.",
      w: ["The listed permissions explicitly open network and home access.", "Flatpak apps run as the invoking user, never as root.", "filesystems=home grants direct access, not portal-only access.", ""],
      c: 'flatpak info --show-permissions', s: 'Review sandbox permissions'
    },
    {
      d: 'a', t: 'remediation',
      q: "After several Flatpak apps were uninstalled, /var/lib/flatpak still uses 6 GB. `flatpak list --runtime` shows runtimes no app references. What is the right cleanup?",
      o: ["rm -rf /var/lib/flatpak/runtime", "dnf autoremove", "flatpak update -y", "sudo flatpak uninstall --unused"],
      a: [3],
      e: "`flatpak uninstall --unused` removes runtimes and extensions no longer needed by any installed app, keeping the OSTree repository consistent.",
      w: ["Deleting files under Flatpak's repo corrupts its state.", "dnf autoremove manages RPM dependencies only.", "update downloads newer versions; it does not remove unused runtimes.", ""],
      c: 'flatpak uninstall --unused', s: 'Reclaim Flatpak disk space'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "An admin logged in as root ran `flatpak install --user flathub org.gnome.Calculator`. Users now get `error: app/org.gnome.Calculator/x86_64/stable not installed` when running it. What happened and how is it fixed?",
      o: ["The app was installed into root's per-user installation; uninstall it there and install it system-wide with `sudo flatpak install flathub org.gnome.Calculator`", "Users must run `flatpak update` to sync from root", "The runtime is missing; run `dnf install flatpak-runtime`", "Users must be added to the wheel group to run Flatpak apps"],
      a: [0],
      e: "--user made the install private to root's home. A system-wide install is needed for all users to see the app.",
      w: ["", "update cannot copy another user's installation.", "There is no such RPM; runtimes come from Flatpak remotes.", "Running Flatpak apps does not require wheel membership."],
      c: 'flatpak install --user', s: 'Fix wrong-scope installations'
    },
    {
      d: 'a', t: 'log',
      q: "A workstation provisioning script fails on its second run with:\n`error: Remote \"flathub\" already exists`\nThe first run succeeded. What is the correct change to the script?",
      o: ["Add `flatpak remote-delete flathub` at the start of every run", "Use `flatpak remote-add --if-not-exists flathub URL` so the step is idempotent", "Ignore all errors from the script with `|| true`", "Switch to `--user` remotes"],
      a: [1],
      e: "--if-not-exists makes remote-add succeed when the remote is already configured, which is what repeated configuration runs need.",
      w: ["Deleting a remote can fail if installed apps depend on it and causes needless churn.", "", "Blanket error suppression hides real failures.", "Changing scope changes behaviour for users and does not address idempotence."],
      c: 'flatpak remote-add --if-not-exists', s: 'Write idempotent Flatpak automation'
    }
  ],
  'L06-M4-T1': [
    {
      d: 'b', t: 'concept',
      q: "On a Debian or Ubuntu server, what does `sudo apt update` do?",
      o: ["Upgrades all installed packages", "Upgrades apt itself", "Refreshes the package indexes from all configured sources without installing anything", "Removes unused dependencies"],
      a: [2],
      e: "`apt update` downloads the latest package lists. Installing newer versions is done afterwards by `apt upgrade` or `apt full-upgrade`.",
      w: ["Upgrading is `apt upgrade`; update only refreshes indexes.", "It does not specifically upgrade apt.", "", "That is `apt autoremove`."],
      c: 'apt update', s: 'Refresh APT indexes', env: 'Debian/Ubuntu'
    },
    {
      d: 'b', t: 'command',
      q: "On Debian 12 you want to remove `apache2` and also delete its system-wide configuration files. Which command does that?",
      o: ["sudo apt purge apache2", "sudo apt remove apache2", "sudo apt autoremove apache2", "sudo apt clean apache2"],
      a: [0],
      e: "`purge` removes the package and its conffiles. `remove` keeps configuration, leaving the package in the `rc` state.",
      w: ["", "remove keeps the configuration files.", "autoremove removes no-longer-needed dependencies.", "clean empties the downloaded package cache."],
      c: 'apt purge', s: 'Remove packages with configuration', env: 'Debian/Ubuntu'
    },
    {
      d: 'b', t: 'command',
      q: "During a release freeze on Ubuntu 24.04, `openjdk-17-jdk` must not be upgraded by `apt upgrade`. Which command enforces that?",
      o: ["sudo apt remove --hold openjdk-17-jdk", "sudo apt-cache policy openjdk-17-jdk", "sudo apt-get -s upgrade", "sudo apt-mark hold openjdk-17-jdk"],
      a: [3],
      e: "`apt-mark hold` pins the package at its current version; `apt-mark showhold` lists holds and `apt-mark unhold` releases them after the freeze.",
      w: ["There is no --hold option for apt remove.", "policy displays versions; it does not prevent upgrades.", "-s simulates an upgrade but does not stop future upgrades.", ""],
      c: 'apt-mark hold', s: 'Hold package versions', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'output',
      q: "On Ubuntu 24.04, `apt-cache policy nginx` shows:\n`nginx:`\n`  Installed: 1.24.0-2ubuntu7`\n`  Candidate: 1.24.0-2ubuntu7.1`\n`  Version table:`\n`     1.24.0-2ubuntu7.1 500`\n`        500 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages`\n` *** 1.24.0-2ubuntu7 100`\n`        100 /var/lib/dpkg/status`\nWhat does this tell you?",
      o: ["nginx is not installed", "An update to 1.24.0-2ubuntu7.1 from noble-updates is available and would be installed by an upgrade", "nginx is held at 1.24.0-2ubuntu7", "The installed version has a higher priority and will never be upgraded"],
      a: [1],
      e: "*** marks the installed version (priority 100 from the dpkg status file). The candidate, the version apt would install, is the newer 7.1 build from noble-updates.",
      w: ["The Installed line shows a version, so it is installed.", "", "Holds are not shown this way; `apt-mark showhold` lists them.", "Priority 100 is the normal value for the installed version; a higher-priority candidate (500) wins."],
      c: 'apt-cache policy', s: 'Read installed vs candidate versions', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "On an Ubuntu server, `sudo apt upgrade` reports:\n`The following packages have been kept back:`\n`  linux-image-generic`\nWhy, and what is the appropriate next step?",
      o: ["The upgrade requires installing new packages (a new kernel ABI package), which `apt upgrade` will not do; review with `apt-get -s full-upgrade`, then run `apt full-upgrade`", "The package is corrupted and must be purged", "The package is held; run apt-mark unhold", "The mirror is out of date; change mirrors"],
      a: [0],
      e: "Kernel metapackage updates usually pull in new packages. `upgrade` never installs or removes packages, so it keeps them back; `full-upgrade` allows it after you review the plan.",
      w: ["", "Kept back is a planning decision, not corruption.", "Held packages are reported separately; nothing indicates a hold here.", "The mirror served a newer version, which is exactly why it is listed."],
      c: 'apt full-upgrade', s: 'Handle kept-back packages', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'config',
      q: "You must add a vendor APT repository on Debian 12 (bookworm). The vendor key has been verified and dearmored to /usr/share/keyrings/vendor.gpg. Which source line is correct?",
      o: ["`deb [trusted=yes] https://repo.vendor.example/apt bookworm main`", "`deb https://repo.vendor.example/apt main` plus `apt-key add vendor.asc`", "`deb https://repo.vendor.example/apt bookworm main` with the key copied to /etc/apt/trusted.gpg", "`deb [signed-by=/usr/share/keyrings/vendor.gpg] https://repo.vendor.example/apt bookworm main`"],
      a: [3],
      e: "signed-by scopes trust to this repository only. The line includes the suite (bookworm) and component (main).",
      w: ["trusted=yes disables signature verification for the repo.", "apt-key is deprecated and trusts the key for all repos; the suite is also missing.", "Keys in trusted.gpg are trusted for every repository.", ""],
      c: 'signed-by', s: 'Write signed APT sources', env: 'Debian 12 / Ubuntu 22.04+'
    },
    {
      d: 'i', t: 'command',
      q: "Select all that apply: on Debian/Ubuntu, which commands are appropriate in a non-interactive provisioning script?",
      o: ["apt install -y nginx", "apt-get -y install nginx", "apt-cache policy nginx", "apt list --upgradable"],
      a: [1, 2],
      e: "apt-get and apt-cache have stable, script-friendly interfaces. `apt` is designed for interactive use and warns that its CLI is not stable.",
      w: ["apt prints \"apt does not have a stable CLI interface\" when used in scripts.", "", "", "apt list is the interactive front end, with output that may change."],
      c: 'apt-get', s: 'Choose apt vs apt-get', env: 'Debian/Ubuntu'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "On a fresh Ubuntu 22.04 server, `sudo apt install postgresql-16` fails with `E: Unable to locate package postgresql-16`. After `sudo apt update` it still fails, and `apt-cache search postgresql | head` shows only version 14. What is the cause and fix?",
      o: ["The apt cache is corrupt; delete /var/lib/apt/lists and retry", "Ubuntu 22.04's archive does not ship PostgreSQL 16; add the PGDG repository with a signed-by keyring (after verifying its fingerprint), run apt update and install", "The package name is wrong; install postgresql16", "Install the .deb from a forum link with dpkg -i --force-depends"],
      a: [1],
      e: "Each Ubuntu release carries specific versions. A newer major version comes from the vendor (PGDG) repository, configured with a scoped key.",
      w: ["The indexes are fine; they simply do not contain this version.", "", "That is not the Debian/Ubuntu naming of the package; the issue is the repository.", "Untrusted downloads plus forced dependencies are unsafe and leave a broken install."],
      c: 'apt-cache search', s: 'Find packages missing from the archive', env: 'Ubuntu 22.04'
    },
    {
      d: 'a', t: 'output',
      q: "Before a Debian upgrade window you run `sudo apt-get -s dist-upgrade | grep -E \"^(Inst|Remv)\"` and see:\n`Remv libfoo1 [1.2-3]`\n`Inst libfoo2 (2.0-1 Debian:12.6/stable [amd64])`\n`Inst foo-tools [1.2-3] (2.0-1 Debian:12.6/stable [amd64])`\nWhat is the key implication?",
      o: ["The command already removed libfoo1", "Nothing will be removed because this is only a dist-upgrade", "The full upgrade would remove libfoo1 and install libfoo2; check that nothing outside packaging (e.g. a locally built app) needs libfoo1 before running it", "This means the repository is broken"],
      a: [2],
      e: "-s simulates the transaction. A Remv line during dist-upgrade/full-upgrade is a planned removal that should be reviewed; a plain upgrade would keep these packages back instead.",
      w: ["-s only simulates; nothing has changed yet.", "dist-upgrade (full-upgrade) is precisely the mode that may remove packages.", "", "Library transitions like this are normal, not a repository fault."],
      c: 'apt-get -s', s: 'Review planned removals', env: 'Debian/Ubuntu'
    },
    {
      d: 'a', t: 'security',
      q: "An audit of Ubuntu servers finds several third-party keys in /etc/apt/trusted.gpg added years ago with `apt-key add`. What is the security problem?",
      o: ["Keys there are trusted for every configured repository, so one compromised vendor key could sign packages that appear to come from any source", "Keys in trusted.gpg expire after a year", "apt ignores keys in trusted.gpg, so packages are unverified", "trusted.gpg keys only allow installing from HTTPS mirrors"],
      a: [0],
      e: "apt-key places keys in a global keyring. The modern approach stores each key separately and references it with signed-by in the matching source entry.",
      w: ["", "Key expiry is set by the key itself, not by the keyring file.", "apt does use them (with a deprecation warning), which is the issue.", "Keys are unrelated to the transport protocol."],
      c: 'apt-key', s: 'Assess APT key trust scope', env: 'Debian/Ubuntu'
    }
  ],
  'L06-M4-T2': [
    {
      d: 'b', t: 'command',
      q: "On Ubuntu, which command shows which package installed `/usr/sbin/sshd`?",
      o: ["dpkg -L /usr/sbin/sshd", "dpkg -S /usr/sbin/sshd", "dpkg -s /usr/sbin/sshd", "apt show /usr/sbin/sshd"],
      a: [1],
      e: "`dpkg -S PATH` searches the installed packages' file lists and prints the owner (openssh-server).",
      w: ["-L lists files of a package name, not the owner of a path.", "", "-s prints the status of a package name.", "apt show needs a package name."],
      c: 'dpkg -S', s: 'Find the owner of a file', env: 'Debian/Ubuntu'
    },
    {
      d: 'b', t: 'output',
      q: "On Debian 12, `dpkg -l apache2` shows:\n`rc  apache2  2.4.62-1~deb12u1  amd64  Apache HTTP Server`\nWhat does `rc` mean?",
      o: ["The package was removed, but its configuration files remain", "The package is installed and running correctly", "The package is held at this version", "The package is a release candidate build"],
      a: [0],
      e: "The first letter is the desired action (r = remove) and the second the current state (c = config-files only). `apt purge apache2` removes the leftover config.",
      w: ["", "Installed and fine is `ii`.", "Holds use the desired-state letter h.", "The letters are state flags, not version labels."],
      c: 'dpkg -l', s: 'Read dpkg status codes', env: 'Debian/Ubuntu'
    },
    {
      d: 'b', t: 'concept',
      q: "On Debian and Ubuntu, where does dpkg record which packages are installed and their state?",
      o: ["/etc/apt/sources.list", "/var/cache/apt/archives", "/var/lib/dpkg/status", "/var/log/apt/history.log"],
      a: [2],
      e: "The dpkg status database lives in /var/lib/dpkg/status, with per-package file lists under /var/lib/dpkg/info/.",
      w: ["sources.list configures repositories.", "That directory caches downloaded .deb files.", "", "history.log is a log of apt actions, not the database."],
      c: '/var/lib/dpkg/status', s: 'Locate the dpkg database', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'log',
      q: "After a power cut during unattended upgrades, every apt command on an Ubuntu server prints:\n`E: dpkg was interrupted, you must manually run 'sudo dpkg --configure -a' to correct the problem.`\nWhat is the correct recovery sequence?",
      o: ["Delete /var/lib/dpkg/lock* and rerun apt upgrade", "Reinstall the OS", "Run `apt-get install --reinstall dpkg`", "Confirm no apt/dpkg process is running, run `sudo dpkg --configure -a`, then `sudo apt-get -f install` if dependencies are broken, and verify with `dpkg --audit`"],
      a: [3],
      e: "The transaction stopped between unpack and configure. Configuring pending packages and fixing dependencies completes it; `dpkg --audit` returning nothing confirms the state is clean.",
      w: ["Deleting locks does not finish the configuration and can corrupt the database if another process is running.", "Reinstalling is unnecessary for a recoverable interruption.", "apt refuses to run until dpkg is configured, and reinstalling dpkg does not address the pending packages.", ""],
      c: 'dpkg --configure -a', s: 'Recover an interrupted dpkg run', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'output',
      q: "On Debian 12 an admin ran `sudo dpkg -i vendor-agent_3.1_amd64.deb`. Now `dpkg -l vendor-agent` shows:\n`iU  vendor-agent  3.1  amd64  Vendor monitoring agent`\nWhat happened and how is it best fixed?",
      o: ["The package installed correctly", "The package was unpacked but not configured, typically because dependencies were missing; run `sudo apt-get -f install` (and in future use `apt install ./file.deb`)", "The package is held; unhold it", "The package was removed but config remains"],
      a: [1],
      e: "iU = desired install, current state Unpacked. dpkg does not resolve dependencies; apt can install the missing ones and finish configuration.",
      w: ["A correct install is `ii`.", "", "Holds are shown with the h desired-state letter.", "Removed with config left is `rc`."],
      c: 'dpkg -i', s: 'Repair half-installed packages', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'command',
      q: "Select all that apply: on Debian/Ubuntu, which commands inspect a .deb FILE before it is installed?",
      o: ["dpkg -L vendor-agent_3.1_amd64.deb", "dpkg -s vendor-agent_3.1_amd64.deb", "dpkg -I vendor-agent_3.1_amd64.deb", "dpkg -c vendor-agent_3.1_amd64.deb"],
      a: [2, 3],
      e: "`dpkg -I` shows the control information (dependencies, maintainer scripts list) and `dpkg -c` lists the files contained in the archive.",
      w: ["-L lists files of an installed package name.", "-s shows the status of an installed package name.", "", ""],
      c: 'dpkg -I / dpkg -c', s: 'Inspect .deb files', env: 'Debian/Ubuntu'
    },
    {
      d: 'i', t: 'command',
      q: "For an asset inventory on Ubuntu you need one line per installed package with name and version, tab-separated, in a stable script-friendly format. Which command fits best?",
      o: ["dpkg-query -W -f='${Package}\\t${Version}\\n'", "dpkg -l | awk '{print $2, $3}'", "apt list --installed", "ls /var/lib/dpkg/info"],
      a: [0],
      e: "dpkg-query with -W and a format string prints exactly the fields requested, independent of terminal width or human-oriented formatting.",
      w: ["", "Parsing dpkg -l includes header lines and depends on column layout.", "apt's output is for humans and not stable for scripts.", "That directory lists per-package metadata files, not versions."],
      c: 'dpkg-query -W', s: 'Script package inventories', env: 'Debian/Ubuntu'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "On Ubuntu, `sudo apt install htop` fails with:\n`E: Could not get lock /var/lib/dpkg/lock-frontend. It is held by process 1873 (unattended-upgr)`\nA colleague suggests deleting the lock files. What should you do?",
      o: ["Delete the lock files and rerun the install", "Reboot immediately to clear the lock", "Leave the locks alone; wait for unattended-upgrades to finish (check with `ps -fp 1873` and its log), then retry", "Kill -9 process 1873 and run dpkg --configure -a"],
      a: [2],
      e: "The lock is held by a legitimate package process. Deleting locks or killing it mid-transaction risks a half-configured, inconsistent dpkg database.",
      w: ["Removing locks allows two writers to modify the dpkg database at once.", "Rebooting mid-upgrade can interrupt dpkg and create the very problem you want to avoid.", "", "Killing the process interrupts a transaction and forces a recovery that was not needed."],
      c: 'dpkg lock', s: 'Handle package manager locks', env: 'Debian/Ubuntu'
    },
    {
      d: 'a', t: 'output',
      q: "During incident response on a Debian 12 server, `dpkg --verify openssh-server` prints:\n`??5??????   /usr/sbin/sshd`\nWhat does this indicate and what is the correct first response?",
      o: ["Normal configuration drift; ignore it", "The file is missing", "Only the permissions changed; fix with chmod", "The sshd binary's checksum no longer matches the package record; preserve evidence (hash, copy, timestamps) and investigate for tampering before reinstalling"],
      a: [3],
      e: "The 5 marks an md5sum mismatch on a non-conffile binary, which is not expected. Capture evidence first, then restore with a reinstall from a trusted source.",
      w: ["Without a `c` this is not a conffile, and a changed binary is not normal drift.", "A missing file is reported differently.", "dpkg --verify reports checksum (5) here, not permissions.", ""],
      c: 'dpkg --verify', s: 'Detect modified binaries on Debian', env: 'Debian/Ubuntu'
    },
    {
      d: 'a', t: 'distro',
      q: "On Debian 12, `dpkg -S /usr/bin/bash` returns `dpkg-query: no path found matching pattern /usr/bin/bash`, although `/usr/bin/bash` exists. What explains this?",
      o: ["bash was installed from source", "On usrmerge systems /bin is a symlink to /usr/bin; the package registered the path /bin/bash, so query that path (`dpkg -S /bin/bash`)", "The dpkg database is corrupted", "dpkg -S only works on files under /etc"],
      a: [1],
      e: "dpkg matches the paths recorded at install time. With usrmerge, the same file is reachable through two paths but only one is registered.",
      w: ["bash is a packaged essential package.", "", "The query works for the registered path, so the database is fine.", "dpkg -S works for any packaged path."],
      c: 'dpkg -S', s: 'Account for usrmerge paths', env: 'Debian 12 (usrmerge)'
    }
  ],
  'L06-M5-T1': [
    {
      d: 'b', t: 'log',
      q: "`dnf makecache` fails with:\n`Curl error (6): Couldn't resolve host name for https://mirror.example.com/rocky/9/BaseOS/x86_64/os/repodata/repomd.xml`\nWhich layer is failing?",
      o: ["DNS name resolution", "TLS certificate validation", "Repository authentication", "Package signature verification"],
      a: [0],
      e: "Curl error 6 means the host name could not be resolved. Check with `getent hosts mirror.example.com` and the resolver configuration.",
      w: ["", "TLS problems show as curl error 60 (or 35).", "Authentication failures return HTTP 401/403 (curl 22).", "Signature checks happen after packages download, not when fetching metadata."],
      c: 'curl error codes', s: 'Map repo errors to layers'
    },
    {
      d: 'b', t: 'command',
      q: "You want to test whether a repository URL is reachable independently of dnf. Which command is the most useful?",
      o: ["dnf clean all", "ping -c1 mirror.example.com", "curl -v https://mirror.example.com/rocky/9/BaseOS/x86_64/os/repodata/repomd.xml", "rpm -qa | grep mirror"],
      a: [2],
      e: "Fetching repodata/repomd.xml with curl -v reproduces exactly what dnf requests and shows DNS, TCP, TLS and HTTP details.",
      w: ["Cleaning the cache tests nothing about reachability.", "ICMP may be blocked and says nothing about HTTP, TLS or the path.", "", "This lists installed packages, unrelated to repository access."],
      c: 'curl -v', s: 'Reproduce repo access outside dnf'
    },
    {
      d: 'b', t: 'log',
      q: "Which log file on RHEL 9 contains the detailed librepo/libcurl download errors behind a failing `dnf` command?",
      o: ["/var/log/secure", "/var/log/dnf.librepo.log", "/var/log/rhsm/rhsm.log", "/var/log/boot.log"],
      a: [1],
      e: "dnf.librepo.log records the URLs tried and the transport errors. /var/log/dnf.log has dnf's own messages and rhsm.log covers subscription-manager.",
      w: ["secure holds authentication events.", "", "rhsm.log covers subscription management, not individual downloads.", "boot.log records boot-time service messages."],
      c: '/var/log/dnf.librepo.log', s: 'Find dnf download logs'
    },
    {
      d: 'i', t: 'log',
      q: "After a VM was restored from an old snapshot, every repo fails with:\n`Curl error (60): SSL peer certificate or SSH remote key was not OK ... certificate is not yet valid`\nWhat is the most likely cause and fix?",
      o: ["The mirror's certificate expired; set sslverify=0", "The CA bundle is missing; reinstall ca-certificates", "DNS is pointing at the wrong mirror", "The system clock is behind; check `timedatectl` and resynchronise time with chronyd"],
      a: [3],
      e: "\"Not yet valid\" means the local clock is earlier than the certificate's start date, which is typical after restoring a snapshot. Fixing time fixes TLS.",
      w: ["The message says not yet valid, not expired, and disabling verification is never the fix.", "A missing bundle produces an unknown-issuer error instead.", "A wrong mirror produces a name mismatch, not a validity-date error.", ""],
      c: 'timedatectl', s: 'Diagnose clock-related TLS errors'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "On a subscribed RHEL 9 host, dnf reports `Status code: 403 for https://cdn.redhat.com/content/dist/rhel9/...`. DNS and TLS work. What should you check first?",
      o: ["The entitlement: `subscription-manager status` and, if needed, `subscription-manager refresh`, reviewing /var/log/rhsm/rhsm.log", "Edit redhat.repo to change the CDN URL", "Disable the repo permanently", "Set gpgcheck=0 on the Red Hat repositories"],
      a: [0],
      e: "403 Forbidden from the CDN means the client certificate is not entitled to that content. Fix the subscription rather than the repo file.",
      w: ["", "redhat.repo is regenerated by subscription-manager and the URL is not the problem.", "Disabling the repo hides the problem and stops updates.", "Signatures have nothing to do with an HTTP 403."],
      c: 'subscription-manager status', s: 'Fix CDN authorization errors'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "Select all that apply: which are safe, evidence-first steps when a dnf repository fails?",
      o: ["Set sslverify=0 in the failing repo", "Run `curl -v` against the repo's repodata/repomd.xml", "Run `dnf clean metadata && dnf makecache` after checking the error", "Enable skip_if_unavailable=True globally in dnf.conf", "Check time sync with `timedatectl`"],
      a: [1, 2, 4],
      e: "Reproducing the request, clearing stale metadata and checking time are diagnostic or low-risk fixes. Disabling TLS verification and globally skipping repos hide the problem and can silently stop security updates.",
      w: ["Disabling certificate verification removes the protection against a malicious mirror.", "", "", "A global skip makes dnf silently ignore broken repos, including security update sources.", ""],
      c: 'repo troubleshooting', s: 'Choose safe repository diagnostics'
    },
    {
      d: 'i', t: 'config',
      q: "Servers in a restricted network must reach repositories through `http://proxy.example.com:3128`. Where is this configured for dnf so every repo uses it?",
      o: ["In each user's ~/.bashrc as http_proxy", "In /etc/hosts", "`proxy=http://proxy.example.com:3128` in the [main] section of /etc/dnf/dnf.conf", "In /etc/yum.repos.d/proxy.repo as a separate repository"],
      a: [2],
      e: "dnf reads proxy settings from dnf.conf [main] (or per repo). Environment variables in a user's shell do not apply to automated or root runs reliably.",
      w: ["Shell variables do not affect systemd timers such as dnf-automatic and vary per user.", "/etc/hosts maps names to addresses and cannot define a proxy.", "", "A .repo file defines repositories; a section called proxy would just be a broken repo."],
      c: 'dnf.conf proxy', s: 'Configure dnf proxies'
    },
    {
      d: 'a', t: 'rca',
      q: "Patch automation fails on every server in one data centre with `Curl error (56): Failure when receiving data from the peer` for all repos. Other sites are fine. `curl -v -x http://proxy-dc2:3128 https://cdn.redhat.com/` fails the same way, and the network team recently enabled TLS inspection on that proxy. What is the root cause and appropriate fix?",
      o: ["The RHEL CDN is down; wait for Red Hat", "The DC2 proxy's TLS inspection breaks the connection; with security approval install the inspection CA in /etc/pki/ca-trust/source/anchors/ and run `update-ca-trust` (or get an inspection bypass for the CDN), rather than setting sslverify=0", "dnf.conf is corrupt on all DC2 hosts", "Set sslverify=0 for all repositories in DC2"],
      a: [1],
      e: "The failure is isolated to one site's proxy and began with TLS inspection. Trusting the approved inspection CA system-wide (or bypassing inspection) fixes it without disabling verification.",
      w: ["Other sites reach the CDN fine, so the CDN is not down.", "", "The same error via curl through the proxy proves the config files are not the cause.", "Disabling TLS verification exposes every host to tampered content."],
      c: 'update-ca-trust', s: 'Find site-wide proxy causes'
    },
    {
      d: 'a', t: 'remediation',
      q: "A third-party monitoring repo is down, blocking `dnf install tcpdump` (from BaseOS) needed urgently during an incident. What is the best way to proceed?",
      o: ["Delete the vendor .repo file", "Set skip_if_unavailable=True in dnf.conf permanently", "Set sslverify=0 for the vendor repo", "Run `sudo dnf --disablerepo=vendor-monitoring install tcpdump` for this one command, then document and follow up on the vendor repo"],
      a: [3],
      e: "Disabling the broken repo for one command unblocks the install without changing persistent configuration or hiding future failures.",
      w: ["Deleting the repo loses configuration and the vendor's updates.", "A permanent global skip hides failing repos, including future security update sources.", "TLS is not the cause, and disabling verification is never the fix.", ""],
      c: 'dnf --disablerepo', s: 'Unblock urgent installs safely'
    },
    {
      d: 'a', t: 'distro',
      q: "After migrating to RHEL 9, hosts can no longer use a legacy internal mirror that worked from RHEL 8. dnf.librepo.log shows a TLS handshake failure; the mirror uses TLS 1.0 and a SHA-1 signed certificate. What is the right fix?",
      o: ["Upgrade the mirror to TLS 1.2+ with a SHA-256 certificate, keeping the RHEL 9 DEFAULT crypto policy", "Run `update-crypto-policies --set LEGACY` on all RHEL 9 hosts", "Set sslverify=0 for the internal mirror", "Switch the mirror URL to http:// and disable gpgcheck"],
      a: [0],
      e: "RHEL 9 default crypto policies reject old TLS versions and SHA-1 certificates. Fix the server; weakening policy on every client is a broad security regression.",
      w: ["", "LEGACY weakens cryptography for every application on the hosts.", "Disabling verification exposes hosts to man-in-the-middle attacks.", "Dropping both transport security and signatures removes all integrity checks."],
      c: 'update-crypto-policies', s: 'Resolve crypto policy mismatches', env: 'RHEL 9/10 (RHEL 8 accepted older TLS/SHA-1)'
    }
  ],
  'L06-M5-T2': [
    {
      d: 'b', t: 'command',
      q: "What does `dnf upgrade --skip-broken` do?",
      o: ["Removes packages that have broken dependencies", "Skips packages whose dependencies cannot be resolved and upgrades the rest", "Repairs broken dependencies automatically", "Skips signature checks for broken packages"],
      a: [1],
      e: "--skip-broken leaves out unresolvable packages so the rest of the transaction can proceed. It is a temporary workaround; the skipped updates remain missing until the cause is fixed.",
      w: ["It removes nothing; --allowerasing is the option that may remove packages.", "", "Nothing is repaired; problematic packages are simply not updated.", "Signature checks are unaffected."],
      c: 'dnf --skip-broken', s: 'Understand solver workarounds'
    },
    {
      d: 'b', t: 'security',
      q: "Why is `rpm -ivh --nodeps --force package.rpm` a dangerous way to get past a dependency error?",
      o: ["It deletes the rpmdb", "It disables SELinux", "It always fails on RHEL 9", "It installs a package whose required libraries are missing or conflicting, leaving the system inconsistent and likely to break at run time or on later updates"],
      a: [3],
      e: "--nodeps ignores missing requirements and --force overrides conflicts. The rpmdb then records a state that dnf cannot satisfy, causing failures later.",
      w: ["The rpmdb is kept, but its contents become inconsistent.", "These options have nothing to do with SELinux.", "It usually \"succeeds\", which is what makes it dangerous.", ""],
      c: 'rpm --nodeps --force', s: 'Explain why forcing installs is unsafe'
    },
    {
      d: 'b', t: 'command',
      q: "Which command reports dependency problems, duplicate packages and obsoleted packages in the installed set on RHEL 9?",
      o: ["dnf check", "dnf check-update", "rpm -K", "dnf repolist"],
      a: [0],
      e: "`dnf check` examines the local rpmdb for broken dependencies, duplicates and obsoletes, a key step after an interrupted transaction.",
      w: ["", "check-update looks for available updates in repositories.", "rpm -K checks a package file's signature.", "repolist lists repositories."],
      c: 'dnf check', s: 'Check the installed package set'
    },
    {
      d: 'i', t: 'log',
      q: "On a RHEL 9 server, installing a vendor tool fails with:\n`Problem: conflicting requests`\n` - nothing provides libssl.so.1.1()(64bit) needed by vendor-tool-2.1-1.el8.x86_64`\nWhat is the most likely cause?",
      o: ["A repository is temporarily unreachable", "The rpmdb is corrupted", "This is an EL8 build linked against OpenSSL 1.1, which RHEL 9 does not provide; obtain the vendor's el9 build", "openssl-libs needs to be reinstalled"],
      a: [2],
      e: "The .el8 dist tag and the OpenSSL 1.1 soname show a wrong-release package. RHEL 9 ships OpenSSL 3; installing compat hacks or forcing is not a fix.",
      w: ["An unreachable repo produces download errors, not \"nothing provides\".", "Solver messages come from repo metadata, not the rpmdb.", "", "Reinstalling OpenSSL 3 will not provide libssl.so.1.1."],
      c: 'dnf solver output', s: 'Read nothing-provides errors'
    },
    {
      d: 'i', t: 'output',
      q: "On a RHEL 9 minimal install, `sudo dnf install curl` prints:\n`Problem: problem with installed package curl-minimal-7.76.1-29.el9.x86_64`\n`  - package curl-minimal-7.76.1-29.el9.x86_64 conflicts with curl provided by curl-7.76.1-29.el9.x86_64`\n`(try to add '--allowerasing' to command line to replace conflicting packages ...)`\nWhat is the correct action?",
      o: ["Install curl with `rpm -ivh --force`", "Remove curl-minimal with `rpm -e --nodeps` first", "Give up; curl cannot be installed on minimal systems", "Run `sudo dnf install curl --allowerasing --assumeno` to review, confirm only curl-minimal is removed, then run it with --allowerasing"],
      a: [3],
      e: "curl and curl-minimal are alternatives that conflict by design. --allowerasing lets dnf swap them in one transaction; previewing confirms nothing else is removed.",
      w: ["Forcing creates two conflicting packages in the rpmdb.", "Removing with --nodeps briefly leaves dependents without curl and bypasses dnf.", "Swapping is supported via --allowerasing.", ""],
      c: 'dnf --allowerasing', s: 'Resolve package conflicts safely', env: 'RHEL 9'
    },
    {
      d: 'i', t: 'remediation',
      q: "Select all that apply: an SSH disconnect interrupted `dnf upgrade` on a RHEL 9 server. Which steps belong in a safe recovery?",
      o: ["Run `dnf check` to find duplicates and broken dependencies", "Delete everything under /var/lib/rpm and rebuild", "Run `dnf remove --duplicates` to clean up older duplicate versions", "Run `rpm -V` on the affected packages and reinstall any with damaged files", "Reinstall all packages with `rpm -ivh --force`"],
      a: [0, 2, 3],
      e: "Check the installed set, remove the stale duplicates left by the half-finished transaction, then verify and repair files. Run future patching inside tmux or screen.",
      w: ["", "Deleting the rpmdb destroys the record of installed software.", "", "", "Forcing reinstalls bypasses dependency checks and is unnecessary."],
      c: 'dnf remove --duplicates', s: 'Recover from interrupted transactions'
    },
    {
      d: 'i', t: 'troubleshoot',
      q: "On RHEL 9 with EPEL enabled, `dnf install some-epel-tool` fails with `nothing provides python3-foo needed by some-epel-tool`. `dnf repolist` shows BaseOS, AppStream and EPEL. What is the likely fix?",
      o: ["Install python3-foo from PyPI with pip as root", "Enable the CodeReady Builder (CRB) repository, which EPEL packages on RHEL 9/10 depend on", "Use --skip-broken permanently", "Disable gpgcheck for EPEL"],
      a: [1],
      e: "Many EPEL packages require build and library packages that live in CRB. Enable it with subscription-manager (RHEL) or `dnf config-manager --set-enabled crb` (Rocky/Alma).",
      w: ["pip-installed modules are not RPM capabilities and conflict with system Python packages.", "", "Skipping hides the failure and the tool still is not installed.", "Signature checking is unrelated to a missing dependency."],
      c: 'CRB / EPEL', s: 'Resolve EPEL dependency errors', env: 'RHEL 9/10'
    },
    {
      d: 'a', t: 'troubleshoot',
      q: "Every dnf command on a server hangs with `Waiting for process with pid 2314 to finish.` `ps -fp 2314` shows `/usr/bin/python3 /usr/bin/dnf-automatic`, started 3 minutes ago. The on-call engineer proposes deleting the rpmdb lock files. What should you do?",
      o: ["Delete the lock files so your command can proceed", "Run `rpm --rebuilddb` to clear the lock", "Let the dnf-automatic transaction finish (follow `journalctl -u dnf-automatic.service -f`), or stop the timer cleanly before the next change window, then run your command", "kill -9 2314"],
      a: [2],
      e: "A legitimate transaction holds the lock. Deleting locks creates two concurrent writers, and killing it interrupts a transaction; waiting and coordinating with the timer is safe.",
      w: ["Removing locks lets two processes modify the rpmdb simultaneously.", "Rebuilding the database during an active transaction risks corruption.", "", "Killing it mid-transaction can leave duplicates and half-installed packages."],
      c: 'dnf lock', s: 'Handle rpmdb locks safely'
    },
    {
      d: 'a', t: 'rca',
      q: "A server has not received several security updates for months although patch runs report success. `/etc/dnf/dnf.conf` contains `skip_broken=True`, added during an outage last year. `dnf upgrade --assumeno` without it shows a dependency problem with a vendor package. What is the root cause?",
      o: ["A persistent skip_broken silently skipped the packages blocked by the vendor dependency problem, so security updates never installed while the runs reported success", "The repository metadata expired", "dnf-automatic is disabled", "The kernel is excluded"],
      a: [0],
      e: "skip_broken turns a failing transaction into a partial one. Remove it, resolve the vendor conflict and use `dnf updateinfo list --security` to confirm nothing is pending.",
      w: ["", "Expired metadata is refreshed automatically and would not affect only these packages.", "Patch runs did execute and report success.", "Nothing points to a kernel exclude; the dependency problem explains the skipped packages."],
      c: 'skip_broken', s: 'Find causes of silently missed updates'
    },
    {
      d: 'a', t: 'remediation',
      q: "On a RHEL 9 server, rpm commands fail with `error: sqlite failure: ... database disk image is malformed`. No dnf/rpm/PackageKit process is running. What is the safest repair sequence?",
      o: ["rm -rf /var/lib/rpm/* and reinstall the OS packages", "Set gpgcheck=0 and rerun dnf", "Run `dnf distro-sync` to rewrite the database", "Back up the database directory (e.g. `tar czf /root/rpmdb-backup.tgz /var/lib/rpm`), run `rpm --rebuilddb`, then validate with `rpm -qa | wc -l` and `dnf check`"],
      a: [3],
      e: "rpm --rebuilddb reconstructs the database from the package headers it contains. Backing up first allows rollback, and comparing package counts and running dnf check validates the result.",
      w: ["Deleting the database loses the record of everything installed.", "Signature settings are unrelated to database corruption.", "distro-sync needs a working rpmdb and changes packages rather than repairing the database.", ""],
      c: 'rpm --rebuilddb', s: 'Repair a corrupted rpmdb', env: 'RHEL 9 (SQLite rpmdb)'
    }
  ]
};
