// Mastery model + derived analytics. Every number shown in the UI is computed here from
// recorded progress; nothing is hard-coded.
import { pct } from './util.js';
import { DEFAULT_SETTINGS } from './store.js';

export const STATES = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  PRACTICED: 'Practiced',
  MASTERED: 'Mastered',
  NEEDS_REVISION: 'Needs Revision'
};

/**
 * Topic (= lesson) state. Opening or completing a lesson never makes it "Mastered":
 * mastery needs assessment evidence (and a passed lab where the topic has one).
 */
export function topicMastery(topicId, ctx) {
  const { progress, questionsByTopic, labsByLesson, now = Date.now() } = ctx;
  const s = { ...DEFAULT_SETTINGS, ...(progress.settings || {}) };
  const qs = questionsByTopic.get(topicId) || [];
  const lesson = progress.lessons[topicId];
  let answered = 0, lastCorrect = 0, due = 0;
  for (const q of qs) {
    const rec = progress.questions[q.id];
    if (!rec || !rec.attempts) continue;
    answered++;
    if (rec.lastCorrect) lastCorrect++;
    if (rec.srs && rec.srs.due <= now && !rec.lastCorrect) due++;
  }
  const accuracy = answered ? lastCorrect / answered : 0;
  const labs = labsByLesson?.get(topicId) || [];
  const labPassed = labs.length === 0 || labs.every(l => progress.labs[l.id]?.passed);
  const lessonDone = !!lesson?.completedAt;
  let state;
  if (!lesson && answered === 0) state = STATES.NOT_STARTED;
  else if (answered >= s.practicedMinAnswered && accuracy < s.revisionThreshold) state = STATES.NEEDS_REVISION;
  else if (lessonDone && answered >= s.masteryMinAnswered && accuracy >= s.masteryAccuracy && labPassed) state = STATES.MASTERED;
  else if (answered >= s.practicedMinAnswered) state = STATES.PRACTICED;
  else state = STATES.IN_PROGRESS;
  // Mastered/practiced topics with several missed questions due again need revision.
  if ((state === STATES.MASTERED || state === STATES.PRACTICED) && due >= 3) state = STATES.NEEDS_REVISION;
  return { state, answered, total: qs.length, accuracy: Math.round(accuracy * 100), due, lessonDone, labPassed, hasLab: labs.length > 0 };
}

export function buildIndexes(curriculum, bank, labs = []) {
  const questionsByTopic = new Map();
  for (const q of bank) {
    if (!questionsByTopic.has(q.topicId)) questionsByTopic.set(q.topicId, []);
    questionsByTopic.get(q.topicId).push(q);
  }
  const labsByLesson = new Map();
  for (const lab of labs) {
    if (!lab.lessonId) continue;
    if (!labsByLesson.has(lab.lessonId)) labsByLesson.set(lab.lessonId, []);
    labsByLesson.get(lab.lessonId).push(lab);
  }
  const lessons = [];
  const lessonMap = new Map();
  const moduleMap = new Map();
  const levelMap = new Map();
  for (const lvl of curriculum) {
    levelMap.set(lvl.id, lvl);
    for (const m of lvl.modules) {
      moduleMap.set(m.id, { ...m, levelId: lvl.id });
      for (const l of m.lessons) {
        const entry = { ...l, levelId: lvl.id, levelNumber: lvl.number, moduleId: m.id, moduleTitle: m.title, levelTitle: lvl.title, index: lessons.length };
        lessons.push(entry);
        lessonMap.set(l.id, entry);
      }
    }
  }
  const qmap = new Map(bank.map(q => [q.id, q]));
  return { questionsByTopic, labsByLesson, lessons, lessonMap, moduleMap, levelMap, qmap };
}

export function levelProgress(lvl, progress, idx) {
  const lessons = lvl.modules.flatMap(m => m.lessons);
  const done = lessons.filter(l => progress.lessons[l.id]?.completedAt).length;
  const states = lessons.map(l => topicMastery(l.id, { progress, ...idx }).state);
  const mastered = states.filter(s => s === STATES.MASTERED).length;
  return { total: lessons.length, done, percent: pct(done, lessons.length), mastered, masteryPercent: pct(mastered, lessons.length), states };
}

export function overallProgress(curriculum, progress, idx) {
  let total = 0, done = 0, mastered = 0;
  const counts = Object.fromEntries(Object.values(STATES).map(s => [s, 0]));
  for (const lvl of curriculum) {
    const lp = levelProgress(lvl, progress, idx);
    total += lp.total; done += lp.done; mastered += lp.mastered;
    for (const s of lp.states) counts[s]++;
  }
  return { total, done, percent: pct(done, total), mastered, masteryPercent: pct(mastered, total), counts };
}

export function nextLesson(progress, idx) {
  const cur = progress.current?.lessonId && idx.lessonMap.get(progress.current.lessonId);
  if (cur && !progress.lessons[cur.id]?.completedAt) return { lesson: cur, reason: 'Continue where you left off' };
  const first = idx.lessons.find(l => !progress.lessons[l.id]?.completedAt);
  return first ? { lesson: first, reason: cur ? 'Next incomplete lesson in sequence' : 'Start at the beginning' } : null;
}

export function weakTopics(progress, idx, limit = 8) {
  const out = [];
  for (const l of idx.lessons) {
    const m = topicMastery(l.id, { progress, ...idx });
    if (m.state === STATES.NEEDS_REVISION || (m.answered >= 3 && m.accuracy < 70)) out.push({ lesson: l, ...m });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}

export function bankProgress(progress, bank) {
  let answered = 0, correct = 0, due = 0;
  const now = Date.now();
  for (const q of bank) {
    const r = progress.questions[q.id];
    if (!r?.attempts) continue;
    answered++;
    if (r.lastCorrect) correct++;
    if (r.srs?.due <= now) due++;
  }
  return { total: bank.length, answered, correct, accuracy: pct(correct, answered), coverage: pct(answered, bank.length), due };
}

/**
 * Exam readiness (transparent formula, shown in the UI):
 *   45% question accuracy on the exam's tagged questions, scaled by coverage (answered / total),
 *   35% hands-on: fraction of linked terminal labs passed,
 *   20% best knowledge-mock percentage.
 * A knowledge score is never a guarantee of passing a performance-based exam.
 */
export function examReadiness(tag, progress, bank, labs, mockMode) {
  const tagged = bank.filter(q => q.tags.includes(tag));
  let answered = 0, correct = 0;
  for (const q of tagged) {
    const r = progress.questions[q.id];
    if (r?.attempts) { answered++; if (r.lastCorrect) correct++; }
  }
  const coverage = tagged.length ? answered / tagged.length : 0;
  const accuracy = answered ? correct / answered : 0;
  const relevantLabs = labs.filter(l => (l.tags || []).includes(tag));
  const labShare = relevantLabs.length ? relevantLabs.filter(l => progress.labs[l.id]?.passed).length / relevantLabs.length : 0;
  const mocks = progress.attempts.filter(a => a.mode === mockMode);
  const bestMock = mocks.length ? Math.max(...mocks.map(a => a.percent)) / 100 : 0;
  const score = Math.round((0.45 * accuracy * coverage + 0.35 * labShare + 0.2 * bestMock) * 100);
  return { score, tagged: tagged.length, answered, accuracy: Math.round(accuracy * 100), coverage: Math.round(coverage * 100), labsPassed: Math.round(labShare * 100), labCount: relevantLabs.length, bestMock: Math.round(bestMock * 100), mocks: mocks.length };
}
