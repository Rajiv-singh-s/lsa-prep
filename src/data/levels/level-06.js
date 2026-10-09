// Level 6 — Package Management (RPM/DNF, repositories, Flatpak, Debian apt/dpkg, troubleshooting)
export default {
  id: 'L06', number: 6,
  title: 'Package Management',
  summary: 'Install, query, verify, update and roll back software safely on RHEL-family systems with rpm, dnf and Flatpak, understand the Debian apt/dpkg equivalents, and troubleshoot repository, dependency and rpmdb failures with evidence.',
  prerequisites: ['L05'],
  outcomes: [
    'Query and verify installed RPM packages and their signatures, and explain what every rpm -V flag means',
    'Configure, enable, disable and debug DNF repositories, including GPG keys and local repositories',
    'Plan updates, use dnf history to audit and undo transactions, and protect kernels and critical packages',
    'Install, update and remove Flatpak applications from configured remotes (RHCSA on RHEL 10)',
    'Perform equivalent tasks on Debian/Ubuntu with apt, apt-get and dpkg',
    'Diagnose repository failures, dependency conflicts, rpmdb problems and interrupted transactions without breaking the system'
  ],
  modules: [
    {
      id: 'L06-M1', title: 'RPM fundamentals',
      summary: 'What an RPM package actually is, how the RPM database records it, and how to query, verify and trust installed software.',
      lessons: [
        {
          id: 'L06-M1-T1',
          title: 'RPM package anatomy and the rpm query interface',
          minutes: 40,
          objectives: [
            'Decode an RPM file name into name, epoch, version, release and architecture (NEVRA)',
            'Query installed and uninstalled packages with rpm -q and its selectors',
            'Find which package owns a file and which files, configs and docs a package installed',
            'Explain where the RPM database lives on RHEL 8, 9 and 10'
          ],
          prereqs: [],
          concept: `An **RPM package** is a single archive that contains three things: a **header** (metadata: name, version, dependencies, file list with checksums, permissions and owners, scripts, signature), a **payload** (a compressed cpio archive of the files) and optional **scriptlets** (shell snippets run before/after install or removal, e.g. \`%post\` to create a user or reload systemd).

### NEVRA
Every package is identified by **NEVRA**: Name, Epoch, Version, Release, Architecture. For the file \`httpd-2.4.62-1.el9.x86_64.rpm\`:

- **Name** \`httpd\` — what you install and query.
- **Version** \`2.4.62\` — the upstream software version.
- **Release** \`1.el9\` — the packager's build number plus the dist tag (\`el9\` = RHEL 9). A security backport bumps the release, not the version.
- **Arch** \`x86_64\` — also \`noarch\` (scripts, docs), \`aarch64\`, \`i686\`.
- **Epoch** — an integer (usually hidden, shown as \`1:\`) that overrides version comparison when upstream renumbers.

> Red Hat **backports** fixes. A version that looks "old" (e.g. OpenSSH 8.7 on RHEL 9) may contain current CVE fixes. Judge security by \`rpm -q --changelog\` or errata, never by the upstream version alone.

### The RPM database
When rpm installs a package, it records the header in the **RPM database (rpmdb)**. Every query (\`rpm -q\`) reads this database, not the filesystem. That is why \`rpm -qf /etc/ssh/sshd_config\` answers instantly: the file path is indexed.

### rpm versus dnf
\`rpm\` is the low-level tool: it installs exactly the file you give it and **does not resolve dependencies or download anything**. \`dnf\` (Level 6 Module 2) sits on top, reads repository metadata, calculates a dependency-complete transaction and then hands it to the rpm library. In daily administration you **query and verify with rpm** and **install, update and remove with dnf**.

### Query anatomy
\`rpm -q\` takes a *selector* (what to query) and an *info option* (what to print):

- Selectors: a package name, \`-a\` (all installed), \`-f FILE\` (owner of a file), \`-p FILE.rpm\` (an uninstalled package file).
- Info options: \`-i\` (summary), \`-l\` (files), \`-c\` (config files), \`-d\` (docs), \`-R\` (requires), \`--provides\`, \`--scripts\`, \`--changelog\`, \`--queryformat\`.

Combining them is the skill: \`rpm -qcf /usr/sbin/sshd\` means "config files of the package that owns /usr/sbin/sshd".`,
          internals: `The rpmdb backend changed over time. RHEL 8 uses Berkeley DB files (\`/var/lib/rpm/Packages\`, plus index files). RHEL 9 switched to a single **SQLite** database, \`/var/lib/rpm/rpmdb.sqlite\`. RHEL 10, following Fedora, keeps the database under \`/usr/lib/sysimage/rpm\` with \`/var/lib/rpm\` retained for compatibility. Always confirm with \`rpm --eval '%_dbpath'\` rather than assuming.

Each header stores per-file metadata: path, size, mode, owner, group, mtime, digest (SHA-256 on modern packages), link target and flags such as \`%config\` or \`%doc\`. These stored values are what \`rpm -V\` compares against later. Scriptlets run as root via \`/bin/sh\` during the transaction; failures in \`%post\` are reported but usually do not roll back the files. Transactions take a lock on the database so two rpm/dnf processes cannot write at once.`,
          useCases: [
            'Audit which package installed an unexpected binary or config file during a security review',
            'Confirm the exact build (release) of openssl or kernel deployed across a fleet before and after patching',
            'Inspect an RPM delivered by a vendor (scripts, file list, dependencies) before allowing it on production',
            'List every config file of a service so that a change review or backup captures all of them'
          ],
          syntax: 'rpm -q NAME\nrpm -qa [PATTERN]\nrpm -qi NAME\nrpm -ql NAME | rpm -qc NAME | rpm -qd NAME\nrpm -qf /path/to/file\nrpm -qp --info|--list|--requires|--scripts FILE.rpm\nrpm -q --changelog NAME | head\nrpm -q --queryformat \'%{NAME}-%{VERSION}-%{RELEASE}.%{ARCH}\\n\' NAME',
          options: [
            ['-a', 'Query all installed packages (often piped to grep or sort)'],
            ['-f FILE', 'Query the package that owns FILE'],
            ['-p FILE.rpm', 'Query an uninstalled package file instead of the rpmdb'],
            ['-i / -l', 'Show package information / list all files'],
            ['-c / -d', 'List only %config files / only documentation files'],
            ['-R / --provides', 'Show capabilities the package requires / provides'],
            ['--scripts', 'Show pre/post install and uninstall scriptlets'],
            ['--last', 'Sort output by install time, newest first']
          ],
          examples: [
            {
              title: 'Which package owns a file, and what else did it install?',
              cmd: 'rpm -qf /etc/chrony.conf && rpm -qc chrony',
              out: 'chrony-4.5-3.el9.x86_64\n/etc/chrony.conf\n/etc/chrony.keys\n/etc/logrotate.d/chrony\n/etc/sysconfig/chronyd',
              fields: [
                ['chrony-4.5-3.el9.x86_64', 'Full NVRA of the owning package (epoch omitted because it is 0/unset)'],
                ['/etc/chrony.conf ...', 'Files flagged %config — the ones an admin is expected to edit and back up']
              ],
              note: 'A file that rpm -qf reports as "not owned by any package" was created by an admin, a script or a non-RPM installer.'
            },
            {
              title: 'Most recently installed or updated packages',
              cmd: 'rpm -qa --last | head -4',
              out: 'kernel-5.14.0-503.15.1.el9_5.x86_64     Tue 08 Oct 2026 02:11:43 AM IST\nkernel-modules-5.14.0-503.15.1.el9_5.x86_64 Tue 08 Oct 2026 02:11:40 AM IST\nopenssl-libs-3.2.2-6.el9_5.x86_64       Tue 08 Oct 2026 02:10:58 AM IST\nopenssl-3.2.2-6.el9_5.x86_64            Tue 08 Oct 2026 02:10:57 AM IST',
              fields: [
                ['kernel-5.14.0-503.15.1.el9_5', 'A new kernel was installed (kernels are installed side-by-side, not replaced)'],
                ['el9_5', 'Dist tag: built for RHEL 9.5'],
                ['timestamp', 'Install time from the rpmdb — useful to correlate an incident with a patch window']
              ]
            },
            {
              title: 'Inspect a vendor RPM before installing it',
              cmd: 'rpm -qp --scripts vendor-agent-3.1-2.x86_64.rpm',
              out: 'postinstall scriptlet (using /bin/sh):\nsystemctl daemon-reload\nsystemctl enable --now vendor-agent.service\ncurl -s https://vendor.example.com/register | sh',
              fields: [
                ['postinstall scriptlet', 'Runs as root after the files are written'],
                ['curl ... | sh', 'Downloads and executes remote code at install time — a red flag to escalate before approval']
              ],
              note: '-p reads the package file only; nothing is installed or executed by this query.'
            }
          ],
          walkthrough: [
            'Run `rpm -qa | wc -l` to see how many packages are installed, then `rpm -qa \'kernel*\'` to see the installed kernels.',
            'Pick a binary you use daily, e.g. `rpm -qf $(command -v ss)`, and note the owning package (iproute).',
            'Run `rpm -qi iproute` and read Version, Release, Install Date, Signature and Vendor.',
            'List its configuration files with `rpm -qc iproute` and its documentation with `rpm -qd iproute`.',
            'Show dependencies with `rpm -qR iproute`; notice shared-library capabilities such as `libc.so.6(GLIBC_2.34)(64bit)`.',
            'Print a custom report: `rpm -qa --queryformat \'%{NAME}\\t%{VERSION}-%{RELEASE}\\n\' | sort | head`.'
          ],
          lab: {
            goal: 'Build a short software inventory and trace files back to their packages on a RHEL 9/10 (or Rocky/Alma) VM.',
            steps: [
              'Confirm the database path and backend: `rpm --eval \'%_dbpath\'` and `ls -l $(rpm --eval \'%_dbpath\')`.',
              'Record installed kernels: `rpm -q kernel` (more than one line is normal).',
              'Find the owner of `/usr/bin/vim`, `/etc/fstab` and `/etc/hosts` with `rpm -qf` and note which one is owned by `setup`.',
              'Create a file `sudo touch /usr/local/bin/mytool` and run `rpm -qf /usr/local/bin/mytool` — observe "not owned by any package".',
              'Download a package without installing it: `dnf download tree` (dnf-plugins-core), then inspect it with `rpm -qpi tree-*.rpm` and `rpm -qpl tree-*.rpm`.',
              'Export an inventory: `rpm -qa --queryformat \'%{NAME},%{VERSION},%{RELEASE},%{ARCH}\\n\' | sort > ~/inventory.csv`.'
            ],
            verify: '`wc -l ~/inventory.csv` matches `rpm -qa | wc -l`; `rpm -qf /etc/fstab` prints a `setup-...` package; `rpm -q tree` reports "package tree is not installed" because -p only read the file.'
          },
          troubleshooting: {
            scenario: 'A security scanner flags /usr/local/bin/backup.sh as an unknown executable and asks which package delivered it.',
            steps: [
              'Evidence: `rpm -qf /usr/local/bin/backup.sh` returns "file ... is not owned by any package".',
              'Hypothesis: it was copied manually or by configuration management, not installed by RPM.',
              'Check provenance: `ls -l --time-style=full-iso`, `stat`, configuration-management repos, and `journalctl`/audit logs around the mtime.',
              'Fix: package it properly or document it in the CMDB; validate with `rpm -qf` once packaged.'
            ]
          },
          mistakes: [
            'Using `rpm -ivh` to install a downloaded package with dependencies — rpm does not resolve them; use `dnf install ./file.rpm`.',
            'Judging patch level by upstream version only and missing Red Hat backports — check release and changelog/errata.',
            'Forgetting `-p` when querying a .rpm file, so rpm searches the database for a package literally named after the file.',
            'Parsing `rpm -qa` human output in scripts instead of using `--queryformat` with explicit fields.'
          ],
          safety: [
            'All rpm queries are read-only and safe as a normal user; only install/erase operations need root.',
            'Inspect `--scripts` of third-party RPMs before installing: scriptlets run as root.',
            'Never delete or copy files inside the rpmdb directory by hand; back it up with `tar` only when rpm/dnf are not running.'
          ],
          distro: `RHEL 8: Berkeley DB rpmdb in \`/var/lib/rpm\`. RHEL 9: SQLite \`rpmdb.sqlite\`. RHEL 10: database relocated under \`/usr/lib/sysimage/rpm\` (compatibility path kept) — confirm with \`rpm --eval '%_dbpath'\`. Debian/Ubuntu use \`.deb\` packages tracked by dpkg in \`/var/lib/dpkg/status\`; the rough equivalent of \`rpm -qf\` is \`dpkg -S\` and of \`rpm -ql\` is \`dpkg -L\` (Module 4).`,
          challenge: {
            task: 'Without installing anything, produce a list of every **config file** belonging to the package that provides the `sshd` binary, then show which of those files the admin has modified since installation.',
            solution: `Find the owning package and its config files, then verify only those:

\`\`\`
pkg=$(rpm -qf "$(command -v sshd)")      # e.g. openssh-server-8.7p1-43.el9.x86_64
rpm -qc "$pkg"
rpm -V "$pkg" | grep ' c '               # modified %config files only
\`\`\`

Reasoning: \`rpm -qf\` maps the file to its package via the rpmdb index, \`-qc\` filters the header file list to %config entries, and \`rpm -V\` compares stored digests/attributes with disk. A line like \`S.5....T.  c /etc/ssh/sshd_config\` means size, digest and mtime changed — an expected admin edit (Lesson L06-M1-T2 explains every flag).`
          },
          interview: [
            {
              q: 'What is the difference between rpm and dnf, and when would you still use rpm directly?',
              a: 'rpm is the low-level package manager: it installs, erases, queries and verifies individual package files against the rpmdb but does not download packages or resolve dependencies. dnf reads repository metadata, solves dependencies, downloads packages and runs the transaction through the rpm library, recording history. I use rpm for queries (-qa, -qf, -qc, --changelog), verification (-V) and signature checks (-K), and dnf for anything that changes installed software.',
              mistake: 'Saying they are interchangeable, or installing with rpm -i and then forcing with --nodeps when dependencies fail.',
              followUp: 'How would you install a local RPM so its dependencies are pulled from repos? (dnf install ./pkg.rpm)'
            },
            {
              q: 'A CVE scanner says openssl on your RHEL 9 server is vulnerable because the upstream version is old. How do you check?',
              a: 'Red Hat backports fixes into the same upstream version and increments the release. I check `rpm -q openssl` for the exact release, search `rpm -q --changelog openssl | grep CVE-XXXX-YYYY`, and confirm with errata (`dnf updateinfo info` or the Red Hat CVE page). If the CVE is listed as fixed in an installed release, the finding is a false positive based on version string matching.',
              mistake: 'Immediately upgrading openssl from a third-party source to match upstream.',
              followUp: 'How would you list only security updates still pending? (dnf updateinfo list --security)'
            },
            {
              q: 'Where is the RPM database and what changed in recent RHEL releases?',
              a: 'RHEL 8 uses Berkeley DB files under /var/lib/rpm; RHEL 9 moved to a single SQLite file rpmdb.sqlite in /var/lib/rpm; RHEL 10 relocates the database under /usr/lib/sysimage/rpm with compatibility for the old path. I confirm with rpm --eval %_dbpath.',
              mistake: 'Claiming it is a plain text file that can be edited.',
              followUp: 'What would you do if rpm queries hang or report a corrupt database? (Module 5)'
            }
          ],
          revision: [
            'NEVRA = Name-Epoch:Version-Release.Arch; release includes the dist tag (el9).',
            'rpm queries the rpmdb, not the filesystem; -f maps file to package, -p reads a .rpm file.',
            '-qi info, -ql files, -qc configs, -qd docs, -qR requires, --scripts, --changelog, --last.',
            'rpm does not resolve dependencies; install with dnf, query and verify with rpm.',
            'rpmdb: RHEL 8 BDB, RHEL 9 SQLite, RHEL 10 /usr/lib/sysimage/rpm — check %_dbpath.'
          ]
        },
        {
          id: 'L06-M1-T2',
          title: 'Package verification and GPG signatures',
          minutes: 40,
          objectives: [
            'Interpret every flag in rpm -V output and separate expected changes from tampering',
            'Check package signatures with rpm -K and inspect imported GPG keys',
            'Import vendor keys safely and explain how signatures protect the supply chain',
            'Restore modified non-config files from the package safely'
          ],
          prereqs: ['L06-M1-T1'],
          concept: `Two different questions protect you from bad software:

1. **Is this package genuine?** — answered by a **GPG signature** on the package header, checked against public keys you trust.
2. **Are the installed files still what the package delivered?** — answered by **verification** (\`rpm -V\`), which compares the files on disk with the metadata stored in the rpmdb.

### Signatures
Red Hat signs every RPM with its release key. When dnf or rpm installs a package with \`gpgcheck=1\`, the signature is verified against keys imported into the rpmdb. Imported keys appear as pseudo-packages named \`gpg-pubkey-<keyid>-<date>\`. The key files shipped with the OS live in \`/etc/pki/rpm-gpg/\` (e.g. \`RPM-GPG-KEY-redhat-release\`). You import a key with \`rpm --import FILE\` — but only after confirming its fingerprint through an independent, trusted channel.

\`rpm -K file.rpm\` (alias \`--checksig\`) checks digests and signatures of a package file before you install it. Output \`digests signatures OK\` means the header digest is intact and the signature verified against an imported key. \`NOT OK\` or \`(MISSING KEYS)\` means stop and investigate.

### Verification
\`rpm -V NAME\` (or \`-Va\` for everything) prints **nothing** for files that match. For each difference it prints an 8–9 character string, an optional file-type letter, and the path:

\`\`\`
S.5....T.  c /etc/ssh/sshd_config
\`\`\`

Each position is a test; a dot means passed:
- **S** size differs, **M** mode (permissions/type), **5** digest (content), **D** device major/minor
- **L** symlink target, **U** user owner, **G** group owner, **T** mtime, **P** capabilities

The letter after the flags is the file attribute: **c** config, **d** documentation, **g** ghost, **l** license, **r** readme. \`missing\` means the file is gone.

### Reading results like an investigator
- \`S.5....T. c /etc/...\` — an admin edited a config file. Normal.
- \`..5....T.  /usr/bin/ls\` — a **binary** changed content. Not normal: possible tampering or a failed update.
- \`.M.......  /usr/bin/passwd\` — permissions changed (e.g. setuid removed). Breaks functionality or weakens security.
- \`.....UG..  /var/www/...\` — ownership drift, common after manual \`chown -R\`.

> rpm -V depends on the rpmdb being trustworthy. On a host you suspect is compromised, verify from known-good media or compare digests against packages fetched from the vendor — an attacker with root can also alter the rpmdb.`,
          internals: `During installation rpm stores, per file, the digest (SHA-256 for modern packages), size, mode, uid/gid names, mtime, rdev, link target, file capabilities and flags. \`rpm -V\` stats each path and hashes regular files, then compares. Config files marked \`%config(noreplace)\` are never overwritten on update when modified; the new version is saved as \`.rpmnew\`. Files marked plain \`%config\` are replaced and the old copy saved as \`.rpmsave\`.

Signature verification uses rpm's OpenPGP implementation (on RHEL 9/10 the Sequoia-based backend) against keys in the rpmdb keyring. RHEL 9 system-wide crypto policies reject SHA-1-based signatures by default, so old third-party packages signed with SHA-1 fail to install until the vendor re-signs them.`,
          useCases: [
            'Post-incident check of system binaries after a suspected intrusion (as one input, not the only one)',
            'Detecting configuration drift on a fleet by comparing rpm -V output against a baseline',
            'Validating that a vendor-supplied RPM is signed by the expected key before approval',
            'Repairing permissions broken by an accidental recursive chmod/chown under /usr or /etc'
          ],
          syntax: 'rpm -V NAME | rpm -Va | rpm -Vf /path\nrpm -K FILE.rpm   (same as rpm --checksig)\nrpm -qa gpg-pubkey*\nrpm -qi gpg-pubkey-KEYID-DATE\nrpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release\nrpm --setperms NAME ; rpm --setugids NAME\ndnf reinstall NAME',
          options: [
            ['-V NAME', 'Verify the installed files of one package'],
            ['-Va', 'Verify every installed package (slow, I/O heavy)'],
            ['-Vf PATH', 'Verify the package that owns PATH'],
            ['-K / --checksig', 'Check digests and signatures of a package file'],
            ['--import KEY', 'Import an ASCII-armoured public key into the rpmdb keyring'],
            ['--setperms / --setugids', 'Reset modes / owners of package files to rpmdb values'],
            ['--nosignature / --nodigest', 'Skip checks (debugging only, never as a workaround)']
          ],
          examples: [
            {
              title: 'Verify a package after an incident',
              cmd: 'rpm -V coreutils openssh-server',
              out: '..5....T.    /usr/bin/ls\nS.5....T.  c /etc/ssh/sshd_config\nmissing     /usr/share/man/man1/scp.1.gz',
              fields: [
                ['..5....T.  /usr/bin/ls', 'Content and mtime of a system binary changed — escalate: tampering or corruption'],
                ['S.5....T. c', 'Size, digest and mtime of a config file changed — expected after admin edits'],
                ['missing', 'File deleted (here a man page, possibly due to tsflags=nodocs or manual cleanup)']
              ],
              note: 'Treat a changed binary as evidence for incident response; preserve it before reinstalling.'
            },
            {
              title: 'Check a package file before install',
              cmd: 'rpm -K ./zabbix-agent2-7.0.4-release1.el9.x86_64.rpm',
              out: './zabbix-agent2-7.0.4-release1.el9.x86_64.rpm: digests SIGNATURES NOT OK',
              fields: [
                ['digests', 'Header/payload digests computed fine'],
                ['SIGNATURES NOT OK', 'Signature could not be verified — usually the vendor key is not imported, or the file is not genuine']
              ],
              note: 'Import the vendor key only after verifying its fingerprint from the vendor website/out-of-band, then re-run rpm -K. With -v rpm shows the key ID it needs.'
            },
            {
              title: 'List trusted keys',
              cmd: "rpm -qa gpg-pubkey* --qf '%{NAME}-%{VERSION}-%{RELEASE}\\t%{SUMMARY}\\n'",
              out: 'gpg-pubkey-fd431d51-4ae0493b\tRed Hat, Inc. (release key 2) <security@redhat.com> public key\ngpg-pubkey-5a6340b3-6229229e\tRed Hat, Inc. (auxiliary key 3) <security@redhat.com> public key',
              fields: [
                ['fd431d51', 'Short key ID (last 8 hex digits of the fingerprint)'],
                ['SUMMARY', 'Key owner UID — confirms who the key belongs to']
              ]
            }
          ],
          walkthrough: [
            'Run `rpm -V openssh-server` — note there is usually no output on an untouched system.',
            'Edit a harmless comment into `/etc/ssh/sshd_config` (after `cp -a` backup) and re-run; observe `S.5....T.  c`.',
            'Change a mode: `sudo chmod 600 /usr/bin/tree` (install tree first) and run `rpm -V tree`; observe `.M.......`.',
            'Repair modes with `sudo rpm --setperms tree` and confirm `rpm -V tree` is silent again.',
            'List keys with `rpm -qa gpg-pubkey*` and inspect one with `rpm -qi`.',
            'Download a package with `dnf download tree` and check it with `rpm -Kv tree-*.rpm`.'
          ],
          lab: {
            goal: 'Detect, explain and repair file drift using rpm verification, and validate package signatures, on a RHEL 9/10 VM.',
            steps: [
              'Take a VM snapshot (the lab changes system files). Install a test package: `sudo dnf install -y tree`.',
              'Simulate drift: `sudo chmod 700 /usr/bin/tree` and `sudo chown nobody /usr/bin/tree`.',
              'Run `rpm -V tree` and write down which flags appear (expect `.M...U...` — mode and user changed, mtime unchanged).',
              'Repair: `sudo rpm --setugids tree && sudo rpm --setperms tree`, then `rpm -V tree` again.',
              'Simulate content corruption: `echo junk | sudo tee -a /usr/bin/tree >/dev/null`, verify (expect S and 5), then repair with `sudo dnf reinstall -y tree`.',
              'Signature check: `dnf download tree && rpm -Kv tree-*.rpm` and identify the key ID; match it in `rpm -qa gpg-pubkey*`.'
            ],
            verify: '`rpm -V tree` prints nothing and exits 0 (`echo $?`), `tree --version` works, and `rpm -K tree-*.rpm` reports `digests signatures OK`.'
          },
          troubleshooting: {
            scenario: 'After a junior admin ran `chmod -R 755 /usr/bin` to "fix a permission problem", `sudo` and `passwd` stopped working for normal users.',
            steps: [
              'Evidence: `rpm -Vf /usr/bin/sudo /usr/bin/passwd` shows `.M.......` — mode changed; `ls -l` shows setuid bit missing.',
              'Hypothesis: recursive chmod cleared setuid/setgid bits on many binaries.',
              'Fix: identify all affected packages with `rpm -Va | awk \'$1 ~ /M/ {print $NF}\' | grep ^/usr/bin | xargs rpm -qf | sort -u`, then `rpm --setperms` each (or `dnf reinstall`).',
              'Validate: `rpm -Va` shows no M flags under /usr/bin; `sudo -l` and `passwd` work for a test user.'
            ]
          },
          mistakes: [
            'Treating any rpm -V output as compromise — modified %config files are expected; focus on binaries and libraries.',
            'Running `rpm --import` on a key downloaded from the same untrusted URL as the package without checking the fingerprint.',
            'Setting `gpgcheck=0` or using `--nosignature` to make an install "work" — this disables the supply-chain control.',
            'Running `rpm --setperms` on a package whose config files were intentionally hardened (it resets those modes too).'
          ],
          safety: [
            '`rpm -V` and `rpm -K` are read-only. `--setperms`, `--setugids`, `--import` and reinstall need root and change the system.',
            'On a suspected compromise, preserve evidence (image/snapshot, copy suspicious binaries) before reinstalling packages.',
            '`rpm -Va` reads every file — run it off-peak on busy I/O-bound servers.'
          ],
          distro: `RHEL 9 and later enforce crypto policies that reject SHA-1 signatures by default; RHEL 8 accepted them. Red Hat keys ship in \`/etc/pki/rpm-gpg/\` and are imported on first use by dnf. Debian/Ubuntu verify repository **metadata** signatures (Release/InRelease files) rather than individual .deb files; per-file verification is done with \`dpkg --verify\` or the \`debsums\` tool.`,
          challenge: {
            task: 'Write a one-liner that lists only the **non-config, non-documentation** files whose **content digest** changed across all installed packages, with the owning package name next to each.',
            solution: `\`\`\`
sudo rpm -Va 2>/dev/null | awk '$1 ~ /5/ && $2 !~ /^[cd]$/ {print $NF}' | while read -r f; do printf '%s\\t%s\\n' "$(rpm -qf "$f")" "$f"; done
\`\`\`

Reasoning: rpm -V prints the attribute letter (c, d, g, l, r) as a separate field only when present, so a line with the file in field 2 has no attribute. \`$1 ~ /5/\` selects digest changes, the second test excludes config and doc files, and \`rpm -qf\` maps each path back to its package. Changed binaries/libraries are the high-value findings for an integrity review.`
          },
          interview: [
            {
              q: 'Explain the output `S.5....T.  c /etc/httpd/conf/httpd.conf` from rpm -V.',
              a: 'It is a %config file (c) whose size (S), content digest (5) and modification time (T) differ from what the package installed; mode, owner, group, device, link target and capabilities are unchanged (dots). That is the normal signature of an admin edit and not by itself a concern.',
              mistake: 'Saying the file is corrupted or that the package must be reinstalled.',
              followUp: 'What would the same flags on /usr/sbin/httpd suggest?'
            },
            {
              q: 'How do you safely add a third-party repository GPG key?',
              a: 'Obtain the key from the vendor over HTTPS, verify its fingerprint against an independent source (vendor documentation, a second channel, or a key server you trust), save it under /etc/pki/rpm-gpg/, reference it with gpgkey= in the .repo file and keep gpgcheck=1 so dnf imports and enforces it. Then confirm with rpm -qa gpg-pubkey* and test with rpm -K on a downloaded package.',
              mistake: 'Disabling gpgcheck to make installation succeed.',
              followUp: 'How would you remove a key you no longer trust? (rpm -e gpg-pubkey-KEYID-DATE)'
            },
            {
              q: 'Is rpm -V enough to prove a server has not been compromised?',
              a: 'No. It only compares files against the local rpmdb, which a root-level attacker can modify, and it ignores files not owned by packages, running processes, kernel modules and data. It is a useful signal; a real investigation uses known-good media or offline comparison, logs, audit records and memory/process analysis.',
              mistake: 'Answering yes because rpm -V is silent.',
              followUp: 'How could you verify against a trusted reference? (compare digests from a clean host or downloaded vendor RPMs)'
            }
          ],
          revision: [
            'rpm -V prints nothing for matching files; flags: S M 5 D L U G T P; attribute c=config d=doc.',
            'Changed config files are normal; changed binaries/libraries need investigation.',
            'rpm -K checks a package file signature; imported keys are gpg-pubkey-* pseudo-packages.',
            'Verify key fingerprints out-of-band before rpm --import; never set gpgcheck=0 as a fix.',
            'Repair drift with rpm --setperms/--setugids or dnf reinstall (after preserving evidence).'
          ]
        }
      ]
    },
    {
      id: 'L06-M2', title: 'DNF and repositories',
      summary: 'Use dnf to search, install and remove software with automatic dependency resolution, and configure the repositories and GPG keys it trusts.',
      lessons: [
        {
          id: 'L06-M2-T1',
          title: 'DNF essentials: search, install, remove and provides',
          minutes: 40,
          objectives: [
            'Install, reinstall and remove packages and package groups with dnf',
            'Find packages by name, description or by the file/capability they provide',
            'Install a local RPM with dependency resolution',
            'Explain the relationship between yum and dnf on RHEL 8/9/10'
          ],
          prereqs: ['L06-M1-T1'],
          concept: `**DNF** (Dandified YUM) is the high-level package manager on RHEL 8, 9 and 10. On these releases \`yum\` is simply a compatibility name that runs dnf, so old runbooks keep working.

### What dnf does for every transaction
1. Reads its configuration (\`/etc/dnf/dnf.conf\`) and repository definitions (\`/etc/yum.repos.d/*.repo\`).
2. Loads repository **metadata** (package lists, dependencies, file lists, errata), downloading it if the local cache is stale.
3. Runs the **dependency solver** (libsolv) to compute a complete, consistent set of packages to install, upgrade or remove.
4. Shows the transaction summary and asks for confirmation (\`-y\` answers yes).
5. Downloads packages, **verifies signatures**, and runs the transaction through the rpm library.
6. Records the transaction in its **history database** so you can audit and undo it (Module 3).

### Finding software
You often know a command or file, not the package name:
- \`dnf search KEYWORD\` — searches names and summaries.
- \`dnf provides /usr/sbin/semanage\` or \`dnf provides '*/semanage'\` — which package delivers a file (also works for capabilities such as \`libssl.so.3\`).
- \`dnf info NAME\` — version, repo, size, summary, license.
- \`dnf list installed | available | --upgrades\` — inventory views.
- \`dnf repoquery --requires NAME\` / \`--whatrequires NAME\` — dependency questions without installing.

### Installing and removing
- \`dnf install NAME\` installs the package plus dependencies; \`dnf install ./local.rpm\` does the same for a downloaded file (prefer this over \`rpm -i\`).
- \`dnf reinstall NAME\` rewrites the files of an installed package (repair).
- \`dnf remove NAME\` removes it *and* packages that depend on it — **read the summary**; removing a core library can remove half the system.
- \`dnf autoremove\` removes dependencies that were pulled in automatically and are no longer needed (\`clean_requirements_on_remove=True\` is the default on RHEL).
- **Groups** bundle packages for a role: \`dnf group list\`, \`dnf group install "Development Tools"\`.

> dnf marks packages as **user-installed** or **dependency**. That reason is what \`autoremove\` uses — check it with \`dnf repoquery --userinstalled\` or \`dnf history userinstalled\`.`,
          internals: `dnf (Python, on top of libdnf/libsolv/librepo) caches metadata under \`/var/cache/dnf/<repo>-<hash>/\`. The \`metadata_expire\` setting decides when it refreshes. The solver turns every package's Requires/Provides/Conflicts/Obsoletes into a satisfiability problem; that is why it can explain conflicts precisely ("Problem: package X requires Y, but none of the providers can be installed").

Downloaded packages go to the cache and are deleted after a successful transaction unless \`keepcache=True\`. Installation reasons and transaction history live in an SQLite database under \`/var/lib/dnf/\` (history.sqlite). A single process lock prevents two dnf instances from running together; a second instance waits for the lock. Fedora 41+ ships **DNF5** (C++), which RHEL 9/10 do not use — some options and output formats differ there.`,
          useCases: [
            'Building a web server role: `dnf install httpd mod_ssl` with all dependencies resolved and signature-checked',
            'Finding which package provides a missing command on a minimal install (`dnf provides`)',
            'Installing a vendor RPM while pulling its dependencies from Red Hat repositories',
            'Cleaning up unused dependencies on long-lived servers with `dnf autoremove` after reviewing the list'
          ],
          syntax: 'dnf search KEYWORD\ndnf info NAME\ndnf provides PATH|CAPABILITY\ndnf list installed|available|--upgrades [PATTERN]\ndnf install [-y] NAME... | ./file.rpm\ndnf reinstall NAME\ndnf remove NAME\ndnf autoremove\ndnf group list | dnf group install "GROUP"\ndnf repoquery --requires|--whatrequires NAME',
          options: [
            ['-y / --assumeyes', 'Answer yes to the confirmation prompt (scripts, automation)'],
            ['--assumeno', 'Show what would happen and answer no (safe dry run)'],
            ['--downloadonly', 'Download packages without installing (pre-stage for a change window)'],
            ['--repo / --enablerepo / --disablerepo', 'Restrict or change repos for this command only'],
            ['-q / -v', 'Quiet / verbose output'],
            ['--setopt=KEY=VALUE', 'Override a dnf.conf or repo option for one run'],
            ['--exclude=PATTERN', 'Exclude packages from this transaction']
          ],
          examples: [
            {
              title: 'Find which package provides a missing command',
              cmd: 'dnf provides semanage',
              out: 'policycoreutils-python-utils-3.6-2.1.el9.noarch : SELinux policy core python utilities\nRepo        : rhel-9-for-x86_64-baseos-rpms\nMatched from:\nFilename    : /usr/sbin/semanage',
              fields: [
                ['policycoreutils-python-utils', 'The package to install'],
                ['Repo', 'Repository that offers it (BaseOS here)'],
                ['Matched from: Filename', 'The match came from repository file lists, not from the package name']
              ]
            },
            {
              title: 'Dry-run a removal to see its blast radius',
              cmd: 'sudo dnf remove --assumeno python3-libs',
              out: 'Removing:\n python3-libs        x86_64  3.9.19-8.el9   @baseos  32 M\nRemoving dependent packages:\n dnf                 noarch  4.14.0-17.el9  @baseos  2.3 M\n firewalld           noarch  1.3.4-7.el9    @baseos  2.6 M\n ...\nTransaction Summary\nRemove  127 Packages\nOperation aborted.',
              fields: [
                ['Removing dependent packages', 'Everything that requires python3-libs would be removed too, including dnf itself'],
                ['Remove 127 Packages', 'The size of the blast radius — a clear signal to abort'],
                ['Operation aborted', '--assumeno answered no: nothing changed']
              ],
              note: 'dnf protects some packages (protected_packages, e.g. dnf, systemd, the running kernel) and refuses to remove them; still read every summary.'
            },
            {
              title: 'Install a vendor RPM with dependencies',
              cmd: 'sudo dnf install ./vendor-agent-3.1-2.el9.x86_64.rpm',
              out: 'Installing:\n vendor-agent      x86_64  3.1-2.el9   @commandline  12 M\nInstalling dependencies:\n libnsl2           x86_64  2.0.0-1.el9 appstream     30 k\n...\nIs this ok [y/N]:',
              fields: [
                ['@commandline', 'The package came from the local file, not a repository'],
                ['Installing dependencies', 'Pulled automatically from enabled repos — rpm -i would have failed instead']
              ]
            }
          ],
          walkthrough: [
            'Check that yum and dnf are the same tool: `ls -l /usr/bin/yum` (symlink to dnf-3 on RHEL 9).',
            'Search: `dnf search "web server"` and `dnf info nginx`.',
            'Find a provider: `dnf provides \'*/bin/dig\'` (bind-utils).',
            'Install with dependencies: `sudo dnf install -y bind-utils`, then confirm with `rpm -q bind-utils`.',
            'Review install reasons: `dnf repoquery --userinstalled | grep bind`.',
            'Remove and clean: `sudo dnf remove -y bind-utils` then `sudo dnf autoremove --assumeno` to preview leftovers.'
          ],
          lab: {
            goal: 'Use dnf to locate, install, inspect and cleanly remove software on a RHEL 9/10 VM with working repositories.',
            steps: [
              'Confirm repositories are available: `dnf repolist` (at least BaseOS and AppStream).',
              'Find which package provides `/usr/bin/tmux` and install it: `dnf provides /usr/bin/tmux` then `sudo dnf install -y tmux`.',
              'List what tmux requires and what requires it: `dnf repoquery --requires tmux` and `dnf repoquery --installed --whatrequires tmux`.',
              'Install a group: `sudo dnf group install -y "Development Tools"` (on RHEL 10 check `dnf group list` for the exact name).',
              'Preview a removal with `sudo dnf remove --assumeno gcc` and read the dependent packages.',
              'Remove tmux and verify no orphans remain with `sudo dnf autoremove`.'
            ],
            verify: '`rpm -q tmux` returns "package tmux is not installed"; `dnf history list | head` shows the install and remove transactions; `gcc --version` works.'
          },
          troubleshooting: {
            scenario: 'A runbook says `yum install mysql`, but on RHEL 9 the command fails with "No match for argument: mysql".',
            steps: [
              'Evidence: `dnf search mysql` and `dnf provides mysql` show packages named `mysql-server` and `mysql` client may live in AppStream; `dnf repolist` shows whether AppStream is enabled.',
              'Hypothesis: the package name changed or AppStream is disabled.',
              'Fix: enable the correct repo (`subscription-manager repos --enable rhel-9-for-x86_64-appstream-rpms` or `dnf config-manager --enable appstream` on Rocky/Alma) and install the right name, e.g. `dnf install mysql-server`.',
              'Validate: `rpm -q mysql-server`, `systemctl status mysqld`.'
            ]
          },
          mistakes: [
            'Confirming a `dnf remove` without reading "Removing dependent packages" — can uninstall critical services.',
            'Using `rpm -ivh --nodeps` for a local package instead of `dnf install ./pkg.rpm`.',
            'Running `dnf autoremove -y` blindly on production — it may remove something a script relies on but that was installed as a dependency.',
            'Assuming `dnf search` searches file names — use `dnf provides` for files.'
          ],
          safety: [
            'Install/remove/upgrade require root; search, info, list, provides and repoquery do not (they may still refresh metadata).',
            'Use `--assumeno` to preview risky removals, and take a snapshot/backup before large changes.',
            'Run package changes in a change window; dnf history records them for audit and undo.'
          ],
          distro: `RHEL 8/9/10: dnf (DNF4) with \`yum\` as an alias. RHEL 7 used the original Python 2 yum. Fedora 41+ uses DNF5 (different output; some plugins renamed). Debian/Ubuntu equivalents: \`apt install\`, \`apt remove\`, \`apt search\`, and \`apt-file search\` for file-to-package lookups (Module 4).`,
          challenge: {
            task: 'A minimal RHEL server lacks the `sar` command. Find the package, install it, and prove that the data collection timer is active, without guessing the package name.',
            solution: `\`\`\`
dnf provides '*/bin/sar'          # -> sysstat
sudo dnf install -y sysstat
rpm -ql sysstat | grep -E 'timer|service'
sudo systemctl enable --now sysstat.service sysstat-collect.timer sysstat-summary.timer
systemctl list-timers 'sysstat*'
\`\`\`

Reasoning: \`dnf provides\` searches file lists in the repo metadata, so the glob finds the binary regardless of path. \`rpm -ql\` shows the units the package shipped, and \`list-timers\` proves collection is scheduled. Validate with \`sar -u 1 3\`.`
          },
          interview: [
            {
              q: 'What happens, step by step, when you run dnf install httpd?',
              a: 'dnf reads dnf.conf and the enabled .repo files, refreshes metadata if expired, resolves httpd and all its Requires with the libsolv solver, shows the transaction, downloads the packages to the cache, verifies GPG signatures against imported keys (importing configured keys if needed), runs the rpm transaction including scriptlets, then records the transaction in dnf history.',
              mistake: 'Saying it just downloads and unpacks the RPM.',
              followUp: 'Where would you look if it failed during metadata download?'
            },
            {
              q: 'How do you find which package provides a command that is missing?',
              a: 'dnf provides with the path or a glob, for example dnf provides \'*/bin/dig\'. It searches the file lists in the repository metadata. For an installed file I would use rpm -qf instead.',
              mistake: 'Using dnf search, which only matches names and summaries.',
              followUp: 'What is the Debian equivalent? (apt-file search, or dpkg -S for installed files)'
            },
            {
              q: 'Why is dnf remove dangerous on a production server?',
              a: 'Because it removes every installed package that depends on the target, recursively. Removing a shared library or language runtime can remove system tools and services. I preview with --assumeno, read the dependent package list, and prefer leaving the package installed if unsure.',
              mistake: 'Saying it only removes the named package.',
              followUp: 'Which dnf setting prevents removal of essential packages? (protected_packages)'
            }
          ],
          revision: [
            'yum on RHEL 8/9/10 is an alias for dnf.',
            'dnf: metadata -> solver -> download -> signature check -> rpm transaction -> history.',
            'search = names/summaries; provides = files/capabilities; repoquery = dependency questions.',
            'Install local RPMs with dnf install ./file.rpm; preview risky changes with --assumeno.',
            'Read "Removing dependent packages" before confirming any dnf remove.'
          ]
        },
        {
          id: 'L06-M2-T2',
          title: 'Repository configuration, GPG keys and AppStream',
          minutes: 45,
          objectives: [
            'Write and audit .repo files (baseurl/metalink, enabled, gpgcheck, gpgkey)',
            'Enable, disable and list repositories with dnf, dnf config-manager and subscription-manager',
            'Create a local repository from installation media for offline systems',
            'Explain BaseOS, AppStream and module streams, including their removal in RHEL 10'
          ],
          prereqs: ['L06-M2-T1'],
          concept: `A **repository** is a directory (HTTP/HTTPS, FTP, NFS or a local path) containing RPM packages and a \`repodata/\` folder of **metadata**. The entry point is \`repodata/repomd.xml\`, which lists checksums of the other metadata files (primary, filelists, updateinfo, comps groups, modules). dnf downloads repomd.xml first and trusts the rest via its checksums.

### Where repositories are defined
Each file in \`/etc/yum.repos.d/\` ending in \`.repo\` contains one or more sections:

\`\`\`
[appstream-local]
name=Local AppStream from ISO
baseurl=file:///mnt/iso/AppStream
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
\`\`\`

- **[id]** — unique repo ID used with \`--enablerepo\`/\`--repo\`.
- **baseurl** — direct location; alternatives are **metalink** or **mirrorlist** (lists of mirrors).
- **enabled** — 1/0.
- **gpgcheck** — verify package signatures (keep it 1). **repo_gpgcheck** additionally verifies signed metadata if the repo publishes it.
- **gpgkey** — URL/path of the key(s) to import when a package from this repo is first installed.
- Optional: \`priority\`, \`cost\`, \`exclude\`, \`sslverify\`, \`proxy\`, \`metadata_expire\`, \`skip_if_unavailable\`.

Global defaults live in \`/etc/dnf/dnf.conf\` under \`[main]\`.

### Red Hat repositories
On subscribed RHEL systems, \`subscription-manager\` generates \`/etc/yum.repos.d/redhat.repo\`; **do not edit it by hand** — use \`subscription-manager repos --enable/--disable\`. Core content is split into:
- **BaseOS** — the core operating system, supported for the life of the release.
- **AppStream** — applications, languages and databases, possibly with different life cycles.

### Module streams (RHEL 8/9 only)
RHEL 8 and 9 AppStream use **modules**: alternative versions of a component (e.g. \`nodejs:18\`, \`nodejs:20\`) managed with \`dnf module list | enable | install | reset\`. **RHEL 10 removes modularity**: alternative versions are delivered as normally named packages (e.g. versioned package names) instead. Exam objectives and runbooks that use \`dnf module\` apply to RHEL 8/9 only.

### Local repository from ISO (exam and air-gapped classic)
Mount the DVD ISO (persistently via /etc/fstab if needed) and create two repos pointing at \`BaseOS\` and \`AppStream\` on the media. The media already contains \`repodata\`; \`createrepo_c\` is only needed for your own directory of RPMs.`,
          internals: `\`dnf makecache\` downloads repomd.xml and the referenced metadata into \`/var/cache/dnf/\`. If repomd.xml cannot be fetched or its checksums do not match, the repo fails ("Failed to download metadata for repo"). With \`skip_if_unavailable=False\` (the RHEL default) a single failing enabled repo aborts the whole command, which is a safety choice: silently ignoring a repo can make dnf pick older or third-party versions.

\`dnf config-manager\` (from dnf-plugins-core) edits .repo files: \`--add-repo URL\` creates a file, \`--set-enabled/--set-disabled ID\` flips enabled=. For redhat.repo, subscription-manager owns the file and rewrites it, so manual edits are lost. Priority (lower number wins) decides between repos offering the same package; otherwise the highest version wins.`,
          useCases: [
            'Air-gapped data centres: point servers to an internal mirror or a mounted ISO',
            'Restricting production to approved repos and pinning third-party repos with priority/exclude',
            'Enabling CodeReady Builder or Supplementary repos for build dependencies via subscription-manager',
            'Selecting a supported language runtime version (module stream on RHEL 8/9; versioned packages on RHEL 10)'
          ],
          syntax: 'dnf repolist [--all] [-v]\ndnf repoinfo ID\ndnf config-manager --add-repo URL|FILE\ndnf config-manager --set-enabled|--set-disabled ID\ndnf --enablerepo=ID --disablerepo=ID ...\nsubscription-manager repos --list-enabled | --enable ID | --disable ID\ndnf clean all ; dnf makecache\ndnf module list|enable|install|reset NAME[:STREAM]   (RHEL 8/9)',
          options: [
            ['repolist --all', 'Show enabled and disabled repos'],
            ['repolist -v / repoinfo', 'Show baseurl, metadata age, package count, expiry'],
            ['--enablerepo / --disablerepo', 'Temporarily change repos for one command (globs allowed)'],
            ['--repo=ID', 'Use only this repo for the command'],
            ['config-manager --add-repo', 'Create a .repo file from a URL (dnf-plugins-core)'],
            ['clean all / makecache', 'Drop cached metadata and packages / rebuild the cache'],
            ['--nogpgcheck', 'Skip signature checks for one command (lab use only; never production)']
          ],
          examples: [
            {
              title: 'Audit enabled repositories',
              cmd: 'dnf repolist -v --enabled | grep -E "Repo-id|Repo-baseurl|Repo-updated|Repo-pkgs"',
              out: 'Repo-id            : appstream-local\nRepo-updated       : Thu 15 May 2025 10:02:11 AM IST\nRepo-pkgs          : 5,331\nRepo-baseurl       : file:///mnt/iso/AppStream\nRepo-id            : baseos-local\nRepo-updated       : Thu 15 May 2025 10:01:40 AM IST\nRepo-pkgs          : 1,098\nRepo-baseurl       : file:///mnt/iso/BaseOS',
              fields: [
                ['Repo-id', 'ID from the [section] header of the .repo file'],
                ['Repo-baseurl', 'Where packages come from — confirm it is an approved source'],
                ['Repo-pkgs', 'Number of packages; 0 usually means wrong path (pointed at the ISO root instead of BaseOS/AppStream)']
              ]
            },
            {
              title: 'Local repo file for a mounted ISO',
              cmd: 'cat /etc/yum.repos.d/local-iso.repo',
              out: '[baseos-local]\nname=BaseOS (ISO)\nbaseurl=file:///mnt/iso/BaseOS\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release\n\n[appstream-local]\nname=AppStream (ISO)\nbaseurl=file:///mnt/iso/AppStream\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release',
              fields: [
                ['baseurl=file:///mnt/iso/BaseOS', 'Points to the directory that contains repodata/, not the ISO root'],
                ['gpgcheck=1 + gpgkey', 'Signature enforcement with the vendor key shipped in the OS']
              ]
            },
            {
              title: 'Module streams on RHEL 9',
              cmd: 'dnf module list nodejs',
              out: 'Red Hat Enterprise Linux 9 for x86_64 - AppStream (RPMs)\nName    Stream  Profiles                     Summary\nnodejs  18      common [d], development, ... Javascript runtime\nnodejs  20      common [d], development, ... Javascript runtime\nnodejs  22      common [d], development, ... Javascript runtime\nHint: [d]efault, [e]nabled, [x]disabled, [i]nstalled',
              fields: [
                ['Stream', 'Alternative major versions'],
                ['[d] / [e]', 'Default profile / enabled stream'],
                ['Hint line', 'Legend for flags']
              ],
              note: 'On RHEL 9 the non-module nodejs package is the default version; enabling a stream switches to it. On RHEL 10 there is no dnf module command — use the versioned packages in AppStream.'
            }
          ],
          walkthrough: [
            'List repos: `dnf repolist --all` and identify which are enabled.',
            'Read the definitions: `grep -H "" /etc/yum.repos.d/*.repo | less` (redhat.repo is generated on subscribed systems).',
            'Disable a repo temporarily for one command: `dnf --disablerepo="*" --enablerepo=baseos* list available | head`.',
            'Add a repo with config-manager: `sudo dnf config-manager --add-repo http://repo.example.lab/rhel9/BaseOS` and inspect the generated file.',
            'Add `gpgcheck=1` and `gpgkey=` to the generated file (config-manager does not set them), then `dnf clean all && dnf makecache`.',
            'Check package origin: `dnf info bash` and look at the From repo / Repository line.'
          ],
          lab: {
            goal: 'Build a working local repository from the RHEL/Rocky/Alma DVD ISO (the classic offline/exam setup).',
            steps: [
              'Attach the DVD ISO to the VM. Create the mount point and mount: `sudo mkdir -p /mnt/iso && sudo mount -o ro /dev/sr0 /mnt/iso` (or `mount -o loop,ro file.iso /mnt/iso`).',
              'Make it persistent: add `/dev/sr0 /mnt/iso iso9660 ro,nofail 0 0` to /etc/fstab, then `sudo systemctl daemon-reload && sudo mount -a`.',
              'Create `/etc/yum.repos.d/local-iso.repo` with two sections for BaseOS and AppStream as in the example, `gpgcheck=1` and the release key.',
              'Optionally disable network repos for the test: `sudo dnf config-manager --set-disabled "*"` is too broad on subscribed hosts — instead use `--disablerepo` per command.',
              'Run `sudo dnf clean all && dnf repolist -v` and confirm non-zero package counts for both repos.',
              'Install from the local repo only: `sudo dnf --disablerepo="*" --enablerepo="*-local" install -y tree`.'
            ],
            verify: '`dnf info --installed tree | grep -i repo` (or `dnf list installed tree`) shows `@appstream-local` or `@baseos-local`; `findmnt /mnt/iso` shows the media mounted; a reboot keeps the repo usable.'
          },
          troubleshooting: {
            scenario: 'After adding a local repo, `dnf install tree` fails with "Cannot download repomd.xml: Curl error (37): Couldn\'t read a file:// file for file:///mnt/iso/repodata/repomd.xml".',
            steps: [
              'Evidence: the URL ends in `/mnt/iso/repodata` — dnf looked in the ISO root.',
              'Hypothesis: baseurl points to the ISO root; RHEL 8+ media keeps repodata inside `BaseOS/` and `AppStream/`. Also confirm the ISO is mounted with `findmnt /mnt/iso`.',
              'Fix: set `baseurl=file:///mnt/iso/BaseOS` and a second repo for AppStream; `dnf clean all`.',
              'Validate: `dnf repolist -v` shows package counts; `dnf install tree` succeeds.'
            ]
          },
          mistakes: [
            'Editing /etc/yum.repos.d/redhat.repo by hand — subscription-manager overwrites it; use `subscription-manager repos`.',
            'Pointing baseurl at the ISO root instead of BaseOS/AppStream subdirectories.',
            'Adding repos with config-manager and forgetting that gpgcheck/gpgkey are not set — then "fixing" errors with gpgcheck=0.',
            'Using `dnf module` commands in RHEL 10 runbooks — modularity was removed.',
            'Mounting an ISO without nofail in /etc/fstab, so the server drops to emergency mode if the media is detached.'
          ],
          safety: [
            'Creating and editing .repo files requires root and changes where software comes from — treat it as a security change.',
            'Only add repos from trusted sources and always keep gpgcheck=1 with a verified key.',
            'Keep /etc/fstab entries for removable media non-fatal (`nofail`) and test with `mount -a` / `findmnt --verify` before rebooting.'
          ],
          distro: `RHEL 8/9: BaseOS + AppStream with module streams in AppStream (\`dnf module\`). RHEL 10: BaseOS + AppStream, **no modularity** — alternative versions ship as separate packages. Repo IDs on subscribed RHEL look like \`rhel-9-for-x86_64-baseos-rpms\`; on Rocky/Alma they are \`baseos\`, \`appstream\`, \`crb\`, \`extras\`. Debian/Ubuntu use \`/etc/apt/sources.list\` and \`/etc/apt/sources.list.d/\` (one-line or deb822 \`.sources\` format) — Module 4.`,
          challenge: {
            task: 'Configure a repository called `internal-tools` at `http://repo.example.lab/tools/el9/` that is signed with a key at `http://repo.example.lab/keys/RPM-GPG-KEY-internal`. It must never supply `kernel*` or `openssl*` packages and must lose to Red Hat repos when both offer the same package.',
            solution: `\`\`\`
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-internal http://repo.example.lab/keys/RPM-GPG-KEY-internal
gpg --show-keys /etc/pki/rpm-gpg/RPM-GPG-KEY-internal   # compare fingerprint with the internal PKI record
sudo tee /etc/yum.repos.d/internal-tools.repo <<'EOF'
[internal-tools]
name=Internal tools for EL9
baseurl=http://repo.example.lab/tools/el9/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-internal
exclude=kernel* openssl*
priority=150
EOF
sudo dnf makecache --repo internal-tools
dnf repoinfo internal-tools
\`\`\`

Reasoning: a local copy of the key whose fingerprint was verified avoids trusting a URL blindly; \`exclude\` stops the repo from ever offering critical packages; \`priority\` defaults to 99 and a **higher** number means **lower** priority, so 150 loses to Red Hat repos.`
          },
          interview: [
            {
              q: 'What is the difference between BaseOS and AppStream?',
              a: 'BaseOS contains the core OS packages with the full release life cycle. AppStream contains user-space applications, runtimes and databases, which may have shorter or different life cycles; on RHEL 8/9 some are delivered as module streams. Both are needed for a usable system.',
              mistake: 'Saying AppStream is optional extras that can be disabled safely.',
              followUp: 'What changed for AppStream in RHEL 10? (modularity removed)'
            },
            {
              q: 'dnf fails with "Failed to download metadata for repo". What do you check?',
              a: 'Which repo failed (the ID in the message), then the path: baseurl/metalink in the .repo file, DNS and connectivity with curl to the repomd.xml URL, proxy settings, TLS/certificates and system time, subscription status for Red Hat CDN repos, and for local repos whether the media is mounted and the path contains repodata. Then dnf clean all and retry.',
              mistake: 'Setting skip_if_unavailable=True or disabling gpgcheck without diagnosing.',
              followUp: 'Why is skip_if_unavailable False by default on RHEL?'
            },
            {
              q: 'How do you configure a repository from installation media for an offline server?',
              a: 'Mount the ISO (persistently via fstab with nofail if needed), create a .repo file with two sections pointing to /mnt/iso/BaseOS and /mnt/iso/AppStream, enable gpgcheck with the release key in /etc/pki/rpm-gpg, then dnf clean all and dnf repolist to confirm package counts.',
              mistake: 'Pointing a single repo at the ISO root.',
              followUp: 'How would you serve the same content to 50 servers? (copy to a web server, or reposync/Satellite)'
            }
          ],
          revision: [
            '.repo keys: [id], name, baseurl|metalink|mirrorlist, enabled, gpgcheck, gpgkey.',
            'redhat.repo is managed by subscription-manager — never hand-edit.',
            'Local ISO repo = two repos: /mnt/iso/BaseOS and /mnt/iso/AppStream.',
            'dnf repolist -v shows URLs and package counts; dnf clean all clears stale metadata.',
            'Module streams exist on RHEL 8/9 only; RHEL 10 removed modularity.',
            'priority: lower number wins (default 99).'
          ]
        }
      ]
    },
    {
      id: 'L06-M3', title: 'Updates, history, rollback and Flatpak',
      summary: 'Patch systems deliberately, audit and undo package transactions, protect kernels and pinned packages, and manage sandboxed desktop applications with Flatpak.',
      lessons: [
        {
          id: 'L06-M3-T1',
          title: 'Updating safely: errata, dnf history and rollback',
          minutes: 45,
          objectives: [
            'Check for, filter and apply updates, including security-only errata',
            'Read dnf history and undo or roll back a transaction, knowing the limits',
            'Protect kernels and critical packages with installonly_limit, exclude and versionlock',
            'Decide what must be restarted after an update with needs-restarting'
          ],
          prereqs: ['L06-M2-T2'],
          concept: `Patching is the most frequent change on any fleet, and the one most likely to cause an outage if done carelessly. A disciplined update has four phases: **assess**, **apply**, **verify**, and **be ready to back out**.

### Assess
- \`dnf check-update\` lists available updates. Exit code **100** means updates exist, **0** none, **1** error — useful in scripts.
- Red Hat publishes **errata** (advisories): RHSA (security), RHBA (bug fix), RHEA (enhancement). \`dnf updateinfo\` (alias \`dnf updateinfo summary\`) and \`dnf updateinfo list --security\` show which advisories apply; \`dnf updateinfo info RHSA-...\` shows CVEs and severity.

### Apply
- \`dnf upgrade\` (alias \`update\`) installs all available updates.
- \`dnf upgrade --security\` or \`--advisory=RHSA-2025:1234\` limits the scope; \`--sec-severity=Critical\` narrows further.
- \`dnf upgrade NAME\` updates one package and whatever its dependencies require.
- **Kernels are installed side by side**, never upgraded in place. \`installonly_limit=3\` in dnf.conf keeps the three newest; the running kernel is never removed.

### Verify and restart
New libraries are on disk, but running processes still use the old ones in memory. \`dnf needs-restarting -r\` (dnf-plugins-core) tells you whether a **reboot** is required (kernel, glibc, systemd...), and \`dnf needs-restarting -s\` lists **services** to restart.

### History and back-out
Every transaction gets an ID: \`dnf history list\`, \`dnf history info ID\` show who ran what, when, and which packages changed.

- \`dnf history undo ID\` reverses **one** transaction (removes what it installed, reinstalls the previous versions of what it upgraded).
- \`dnf history rollback ID\` reverses **every** transaction *after* ID, returning to that state.
- \`dnf history redo ID\` repeats a transaction.

> Undo/rollback only works if the **older package versions are still available** in an enabled repository (Red Hat CDN keeps them; a local ISO repo has only one version) and does not revert config file edits, database schema migrations or data written by the new version. Kernel updates are removed rather than "downgraded". The reliable back-out for big changes is a **snapshot** (VM, LVM, or Btrfs/Stratis) taken before patching.

### Holding packages back
- \`exclude=kernel* httpd*\` in dnf.conf or a repo section hides packages from updates (blunt, easy to forget).
- The **versionlock** plugin (\`python3-dnf-plugin-versionlock\`): \`dnf versionlock add httpd\` pins the currently installed version; \`dnf versionlock list | delete\` manage pins.`,
          internals: `Transaction history is stored in SQLite under \`/var/lib/dnf/history.sqlite\` (on RHEL 10 the dnf state may also live under \`/usr/lib/sysimage\`). Each record stores the command line, user (login UID), return code, rpmdb version before and after, and per-package actions (Install, Upgrade, Upgraded, Downgrade, Removed, Reason change). \`undo\` builds a new transaction from those records and resolves it like any other; if a required old version is missing from the repos, the solver reports "No package ... available" and nothing changes.

The rpm transaction itself is not atomic across a power loss: files are replaced package by package and scriptlets run in order. That is why interrupted transactions can leave duplicate package versions (Module 5) and why snapshots matter.`,
          useCases: [
            'Monthly patch cycle with security-only updates on regulated production and full updates on development',
            'Rolling back a bad application update (e.g. a broken php upgrade) within minutes using dnf history undo',
            'Pinning a database or JDK version required by a vendor certification matrix with versionlock',
            'Proving to auditors who installed what and when using dnf history info'
          ],
          syntax: 'dnf check-update ; echo $?\ndnf updateinfo [summary|list|info] [--security]\ndnf upgrade [--security|--advisory=ID|--sec-severity=Critical] [NAME]\ndnf history [list|info ID|undo ID|rollback ID|redo ID|userinstalled]\ndnf needs-restarting [-r|-s]\ndnf versionlock add|list|delete NAME\ndnf downgrade NAME',
          options: [
            ['--security', 'Limit to packages fixing security advisories'],
            ['--advisory=ID', 'Apply one specific erratum'],
            ['history info ID', 'Packages, user, command and return code of a transaction'],
            ['history undo ID', 'Reverse a single transaction'],
            ['history rollback ID', 'Reverse all transactions after ID'],
            ['needs-restarting -r', 'Exit 1 and explain if a reboot is required'],
            ['installonly_limit=N', 'dnf.conf: number of kernels (install-only packages) to keep']
          ],
          examples: [
            {
              title: 'Read the history and undo a bad upgrade',
              cmd: 'sudo dnf history list | head -4 && sudo dnf history info 27',
              out: 'ID | Command line              | Date and time    | Action(s) | Altered\n27 | upgrade php*              | 2026-10-08 22:14 | Upgrade   |    9\n26 | install mod_ssl           | 2026-10-01 10:02 | Install   |    2\nTransaction ID : 27\nUser           : Priya Rao <priya>\nReturn-Code    : Success\nPackages Altered:\n    Upgrade  php-8.0.30-3.el9_5.x86_64 @appstream\n    Upgraded php-8.0.30-1.el9_4.x86_64 @@System',
              fields: [
                ['ID 27', 'Transaction to investigate'],
                ['User', 'Login user who ran it (via sudo), from the audit login UID'],
                ['Upgrade / Upgraded', 'New version installed / old version replaced — the old version must still be in a repo for undo']
              ],
              note: 'Next step: `sudo dnf history undo 27`, then restart php-fpm/httpd and test the application.'
            },
            {
              title: 'Security errata pending',
              cmd: 'dnf updateinfo list --security',
              out: 'RHSA-2026:7311 Important/Sec. openssl-1:3.2.2-6.el9_5.x86_64\nRHSA-2026:7311 Important/Sec. openssl-libs-1:3.2.2-6.el9_5.x86_64\nRHSA-2026:7402 Moderate/Sec.  kernel-5.14.0-503.15.1.el9_5.x86_64',
              fields: [
                ['RHSA-2026:7311', 'Advisory ID used with --advisory'],
                ['Important/Sec.', 'Severity and type'],
                ['1:3.2.2-6.el9_5', 'Epoch 1, version 3.2.2, release 6.el9_5']
              ]
            },
            {
              title: 'Does the host need a reboot?',
              cmd: 'sudo dnf needs-restarting -r; echo "exit=$?"',
              out: 'Core libraries or services have been updated since boot-up:\n  * kernel\n  * openssl-libs\n\nReboot is required to fully utilize these updates.\nMore information: https://access.redhat.com/solutions/27943\nexit=1',
              fields: [
                ['kernel, openssl-libs', 'Updated components that only take effect after reboot'],
                ['exit=1', 'Scriptable signal that a reboot is required (0 = not required)']
              ]
            }
          ],
          walkthrough: [
            'Check for updates: `dnf check-update; echo $?` and interpret the exit code.',
            'View advisories: `dnf updateinfo summary` then `dnf updateinfo list --security`.',
            'Snapshot the VM, then apply security updates only: `sudo dnf upgrade --security -y`.',
            'Review the transaction: `sudo dnf history info last`.',
            'Decide on restarts: `sudo dnf needs-restarting -r` and `sudo dnf needs-restarting -s`.',
            'Practise back-out on a harmless package: install `tree`, then `sudo dnf history undo last` and confirm it is gone.'
          ],
          lab: {
            goal: 'Perform a controlled update, pin a package, and undo a transaction on a RHEL 9/10 VM with access to full repositories.',
            steps: [
              'Take a VM snapshot named `pre-patch`.',
              'Install the versionlock plugin: `sudo dnf install -y python3-dnf-plugin-versionlock` and lock a package: `sudo dnf versionlock add chrony`.',
              'List updates and confirm chrony is no longer offered even if a newer one exists: `dnf check-update chrony`.',
              'Apply updates: `sudo dnf upgrade -y` and note the transaction ID with `sudo dnf history list | head -3`.',
              'Install a test package `sudo dnf install -y nano` then undo it: `sudo dnf history undo last -y`.',
              'Run `sudo dnf needs-restarting -r` and reboot if required; after reboot confirm `uname -r` is the newest installed kernel (`rpm -q kernel --last | head -1`).'
            ],
            verify: '`dnf versionlock list` shows chrony; `rpm -q nano` says not installed; `dnf history list` shows install and undo transactions; `uname -r` matches the newest kernel after reboot.'
          },
          troubleshooting: {
            scenario: '`dnf history undo 41` fails with "No package php-8.0.30-1.el9_4.x86_64 available" after a bad php update on a server that uses only a local ISO repo.',
            steps: [
              'Evidence: `dnf history info 41` shows the Upgraded (old) versions; `dnf list --showduplicates php` shows only the new version in enabled repos.',
              'Hypothesis: undo needs the old packages; the local repo/mirror keeps only the latest versions.',
              'Fix: point to a repo that contains the older build (Red Hat CDN, Satellite content view, or a cached copy if keepcache=True), or restore from the pre-patch snapshot.',
              'Validate: `rpm -q php` shows the old release; application health check passes. Prevention: snapshots before patching and repos that retain old versions.'
            ]
          },
          mistakes: [
            'Assuming dnf history undo restores configuration files and data — it only changes packages.',
            'Using `exclude=kernel*` to "stabilise" a server and forgetting it, so no kernel security fixes are applied for months.',
            'Patching without checking needs-restarting, leaving vulnerable libraries loaded in long-running services.',
            'Setting installonly_limit=1 — leaves no fallback kernel if the new one fails to boot.'
          ],
          safety: [
            'Take a snapshot or backup before patching; know the back-out plan before you start.',
            'Patch a canary/staging host first, then production in waves.',
            'Reboot inside the change window and verify services; keep the previous kernel available in GRUB.'
          ],
          distro: `RHEL 8/9/10 support \`dnf history undo/rollback\` and \`updateinfo\`. \`needs-restarting\` and \`versionlock\` come from dnf-plugins-core / python3-dnf-plugin-versionlock. Debian/Ubuntu: \`apt list --upgradable\`, \`unattended-upgrades\` for security patching, \`apt-mark hold\` to pin, and \`/var/run/reboot-required\` to signal reboots; there is no built-in apt "undo" — logs in \`/var/log/apt/history.log\` guide manual downgrades.`,
          challenge: {
            task: 'A change window allows **only Critical and Important security fixes**. Apply them, prove what was changed, and report whether a reboot is required — in a way that a scheduler could run unattended.',
            solution: `\`\`\`
sudo dnf upgrade -y --security --sec-severity=Critical --sec-severity=Important
sudo dnf history info last > /root/patch-$(date +%F).txt
sudo dnf needs-restarting -r; rc=$?
[ $rc -eq 1 ] && echo "REBOOT REQUIRED" || echo "No reboot needed"
\`\`\`

Reasoning: \`--security\` with \`--sec-severity\` restricts the transaction to the approved advisories. \`history info last\` gives an auditable package list with user and timestamp. \`needs-restarting -r\` returns 1 when a reboot is needed, so automation can schedule it. A pre-patch snapshot remains the back-out path.`
          },
          interview: [
            {
              q: 'What is the difference between dnf history undo and rollback?',
              a: 'undo reverses a single transaction by ID; rollback reverses all transactions that happened after the given ID, returning the package set to the state at that point. Both depend on the older package versions being available in enabled repos and neither restores configuration or data changes.',
              mistake: 'Saying they are the same or that they restore the whole system.',
              followUp: 'What is your back-out if the old packages are not available? (snapshot/backup restore)'
            },
            {
              q: 'How do you know if a server needs a reboot after patching?',
              a: 'dnf needs-restarting -r reports whether core components such as the kernel, glibc, systemd or openssl were updated since boot and exits 1 if a reboot is required. needs-restarting -s lists services still running old binaries so they can be restarted individually when a full reboot is not required.',
              mistake: 'Rebooting only when the kernel changes.',
              followUp: 'How would you confirm after reboot that the new kernel is running? (uname -r vs rpm -q kernel --last)'
            },
            {
              q: 'How do you prevent a specific package from being updated?',
              a: 'Preferably with the versionlock plugin (dnf versionlock add NAME), which pins the exact installed version and is visible with versionlock list. Alternatively exclude= in dnf.conf or the repo file. Both must be documented and reviewed because pinned packages stop receiving security fixes.',
              mistake: 'Disabling the whole repository.',
              followUp: 'What is the Debian equivalent? (apt-mark hold)'
            }
          ],
          revision: [
            'dnf check-update exit codes: 100 updates, 0 none, 1 error.',
            'Security-only: dnf upgrade --security [--sec-severity=...] or --advisory=ID.',
            'Kernels install side by side; installonly_limit (default 3) keeps fallbacks.',
            'history undo = one transaction; rollback = everything after ID; both need old packages available.',
            'needs-restarting -r (reboot?) and -s (services); versionlock to pin.'
          ]
        },
        {
          id: 'L06-M3-T2',
          title: 'Flatpak applications and remotes',
          minutes: 35,
          objectives: [
            'Explain how Flatpak differs from RPM (runtimes, sandboxing, OSTree-based remotes)',
            'Add, list and remove Flatpak remotes',
            'Install, run, update and uninstall Flatpak applications system-wide and per user',
            'Inspect permissions and troubleshoot common Flatpak failures'
          ],
          prereqs: ['L06-M3-T1'],
          concept: `**Flatpak** is a packaging and distribution system for (mostly graphical) applications that runs them in a **sandbox** and bundles them with a shared **runtime** instead of relying on host libraries. It complements RPM; it does not replace it. RHEL uses RPM for the OS and services, and offers Flatpak for desktop applications. Managing Flatpak applications is part of the RHCSA (EX200) objectives on RHEL 10.

### Key terms
- **Remote** — a Flatpak repository (OSTree repo or OCI registry). Red Hat provides one for RHEL (added from \`https://flatpaks.redhat.io/rhel.flatpakrepo\`, authenticated through the system's registration); Flathub is the large community remote.
- **Application ID** — reverse-DNS name, e.g. \`org.mozilla.firefox\`, \`org.gnome.Calculator\`.
- **Runtime** — a shared base (e.g. \`org.fedoraproject.Platform\`, \`org.freedesktop.Platform\`, \`com.redhat.Platform\`) that apps depend on; installed automatically.
- **Ref** — full identifier: \`app/org.gnome.Calculator/x86_64/stable\`.
- **Installation scope** — **system** (default with root, in \`/var/lib/flatpak\`, for all users) or **user** (\`--user\`, in \`~/.local/share/flatpak\`).

### Lifecycle commands
\`\`\`
flatpak remotes                         # configured remotes
flatpak remote-add --if-not-exists NAME URL.flatpakrepo
flatpak search calculator               # search configured remotes
flatpak install NAME org.gnome.Calculator
flatpak list --app                      # installed applications
flatpak run org.gnome.Calculator
flatpak update                          # update apps and runtimes
flatpak uninstall org.gnome.Calculator
flatpak uninstall --unused              # remove runtimes no app needs
\`\`\`

### Sandboxing and permissions
Each app declares the access it needs (network, display, host filesystem paths, devices). \`flatpak info --show-permissions APPID\` shows them, and \`flatpak override\` changes them (\`--user\` for one user, system-wide as root). Security reviewers look for broad grants such as \`filesystem=host\`.

> For servers, Flatpak is rarely needed. Its value is in desktop/workstation fleets where users need current application versions without touching the RHEL base.`,
          internals: `Flatpak stores content in an **OSTree** repository (content-addressed, deduplicated objects) under \`/var/lib/flatpak\` (system) or \`~/.local/share/flatpak\` (user). Deployments are hard-linked checkouts, so multiple apps sharing a runtime use the disk space once. Remotes are configured in \`/var/lib/flatpak/repo/config\` (system); \`.flatpakrepo\` files carry the URL and GPG key so signatures are verified on install and update. Some remotes (including Red Hat\'s) serve apps as OCI images from a registry.

At run time \`flatpak run\` uses **bubblewrap** to create namespaces, mounts the runtime at \`/usr\` and the app at \`/app\`, and exposes only the declared permissions; **portals** (xdg-desktop-portal) mediate access to files and devices. System-wide installs by non-root users are authorised through polkit.`,
          useCases: [
            'Giving workstation users a newer browser or office suite without changing the RHEL base RPMs',
            'Standardising desktop applications across RHEL 10 workstations from the Red Hat Flatpak remote',
            'Per-user installs for developers without granting root (`--user`)',
            'Reviewing and restricting application permissions (filesystem/network) for security baselines'
          ],
          syntax: 'flatpak remotes [--show-details]\nflatpak remote-add [--if-not-exists] [--user] NAME LOCATION\nflatpak remote-delete NAME\nflatpak search TEXT\nflatpak install [--user] [-y] REMOTE APPID\nflatpak list [--app|--runtime]\nflatpak info [--show-permissions] APPID\nflatpak run APPID\nflatpak update [-y] [APPID]\nflatpak uninstall [--unused] [APPID]',
          options: [
            ['--if-not-exists', 'remote-add: do not fail if the remote is already configured'],
            ['--user / --system', 'Per-user installation or system-wide (default)'],
            ['-y / --noninteractive', 'Assume yes / no prompts (automation)'],
            ['--app / --runtime', 'Filter list output'],
            ['--show-permissions', 'Show sandbox permissions of an app'],
            ['--unused', 'Uninstall runtimes/extensions no longer needed']
          ],
          examples: [
            {
              title: 'Add Flathub and install an app system-wide',
              cmd: 'sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo && sudo flatpak install -y flathub org.gnome.Calculator',
              out: 'Looking for matches…\nRequired runtime for org.gnome.Calculator/x86_64/stable (runtime/org.gnome.Platform/x86_64/47) found in remote flathub\n\n        ID                                Branch  Op  Remote   Download\n 1.     org.gnome.Platform                47      i   flathub  < 380 MB\n 2.     org.gnome.Calculator              stable  i   flathub  < 3 MB\n\nInstallation complete.',
              fields: [
                ['Required runtime', 'The shared runtime is installed automatically'],
                ['Op i', 'Operation: install (u = update)'],
                ['Branch', 'Runtime version / app branch']
              ],
              note: 'In an enterprise, use the remote your organisation approves (e.g. the Red Hat remote on RHEL 10).'
            },
            {
              title: 'Inventory installed applications',
              cmd: 'flatpak list --app --columns=application,version,origin,installation',
              out: 'Application ID          Version  Origin   Installation\norg.gnome.Calculator    47.1     flathub  system\norg.mozilla.firefox     131.0    rhel     system',
              fields: [
                ['Origin', 'Remote the app came from'],
                ['Installation', 'system (/var/lib/flatpak) or user (~/.local/share/flatpak)']
              ]
            },
            {
              title: 'Inspect sandbox permissions',
              cmd: 'flatpak info --show-permissions org.gnome.Calculator',
              out: '[Context]\nshared=network;ipc;\nsockets=x11;wayland;fallback-x11;\ndevices=dri;\n\n[Session Bus Policy]\norg.gtk.vfs.*=talk',
              fields: [
                ['shared=network', 'App has network access'],
                ['sockets', 'Display server access'],
                ['no filesystem= line', 'No direct host filesystem access; files go through portals']
              ]
            }
          ],
          walkthrough: [
            'Ensure flatpak is installed: `rpm -q flatpak || sudo dnf install -y flatpak`.',
            'List remotes: `flatpak remotes --show-details` (a fresh RHEL 10 workstation may already have the Red Hat remote).',
            'Add a remote with `--if-not-exists` and search: `flatpak search calculator`.',
            'Install system-wide and run: `sudo flatpak install -y REMOTE org.gnome.Calculator`, then `flatpak run org.gnome.Calculator` from a graphical session.',
            'Install the same app per user with `flatpak install --user ...` and compare `flatpak list --columns=application,installation`.',
            'Update and clean up: `sudo flatpak update -y` and `sudo flatpak uninstall --unused -y`.'
          ],
          lab: {
            goal: 'Manage the full lifecycle of a Flatpak application on a RHEL 10 (or 9) VM with internet access, as required by the RHCSA objectives.',
            steps: [
              'Install flatpak if missing: `sudo dnf install -y flatpak`.',
              'Add a remote: on registered RHEL use `sudo flatpak remote-add --if-not-exists rhel https://flatpaks.redhat.io/rhel.flatpakrepo`; on Rocky/Alma use Flathub `https://dl.flathub.org/repo/flathub.flatpakrepo`.',
              'Confirm with `flatpak remotes` and search for an app, e.g. `flatpak search gedit` or `flatpak search calculator`.',
              'Install system-wide: `sudo flatpak install -y REMOTE APPID` and verify with `flatpak list --app`.',
              'Show details and permissions: `flatpak info APPID` and `flatpak info --show-permissions APPID`.',
              'Update with `sudo flatpak update -y`, then uninstall with `sudo flatpak uninstall -y APPID` and `sudo flatpak uninstall --unused -y`.'
            ],
            verify: '`flatpak remotes` lists the remote; during the lab `flatpak list --app` showed the APPID with Installation=system; after cleanup the app is absent and `flatpak list --runtime` shows no orphaned runtime for it.'
          },
          troubleshooting: {
            scenario: '`flatpak install rhel org.gnome.gedit` fails with "error: Unable to load summary from remote rhel: ... 401 Unauthorized".',
            steps: [
              'Evidence: `flatpak remotes --show-details` shows the rhel remote URL; `subscription-manager status` shows the system is not registered.',
              'Hypothesis: the Red Hat Flatpak remote requires an entitled/registered system for authentication.',
              'Fix: register the system (`sudo subscription-manager register`, or `rhc connect`), then retry; or use an approved alternate remote.',
              'Validate: `flatpak remote-ls rhel | head` lists apps and the install completes.'
            ]
          },
          mistakes: [
            'Expecting dnf/rpm to list Flatpak apps — Flatpak has its own database; use `flatpak list`.',
            'Mixing user and system installs and then not finding the app for other users.',
            'Adding unvetted remotes on managed workstations — a remote is a software supply chain decision like a .repo file.',
            'Forgetting `flatpak uninstall --unused`, leaving large runtimes consuming disk space.'
          ],
          safety: [
            'System-wide remote and app changes need root (or polkit authorisation); user installs affect only that user.',
            'Review `--show-permissions` for broad grants like `filesystem=host` before approving an app.',
            'Runtimes can be hundreds of MB — check space in /var before large installs.'
          ],
          distro: `RHEL 8/9/10 ship the \`flatpak\` package; RHEL 10 workstation installs are expected to use Flatpak for many desktop apps and the RHCSA on RHEL 10 includes Flatpak tasks. Fedora enables Flathub via a filtered remote; Ubuntu promotes **Snap** instead (Flatpak installable via apt). Debian: \`apt install flatpak\`.`,
          challenge: {
            task: 'On a lab workstation, make `org.gnome.TextEditor` available to **all users**, from a remote named `corpflat` that points to `https://flatpaks.example.lab/corp.flatpakrepo`, and ensure no unused runtimes are left behind after removing an older app `org.gnome.gedit`.',
            solution: `\`\`\`
sudo flatpak remote-add --if-not-exists corpflat https://flatpaks.example.lab/corp.flatpakrepo
sudo flatpak install -y corpflat org.gnome.TextEditor
sudo flatpak uninstall -y org.gnome.gedit
sudo flatpak uninstall --unused -y
flatpak list --app --columns=application,origin,installation
\`\`\`

Reasoning: running as root uses the **system** installation (/var/lib/flatpak), visible to all users. \`--if-not-exists\` makes the command idempotent. The .flatpakrepo file carries the URL and signing key, so updates stay signature-verified. \`--unused\` removes runtimes that only gedit required.`
          },
          interview: [
            {
              q: 'How is Flatpak different from RPM?',
              a: 'RPM installs packages into the shared OS filesystem with dependencies resolved against host libraries, managed by rpm/dnf. Flatpak installs applications into an OSTree store with a bundled shared runtime, runs them sandboxed with bubblewrap and portals, and updates them independently of the OS. RPM is for the OS and services; Flatpak mainly for desktop apps.',
              mistake: 'Calling Flatpak a container runtime for servers or saying it replaces dnf.',
              followUp: 'Where are system-wide Flatpak apps stored? (/var/lib/flatpak)'
            },
            {
              q: 'What is the difference between a system and a user Flatpak installation?',
              a: 'System installations live in /var/lib/flatpak, need root or polkit authorisation and are available to every user. User installations (--user) live in ~/.local/share/flatpak, need no privileges and are visible only to that user. Remotes are also configured per scope.',
              mistake: 'Not knowing that remotes are scoped too, then wondering why a --user install cannot find a system remote.',
              followUp: 'How do you list which scope an app is installed in? (flatpak list --columns=application,installation)'
            },
            {
              q: 'How would you restrict an app\'s access to the home directory?',
              a: 'Check current grants with flatpak info --show-permissions, then apply flatpak override (system-wide as root, or --user) such as flatpak override --nofilesystem=home APPID, and verify with flatpak override --show APPID.',
              mistake: 'Editing files inside /var/lib/flatpak by hand.',
              followUp: 'Why do portals matter for sandboxed apps?'
            }
          ],
          revision: [
            'Flatpak = sandboxed apps + shared runtimes, stored in OSTree; separate from rpm/dnf.',
            'remote-add --if-not-exists NAME URL; flatpak remotes to list.',
            'install REMOTE APPID; list --app; run APPID; update; uninstall [--unused].',
            'System scope /var/lib/flatpak (root); user scope ~/.local/share/flatpak (--user).',
            'Flatpak management is an RHCSA objective on RHEL 10.'
          ]
        }
      ]
    },
    {
      id: 'L06-M4', title: 'Debian-family packaging',
      summary: 'Translate RHEL package skills to Debian and Ubuntu: apt and apt-get for repositories and dependency resolution, dpkg for the package database, and the sources that feed them.',
      lessons: [
        {
          id: 'L06-M4-T1',
          title: 'apt, apt-get and APT sources',
          minutes: 40,
          objectives: [
            'Refresh package indexes and install, upgrade and remove packages with apt and apt-get',
            'Explain the difference between upgrade and full-upgrade (dist-upgrade)',
            'Read and write APT sources in one-line and deb822 formats with signed-by keyrings',
            'Pin or hold packages and check candidate versions with apt-cache policy'
          ],
          prereqs: ['L06-M2-T2'],
          concept: `Debian, Ubuntu and their derivatives use **.deb** packages. The layering mirrors RHEL:

- **rpm ↔ dpkg** — low-level install/query of a single package file, no dependency resolution.
- **dnf ↔ apt / apt-get** — repositories, dependency solving, downloads.

### Two-step model: index, then act
Unlike dnf, which refreshes metadata automatically when it expires, APT separates the steps:
1. \`apt update\` downloads the package **indexes** from every configured source into \`/var/lib/apt/lists/\`. It installs nothing.
2. \`apt install\`, \`apt upgrade\`, etc. act on those indexes.

Forgetting \`apt update\` is the classic reason for "Unable to locate package" or 404 errors on old package versions.

### apt versus apt-get
\`apt\` is the interactive front end (progress bar, colours, combined commands). \`apt-get\` and \`apt-cache\` have a **stable CLI** and are the right choice in **scripts** (apt prints "WARNING: apt does not have a stable CLI interface").

### Upgrades
- \`apt upgrade\` — upgrades installed packages but **never removes** packages; \`apt\` may install new dependencies, \`apt-get upgrade\` will not (it holds those packages back).
- \`apt full-upgrade\` (= \`apt-get dist-upgrade\`) — may install new packages and **remove** packages to resolve changed dependencies. Required for kernel ABI changes and release upgrades; read the summary first.
- \`apt autoremove\` — removes automatically installed dependencies no longer needed.

### Sources
Repositories are defined in \`/etc/apt/sources.list\` and \`/etc/apt/sources.list.d/\`:

\`\`\`
# one-line format
deb [signed-by=/usr/share/keyrings/vendor.gpg] https://repo.vendor.example/apt bookworm main
\`\`\`
\`\`\`
# deb822 format (.sources) — default on Ubuntu 24.04 and Debian 13
Types: deb
URIs: http://archive.ubuntu.com/ubuntu
Suites: noble noble-updates
Components: main restricted universe
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
\`\`\`

Fields: type (\`deb\` binary, \`deb-src\` source), URI, **suite** (release codename like bookworm/noble, plus -updates/-security), **components** (main, contrib, non-free, non-free-firmware on Debian; main, restricted, universe, multiverse on Ubuntu).

**Trust**: APT verifies the signed \`InRelease\`/\`Release\` file of each source. Third-party keys belong in a dedicated keyring referenced with \`signed-by\`; the global \`apt-key\` tool is **deprecated** because a key added there was trusted for every repository.

### Holding and pinning
\`apt-mark hold PKG\` stops upgrades of a package (\`apt-mark showhold\`, \`unhold\`). \`apt-cache policy PKG\` shows installed and **candidate** versions and which source/priority wins; preferences in \`/etc/apt/preferences.d/\` change priorities.`,
          internals: `\`apt update\` fetches \`InRelease\` (inline-signed) for each suite, verifies it with the keyring, then fetches the \`Packages\` indexes whose hashes it lists. Indexes live in \`/var/lib/apt/lists/\`; downloaded .deb files are cached in \`/var/cache/apt/archives/\` (\`apt clean\` empties it). The resolver chooses candidate versions by pin priority (default 500, installed 100, target release 990), then version.

Locks: \`/var/lib/dpkg/lock-frontend\` and \`/var/lib/dpkg/lock\` stop concurrent package operations — on Ubuntu, \`unattended-upgrades\` often holds them shortly after boot. History of apt actions is logged to \`/var/log/apt/history.log\` and terminal output to \`/var/log/apt/term.log\`.`,
          useCases: [
            'Patching Ubuntu web servers in a mixed RHEL/Ubuntu estate with the same change process',
            'Adding a vendor repository (e.g. Docker, PostgreSQL PGDG) with a scoped signed-by keyring',
            'Holding a kernel or database version on Ubuntu during an application certification period',
            'Writing idempotent bootstrap scripts with apt-get -y and DEBIAN_FRONTEND=noninteractive'
          ],
          syntax: 'apt update\napt list --upgradable\napt install [-y] PKG | ./local.deb\napt upgrade | apt full-upgrade\napt remove PKG | apt purge PKG | apt autoremove\napt search TEXT ; apt show PKG\napt-cache policy PKG\napt-mark hold|unhold|showhold PKG\napt-get -y install PKG   (scripts)',
          options: [
            ['update', 'Refresh indexes from all sources (installs nothing)'],
            ['upgrade', 'Upgrade without removing packages'],
            ['full-upgrade / dist-upgrade', 'Upgrade allowing new installs and removals'],
            ['remove / purge', 'Remove package / remove package and its system-wide config files'],
            ['--no-install-recommends', 'Do not install Recommends dependencies (leaner servers)'],
            ['-s / --simulate', 'Simulate the transaction (apt-get) — dry run'],
            ['apt-cache policy', 'Installed vs candidate version and source priorities']
          ],
          examples: [
            {
              title: 'Why is a package not upgrading?',
              cmd: 'apt-cache policy nginx',
              out: 'nginx:\n  Installed: 1.24.0-2ubuntu7\n  Candidate: 1.24.0-2ubuntu7.1\n  Version table:\n     1.24.0-2ubuntu7.1 500\n        500 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages\n *** 1.24.0-2ubuntu7 500\n        500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages\n        100 /var/lib/dpkg/status',
              fields: [
                ['Installed / Candidate', 'Current version and the version apt would install'],
                ['***', 'Marks the installed version'],
                ['500 / 100', 'Pin priorities: normal repo 500, installed status 100']
              ],
              note: 'If Candidate equals Installed but a newer version exists, look for a hold (apt-mark showhold) or a pin in /etc/apt/preferences.d/.'
            },
            {
              title: 'Simulate a full upgrade before running it',
              cmd: 'sudo apt-get -s dist-upgrade | grep -E "^(Inst|Remv)" | head',
              out: 'Inst linux-image-6.8.0-45-generic (6.8.0-45.45 Ubuntu:24.04/noble-updates [amd64])\nInst linux-modules-6.8.0-45-generic (6.8.0-45.45 Ubuntu:24.04/noble-updates [amd64])\nRemv python3-oldlib [1.2-3]',
              fields: [
                ['Inst', 'Package that would be installed or upgraded'],
                ['Remv', 'Package that would be removed — review each one']
              ]
            },
            {
              title: 'Add a third-party repo the modern way',
              cmd: "curl -fsSL https://repo.vendor.example/key.asc | sudo gpg --dearmor -o /usr/share/keyrings/vendor.gpg\necho 'deb [signed-by=/usr/share/keyrings/vendor.gpg] https://repo.vendor.example/apt bookworm main' | sudo tee /etc/apt/sources.list.d/vendor.list\nsudo apt update",
              out: 'Get:5 https://repo.vendor.example/apt bookworm InRelease [3,521 B]\nGet:6 https://repo.vendor.example/apt bookworm/main amd64 Packages [12.4 kB]\nReading package lists... Done',
              fields: [
                ['InRelease', 'Signed index verified with vendor.gpg only'],
                ['signed-by', 'Restricts trust of this key to this one source']
              ],
              note: 'Verify the key fingerprint (`gpg --show-keys /usr/share/keyrings/vendor.gpg`) against the vendor documentation before apt update.'
            }
          ],
          walkthrough: [
            'On a Debian 12 or Ubuntu 24.04 VM run `cat /etc/os-release` and list sources: `ls /etc/apt/sources.list /etc/apt/sources.list.d/`.',
            'Refresh indexes: `sudo apt update` and read the "N packages can be upgraded" line.',
            'Inspect upgrades: `apt list --upgradable` and `apt-cache policy openssl`.',
            'Install with and without recommends: `sudo apt install --no-install-recommends -y tree`.',
            'Hold a package: `sudo apt-mark hold tree`, then `apt-mark showhold`; release with `unhold`.',
            'Read history: `less /var/log/apt/history.log`.'
          ],
          lab: {
            goal: 'Manage packages and sources on a Debian 12 / Ubuntu 22.04+ VM (a second lab VM alongside your RHEL VM).',
            steps: [
              'Snapshot the VM. Run `sudo apt update` and `apt list --upgradable`.',
              'Simulate first: `sudo apt-get -s upgrade` and `sudo apt-get -s dist-upgrade`; note any differences (kept back / removed packages).',
              'Apply: `sudo apt upgrade -y`, then check `[ -f /var/run/reboot-required ] && cat /var/run/reboot-required.pkgs`.',
              'Install `htop`, then `sudo apt-mark hold htop` and confirm `apt-mark showhold`.',
              'Remove vs purge: install `nginx`, edit `/etc/nginx/nginx.conf` comment, `sudo apt remove -y nginx` and check `dpkg -l nginx` (status `rc`), then `sudo apt purge -y nginx`.',
              'Clean up: `sudo apt autoremove -y && sudo apt clean`.'
            ],
            verify: '`apt-mark showhold` lists htop; `dpkg -l nginx` reports no package (or `un`) after purge; `/etc/nginx` no longer exists; `grep -c Commandline /var/log/apt/history.log` increased.'
          },
          troubleshooting: {
            scenario: '`sudo apt install postgresql-16` fails with "E: Unable to locate package postgresql-16" on a fresh Ubuntu 22.04 server.',
            steps: [
              'Evidence: `apt-cache policy postgresql-16` shows no candidate; `apt-cache search postgresql | head` shows only postgresql-14.',
              'Hypothesis: indexes are stale or the package exists only in the vendor (PGDG) repository, which is not configured.',
              'Fix: run `sudo apt update`; if still missing, add the PGDG repository with a signed-by keyring after verifying its fingerprint, then `apt update` again.',
              'Validate: `apt-cache policy postgresql-16` shows a candidate from apt.postgresql.org; install succeeds.'
            ]
          },
          mistakes: [
            'Running `apt install` without `apt update` on a new host and concluding the package does not exist.',
            'Using `apt` in scripts — its CLI is not stable; use `apt-get`/`apt-cache`.',
            'Running `full-upgrade -y` without reviewing removals on production.',
            'Adding keys with deprecated `apt-key add`, which trusts the key for all repositories.',
            'Confusing remove (keeps config, status rc) with purge (removes config).'
          ],
          safety: [
            'Package changes need root; snapshots before upgrades; simulate with apt-get -s.',
            'Never kill apt/dpkg mid-transaction; wait for unattended-upgrades to finish instead of deleting lock files.',
            'Scope third-party keys with signed-by and verify fingerprints.'
          ],
          distro: `Debian 12 (bookworm) and Ubuntu 22.04/24.04 are current targets. Ubuntu 24.04 and Debian 13 (trixie) default to deb822 \`.sources\` files (\`apt modernize-sources\` converts on Debian 13). \`apt-key\` is deprecated (removed in recent releases). Ubuntu also ships Snap (\`snap\`) for some apps. On RHEL the equivalents are dnf (no separate update step), \`dnf versionlock\` for holds and \`.repo\` files with gpgkey for trust.`,
          challenge: {
            task: 'Write a non-interactive script fragment for Ubuntu that installs `chrony` and `curl` without recommended packages, never prompts (even for config file questions), and fails if any command fails.',
            solution: `\`\`\`
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update
sudo -E apt-get install -y --no-install-recommends \\
  -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold \\
  chrony curl
dpkg -s chrony curl | grep -E '^(Package|Status)'
\`\`\`

Reasoning: \`apt-get\` has a stable CLI for scripts; \`DEBIAN_FRONTEND=noninteractive\` suppresses debconf prompts; the confdef/confold options keep existing config files when a conffile prompt would appear; \`set -euo pipefail\` stops on errors; \`dpkg -s\` proves Status \`install ok installed\`.`
          },
          interview: [
            {
              q: 'What is the difference between apt upgrade and apt full-upgrade?',
              a: 'upgrade upgrades installed packages but never removes any; packages whose upgrade requires removing others are kept back. full-upgrade (apt-get dist-upgrade) resolves changed dependencies intelligently and may install new packages and remove existing ones, so its summary must be reviewed.',
              mistake: 'Saying full-upgrade upgrades the distribution release (that also needs sources changed / do-release-upgrade).',
              followUp: 'Why might a new kernel be "kept back" with apt-get upgrade?'
            },
            {
              q: 'Why is apt-key deprecated, and what replaces it?',
              a: 'apt-key added keys to a global trusted keyring, so a key for one vendor could sign packages for any repository. The replacement stores each key in its own keyring file (e.g. /usr/share/keyrings/vendor.gpg or /etc/apt/keyrings) and references it with signed-by in the source entry, limiting trust to that repo.',
              mistake: 'Saying it was deprecated only because of a new command name.',
              followUp: 'How does dnf scope trust per repo? (gpgkey per .repo section, though imported keys are global in the rpmdb)'
            },
            {
              q: 'Map these RHEL commands to Debian: dnf install, dnf check-update, dnf versionlock add, rpm -qa.',
              a: 'apt install (after apt update); apt update && apt list --upgradable; apt-mark hold; dpkg -l (or dpkg-query -W / apt list --installed).',
              mistake: 'Answering apt update for dnf update — apt update only refreshes indexes.',
              followUp: 'What is the equivalent of rpm -qf? (dpkg -S)'
            }
          ],
          revision: [
            'dpkg ↔ rpm (low-level); apt/apt-get ↔ dnf (repos + dependencies).',
            'apt update refreshes indexes only; apt upgrade never removes; full-upgrade may remove.',
            'Use apt-get/apt-cache in scripts; apt interactively.',
            'Sources: sources.list(.d), one-line or deb822; keys via signed-by, not apt-key.',
            'apt-mark hold to pin; apt-cache policy for installed vs candidate versions.'
          ]
        },
        {
          id: 'L06-M4-T2',
          title: 'dpkg: the Debian package database',
          minutes: 35,
          objectives: [
            'Query installed packages, owners and file lists with dpkg and dpkg-query',
            'Interpret dpkg -l status codes (ii, rc, iU, iF)',
            'Install a local .deb correctly and repair half-configured packages',
            'Verify installed files with dpkg --verify'
          ],
          prereqs: ['L06-M4-T1'],
          concept: `\`dpkg\` is Debian's low-level package tool — the counterpart of rpm. It installs, removes, configures and queries **.deb** files but does **not** download packages or resolve dependencies. APT calls dpkg to do the actual work.

### Anatomy of a .deb
A .deb is an \`ar\` archive with \`debian-binary\`, \`control.tar.*\` (metadata: Package, Version, Depends, maintainer scripts \`preinst\`, \`postinst\`, \`prerm\`, \`postrm\`, and \`conffiles\`) and \`data.tar.*\` (the files). Version strings look like \`1:2.4.58-1ubuntu8.4\`: epoch, upstream version, Debian/Ubuntu revision.

### The status database
dpkg tracks state in \`/var/lib/dpkg/status\` (one stanza per package) and per-package files in \`/var/lib/dpkg/info/\` (file lists \`*.list\`, checksums \`*.md5sums\`, maintainer scripts). Installation happens in two phases: **unpack** (files written) then **configure** (postinst runs). A crash between them leaves packages *half-configured*.

### Reading dpkg -l
Each line starts with up to three status letters:
1. **Desired** action: \`i\` install, \`r\` remove, \`p\` purge, \`h\` hold, \`u\` unknown.
2. **Current status**: \`i\` installed, \`c\` config-files only, \`U\` unpacked, \`F\` half-configured, \`H\` half-installed, \`W\`/\`t\` triggers awaiting/pending, \`n\` not installed.
3. **Error flag**: \`R\` reinstall required (blank = OK).

So \`ii\` = healthy, \`rc\` = removed but config files remain, \`iU\` = unpacked not configured, \`iF\` = configuration failed.

### Everyday commands
- \`dpkg -l [PATTERN]\` — list with status; \`dpkg-query -W -f='\${Package} \${Version}\\n'\` for scripts.
- \`dpkg -s PKG\` — status and metadata; \`dpkg -L PKG\` — files; \`dpkg -S /path\` — owning package.
- \`dpkg -i file.deb\` — install a local package (dependencies not resolved!). Prefer \`apt install ./file.deb\`, which resolves them.
- \`dpkg --configure -a\` — finish configuring all unpacked packages after an interruption.
- \`dpkg -r\` remove, \`dpkg -P\` purge.
- \`dpkg --verify PKG\` (or \`debsums\`) — compare files against stored MD5 sums; output format resembles rpm -V (\`??5??????\`).`,
          internals: `\`dpkg -i\` unpacks data into place using temporary \`.dpkg-new\` names and renames atomically per file, then runs \`postinst configure\`. Conffiles (listed in the control archive) are tracked by checksum: if both admin and package changed a conffile, dpkg prompts (or follows \`--force-confold\`/\`--force-confnew\`), saving alternatives as \`.dpkg-dist\` or \`.dpkg-old\`. Diversions (\`dpkg-divert\`) and alternatives (\`update-alternatives\`) let packages share paths. The \`/var/lib/dpkg/updates/\` journal records in-progress status changes, which \`dpkg --configure -a\` replays after a crash. \`/var/log/dpkg.log\` logs every state transition with timestamps.`,
          useCases: [
            'Finding which package owns a binary on an Ubuntu host during an incident (`dpkg -S`)',
            'Cleaning up `rc` entries left after removals to keep inventories accurate',
            'Recovering from a power loss during unattended-upgrades with dpkg --configure -a',
            'Installing a vendor .deb in an offline environment along with its dependency .debs'
          ],
          syntax: 'dpkg -l [PATTERN]\ndpkg-query -W -f=\'${Package}\\t${Version}\\n\' [PATTERN]\ndpkg -s PKG | dpkg -L PKG | dpkg -S /path\ndpkg -i FILE.deb   (prefer: apt install ./FILE.deb)\ndpkg -r PKG | dpkg -P PKG\ndpkg --configure -a\ndpkg --verify PKG\ndpkg -c FILE.deb | dpkg -I FILE.deb',
          options: [
            ['-l', 'List packages with desired/status/error flags'],
            ['-s / -L', 'Status and metadata / installed file list'],
            ['-S PATH', 'Search for the package owning a path'],
            ['-i / -r / -P', 'Install a .deb / remove / purge'],
            ['--configure -a', 'Configure all unpacked but unconfigured packages'],
            ['-c / -I', 'List contents / show control info of a .deb file'],
            ['--verify', 'Verify installed files against recorded checksums']
          ],
          examples: [
            {
              title: 'Read package states',
              cmd: 'dpkg -l | grep -Ev "^ii" | tail -4',
              out: 'rc  apache2              2.4.58-1ubuntu8.4  amd64  Apache HTTP Server\nrc  linux-image-6.8.0-31-generic 6.8.0-31.31 amd64 Signed kernel image generic\niF  mysql-server-8.0     8.0.39-0ubuntu0.24.04.2 amd64 MySQL database server binaries\niU  libfoo1              1.2-3              amd64  example library',
              fields: [
                ['rc', 'Removed, config files remain — purge to clean'],
                ['iF', 'Wanted installed, configuration (postinst) failed — check its log'],
                ['iU', 'Unpacked but not configured — run dpkg --configure -a']
              ]
            },
            {
              title: 'Who owns this file?',
              cmd: 'dpkg -S /usr/sbin/sshd && dpkg -s openssh-server | grep -E "^(Status|Version)"',
              out: 'openssh-server: /usr/sbin/sshd\nStatus: install ok installed\nVersion: 1:9.6p1-3ubuntu13.5',
              fields: [
                ['openssh-server: /usr/sbin/sshd', 'Owning package and path'],
                ['install ok installed', 'Desired=install, error=ok, status=installed'],
                ['1:9.6p1-3ubuntu13.5', 'Epoch 1, upstream 9.6p1, Ubuntu revision 3ubuntu13.5']
              ]
            },
            {
              title: 'Local .deb with missing dependencies',
              cmd: 'sudo dpkg -i vendor-agent_3.1_amd64.deb',
              out: 'dpkg: dependency problems prevent configuration of vendor-agent:\n vendor-agent depends on libjq1; however:\n  Package libjq1 is not installed.\ndpkg: error processing package vendor-agent (--install):\n dependency problems - leaving unconfigured',
              fields: [
                ['leaving unconfigured', 'Files unpacked but postinst not run: status iU'],
                ['depends on libjq1', 'dpkg does not fetch dependencies']
              ],
              note: 'Fix with `sudo apt-get -f install` (installs missing deps and configures), or use `sudo apt install ./vendor-agent_3.1_amd64.deb` from the start.'
            }
          ],
          walkthrough: [
            'List packages: `dpkg -l | head -10` and identify the header legend.',
            'Find the owner of `/bin/ls` with `dpkg -S /bin/ls` (coreutils; note usrmerge paths).',
            'List files: `dpkg -L coreutils | head` and status `dpkg -s coreutils`.',
            'Script-friendly inventory: `dpkg-query -W -f=\'${Package}\\t${Version}\\n\' | sort > ~/debs.tsv`.',
            'Download and inspect a .deb without installing: `apt download tree && dpkg -I tree_*.deb && dpkg -c tree_*.deb`.',
            'Verify a package: `sudo dpkg --verify coreutils` (no output = OK).'
          ],
          lab: {
            goal: 'Inspect, install and repair packages with dpkg on a Debian/Ubuntu VM.',
            steps: [
              'Snapshot the VM. Download a package and one of its dependencies: `apt download jq libjq1 libonig5`.',
              'Install only jq with dpkg to reproduce a dependency failure: `sudo dpkg -i jq_*.deb` and check `dpkg -l jq` (expect iU).',
              'Repair with `sudo apt-get -f install -y` and confirm `dpkg -l jq` shows ii.',
              'Remove without purge: `sudo apt remove -y jq` then `dpkg -l jq` (rc if it had conffiles, otherwise gone).',
              'List all rc packages and purge them: `dpkg -l | awk \'/^rc/ {print $2}\' | xargs -r sudo dpkg -P`.',
              'Read `/var/log/dpkg.log` for the state transitions you produced.'
            ],
            verify: '`dpkg -l | grep -c "^rc"` returns 0; `dpkg --audit` prints nothing (no half-installed packages); `grep jq /var/log/dpkg.log` shows unpack, configure and remove entries.'
          },
          troubleshooting: {
            scenario: 'After a power cut during `unattended-upgrades`, every apt command says "E: dpkg was interrupted, you must manually run \'sudo dpkg --configure -a\' to correct the problem."',
            steps: [
              'Evidence: `dpkg --audit` lists half-configured packages; `tail /var/log/dpkg.log` shows the last package being configured.',
              'Hypothesis: the transaction stopped between unpack and configure.',
              'Fix: ensure no apt/dpkg process runs (`ps aux | grep -E "apt|dpkg"`), then `sudo dpkg --configure -a`; follow with `sudo apt-get -f install` if dependencies are broken.',
              'Validate: `dpkg --audit` is empty, `apt-get check` reports no errors, affected services start.'
            ]
          },
          mistakes: [
            'Deleting `/var/lib/dpkg/lock*` while another apt/dpkg is running — corrupts the status database.',
            'Using `dpkg -i` for packages with dependencies and leaving them iU.',
            'Using `--force-all` or `--force-depends` as a fix — creates silent inconsistencies.',
            'Expecting `apt remove` to delete configuration — use purge.'
          ],
          safety: [
            'dpkg install/remove/configure need root; queries do not.',
            'Back up `/var/lib/dpkg` (dpkg keeps `/var/backups/dpkg.status.*`) before manual repairs.',
            'Repair with `dpkg --configure -a` and `apt-get -f install` before any force option.'
          ],
          distro: `Debian/Ubuntu only. On "usrmerge" systems (Debian 12+, Ubuntu 20.04+) \`/bin\` is a symlink to \`/usr/bin\`, so \`dpkg -S\` may need the \`/usr/bin\` or \`/bin\` path the package registered. RHEL equivalents: \`rpm -qa\`, \`rpm -qi\`, \`rpm -ql\`, \`rpm -qf\`, \`rpm -V\`; there is no RPM equivalent of the unpacked-but-unconfigured state because rpm runs install and %post in one transaction.`,
          challenge: {
            task: 'On an Ubuntu host, list every package whose configuration failed or is incomplete, explain the state of each, and bring the system back to a consistent state.',
            solution: `\`\`\`
dpkg -l | awk '$1 ~ /^.[UFHWt]/ || $1 ~ /R$/'   # unpacked, half-configured/installed, trigger states, reinst-required
sudo dpkg --audit
ps aux | grep -E '[a]pt|[d]pkg'                  # nothing else must be running
sudo dpkg --configure -a
sudo apt-get -f install
sudo apt-get check && dpkg --audit
\`\`\`

Reasoning: the second status letter shows the current state (U unpacked, F half-configured, H half-installed, W/t triggers) and a trailing R means reinstall required. \`dpkg --configure -a\` completes postinst for all unpacked packages, \`apt-get -f install\` resolves missing dependencies, and \`apt-get check\`/\`dpkg --audit\` confirm consistency. If a postinst keeps failing, read its output in \`/var/log/apt/term.log\` and fix the underlying cause (e.g. a service config error) rather than forcing.`
          },
          interview: [
            {
              q: 'What does the rc state in dpkg -l mean?',
              a: 'Desired state remove (r), current state config-files (c): the package was removed but its configuration files are still on disk. dpkg -P or apt purge removes them.',
              mistake: 'Saying rc means "release candidate" or that the package is still installed.',
              followUp: 'How would you purge all rc packages at once?'
            },
            {
              q: 'apt says "dpkg was interrupted". What do you do?',
              a: 'Confirm no apt or dpkg process is still running, then run dpkg --configure -a to finish configuring unpacked packages, followed by apt-get -f install to repair dependencies, and verify with dpkg --audit and apt-get check. I would not delete lock files while a process holds them.',
              mistake: 'Deleting /var/lib/dpkg/lock files immediately or rebooting repeatedly.',
              followUp: 'Which logs show what was being installed? (/var/log/dpkg.log, /var/log/apt/term.log)'
            },
            {
              q: 'What is the difference between dpkg -i and apt install ./file.deb?',
              a: 'dpkg -i unpacks and configures the package but does not fetch dependencies, so it leaves the package unconfigured if they are missing. apt install ./file.deb treats the local file as a candidate, resolves and downloads dependencies from configured sources and then calls dpkg.',
              mistake: 'Saying they are identical.',
              followUp: 'What is the RHEL equivalent pair? (rpm -i vs dnf install ./file.rpm)'
            }
          ],
          revision: [
            'dpkg = low-level, no dependency resolution; status DB /var/lib/dpkg/status.',
            'dpkg -l letters: desired / current / error — ii OK, rc config left, iU unpacked, iF failed configure.',
            '-s status, -L files, -S owner, -I/-c inspect a .deb.',
            'Interrupted? dpkg --configure -a then apt-get -f install.',
            'Prefer apt install ./file.deb over dpkg -i.'
          ]
        }
      ]
    },
    {
      id: 'L06-M5', title: 'Troubleshooting package problems',
      summary: 'Diagnose and fix repository failures, dependency conflicts, rpmdb problems and interrupted transactions with evidence-first methods that never weaken signature checking.',
      lessons: [
        {
          id: 'L06-M5-T1',
          title: 'Repository and metadata failures',
          minutes: 40,
          objectives: [
            'Read dnf repository error messages and map them to a layer (DNS, network, TLS, auth, path, signature)',
            'Test repository URLs independently of dnf with curl',
            'Fix stale caches, proxy settings, clock skew and subscription issues',
            'Explain why skip_if_unavailable and gpgcheck=0 are not fixes'
          ],
          prereqs: ['L06-M2-T2'],
          concept: `When \`dnf\` cannot read a repository, the whole command usually stops (RHEL default \`skip_if_unavailable=False\`). The error text always contains the **repo ID** and usually a **URL** and an **error class**. Troubleshooting is a matter of walking the path dnf takes, layer by layer:

1. **Configuration** — is the repo enabled and is baseurl/metalink correct? (\`dnf repolist -v\`, \`/etc/yum.repos.d/*.repo\`)
2. **Name resolution** — \`Curl error (6): Couldn't resolve host name\` → DNS (\`getent hosts HOST\`, \`/etc/resolv.conf\`).
3. **Connectivity / proxy** — \`Curl error (7): Failed to connect\`, \`(28): Timeout\` → routing, firewall, proxy. dnf uses \`proxy=\` in dnf.conf or the repo file, **not** your shell's \`http_proxy\` reliably for every case — configure it explicitly.
4. **TLS** — \`Curl error (60): SSL certificate problem\` → CA trust (\`/etc/pki/ca-trust/\`, \`update-ca-trust\`), intercepting proxies, or a **wrong system clock** (certificates "not yet valid").
5. **Authentication / entitlement** — HTTP **403/401** from \`cdn.redhat.com\` → subscription expired or not attached; entitlement certificates in \`/etc/pki/entitlement/\`.
6. **Path / content** — HTTP **404** on \`repodata/repomd.xml\` → wrong path, wrong \`$releasever\`/\`$basearch\` expansion, or a mirror being resynced.
7. **Integrity / signatures** — "repomd.xml GPG signature verification error" or "Public key for X is not installed" / "GPG check FAILED" → wrong or missing key, or tampered content.
8. **Stale cache** — metadata checksums no longer match ("Cannot download ... checksum doesn't match") → \`dnf clean metadata\` / \`dnf clean all\` and retry.

### Test outside dnf
Reproduce with curl to separate dnf from the network: \`curl -v https://HOST/PATH/repodata/repomd.xml\` (add \`--cert/--key/--cacert\` for Red Hat CDN entitlement certs, or \`-x proxy:port\`). If curl fails the same way, the problem is not dnf.

### Not fixes
- \`gpgcheck=0\` / \`--nogpgcheck\` hides tampering and wrong-key problems.
- \`skip_if_unavailable=True\` silently drops a repo, so dnf may install an older or third-party version, or miss security updates.
- \`sslverify=0\` disables server authentication. Fix the CA trust instead.

Use temporary narrowing for diagnosis (\`--disablerepo=broken-repo\`) and document it, but repair the root cause.`,
          internals: `dnf expands variables such as \`$releasever\` (from the system-release package, or \`/etc/dnf/vars/releasever\` when set to lock a minor release) and \`$basearch\` in repo URLs. librepo performs the HTTP(S) download via libcurl, which is why the errors carry curl error numbers. For each repo, repomd.xml is fetched first; its \`<checksum>\` entries validate primary/filelists/updateinfo. If \`repo_gpgcheck=1\`, the detached \`repomd.xml.asc\` signature is verified too.

On subscribed RHEL hosts, \`subscription-manager\` writes \`redhat.repo\` with \`sslclientcert\`/\`sslclientkey\` pointing at entitlement certificates (or uses Simple Content Access); \`rhsmcertd\` refreshes them. Log details: \`/var/log/dnf.log\`, \`/var/log/dnf.librepo.log\` (URLs and HTTP codes) and \`/var/log/rhsm/rhsm.log\`.`,
          useCases: [
            'Patch night failure on 200 servers caused by an expired proxy password or a changed proxy host',
            'Air-gapped mirror moved to a new path, breaking every baseurl',
            'Cloned VM template with wrong clock causing TLS "certificate is not yet valid" errors',
            'Subscription expiry discovered when security updates suddenly fail with HTTP 403'
          ],
          syntax: 'dnf repolist -v ; dnf repoinfo ID\ndnf clean metadata | dnf clean all ; dnf makecache\ndnf --disablerepo=ID ... (diagnosis only)\ncurl -v URL/repodata/repomd.xml\ngetent hosts HOST ; timedatectl\nsubscription-manager status ; subscription-manager refresh\ntail /var/log/dnf.librepo.log',
          options: [
            ['dnf -v', 'Verbose output including URLs dnf tries'],
            ['--setopt=ID.skip_if_unavailable=True', 'One-off override to unblock an urgent install while the repo is fixed (document it)'],
            ['clean metadata / clean all', 'Remove cached metadata / metadata and packages'],
            ['proxy=, proxy_username=, proxy_password=', 'Proxy settings in dnf.conf [main] or a repo section'],
            ['sslcacert=', 'Custom CA for a repo (instead of disabling sslverify)'],
            ['/etc/dnf/vars/', 'Override variables like releasever for minor-release locking']
          ],
          examples: [
            {
              title: 'DNS failure',
              cmd: 'sudo dnf makecache',
              out: 'Errors during downloading metadata for repository \'internal-tools\':\n  - Curl error (6): Couldn\'t resolve host name for http://repo.example.lab/tools/el9/repodata/repomd.xml [Could not resolve host: repo.example.lab]\nError: Failed to download metadata for repo \'internal-tools\': Cannot download repomd.xml: Cannot download repodata/repomd.xml: All mirrors were tried',
              fields: [
                ['internal-tools', 'Failing repo ID'],
                ['Curl error (6)', 'Name resolution failed — check DNS, not dnf'],
                ['All mirrors were tried', 'Every URL for the repo failed']
              ]
            },
            {
              title: 'TLS failure caused by a wrong clock',
              cmd: 'curl -sS -o /dev/null https://cdn.redhat.com/ ; timedatectl | grep -E "Local time|synchronized"',
              out: 'curl: (60) SSL certificate problem: certificate is not yet valid\n               Local time: Mon 2019-01-07 09:12:44 IST\nSystem clock synchronized: no',
              fields: [
                ['certificate is not yet valid', 'Server certificate validity starts after the host\'s (wrong) current time'],
                ['System clock synchronized: no', 'chronyd is not syncing — root cause']
              ],
              note: 'Fix time (chronyc sources, enable chronyd, timedatectl set-ntp true), then retry dnf.'
            },
            {
              title: 'Entitlement / subscription failure',
              cmd: 'tail -2 /var/log/dnf.librepo.log',
              out: 'ERROR Curl error (22): The requested URL returned error: 403 for https://cdn.redhat.com/content/dist/rhel9/9/x86_64/baseos/os/repodata/repomd.xml\nERROR Cannot download repomd.xml',
              fields: [
                ['403', 'The CDN refused the client certificate — check subscription-manager status, refresh, or re-register'],
                ['content/dist/rhel9/9', 'Path built from $releasever; a locked minor release appears here instead of 9']
              ]
            }
          ],
          walkthrough: [
            'Reproduce and capture the exact error with `sudo dnf -v makecache 2>&1 | tail -20`; note the repo ID and URL.',
            'Inspect the definition: `dnf repoinfo ID` or `grep -A8 "^\\[ID\\]" /etc/yum.repos.d/*.repo`.',
            'Test the layers: `getent hosts HOST`, `curl -v URL/repodata/repomd.xml`, `timedatectl`.',
            'Check proxy and CA settings in `/etc/dnf/dnf.conf` and the repo file.',
            'For Red Hat CDN: `subscription-manager status` and `subscription-manager refresh`.',
            'Fix the root cause, then `sudo dnf clean all && sudo dnf makecache` and confirm with `dnf repolist -v`.'
          ],
          lab: {
            goal: 'Break a repository in three different ways and fix each from evidence on a RHEL 9/10 VM with a local or internal repo.',
            steps: [
              'Snapshot the VM. Copy your local ISO repo file to a backup: `sudo cp -a /etc/yum.repos.d/local-iso.repo /root/`.',
              'Break the path: change `baseurl` to `file:///mnt/iso/BaseOSX`; run `sudo dnf makecache` and record the error; fix it.',
              'Break the key: set `gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-missing`, remove `tree` if installed, and run `sudo dnf install tree`; read the GPG error; fix it.',
              'Break the media: `sudo umount /mnt/iso` and run `sudo dnf makecache`; observe the error and remount with `sudo mount -a`.',
              'For a network repo (if available): set an invalid `proxy=http://10.255.255.1:3128` in dnf.conf, observe the Curl error (7)/(28), and remove it.',
              'Review `/var/log/dnf.librepo.log` for the corresponding entries.'
            ],
            verify: '`sudo dnf clean all && sudo dnf makecache` succeeds; `dnf repolist -v` shows both repos with package counts; `diff /root/local-iso.repo /etc/yum.repos.d/local-iso.repo` shows no differences; gpgcheck is still 1.'
          },
          troubleshooting: {
            scenario: 'Patch automation fails on all servers in one data centre with "Curl error (56): Failure when receiving data from the peer" for every repo; other sites are fine.',
            steps: [
              'Evidence: `curl -v -x http://proxy-dc2:3128 https://cdn.redhat.com/` fails the same way; without the proxy the network is blocked by design.',
              'Hypothesis: the DC2 forward proxy is dropping connections or TLS inspection was enabled on it.',
              'Fix: engage the proxy team; if TLS inspection is policy, install the inspection CA via `/etc/pki/ca-trust/source/anchors/` + `update-ca-trust` (with security approval) rather than `sslverify=0`.',
              'Validate: curl returns 200/403 consistently, `dnf makecache` works on a canary, then rerun automation.'
            ]
          },
          mistakes: [
            'Setting `gpgcheck=0` or `sslverify=0` to "make it work".',
            'Enabling `skip_if_unavailable=True` globally and then silently missing security updates.',
            'Retrying dnf repeatedly without reading the repo ID and curl error number.',
            'Hand-editing redhat.repo instead of fixing the subscription.'
          ],
          safety: [
            'Diagnosis (curl, repolist, logs) is read-only; changing .repo/dnf.conf/CA trust needs root and change control.',
            'Back up repo files before editing; validate with dnf makecache before running upgrades.',
            'Any CA added to system trust affects all TLS clients on the host — get security approval.'
          ],
          distro: `RHEL 8/9/10 behave the same here (librepo/libcurl). RHEL 9+ crypto policies may reject old TLS versions or SHA-1 certificates from legacy internal mirrors (\`update-crypto-policies --show\`); fix the server rather than downgrading the policy. Debian/Ubuntu: \`apt update\` errors like "Temporary failure resolving", "NO_PUBKEY", "Release file ... is not valid yet" (clock) map to the same layers.`,
          challenge: {
            task: 'A server reports `Error: Failed to download metadata for repo \'rhel-9-for-x86_64-appstream-rpms\'` while BaseOS works. `curl` with the entitlement certificates gets HTTP 404 for `.../rhel9/9.2/x86_64/appstream/os/repodata/repomd.xml`. Explain and fix.',
            solution: `The path contains **9.2**, so \`$releasever\` is locked to a minor release (via \`subscription-manager release --set=9.2\` or \`/etc/dnf/vars/releasever\`). AppStream content for that minor/EUS stream is not available to this subscription or path, so the CDN returns 404.

\`\`\`
subscription-manager release --show
cat /etc/dnf/vars/releasever 2>/dev/null
# Decide with the owner: either use the matching EUS repos for 9.2, or unlock:
sudo subscription-manager release --unset
sudo dnf clean all && sudo dnf makecache
\`\`\`

Reasoning: a release lock is a deliberate policy; confirm intent before unsetting. If the business needs 9.2 EUS, enable the EUS repositories instead (\`subscription-manager repos --enable rhel-9-for-x86_64-appstream-eus-rpms\`, with a matching BaseOS EUS repo). Validate with \`dnf repolist -v\`.`
          },
          interview: [
            {
              q: 'Walk me through troubleshooting "Failed to download metadata for repo X".',
              a: 'Read the repo ID and curl error, then check layer by layer: repo definition and URL (repolist -v), DNS (getent hosts), connectivity and proxy (curl -v to repomd.xml, proxy settings in dnf.conf), TLS and time (curl error 60, timedatectl), entitlement (403 from the CDN, subscription-manager status), and path/content (404, $releasever). Then clean the cache and retry. I never disable gpgcheck or sslverify as a fix.',
              mistake: 'Jumping straight to dnf clean all and retrying until it works.',
              followUp: 'Which log shows the exact URLs and HTTP codes? (/var/log/dnf.librepo.log)'
            },
            {
              q: 'Why is skip_if_unavailable=False the default on RHEL?',
              a: 'Because skipping an unavailable repo silently changes what dnf can see: it might resolve to older versions from another repo, fail to apply security updates without a clear error, or install from a lower-priority third-party repo. Failing loudly forces the admin to fix the repository.',
              mistake: 'Saying it is only for performance.',
              followUp: 'When would you override it, and how? (one-off --setopt for a known-broken optional repo, documented)'
            },
            {
              q: 'dnf reports a TLS certificate error to an internal mirror only on newly cloned VMs. What is your hypothesis?',
              a: 'The clone has a wrong system clock (not yet valid / expired errors) or lacks the internal CA in the trust store that the original image had. Check timedatectl and chronyc tracking, and trust anchors under /etc/pki/ca-trust/source/anchors.',
              mistake: 'Setting sslverify=0 in the template.',
              followUp: 'How do you add an internal CA permanently? (copy to anchors, update-ca-trust)'
            }
          ],
          revision: [
            'Read repo ID + curl error number first: 6 DNS, 7/28 connect/timeout, 60 TLS, 22 HTTP (403 auth, 404 path).',
            'Reproduce with curl -v against repodata/repomd.xml.',
            'Clock skew breaks TLS; fix time with chronyd.',
            'Logs: /var/log/dnf.log, dnf.librepo.log, rhsm/rhsm.log.',
            'gpgcheck=0, sslverify=0 and global skip_if_unavailable=True are not fixes.'
          ]
        },
        {
          id: 'L06-M5-T2',
          title: 'Dependency conflicts, rpmdb problems and interrupted transactions',
          minutes: 45,
          objectives: [
            'Read dnf solver problem reports and choose a safe resolution',
            'Recover from interrupted dnf transactions and duplicate package versions',
            'Diagnose rpmdb lock and corruption problems and rebuild the database safely',
            'Explain why --nodeps, --force and --skip-broken are dangerous defaults'
          ],
          prereqs: ['L06-M5-T1', 'L06-M3-T1'],
          concept: `### Dependency conflicts
The dnf solver either finds a consistent transaction or prints a **Problem** report. Common shapes:

- **"nothing provides X needed by Y"** — a dependency is missing from all enabled repos: a repo is disabled (e.g. AppStream, CodeReady Builder) or the package was built for another release (\`el8\` package on \`el9\`).
- **"package A requires B < 2, but none of the providers can be installed"** with **"cannot install both B-1 and B-2"** — two packages need incompatible versions; often a third-party repo mixing versions, or a versionlock/exclude blocking an update.
- **"conflicting requests" / "file /x from install of A conflicts with file from package B"** — two packages own the same path.
- **"problem with installed package"** — something already installed blocks the change.

Safe options, in order of preference:
1. **Enable the missing repository** or install the correct build for your release.
2. **Remove or relax the blocker** (versionlock, exclude, a third-party package) after impact review.
3. Use \`--allowerasing\` **only after reading which packages it will remove** (e.g. swapping \`curl-minimal\` for \`curl\`).
4. \`--skip-broken\` / \`--nobest\` to proceed with what is installable **as a documented, temporary decision** — it can leave you without a security fix.

Never "fix" with \`rpm -Uvh --nodeps\` or \`--force\`: the rpmdb will then claim a consistent system that is not, and the next dnf transaction inherits the damage. \`dnf check\` reports existing dependency problems, duplicates and obsoleted packages in the installed set.

### Interrupted transactions
If dnf is killed mid-transaction (power loss, OOM, SSH drop without tmux), you may see **duplicate packages** (both old and new versions recorded) or missing files. RHEL 8+ has no yum-complete-transaction; instead:
1. \`dnf check\` and \`rpm -qa --qf '%{NAME}\\n' | sort | uniq -d\` (ignoring installonly packages like kernel and gpg-pubkey) show duplicates.
2. \`dnf remove --duplicates\` removes older duplicates; \`dnf distro-sync\` aligns installed versions with the repos.
3. \`rpm -Va\` on affected packages, then \`dnf reinstall\` damaged ones.

### rpmdb problems
- **Lock waits** — "Waiting for process with pid N to finish" means another dnf/rpm (often PackageKit, dnf-automatic or insights) is running. Wait or stop that job; do not delete lock files.
- **Corruption** — errors like "rpmdb: ... error", "cannot open Packages database", or SQLite "database disk image is malformed". Back up the db directory, then \`rpm --rebuilddb\`.

> Always run long transactions inside tmux/screen or via automation so an SSH disconnect cannot interrupt them.`,
          internals: `dnf hands a full transaction set to librpm, which orders packages by dependencies, installs new versions, runs scriptlets and erases old versions as a last step per package. If the process dies after installing a new version but before erasing the old header, the rpmdb records both — the "duplicate" state. \`dnf remove --duplicates\` erases the older headers (and files not owned by the newer version).

\`rpm --rebuilddb\` reads every header from the existing database and writes a fresh one (SQLite on RHEL 9, BDB on RHEL 8), then swaps it in. It cannot recover headers that are unreadable, so a backup comes first: \`tar czf /root/rpmdb-$(date +%F).tgz -C "$(rpm --eval '%_dbpath')" .\`. Locks are taken via fcntl on the database files; stale lock files left by a dead process are released by the kernel, which is why "deleting the lock" is rarely the real fix.`,
          useCases: [
            'Upgrading a server that has third-party repos (EPEL, vendor) pulling incompatible library versions',
            'Recovering a VM whose patch run was killed by the OOM killer halfway through',
            'Fixing a host where dnf hangs because PackageKit or dnf-automatic holds the rpmdb lock',
            'Repairing a damaged rpmdb after a filesystem error on /var'
          ],
          syntax: 'dnf check\ndnf install|upgrade ... --allowerasing | --skip-broken | --nobest\ndnf remove --duplicates\ndnf distro-sync\ndnf repoquery --whatrequires NAME --installed\nrpm --rebuilddb\nrpm -Va\nps -ef | grep -E "[d]nf|[r]pm|[p]ackagekit"',
          options: [
            ['--allowerasing', 'Allow removal of installed packages to resolve conflicts (read the list!)'],
            ['--skip-broken', 'Skip packages with unresolvable dependencies'],
            ['--nobest', 'Allow non-latest versions when the best cannot be installed'],
            ['dnf check', 'Report dependency problems, duplicates and obsoletes in the installed set'],
            ['remove --duplicates', 'Remove older duplicate versions after an interrupted transaction'],
            ['distro-sync', 'Synchronise installed packages to the versions in enabled repos (may downgrade)'],
            ['rpm --rebuilddb', 'Rebuild the rpmdb from existing headers (back up first)']
          ],
          examples: [
            {
              title: 'Missing dependency from a disabled repo',
              cmd: 'sudo dnf install ansible-collection-community-general',
              out: 'Error:\n Problem: conflicting requests\n  - nothing provides python3-jmespath needed by ansible-collection-community-general-9.4.0-1.el9.noarch from epel\n(try to add \'--skip-broken\' to skip uninstallable packages or \'--nobest\' to use not only best candidate packages)',
              fields: [
                ['nothing provides python3-jmespath', 'The dependency is not available in any enabled repo'],
                ['from epel', 'The requested package comes from EPEL, which expects CodeReady Builder (CRB) to be enabled'],
                ['try --skip-broken', 'A suggestion, not a fix: it would simply not install the package']
              ],
              note: 'Fix: enable CRB (`subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms`, or `dnf config-manager --set-enabled crb` on Rocky/Alma).'
            },
            {
              title: 'Find duplicates after an interrupted update',
              cmd: 'sudo dnf check',
              out: 'glibc-2.34-100.el9_4.2.x86_64 is a duplicate with glibc-2.34-125.el9_5.1.x86_64\nsystemd-252-32.el9_4.x86_64 is a duplicate with systemd-252-46.el9_5.2.x86_64\nError: Check discovered 2 problem(s)',
              fields: [
                ['is a duplicate with', 'Both versions are recorded in the rpmdb — transaction did not finish erasing the old version'],
                ['2 problem(s)', 'Count of issues; non-zero exit status']
              ],
              note: 'Next: `sudo dnf remove --duplicates`, then `dnf check` and `rpm -V glibc systemd`.'
            },
            {
              title: 'Conflict that needs --allowerasing',
              cmd: 'sudo dnf install curl --assumeno',
              out: 'Error:\n Problem: problem with installed package curl-minimal-7.76.1-31.el9.x86_64\n  - package curl-minimal-7.76.1-31.el9.x86_64 conflicts with curl provided by curl-7.76.1-31.el9.x86_64\n(try to add \'--allowerasing\' to command line to replace conflicting packages ...)',
              fields: [
                ['curl-minimal conflicts with curl', 'Both provide /usr/bin/curl; only one may be installed'],
                ['--allowerasing', 'Here the intended, safe resolution: swap curl-minimal for curl']
              ]
            }
          ],
          walkthrough: [
            'Run `sudo dnf check` on a healthy system to see the baseline (no output, exit 0).',
            'Read a solver problem carefully: identify the requested package, the missing/conflicting capability and the repo involved.',
            'Query relationships: `dnf repoquery --whatprovides CAPABILITY` and `dnf repoquery --installed --whatrequires PKG`.',
            'Preview any --allowerasing run with `--assumeno` and list what would be removed.',
            'Check for lock holders before acting: `ps -ef | grep -E "[d]nf|[p]ackagekit"`.',
            'Practise the rpmdb backup/rebuild on a lab VM: back up, `rpm --rebuilddb`, then `rpm -qa | wc -l` to compare counts.'
          ],
          lab: {
            goal: 'Recover from an interrupted package transaction and rebuild the rpmdb safely on a disposable RHEL 9/10 VM.',
            steps: [
              'Take a VM snapshot named `pre-rpmdb-lab` — this lab deliberately damages package state.',
              'Record a baseline: `rpm -qa | sort > /root/pkgs-before.txt; dnf check`.',
              'Simulate an interruption: start `sudo dnf -y reinstall glibc-langpack-en` (or any upgrade) and press Ctrl+C during "Running transaction" — or, simpler, power off the VM from the hypervisor mid-transaction.',
              'Boot, then run `sudo dnf check` and `rpm -qa --qf "%{NAME}\\n" | sort | uniq -d | grep -vE "^(kernel|gpg-pubkey)"` to look for duplicates; fix with `sudo dnf remove --duplicates` if any.',
              'Back up and rebuild the database: `sudo tar czf /root/rpmdb-backup.tgz -C "$(rpm --eval %_dbpath)" . && sudo rpm --rebuilddb`.',
              'Verify affected packages with `rpm -V glibc-langpack-en` and reinstall if files are damaged.'
            ],
            verify: '`dnf check` exits 0 with no output; `rpm -qa | sort | diff - /root/pkgs-before.txt` shows no unexpected changes; `dnf history list | head` works; `/root/rpmdb-backup.tgz` exists. Revert to the snapshot if anything is worse than before.'
          },
          troubleshooting: {
            scenario: 'Every `dnf` command on a server hangs with "Waiting for process with pid 2314 to finish." and the on-call engineer proposes deleting the rpmdb lock files.',
            steps: [
              'Evidence: `ps -fp 2314` shows `/usr/bin/python3 /usr/bin/dnf-automatic` started 3 minutes ago; `journalctl -u dnf-automatic.service -f` shows it downloading updates.',
              'Hypothesis: a legitimate automated transaction holds the lock; deleting files would cause two writers.',
              'Fix: wait for it to finish (or stop the timer/service cleanly if it conflicts with the change window: `systemctl stop dnf-automatic.timer`), then run your command.',
              'Validate: `dnf history list | head -3` shows the automatic transaction completed; your command proceeds; coordinate future windows with the timer schedule.'
            ]
          },
          mistakes: [
            'Using `rpm -ivh --nodeps --force` to get past a dependency error — corrupts the consistency of the system.',
            'Running `--allowerasing -y` without reading what it removes.',
            'Making `--skip-broken` permanent (skip_broken=True) and silently missing updates.',
            'Running `rpm --rebuilddb` without a backup, or while dnf is running.',
            'Patching over SSH without tmux/screen, so a network blip interrupts the transaction.'
          ],
          safety: [
            'Snapshot/back up before repairs; back up the rpmdb directory before --rebuilddb.',
            'Confirm no other package manager process is running before any repair.',
            'Prefer reversible actions (enable a repo, remove a lock) over destructive ones (erasing packages).',
            'After repair, validate with dnf check, rpm -V on affected packages and service health checks.'
          ],
          distro: `RHEL 7 had \`yum-complete-transaction\` and \`package-cleanup --dupes\`; on RHEL 8/9/10 use \`dnf remove --duplicates\`, \`dnf check\` and \`dnf distro-sync\`. RHEL 9 swapped curl/curl-minimal and similar "-minimal" packages that need \`--allowerasing\`. EPEL on RHEL 9/10 requires CodeReady Builder (CRB). Debian/Ubuntu: \`apt-get -f install\`, \`dpkg --configure -a\`, \`apt-get check\` (Module 4).`,
          challenge: {
            task: 'After a failed overnight patch run (OOM-killed), `dnf upgrade` fails with "problem with installed package openssl-libs-1:3.0.7-27.el9" and `dnf check` lists openssl-libs and two other packages as duplicates. Restore a consistent state and complete the patching safely.',
            solution: `\`\`\`
ps -ef | grep -E '[d]nf|[r]pm'                     # 1. no other transaction running
sudo tar czf /root/rpmdb-$(date +%F).tgz -C "$(rpm --eval %_dbpath)" .   # 2. backup
sudo dnf check                                      # 3. record the problems
sudo dnf remove --duplicates                        # 4. erase older duplicate headers
sudo rpm -V openssl-libs || sudo dnf reinstall -y openssl-libs   # 5. repair files if needed
sudo dnf check && sudo dnf upgrade -y               # 6. resume patching
sudo dnf needs-restarting -r
\`\`\`

Reasoning: the transaction installed new versions but died before erasing old headers, producing duplicates that block the solver. Removing duplicates restores a single version per package; \`rpm -V\` proves files match, and reinstall fixes any partially written files. Then the original upgrade completes and needs-restarting decides on a reboot. Root cause follow-up: investigate the OOM (memory sizing or other workloads during the window).`
          },
          interview: [
            {
              q: 'dnf says "nothing provides libX.so.2 needed by package Y". How do you approach it?',
              a: 'Find which package provides that capability with dnf repoquery --whatprovides or dnf provides libX.so.2, then check whether its repo is enabled (CRB, AppStream, vendor) and whether Y was built for my release. Enable the right repo or get the correct build. I would not install with --nodeps.',
              mistake: 'Downloading a random RPM of libX from the internet and installing it with rpm --nodeps.',
              followUp: 'What does --skip-broken do and why is it risky?'
            },
            {
              q: 'A dnf update was interrupted. How do you recover?',
              a: 'Make sure no package process is running, back up the rpmdb, run dnf check to find duplicates and problems, remove duplicates with dnf remove --duplicates, verify affected packages with rpm -V and reinstall damaged ones, then re-run the update and check needs-restarting. If the system is badly damaged, restore the pre-patch snapshot.',
              mistake: 'Answering yum-complete-transaction on RHEL 8/9 or simply rebooting.',
              followUp: 'How do you prevent it? (tmux/automation, adequate memory, snapshots)'
            },
            {
              q: 'When is rpm --rebuilddb appropriate?',
              a: 'When the rpmdb shows corruption symptoms such as database open errors or malformed SQLite messages and no package process is running. Back up the db directory first, rebuild, then compare rpm -qa counts and run dnf check. It is not a fix for lock waits or dependency problems.',
              mistake: 'Running it as a first step for every dnf error.',
              followUp: 'Where is the rpmdb on RHEL 9 vs RHEL 10?'
            },
            {
              q: 'What does --allowerasing do?',
              a: 'It allows the solver to remove installed packages to resolve conflicts, for example replacing curl-minimal with curl. It is safe only after reviewing the list of packages to be removed, ideally with --assumeno first.',
              mistake: 'Treating it as a generic "force" option.',
              followUp: 'What is the difference with --skip-broken?'
            }
          ],
          revision: [
            '"nothing provides" = missing repo or wrong-release package; enable the right repo.',
            '--allowerasing removes packages (review first); --skip-broken/--nobest skip updates (temporary only).',
            'Never --nodeps/--force; dnf check finds duplicates and broken deps.',
            'Interrupted transaction: dnf check -> dnf remove --duplicates -> rpm -V -> reinstall.',
            'Lock wait = another package process; never delete locks. rpm --rebuilddb only after backup.'
          ]
        }
      ]
    }
  ]
};
