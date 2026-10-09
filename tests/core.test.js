// Automated unit tests for Core Assessment, Storage, and SM-2 algorithms
import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuestion, scoreSession, buildSession, setAnswer } from '../src/core/assessment.js';
import { initialSrs, review, isDue } from '../src/core/srs.js';

test('Assessment: grade single question correctly', () => {
  const q = { id: 'Q1', answers: [1], options: ['a', 'b', 'c', 'd'] };
  assert.equal(gradeQuestion(q, [1]), 'correct');
  assert.equal(gradeQuestion(q, [2]), 'incorrect');
  assert.equal(gradeQuestion(q, []), 'unanswered');
});

test('Assessment: grade multi-select question correctly', () => {
  const q = { id: 'QM', answers: [0, 2], options: ['a', 'b', 'c', 'd'] };
  assert.equal(gradeQuestion(q, [0, 2]), 'correct');
  assert.equal(gradeQuestion(q, [2, 0]), 'correct');
  assert.equal(gradeQuestion(q, [0]), 'incorrect');
  assert.equal(gradeQuestion(q, [0, 1, 2]), 'incorrect');
});

test('Assessment: buildSession and setAnswer', () => {
  const q1 = { id: 'Q1', options: ['opt0', 'opt1'], answers: [0] };
  const session = buildSession({ mode: 'topic', questions: [q1], seed: 42 });
  assert.ok(session.id);
  assert.equal(session.items.length, 1);
  
  const ok = setAnswer(session, 'Q1', 1, 'single');
  assert.equal(ok, true);
  assert.deepEqual(session.answers.Q1, [1]);
});

test('Assessment: scoreSession calculates scores and negative marks accurately', () => {
  const q1 = { id: 'Q1', answers: [1], difficulty: 'b', type: 'command', topicId: 'T1' };
  const q2 = { id: 'Q2', answers: [0], difficulty: 'b', type: 'command', topicId: 'T1' };
  const qmap = new Map([['Q1', q1], ['Q2', q2]]);

  const session = {
    items: [{ qid: 'Q1' }, { qid: 'Q2' }],
    answers: { Q1: [1], Q2: [2] },
    revealed: {},
    settings: { marksPerQuestion: 2, negativeMarking: 0.5 },
    startedAt: Date.now() - 5000,
    submittedAt: Date.now()
  };

  const res = scoreSession(session, qmap);
  assert.equal(res.correct, 1);
  assert.equal(res.incorrect, 1);
  assert.equal(res.score, 1.5);
  assert.equal(res.maxScore, 4);
});

test('SRS: SM-2 interval calculations', () => {
  const item = initialSrs();
  assert.equal(item.reps, 0);
  assert.equal(item.ef, 2.5);
  
  // Grade 5 (correct) advances reps and interval
  const next = review(item, 5);
  assert.equal(next.reps, 1);
  assert.equal(next.interval, 1);
  assert.ok(next.ef >= 2.5);

  // Grade 1 (failure) resets reps to 0
  const failed = review(next, 1);
  assert.equal(failed.reps, 0);
  assert.equal(failed.interval, 1);
  assert.ok(isDue(failed));
});
