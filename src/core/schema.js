// Data models, normalization and validation for curriculum + question bank.
// Pure functions: used by the UI at load time, by scripts/validate-content.mjs and by tests.
import { normalizeText, similarity } from './util.js';

export const DIFFICULTIES = { b: 'beginner', i: 'intermediate', a: 'advanced' };
export const QUESTION_TYPES = {
  concept: 'Concept',
  command: 'Command syntax',
  output: 'Command-output interpretation',
  log: 'Log / error analysis',
  config: 'Configuration diagnosis',
  troubleshoot: 'Production troubleshooting',
  rca: 'Root-cause identification',
  remediation: 'Safe remediation decision',
  security: 'Security / best practice',
  distro: 'Distribution-specific'
};
// Types that count toward the ">= 40% practical / scenario" requirement.
export const PRACTICAL_TYPES = new Set(['output', 'log', 'config', 'troubleshoot', 'rca', 'remediation']);

export const MIN_PER_LEVEL = 100;
export const MIN_PER_MODULE = 20;
export const TARGET_PER_TOPIC = 10;

const pad = (n) => String(n).padStart(2, '0');

export function levelIdFromNumber(n) { return `L${pad(n)}`; }
export function parseTopicId(topicId) {
  const m = /^L(\d{2})-M(\d+)-T(\d+)$/.exec(topicId || '');
  if (!m) return null;
  return { level: Number(m[1]), levelId: `L${m[1]}`, moduleId: `L${m[1]}-M${m[2]}` };
}

/**
 * Expand a compact authored question into the full record.
 * Authoring keys: d (b|i|a), t (type), q (text), o (options), a (correct indexes),
 * e (explanation), w (per-option rationale; '' for correct options), c (command/concept),
 * s (skill), env (version / environment assumption), tags (e.g. ['rhcsa']).
 * IDs are positional within a topic (append-only policy keeps them stable).
 */
export function normalizeQuestion(raw, topicId, index) {
  const parsed = parseTopicId(topicId) || { level: -1, levelId: '?', moduleId: '?' };
  const answers = Array.isArray(raw.a) ? raw.a.slice() : [raw.a];
  return {
    id: `${topicId}-Q${pad(index + 1)}`,
    level: parsed.level,
    levelId: parsed.levelId,
    moduleId: parsed.moduleId,
    topicId,
    lessonRef: topicId,
    text: raw.q,
    type: raw.t || 'concept',
    format: answers.length > 1 ? 'multi' : 'single',
    options: raw.o || [],
    answers,
    explanation: raw.e || '',
    optionRationales: raw.w || [],
    difficulty: DIFFICULTIES[raw.d] || raw.d,
    command: raw.c || '',
    skill: raw.s || '',
    env: raw.env || '',
    tags: raw.tags || []
  };
}

export function buildQuestionBank(questionModules) {
  // questionModules: array of { [topicId]: compact[] }
  const bank = [];
  for (const mod of questionModules) {
    for (const [topicId, list] of Object.entries(mod)) {
      list.forEach((raw, i) => bank.push(normalizeQuestion(raw, topicId, i)));
    }
  }
  return bank;
}

function issue(severity, code, id, message) { return { severity, code, id, message }; }

export function validateQuestion(q, topicIds) {
  const issues = [];
  const add = (sev, code, msg) => issues.push(issue(sev, code, q.id, msg));
  if (!q.text || q.text.trim().length < 15) add('error', 'text', 'Question text missing or too short');
  if (!Object.values(DIFFICULTIES).includes(q.difficulty)) add('error', 'difficulty', `Invalid difficulty "${q.difficulty}"`);
  if (!QUESTION_TYPES[q.type]) add('error', 'type', `Invalid question type "${q.type}"`);
  if (!Array.isArray(q.options) || q.options.length < 3) add('error', 'options', 'Fewer than 3 options');
  if (q.options.some(o => !String(o || '').trim())) add('error', 'options', 'Empty option text');
  const norm = q.options.map(o => String(o || '').trim().replace(/\s+/g, ' '));
  if (new Set(norm).size !== norm.length) add('error', 'ambiguous', 'Two options are identical');
  if (q.format === 'single' && q.options.length !== 4) add('warning', 'options', `Single-answer question has ${q.options.length} options (4 expected)`);
  if (q.answers.length === 0) add('error', 'answer', 'No correct answer');
  if (new Set(q.answers).size !== q.answers.length) add('error', 'answer', 'Duplicate answer index');
  if (q.answers.some(a => !Number.isInteger(a) || a < 0 || a >= q.options.length)) add('error', 'answer', 'Answer index out of range');
  if (q.format === 'multi' && q.answers.length >= q.options.length) add('error', 'answer', 'Multi-select marks every option correct');
  if (q.options.some(o => /\b(all|none) of the above\b/i.test(o))) add('warning', 'ambiguous', '"All/None of the above" option');
  if (!q.explanation || q.explanation.trim().length < 20) add('error', 'explanation', 'Explanation missing or too short');
  q.options.forEach((_o, i) => {
    if (!q.answers.includes(i) && !String(q.optionRationales[i] || '').trim()) add('error', 'rationale', `Option ${i + 1} is incorrect but has no rationale`);
  });
  if (!q.skill) add('error', 'skill', 'Skill tested not specified');
  if (!q.command) add('error', 'command', 'Command/concept not specified');
  if (topicIds && !topicIds.has(q.topicId)) add('error', 'lessonRef', `Topic/lesson ${q.topicId} does not exist`);
  if (q.type === 'distro' && !q.env) add('warning', 'env', 'Distribution-specific question without env assumption');
  // Distribution sanity: RHEL-framed questions should not have apt/dpkg correct answers and vice versa.
  const correctText = q.answers.map(i => q.options[i] || '').join(' ');
  if (/\b(RHEL|Red Hat|Rocky|AlmaLinux)\b/.test(q.text) && !/\b(Debian|Ubuntu)\b/.test(q.text) && /\b(apt|apt-get|dpkg)\s/.test(correctText)) add('error', 'distro', 'RHEL question with a Debian-family correct answer');
  if (/\b(Debian|Ubuntu)\b/.test(q.text) && !/\b(RHEL|Red Hat|Rocky|Fedora)\b/.test(q.text) && /\b(dnf|yum|rpm)\s/.test(correctText)) add('error', 'distro', 'Debian question with an RPM-family correct answer');
  return issues;
}

export function validateQuestionBank(bank, curriculum) {
  const issues = [];
  const topicIds = new Set();
  const moduleIds = new Set();
  for (const lvl of curriculum) for (const m of lvl.modules) { moduleIds.add(m.id); for (const l of m.lessons) topicIds.add(l.id); }
  const seen = new Map();
  for (const q of bank) {
    if (seen.has(q.id)) issues.push(issue('error', 'duplicate-id', q.id, 'Duplicate question ID'));
    seen.set(q.id, q);
    issues.push(...validateQuestion(q, topicIds));
  }
  // Exact and near duplicates (compared within a level and across the bank for exact text).
  const byText = new Map();
  for (const q of bank) {
    const key = normalizeText(q.text);
    if (byText.has(key)) issues.push(issue('error', 'duplicate-text', q.id, `Same text as ${byText.get(key)}`));
    else byText.set(key, q.id);
  }
  const byLevel = groupBy(bank, q => q.levelId);
  for (const list of Object.values(byLevel)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (similarity(list[i].text, list[j].text) >= 0.85) issues.push(issue('warning', 'near-duplicate', list[j].id, `Very similar to ${list[i].id}`));
      }
    }
  }
  const stats = bankStats(bank, curriculum);
  for (const lvl of stats.levels) {
    if (lvl.total < MIN_PER_LEVEL) issues.push(issue('error', 'level-coverage', lvl.id, `Level has ${lvl.total} questions (< ${MIN_PER_LEVEL})`));
    for (const m of lvl.modules) {
      if (m.total < MIN_PER_MODULE) issues.push(issue('error', 'module-coverage', m.id, `Module has ${m.total} questions (< ${MIN_PER_MODULE})`));
      for (const t of m.topics) if (t.total < TARGET_PER_TOPIC) issues.push(issue('warning', 'topic-coverage', t.id, `Topic has ${t.total} questions (< ${TARGET_PER_TOPIC})`));
    }
    if (lvl.total) {
      const share = (n) => n / lvl.total;
      if (Math.abs(share(lvl.byDifficulty.beginner) - 0.3) > 0.1 || Math.abs(share(lvl.byDifficulty.intermediate) - 0.4) > 0.1 || Math.abs(share(lvl.byDifficulty.advanced) - 0.3) > 0.1) {
        issues.push(issue('warning', 'difficulty-mix', lvl.id, `Difficulty mix ${lvl.byDifficulty.beginner}/${lvl.byDifficulty.intermediate}/${lvl.byDifficulty.advanced} deviates >10pp from 30/40/30`));
      }
    }
  }
  if (stats.total && stats.practicalShare < 0.4) issues.push(issue('error', 'practical-share', 'bank', `Practical/scenario share ${(stats.practicalShare * 100).toFixed(1)}% < 40%`));
  for (const q of bank) if (!moduleIds.has(q.moduleId)) issues.push(issue('error', 'module-ref', q.id, `Module ${q.moduleId} does not exist`));
  return { issues, stats };
}

export function groupBy(list, fn) {
  const out = {};
  for (const item of list) (out[fn(item)] ||= []).push(item);
  return out;
}

export function bankStats(bank, curriculum) {
  const byTopic = groupBy(bank, q => q.topicId);
  const levels = curriculum.map(lvl => {
    const lq = bank.filter(q => q.levelId === lvl.id);
    const modules = lvl.modules.map(m => ({
      id: m.id,
      title: m.title,
      total: bank.filter(q => q.moduleId === m.id).length,
      topics: m.lessons.map(l => ({ id: l.id, title: l.title, total: (byTopic[l.id] || []).length }))
    }));
    return {
      id: lvl.id,
      number: lvl.number,
      title: lvl.title,
      total: lq.length,
      modules,
      byDifficulty: countBy(lq, q => q.difficulty, ['beginner', 'intermediate', 'advanced']),
      byType: countBy(lq, q => q.type, Object.keys(QUESTION_TYPES)),
      multi: lq.filter(q => q.format === 'multi').length,
      practical: lq.filter(q => PRACTICAL_TYPES.has(q.type)).length
    };
  });
  const practical = bank.filter(q => PRACTICAL_TYPES.has(q.type)).length;
  return {
    total: bank.length,
    levels,
    practical,
    practicalShare: bank.length ? practical / bank.length : 0,
    multi: bank.filter(q => q.format === 'multi').length,
    byDifficulty: countBy(bank, q => q.difficulty, ['beginner', 'intermediate', 'advanced']),
    byType: countBy(bank, q => q.type, Object.keys(QUESTION_TYPES))
  };
}

function countBy(list, fn, keys) {
  const out = Object.fromEntries(keys.map(k => [k, 0]));
  for (const item of list) { const k = fn(item); out[k] = (out[k] || 0) + 1; }
  return out;
}

// ---------- Curriculum ----------

export const LESSON_MINIMUMS = { objectives: 2, conceptChars: 300, mistakes: 2, interview: 2, revision: 3, labSteps: 2 };

export function validateCurriculum(curriculum) {
  const issues = [];
  const ids = new Map();
  const lessonIds = new Set();
  const levelIds = new Set(curriculum.map(l => l.id));
  const register = (id, kind) => {
    if (ids.has(id)) issues.push(issue('error', 'duplicate-id', id, `Duplicate ${kind} ID (also a ${ids.get(id)})`));
    ids.set(id, kind);
  };
  for (const lvl of curriculum) for (const m of lvl.modules) for (const l of m.lessons) lessonIds.add(l.id);

  const numbers = curriculum.map(l => l.number).sort((a, b) => a - b);
  for (let n = 0; n < 20; n++) if (!numbers.includes(n)) issues.push(issue('error', 'missing-level', `L${pad(n)}`, `Level ${n} missing`));

  for (const lvl of curriculum) {
    register(lvl.id, 'level');
    if (lvl.id !== levelIdFromNumber(lvl.number)) issues.push(issue('error', 'level-id', lvl.id, 'Level id does not match its number'));
    if (!lvl.title || !lvl.summary) issues.push(issue('error', 'level-meta', lvl.id, 'Level title/summary missing'));
    for (const p of lvl.prerequisites || []) if (!levelIds.has(p) || p === lvl.id) issues.push(issue('error', 'prereq', lvl.id, `Invalid level prerequisite ${p}`));
    if (!lvl.modules?.length) issues.push(issue('error', 'modules', lvl.id, 'Level has no modules'));
    for (const m of lvl.modules || []) {
      register(m.id, 'module');
      if (!m.id.startsWith(lvl.id + '-M')) issues.push(issue('error', 'module-id', m.id, `Module id not under ${lvl.id}`));
      if (!m.lessons?.length) issues.push(issue('error', 'lessons', m.id, 'Module has no lessons'));
      for (const l of m.lessons || []) {
        register(l.id, 'lesson');
        if (!l.id.startsWith(m.id + '-T')) issues.push(issue('error', 'lesson-id', l.id, `Lesson id not under ${m.id}`));
        issues.push(...validateLesson(l, lessonIds));
      }
    }
  }
  return issues;
}

export function validateLesson(l, lessonIds) {
  const issues = [];
  const add = (sev, code, msg) => issues.push(issue(sev, code, l.id, msg));
  const min = LESSON_MINIMUMS;
  if (!l.title) add('error', 'title', 'Lesson title missing');
  if ((l.objectives || []).length < min.objectives) add('error', 'objectives', `Fewer than ${min.objectives} objectives`);
  if ((l.concept || '').length < min.conceptChars) add('error', 'concept', 'First-principles explanation too short');
  if (!(l.examples || []).length && !l.syntax) add('error', 'examples', 'No examples or syntax reference');
  if ((l.mistakes || []).length < min.mistakes) add('error', 'mistakes', 'Too few common mistakes');
  if ((l.interview || []).length < min.interview) add('error', 'interview', 'Too few interview questions');
  if ((l.revision || []).length < min.revision) add('error', 'revision', 'Too few revision notes');
  if (!l.challenge?.task || !l.challenge?.solution) add('error', 'challenge', 'Practical challenge or solution missing');
  if ((l.lab?.steps || []).length < min.labSteps) add('error', 'lab', 'Hands-on lab missing or too short');
  for (const p of l.prereqs || []) {
    if (p === l.id) add('error', 'prereq', 'Lesson lists itself as prerequisite');
    else if (lessonIds && !lessonIds.has(p)) add('error', 'prereq', `Prerequisite ${p} does not exist`);
  }
  for (const ex of l.examples || []) if (!ex.cmd && !ex.title) add('error', 'examples', 'Example without command or title');
  return issues;
}

// Labs, incidents and projects share light-weight structural validation.
export function validateLabs(labs, lessonIds) {
  const issues = [];
  const seen = new Set();
  for (const lab of labs) {
    if (seen.has(lab.id)) issues.push(issue('error', 'duplicate-id', lab.id, 'Duplicate lab id'));
    seen.add(lab.id);
    if (lab.lessonId && lessonIds && !lessonIds.has(lab.lessonId)) issues.push(issue('error', 'lessonRef', lab.id, `Lesson ${lab.lessonId} missing`));
    if (!lab.tasks?.length) issues.push(issue('error', 'tasks', lab.id, 'Lab has no tasks'));
    for (const t of lab.tasks || []) {
      if (typeof t.check !== 'function') issues.push(issue('error', 'check', lab.id, `Task ${t.id} has no validator`));
      if (!t.hint) issues.push(issue('error', 'hint', lab.id, `Task ${t.id} has no hint`));
    }
    if (!lab.solution?.length) issues.push(issue('error', 'solution', lab.id, 'Lab has no solution'));
  }
  return issues;
}

export function validateIncidents(incidents) {
  const issues = [];
  const seen = new Set();
  for (const s of incidents) {
    const add = (code, msg) => issues.push(issue('error', code, s.id, msg));
    if (seen.has(s.id)) add('duplicate-id', 'Duplicate incident id');
    seen.add(s.id);
    for (const k of ['title', 'environment', 'symptoms', 'rootCause', 'level', 'topic']) if (s[k] === undefined || s[k] === '') add('field', `Missing ${k}`);
    if ((s.actions || []).length < 5) add('actions', 'Fewer than 5 diagnostic actions');
    const actionIds = new Set((s.actions || []).map(a => a.id));
    for (const a of s.actions || []) for (const r of a.requires || []) if (!actionIds.has(r)) add('branch', `Action ${a.id} requires unknown ${r}`);
    if (!(s.actions || []).some(a => a.key)) add('evidence', 'No key evidence actions');
    if ((s.causes || []).filter(c => c.correct).length !== 1) add('causes', 'Exactly one correct cause required');
    if (!(s.fixes || []).some(f => f.correct)) add('fixes', 'No correct remediation');
    if (!(s.validations || []).some(v => v.correct)) add('validation', 'No correct validation step');
    if (!(s.hints || []).length) add('hints', 'No hints');
    if (!(s.prevention || []).length) add('prevention', 'No preventive actions');
  }
  return issues;
}

export function validateProjects(projects, lessonIds) {
  const issues = [];
  const seen = new Set();
  for (const p of projects) {
    const add = (code, msg) => issues.push(issue('error', code, p.id, msg));
    if (seen.has(p.id)) add('duplicate-id', 'Duplicate project id');
    seen.add(p.id);
    for (const k of ['title', 'objective', 'solution']) if (!p[k] || (Array.isArray(p[k]) && !p[k].length)) add('field', `Missing ${k}`);
    if (!p.tasks?.length) add('tasks', 'No tasks');
    for (const t of p.tasks || []) if (!t.criteria) add('criteria', `Task ${t.id} lacks measurable completion criteria`);
    if (!p.hints?.length) add('hints', 'No hints');
    if (!p.extensions?.length) add('extensions', 'No troubleshooting extensions');
    if (!p.commands?.length) add('commands', 'No relevant commands');
    for (const pre of p.prereqs || []) if (lessonIds && !lessonIds.has(pre)) add('prereq', `Prerequisite ${pre} missing`);
  }
  return issues;
}
