// Level 8 — Systemd and Enterprise Service Administration
export default {
  id: 'L08', number: 8,
  title: 'Systemd and Enterprise Service Administration',
  summary: 'Manage services the way production RHEL estates do: read and write unit files, control dependencies and ordering, use drop-in overrides, timers, sockets and mount units, and debug and harden services with the journal and systemd sandboxing.',
  prerequisites: ['L07'],
  outcomes: [
    'Control service runtime state and boot-time enablement independently and read systemctl status output precisely',
    'Write, validate and deploy custom unit files in the correct location with the right Type= and execution context',
    'Express dependencies and ordering correctly and change vendor units safely with drop-in overrides and restart policies',
    'Replace cron jobs with systemd timers and use socket, mount and automount units',
    'Diagnose failing services from journal evidence and exit codes, and apply systemd hardening directives without breaking the service'
  ],
  modules: [
    {
      id: 'L08-M1', title: 'Units and systemctl',
      summary: 'What a unit is, how systemctl changes runtime and boot state, and how to read status, unit-file and target information.',
      lessons: [
        {
          id: 'L08-M1-T1',
          title: 'Service lifecycle: start vs enable, and reading systemctl status',
          minutes: 40,
          objectives: [
            'Distinguish runtime state (active/inactive/failed) from enablement state (enabled/disabled/static/masked)',
            'Start, stop, restart, reload, enable, disable and mask services correctly',
            'Read every line of systemctl status output and extract the failure evidence',
            'Use is-active, is-enabled and is-failed in scripts and health checks'
          ],
          prereqs: [],
          concept: `**systemd** is PID 1 on RHEL 7 and later. It starts and supervises everything else on the system as **units** — named objects such as \`sshd.service\`, \`multi-user.target\` or \`fstrim.timer\`. A *service unit* describes how to run a daemon or a one-shot task.

Every service has two independent properties that new administrators constantly confuse:

- **Runtime state** — is it running *right now*? Changed with \`systemctl start\`, \`stop\`, \`restart\`, \`reload\`. Reported as \`active\`, \`inactive\`, \`activating\`, \`deactivating\` or \`failed\`. It does **not** survive a reboot.
- **Enablement state** — will it be started *automatically at boot* (or when its trigger fires)? Changed with \`systemctl enable\` and \`disable\`. Reported as \`enabled\`, \`disabled\`, \`static\` (no [Install] section; only started as a dependency), \`masked\`, \`indirect\` or \`generated\`.

So a service can be *enabled but inactive* (will start at next boot, not running now) or *active but disabled* (running now, gone after reboot). \`systemctl enable --now\` and \`disable --now\` change both in one step, which is what you want almost every time on an exam or in a change ticket.

**restart vs reload**: \`restart\` stops and starts the process (new PID, dropped connections). \`reload\` asks the running daemon to re-read its configuration (usually SIGHUP via \`ExecReload=\`) without stopping — only if the unit supports it. \`reload-or-restart\` picks reload when available.

**mask** links the unit to \`/dev/null\` so it cannot be started at all — not manually, not as a dependency. Use it to stop two conflicting daemons (for example \`iptables\` and \`firewalld\`) from both running. \`unmask\` reverses it.

\`systemctl status\` is the first evidence source for any service problem. It shows where the unit file was loaded from, the enablement and preset state, the runtime state with timestamp and result, the main PID, the control group with every process, resource usage and the last ten journal lines. Learn to read it line by line; most service tickets can be triaged from it alone.

> The exit status of \`systemctl is-active\` (0 = active) and \`is-enabled\` (0 = enabled) makes them ideal for scripts and monitoring checks — no output parsing needed.`,
          internals: `\`systemctl\` is a client: it talks to PID 1 over D-Bus. \`start\` queues a **job** in the manager; the manager resolves dependencies, forks the process into a new **cgroup** (\`/sys/fs/cgroup/system.slice/sshd.service\`) and tracks every child in it — which is why systemd can stop a daemon cleanly even if it forked many times.

\`enable\` does not touch the process at all. It reads the \`[Install]\` section and creates symlinks, for example \`/etc/systemd/system/multi-user.target.wants/sshd.service -> /usr/lib/systemd/system/sshd.service\`. At boot, reaching \`multi-user.target\` pulls in everything in its \`.wants/\` directory. \`disable\` removes those symlinks. \`mask\` creates \`/etc/systemd/system/sshd.service -> /dev/null\`, which shadows the vendor unit because \`/etc\` has the highest precedence.

The **preset** shown in status comes from \`/usr/lib/systemd/system-preset/*.preset\` and describes the distribution default; \`systemctl preset\` re-applies it.`,
          useCases: [
            'Post-change verification in a change ticket: prove httpd is active now AND enabled for the next reboot',
            'Masking a legacy service so an automation run or a dependency cannot accidentally start it alongside its replacement',
            'Monitoring checks that use systemctl is-active --quiet as a cheap, parse-free liveness probe',
            'Graceful configuration reloads of web servers without dropping client connections'
          ],
          syntax: 'systemctl start|stop|restart|reload UNIT\nsystemctl enable|disable [--now] UNIT\nsystemctl mask|unmask UNIT\nsystemctl status UNIT\nsystemctl is-active|is-enabled|is-failed UNIT\nsystemctl reset-failed [UNIT]',
          options: [
            ['--now', 'With enable/disable/mask: also start/stop the unit immediately'],
            ['--no-pager', 'Print status without paging (useful in scripts and tickets)'],
            ['-l / --full', 'Do not ellipsize long lines in status output'],
            ['--quiet / -q', 'Suppress output; rely on exit status (is-active, is-enabled)'],
            ['--failed', 'List only units currently in the failed state'],
            ['-H user@host', 'Run the operation on a remote host over SSH']
          ],
          examples: [
            {
              title: 'Read a healthy service status',
              cmd: 'systemctl status sshd',
              out: '● sshd.service - OpenSSH server daemon\n     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)\n     Active: active (running) since Tue 2026-10-06 09:12:44 UTC; 2 days ago\n       Docs: man:sshd(8)\n             man:sshd_config(5)\n   Main PID: 1043 (sshd)\n      Tasks: 1 (limit: 22950)\n     Memory: 5.6M\n        CPU: 312ms\n     CGroup: /system.slice/sshd.service\n             └─1043 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"\n\nOct 08 10:02:11 web01 sshd[88210]: Accepted publickey for ops from 10.0.4.20 port 50122 ssh2',
              fields: [
                ['Loaded: loaded (...)', 'Unit file was parsed; the path shows which copy won (/usr/lib = vendor, /etc = admin)'],
                ['enabled; preset: enabled', 'Enablement state, then the distribution preset default'],
                ['Active: active (running) since ...', 'Runtime state and when it entered that state'],
                ['Main PID', 'The PID systemd treats as the service main process'],
                ['CGroup', 'Every process belonging to the service, tracked by its control group'],
                ['Trailing log lines', 'The last journal entries for this unit (needs root or the adm/wheel/systemd-journal group to see all)']
              ]
            },
            {
              title: 'Read a failed service status',
              cmd: 'systemctl status myapp.service',
              out: '× myapp.service - Inventory API\n     Loaded: loaded (/etc/systemd/system/myapp.service; enabled; preset: disabled)\n     Active: failed (Result: exit-code) since Thu 2026-10-08 14:20:03 UTC; 8s ago\n    Process: 5521 ExecStart=/opt/myapp/bin/server --config /etc/myapp/app.yaml (code=exited, status=1/FAILURE)\n   Main PID: 5521 (code=exited, status=1/FAILURE)\n        CPU: 41ms\n\nOct 08 14:20:03 app01 server[5521]: FATAL: cannot open /etc/myapp/app.yaml: permission denied\nOct 08 14:20:03 app01 systemd[1]: myapp.service: Main process exited, code=exited, status=1/FAILURE\nOct 08 14:20:03 app01 systemd[1]: myapp.service: Failed with result \'exit-code\'.',
              fields: [
                ['× / failed (Result: exit-code)', 'The process ran and exited non-zero; the program itself reported failure'],
                ['status=1/FAILURE', 'Exit code 1 from the application. Codes 200-243 (e.g. 203/EXEC) come from systemd before the program ran'],
                ['server[5521]: FATAL ...', 'The application message — the real root-cause evidence'],
                ['preset: disabled', 'Admin-created unit: no distribution preset enables it']
              ],
              note: 'Always read the application line above the systemd lines; systemd only reports that the process exited.'
            },
            {
              title: 'Script-friendly checks',
              cmd: 'systemctl is-active httpd; echo "rc=$?"; systemctl is-enabled httpd',
              out: 'inactive\nrc=3\nenabled',
              fields: [['inactive / rc=3', 'Not running now; non-zero exit code'], ['enabled', 'Will still start at next boot']]
            }
          ],
          walkthrough: [
            'Install a harmless test daemon: `sudo dnf install -y httpd` and check `systemctl status httpd` — note it is `disabled` and `inactive`.',
            'Run `sudo systemctl start httpd`, then `systemctl is-active httpd` and `systemctl is-enabled httpd`: active but still disabled.',
            'Run `sudo systemctl enable httpd` and inspect the symlink it prints under `/etc/systemd/system/multi-user.target.wants/`.',
            'Compare `sudo systemctl reload httpd` and `sudo systemctl restart httpd` — watch the Main PID in `systemctl status` (reload keeps it, restart changes it).',
            'Mask it: `sudo systemctl mask --now httpd`, then try `sudo systemctl start httpd` and read the error. Unmask with `sudo systemctl unmask httpd`.',
            'Finish with `sudo systemctl enable --now httpd` and confirm both states in one line: `systemctl is-active httpd; systemctl is-enabled httpd`.'
          ],
          lab: {
            goal: 'Prove you can control runtime and boot state independently and leave a service in a precise, verified state.',
            steps: [
              'On a RHEL 9/10 VM: `sudo dnf install -y httpd chrony`.',
              'Make httpd active now but NOT enabled at boot: `sudo systemctl disable httpd; sudo systemctl start httpd`.',
              'Make chronyd enabled AND running: `sudo systemctl enable --now chronyd`.',
              'Mask the unused `cups.service` if present (or `nfs-server.service`): `sudo systemctl mask --now nfs-server` and confirm `systemctl is-enabled nfs-server` prints `masked`.',
              'Reboot (`sudo systemctl reboot`) and record what changed for each unit.',
              'Clean up: `sudo systemctl unmask nfs-server`.'
            ],
            verify: 'Before reboot: `systemctl is-active httpd chronyd` prints active/active and `systemctl is-enabled httpd chronyd` prints disabled/enabled. After reboot httpd is inactive, chronyd active, nfs-server masked (until unmasked).'
          },
          troubleshooting: {
            scenario: 'After a weekend patch reboot, the monitoring agent is down on 40 servers although "it was started" during deployment.',
            steps: [
              'Evidence: `systemctl is-enabled monagent` returns `disabled`; `systemctl status monagent` shows `inactive (dead)` with no failure.',
              'Hypothesis: the deployment ran `systemctl start` but never `enable`, so nothing pulled the unit in at boot.',
              'Fix: `systemctl enable --now monagent` across the fleet (via automation), and update the deployment playbook to manage both states.',
              'Validate: `systemctl is-enabled monagent && systemctl is-active monagent` returns 0 on every host; test one host with a controlled reboot.'
            ]
          },
          mistakes: [
            'Running only `systemctl start` after installing a service — it disappears at the next reboot.',
            'Running only `systemctl enable` and closing the ticket — nothing is running until the next boot.',
            'Using `restart` on a busy web/proxy tier when `reload` would apply config without dropping connections.',
            'Disabling instead of masking a conflicting service — another unit can still pull it in as a dependency.',
            'Reading only the systemd lines in status and missing the application error line just above them.'
          ],
          safety: [
            'start/stop/enable/mask require root (or polkit authorization); status and is-* do not.',
            'Stopping or restarting sshd, NetworkManager or firewalld on a remote host can cut your session — have console access or use `reload`, and test config first (`sshd -t`).',
            'Masking a unit required by others will make those dependent units fail to start; check `systemctl list-dependencies --reverse UNIT` first.'
          ],
          distro: 'Identical on RHEL 8/9/10, Fedora, Debian and Ubuntu. Debian/Ubuntu packages usually enable and start services at install time; RHEL packages normally leave them disabled per the preset policy. systemd 249+ prints `preset:` instead of `vendor preset:` in status, and newer releases show `×` for failed units.',
          challenge: {
            task: 'A colleague says "I enabled chronyd yesterday, but `chronyc tracking` says it cannot talk to the daemon." Using only systemctl, determine the state, explain it, and fix it so it survives reboots. Then make sure the legacy `ntpd.service` (if installed) can never be started.',
            solution: `Check both states:

\`\`\`
systemctl is-enabled chronyd   # enabled
systemctl is-active chronyd    # inactive
\`\`\`

\`enable\` only created the boot-time symlink; it did not start the daemon. Fix runtime state now while keeping enablement:

\`\`\`
sudo systemctl enable --now chronyd
systemctl is-active chronyd && chronyc tracking
\`\`\`

To block the conflicting daemon completely, mask it (disable alone would still allow a dependency to start it):

\`\`\`
sudo systemctl mask --now ntpd 2>/dev/null || echo "ntpd not installed"
systemctl is-enabled ntpd   # masked
\`\`\``
          },
          interview: [
            { q: 'What is the difference between systemctl enable and systemctl start?', a: '`start` changes runtime state: it starts the unit now, and that does not persist across reboot. `enable` changes boot-time configuration: it creates symlinks from the [Install] section (for example into multi-user.target.wants) so the unit is started automatically at boot, but it does not start it now unless `--now` is given.', mistake: 'Saying enable "starts it permanently" without noting that it does not start it in the current session.', followUp: 'What does a unit with enablement state "static" mean, and can you enable it?' },
            { q: 'When would you mask a service instead of disabling it?', a: 'When it must never run — for example to prevent a conflicting firewall or time daemon from starting. Disable only removes boot symlinks; another unit can still pull it in or an admin can start it. Mask links it to /dev/null so every start attempt fails.', mistake: 'Treating mask and disable as synonyms.', followUp: 'Where is the mask symlink created and why does it win over the vendor unit?' },
            { q: 'How do you tell from systemctl status whether the program or systemd caused a failure?', a: 'Look at the status= value: small codes such as 1/FAILURE come from the program; 200-243 codes such as 203/EXEC, 217/USER or 226/NAMESPACE are generated by systemd while preparing to execute, meaning the binary never ran properly. Then read the application log lines for detail.', mistake: 'Only quoting "it says failed".', followUp: 'What would status=203/EXEC usually point to?' }
          ],
          revision: [
            'start/stop = now; enable/disable = boot. Use --now to do both.',
            'mask = symlink to /dev/null in /etc; nothing can start it until unmask.',
            'reload keeps the PID and connections; restart replaces the process.',
            'Status Loaded: line shows file path + enablement + preset; Active: line shows runtime state and result.',
            'is-active / is-enabled exit codes are made for scripts.'
          ]
        },
        {
          id: 'L08-M1-T2',
          title: 'Unit types, targets and inspecting the unit inventory',
          minutes: 35,
          objectives: [
            'Name the main unit types and what each manages',
            'List loaded units versus installed unit files and interpret the difference',
            'Inspect a unit with systemctl cat, show and list-dependencies',
            'Change the default target and switch targets safely at runtime'
          ],
          prereqs: ['L08-M1-T1'],
          concept: `A **unit** is anything systemd manages, identified by name and suffix. The suffix is the type:

- \`.service\` — a process or one-shot task.
- \`.socket\` — a listening socket that starts a service on demand.
- \`.target\` — a synchronisation point / group of units (replaces SysV runlevels).
- \`.timer\` — schedules activation of another unit (cron replacement).
- \`.mount\` / \`.automount\` — a mounted filesystem / on-demand mount point.
- \`.path\` — starts a unit when a file or directory changes.
- \`.device\` — a kernel device exposed by udev; \`.swap\` — swap space.
- \`.slice\` and \`.scope\` — cgroup groupings for resource control (\`system.slice\`, \`user.slice\`).

Two inventories exist. \`systemctl list-units\` shows units **loaded in memory** right now (active ones by default, \`--all\` for inactive too). \`systemctl list-unit-files\` shows unit files **installed on disk** and their enablement state. A unit file can exist without being loaded (never needed yet), and a unit can be loaded without a file (\`not-found\`, for example a dependency that was uninstalled).

**Targets** group units. \`multi-user.target\` is a normal non-graphical server; \`graphical.target\` adds a display manager; \`rescue.target\` is single-user with local filesystems mounted; \`emergency.target\` mounts only the root filesystem read-only. The **default target** is a symlink \`/etc/systemd/system/default.target\`, managed with \`systemctl get-default\` and \`set-default\`. \`systemctl isolate TARGET\` switches immediately, stopping everything not wanted by the new target — do it from a console, not over SSH, if the target drops networking.

For inspection: \`systemctl cat UNIT\` prints the unit file plus every drop-in in effect, \`systemctl show UNIT -p Property\` prints the *effective* parsed values (including defaults), and \`systemctl list-dependencies UNIT\` shows the tree of units it pulls in (\`--reverse\` shows who pulls it in).`,
          internals: `systemd loads a unit lazily: when something references it (a dependency, a start request, a socket). Loaded units live in the manager's memory with properties visible through D-Bus — \`systemctl show\` simply dumps them. Unit names map to cgroups: services land under \`system.slice\`, user sessions under \`user.slice/user-UID.slice\`, and VMs/containers under \`machine.slice\`.

At boot systemd starts \`default.target\` and recursively resolves \`Wants=\`/\`Requires=\` (including \`.wants/\` symlink directories), builds a transaction of jobs, orders them by \`After=\`/\`Before=\` and starts as many in parallel as ordering allows. Targets have no process of their own; they are reached when their dependencies are satisfied. Old runlevel names such as \`runlevel3.target\` are aliases kept for compatibility.`,
          useCases: [
            'Converting a server that was installed with a GUI to boot into multi-user.target to save memory and reduce attack surface',
            'Auditing which services are enabled on a host as part of a CIS / hardening review',
            'Finding which unit pulls in an unexpected service before masking it',
            'Booting into rescue.target from the GRUB menu to repair a broken configuration'
          ],
          syntax: 'systemctl list-units [--type=TYPE] [--state=STATE] [--all]\nsystemctl list-unit-files [--type=TYPE] [--state=enabled]\nsystemctl cat UNIT\nsystemctl show UNIT -p PROPERTY\nsystemctl list-dependencies [--reverse] UNIT\nsystemctl get-default | set-default TARGET\nsystemctl isolate TARGET',
          options: [
            ['--type=service', 'Restrict listings to one unit type (-t)'],
            ['--state=failed', 'Filter by state: failed, running, enabled, masked ...'],
            ['--all', 'Include inactive loaded units in list-units'],
            ['-p / --property=', 'Show only selected properties in systemctl show'],
            ['--value', 'Print property values without the Name= prefix'],
            ['--reverse', 'With list-dependencies: show units that depend on this one']
          ],
          examples: [
            {
              title: 'Find failed units across the system',
              cmd: 'systemctl list-units --type=service --state=failed',
              out: '  UNIT               LOAD   ACTIVE SUB    DESCRIPTION\n● kdump.service      loaded failed failed Crash recovery kernel arming\n● myapp.service      loaded failed failed Inventory API\n\nLOAD   = Reflects whether the unit definition was properly loaded.\nACTIVE = The high-level unit activation state, i.e. generalization of SUB.\nSUB    = The low-level unit activation state, values depend on unit type.\n2 loaded units listed.',
              fields: [
                ['LOAD', 'loaded / not-found / bad-setting / masked'],
                ['ACTIVE', 'High-level state: active, inactive, failed, activating'],
                ['SUB', 'Type-specific detail: running, exited, dead, failed, listening, waiting']
              ]
            },
            {
              title: 'Query effective properties',
              cmd: 'systemctl show sshd -p Type -p Restart -p FragmentPath -p DropInPaths',
              out: 'Type=notify\nRestart=on-failure\nFragmentPath=/usr/lib/systemd/system/sshd.service\nDropInPaths=',
              fields: [
                ['FragmentPath', 'The main unit file in use'],
                ['DropInPaths', 'Override files merged on top (empty = none)'],
                ['Type / Restart', 'Parsed effective values, including defaults you never wrote']
              ]
            },
            {
              title: 'Change the default boot target',
              cmd: 'systemctl get-default; sudo systemctl set-default multi-user.target',
              out: 'graphical.target\nRemoved "/etc/systemd/system/default.target".\nCreated symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/multi-user.target.',
              fields: [['default.target symlink', 'The default target is simply a symlink in /etc/systemd/system']]
            }
          ],
          walkthrough: [
            'Count loaded services vs installed service files: `systemctl list-units -t service | tail -1` and `systemctl list-unit-files -t service | tail -1`.',
            'List enabled services: `systemctl list-unit-files -t service --state=enabled`.',
            'Read a vendor unit with `systemctl cat chronyd` and compare with `systemctl show chronyd -p ExecStart -p User`.',
            'Explore the boot tree: `systemctl list-dependencies multi-user.target | head -30`.',
            'Find who pulls in a unit: `systemctl list-dependencies --reverse chronyd`.',
            'Check and (if needed) set the default target: `systemctl get-default`.'
          ],
          lab: {
            goal: 'Inventory a server and switch its default target safely.',
            steps: [
              'Save an enabled-services baseline: `systemctl list-unit-files -t service --state=enabled > ~/enabled-before.txt`.',
              'Record the current default: `systemctl get-default`.',
              'Set the default to multi-user: `sudo systemctl set-default multi-user.target`.',
              'From the VM console (not SSH), test rescue mode: `sudo systemctl isolate rescue.target`, enter the root password, then return with `systemctl isolate multi-user.target` (or reboot).',
              'Use `systemctl list-dependencies --reverse sshd.service` to see which target wants sshd.',
              'Restore the original default target if it was graphical: `sudo systemctl set-default graphical.target`.'
            ],
            verify: '`systemctl get-default` prints the value you set; `ls -l /etc/systemd/system/default.target` shows the matching symlink; `systemctl is-system-running` returns running (or degraded with a known reason).'
          },
          troubleshooting: {
            scenario: '`systemctl is-system-running` returns `degraded` on a freshly built VM and the monitoring dashboard is red.',
            steps: [
              'Evidence: `systemctl --failed` lists one unit, e.g. `kdump.service`.',
              'Hypothesis: degraded means at least one unit failed; the system is otherwise up.',
              'Investigate the unit: `systemctl status kdump` and `journalctl -u kdump -b` (often no crashkernel memory reserved).',
              'Fix the root cause (e.g. `kdumpctl reset-crashkernel` + reboot) or, if the service is not wanted, disable it and `systemctl reset-failed kdump`; validate `is-system-running` returns running.'
            ]
          },
          mistakes: [
            'Assuming list-units shows everything installed — it only shows loaded units; use list-unit-files for the installed inventory.',
            'Editing files under /usr/lib/systemd/system to inspect "effective" settings instead of using systemctl show / cat.',
            'Running `systemctl isolate rescue.target` over SSH and losing the session.',
            'Thinking targets are exclusive runlevels — multiple targets are active simultaneously (multi-user.target and basic.target, network.target ...).'
          ],
          safety: [
            'set-default and isolate require root. isolate stops units not wanted by the new target — use the console.',
            'Before changing the default target on a remote server, confirm sshd and networking are wanted by the new target.',
            'Listing and show commands are read-only and safe in production.'
          ],
          distro: 'Same on all systemd distributions. RHEL 7+ removed /etc/inittab runlevels; runlevelN.target aliases remain for compatibility. `systemctl list-units` column output and the ● marker are identical on Debian/Ubuntu.',
          challenge: {
            task: 'Produce a one-line command that prints only the names of enabled service unit files, and explain why `nfs-idmapd.service` may appear in list-units but not in that list.',
            solution: `\`\`\`
systemctl list-unit-files -t service --state=enabled --no-legend | awk '{print $1}'
\`\`\`

\`--no-legend\` removes headers/footers and awk prints the first column. A unit such as \`nfs-idmapd.service\` is often **static** (no [Install] section) and is pulled in as a dependency of another unit, so it is loaded/active but never shows as "enabled". Check with \`systemctl is-enabled nfs-idmapd\` (prints static) and \`systemctl list-dependencies --reverse nfs-idmapd\`.`
          },
          interview: [
            { q: 'What is the difference between list-units and list-unit-files?', a: 'list-units shows units currently loaded in the systemd manager and their runtime state; list-unit-files shows unit files present on disk and their enablement state. A file can exist without being loaded, and a referenced unit can be loaded with LOAD=not-found if its file is missing.', mistake: 'Saying they are the same with different formatting.', followUp: 'How would you find units that are loaded but have no file?' },
            { q: 'How do you change a server to boot without the GUI permanently?', a: '`systemctl set-default multi-user.target`, which repoints the /etc/systemd/system/default.target symlink. To switch now as well, `systemctl isolate multi-user.target` from a console.', mistake: 'Editing /etc/inittab, which systemd ignores.', followUp: 'How would you boot into rescue mode just once from GRUB?' },
            { q: 'What do rescue.target and emergency.target differ in?', a: 'rescue.target starts basic system services and mounts all local filesystems, single user. emergency.target is more minimal: only the root filesystem, mounted read-only, and no other services — used when even local mounts (e.g. fstab errors) fail.', mistake: 'Calling them identical.', followUp: 'Which kernel command-line parameter boots into emergency.target?' }
          ],
          revision: [
            'Unit suffix = type: service, socket, target, timer, mount, automount, path, device, swap, slice, scope.',
            'list-units = loaded/runtime; list-unit-files = installed/enablement.',
            'systemctl cat shows file + drop-ins; systemctl show shows effective parsed properties.',
            'default.target is a symlink; manage it with get-default/set-default.',
            'isolate switches targets now and stops what the new target does not want.'
          ]
        }
      ]
    },
    {
      id: 'L08-M2', title: 'Writing unit files',
      summary: 'Unit file anatomy, precedence of unit directories, service types and execution context, and deploying a custom service end to end.',
      lessons: [
        {
          id: 'L08-M2-T1',
          title: 'Anatomy of a unit file: sections, Type= and execution context',
          minutes: 45,
          objectives: [
            'Explain the [Unit], [Service] and [Install] sections and their key directives',
            'Choose the correct Type= (simple, exec, forking, oneshot, notify) for a program',
            'Set the execution context with User=, Group=, WorkingDirectory=, Environment= and EnvironmentFile=',
            'Place unit files in the right directory and apply changes with daemon-reload'
          ],
          prereqs: ['L08-M1-T2'],
          concept: `A unit file is an INI-style text file. A service unit normally has three sections:

\`\`\`
[Unit]
Description=Inventory API
Documentation=https://wiki.example.com/inventory
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=inventory
Group=inventory
WorkingDirectory=/opt/inventory
EnvironmentFile=-/etc/sysconfig/inventory
ExecStart=/opt/inventory/bin/server --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

**[Unit]** holds generic metadata and relationships (Description, dependencies and ordering — covered in M3). **[Service]** describes *how* to run it. **[Install]** is only read by \`systemctl enable\`: \`WantedBy=multi-user.target\` means "enable creates a symlink in multi-user.target.wants/".

**Type=** tells systemd when the service counts as *started*:

- \`simple\` (default when ExecStart is set) — started as soon as the process is forked. Errors such as a missing binary are reported only afterwards.
- \`exec\` — started once the binary was successfully executed; a missing binary makes \`systemctl start\` fail immediately. Good default for new foreground services.
- \`forking\` — the traditional daemon that forks and the parent exits; use \`PIDFile=\` so systemd finds the main process. Prefer running daemons in the foreground instead.
- \`oneshot\` — runs to completion (scripts, setup tasks); combine with \`RemainAfterExit=yes\` if the unit should look "active" afterwards.
- \`notify\` — the program tells systemd it is ready via sd_notify (sshd, many modern daemons).

**ExecStart=** must use an absolute path (or a name resolvable in systemd's fixed search path) and is **not run by a shell** — pipes, redirection, \`&&\` and \`~\` do not work unless you call \`/bin/bash -c '...'\` explicitly. Variable expansion with \`$VAR\` / \`\${VAR}\` uses systemd's own rules, from \`Environment=\`/\`EnvironmentFile=\`. The \`-\` prefix on \`EnvironmentFile=-/path\` means "ignore if missing".

**Where files live** (highest precedence first): \`/etc/systemd/system\` (administrator), \`/run/systemd/system\` (runtime, lost at reboot), \`/usr/lib/systemd/system\` (packages — never edit, upgrades overwrite it). Same-named file in /etc completely replaces the vendor file. After creating or editing any unit file run **\`systemctl daemon-reload\`** so the manager re-parses it.`,
          internals: `On daemon-reload, PID 1 re-reads every unit file and drop-in and rebuilds its in-memory unit objects; running processes are not touched. If you skip it, \`systemctl status\` warns "unit file changed on disk, run daemon-reload".

When starting a service, systemd forks, moves the child into the unit's cgroup, applies the execution environment (credentials from User=/Group=, working directory, environment, resource limits, namespaces/sandboxing, SELinux transition), then calls execve() on ExecStart. Failures in that setup phase produce systemd exit codes: 200/CHDIR (WorkingDirectory missing), 203/EXEC (binary missing, not executable, or SELinux blocked execution), 217/USER (User= does not exist), 226/NAMESPACE (sandbox setup failed). By default stdout/stderr go to the journal (\`StandardOutput=journal\`), so a foreground service just prints and logs appear in \`journalctl -u\`.`,
          useCases: [
            'Packaging an in-house Java or Go API as a managed service that runs as a dedicated non-root account',
            'Keeping per-environment settings (ports, JVM options) in /etc/sysconfig/APP read through EnvironmentFile=',
            'Running a one-shot initialisation script at boot with Type=oneshot and RemainAfterExit=yes',
            'Replacing a vendor unit entirely with an administrator copy in /etc/systemd/system when a drop-in is not enough'
          ],
          syntax: 'systemctl cat UNIT\nsystemctl edit --full UNIT\nsystemctl edit --force --full NEW.service\nsystemctl daemon-reload\nsystemd-analyze verify /etc/systemd/system/NAME.service\nman systemd.service systemd.unit systemd.exec',
          options: [
            ['Type=', 'simple | exec | forking | oneshot | notify | idle (dbus is used for D-Bus services)'],
            ['ExecStart= / ExecStartPre= / ExecStop= / ExecReload=', 'Commands for start, pre-start checks, stop and reload'],
            ['User= / Group=', 'Account the process runs as (default root)'],
            ['WorkingDirectory=', 'Current directory for the process'],
            ['Environment= / EnvironmentFile=', 'Inline variables / KEY=VALUE file (prefix - to ignore if missing)'],
            ['RemainAfterExit=yes', 'Keep a oneshot unit "active" after its process exits'],
            ['WantedBy=', '[Install]: target whose .wants/ directory enable links into']
          ],
          examples: [
            {
              title: 'Locate where a unit came from',
              cmd: 'systemctl show httpd -p FragmentPath; systemctl cat httpd | head -3',
              out: 'FragmentPath=/usr/lib/systemd/system/httpd.service\n# /usr/lib/systemd/system/httpd.service\n# See httpd.service(8) for more information on using httpd.service.\n',
              fields: [['# /usr/lib/...', 'systemctl cat prints a comment header with the path of each file it merges']]
            },
            {
              title: 'Verify a unit before starting it',
              cmd: 'systemd-analyze verify /etc/systemd/system/inventory.service',
              out: '/etc/systemd/system/inventory.service:9: Executable path is not absolute: server --port 8080\ninventory.service: Unit configuration has fatal error, unit will not be started.',
              fields: [['line 9', 'The offending line; ExecStart must start with an absolute path']],
              note: 'verify also checks that referenced executables exist and warns about unknown directives (typos).'
            }
          ],
          walkthrough: [
            'Read a well-written vendor unit: `systemctl cat chronyd` — identify each section and its Type=.',
            'Check man pages for any directive: `man systemd.service` (Type=, Exec*), `man systemd.exec` (User=, Environment=), `man systemd.unit` ([Unit], [Install]).',
            'Create a test environment file `/etc/sysconfig/hello` containing `GREETING=hi from env`.',
            'Create `/etc/systemd/system/hello.service` with Type=oneshot, EnvironmentFile=/etc/sysconfig/hello and `ExecStart=/usr/bin/echo ${GREETING}`, then `systemctl daemon-reload`.',
            'Start it and read the output in `journalctl -u hello -n 5`; check `systemctl status hello` shows inactive (dead) with status=0/SUCCESS.',
            'Add `RemainAfterExit=yes`, daemon-reload, start again and see that it now stays `active (exited)`.'
          ],
          lab: {
            goal: 'Write a correct oneshot unit and a long-running unit and observe how Type= changes behaviour.',
            steps: [
              'Create `/usr/local/bin/ticker.sh`: `#!/bin/bash` then `while true; do echo "tick $(date +%T)"; sleep 5; done`; `sudo chmod 755 /usr/local/bin/ticker.sh`.',
              'Create `/etc/systemd/system/ticker.service` with `[Service] Type=exec`, `ExecStart=/usr/local/bin/ticker.sh`, `User=nobody` and `[Install] WantedBy=multi-user.target`.',
              'Run `sudo systemd-analyze verify /etc/systemd/system/ticker.service` and fix any warning.',
              '`sudo systemctl daemon-reload && sudo systemctl enable --now ticker`.',
              'Confirm the process user: `ps -o user,pid,cmd -C ticker.sh` and logs: `journalctl -u ticker -f` (Ctrl-C to stop).',
              'Break it on purpose: change ExecStart to `/usr/local/bin/tickr.sh`, daemon-reload, restart; read the error, then fix and restart.'
            ],
            verify: '`systemctl is-active ticker` prints active, `ps` shows user nobody, journal shows a tick every 5 s. During the break, status shows 203/EXEC and start fails immediately because Type=exec.'
          },
          troubleshooting: {
            scenario: 'A new unit has `ExecStart=/opt/app/run.sh > /var/log/app.log 2>&1` and the app starts but no log file is ever created; the app also receives ">" as an argument.',
            steps: [
              'Evidence: `systemctl show app -p ExecStart` shows argv containing ">" and "/var/log/app.log".',
              'Hypothesis: ExecStart is not executed by a shell, so redirection is passed as literal arguments.',
              'Fix: remove the redirection and let output go to the journal (default), or set `StandardOutput=append:/var/log/app.log`; daemon-reload and restart.',
              'Validate: `journalctl -u app -n 20` shows the app output and the argv is clean in `ps -o args -p $(systemctl show -p MainPID --value app)`.'
            ]
          },
          mistakes: [
            'Editing /usr/lib/systemd/system/*.service — the next package update silently reverts the change.',
            'Forgetting `systemctl daemon-reload` and then debugging the old definition.',
            'Using shell syntax (pipes, redirection, &&, ~) in ExecStart without an explicit shell.',
            'Using Type=forking for a program that stays in the foreground — systemd waits for a fork that never comes and times out.',
            'Running application services as root because User= was omitted.'
          ],
          safety: [
            'Writing to /etc/systemd/system and daemon-reload need root. daemon-reload is safe for running services but re-runs generators (e.g. re-reads fstab).',
            'Always run `systemd-analyze verify` before enabling a new unit on production hosts.',
            'Keep a copy of any unit you override and prefer drop-ins (M3) over full copies so vendor fixes still apply.'
          ],
          distro: 'RHEL uses /usr/lib/systemd/system for vendor units; Debian/Ubuntu historically used /lib/systemd/system (now merged into /usr). RHEL convention for environment files is /etc/sysconfig/NAME; Debian uses /etc/default/NAME. Type=exec requires systemd 240+ (RHEL 9/10 yes; RHEL 8 ships 239, so use simple there).',
          challenge: {
            task: 'Write a unit for a backup pre-check script `/usr/local/sbin/precheck.sh` that must run once at boot after local filesystems are mounted, run as root, read thresholds from `/etc/sysconfig/precheck` (which may not exist), and show as active afterwards so other units can depend on it.',
            solution: `\`\`\`
# /etc/systemd/system/precheck.service
[Unit]
Description=Backup pre-check
After=local-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes
EnvironmentFile=-/etc/sysconfig/precheck
ExecStart=/usr/local/sbin/precheck.sh

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`
sudo systemd-analyze verify /etc/systemd/system/precheck.service
sudo systemctl daemon-reload
sudo systemctl enable --now precheck
systemctl status precheck   # active (exited)
\`\`\`

Reasoning: oneshot because the script terminates; RemainAfterExit keeps it "active" so dependents see it satisfied; the \`-\` prefix tolerates a missing environment file; After=local-fs.target orders it after mounts.`
          },
          interview: [
            { q: 'What is the difference between Type=simple and Type=exec?', a: 'With simple, systemd considers the service started right after fork(), so a missing or non-executable binary is only noticed afterwards and `systemctl start` returns success. With exec, systemd waits until execve() succeeds, so such errors make start fail immediately and units ordered after it start only after the binary actually launched.', mistake: 'Saying they are identical.', followUp: 'When would you choose notify instead?' },
            { q: 'Why should you not edit files in /usr/lib/systemd/system?', a: 'They belong to the RPM; package updates overwrite them, losing your change. Use a drop-in (systemctl edit) or a full copy in /etc/systemd/system, which takes precedence.', mistake: 'It is fine because it is the "real" file.', followUp: 'What is the precedence order of unit directories?' },
            { q: 'Why does `ExecStart=/usr/bin/myapp | tee /tmp/out` not work?', a: 'systemd does not run ExecStart through a shell; the pipe and tee become literal arguments to myapp. Wrap it in `/bin/sh -c` if a shell is truly needed, or better, let stdout go to the journal or use StandardOutput=.', mistake: 'Blaming quoting.', followUp: 'How does systemd expand $VARIABLES in ExecStart?' }
          ],
          revision: [
            '[Unit] = metadata + relationships; [Service] = how to run; [Install] = what enable does.',
            'Precedence: /etc/systemd/system > /run/systemd/system > /usr/lib/systemd/system.',
            'Type=exec fails fast on bad binaries; oneshot + RemainAfterExit for scripts; forking needs PIDFile.',
            'ExecStart is not a shell command line.',
            'Edit unit → daemon-reload → restart.'
          ]
        },
        {
          id: 'L08-M2-T2',
          title: 'Building, validating and deploying a custom service',
          minutes: 45,
          objectives: [
            'Deploy an application as a service with a dedicated system account and correct file locations',
            'Create new units with systemctl edit --force --full and validate them with systemd-analyze verify',
            'Interpret systemd setup exit codes (200/CHDIR, 203/EXEC, 217/USER) and fix their causes',
            'Account for SELinux file contexts when placing service executables'
          ],
          prereqs: ['L08-M2-T1'],
          concept: `Production services follow a repeatable pattern. Each piece prevents a known class of incident:

1. **Dedicated system account** — \`useradd --system --no-create-home --shell /sbin/nologin appsvc\`. The service never runs as root and cannot be used for interactive login.
2. **Standard locations** — binaries in \`/opt/APP\` or \`/usr/local/bin\`, configuration in \`/etc/APP\`, state in \`/var/lib/APP\`, logs to the journal. Never run services out of a home directory.
3. **Ownership and modes** — config readable by the service account (often \`root:appsvc\` mode 0640), state directory owned by the account. systemd can create these for you with \`StateDirectory=APP\`, \`ConfigurationDirectory=\`, \`LogsDirectory=\` (paths under /var/lib, /etc, /var/log with correct ownership).
4. **Unit file in /etc/systemd/system** — created with \`systemctl edit --force --full APP.service\` (opens an editor and runs daemon-reload on save) or written directly followed by \`systemctl daemon-reload\`.
5. **Validate before enabling** — \`systemd-analyze verify\`, then \`systemctl enable --now\`, then confirm with \`systemctl status\`, \`journalctl -u\`, and a functional test (\`curl\`, \`ss -ltnp\`).

**SELinux matters.** On RHEL, systemd runs as \`init_t\`. It may only execute files whose label it is allowed to transition from, such as \`bin_t\` (\`/usr/local/bin\`) or the application's own exec type. A script copied from a home directory keeps its \`user_home_t\` label (\`mv\` preserves labels; \`cp\` creates a new label from the destination). Executing such a file fails with **status=203/EXEC** and an AVC denial even though permissions look perfect. The fix is \`restorecon -v FILE\` (or \`semanage fcontext\` for a custom path), never disabling SELinux.

**Reading systemd exit codes** is the fastest triage: \`200/CHDIR\` WorkingDirectory missing or inaccessible; \`203/EXEC\` binary missing, not executable, wrong interpreter (bad shebang or CRLF line endings), or SELinux denial; \`217/USER\` User= account does not exist; \`226/NAMESPACE\` a sandbox path is missing; \`status=1\` or other small codes come from the application itself.`,
          internals: `\`systemctl edit --force --full NAME.service\` creates \`/etc/systemd/system/NAME.service\` from an empty template in a temporary file, opens \$SYSTEMD_EDITOR/\$EDITOR, and only on a successful save moves it into place and reloads the manager — safer than editing in place.

When ExecStart points to a script, the kernel reads the shebang (\`#!/bin/bash\`). A file saved with Windows CRLF line endings has the interpreter \`/bin/bash\\r\`, which does not exist, so execve() fails with ENOENT and systemd reports 203/EXEC. With SELinux, the denial appears as \`avc: denied { execute }\` (or \`{ entrypoint }\`) for scontext=system_u:system_r:init_t in the audit log (\`ausearch -m AVC -ts recent\`).

\`StateDirectory=\` and friends are created at start with the service user's ownership, which removes a common class of "permission denied writing /var/lib/app" incidents.`,
          useCases: [
            'Onboarding a vendor-supplied binary that ships without a unit file',
            'Standardising dozens of internal microservices on one unit template for consistent operations',
            'Converting nohup/screen-launched processes into supervised, auto-restarting services',
            'Building golden images where every service is validated by systemd-analyze verify in CI'
          ],
          syntax: 'useradd --system --no-create-home --shell /sbin/nologin SVCUSER\nsystemctl edit --force --full APP.service\nsystemd-analyze verify /etc/systemd/system/APP.service\nsystemctl enable --now APP\nrestorecon -Rv /usr/local/bin/APP\nausearch -m AVC -ts recent',
          options: [
            ['--force --full (systemctl edit)', 'Create a brand-new full unit file in /etc/systemd/system'],
            ['StateDirectory=NAME', 'Create /var/lib/NAME owned by the service user at start'],
            ['ConfigurationDirectory=NAME', 'Ensure /etc/NAME exists (read-only intent)'],
            ['LogsDirectory= / RuntimeDirectory=', 'Create /var/log/NAME or /run/NAME (runtime dir removed on stop)'],
            ['SyslogIdentifier=', 'Tag used for the service in the journal'],
            ['ExecStartPre=', 'Validation step (e.g. config test) that must succeed before ExecStart']
          ],
          examples: [
            {
              title: 'Status of a script copied from a home directory',
              cmd: 'systemctl status report.service',
              out: '× report.service - Nightly report generator\n     Loaded: loaded (/etc/systemd/system/report.service; enabled; preset: disabled)\n     Active: failed (Result: exit-code) since Thu 2026-10-08 22:00:01 UTC; 3min ago\n    Process: 7310 ExecStart=/usr/local/bin/report.sh (code=exited, status=203/EXEC)\n   Main PID: 7310 (code=exited, status=203/EXEC)\n\nOct 08 22:00:01 app01 systemd[1]: report.service: Failed to execute /usr/local/bin/report.sh: Permission denied\nOct 08 22:00:01 app01 systemd[1]: report.service: Failed at step EXEC spawning /usr/local/bin/report.sh: Permission denied',
              fields: [
                ['status=203/EXEC', 'systemd could not execute the binary — the program never ran'],
                ['Permission denied', 'Either the execute bit is missing or SELinux denied it; check both']
              ],
              note: 'Check `ls -lZ /usr/local/bin/report.sh`: a user_home_t label means it was moved with mv from a home directory. Fix with restorecon -v.'
            },
            {
              title: 'Confirm the AVC denial',
              cmd: 'sudo ausearch -m AVC -ts recent -c report.sh | tail -2',
              out: 'type=AVC msg=audit(1791496801.512:842): avc:  denied  { execute } for  pid=7310 comm="(eport.sh)" name="report.sh" dev="dm-0" ino=40211 scontext=system_u:system_r:init_t:s0 tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file permissive=0',
              fields: [
                ['scontext=...init_t', 'systemd (PID 1) is the subject'],
                ['tcontext=...user_home_t', 'The file still carries its home-directory label'],
                ['permissive=0', 'Enforcing mode: the access was actually blocked']
              ]
            }
          ],
          walkthrough: [
            'Create the account: `sudo useradd --system --no-create-home --shell /sbin/nologin inventory`.',
            'Use a toy app that needs no download: Python\'s built-in web server, `ExecStart=/usr/bin/python3 -m http.server 8080` (install with `sudo dnf install -y python3` if missing).',
            'Create the unit with `sudo systemctl edit --force --full inventory.service` containing Type=exec, User=inventory, StateDirectory=inventory, WorkingDirectory=/var/lib/inventory and WantedBy=multi-user.target.',
            'Validate: `sudo systemd-analyze verify /etc/systemd/system/inventory.service`.',
            'Deploy: `sudo systemctl enable --now inventory` then `ss -ltnp | grep 8080` and `curl -sI localhost:8080`.',
            'Confirm identity and directory: `ps -o user,cmd -C python3` and `ls -ld /var/lib/inventory`.'
          ],
          lab: {
            goal: 'Deploy a custom service from scratch, then diagnose and fix three deliberately injected failures.',
            steps: [
              'Deploy the inventory service from the walkthrough and confirm it serves HTTP on port 8080.',
              'Failure 1: set `User=inventry` (typo), daemon-reload, restart. Read the status code (217/USER), fix and restart.',
              'Failure 2: set `WorkingDirectory=/srv/inventory` (does not exist) and remove StateDirectory; observe 200/CHDIR; fix by restoring StateDirectory=inventory and WorkingDirectory=/var/lib/inventory.',
              'Failure 3: create `~/hello.sh` (`#!/bin/bash` + `echo hello`), `chmod +x`, `sudo mv ~/hello.sh /usr/local/bin/`, point a oneshot unit at it, start it and observe 203/EXEC.',
              'Diagnose failure 3 with `ls -Z /usr/local/bin/hello.sh` and `sudo ausearch -m AVC -ts recent`; fix with `sudo restorecon -v /usr/local/bin/hello.sh` and re-run.',
              'Leave SELinux enforcing throughout (`getenforce`).'
            ],
            verify: 'All units end active (or exited 0 for the oneshot); `getenforce` prints Enforcing; `ls -Z /usr/local/bin/hello.sh` shows bin_t; `curl -sI localhost:8080` returns HTTP/1.0 200 OK.'
          },
          troubleshooting: {
            scenario: 'A shell script service written on a Windows workstation fails with 203/EXEC; the file is mode 755, labelled bin_t, and runs fine with `bash /usr/local/bin/sync.sh`.',
            steps: [
              'Evidence: journal says `Failed to execute /usr/local/bin/sync.sh: No such file or directory` although the file exists.',
              'Hypothesis: the interpreter in the shebang does not exist — CRLF endings make it `/bin/bash\\r`. Check with `head -1 /usr/local/bin/sync.sh | od -c | head -2` (shows \\r \\n).',
              'Fix: `sed -i "s/\\r$//" /usr/local/bin/sync.sh` (or dos2unix), then restart the unit.',
              'Validate: `systemctl status sync` shows status=0/SUCCESS; add a CI lint step to reject CRLF scripts.'
            ]
          },
          mistakes: [
            'Running a service from /home or /root — breaks under SELinux and with ProtectHome hardening.',
            'Fixing 203/EXEC by `setenforce 0` instead of restoring the file context.',
            'Creating the account as a normal user with a login shell and home directory.',
            'Enabling a unit before testing it — a broken unit enabled across a fleet causes degraded systems after the next reboot.'
          ],
          safety: [
            'Creating users, unit files and changing contexts needs root. Use a test VM or staging host first.',
            'Never disable SELinux to make a service start; read the AVC and fix the label or boolean.',
            'Keep rollback simple: `systemctl disable --now APP`, remove the unit file, `systemctl daemon-reload`.'
          ],
          distro: 'SELinux enforcement and exit 203 from user_home_t labels are RHEL/Fedora-specific; Debian/Ubuntu use AppArmor and would not block this case. `systemctl edit --force --full` works on systemd 219+ (RHEL 7+). StateDirectory= needs systemd 235+ (RHEL 8+).',
          challenge: {
            task: 'Deploy `/opt/metrics/exporter` (a foreground binary listening on 9100) as `metrics.service`: dedicated non-login account, state in /var/lib/metrics, config in /etc/metrics/exporter.env (optional), must refuse to start if `/opt/metrics/exporter --check-config` fails, enabled at boot. Give all commands and the unit.',
            solution: `\`\`\`
sudo useradd --system --no-create-home --shell /sbin/nologin metrics
sudo restorecon -Rv /opt/metrics
sudo systemctl edit --force --full metrics.service
\`\`\`

\`\`\`
[Unit]
Description=Metrics exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=metrics
Group=metrics
StateDirectory=metrics
WorkingDirectory=/var/lib/metrics
EnvironmentFile=-/etc/metrics/exporter.env
ExecStartPre=/opt/metrics/exporter --check-config
ExecStart=/opt/metrics/exporter --listen :9100
Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`
sudo systemd-analyze verify /etc/systemd/system/metrics.service
sudo systemctl enable --now metrics
ss -ltnp | grep 9100 && systemctl status metrics --no-pager
\`\`\`

ExecStartPre failing stops ExecStart from running, so a bad config fails the start loudly instead of starting a broken exporter. If SELinux denies binding port 9100 for a confined domain, label the port with semanage port rather than disabling SELinux.`
          },
          interview: [
            { q: 'A custom service fails with status=203/EXEC but the file is executable. What do you check?', a: 'That the path in ExecStart is exactly right; the shebang interpreter exists (and the file has no CRLF endings); and the SELinux label (`ls -Z`) — a user_home_t label from moving the file out of a home directory blocks init_t. Confirm with `ausearch -m AVC -ts recent` and fix with restorecon.', mistake: 'Answering "disable SELinux".', followUp: 'Why does mv keep the old label while cp does not?' },
            { q: 'How do you create a new service unit safely?', a: 'Use `systemctl edit --force --full NAME.service` (or write to /etc/systemd/system), run `systemd-analyze verify`, then `systemctl daemon-reload` if written manually, enable --now, and verify with status, journal and a functional test.', mistake: 'Writing into /usr/lib/systemd/system.', followUp: 'What does StateDirectory= give you?' },
            { q: 'What does exit code 217/USER mean?', a: 'systemd failed to switch to the account in User=/Group= before executing — typically the user does not exist (typo, or created on another host only).', mistake: 'Saying the app crashed.', followUp: 'Which option creates a transient user automatically?' }
          ],
          revision: [
            'Pattern: system account → standard paths → unit in /etc → verify → enable --now → test.',
            '200/CHDIR, 203/EXEC, 217/USER, 226/NAMESPACE are systemd setup failures; the program never ran.',
            'mv keeps SELinux labels; restorecon fixes them. Never setenforce 0 as a fix.',
            'StateDirectory=/LogsDirectory=/RuntimeDirectory= create owned directories automatically.',
            'ExecStartPre= is the place for config validation.'
          ]
        }
      ]
    },
    {
      id: 'L08-M3', title: 'Dependencies, ordering, drop-ins and restart policies',
      summary: 'Express what a unit needs versus when it starts, change vendor units without forking them, and make services self-heal without restart storms.',
      lessons: [
        {
          id: 'L08-M3-T1',
          title: 'Requirement dependencies versus ordering',
          minutes: 40,
          objectives: [
            'Differentiate requirement directives (Wants, Requires, Requisite, BindsTo, PartOf, Conflicts) from ordering directives (After, Before)',
            'Order services correctly after the network and after other services',
            'Inspect dependency trees and the boot critical chain',
            'Recognise and resolve ordering cycles'
          ],
          prereqs: ['L08-M2-T1'],
          concept: `systemd separates two questions that SysV init merged into one sequence number:

1. **Which other units must be started together with this one?** — *requirement dependencies*.
2. **In what order?** — *ordering dependencies*.

They are independent. \`Wants=b.service\` alone starts b in parallel with a; it does **not** wait. To wait for b you also need \`After=b.service\`. Almost every real dependency is therefore a pair: \`Wants=\` (or \`Requires=\`) **plus** \`After=\`.

Requirement directives, weakest to strongest:

- **Wants=** — start b too; if b fails, a still starts. Preferred default.
- **Requires=** — start b too; if b fails to start (and a is ordered after it), a is not started; if b is explicitly stopped or restarted, a is stopped/restarted as well.
- **Requisite=** — b must already be active; it is not started for you.
- **BindsTo=** — like Requires, plus a stops whenever b becomes inactive for any reason (common with device units).
- **PartOf=** — one-way: stop/restart of b propagates to a (useful for a group of worker services).
- **Conflicts=** — starting a stops b and vice versa.

Ordering directives: **After=b** means "if both are being started, start a after b has finished starting; stop a before b". **Before=** is the mirror. Ordering has no effect if b is not part of the same transaction.

**The network trap.** \`network.target\` only means the network management stack has been started, not that addresses are configured. A service that must connect to a remote database at startup needs \`Wants=network-online.target\` and \`After=network-online.target\` (and NetworkManager-wait-online.service enabled, which it is by default on RHEL). Services that only *listen* should bind to 0.0.0.0/:: and need nothing special.

Reverse dependencies created by enable are just \`Wants=\` in symlink form: \`WantedBy=multi-user.target\` in [Install] becomes a symlink in multi-user.target.wants/. \`RequiredBy=\` creates .requires/ symlinks.

Use \`systemctl list-dependencies\` to see requirement trees and \`systemd-analyze critical-chain UNIT\` to see the *ordering* chain that delayed a unit at boot.`,
          internals: `When a start job is requested, systemd builds a **transaction**: it adds jobs for all Wants/Requires recursively, then sorts them by After/Before into a dependency graph. If the graph contains a cycle (a After b, b After a), systemd logs "Found ordering cycle" and breaks it by deleting a job from a Wants-only edge — some unit silently does not start. The log line names the cycle and the job removed.

Many dependencies are implicit: services get \`Requires=sysinit.target\`, \`After=basic.target\` and \`Conflicts=shutdown.target\` through \`DefaultDependencies=yes\`; mount units get ordering on their parent mount points; \`RequiresMountsFor=/data\` adds Requires+After for the mounts backing that path. \`systemctl show -p Requires -p Wants -p After UNIT\` reveals the complete, implicit + explicit set.`,
          useCases: [
            'An application that must start only after its local PostgreSQL is up and must restart when PostgreSQL restarts',
            'A backup agent that needs its NFS target mounted: RequiresMountsFor=/backup',
            'A batch consumer that must connect to a remote message broker at startup: Wants/After network-online.target',
            'Ensuring a legacy service never runs alongside its replacement with Conflicts='
          ],
          syntax: 'systemctl list-dependencies [--reverse] [--all] UNIT\nsystemctl show UNIT -p Wants -p Requires -p After -p Before\nsystemd-analyze critical-chain [UNIT]\nsystemd-analyze blame\nsystemd-analyze dot UNIT | dot -Tsvg > deps.svg',
          options: [
            ['Wants= / Requires=', 'Pull another unit into the transaction (soft / hard)'],
            ['After= / Before=', 'Ordering only — never pulls a unit in'],
            ['BindsTo=', 'Stop when the other unit stops for any reason'],
            ['PartOf=', 'Propagate stop/restart from the other unit to this one'],
            ['RequiresMountsFor=PATH', 'Require and order after the mounts needed for PATH'],
            ['DefaultDependencies=no', 'Drop the implicit basic.target/shutdown dependencies (early-boot units only)']
          ],
          examples: [
            {
              title: 'Why did the app start late?',
              cmd: 'systemd-analyze critical-chain inventory.service',
              out: 'The time when unit became active or started is printed after the "@" character.\nThe time the unit took to start is printed after the "+" character.\n\ninventory.service +412ms\n└─network-online.target @31.902s\n  └─NetworkManager-wait-online.service @2.015s +29.881s\n    └─NetworkManager.service @1.903s +104ms\n      └─network-pre.target @1.899s',
              fields: [
                ['@31.902s', 'Time after boot when the unit became active'],
                ['+29.881s', 'Time the unit itself took — here wait-online waited ~30 s for a link that never came up'],
                ['Tree', 'The ordering chain that gated inventory.service']
              ],
              note: 'An unplugged or unconfigured NIC with autoconnect enabled commonly causes this 30 s delay.'
            },
            {
              title: 'Show explicit and implicit dependencies',
              cmd: 'systemctl show inventory -p Wants -p Requires -p After --no-pager',
              out: 'Requires=sysinit.target system.slice\nWants=network-online.target\nAfter=network-online.target basic.target system.slice sysinit.target systemd-journald.socket',
              fields: [['Requires=sysinit.target', 'Implicit from DefaultDependencies=yes'], ['After=network-online.target', 'Explicit ordering from the unit file']]
            }
          ],
          walkthrough: [
            'Create two oneshot test units `a.service` and `b.service` that `sleep 5` and echo their name; add `Wants=b.service` to a only.',
            '`systemctl daemon-reload; systemctl start a` and check timestamps in `journalctl -u a -u b -o short-precise` — they ran in parallel.',
            'Add `After=b.service` to a, reload and repeat — a now starts only after b finished.',
            'Change Wants to Requires and make b fail (`ExecStart=/bin/false`): start a and observe a is not started (dependency failed).',
            'Inspect: `systemctl list-dependencies a` and `systemctl show a -p After`.',
            'Clean up the test units and `systemctl daemon-reload`.'
          ],
          lab: {
            goal: 'Prove the difference between requirement and ordering and fix a real startup-order bug.',
            steps: [
              'Install a local database: `sudo dnf install -y mariadb-server && sudo systemctl enable --now mariadb`.',
              'Create `dbclient.service` (Type=oneshot, RemainAfterExit=yes) with `ExecStart=/usr/bin/mysqladmin ping` and WantedBy=multi-user.target but NO dependencies. Enable it.',
              'Reboot a few times and check `systemctl status dbclient` — note it can fail if it runs before mariadb is ready.',
              'Fix with a drop-in or the unit: `Requires=mariadb.service` and `After=mariadb.service`; daemon-reload.',
              'Restart mariadb and observe the effect on dbclient (`systemctl status dbclient`).',
              'Run `systemd-analyze critical-chain dbclient.service` to confirm the ordering.'
            ],
            verify: 'After reboot `systemctl status dbclient` shows active (exited) with status=0/SUCCESS, and critical-chain shows mariadb.service beneath dbclient.service.'
          },
          troubleshooting: {
            scenario: 'After adding `After=app.service` to a sidecar and `After=sidecar.service` to app, one of them randomly does not start at boot.',
            steps: [
              'Evidence: `journalctl -b | grep -i "ordering cycle"` shows "Found ordering cycle on app.service/start" and "Job sidecar.service/start deleted to break ordering cycle".',
              'Hypothesis: mutual After= created a cycle; systemd removes a job to break it.',
              'Fix: decide the real direction (sidecar after app), remove the reverse After=, daemon-reload.',
              'Validate: reboot, no cycle messages, both units active; `systemd-analyze verify` on both units reports nothing.'
            ]
          },
          mistakes: [
            'Writing only Requires=/Wants= and expecting the other service to be ready first — without After= they start in parallel.',
            'Writing only After= and expecting the other unit to be started — After never pulls anything in.',
            'Using After=network.target for services that need remote connectivity at startup.',
            'Using Requires= everywhere: a restart of a shared dependency then cascades through many services.',
            'Creating mutual ordering cycles across teams\' unit files.'
          ],
          safety: [
            'Test dependency changes on a non-production host with a real reboot; transaction behaviour differs between manual starts and boot.',
            'Requires=/BindsTo=/PartOf= propagate stops and restarts — review blast radius with `systemctl list-dependencies --reverse` before adding them.',
            'Prefer drop-ins for adding dependencies to vendor units so package updates keep working.'
          ],
          distro: 'Semantics are upstream systemd and identical across RHEL 8/9/10 and Debian/Ubuntu. On RHEL the wait-online helper is NetworkManager-wait-online.service; on Ubuntu server it is systemd-networkd-wait-online.service.',
          challenge: {
            task: 'An API service must (1) start after its local Redis is up, (2) restart automatically whenever Redis is restarted, but (3) still start even if a remote metrics collector is unreachable. It writes to /data/api, an XFS mount from fstab. Write the [Unit] section.',
            solution: `\`\`\`
[Unit]
Description=Orders API
Requires=redis.service
After=redis.service
PartOf=redis.service
Wants=network-online.target
After=network-online.target
RequiresMountsFor=/data/api
\`\`\`

- Requires + After: Redis is started first and the API is not started if Redis fails.
- PartOf=redis.service: a restart/stop of Redis propagates to the API (Requires alone also propagates explicit stops/restarts; PartOf makes intent explicit and is the clean choice for restart propagation).
- The metrics collector is remote and optional, so it gets no requirement at all — the app should retry in its own code. network-online ordering only ensures addresses are configured.
- RequiresMountsFor ensures /data/api is mounted before start.`
          },
          interview: [
            { q: 'What is the difference between Requires= and After=?', a: 'Requires= is a requirement dependency: it pulls the other unit into the transaction and fails/stops this unit if that one fails or is stopped. After= is purely ordering: if both are starting, start this one after the other. They are independent, so you usually use both.', mistake: 'Saying Requires implies ordering.', followUp: 'What happens if you use Wants= without After=?' },
            { q: 'Why might After=network.target not be enough?', a: 'network.target only indicates the network management service has started; interfaces may not have addresses yet. Services that need working remote connectivity at start should use Wants= and After=network-online.target.', mistake: 'Recommending sleep 30 in ExecStartPre.', followUp: 'Which service implements network-online.target on RHEL?' },
            { q: 'How do you find what delayed a service at boot?', a: '`systemd-analyze critical-chain UNIT` shows the ordering chain with activation times and durations; `systemd-analyze blame` lists slow units overall; then read the slow unit\'s journal.', mistake: 'Only using blame, which ignores parallelism.', followUp: 'Why can a unit high in blame be irrelevant to boot time?' }
          ],
          revision: [
            'Requirement (Wants/Requires/BindsTo/PartOf/Conflicts) ≠ ordering (After/Before).',
            'Real dependency = Wants or Requires + After.',
            'Wants is the safe default; Requires propagates failure and stops.',
            'Remote connectivity at start → network-online.target.',
            'critical-chain for boot ordering delays; "ordering cycle" in the journal means a job was deleted.'
          ]
        },
        {
          id: 'L08-M3-T2',
          title: 'Drop-in overrides and restart policies',
          minutes: 40,
          objectives: [
            'Override vendor unit settings with drop-ins via systemctl edit and revert them cleanly',
            'Correctly reset list-type directives such as ExecStart= in a drop-in',
            'Configure Restart=, RestartSec= and start rate limiting to self-heal without restart storms',
            'Audit local modifications with systemd-delta and systemctl cat'
          ],
          prereqs: ['L08-M3-T1', 'L08-M2-T2'],
          concept: `You often need to change one setting of a package-provided unit — raise a limit, add an environment variable, add a dependency, change the restart policy. Copying the whole unit into /etc works but freezes it: future package fixes to the vendor unit are ignored. A **drop-in** changes only what you specify.

A drop-in is any \`*.conf\` file in a directory named \`UNIT.d/\`, e.g. \`/etc/systemd/system/httpd.service.d/override.conf\`. systemd merges drop-ins on top of the main unit, in lexical file-name order. \`systemctl edit httpd\` creates \`override.conf\` in the right place, opens an editor and runs daemon-reload on save. \`systemctl cat httpd\` shows the result; \`systemctl revert httpd\` removes all drop-ins and /etc copies, returning to the vendor unit.

**List-type directives accumulate.** Settings such as \`ExecStart=\`, \`Environment=\`, \`After=\` add to the existing list. To *replace* ExecStart for a non-oneshot service you must first clear it with an empty assignment:

\`\`\`
[Service]
ExecStart=
ExecStart=/usr/sbin/httpd $OPTIONS -DFOREGROUND -DCUSTOM
\`\`\`

Without the empty line systemd sees two ExecStart= values and refuses to load the unit ("has more than one ExecStart= setting, which is only allowed for Type=oneshot services").

**Restart policies** make services self-healing:

- \`Restart=no\` (default) — never restart. \`on-failure\` — restart on non-zero exit, signal death, timeout or watchdog. \`on-abnormal\` — signals/timeouts only. \`always\` — even on clean exit.
- \`RestartSec=5\` — wait before restarting (default 100 ms is aggressive).
- Rate limiting in **[Unit]**: \`StartLimitIntervalSec=300\` and \`StartLimitBurst=5\` — more than 5 starts in 300 s puts the unit into failed with "Start request repeated too quickly" and systemd stops trying. Clear it with \`systemctl reset-failed UNIT\` after fixing the cause.

A manual \`systemctl stop\` never triggers Restart=. Restart is about crashes, not about admins.`,
          internals: `Drop-in search paths mirror unit paths: /etc/systemd/system/UNIT.d/, /run/systemd/system/UNIT.d/, /usr/lib/systemd/system/UNIT.d/; a same-named .conf in a higher-priority directory masks a lower one. Type-wide drop-ins also exist, e.g. \`/etc/systemd/system/service.d/*.conf\` applies to every service — powerful and dangerous.

On a crash, the manager sees SIGCHLD for the main PID, evaluates Restart= against the exit reason, schedules a restart job after RestartSec (shown as \`activating (auto-restart)\`), and increments the start counter. When the counter exceeds StartLimitBurst within StartLimitIntervalSec, it applies \`StartLimitAction=\` (default none) and leaves the unit failed with Result: start-limit-hit. \`systemd-delta\` compares /etc, /run and /usr/lib and reports [OVERRIDDEN], [EXTENDED], [MASKED] units — useful for audits and image drift detection.`,
          useCases: [
            'Raising LimitNOFILE for nginx or a database without forking the vendor unit',
            'Adding Restart=on-failure to a vendor daemon that crashes occasionally, while keeping vendor updates',
            'Adding an EnvironmentFile or proxy variables to a packaged agent',
            'Auditing a fleet for local unit modifications with systemd-delta before an upgrade'
          ],
          syntax: 'systemctl edit UNIT\nsystemctl edit --drop-in=NAME UNIT\nsystemctl cat UNIT\nsystemctl revert UNIT\nsystemd-delta --type=extended\nsystemctl reset-failed UNIT',
          options: [
            ['Restart=', 'no | on-success | on-failure | on-abnormal | on-abort | on-watchdog | always'],
            ['RestartSec=', 'Delay before restart (default 100ms)'],
            ['StartLimitIntervalSec= / StartLimitBurst=', '[Unit] section: rate-limit window and maximum starts'],
            ['ExecStart= (empty)', 'In a drop-in, clears inherited ExecStart values before redefining'],
            ['LimitNOFILE=', 'Open-file limit for the service (ulimit -n equivalent)'],
            ['--drop-in=NAME', 'Use NAME.conf instead of override.conf (systemd 252+)']
          ],
          examples: [
            {
              title: 'See the merged result of a drop-in',
              cmd: 'systemctl cat nginx',
              out: '# /usr/lib/systemd/system/nginx.service\n[Unit]\nDescription=The nginx HTTP and reverse proxy server\n...\n[Service]\nType=forking\nPIDFile=/run/nginx.pid\nExecStart=/usr/sbin/nginx\n...\n\n# /etc/systemd/system/nginx.service.d/override.conf\n[Service]\nLimitNOFILE=65536\nRestart=on-failure\nRestartSec=5',
              fields: [['# /etc/.../override.conf', 'Drop-in merged after the vendor file; its settings win or extend']]
            },
            {
              title: 'Hit the start rate limit',
              cmd: 'systemctl status worker',
              out: '× worker.service - Queue worker\n     Loaded: loaded (/etc/systemd/system/worker.service; enabled; preset: disabled)\n     Active: failed (Result: start-limit-hit) since Thu 2026-10-08 11:04:52 UTC; 1min ago\n\nOct 08 11:04:52 app02 systemd[1]: worker.service: Scheduled restart job, restart counter is at 5.\nOct 08 11:04:52 app02 systemd[1]: worker.service: Start request repeated too quickly.\nOct 08 11:04:52 app02 systemd[1]: worker.service: Failed with result \'start-limit-hit\'.',
              fields: [
                ['Result: start-limit-hit', 'systemd gave up after StartLimitBurst restarts in the interval'],
                ['restart counter is at 5', 'Number of automatic restarts so far']
              ],
              note: 'Find the original crash further up in `journalctl -u worker`; fix it, then `systemctl reset-failed worker` and start.'
            },
            {
              title: 'Audit local overrides',
              cmd: 'systemd-delta --type=extended,overridden',
              out: '[EXTENDED]   /usr/lib/systemd/system/nginx.service → /etc/systemd/system/nginx.service.d/override.conf\n[OVERRIDDEN] /etc/systemd/system/chronyd.service → /usr/lib/systemd/system/chronyd.service\n\n2 overridden configuration files found.',
              fields: [['[EXTENDED]', 'Vendor unit plus drop-in'], ['[OVERRIDDEN]', 'Full copy in /etc replaces the vendor unit (vendor updates ignored)']]
            }
          ],
          walkthrough: [
            'Run `sudo systemctl edit chronyd`, add `[Service]` and `Restart=always` plus `RestartSec=10` in the marked area, save.',
            'Confirm: `systemctl cat chronyd` and `systemctl show chronyd -p Restart -p RestartSec`.',
            'Test self-healing: `sudo kill -9 $(systemctl show -p MainPID --value chronyd)`; watch `systemctl status chronyd` show auto-restart, then active with a new PID ~10 s later.',
            'Note `systemctl stop chronyd` does NOT trigger a restart; start it again.',
            'Revert: `sudo systemctl revert chronyd` and verify `systemctl cat chronyd` shows only the vendor file.'
          ],
          lab: {
            goal: 'Make a crashing service self-heal, observe the rate limit, and override ExecStart correctly.',
            steps: [
              'Create `/usr/local/bin/flaky.sh`: `#!/bin/bash` / `echo starting; sleep 3; exit 1`; chmod 755.',
              'Create `flaky.service` (Type=exec, ExecStart=/usr/local/bin/flaky.sh) and start it — observe it failing once and staying failed.',
              'Add a drop-in with `sudo systemctl edit flaky`: `[Unit]` StartLimitIntervalSec=60, StartLimitBurst=3 and `[Service]` Restart=on-failure, RestartSec=2.',
              'Start it and watch `journalctl -u flaky -f` until "Start request repeated too quickly".',
              'Fix the "bug" via a drop-in that replaces ExecStart: empty `ExecStart=` then `ExecStart=/usr/bin/sleep infinity`.',
              '`sudo systemctl reset-failed flaky && sudo systemctl start flaky`.'
            ],
            verify: '`systemctl status flaky` shows active (running) running sleep infinity; `systemctl cat flaky` shows the drop-in with the empty ExecStart= reset; `systemd-delta --type=extended | grep flaky` lists it.'
          },
          troubleshooting: {
            scenario: 'After a colleague added a drop-in to change httpd options, `systemctl restart httpd` fails with "Unit httpd.service has a bad unit file setting".',
            steps: [
              'Evidence: `systemctl status httpd` shows Loaded: bad-setting; `journalctl -b -u httpd` says "Service has more than one ExecStart= setting, which is only allowed for Type=oneshot services. Refusing."',
              'Hypothesis: the drop-in added a second ExecStart without clearing the vendor one.',
              'Fix: `sudo systemctl edit httpd` and insert an empty `ExecStart=` line before the new ExecStart; save (auto daemon-reload).',
              'Validate: `systemctl cat httpd`, `apachectl configtest`, `systemctl restart httpd`, and `systemctl status httpd` is active.'
            ]
          },
          mistakes: [
            'Copying the full vendor unit into /etc for a one-line change — future vendor fixes are silently lost.',
            'Redefining ExecStart= in a drop-in without the empty reset line.',
            'Putting StartLimitIntervalSec/StartLimitBurst in [Service] — on current systemd they belong in [Unit] (older names in [Service] are deprecated).',
            'Restart=always with RestartSec default on a crash-looping service, hammering dependencies and logs.',
            'Forgetting reset-failed after fixing a start-limit-hit unit, then wondering why start still refuses.'
          ],
          safety: [
            '`systemctl edit` requires root and reloads automatically; manual drop-in files need `systemctl daemon-reload`.',
            '`systemctl revert` deletes all your drop-ins for that unit — back them up first if they hold custom work.',
            'Type-wide drop-ins (service.d/) affect every service on the host; test thoroughly.',
            'Restart=always can mask real failures; pair it with monitoring of restart counts (`systemctl show -p NRestarts UNIT`).'
          ],
          distro: 'Drop-ins and systemctl edit work on RHEL 7+ and all systemd distributions. `--drop-in=` and `NRestarts` need newer systemd (RHEL 9/10). RHEL 8 accepts StartLimitIntervalSec in [Unit]; the old StartLimitInterval= name in [Service] is deprecated.',
          challenge: {
            task: 'The vendor `postfix.service` must get `LimitNOFILE=16384`, automatically restart 15 s after a crash, but give up after 4 crashes in 10 minutes. You must not lose future vendor unit updates. Provide the commands and file content, and how to roll back.',
            solution: `\`\`\`
sudo systemctl edit postfix
\`\`\`

\`\`\`
[Unit]
StartLimitIntervalSec=600
StartLimitBurst=4

[Service]
LimitNOFILE=16384
Restart=on-failure
RestartSec=15
\`\`\`

\`\`\`
systemctl cat postfix | tail -10
systemctl show postfix -p LimitNOFILE -p Restart -p RestartUSec
sudo systemctl restart postfix
cat /proc/$(systemctl show -p MainPID --value postfix)/limits | grep "open files"
\`\`\`

The drop-in lives in /etc/systemd/system/postfix.service.d/override.conf so the vendor unit continues to be updated by dnf. Rollback: \`sudo systemctl revert postfix && sudo systemctl restart postfix\`.`
          },
          interview: [
            { q: 'How do you change one setting of a vendor unit safely?', a: 'Use `systemctl edit UNIT` to create a drop-in in /etc/systemd/system/UNIT.d/override.conf containing only the changed directives; it is merged on top of the vendor unit, survives package updates and can be removed with `systemctl revert`.', mistake: 'Editing /usr/lib/systemd/system directly.', followUp: 'How do you replace ExecStart in a drop-in?' },
            { q: 'What does "Start request repeated too quickly" mean?', a: 'The unit hit its start rate limit (StartLimitBurst starts within StartLimitIntervalSec, default 5 in 10 s), usually because Restart= kept restarting a crashing process. systemd stops trying. Find the real crash in the journal, fix it, then reset-failed and start.', mistake: 'Raising the burst limit without finding the crash.', followUp: 'Where do the StartLimit settings belong?' },
            { q: 'Does Restart=always restart a service after systemctl stop?', a: 'No. Restart= only acts when the service exits or dies without an explicit stop request from the manager.', mistake: 'Saying yes.', followUp: 'Which Restart= value would restart after a clean exit code 0?' }
          ],
          revision: [
            'Drop-in = UNIT.d/*.conf; created by systemctl edit, removed by systemctl revert.',
            'List directives accumulate; reset ExecStart= with an empty line first.',
            'Restart=on-failure + RestartSec= for self-healing; StartLimit* in [Unit] prevents storms.',
            'start-limit-hit → fix → reset-failed → start.',
            'systemd-delta shows EXTENDED/OVERRIDDEN/MASKED units.'
          ]
        }
      ]
    },
    {
      id: 'L08-M4', title: 'Timers, sockets and mount units',
      summary: 'Schedule work with systemd timers, start services on demand with socket activation, and manage mounts and automounts as units.',
      lessons: [
        {
          id: 'L08-M4-T1',
          title: 'systemd timers as a cron replacement',
          minutes: 40,
          objectives: [
            'Write a timer/service pair with OnCalendar= and monotonic triggers',
            'Validate calendar expressions with systemd-analyze calendar',
            'Use Persistent=, RandomizedDelaySec= and AccuracySec= correctly',
            'Inspect schedules with list-timers and debug timer runs in the journal'
          ],
          prereqs: ['L08-M2-T2'],
          concept: `A **timer unit** (\`NAME.timer\`) activates another unit — by default the service with the same name (\`NAME.service\`) — on a schedule. Compared with cron, you get the journal for every run, dependency handling, resource limits and sandboxing from the service unit, no overlapping runs (a running service is not started twice), catch-up of missed runs, and \`systemctl list-timers\` showing next and last run.

Two trigger families:

- **Realtime (wall clock)**: \`OnCalendar=\` with the format \`DayOfWeek Year-Month-Day Hour:Minute:Second\`. Examples: \`daily\` (= \`*-*-* 00:00:00\`), \`Mon..Fri 07:30\`, \`*-*-* 02:15:00\`, \`*-*-01 03:00\` (first of each month), \`*:0/15\` (every 15 minutes). Always test with \`systemd-analyze calendar 'EXPR'\` — it prints the normalised form and next elapse time.
- **Monotonic (relative)**: \`OnBootSec=10min\` (after boot), \`OnUnitActiveSec=1h\` (one hour after the service was last activated), \`OnActiveSec=\` (after the timer itself started).

Key options:

- \`Persistent=true\` (OnCalendar only) — if the machine was off when the timer should have fired, run once at the next boot. This is the anacron behaviour cron lacks.
- \`RandomizedDelaySec=30min\` — spread start times so 500 VMs do not all hit the backup server at 02:00.
- \`AccuracySec=\` — systemd may coalesce wake-ups within this window (default 1min). Set \`1s\` when precise timing matters.

The service triggered by a timer is usually \`Type=oneshot\` and has **no [Install] section** — you **enable the timer**, not the service: \`systemctl enable --now backup.timer\`. The timer's [Install] says \`WantedBy=timers.target\`.

For one-off or ad-hoc schedules, \`systemd-run --on-calendar='...' /path/cmd\` creates a transient timer without writing files. Users can have their own timers with \`systemctl --user\` (they keep running after logout only with \`loginctl enable-linger USER\`).`,
          internals: `The timer is a state machine in PID 1. On activation it computes the next elapse time from its triggers; for Persistent=true it stores the last trigger time as a stamp file under \`/var/lib/systemd/timers/stamp-NAME.timer\` and compares it at boot. When the timer elapses, systemd enqueues a start job for the target unit. If that unit is still running (activating/active), the start job is a no-op, which is why systemd timers do not overlap.

Realtime timers use CLOCK_REALTIME and react to clock changes; monotonic timers use CLOCK_MONOTONIC (or CLOCK_BOOTTIME). \`WakeSystem=true\` can resume a suspended machine. All timer output goes to the journal under the service unit name, so \`journalctl -u NAME.service\` gives you a full run history.`,
          useCases: [
            'Nightly database dumps with Persistent=true so a maintenance-window outage does not skip a backup',
            'Fleet-wide jobs (log shipping, compliance scans) spread with RandomizedDelaySec to avoid thundering herds',
            'Periodic cleanup every 15 minutes with OnUnitActiveSec so runs never overlap',
            'Replacing root crontab entries with auditable, sandboxed units'
          ],
          syntax: 'systemctl list-timers [--all]\nsystemd-analyze calendar [--iterations=N] \'EXPR\'\nsystemctl enable --now NAME.timer\nsystemctl start NAME.service   # run the job now\nsystemd-run --on-calendar=\'EXPR\' --unit=NAME CMD\njournalctl -u NAME.service',
          options: [
            ['OnCalendar=', 'Wall-clock schedule (can be repeated for several schedules)'],
            ['OnBootSec= / OnUnitActiveSec=', 'Relative triggers after boot / after last activation'],
            ['Persistent=true', 'Catch up a missed OnCalendar run at next boot'],
            ['RandomizedDelaySec=', 'Random extra delay to spread load'],
            ['AccuracySec=', 'Allowed coalescing window (default 1min)'],
            ['Unit=', 'Activate a differently named unit'],
            ['--iterations=N', 'systemd-analyze calendar: show the next N elapse times']
          ],
          examples: [
            {
              title: 'Validate a calendar expression',
              cmd: 'systemd-analyze calendar --iterations=2 \'Mon..Fri *-*-* 02:30:00\'',
              out: '  Original form: Mon..Fri *-*-* 02:30:00\nNormalized form: Mon..Fri *-*-* 02:30:00\n    Next elapse: Mon 2026-10-12 02:30:00 UTC\n       From now: 2 days left\n       Iter. #2: Tue 2026-10-13 02:30:00 UTC\n       From now: 3 days left',
              fields: [['Normalized form', 'How systemd understood the expression'], ['Next elapse / Iter. #2', 'Upcoming trigger times — confirm weekends are skipped']]
            },
            {
              title: 'List timers',
              cmd: 'systemctl list-timers',
              out: 'NEXT                        LEFT       LAST                        PASSED  UNIT                  ACTIVATES\nFri 2026-10-09 02:41:07 UTC 11h left   Thu 2026-10-08 02:37:55 UTC 12h ago dbdump.timer          dbdump.service\nFri 2026-10-09 00:00:00 UTC 9h left    Thu 2026-10-08 00:00:01 UTC 14h ago logrotate.timer       logrotate.service\nFri 2026-10-09 15:20:11 UTC 41min left Thu 2026-10-08 15:20:11 UTC 23h ago systemd-tmpfiles-clean.timer systemd-tmpfiles-clean.service\n\n3 timers listed.',
              fields: [
                ['NEXT / LEFT', 'Next scheduled activation'],
                ['LAST / PASSED', 'When it last fired (n/a = never)'],
                ['ACTIVATES', 'The unit started when the timer elapses']
              ],
              note: 'dbdump fires at 02:41 rather than 02:30 because of RandomizedDelaySec.'
            }
          ],
          walkthrough: [
            'Create `/etc/systemd/system/diskreport.service`: `[Service] Type=oneshot` and `ExecStart=/usr/bin/df -h /` (no [Install]).',
            'Create `/etc/systemd/system/diskreport.timer`: `[Timer] OnCalendar=*:0/5`, `Persistent=true`, `[Install] WantedBy=timers.target`.',
            'Check the expression: `systemd-analyze calendar --iterations=3 "*:0/5"`.',
            '`sudo systemctl daemon-reload && sudo systemctl enable --now diskreport.timer`.',
            'Run the job immediately to test it: `sudo systemctl start diskreport.service` and read `journalctl -u diskreport.service -n 10`.',
            'Watch the schedule: `systemctl list-timers diskreport.timer`.'
          ],
          lab: {
            goal: 'Migrate a root cron job to a systemd timer with catch-up and load spreading.',
            steps: [
              'Assume the cron entry `30 1 * * * /usr/local/sbin/purge-tmp.sh`. Create the script: `find /var/tmp/app -type f -mtime +7 -delete` (mkdir -p /var/tmp/app first), chmod 755.',
              'Write `purge-tmp.service` (Type=oneshot, ExecStart=/usr/local/sbin/purge-tmp.sh, Nice=10).',
              'Write `purge-tmp.timer` with `OnCalendar=*-*-* 01:30:00`, `Persistent=true`, `RandomizedDelaySec=15min`, WantedBy=timers.target.',
              'daemon-reload, enable --now the timer, and remove the cron entry (`crontab -e`).',
              'Test: create an old file `touch -d "10 days ago" /var/tmp/app/old.log`, run `systemctl start purge-tmp.service`, confirm the file is gone.',
              'Confirm schedule and history: `systemctl list-timers purge-tmp.timer` and `journalctl -u purge-tmp.service`.'
            ],
            verify: '`systemctl is-enabled purge-tmp.timer` = enabled, `systemctl is-active purge-tmp.timer` = active, list-timers shows a NEXT time between 01:30 and 01:45, and `ls /var/tmp/app/old.log` fails after the manual run.'
          },
          troubleshooting: {
            scenario: 'A new nightly report timer never runs. `systemctl list-timers` does not show it.',
            steps: [
              'Evidence: `systemctl status report.timer` shows `inactive (dead)`; `systemctl is-enabled report.service` says static and report.timer says disabled.',
              'Hypothesis: the admin enabled/started the service instead of the timer (or forgot daemon-reload).',
              'Fix: `systemctl daemon-reload; systemctl enable --now report.timer`.',
              'Validate: `systemctl list-timers report.timer` shows NEXT; after the first run `journalctl -u report.service` shows output and exit status.'
            ]
          },
          mistakes: [
            'Enabling the .service instead of the .timer.',
            'Giving the triggered service an [Install] WantedBy=multi-user.target, so it also runs at every boot.',
            'Writing cron syntax (`30 1 * * *`) in OnCalendar=.',
            'Expecting a missed run to catch up without Persistent=true.',
            'Assuming exact-second precision with the default AccuracySec=1min.'
          ],
          safety: [
            'System timers need root to create; user timers run with the user\'s privileges via systemctl --user.',
            'Test the service manually (systemctl start NAME.service) before enabling the timer, especially for deletion jobs.',
            'For destructive jobs, run first with a dry-run variant (e.g. find ... -print) and review the journal output.'
          ],
          distro: 'Available on RHEL 7+ and all systemd distributions. RHEL 9 moved logrotate from cron.daily to logrotate.timer; many distro maintenance jobs (fstrim, dnf-makecache, tmpfiles-clean) are timers. cronie remains installed and supported on RHEL, so both mechanisms coexist.',
          challenge: {
            task: 'Create a timer that runs `/usr/local/bin/sync-catalog` every weekday at 06:00 and 18:00, never overlaps, catches up if the server was down, and spreads start across up to 10 minutes. Show how you would prove the schedule before enabling it.',
            solution: `\`\`\`
# /etc/systemd/system/sync-catalog.service
[Unit]
Description=Sync product catalog

[Service]
Type=oneshot
ExecStart=/usr/local/bin/sync-catalog

# /etc/systemd/system/sync-catalog.timer
[Unit]
Description=Sync catalog twice per weekday

[Timer]
OnCalendar=Mon..Fri *-*-* 06,18:00:00
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
\`\`\`

\`\`\`
systemd-analyze calendar --iterations=4 'Mon..Fri *-*-* 06,18:00:00'
sudo systemd-analyze verify /etc/systemd/system/sync-catalog.{service,timer}
sudo systemctl daemon-reload
sudo systemctl enable --now sync-catalog.timer
systemctl list-timers sync-catalog.timer
\`\`\`

No overlap is inherent: a oneshot service that is still activating is not started again. Persistent=true gives catch-up; RandomizedDelaySec spreads the load.`
          },
          interview: [
            { q: 'Why would you use a systemd timer instead of cron?', a: 'Each run is logged in the journal with exit status; the job inherits service features (dependencies, resource limits, sandboxing, User=); runs do not overlap; Persistent=true catches up missed runs; RandomizedDelaySec spreads load; list-timers shows next/last run.', mistake: 'Saying cron is deprecated on RHEL.', followUp: 'How do you run the job immediately for testing?' },
            { q: 'What does Persistent=true do?', a: 'For OnCalendar timers, systemd stores the last trigger time on disk; if a scheduled time passed while the system was off (or the timer inactive), the service is triggered once as soon as the timer is activated again.', mistake: 'Saying it keeps the timer enabled across reboots.', followUp: 'Where is the timestamp stored?' },
            { q: 'Which unit do you enable for a timer-driven job?', a: 'The .timer unit (WantedBy=timers.target). The service normally has no [Install] section and is static.', mistake: 'Enabling both, causing the job to also run at boot.', followUp: 'How do you create a one-off transient timer without files?' }
          ],
          revision: [
            'NAME.timer activates NAME.service; enable the timer.',
            'OnCalendar = wall clock; OnBootSec/OnUnitActiveSec = relative.',
            'Always check expressions with systemd-analyze calendar.',
            'Persistent=true catches up; RandomizedDelaySec spreads; AccuracySec defaults to 1min.',
            'History: journalctl -u NAME.service; schedule: systemctl list-timers.'
          ]
        },
        {
          id: 'L08-M4-T2',
          title: 'Socket activation, mount and automount units',
          minutes: 40,
          objectives: [
            'Explain socket activation and identify socket-activated services',
            'Name and write mount units, including path escaping',
            'Relate /etc/fstab entries to generated mount units',
            'Use automount units or x-systemd.automount to mount on first access'
          ],
          prereqs: ['L08-M3-T1'],
          concept: `### Socket activation
A **socket unit** makes systemd itself open a listening socket (TCP, UDP, UNIX). When the first connection arrives, systemd starts the matching service and hands it the already-open file descriptor. Benefits: the service consumes nothing until used, clients never see "connection refused" during a restart (connections queue in the kernel), and boot is faster because services that talk over sockets can start in parallel.

\`\`\`
# cockpit.socket (simplified)
[Socket]
ListenStream=9090
[Install]
WantedBy=sockets.target
\`\`\`

With the default \`Accept=no\`, one service instance (\`cockpit.service\`) receives the listening socket. With \`Accept=yes\`, systemd accepts each connection and starts a template instance \`NAME@.service\` per connection (inetd style). You **enable the socket**, not the service: \`systemctl enable --now cockpit.socket\`. The service may show \`inactive\` until the first connection — that is normal. \`systemctl list-sockets\` shows the listeners and what they activate.

### Mount units
Every mounted filesystem is represented as a \`.mount\` unit whose **name must equal the escaped mount point**: \`/\` becomes \`-.mount\`, \`/var/lib/data\` becomes \`var-lib-data.mount\`. Characters like \`-\` and spaces are escaped (\`systemd-escape -p --suffix=mount "/srv/web-data"\` → \`srv-web\\x2ddata.mount\`).

\`\`\`
# /etc/systemd/system/srv-data.mount
[Mount]
What=/dev/disk/by-uuid/3f1c...
Where=/srv/data
Type=xfs
Options=defaults,noatime
[Install]
WantedBy=multi-user.target
\`\`\`

Most administrators still use **/etc/fstab**: at boot and on every daemon-reload, \`systemd-fstab-generator\` converts fstab lines into mount units under \`/run/systemd/generator/\`. That is why \`systemctl status srv-data.mount\` works for fstab mounts, and why you should \`systemctl daemon-reload\` after editing fstab.

### Automount
An **automount** unit (\`srv-data.automount\` with \`[Automount] Where=/srv/data\`, \`TimeoutIdleSec=10min\`) places an autofs trap on the directory; the real mount happens on first access and can be unmounted when idle. In fstab use the option \`x-systemd.automount\`. This is ideal for network shares that should not block boot. (The separate autofs daemon with map files is covered in Level 9.)`,
          internals: `For sockets, systemd calls socket()/bind()/listen() itself and passes the fd to the service as fd 3 with environment variables \`LISTEN_FDS\` and \`LISTEN_PID\` (sd_listen_fds()). Daemons must support this protocol, which is why you cannot socket-activate an arbitrary program with Accept=no.

Mount units are also created *passively*: systemd watches /proc/self/mountinfo, so even a manual \`mount\` command produces a loaded \`.mount\` unit. Mount units get implicit dependencies: ordering after the parent mount point, after the backing device unit (\`dev-disk-by\\x2duuid-....device\`), and, for network filesystems (\`_netdev\` or type nfs/cifs), ordering after \`network-online.target\` under \`remote-fs.target\`. fstab options prefixed \`x-systemd.\` (automount, device-timeout, requires=) are consumed by the generator, and \`nofail\` turns the hard Requires from local-fs.target into a Wants, so a missing disk no longer drops the boot into emergency mode.`,
          useCases: [
            'Cockpit web console started only when an admin connects on port 9090',
            'Mounting an application data volume with explicit dependencies (RequiresMountsFor= in the app unit)',
            'Network or removable mounts that should mount on demand without delaying boot (x-systemd.automount)',
            'Diagnosing why a mount failed at boot via systemctl status of its generated mount unit'
          ],
          syntax: 'systemctl list-sockets\nsystemctl enable --now NAME.socket\nsystemd-escape -p --suffix=mount /path/to/dir\nsystemctl status srv-data.mount\nsystemctl enable --now srv-data.automount\nls /run/systemd/generator/',
          options: [
            ['ListenStream= / ListenDatagram=', 'TCP (or UNIX stream) / UDP listener address or port'],
            ['Accept=', 'no: one service gets the listener; yes: one template instance per connection'],
            ['What= / Where= / Type= / Options=', 'Mount unit: device, mount point, fs type, mount options'],
            ['TimeoutIdleSec=', 'Automount: unmount after this idle period'],
            ['x-systemd.automount', 'fstab option: generate an automount unit for this entry'],
            ['nofail', 'fstab/mount option: failure does not block local-fs.target']
          ],
          examples: [
            {
              title: 'Socket listeners and the units they activate',
              cmd: 'systemctl list-sockets --no-pager | head -5',
              out: 'LISTEN                          UNIT                         ACTIVATES\n/run/dbus/system_bus_socket     dbus.socket                  dbus-broker.service\n/run/systemd/journal/stdout     systemd-journald.socket      systemd-journald.service\n[::]:9090                       cockpit.socket               cockpit.service\n/run/lvm/lvmpolld.socket        lvm2-lvmpolld.socket         lvm2-lvmpolld.service',
              fields: [['LISTEN', 'Address or UNIX path systemd holds open'], ['ACTIVATES', 'Service started on first connection']]
            },
            {
              title: 'Escape a mount point into a unit name',
              cmd: 'systemd-escape -p --suffix=mount "/srv/web-data"',
              out: 'srv-web\\x2ddata.mount',
              fields: [['\\x2d', 'An escaped literal dash; plain dashes separate path components']]
            },
            {
              title: 'Status of an fstab-generated mount',
              cmd: 'systemctl status srv-data.mount --no-pager',
              out: '● srv-data.mount - /srv/data\n     Loaded: loaded (/etc/fstab; generated)\n     Active: active (mounted) since Thu 2026-10-08 08:01:12 UTC; 7h ago\n      Where: /srv/data\n       What: /dev/mapper/vgdata-lvdata',
              fields: [['Loaded: (/etc/fstab; generated)', 'Unit produced by systemd-fstab-generator from fstab'], ['active (mounted)', 'Currently mounted']]
            }
          ],
          walkthrough: [
            'Install and socket-activate cockpit: `sudo dnf install -y cockpit && sudo systemctl enable --now cockpit.socket`.',
            'Check `systemctl is-active cockpit.service` (inactive), then `curl -sk https://localhost:9090 >/dev/null` and check again (active).',
            'Inspect generated mount units: `ls /run/systemd/generator/` and `systemctl list-units -t mount`.',
            'Create a test mount unit for a loop-backed filesystem (see lab) and name it with `systemd-escape`.',
            'Convert it to on-demand with an automount unit and verify the mount appears only after `ls` of the directory.'
          ],
          lab: {
            goal: 'Create a native mount unit and an automount unit for a scratch filesystem without touching real disks.',
            steps: [
              'Create a 200 MiB image file and filesystem: `sudo truncate -s 200M /var/tmp/scratch.img && sudo mkfs.xfs /var/tmp/scratch.img`.',
              'Create the mount point: `sudo mkdir -p /srv/scratch` and get the unit name: `systemd-escape -p --suffix=mount /srv/scratch` (srv-scratch.mount).',
              'Write `/etc/systemd/system/srv-scratch.mount` with `What=/var/tmp/scratch.img`, `Where=/srv/scratch`, `Type=xfs`, `Options=loop` and `[Install] WantedBy=multi-user.target`.',
              '`sudo systemctl daemon-reload && sudo systemctl start srv-scratch.mount`; check `findmnt /srv/scratch`.',
              'Stop it, then write `srv-scratch.automount` (`[Automount] Where=/srv/scratch`, `TimeoutIdleSec=60`, `[Install] WantedBy=multi-user.target`), `daemon-reload`, `enable --now srv-scratch.automount`.',
              'Run `findmnt /srv/scratch` (autofs only), then `ls /srv/scratch` and `findmnt /srv/scratch` again (xfs mounted on top).'
            ],
            verify: '`systemctl status srv-scratch.automount` is active (waiting/running); after accessing the directory `findmnt /srv/scratch` lists an xfs mount from /dev/loopN; ~60 s idle later the xfs mount disappears.'
          },
          troubleshooting: {
            scenario: 'A hand-written mount unit `/etc/systemd/system/data.mount` with `Where=/srv/data` refuses to load.',
            steps: [
              'Evidence: `systemctl status data.mount` shows `Loaded: bad-setting`; journal says "Where= setting doesn\'t match unit name. Refusing."',
              'Hypothesis: mount unit names must be the escaped Where= path.',
              'Fix: rename the file to `srv-data.mount` (from `systemd-escape -p --suffix=mount /srv/data`), update any WantedBy/Requires references, daemon-reload.',
              'Validate: `systemctl start srv-data.mount` and `findmnt /srv/data`.'
            ]
          },
          mistakes: [
            'Naming a mount unit freely (data.mount) instead of the escaped path.',
            'Enabling the service of a socket-activated pair instead of the socket.',
            'Defining the same mount in both fstab and a mount unit — confusing duplicate definitions (the /etc unit wins over the generated one).',
            'Editing fstab and not running daemon-reload, so systemd keeps using stale generated units.',
            'Using automount for filesystems that must be mounted for early boot services.'
          ],
          safety: [
            'Mount operations need root; test mounts with spare images or spare disks, never on the OS disk.',
            'A failing required mount at boot drops the system to emergency mode — use nofail for non-critical data and keep console access.',
            'Before stopping a mount unit, check users with `findmnt` and `fuser -vm /mountpoint` / `lsof +f -- /mountpoint`.'
          ],
          distro: 'Identical on RHEL 8/9/10 and Debian/Ubuntu. Cockpit is socket-activated on RHEL 8+ (`cockpit.socket`). RHEL exams still expect /etc/fstab for persistent mounts; mount units are an alternative, not a replacement.',
          challenge: {
            task: 'An NFS share `/mnt/reports` in fstab delays boot by 90 s when the NFS server is down. Change it so boot never waits and the share mounts automatically on first access, then unmounts after 5 idle minutes. Show the fstab line and the validation commands.',
            solution: `\`\`\`
nfs01.example.com:/exports/reports  /mnt/reports  nfs  _netdev,nofail,x-systemd.automount,x-systemd.idle-timeout=5min,x-systemd.mount-timeout=30  0 0
\`\`\`

\`\`\`
sudo findmnt --verify
sudo systemctl daemon-reload
sudo systemctl restart remote-fs.target
systemctl status mnt-reports.automount
ls /mnt/reports && findmnt /mnt/reports
\`\`\`

x-systemd.automount makes the generator create mnt-reports.automount, so only the autofs trap is set up at boot; nofail ensures a failed mount never blocks boot; idle-timeout unmounts after 5 minutes; _netdev marks it as a network mount ordered after the network.`
          },
          interview: [
            { q: 'What is socket activation and why use it?', a: 'systemd opens the listening socket and starts the service when the first connection arrives, passing the open fd. It saves resources for rarely used services, allows parallel boot and lets connections queue in the kernel across restarts.', mistake: 'Saying systemd proxies all traffic.', followUp: 'What is the difference between Accept=no and Accept=yes?' },
            { q: 'How are /etc/fstab entries related to mount units?', a: 'systemd-fstab-generator converts each fstab line into a .mount (and optionally .automount) unit in /run/systemd/generator at boot and on daemon-reload. systemctl status MOUNTUNIT shows "Loaded: (/etc/fstab; generated)".', mistake: 'Saying systemd ignores fstab.', followUp: 'Why must you run daemon-reload after editing fstab?' },
            { q: 'Why must a mount unit be named after its mount point?', a: 'systemd identifies mount units by path; the name must be the escaped Where= path (systemd-escape -p --suffix=mount), otherwise the unit is refused.', mistake: 'Not knowing the rule.', followUp: 'What is the unit name of the root filesystem?' }
          ],
          revision: [
            'Enable the .socket; the .service starts on first connection.',
            'Mount unit name = escaped path (/srv/data → srv-data.mount).',
            'fstab → systemd-fstab-generator → /run/systemd/generator/*.mount.',
            'x-systemd.automount + nofail = network shares that never block boot.',
            'list-sockets / list-units -t mount / findmnt for inspection.'
          ]
        }
      ]
    },
    {
      id: 'L08-M5', title: 'Service logs, debugging and hardening',
      summary: 'Use the journal and systemd result codes to find root causes fast, then reduce a service\'s blast radius with sandboxing and resource controls.',
      lessons: [
        {
          id: 'L08-M5-T1',
          title: 'Debugging services with journalctl and systemd results',
          minutes: 45,
          objectives: [
            'Filter the journal by unit, boot, priority, time and field',
            'Make the journal persistent and control its disk usage',
            'Map systemd Result values (exit-code, signal, timeout, oom-kill, core-dump, start-limit-hit, resources) to likely causes',
            'Follow an evidence-first workflow from status to root cause'
          ],
          prereqs: ['L08-M3-T2'],
          concept: `**systemd-journald** collects kernel messages, early-boot messages, syslog() calls, and the stdout/stderr of every service, and stores them as structured records with trusted metadata fields: \`_SYSTEMD_UNIT\`, \`_PID\`, \`_UID\`, \`_COMM\`, \`_BOOT_ID\`, \`PRIORITY\` and more. Because services' output is captured automatically, \`journalctl -u UNIT\` is the primary log for any systemd service.

Essential filters (they combine with AND):

- \`-u UNIT\` unit; \`-b\` current boot, \`-b -1\` previous boot, \`--list-boots\`.
- \`-p err\` priority err and more severe (0 emerg … 3 err … 7 debug); ranges like \`-p warning..err\`.
- \`--since "2026-10-08 14:00" --until "14:30"\`, or \`--since "-1h"\`/\`"1 hour ago"\`.
- \`-f\` follow; \`-n 50\` last lines; \`-r\` newest first; \`-k\` kernel only; \`-x\` add catalog explanations; \`-e\` jump to end.
- Field matches: \`_PID=1234\`, \`_UID=1001\`, \`_COMM=sshd\`; \`-o verbose\` shows all fields; \`-o json\` for tooling; \`-g PATTERN\` greps messages.

**Persistence.** With the default \`Storage=auto\`, journald writes to \`/var/log/journal\` only if that directory exists; otherwise logs live in \`/run/log/journal\` and vanish at reboot. On RHEL the directory is not created by default (rsyslog keeps text logs in /var/log/messages), so \`journalctl -b -1\` returns nothing after a crash unless you make it persistent: create \`/var/log/journal\` (or set \`Storage=persistent\` in a drop-in under \`/etc/systemd/journald.conf.d/\`) and restart systemd-journald. Limit size with \`SystemMaxUse=\`; clean up with \`journalctl --vacuum-size=500M\` or \`--vacuum-time=2weeks\`; check with \`--disk-usage\`.

**Result codes** in \`systemctl status\` narrow the search before you read a single log line:

- \`exit-code\` — process exited non-zero (status=1 app error; 200-243 systemd setup error).
- \`signal\` — killed by a signal (SEGV, ABRT, KILL…); \`core-dump\` — crashed with a core (see \`coredumpctl list\`).
- \`timeout\` — did not become ready within \`TimeoutStartSec=\` (often a wrong Type=, e.g. forking/notify mismatch) or did not stop in time.
- \`oom-kill\` — the kernel OOM killer or a \`MemoryMax=\` limit killed it.
- \`start-limit-hit\` — rate limit after repeated restarts.
- \`resources\` — systemd could not prepare (missing EnvironmentFile without \`-\`, PIDFile never appeared, etc.).

The workflow: **status → Result → journal for the unit around the failure time → application config test / dependency checks (ports, files, SELinux AVCs) → fix → verify**.`,
          internals: `journald receives data via several sockets: \`/run/systemd/journal/stdout\` (service stdout streams), \`/run/systemd/journal/socket\` (native protocol), \`/dev/log\` (syslog) and \`/dev/kmsg\` (kernel). Each entry is stored in an indexed binary file per boot and per user, with sealing and rotation; fields beginning with \`_\` are added by journald from kernel credentials (SCM_CREDENTIALS, cgroup) and cannot be forged by the client.

Rotation and retention are governed by \`SystemMaxUse=\` (default 10% of the filesystem, capped at 4G), \`SystemKeepFree=\`, \`MaxRetentionSec=\` and rate limiting (\`RateLimitIntervalSec=\`/\`RateLimitBurst=\`); when a noisy service exceeds the rate limit journald logs "Suppressed N messages". On RHEL, rsyslog reads from the journal (imjournal) and writes classic files such as /var/log/messages and /var/log/secure. Non-root users see only their own entries unless in the \`wheel\`, \`adm\` or \`systemd-journal\` group.`,
          useCases: [
            'Post-incident analysis of a crash that happened before a reboot, using a persistent journal and -b -1',
            'Narrowing a noisy host\'s logs to errors from one unit in a 10-minute incident window',
            'Detecting OOM kills of a JVM service from Result: oom-kill and kernel messages',
            'Exporting structured logs with -o json to a SIEM or for scripted analysis'
          ],
          syntax: 'journalctl -u UNIT [-b [-1]] [-p PRIO] [--since T] [--until T] [-f] [-n N]\njournalctl -k -b\njournalctl --list-boots\njournalctl _PID=PID | _UID=UID | _COMM=NAME\njournalctl --disk-usage | --vacuum-size=SIZE | --vacuum-time=TIME\ncoredumpctl list | info PID',
          options: [
            ['-u UNIT', 'Entries for one unit (repeatable)'],
            ['-b [N]', 'Current (0) or earlier (-1, -2) boot'],
            ['-p PRIORITY', 'emerg|alert|crit|err|warning|notice|info|debug or a range'],
            ['--since / --until', 'Time window (absolute or relative)'],
            ['-o verbose|json|short-precise', 'Output format; verbose shows every field'],
            ['-x / -e / -f', 'Catalog explanations / jump to end / follow'],
            ['--vacuum-size= / --vacuum-time=', 'Delete archived journal files beyond a size/age']
          ],
          examples: [
            {
              title: 'Timeout caused by a wrong Type=',
              cmd: 'journalctl -u legacyd -b --no-pager | tail -4',
              out: 'Oct 08 09:14:02 app03 systemd[1]: Starting legacyd.service - Legacy daemon...\nOct 08 09:15:32 app03 systemd[1]: legacyd.service: start operation timed out. Terminating.\nOct 08 09:15:32 app03 systemd[1]: legacyd.service: Failed with result \'timeout\'.\nOct 08 09:15:32 app03 systemd[1]: Failed to start legacyd.service - Legacy daemon.',
              fields: [
                ['90 s between Starting and timed out', 'Default TimeoutStartSec=90s elapsed'],
                ['result \'timeout\'', 'The service never signalled readiness']
              ],
              note: 'Typical cause: Type=forking for a program that stays in the foreground (or Type=notify for one that never calls sd_notify). Fix Type=, do not just raise the timeout.'
            },
            {
              title: 'OOM kill evidence',
              cmd: 'systemctl status reportgen --no-pager | sed -n 3p; journalctl -k -b -g "Killed process" --no-pager',
              out: '     Active: failed (Result: oom-kill) since Thu 2026-10-08 03:02:44 UTC; 6h ago\nOct 08 03:02:44 app03 kernel: Memory cgroup out of memory: Killed process 22871 (java) total-vm:9123456kB, anon-rss:4190020kB, file-rss:0kB, shmem-rss:0kB, UID:991 pgtables:9012kB oom_score_adj:0',
              fields: [
                ['Result: oom-kill', 'systemd recorded the OOM kill as the failure reason'],
                ['Memory cgroup out of memory', 'The unit hit its own MemoryMax= limit rather than the host running out of RAM']
              ]
            },
            {
              title: 'Make the journal persistent',
              cmd: 'sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald && journalctl --disk-usage',
              out: 'Archived and active journals take up 24.0M in the file system.',
              fields: [['24.0M', 'Now stored on disk under /var/log/journal/MACHINE-ID/']],
              note: 'Equivalent explicit config: /etc/systemd/journald.conf.d/persistent.conf with [Journal] Storage=persistent.'
            }
          ],
          walkthrough: [
            'Check persistence: `ls -d /var/log/journal` and `journalctl --list-boots`.',
            'Enable persistence (see example), reboot, then confirm `journalctl -b -1 -n 5` works.',
            'Find all errors since boot: `journalctl -b -p err --no-pager`.',
            'Narrow to a unit and window: `journalctl -u sshd --since "30 min ago"`.',
            'Inspect fields of one entry: `journalctl -u sshd -n 1 -o verbose`.',
            'Check usage and trim in a lab: `journalctl --disk-usage; sudo journalctl --vacuum-time=7d`.'
          ],
          lab: {
            goal: 'Diagnose three failure classes from status Result and journal evidence alone.',
            steps: [
              'Make the journal persistent and reboot so later steps survive.',
              'Timeout: create `slowfork.service` with Type=forking and `ExecStart=/usr/bin/sleep 600`, `TimeoutStartSec=20`; start and record Result. Fix to Type=exec.',
              'OOM: create `memhog.service` with `MemoryMax=50M` and `ExecStart=/usr/bin/python3 -c "b=bytearray(200*1024*1024); import time; time.sleep(60)"`; start and record Result and the kernel message.',
              'Missing env file: create `envcheck.service` with `EnvironmentFile=/etc/sysconfig/absent` and `ExecStart=/usr/bin/true`; start and record Result. Fix with `EnvironmentFile=-/etc/sysconfig/absent`.',
              'For each case write one line: Result, key journal line, root cause, fix.',
              'Reboot and show you can still read these failures with `journalctl -b -1 -u slowfork -u memhog -u envcheck`.'
            ],
            verify: 'Recorded results are timeout, oom-kill and resources respectively; after fixes slowfork is active, envcheck completes with status=0/SUCCESS; `journalctl -b -1` returns entries.'
          },
          troubleshooting: {
            scenario: 'A payment service restarted at 03:00 and the team needs to know why, but the server was rebooted at 03:20 and `journalctl -b -1` says "Specifying boot ID or boot offset has no effect, no persistent journal was found."',
            steps: [
              'Evidence: /var/log/journal does not exist; journal was volatile so the previous boot is gone. Check rsyslog files: `grep payment /var/log/messages` for the window.',
              'Hypothesis: the restart cause is still visible in /var/log/messages (rsyslog) — e.g. an OOM line or the app\'s fatal error.',
              'Fix (forward-looking): enable persistent journal via a journald.conf.d drop-in with Storage=persistent and SystemMaxUse=, restart systemd-journald.',
              'Validate: after next reboot `journalctl --list-boots` shows multiple boots; add a monitoring check for the directory in the build standard.'
            ]
          },
          mistakes: [
            'Reading only the last 10 lines in systemctl status instead of the journal around the first failure.',
            'Raising TimeoutStartSec to "fix" a timeout caused by a wrong Type=.',
            'Assuming the journal is persistent on RHEL by default and losing pre-reboot evidence.',
            'Deleting journal files by hand with rm instead of using --vacuum-*.',
            'Forgetting that non-privileged users see only their own journal entries.'
          ],
          safety: [
            'Reading the full system journal requires root or membership in wheel/adm/systemd-journal.',
            'Vacuuming deletes log history permanently — confirm retention/compliance requirements first.',
            'Logs may contain secrets or personal data; restrict access and be careful when exporting -o json to tickets.'
          ],
          distro: 'RHEL 8/9 ship with a volatile journal by default and rsyslog for /var/log/messages; Debian/Ubuntu ship /var/log/journal and persistent storage by default (Ubuntu also keeps rsyslog). Check RHEL 10 hosts with `ls -d /var/log/journal` rather than assuming. Prefer drop-ins in /etc/systemd/journald.conf.d/ — newer systemd versions ship the default journald.conf under /usr/lib.',
          challenge: {
            task: 'Give a single journalctl command that shows warning-or-worse messages from httpd and php-fpm during the previous boot between 13:00 and 13:30, oldest first, without a pager. Then explain what you would check if it returns "No entries".',
            solution: `\`\`\`
journalctl -b -1 -u httpd -u php-fpm -p warning --since "13:00" --until "13:30" --no-pager
\`\`\`

Note that --since/--until with only a time refer to *today*; for the previous day give a full date, e.g. \`--since "2026-10-07 13:00"\`.

If it returns nothing: (1) \`journalctl --list-boots\` — is there a previous boot at all (persistent journal)? (2) Confirm the time zone (\`timedatectl\`) and that the window matches the boot. (3) Drop \`-p warning\` — the app may log everything at info priority. (4) Check unit names (\`systemctl list-units | grep -E "httpd|php"\`). (5) Check /var/log/httpd/error_log, since httpd logs to its own files by default.`
          },
          interview: [
            { q: 'How do you read logs for a service from before the last reboot?', a: '`journalctl -u UNIT -b -1` — but only if the journal is persistent (/var/log/journal exists or Storage=persistent). Otherwise fall back to rsyslog files such as /var/log/messages.', mistake: 'Not knowing the journal can be volatile on RHEL.', followUp: 'How do you cap journal disk usage?' },
            { q: 'A service fails with Result: timeout. What do you suspect first?', a: 'A Type= mismatch: forking for a foreground process, or notify for a program that never sends READY. Also a genuinely slow startup (e.g. DB migration) or a dependency it waits on. Read the journal around the start and fix the type before touching TimeoutStartSec.', mistake: 'Increase the timeout.', followUp: 'Where is the default start timeout configured?' },
            { q: 'How do you find kernel OOM kills for a service?', a: 'systemctl status shows Result: oom-kill; `journalctl -k -b -g "Killed process"` or `-g "out of memory"` shows the kernel message with PID/command; "Memory cgroup out of memory" means the unit\'s MemoryMax limit, otherwise system-wide memory pressure.', mistake: 'Only checking the application log.', followUp: 'How would you set a memory limit on a service?' }
          ],
          revision: [
            'journalctl -u UNIT -b -p err --since ... is the core filter set.',
            'Journal is volatile unless /var/log/journal exists or Storage=persistent.',
            'Result: exit-code / signal / core-dump / timeout / oom-kill / start-limit-hit / resources each point to a different cause class.',
            'Use --vacuum-* and SystemMaxUse=, never rm on journal files.',
            '-o verbose shows trusted fields like _SYSTEMD_UNIT, _PID, _UID.'
          ]
        },
        {
          id: 'L08-M5-T2',
          title: 'Service hardening and resource control',
          minutes: 45,
          objectives: [
            'Apply sandboxing directives (NoNewPrivileges, PrivateTmp, ProtectSystem, ProtectHome, PrivateDevices, ReadWritePaths) to a service',
            'Grant only the needed capabilities instead of running as root',
            'Measure exposure with systemd-analyze security and iterate safely',
            'Limit resource use with MemoryMax=, CPUQuota= and TasksMax=, and troubleshoot hardening-induced failures'
          ],
          prereqs: ['L08-M5-T1'],
          concept: `Running as a non-root user is the first defence, but a compromised service can still read most of the filesystem, write to /tmp shared with other services, load setuid helpers, and use any network family. systemd can wrap the process in kernel namespaces, mount restrictions, capability limits and seccomp filters with a few directives — **defence in depth** that complements SELinux rather than replacing it.

Core directives (all in [Service]):

- \`NoNewPrivileges=yes\` — the process and its children can never gain privileges (setuid/setgid binaries and file capabilities stop working).
- \`PrivateTmp=yes\` — private /tmp and /var/tmp; other services cannot see or plant files there.
- \`ProtectSystem=strict\` — the whole filesystem is read-only for the service except /dev, /proc, /sys and paths you allow; \`full\` makes /usr, /boot and /etc read-only; \`yes\` only /usr and /boot.
- \`ReadWritePaths=/var/lib/app\` — punch writable holes (or use \`StateDirectory=\`/\`LogsDirectory=\`, which are automatically writable).
- \`ProtectHome=yes\` — /home, /root and /run/user appear empty (\`read-only\` and \`tmpfs\` are alternatives).
- \`PrivateDevices=yes\` — only pseudo devices such as /dev/null, /dev/zero, /dev/urandom.
- \`ProtectKernelTunables=yes\`, \`ProtectKernelModules=yes\`, \`ProtectControlGroups=yes\` — no sysctl writes, no module loading, read-only cgroupfs.
- \`RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX\` — no raw/netlink/packet sockets.
- \`SystemCallFilter=@system-service\` — seccomp allow-list of syscalls appropriate for services.
- \`CapabilityBoundingSet=\` and \`AmbientCapabilities=CAP_NET_BIND_SERVICE\` — let a non-root service bind port 443 without root and drop all other capabilities.

**Resource control** uses cgroup v2 (default on RHEL 9/10): \`MemoryMax=2G\` (hard limit → OOM kill inside the unit), \`MemoryHigh=\` (throttle), \`CPUQuota=150%\` (1.5 CPUs), \`TasksMax=512\` (fork-bomb protection), \`IOWeight=\`. These can also be changed live: \`systemctl set-property app.service MemoryMax=2G\` (persists as a drop-in; add \`--runtime\` for temporary).

**Iterate safely**: add directives in a drop-in, restart, run a functional test, check the journal for EROFS/EPERM errors, and use \`systemd-analyze security UNIT\` to see the remaining exposure score (0 = locked down, 10 = unsafe). Hardening that breaks the service in production is an outage — change one group of settings at a time on staging.`,
          internals: `At exec time systemd creates a new mount namespace for the service and applies read-only bind mounts (ProtectSystem), empty tmpfs or inaccessible mounts (ProtectHome), and private /tmp directories (stored on the host as \`/tmp/systemd-private-BOOTID-UNIT-RANDOM/tmp\`). If a path named in ReadWritePaths= does not exist, namespace setup fails and the unit exits with **226/NAMESPACE** (prefix the path with \`-\` to make it optional).

NoNewPrivileges sets the kernel's no_new_privs bit (prctl). SystemCallFilter installs a seccomp-BPF filter; a blocked syscall kills the process with SIGSYS (Result: signal) unless \`SystemCallErrorNumber=EPERM\` makes it return an error. Capabilities are dropped from the bounding set before exec. Resource directives write to the unit's cgroup files (memory.max, cpu.max, pids.max) under /sys/fs/cgroup/system.slice/UNIT/. \`systemd-analyze security\` simply evaluates the unit's effective properties against a weighted checklist — it does not test the running process.`,
          useCases: [
            'Internet-facing APIs: ProtectSystem=strict + PrivateTmp + NoNewPrivileges limit what an RCE can touch',
            'Binding to port 443 as a non-root user with AmbientCapabilities=CAP_NET_BIND_SERVICE',
            'Preventing a leaky batch job from exhausting host memory with MemoryMax= and MemoryHigh=',
            'Security baseline reviews scoring every custom unit with systemd-analyze security'
          ],
          syntax: 'systemctl edit UNIT          # add hardening in a drop-in\nsystemd-analyze security [UNIT]\nsystemctl set-property [--runtime] UNIT MemoryMax=2G CPUQuota=150%\nsystemd-cgtop\nsystemd-run -p ProtectSystem=strict -p PrivateTmp=yes --pty bash   # experiment',
          options: [
            ['NoNewPrivileges=yes', 'Block privilege gain via setuid/file caps'],
            ['ProtectSystem=strict|full|yes', 'Read-only filesystem scopes'],
            ['ReadWritePaths=', 'Writable exceptions (prefix - if optional)'],
            ['PrivateTmp=yes / ProtectHome=yes', 'Private /tmp; hide home directories'],
            ['AmbientCapabilities= / CapabilityBoundingSet=', 'Grant / limit Linux capabilities'],
            ['MemoryMax= / CPUQuota= / TasksMax=', 'cgroup v2 resource limits'],
            ['SystemCallFilter=@system-service', 'seccomp allow-list of syscalls']
          ],
          examples: [
            {
              title: 'Exposure before hardening',
              cmd: 'systemd-analyze security inventory.service --no-pager | tail -4',
              out: '✗ ProtectHome=                       Service has full access to home directories             0.2\n✗ PrivateTmp=                        Service has access to other software\'s temporary files 0.2\n✗ NoNewPrivileges=                   Service processes may acquire new privileges            0.2\n\n→ Overall exposure level for inventory.service: 9.2 UNSAFE',
              fields: [['✗ lines', 'Unset protections and their weight'], ['9.2 UNSAFE', 'Overall score: 0 (best) to 10 (no restrictions)']]
            },
            {
              title: 'Hardening drop-in',
              cmd: 'systemctl cat inventory | tail -12',
              out: '# /etc/systemd/system/inventory.service.d/hardening.conf\n[Service]\nNoNewPrivileges=yes\nPrivateTmp=yes\nPrivateDevices=yes\nProtectSystem=strict\nProtectHome=yes\nReadWritePaths=/var/lib/inventory\nProtectKernelTunables=yes\nProtectKernelModules=yes\nProtectControlGroups=yes\nRestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX',
              fields: [['ReadWritePaths', 'The only writable location for the app besides its private /tmp']]
            },
            {
              title: 'Over-hardened service',
              cmd: 'journalctl -u inventory -n 3 --no-pager',
              out: 'Oct 08 16:40:12 app01 python3[9123]: PermissionError: [Errno 30] Read-only file system: \'/var/log/inventory/access.log\'\nOct 08 16:40:12 app01 systemd[1]: inventory.service: Main process exited, code=exited, status=1/FAILURE\nOct 08 16:40:12 app01 systemd[1]: inventory.service: Failed with result \'exit-code\'.',
              fields: [['Errno 30 Read-only file system', 'ProtectSystem=strict made /var/log read-only for this service']],
              note: 'Fix with LogsDirectory=inventory (or ReadWritePaths=/var/log/inventory) — or better, log to stdout/journal.'
            }
          ],
          walkthrough: [
            'Score your custom unit: `systemd-analyze security inventory.service`.',
            'Add a drop-in `sudo systemctl edit --drop-in=hardening inventory` (or plain `systemctl edit`) with NoNewPrivileges, PrivateTmp and ProtectHome; restart and test with curl.',
            'Add ProtectSystem=strict and ReadWritePaths for the state directory; restart, test, read the journal for EROFS errors.',
            'Add kernel protections and RestrictAddressFamilies; restart and test.',
            'Re-score and compare; then add `MemoryMax=256M` and `TasksMax=64` with `systemctl set-property inventory MemoryMax=256M TasksMax=64`.',
            'Watch live usage with `systemd-cgtop` and confirm limits in `systemctl show inventory -p MemoryMax -p TasksMax`.'
          ],
          lab: {
            goal: 'Lower a custom service\'s exposure score below 5 without breaking its function, and prove the sandbox works.',
            steps: [
              'Use the inventory (python http.server) service from L08-M2-T2; record the baseline `systemd-analyze security inventory.service | tail -1`.',
              'Add hardening drop-in directives incrementally (NoNewPrivileges, PrivateTmp, PrivateDevices, ProtectSystem=strict, ProtectHome=yes, StateDirectory=inventory, kernel protections, RestrictAddressFamilies, SystemCallFilter=@system-service), restarting and running `curl -sI localhost:8080` after each group.',
              'Prove the sandbox: `sudo nsenter -t $(systemctl show -p MainPID --value inventory) -m touch /etc/test` fails with Read-only file system, while `touch /etc/test` on the host works (then delete it).',
              'Prove PrivateTmp: `sudo ls /tmp | grep systemd-private` shows the service\'s private tmp directory.',
              'Introduce a deliberate break: `ReadWritePaths=/srv/missing`; restart and read 226/NAMESPACE; fix by removing it or prefixing with `-`.',
              'Record the final score.'
            ],
            verify: 'Final `systemd-analyze security inventory.service` overall exposure < 5.0, `curl -sI localhost:8080` returns 200, and the nsenter write test fails with EROFS.'
          },
          troubleshooting: {
            scenario: 'After a security team applied a hardening drop-in to an in-house agent, it fails with status=226/NAMESPACE on 10% of hosts.',
            steps: [
              'Evidence: journal shows "Failed to set up mount namespacing: /opt/agent/cache: No such file or directory" and "Failed at step NAMESPACE".',
              'Hypothesis: ReadWritePaths=/opt/agent/cache references a directory that only exists on hosts where the agent has already run once.',
              'Fix: prefix the path with `-` (optional) or use CacheDirectory=agent / ExecStartPre-free StateDirectory= so systemd creates it; roll out the corrected drop-in.',
              'Validate: restart on an affected host, status active; `systemd-analyze security agent` score unchanged; add the path existence check to the rollout precheck.'
            ]
          },
          mistakes: [
            'Applying a full hardening profile in one step on production — when it breaks you do not know which directive caused it.',
            'Using ProtectSystem=strict without ReadWritePaths/StateDirectory for paths the service writes.',
            'Setting NoNewPrivileges on services that legitimately call setuid helpers (e.g. sending mail via sendmail/postdrop, sudo).',
            'Treating systemd hardening as a reason to disable SELinux — they are complementary layers.',
            'Setting MemoryMax too tight for a JVM, causing periodic OOM kills that look like random crashes.'
          ],
          safety: [
            'Hardening and resource changes need root and a restart; schedule them and test on staging.',
            'Rollback is quick: `systemctl revert UNIT` (removes all drop-ins) or delete the hardening .conf, daemon-reload, restart.',
            'set-property without --runtime persists in /etc/systemd/system.control/ — document it so it is not a hidden change.',
            'Verify functionality after each change, including rarely used code paths (log rotation, backups, reload).'
          ],
          distro: 'Most directives require systemd 232-247+; RHEL 9 (systemd 252) and RHEL 10 (257) support all those listed; RHEL 8 (239) lacks some (e.g. ProtectProc=, newer score items) and uses cgroup v1 by default, where MemoryMax= behaves as MemoryLimit=. `systemd-analyze security` exists since systemd 240 (not in RHEL 8).',
          challenge: {
            task: 'An nginx-like reverse proxy runs as root only because it binds port 443. Redesign the unit so it runs as user `proxy`, binds 443, cannot gain privileges, sees no home directories, can write only to /var/cache/proxy and /var/log/proxy, and is limited to 1 GiB RAM and 2 CPUs. Provide the drop-in and validation steps.',
            solution: `\`\`\`
# /etc/systemd/system/proxy.service.d/hardening.conf
[Service]
User=proxy
Group=proxy
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
CacheDirectory=proxy
LogsDirectory=proxy
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=1G
CPUQuota=200%
\`\`\`

\`\`\`
sudo systemctl daemon-reload && sudo systemctl restart proxy
ss -ltnp | grep ':443'                         # listening, owned by the proxy process
ps -o user,cmd -p $(systemctl show -p MainPID --value proxy)   # user proxy
grep Cap /proc/$(systemctl show -p MainPID --value proxy)/status
systemd-analyze security proxy.service | tail -1
\`\`\`

CacheDirectory/LogsDirectory create /var/cache/proxy and /var/log/proxy owned by proxy and writable despite ProtectSystem=strict. The capability bounding set holds only CAP_NET_BIND_SERVICE, granted as an ambient capability so a non-root process can bind <1024. If SELinux confines the proxy, make sure port 443 has the expected label (\`semanage port -l | grep 443\`).`
          },
          interview: [
            { q: 'How can a non-root service listen on port 443?', a: 'Grant CAP_NET_BIND_SERVICE with AmbientCapabilities= (and limit CapabilityBoundingSet= to it) in the unit, or use socket activation where systemd binds the port and passes the fd. Avoid running as root or setting file capabilities ad hoc.', mistake: 'Running it as root "because ports under 1024 need root".', followUp: 'What does NoNewPrivileges do to setuid helpers?' },
            { q: 'What does ProtectSystem=strict do and what usually breaks?', a: 'It mounts the entire filesystem read-only for the service except API filesystems and paths allowed via ReadWritePaths= or the *Directory= settings. Services that write logs, caches, PID files or state to non-allowed paths fail with EROFS ("Read-only file system").', mistake: 'Saying it only protects /usr.', followUp: 'What exit status appears if a ReadWritePaths path does not exist?' },
            { q: 'How do you measure and improve a unit\'s sandboxing?', a: 'Run systemd-analyze security UNIT to see each missing protection and an overall exposure score; add directives in a drop-in in small groups, restart and functionally test after each, and re-score.', mistake: 'Copying a hardening template to production without testing.', followUp: 'Does systemd-analyze security test the running process?' }
          ],
          revision: [
            'Start with NoNewPrivileges, PrivateTmp, ProtectSystem, ProtectHome; add ReadWritePaths/StateDirectory for writes.',
            'Capabilities instead of root: AmbientCapabilities=CAP_NET_BIND_SERVICE.',
            '226/NAMESPACE = sandbox setup failed (often a missing path).',
            'MemoryMax/CPUQuota/TasksMax via unit or systemctl set-property.',
            'systemd-analyze security scores exposure 0-10; harden incrementally; complements SELinux.'
          ]
        }
      ]
    }
  ]
};
