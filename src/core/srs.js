// Simplified SM-2 spaced-revision scheduler.
// Each question keeps { ef, interval, reps, due }. Quality: 5 = correct first try,
// 4 = correct, 2 = incorrect but close (used for partially-correct multi-select), 1 = incorrect.
export const DAY_MS = 24 * 60 * 60 * 1000;

export function initialSrs() {
  return { ef: 2.5, interval: 0, reps: 0, due: 0 };
}

export function review(srs, quality, now = Date.now()) {
  const s = { ...(srs || initialSrs()) };
  const q = Math.max(0, Math.min(5, quality));
  if (q < 3) {
    s.reps = 0;
    s.interval = 1;
  } else {
    s.reps += 1;
    if (s.reps === 1) s.interval = 1;
    else if (s.reps === 2) s.interval = 6;
    else s.interval = Math.round(s.interval * s.ef);
  }
  s.ef = Math.max(1.3, +(s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(3));
  // Incorrect answers come back the same day (due immediately) so they are prioritised.
  s.due = q < 3 ? now : now + s.interval * DAY_MS;
  return s;
}

export function isDue(srs, now = Date.now()) {
  return !!srs && srs.due <= now;
}

// Revision priority: overdue incorrect items first, then oldest due, then low ease.
export function revisionQueue(questionProgress, now = Date.now()) {
  return Object.entries(questionProgress || {})
    .filter(([, p]) => p.srs && isDue(p.srs, now))
    .map(([id, p]) => ({ id, lastCorrect: p.lastCorrect, due: p.srs.due, ef: p.srs.ef }))
    .sort((a, b) => (a.lastCorrect === b.lastCorrect ? 0 : a.lastCorrect ? 1 : -1) || a.due - b.due || a.ef - b.ef);
}
