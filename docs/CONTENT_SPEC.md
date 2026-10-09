# Content authoring specification (curriculum + MCQ bank)

The app is a buildless ES-module static site. Content is plain JS data. Validation:
`node scripts/validate-content.mjs --level NN` (must report **0 errors** for your level; fix warnings where reasonable).

## Structure rules (mandatory)

- Every level has **exactly 5 modules**, each with **exactly 2 lessons** (10 lessons per level).
- IDs: level `L07`, modules `L07-M1`..`L07-M5`, lessons `L07-M1-T1`, `L07-M1-T2`, ... `L07-M5-T2`.
  Because the structure is fixed, you may reference lessons in *other* levels by ID in `prereqs`
  (e.g. `L02-M3-T1`) — only reference lessons in the same or earlier levels.
- A lesson **is** a topic. Questions are keyed by lesson ID.
- Each lesson gets **exactly 10 MCQs** → 20 per module, 100 per level.

## File 1: `src/data/levels/level-NN.js`

```js
export default {
  id: 'L07', number: 7,
  title: 'Boot Process and System Initialization',
  summary: 'One or two sentences.',
  prerequisites: ['L06'],            // level IDs
  outcomes: ['...', '...', '...'],    // 3-6 level outcomes
  modules: [
    {
      id: 'L07-M1', title: '...', summary: '...',
      lessons: [ /* two lesson objects */ ]
    }
    // ... 5 modules
  ]
};
```

### Lesson object (all fields required unless marked optional)

```js
{
  id: 'L07-M1-T1',
  title: 'Firmware, GRUB2 and the kernel hand-off',
  minutes: 35,                              // realistic study time
  objectives: ['Explain ...', 'Use ...', 'Diagnose ...'],        // 3-5
  prereqs: ['L03-M1-T1'],                   // lesson IDs ([] allowed)
  concept: `Markdown. First-principles explanation. 250-500 words. Define terms before using them.`,
  internals: `Markdown. What happens inside (kernel, files, daemons, data structures). 100-250 words.`,
  useCases: ['Enterprise use case 1', 'use case 2', 'use case 3'],
  syntax: 'grub2-editenv list\ngrubby --info=ALL',   // command synopsis (plain text, newline-separated). '' allowed for non-command lessons
  options: [['--info=ALL', 'Show all boot entries'], ['-u', '...']],   // common options/flags (4-8). [] allowed for conceptual lessons
  examples: [                               // 2-3 realistic examples
    {
      title: 'Show the default boot entry',
      cmd: 'grubby --default-kernel',
      out: '/boot/vmlinuz-5.14.0-427.13.1.el9_4.x86_64',   // representative output (it is labelled as representative in the UI)
      fields: [['/boot/vmlinuz-...', 'Path of the kernel image GRUB boots by default']],   // field-by-field explanation
      note: 'Optional extra interpretation tip.'
    }
  ],
  walkthrough: ['Step 1 markdown', 'Step 2 ...'],     // guided practical walkthrough, 4-7 steps
  lab: {                                    // hands-on lab for a REAL Linux VM (RHEL 9/10, Rocky, Alma)
    goal: 'What the learner will achieve',
    steps: ['...', '...', '...', '...'],    // 4-7 concrete steps with commands
    verify: 'How to prove success (commands + expected result)'
  },
  troubleshooting: { scenario: 'Realistic failure', steps: ['Evidence step', 'Hypothesis', 'Fix', 'Validate'] },
  mistakes: ['Common mistake + why it hurts', '...', '...'],        // 3-5
  safety: ['Root needed? destructive? backup/rollback/precheck', '...'],   // 2-4
  distro: 'Optional markdown: RHEL vs Debian/Ubuntu differences, version notes (RHEL 8/9/10), deprecations.',
  challenge: { task: 'Practical challenge (markdown)', solution: 'Complete solution WITH reasoning (markdown, include commands)' },
  interview: [                              // 3-4
    { q: 'Question', a: 'Model answer', mistake: 'Common weak answer', followUp: 'Likely follow-up question' }
  ],
  revision: ['Crisp revision bullet', '...', '...', '...']        // 4-6
}
```

Markdown supported in string fields: paragraphs (blank line), `- ` bullet lists, `1. ` numbered lists,
fenced ``` code blocks, `### heading`, `> callout`, inline `code`, **bold**, *italic*.
Escape backticks inside JS template literals (`\``) — or use single-quoted strings with `\n`.

## File 2: `src/data/questions/level-NN.js`

```js
export default {
  'L07-M1-T1': [
    {
      d: 'b',                 // difficulty: 'b' beginner | 'i' intermediate | 'a' advanced
      t: 'output',            // type, one of: concept, command, output, log, config, troubleshoot, rca, remediation, security, distro
      q: 'Question text. For output/log questions embed the output inline, e.g. "Given: `Active: failed (Result: exit-code)` ..." (use \\n for line breaks; it renders as text).',
      o: ['Option A', 'Option B', 'Option C', 'Option D'],
      a: [1],                 // correct option index(es). One index = single answer. 2+ indexes = multi-select ("Select all that apply" must be in q)
      e: 'Why the correct answer is correct (1-3 sentences, technically precise).',
      w: ['Why A is wrong', '', 'Why C is wrong', 'Why D is wrong'],  // aligned with o; '' for correct options; non-empty for every wrong option
      c: 'grubby',            // relevant command or concept
      s: 'Identify the default kernel',   // skill tested
      env: 'RHEL 9',          // optional: version/environment assumption (REQUIRED when t === 'distro')
      tags: ['rhcsa']         // optional: 'rhcsa' if it maps to an EX200 objective, 'rhce' for EX294/Ansible
    }
  ]
};
```

### Question bank rules per lesson (10 questions)

- Difficulty: **3 beginner, 4 intermediate, 3 advanced** (relative to the level).
- At least **5 of 10** must be practical types: `output`, `log`, `config`, `troubleshoot`, `rca`, `remediation`.
- At least **1 multi-select** per lesson (q says "Select all that apply"), with 2-3 correct of 4-5 options.
- Single-answer questions have **exactly 4** plausible options. Never use "All of the above"/"None of the above".
- No duplicated or near-duplicated questions (within the level or with other levels). Vary the angle.
- Answer key must be unambiguous and agree with the explanation. Distribute correct positions (not always B).
- Distinguish RHEL-family vs Debian-family correctly; flag version differences in `env`.
- Never present disabling SELinux/firewalld as the right fix. Prefer safe, evidence-first remediation.
- Commands/outputs must be technically accurate for current RHEL 9/10 (and note where RHEL 8 differs).

## Accuracy & safety

- Content must be correct enough for real administration work. When unsure of a detail, say less rather than invent.
- State root requirements, flag destructive operations, give prechecks/backup/rollback/validation for risky changes.
- Do not promise certification or employment outcomes.
- RHCSA EX200 is currently based on **RHEL 10** (objectives include Flatpak, autofs, tuning profiles, journals, SELinux port labels, IPv6). RHCE EX294 is Ansible on the most recent RHEL + AAP (ansible-navigator, collections, roles, vault, templates).
