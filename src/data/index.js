// Content loader. Each level lives in its own module (lessons in levels/, MCQs in questions/)
// and is fetched with dynamic import so the browser downloads levels in parallel.
import { buildQuestionBank } from '../core/schema.js';

export const LEVEL_COUNT = 20;
const pad = (n) => String(n).padStart(2, '0');

export async function loadContent({ onProgress } = {}) {
  const errors = [];
  let done = 0;
  const tick = () => onProgress?.(++done, LEVEL_COUNT * 2);
  const levelPromises = Array.from({ length: LEVEL_COUNT }, (_, i) =>
    import(`./levels/level-${pad(i)}.js`).then(m => { tick(); return m.default; }).catch(e => { tick(); errors.push(`Level ${i}: ${e.message}`); return null; }));
  const questionPromises = Array.from({ length: LEVEL_COUNT }, (_, i) =>
    import(`./questions/level-${pad(i)}.js`).then(m => { tick(); return m.default; }).catch(e => { tick(); errors.push(`Questions for level ${i}: ${e.message}`); return null; }));
  const [levels, questionModules] = await Promise.all([Promise.all(levelPromises), Promise.all(questionPromises)]);
  const curriculum = levels.filter(Boolean).sort((a, b) => a.number - b.number);
  const bank = buildQuestionBank(questionModules.filter(Boolean));
  return { curriculum, bank, errors };
}
