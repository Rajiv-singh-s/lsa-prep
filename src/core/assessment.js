// Assessment engine: question selection, session building, grading and scoring.
// UI-independent; all randomness flows through an injectable RNG for reproducible tests.
import { createRng, shuffle, uid, pct } from './util.js';
import { PRACTICAL_TYPES } from './schema.js';

export const MODES = {
  topic: { label: 'Topic Practice', instant: true, desc: 'Practise one topic with immediate feedback after each answer.' },
  module: { label: 'Module Examination', instant: false, desc: 'Timed exam across every topic in a module.' },
  level: { label: 'Full Level Examination', instant: false, desc: 'Timed exam sampling every module in a level.' },
  advanced: { label: 'Advanced Challenge', instant: false, desc: 'Advanced-difficulty questions only.' },
  revision: { label: 'Revision Mode', instant: true, desc: 'Spaced-revision queue: due and previously-missed questions first.' },
  random: { label: 'Random Practice', instant: true, desc: 'Random questions from the levels you choose.' },
  rhcsa: { label: 'RHCSA Knowledge Mock', instant: false, desc: 'Knowledge mock built from RHCSA-tagged questions. Not a substitute for the hands-on performance exam.' },
  rhce: { label: 'RHCE Knowledge Mock', instant: false, desc: 'Knowledge mock built from RHCE/Ansible-tagged questions. Not a substitute for the hands-on performance exam.' },
  incorrect: { label: 'Incorrect Answer Review', instant: true, desc: 'Every question whose most recent answer was wrong.' },
  output: { label: 'Command-Output Challenge', instant: false, desc: 'Interpret real-looking command output and logs.' },
  troubleshoot: { label: 'Production Troubleshooting Quiz', instant: false, desc: 'Troubleshooting, root-cause and safe-remediation scenarios.' }
};

export const DEFAULT_EXAM_SETTINGS = { marksPerQuestion: 1, negativeMarking: 0, shuffleQuestions: true, shuffleOptions: true };

/** Select the candidate pool for a mode. */
export function selectPool(bank, mode, opts = {}, progress = null, now = Date.now()) {
  const { levelIds, moduleId, topicId, difficulties, types } = opts;
  let pool = bank;
  if (levelIds?.length) pool = pool.filter(q => levelIds.includes(q.levelId));
  if (moduleId) pool = pool.filter(q => q.moduleId === moduleId);
  if (topicId) pool = pool.filter(q => q.topicId === topicId);
  if (difficulties?.length) pool = pool.filter(q => difficulties.includes(q.difficulty));
  if (types?.length) pool = pool.filter(q => types.includes(q.type));
  const qp = progress?.questions || {};
  switch (mode) {
    case 'advanced': return pool.filter(q => q.difficulty === 'advanced');
    case 'rhcsa': return pool.filter(q => q.tags.includes('rhcsa'));
    case 'rhce': return pool.filter(q => q.tags.includes('rhce'));
    case 'output': return pool.filter(q => q.type === 'output' || q.type === 'log');
    case 'troubleshoot': return pool.filter(q => ['troubleshoot', 'rca', 'remediation', 'config'].includes(q.type));
    case 'incorrect': return pool.filter(q => qp[q.id] && qp[q.id].lastCorrect === false);
    case 'revision': {
      const due = pool.filter(q => qp[q.id]?.srs && qp[q.id].srs.due <= now);
      return due.sort((a, b) => Number(qp[a.id].lastCorrect) - Number(qp[b.id].lastCorrect) || qp[a.id].srs.due - qp[b.id].srs.due);
    }
    default: return pool;
  }
}

/**
 * Stratified pick so a level/module exam spans every module/topic rather than clustering.
 */
export function pickQuestions(pool, count, rng, { stratifyBy = 'topicId', keepOrder = false } = {}) {
  if (count >= pool.length) return keepOrder ? pool.slice() : shuffle(pool, rng);
  if (keepOrder) return pool.slice(0, count);
  const groups = {};
  for (const q of shuffle(pool, rng)) (groups[q[stratifyBy]] ||= []).push(q);
  const keys = shuffle(Object.keys(groups), rng);
  const picked = [];
  while (picked.length < count) {
    let progressed = false;
    for (const k of keys) {
      if (picked.length >= count) break;
      const next = groups[k].shift();
      if (next) { picked.push(next); progressed = true; }
    }
    if (!progressed) break;
  }
  return shuffle(picked, rng);
}

export function buildSession({ mode, title, questions, settings = {}, timeLimitSec = 0, seed, scope = {} }) {
  const rng = createRng(seed ?? Date.now());
  const cfg = { ...DEFAULT_EXAM_SETTINGS, ...settings };
  const items = questions.map(q => ({
    qid: q.id,
    optionOrder: cfg.shuffleOptions ? shuffle(q.options.map((_, i) => i), rng) : q.options.map((_, i) => i)
  }));
  return {
    id: uid('attempt'),
    mode,
    title: title || MODES[mode]?.label || mode,
    instant: !!MODES[mode]?.instant,
    scope,
    settings: cfg,
    timeLimitSec,
    startedAt: Date.now(),
    items,
    answers: {},     // qid -> array of ORIGINAL option indexes
    checked: {},     // qid -> true once checked in instant mode (locks the answer)
    revealed: {},    // qid -> true if the learner asked for the solution (scored as incorrect)
    hints: {},       // qid -> true if a hint was requested
    submitted: false,
    result: null
  };
}

export function setAnswer(session, qid, originalIndex, format) {
  if (session.submitted || session.checked[qid] || session.revealed[qid]) return false;
  const current = session.answers[qid] || [];
  if (format === 'multi') {
    session.answers[qid] = current.includes(originalIndex) ? current.filter(i => i !== originalIndex) : [...current, originalIndex].sort((a, b) => a - b);
  } else {
    session.answers[qid] = [originalIndex];
  }
  if (!session.answers[qid].length) delete session.answers[qid];
  return true;
}

export function gradeQuestion(q, selected) {
  if (!selected || !selected.length) return 'unanswered';
  const a = [...q.answers].sort((x, y) => x - y);
  const s = [...new Set(selected)].sort((x, y) => x - y);
  return a.length === s.length && a.every((v, i) => v === s[i]) ? 'correct' : 'incorrect';
}

/** Score a session. Revealed answers count as incorrect (no credit) but never earn negative marks twice. */
export function scoreSession(session, qmap) {
  const { marksPerQuestion, negativeMarking } = session.settings;
  const result = {
    total: session.items.length, correct: 0, incorrect: 0, unanswered: 0, revealed: 0,
    score: 0, maxScore: session.items.length * marksPerQuestion,
    byTopic: {}, byDifficulty: {}, byType: {}, perQuestion: {}
  };
  for (const item of session.items) {
    const q = qmap.get(item.qid);
    if (!q) continue;
    let outcome = gradeQuestion(q, session.answers[item.qid]);
    if (session.revealed[item.qid]) { outcome = 'incorrect'; result.revealed++; }
    result.perQuestion[item.qid] = outcome;
    result[outcome]++;
    if (outcome === 'correct') result.score += marksPerQuestion;
    else if (outcome === 'incorrect' && !session.revealed[item.qid]) result.score -= negativeMarking;
    for (const [bucket, key] of [[result.byTopic, q.topicId], [result.byDifficulty, q.difficulty], [result.byType, q.type]]) {
      bucket[key] ||= { total: 0, correct: 0 };
      bucket[key].total++;
      if (outcome === 'correct') bucket[key].correct++;
    }
  }
  result.score = Math.round(result.score * 100) / 100;
  const answered = result.correct + result.incorrect;
  result.accuracy = pct(result.correct, answered);
  result.percent = result.maxScore > 0 ? Math.max(0, Math.round((result.score / result.maxScore) * 100)) : 0;
  result.durationSec = Math.round(((session.submittedAt || Date.now()) - session.startedAt) / 1000);
  result.weakTopics = Object.entries(result.byTopic)
    .filter(([, v]) => v.total >= 1 && v.correct / v.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([topicId, v]) => ({ topicId, accuracy: pct(v.correct, v.total), total: v.total }));
  result.practicalShare = pct(session.items.filter(i => PRACTICAL_TYPES.has(qmap.get(i.qid)?.type)).length, session.items.length);
  return result;
}

/** Idempotent submission: a second submit returns the original result and does not re-score. */
export function submitSession(session, qmap, now = Date.now()) {
  if (session.submitted) return { result: session.result, duplicate: true };
  session.submitted = true;
  session.submittedAt = now;
  session.result = scoreSession(session, qmap);
  return { result: session.result, duplicate: false };
}

export function isTimedOut(session, now = Date.now()) {
  return session.timeLimitSec > 0 && now - session.startedAt >= session.timeLimitSec * 1000;
}

export function remainingSec(session, now = Date.now()) {
  if (!session.timeLimitSec) return null;
  return Math.max(0, Math.ceil(session.timeLimitSec - (now - session.startedAt) / 1000));
}
