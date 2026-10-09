// Interactive App Engine for Linux Training Platform
document.addEventListener('DOMContentLoaded', () => {
  let currentModuleIndex = 0;
  let activeFilter = 'all';
  const completedModules = JSON.parse(localStorage.getItem('linux_completed_modules') || '[]');

  const sidebarNav = document.getElementById('sidebar-nav');
  const moduleContent = document.getElementById('module-content');
  const bcCategory = document.getElementById('bc-category');
  const bcTitle = document.getElementById('bc-title');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const btnMarkComplete = document.getElementById('btn-mark-complete');
  const searchInput = document.getElementById('module-search');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const themeToggle = document.getElementById('theme-toggle');

  // Terminal elements
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');
  const btnClearTerm = document.getElementById('clear-term');

  // Realistic mock responses for the built-in terminal simulator
  const mockCommandResponses = {
    "uptime": " 10:45:12 up 42 days, 14:18,  2 users,  load average: 0.28, 0.45, 0.52",
    "top": `top - 10:45:14 up 42 days, 14:18,  2 users,  load average: 0.28, 0.45, 0.52
Tasks: 215 total,   1 running, 214 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.2 us,  0.8 sy,  0.0 ni, 97.5 id,  0.4 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :  16048.0 total,   4210.5 free,   8120.2 used,   3717.3 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.   7428.1 avail Mem 

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1248 root      20   0 1450284 185320  42100 S   2.3   1.1  14:32.18 dockerd
 2840 apache    20   0  482912  64200  18200 S   1.0   0.4   4:10.55 httpd
  890 root      20   0  210480  28400  12500 S   0.3   0.2   1:20.12 systemd-journald`,
    "free -m": `               total        used        free      shared  buff/cache   available
Mem:           16048        8120        4210         385        3717        7428
Swap:           4096           0        4096`,
    "free -m -h": `               total        used        free      shared  buff/cache   available
Mem:            15Gi       7.9Gi       4.1Gi       385Mi       3.6Gi       7.2Gi
Swap:          4.0Gi          0B       4.0Gi`,
    "df -h": `Filesystem             Size  Used Avail Use% Mounted on
devtmpfs               7.8G     0  7.8G   0% /dev
tmpfs                  7.9G     0  7.9G   0% /dev/shm
/dev/mapper/rhel-root   50G   22G   29G  44% /
/dev/sda1             1014M  280M  735M  28% /boot
/dev/mapper/rhel-var    30G  9.8G   21G  33% /var
/dev/mapper/rhel-home   20G  1.2G   19G   6% /home`,
    "df -Th": `Filesystem             Type      Size  Used Avail Use% Mounted on
devtmpfs               devtmpfs  7.8G     0  7.8G   0% /dev
/dev/mapper/rhel-root   xfs        50G   22G   29G  44% /
/dev/sda1              xfs       1014M  280M  735M  28% /boot
/dev/mapper/rhel-var   xfs        30G  9.8G   21G  33% /var`,
    "df -i": `Filesystem             Inodes  IUsed   IFree IUse% Mounted on
/dev/mapper/rhel-root 3276800 241080 3035720    8% /
/dev/sda1              524288    340  523948    1% /boot
/dev/mapper/rhel-var  1966080 185400 1780680   10% /var`,
    "netstat -tulnp": `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1024/sshd           
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      2840/httpd          
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      2840/httpd          
tcp6       0      0 :::22                   :::*                    LISTEN      1024/sshd`,
    "ss -tulnp": `Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process                                     
tcp    LISTEN  0       128            0.0.0.0:22          0.0.0.0:*      users:(("sshd",pid=1024,fd=3))              
tcp    LISTEN  0       511            0.0.0.0:80          0.0.0.0:*      users:(("httpd",pid=2840,fd=4))             
tcp    LISTEN  0       511            0.0.0.0:443         0.0.0.0:*      users:(("httpd",pid=2840,fd=5))             
tcp    LISTEN  0       128               [::]:22             [::]:*      users:(("sshd",pid=1024,fd=4))`,
    "systemctl status httpd": `● httpd.service - The Apache HTTP Server
   Loaded: loaded (/usr/lib/systemd/system/httpd.service; enabled; vendor preset: disabled)
   Active: active (running) since Wed 2026-09-02 04:12:10 UTC; 37 days ago
     Docs: man:httpd.service(8)
 Main PID: 2840 (httpd)
   Status: "Total requests: 1840212; Idle/Busy workers 100/0; CPU-usage: 0.12%"
    Tasks: 213 (limit: 4915)
   Memory: 62.4M
   CGroup: /system.slice/httpd.service
           ├─2840 /usr/sbin/httpd -DFOREGROUND
           ├─2842 /usr/sbin/httpd -DFOREGROUND
           └─2843 /usr/sbin/httpd -DFOREGROUND

Sep 02 04:12:10 prod-rhel8 systemd[1]: Starting The Apache HTTP Server...
Sep 02 04:12:11 prod-rhel8 systemd[1]: Started The Apache HTTP Server.`,
    "systemctl status httpd.service": `● httpd.service - The Apache HTTP Server
   Loaded: loaded (/usr/lib/systemd/system/httpd.service; enabled; vendor preset: disabled)
   Active: active (running) since Wed 2026-09-02 04:12:10 UTC; 37 days ago
   Main PID: 2840 (httpd)
   Memory: 62.4M`,
    "dmesg | tail": `[3648120.124500] e1000e 0000:00:19.0 eth0: NIC Link is Up 1000 Mbps Full Duplex
[3652190.412891] EXT4-fs (sda1): re-mounted. Opts: errors=remount-ro
[3658200.109281] systemd[1]: Started Session 1480 of user root.
[3659400.912401] XFS (dm-0): Mounting V5 Filesystem
[3659400.981023] XFS (dm-0): Ending clean mount
[3660100.120300] SELinux: initialized (dev dm-0, type xfs), uses xattr`,
    "sestatus": `SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
SELinux root directory:         /etc/selinux
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing
Policy MLS status:              enabled
Policy deny_unknown status:     allowed
Memory protection checking:     actual (secure)
Max kernel policy version:      33`,
    "pvs && vgs && lvs": `  PV         VG        Fmt  Attr PSize    PFree 
  /dev/sda2  rhel_vg   lvm2 a--  <99.00g <10.00g
  VG        #PV #LV #SN Attr   VSize    VFree  
  rhel_vg     1   3   0 wz--n- <99.00g <10.00g
  LV   VG      Attr       LSize   Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
  home rhel_vg -wi-ao----  20.00g                                                    
  root rhel_vg -wi-ao----  50.00g                                                    
  var  rhel_vg -wi-ao----  19.00g`,
    "ip addr show": `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
2: ens192: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    inet 10.10.40.15/24 brd 10.10.40.255 scope global dynamic noprefixroute ens192
       valid_lft 68240sec preferred_lft 68240sec`,
    "ip route show": `default via 10.10.40.1 dev ens192 proto static metric 100 
10.10.40.0/24 dev ens192 proto kernel scope link src 10.10.40.15 metric 100`,
    "whoami": "root",
    "hostname": "prod-rhel8.enterprise.internal",
    "uname -a": "Linux prod-rhel8.enterprise.internal 4.18.0-477.10.1.el8_8.x86_64 #1 SMP x86_64 GNU/Linux",
    "cat /etc/redhat-release": "Red Hat Enterprise Linux release 8.8 (Ootpa)"
  };

  // Render Sidebar Navigation
  function renderSidebar() {
    sidebarNav.innerHTML = '';
    const filteredModules = linuxCurriculum.filter(m => {
      if (activeFilter === 'all') return true;
      return m.category === activeFilter;
    });

    filteredModules.forEach((mod) => {
      const realIndex = linuxCurriculum.findIndex(item => item.id === mod.id);
      const isCompleted = completedModules.includes(mod.id);
      const isActive = realIndex === currentModuleIndex;

      const itemCard = document.createElement('div');
      itemCard.className = `nav-item-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      itemCard.innerHTML = `
        <i class="${mod.icon} nav-item-icon"></i>
        <div class="nav-item-info">
          <strong>${mod.title}</strong>
          <span>${mod.level} • ${mod.categoryLabel}</span>
        </div>
      `;

      itemCard.addEventListener('click', () => {
        currentModuleIndex = realIndex;
        renderActiveModule();
        renderSidebar();
      });

      sidebarNav.appendChild(itemCard);
    });

    updateProgress();
  }

  // Update progress bar
  function updateProgress() {
    const total = linuxCurriculum.length;
    const completedCount = completedModules.length;
    const pct = Math.round((completedCount / total) * 100);
    progressPercent.innerText = `${pct}%`;
    progressFill.style.width = `${pct}%`;
  }

  // Render the Selected Module
  function renderActiveModule() {
    const mod = linuxCurriculum[currentModuleIndex];
    if (!mod) return;

    bcCategory.innerText = mod.categoryLabel;
    bcTitle.innerText = mod.title;

    const isCompleted = completedModules.includes(mod.id);
    btnMarkComplete.innerHTML = isCompleted
      ? `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Completed`
      : `<i class="fa-regular fa-circle-check"></i> Mark as Completed`;

    let html = `
      <div class="module-title-box">
        <span class="module-level-tag tag-${mod.category}">${mod.level}</span>
        <h1>${mod.title}</h1>
        <p class="lead">${mod.lead}</p>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-book-open"></i> Enterprise Core Concepts</h2>
        <p>${mod.description}</p>
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px;">
          ${mod.keyConcepts.map(kc => `
            <div style="background: var(--bg-primary); padding: 14px 18px; border-radius: 8px; border: 1px solid var(--border-color);">
              <h4 style="color: var(--accent-blue); margin-bottom: 6px;"><i class="fa-solid fa-angles-right"></i> ${kc.title}</h4>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">${kc.text.replace(/\n/g, '<br/>')}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-terminal"></i> Critical Commands Cheatsheet (Click to Test in Lab)</h2>
        <p>Click on any command chip below to instantly send it to the live simulator terminal at the bottom.</p>
        <table class="cmd-table">
          <thead>
            <tr>
              <th style="width: 48%;">Command</th>
              <th>Production Diagnostic Purpose</th>
            </tr>
          </thead>
          <tbody>
            ${mod.commands.map(c => `
              <tr>
                <td><span class="code-chip" data-cmd="${c.cmd}"><i class="fa-solid fa-play"></i> <code>${c.cmd}</code></span></td>
                <td>${c.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i> Production Incident Walkthrough (P1/P2)</h2>
        <div class="scenario-card">
          <div class="scenario-title">
            <i class="fa-solid fa-fire"></i> ${mod.realWorldScenario.title}
          </div>
          <p style="color: #cbd5e1; font-size: 0.88rem; margin-bottom: 12px;"><strong>Problem Statement:</strong> ${mod.realWorldScenario.problem}</p>
          <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: #38bdf8; font-size: 0.85rem; display: block; margin-bottom: 6px;">Investigation & Resolution SOP:</strong>
            <ol style="margin-left: 20px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.7;">
              ${mod.realWorldScenario.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-comments"></i> Technical Interview Q&A (L2/L3 Technical Rounds)</h2>
        <p>Key questions asked by enterprise recruiters and systems architects:</p>
        ${mod.interviewQuestions.map((qa, i) => `
          <div class="qa-card">
            <div class="qa-question" onclick="this.nextElementSibling.classList.toggle('open')">
              <span><strong>Q${i+1}:</strong> ${qa.q}</span>
              <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
            </div>
            <div class="qa-answer">
              <strong style="color: #10b981; display: block; margin-bottom: 4px;">Recommended Answer:</strong>
              ${qa.a.replace(/\n/g, '<br/>')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    moduleContent.innerHTML = html;

    // Attach click listeners on code chips
    document.querySelectorAll('.code-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        executeTerminalCommand(cmd);
      });
    });
  }

  // Handle Mark Complete Button
  btnMarkComplete.addEventListener('click', () => {
    const mod = linuxCurriculum[currentModuleIndex];
    const index = completedModules.indexOf(mod.id);
    if (index > -1) {
      completedModules.splice(index, 1);
    } else {
      completedModules.push(mod.id);
    }
    localStorage.setItem('linux_completed_modules', JSON.stringify(completedModules));
    renderActiveModule();
    renderSidebar();
  });

  // Filter Tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.getAttribute('data-filter');
      renderSidebar();
    });
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      renderSidebar();
      return;
    }
    sidebarNav.innerHTML = '';
    linuxCurriculum.forEach((mod, idx) => {
      const match = mod.title.toLowerCase().includes(val) ||
                    mod.description.toLowerCase().includes(val) ||
                    mod.commands.some(c => c.cmd.toLowerCase().includes(val) || c.desc.toLowerCase().includes(val));
      if (match) {
        const isCompleted = completedModules.includes(mod.id);
        const itemCard = document.createElement('div');
        itemCard.className = `nav-item-card ${isCompleted ? 'completed' : ''}`;
        itemCard.innerHTML = `
          <i class="${mod.icon} nav-item-icon"></i>
          <div class="nav-item-info">
            <strong>${mod.title}</strong>
            <span>Found in search</span>
          </div>
        `;
        itemCard.addEventListener('click', () => {
          currentModuleIndex = idx;
          renderActiveModule();
          renderSidebar();
        });
        sidebarNav.appendChild(itemCard);
      }
    });
  });

  // Copy all commands in module
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const mod = linuxCurriculum[currentModuleIndex];
    const text = mod.commands.map(c => `# ${c.desc}\n${c.cmd}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied ${mod.commands.length} commands to clipboard!`);
    });
  });

  // Theme Toggle
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? `<i class="fa-solid fa-sun"></i>` : `<i class="fa-solid fa-moon"></i>`;
  });

  // Interactive Terminal Logic
  function executeTerminalCommand(inputVal) {
    const cmd = inputVal.trim();
    if (!cmd) return;

    // Append Command Echo
    const cmdEcho = document.createElement('div');
    cmdEcho.className = 'term-line cmd-echo';
    cmdEcho.innerText = `[root@prod-rhel8 ~]# ${cmd}`;
    termOutput.appendChild(cmdEcho);

    // Look up mock response or generate realistic fallback
    const resLine = document.createElement('div');
    resLine.className = 'term-line output-text';

    const normalizedCmd = cmd.toLowerCase();

    if (normalizedCmd === 'clear') {
      termOutput.innerHTML = '';
      termOutput.scrollTop = 0;
      return;
    }

    let output = mockCommandResponses[cmd] || mockCommandResponses[cmd.split(' ')[0]];

    if (!output) {
      if (normalizedCmd.startsWith('chmod') || normalizedCmd.startsWith('chown') || normalizedCmd.startsWith('setenforce') || normalizedCmd.startsWith('setsebool')) {
        output = `Command executed successfully. Permissions / context updated.`;
        resLine.className = 'term-line output-success';
      } else if (normalizedCmd.startsWith('ping')) {
        output = `PING (10.10.40.1) 56(84) bytes of data.\n64 bytes from 10.10.40.1: icmp_seq=1 ttl=64 time=0.342 ms\n64 bytes from 10.10.40.1: icmp_seq=2 ttl=64 time=0.288 ms\n--- 10.10.40.1 ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
      } else if (normalizedCmd.startsWith('ls')) {
        output = `total 36\ndrwxr-xr-x. 4 root root 4096 Oct  9 10:30 .\ndr-xr-xr-x. 18 root root 4096 Sep  2 04:10 ..\n-rw-r--r--. 1 root root  280 Oct  9 10:25 application.conf\n-rwxr-xr-x. 1 root root 8412 Oct  9 10:28 start_service.sh\ndrwxr-xr-x. 2 root root 4096 Oct  9 10:29 logs`;
      } else {
        output = `Executed '${cmd}' on prod-rhel8. [Return Code: 0 (OK)]\n(Simulation environment: command validated for enterprise RHEL standard).`;
      }
    }

    resLine.innerText = output;
    termOutput.appendChild(resLine);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = termInput.value;
      executeTerminalCommand(val);
      termInput.value = '';
    }
  });

  btnClearTerm.addEventListener('click', () => {
    termOutput.innerHTML = '<div class="term-line output-text">Terminal cleared. Type commands below.</div>';
  });

  // Initial Load
  renderSidebar();
  renderActiveModule();
});
