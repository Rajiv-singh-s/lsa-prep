// Local, login-free progress store. Everything lives in the browser (localStorage).
// - versioned schema with migrations (v1 = the original app's two keys)
// - corrupted data is quarantined, never silently discarded
// - JSON export / validated import
// Storage is injectable so tests can run under Node.
import { review, initialSrs } from './srs.js';
import { todayKey } from './util.js';

export const STORAGE_KEY = 'lsa.progress';
export const SCHEMA_VERSION = 2;
export const LEGACY_KEYS = { modules: 'linux_completed_modules', quiz: 'linux_quiz_answers' };
const MAX_ATTEMPTS = 300;
const MAX_ATTEMPT_DETAIL = 60;

export const DEFAULT_SETTINGS = {
  negativeMarking: 0,          // marks deducted per wrong answer in exam modes
  examQuestionCount: 30,
  examMinutesPerQuestion: 1.5,
  masteryAccuracy: 0.85,       // rolling accuracy needed for "Mastered"
  masteryMinAnswered: 8,       // distinct questions answered in the topic
  practicedMinAnswered: 5,
  revisionThreshold: 0.6,      // accuracy below this => "Needs Revision"
  theme: 'dark'
};

export function emptyProgress(now = Date.now()) {
  return {
    version: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    lessons: {},       // lessonId -> { visitedAt, completedAt, scrollY }
    current: null,     // { route, lessonId, at }
    questions: {},     // qid -> { attempts, correct, lastCorrect, lastAt, srs }
    attempts: [],      // assessment history (newest first)
    labs: {},          // labId -> { tasksDone: [], passed, attempts, lastAt }
    incidents: {},     // incidentId -> { attempts, bestScore, lastScore, completedAt }
    projects: {},      // projectId -> { tasks: {taskId: true}, notes, completedAt }
    activityDays: [],  // ['YYYY-MM-DD'] days with real learning activity
    settings: { ...DEFAULT_SETTINGS },
    legacy: null
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Validate a progress object's structure. Returns array of problems (empty = valid). */
export function validateProgressShape(p) {
  const problems = [];
  if (!isObj(p)) return ['Progress is not an object'];
  if (typeof p.version !== 'number') problems.push('Missing numeric version');
  for (const k of ['lessons', 'questions', 'labs', 'incidents', 'projects', 'settings']) if (p[k] !== undefined && !isObj(p[k])) problems.push(`${k} must be an object`);
  for (const k of ['attempts', 'activityDays']) if (p[k] !== undefined && !Array.isArray(p[k])) problems.push(`${k} must be an array`);
  if (isObj(p.questions)) {
    for (const [id, q] of Object.entries(p.questions)) {
      if (!isObj(q) || typeof q.attempts !== 'number') { problems.push(`Question record ${id} is malformed`); break; }
    }
  }
  return problems;
}

/** Migrate any older shape to the current schema. Unknown future versions are rejected. */
export function migrate(data) {
  if (!isObj(data)) throw new Error('Cannot migrate non-object');
  let p = { ...data };
  if (p.version > SCHEMA_VERSION) throw new Error(`Progress schema v${p.version} is newer than this app (v${SCHEMA_VERSION})`);
  if (!p.version || p.version < 2) {
    // v1 had no envelope; fields are filled with defaults below.
    p.version = 2;
  }
  const base = emptyProgress(p.createdAt || Date.now());
  const merged = { ...base, ...p, settings: { ...DEFAULT_SETTINGS, ...(isObj(p.settings) ? p.settings : {}) } };
  // Normalise collections and de-duplicate.
  merged.activityDays = [...new Set((merged.activityDays || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const seen = new Set();
  merged.attempts = (merged.attempts || []).filter(a => isObj(a) && a.id && !seen.has(a.id) && seen.add(a.id));
  for (const k of ['lessons', 'questions', 'labs', 'incidents', 'projects']) if (!isObj(merged[k])) merged[k] = {};
  merged.version = SCHEMA_VERSION;
  return merged;
}

// Old app ids -> closest new lessons, so earlier "Mark as Completed" clicks are not lost.
const LEGACY_MODULE_MAP = {
  'mod-01': 'L03-M1-T1', 'mod-02': 'L04-M3-T1', 'mod-03': 'L05-M1-T1', 'mod-04': 'L08-M1-T1',
  'mod-05': 'L09-M2-T1', 'mod-06': 'L10-M2-T1', 'mod-07': 'L11-M2-T1', 'mod-08': 'L14-M1-T1'
};

export function migrateLegacy(storage, progress) {
  const rawMods = safeGet(storage, LEGACY_KEYS.modules);
  const rawQuiz = safeGet(storage, LEGACY_KEYS.quiz);
  if (rawMods === null && rawQuiz === null) return false;
  const legacy = { importedAt: Date.now(), completedModules: [], quizAnswers: {} };
  try { legacy.completedModules = JSON.parse(rawMods || '[]'); } catch { legacy.completedModules = []; }
  try { legacy.quizAnswers = JSON.parse(rawQuiz || '{}'); } catch { legacy.quizAnswers = {}; }
  for (const mod of Array.isArray(legacy.completedModules) ? legacy.completedModules : []) {
    const lessonId = LEGACY_MODULE_MAP[mod];
    if (lessonId && !progress.lessons[lessonId]) progress.lessons[lessonId] = { visitedAt: legacy.importedAt, completedAt: legacy.importedAt };
  }
  progress.legacy = legacy;
  try { storage.removeItem(LEGACY_KEYS.modules); storage.removeItem(LEGACY_KEYS.quiz); } catch { /* storage unavailable */ }
  return true;
}

function safeGet(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

export class ProgressStore {
  constructor(storage, { now = () => Date.now() } = {}) {
    this.storage = storage;
    this.now = now;
    this.listeners = new Set();
    this.warnings = [];
    this.available = true;
    this.data = this.load();
  }

  load() {
    let raw = null;
    try { raw = this.storage.getItem(STORAGE_KEY); } catch {
      this.available = false;
      this.warnings.push('Browser storage is unavailable (private mode or blocked). Progress will be lost when this tab closes — export a backup.');
    }
    let data = emptyProgress(this.now());
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const problems = validateProgressShape(parsed);
        if (problems.length) throw new Error(problems.join('; '));
        data = migrate(parsed);
      } catch (err) {
        const backupKey = `${STORAGE_KEY}.corrupt.${this.now()}`;
        try { this.storage.setItem(backupKey, raw); } catch { /* ignore */ }
        this.warnings.push(`Saved progress was unreadable (${err.message}). It was preserved as "${backupKey}" and a fresh profile was started.`);
        data = emptyProgress(this.now());
      }
    }
    if (this.available && migrateLegacy(this.storage, data)) this.warnings.push('Progress from the previous version of this app was migrated.');
    this.data = data;
    this.persist();
    return data;
  }

  persist() {
    this.data.updatedAt = this.now();
    if (!this.available) return false;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (err) {
      // Quota exceeded: trim answer detail from old attempts and retry once.
      this.data.attempts.forEach((a, i) => { if (i >= 10) delete a.answers; });
      try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data)); return true; } catch {
        this.warnings.push(`Could not save progress: ${err.message}. Export a backup now.`);
        return false;
      }
    }
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.persist(); for (const fn of this.listeners) fn(this.data); }

  touchActivity() {
    const day = todayKey(this.now());
    if (!this.data.activityDays.includes(day)) this.data.activityDays.push(day);
  }

  // ---- lessons ----
  visitLesson(lessonId, route) {
    const rec = this.data.lessons[lessonId] ||= {};
    rec.visitedAt ||= this.now();
    rec.lastAt = this.now();
    this.data.current = { route, lessonId, at: this.now() };
    this.emit();
  }
  setCurrent(route) {
    this.data.current = { ...(this.data.current || {}), route, at: this.now() };
    this.persist();
  }
  setLessonScroll(lessonId, y) {
    const rec = this.data.lessons[lessonId];
    if (rec) { rec.scrollY = Math.round(y); this.persist(); }
  }
  setLessonComplete(lessonId, done) {
    const rec = this.data.lessons[lessonId] ||= { visitedAt: this.now() };
    if (done) { rec.completedAt = this.now(); this.touchActivity(); } else delete rec.completedAt;
    this.emit();
  }
  isLessonComplete(lessonId) { return !!this.data.lessons[lessonId]?.completedAt; }

  // ---- questions / assessments ----
  recordAnswer(qid, outcome, at = this.now()) {
    if (outcome === 'unanswered') return;
    const rec = this.data.questions[qid] ||= { attempts: 0, correct: 0, lastCorrect: null, lastAt: 0, srs: initialSrs() };
    rec.attempts++;
    const ok = outcome === 'correct';
    if (ok) rec.correct++;
    rec.lastCorrect = ok;
    rec.lastAt = at;
    rec.srs = review(rec.srs, ok ? (rec.attempts === 1 ? 5 : 4) : 1, at);
  }

  /** Record a submitted session exactly once. */
  recordAttempt(session) {
    if (!session.submitted || !session.result) throw new Error('Session not submitted');
    if (this.data.attempts.some(a => a.id === session.id)) return false;
    // Instant-mode questions were already recorded when checked; record the rest now.
    for (const [qid, outcome] of Object.entries(session.result.perQuestion)) {
      if (!session.recorded?.[qid]) this.recordAnswer(qid, outcome, session.submittedAt);
    }
    const r = session.result;
    this.data.attempts.unshift({
      id: session.id, mode: session.mode, title: session.title, scope: session.scope,
      startedAt: session.startedAt, submittedAt: session.submittedAt, durationSec: r.durationSec,
      negativeMarking: session.settings.negativeMarking,
      total: r.total, correct: r.correct, incorrect: r.incorrect, unanswered: r.unanswered, revealed: r.revealed,
      score: r.score, maxScore: r.maxScore, accuracy: r.accuracy, percent: r.percent,
      byTopic: r.byTopic, byDifficulty: r.byDifficulty, weakTopics: r.weakTopics,
      answers: Object.fromEntries(session.items.map(i => [i.qid, session.answers[i.qid] || []]))
    });
    this.data.attempts = this.data.attempts.slice(0, MAX_ATTEMPTS);
    this.data.attempts.forEach((a, i) => { if (i >= MAX_ATTEMPT_DETAIL) delete a.answers; });
    this.touchActivity();
    this.emit();
    return true;
  }

  /** Instant-feedback modes record each checked question immediately (once per session). */
  recordInstant(session, qid, outcome) {
    session.recorded ||= {};
    if (session.recorded[qid]) return false;
    session.recorded[qid] = true;
    this.recordAnswer(qid, outcome);
    this.touchActivity();
    this.emit();
    return true;
  }

  // ---- labs, incidents, projects ----
  recordLab(labId, tasksDone, total) {
    const rec = this.data.labs[labId] ||= { tasksDone: [], passed: false, attempts: 0 };
    rec.attempts++;
    rec.tasksDone = [...new Set(tasksDone)];
    rec.lastAt = this.now();
    if (total > 0 && rec.tasksDone.length >= total && !rec.passed) { rec.passed = true; rec.passedAt = this.now(); }
    this.touchActivity();
    this.emit();
  }
  recordIncident(id, score, maxScore) {
    const rec = this.data.incidents[id] ||= { attempts: 0, bestScore: 0 };
    rec.attempts++;
    rec.lastScore = score;
    rec.maxScore = maxScore;
    rec.bestScore = Math.max(rec.bestScore, score);
    if (score >= maxScore * 0.7) rec.completedAt ||= this.now();
    rec.lastAt = this.now();
    this.touchActivity();
    this.emit();
  }
  setProjectTask(projectId, taskId, done, totalTasks) {
    const rec = this.data.projects[projectId] ||= { tasks: {}, notes: '' };
    if (done) rec.tasks[taskId] = true; else delete rec.tasks[taskId];
    const count = Object.keys(rec.tasks).length;
    if (totalTasks && count >= totalTasks) rec.completedAt ||= this.now(); else delete rec.completedAt;
    this.touchActivity();
    this.emit();
  }
  setProjectNotes(projectId, notes) {
    const rec = this.data.projects[projectId] ||= { tasks: {}, notes: '' };
    rec.notes = String(notes).slice(0, 20000);
    this.persist();
  }

  updateSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.emit();
  }

  // ---- backup ----
  exportJson() {
    return JSON.stringify({ app: 'linux-sysadmin-learning-platform', exportedAt: new Date(this.now()).toISOString(), progress: this.data }, null, 2);
  }

  /** Import replaces current progress after validation. Returns { ok, error }. */
  importJson(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: `Not valid JSON: ${e.message}` }; }
    const candidate = parsed && parsed.progress ? parsed.progress : parsed;
    const problems = validateProgressShape(candidate);
    if (problems.length) return { ok: false, error: `Invalid progress file: ${problems.join('; ')}` };
    try { this.data = migrate(candidate); } catch (e) { return { ok: false, error: e.message }; }
    this.emit();
    return { ok: true };
  }

  reset() {
    const theme = this.data.settings.theme;
    this.data = emptyProgress(this.now());
    this.data.settings.theme = theme;
    this.emit();
  }
}

/** Current learning streak: consecutive active days ending today (or yesterday). */
export function computeStreak(activityDays, now = Date.now()) {
  const days = new Set(activityDays);
  const d = new Date(now);
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(todayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    _map: map
  };
}
