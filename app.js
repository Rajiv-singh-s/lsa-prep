// Interactive Controller: Modules, Multi-View, 20-MCQ Exam Engine, Incident Drills, Projects, and Responsive Terminal Lab
document.addEventListener('DOMContentLoaded', () => {
  let currentModuleIndex = 0;
  let activeFilter = 'all';
  const completedModules = JSON.parse(localStorage.getItem('linux_completed_modules') || '[]');

  // Quiz state
  let quizAnswers = JSON.parse(localStorage.getItem('linux_quiz_answers') || '{}');
  let currentScenarioIndex = 0;
  let scenarioPhase = 0;

  // DOM Elements
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

  // Mobile Drawer
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const closeDrawer = document.getElementById('close-drawer');

  // View Switcher
  const viewBtns = document.querySelectorAll('.view-btn');
  const appViews = document.querySelectorAll('.app-view');

  // Terminal Simulator
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');
  const btnClearTerm = document.getElementById('clear-term');
  const btnSendCmd = document.getElementById('btn-send-cmd');

  // Rich mock terminal responses
  const mockCommandResponses = {
    "uptime": " 10:55:12 up 45 days, 18:22,  2 users,  load average: 0.32, 0.48, 0.55",
    "top": `top - 10:55:14 up 45 days, 18:22,  2 users,  load average: 0.32, 0.48, 0.55
Tasks: 218 total,   1 running, 217 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.5 us,  0.7 sy,  0.0 ni, 97.4 id,  0.3 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :  16048.0 total,   4120.5 free,   8210.2 used,   3717.3 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.   7318.1 avail Mem 

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1248 root      20   0 1450284 185320  42100 S   2.1   1.1  14:32.18 dockerd
 2840 apache    20   0  482912  64200  18200 S   1.0   0.4   4:10.55 httpd
  890 root      20   0  210480  28400  12500 S   0.3   0.2   1:20.12 systemd-journald`,
    "free -m": `               total        used        free      shared  buff/cache   available
Mem:           16048        8210        4120         385        3717        7318
Swap:           4096           0        4096`,
    "free -m -h": `               total        used        free      shared  buff/cache   available
Mem:            15Gi       8.0Gi       4.0Gi       385Mi       3.6Gi       7.1Gi
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
    "ss -tulnp": `Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process                                     
tcp    LISTEN  0       128            0.0.0.0:22          0.0.0.0:*      users:(("sshd",pid=1024,fd=3))              
tcp    LISTEN  0       511            0.0.0.0:80          0.0.0.0:*      users:(("httpd",pid=2840,fd=4))             
tcp    LISTEN  0       511            0.0.0.0:443         0.0.0.0:*      users:(("httpd",pid=2840,fd=5))             
tcp    LISTEN  0       128               [::]:22             [::]:*      users:(("sshd",pid=1024,fd=4))`,
    "netstat -tulnp": `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1024/sshd           
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      2840/httpd          
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      2840/httpd`,
    "systemctl status httpd.service": `● httpd.service - The Apache HTTP Server
   Loaded: loaded (/usr/lib/systemd/system/httpd.service; enabled; vendor preset: disabled)
   Active: active (running) since Wed 2026-09-02 04:12:10 UTC; 37 days ago
 Main PID: 2840 (httpd)
   Tasks: 213 (limit: 4915)
   Memory: 62.4M
   CGroup: /system.slice/httpd.service`,
    "sestatus": `SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
SELinux root directory:         /etc/selinux
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing
Policy MLS status:              enabled`,
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
    inet 10.10.40.15/24 brd 10.10.40.255 scope global dynamic noprefixroute ens192`,
    "ip route show": `default via 10.10.40.1 dev ens192 proto static metric 100 
10.10.40.0/24 dev ens192 proto kernel scope link src 10.10.40.15 metric 100`,
    "uname -r": "4.18.0-477.10.1.el8_8.x86_64",
    "cat /etc/redhat-release": "Red Hat Enterprise Linux release 8.8 (Ootpa)",
    "help": `Available simulation commands:
uptime, top, free -m, free -m -h, df -h, df -Th, df -i, ss -tulnp, netstat -tulnp,
systemctl status httpd.service, sestatus, pvs && vgs && lvs, ip addr show, ip route show,
uname -r, cat /etc/redhat-release, clear, ping <host>, ls, chmod, chown`
  };

  // Mobile Drawer Toggle
  function openMobileDrawer() {
    sidebar.classList.add('open');
    drawerBackdrop.classList.add('active');
  }

  function closeMobileDrawer() {
    sidebar.classList.remove('open');
    drawerBackdrop.classList.remove('active');
  }

  if (menuToggle) menuToggle.addEventListener('click', openMobileDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeMobileDrawer);
  if (closeDrawer) closeDrawer.addEventListener('click', closeMobileDrawer);

  // View Switcher Logic
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      appViews.forEach(v => v.classList.remove('active-view'));

      btn.classList.add('active');
      const targetView = btn.getAttribute('data-view');
      const targetSection = document.getElementById(`view-${targetView}-section`);
      if (targetSection) {
        targetSection.classList.add('active-view');
      }

      if (targetView === 'quiz') renderQuiz();
      if (targetView === 'simulator') renderScenarioSimulator();
      if (targetView === 'projects') renderProjects();
    });
  });

  // Render Sidebar
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
          <span>${mod.level}</span>
        </div>
      `;

      itemCard.addEventListener('click', () => {
        currentModuleIndex = realIndex;
        // switch view to modules
        document.querySelector('.view-btn[data-view="modules"]').click();
        renderActiveModule();
        renderSidebar();
        closeMobileDrawer();
      });

      sidebarNav.appendChild(itemCard);
    });

    updateProgress();
  }

  function updateProgress() {
    const total = linuxCurriculum.length;
    const completedCount = completedModules.length;
    const pct = Math.round((completedCount / total) * 100);
    progressPercent.innerText = `${pct}%`;
    progressFill.style.width = `${pct}%`;
  }

  // Render Active Module
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
            <div style="background: var(--bg-primary); padding: 16px 18px; border-radius: 8px; border: 1px solid var(--border-color);">
              <h4 style="color: var(--accent-blue); margin-bottom: 6px;"><i class="fa-solid fa-angles-right"></i> ${kc.title}</h4>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">${kc.text.replace(/\n/g, '<br/>')}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-terminal"></i> Critical Commands (Click to Test in Lab)</h2>
        <p>Click on any command chip below to run it in the live simulator terminal.</p>
        <div class="cmd-table-container">
          <table class="cmd-table">
            <thead>
              <tr>
                <th style="width: 48%;">Command</th>
                <th>Diagnostic Purpose</th>
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
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i> Production Incident Walkthrough (P1/P2)</h2>
        <div class="scenario-card">
          <div class="scenario-title">
            <i class="fa-solid fa-fire"></i> ${mod.realWorldScenario.title}
          </div>
          <p style="color: #cbd5e1; font-size: 0.88rem; margin-bottom: 12px;"><strong>Problem Statement:</strong> ${mod.realWorldScenario.problem}</p>
          <div style="background: var(--bg-secondary); padding: 14px; border-radius: 6px; border: 1px solid var(--border-color);">
            <strong style="color: #38bdf8; font-size: 0.85rem; display: block; margin-bottom: 8px;">Investigation & Resolution SOP:</strong>
            <ol style="margin-left: 20px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.7;">
              ${mod.realWorldScenario.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <div class="section-block">
        <h2><i class="fa-solid fa-comments"></i> Technical Interview Q&A (L2/L3 Technical Rounds)</h2>
        <p>Key technical questions asked by enterprise recruiters and systems architects:</p>
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
            <span>Matched Keyword</span>
          </div>
        `;
        itemCard.addEventListener('click', () => {
          currentModuleIndex = idx;
          document.querySelector('.view-btn[data-view="modules"]').click();
          renderActiveModule();
          renderSidebar();
          closeMobileDrawer();
        });
        sidebarNav.appendChild(itemCard);
      }
    });
  });

  // Copy Cheatsheet
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

  // 20-QUESTION MCQ EXAM ENGINE WITH ENTERPRISE MARKING SCHEME (+2, -0.5)
  function renderQuiz() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    quizData.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'mcq-card';
      const userSelected = quizAnswers[item.id];
      const isAnswered = userSelected !== undefined;

      let optionsHtml = item.options.map((opt, optIdx) => {
        let btnClass = 'mcq-opt-btn';
        if (isAnswered) {
          if (optIdx === item.answer) btnClass += ' correct';
          else if (userSelected === optIdx) btnClass += ' wrong';
        }
        return `
          <button class="${btnClass}" ${isAnswered ? 'disabled' : ''} data-qid="${item.id}" data-opt="${optIdx}">
            <span>${String.fromCharCode(65 + optIdx)}.</span> <span>${opt}</span>
          </button>
        `;
      }).join('');

      card.innerHTML = `
        <div class="mcq-header">
          <span><strong>Question ${index + 1} of 20</strong></span>
          <span>Marking: +2 / -0.5</span>
        </div>
        <div class="mcq-question">${item.q}</div>
        <div class="mcq-options">${optionsHtml}</div>
        <div class="mcq-explanation" style="${isAnswered ? 'display:block;' : ''}">
          <strong style="color: ${userSelected === item.answer ? '#10b981' : '#f43f5e'}; display:block; margin-bottom: 4px;">
            ${userSelected === item.answer ? '✓ Correct (+2.0)' : (isAnswered ? '✗ Incorrect (-0.5)' : '')}
          </strong>
          ${item.explanation}
        </div>
      `;

      container.appendChild(card);
    });

    // Attach click events on option buttons
    container.querySelectorAll('.mcq-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = parseInt(btn.getAttribute('data-qid'));
        const opt = parseInt(btn.getAttribute('data-opt'));
        quizAnswers[qid] = opt;
        localStorage.setItem('linux_quiz_answers', JSON.stringify(quizAnswers));
        renderQuiz();
        calculateScore();
      });
    });

    calculateScore();
  }

  function calculateScore() {
    let score = 0;
    let correctCount = 0;
    const answeredCount = Object.keys(quizAnswers).length;

    quizData.forEach(item => {
      if (quizAnswers[item.id] !== undefined) {
        if (quizAnswers[item.id] === item.answer) {
          score += 2.0;
          correctCount++;
        } else {
          score -= 0.5;
        }
      }
    });

    document.getElementById('quiz-total-score').innerText = `${score.toFixed(1)} / 40`;
    document.getElementById('quiz-answered-count').innerText = `${answeredCount} / 20`;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    document.getElementById('quiz-accuracy').innerText = `${accuracy}%`;
  }

  document.getElementById('btn-reset-quiz').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset the exam and re-attempt all questions?")) {
      quizAnswers = {};
      localStorage.removeItem('linux_quiz_answers');
      renderQuiz();
    }
  });

  // PRODUCTION INCIDENT SIMULATOR LAB
  function renderScenarioSimulator() {
    const selector = document.getElementById('sim-scenario-selector');
    const box = document.getElementById('scenario-interactive-box');
    selector.innerHTML = '';

    scenarioDrills.forEach((s, idx) => {
      const btn = document.createElement('button');
      btn.className = `sim-select-btn ${idx === currentScenarioIndex ? 'active' : ''}`;
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${s.title}`;
      btn.addEventListener('click', () => {
        currentScenarioIndex = idx;
        scenarioPhase = 0;
        renderScenarioSimulator();
      });
      selector.appendChild(btn);
    });

    const activeScenario = scenarioDrills[currentScenarioIndex];
    const phaseObj = activeScenario.phases[scenarioPhase];

    let contentHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: #f87171; margin: 0;"><i class="fa-solid fa-fire"></i> ${activeScenario.title}</h3>
        <span style="background: rgba(244,63,94,0.15); color: #fb7185; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${activeScenario.severity}</span>
      </div>
      <p style="color: #cbd5e1; font-size: 0.9rem; background: var(--bg-primary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
        <strong>Monitoring Alert:</strong> ${activeScenario.alert}
      </p>
    `;

    if (scenarioPhase >= activeScenario.phases.length) {
      contentHtml += `
        <div style="background: rgba(16,185,129,0.15); border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 16px; text-align: center;">
          <h3 style="color: #34d399; margin-bottom: 8px;"><i class="fa-solid fa-circle-check"></i> Outage Resolved & SLA Preserved!</h3>
          <p style="color: #e2e8f0; font-size: 0.9rem;">You correctly investigated the issue without causing secondary failures. Full RCA is filed.</p>
          <button id="btn-restart-scenario" style="margin-top: 12px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Restart Incident Drill</button>
        </div>
      `;
    } else {
      contentHtml += `
        <div class="sim-phase-card">
          <h4 style="color: var(--accent-blue); margin-bottom: 10px;">${phaseObj.question}</h4>
          <div class="sim-choices-grid">
            ${phaseObj.options.map((opt, i) => `
              <button class="sim-choice-btn" data-opt-idx="${i}">
                <i class="fa-solid fa-terminal"></i> ${opt.text}
              </button>
            `).join('')}
          </div>
          <div id="sim-feedback-box" style="display: none; margin-top: 14px; padding: 12px; border-radius: 6px; font-size: 0.85rem;"></div>
        </div>
      `;
    }

    box.innerHTML = contentHtml;

    const restartBtn = document.getElementById('btn-restart-scenario');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        scenarioPhase = 0;
        renderScenarioSimulator();
      });
    }

    box.querySelectorAll('.sim-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = parseInt(btn.getAttribute('data-opt-idx'));
        const chosen = phaseObj.options[optIdx];
        const feedbackBox = document.getElementById('sim-feedback-box');
        feedbackBox.style.display = 'block';

        if (chosen.nextPhase > scenarioPhase) {
          feedbackBox.style.background = 'rgba(16, 185, 129, 0.15)';
          feedbackBox.style.border = '1px solid #10b981';
          feedbackBox.style.color = '#34d399';
          feedbackBox.innerHTML = `<strong>✓ Action Successful:</strong> ${chosen.feedback}`;
          setTimeout(() => {
            scenarioPhase = chosen.nextPhase;
            renderScenarioSimulator();
          }, 1400);
        } else {
          feedbackBox.style.background = 'rgba(244, 63, 94, 0.15)';
          feedbackBox.style.border = '1px solid #f43f5e';
          feedbackBox.style.color = '#fb7185';
          feedbackBox.innerHTML = `<strong>✗ Command Failed:</strong> ${chosen.feedback}`;
        }
      });
    });
  }

  // ENTERPRISE PROJECTS VIEW
  function renderProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = enterpriseProjects.map(p => `
      <div class="proj-card">
        <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--accent-blue);">${p.level}</span>
        <h3 class="proj-title">${p.title}</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">${p.summary}</p>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
          ${p.tags.map(t => `<span style="background: var(--bg-primary); border: 1px solid var(--border-color); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; color: var(--accent-emerald);">${t}</span>`).join('')}
        </div>
        <strong style="font-size: 0.82rem; color: var(--text-main);">Enterprise Architecture & Deliverables:</strong>
        <ul class="proj-deliverables">
          ${p.deliverables.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  // TERMINAL ENGINE
  function executeTerminalCommand(inputVal) {
    const cmd = inputVal.trim();
    if (!cmd) return;

    const cmdEcho = document.createElement('div');
    cmdEcho.className = 'term-line cmd-echo';
    cmdEcho.innerText = `[root@prod-rhel8 ~]# ${cmd}`;
    termOutput.appendChild(cmdEcho);

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
        output = `Executed '${cmd}' on prod-rhel8. [Return Code: 0 (OK)]\n(Simulation environment: command validated for enterprise RHEL standard). Type 'help' for examples.`;
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

  if (btnSendCmd) {
    btnSendCmd.addEventListener('click', () => {
      const val = termInput.value;
      executeTerminalCommand(val);
      termInput.value = '';
    });
  }

  btnClearTerm.addEventListener('click', () => {
    termOutput.innerHTML = '<div class="term-line output-text">Terminal cleared. Type commands below or click command chips. Type "help" for options.</div>';
  });

  // Init
  renderSidebar();
  renderActiveModule();
});
