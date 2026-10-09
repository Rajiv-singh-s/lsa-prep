// Production incident simulation engine (pure, data-driven).
// Flow: investigate -> diagnose -> remediate -> validate -> done.
// Learners must gather evidence before a diagnosis is accepted; destructive actions and
// unsafe fixes are penalised; hints cost points.
export const PHASES = ['investigate', 'diagnose', 'remediate', 'validate', 'done'];
export const RUBRIC = { evidence: 30, diagnosis: 25, fix: 25, validation: 20, destructivePenalty: 10, unsafeFixPenalty: 10, hintPenalty: 3 };

export function startIncident(scenario) {
  return {
    id: scenario.id,
    phase: 'investigate',
    performed: [],
    destructive: [],
    causeAttempts: [],
    fixAttempts: [],
    unsafeFixes: [],
    validationAttempts: [],
    hintsUsed: 0,
    log: [{ kind: 'alert', text: scenario.symptoms.join(' ') }],
    finished: false
  };
}

export function keyActions(scenario) {
  return scenario.actions.filter(a => a.key);
}

export function availableActions(scenario, state) {
  return scenario.actions.filter(a => (a.requires || []).every(r => state.performed.includes(r)));
}

export function minEvidence(scenario) {
  return Math.min(2, keyActions(scenario).length);
}

export function evidenceFound(scenario, state) {
  return keyActions(scenario).filter(a => state.performed.includes(a.id)).length;
}

export function canDiagnose(scenario, state) {
  return evidenceFound(scenario, state) >= minEvidence(scenario);
}

export function performAction(scenario, state, actionId) {
  const action = scenario.actions.find(a => a.id === actionId);
  if (!action) return { ok: false, error: 'Unknown action' };
  if (!availableActions(scenario, state).includes(action)) return { ok: false, error: 'This action is not available yet — gather the evidence it depends on first.' };
  if (state.finished) return { ok: false, error: 'Incident already closed' };
  const repeat = state.performed.includes(actionId);
  if (!repeat) state.performed.push(actionId);
  if (action.risk === 'destructive' && !state.destructive.includes(actionId)) state.destructive.push(actionId);
  state.log.push({ kind: 'action', id: actionId, cmd: action.cmd || action.label, output: action.output, note: action.note, risk: action.risk || 'safe' });
  return { ok: true, action, repeat };
}

export function proceedToDiagnosis(scenario, state) {
  if (state.phase !== 'investigate') return { ok: false, error: 'Not in investigation phase' };
  if (!canDiagnose(scenario, state)) return { ok: false, error: `Collect at least ${minEvidence(scenario)} pieces of key evidence before diagnosing.` };
  state.phase = 'diagnose';
  return { ok: true };
}

export function chooseCause(scenario, state, causeId) {
  if (state.phase !== 'diagnose') return { ok: false, error: 'Not in diagnosis phase' };
  const cause = scenario.causes.find(c => c.id === causeId);
  if (!cause) return { ok: false, error: 'Unknown cause' };
  if (!state.causeAttempts.includes(causeId)) state.causeAttempts.push(causeId);
  state.log.push({ kind: 'diagnosis', text: cause.text, correct: !!cause.correct, why: cause.why });
  if (cause.correct) state.phase = 'remediate';
  return { ok: true, correct: !!cause.correct, why: cause.why };
}

export function chooseFix(scenario, state, fixId) {
  if (state.phase !== 'remediate') return { ok: false, error: 'Not in remediation phase' };
  const fix = scenario.fixes.find(f => f.id === fixId);
  if (!fix) return { ok: false, error: 'Unknown fix' };
  if (!state.fixAttempts.includes(fixId)) state.fixAttempts.push(fixId);
  if (fix.unsafe && !state.unsafeFixes.includes(fixId)) state.unsafeFixes.push(fixId);
  state.log.push({ kind: 'fix', text: fix.text, correct: !!fix.correct, unsafe: !!fix.unsafe, why: fix.why });
  if (fix.correct) state.phase = 'validate';
  return { ok: true, correct: !!fix.correct, unsafe: !!fix.unsafe, why: fix.why };
}

export function chooseValidation(scenario, state, valId) {
  if (state.phase !== 'validate') return { ok: false, error: 'Not in validation phase' };
  const v = scenario.validations.find(x => x.id === valId);
  if (!v) return { ok: false, error: 'Unknown validation step' };
  if (!state.validationAttempts.includes(valId)) state.validationAttempts.push(valId);
  state.log.push({ kind: 'validation', text: v.text, correct: !!v.correct, why: v.why, output: v.output });
  if (v.correct) { state.phase = 'done'; state.finished = true; }
  return { ok: true, correct: !!v.correct, why: v.why };
}

export function useHint(scenario, state) {
  const hint = scenario.hints[Math.min(state.hintsUsed, scenario.hints.length - 1)];
  if (state.hintsUsed < scenario.hints.length) state.hintsUsed++;
  return hint;
}

const tierScore = (max, attempts) => (attempts <= 0 ? 0 : attempts === 1 ? max : attempts === 2 ? Math.round(max / 2) : Math.round(max / 5));

export function scoreIncident(scenario, state) {
  const keys = keyActions(scenario).length;
  const evidence = keys ? Math.round(RUBRIC.evidence * evidenceFound(scenario, state) / keys) : RUBRIC.evidence;
  const diagnosis = state.phase === 'diagnose' || state.phase === 'investigate' ? 0 : tierScore(RUBRIC.diagnosis, state.causeAttempts.length);
  const fix = ['validate', 'done'].includes(state.phase) ? tierScore(RUBRIC.fix, state.fixAttempts.length) : 0;
  const validation = state.phase === 'done' ? tierScore(RUBRIC.validation, state.validationAttempts.length) : 0;
  const penalties = state.destructive.length * RUBRIC.destructivePenalty + state.unsafeFixes.length * RUBRIC.unsafeFixPenalty + state.hintsUsed * RUBRIC.hintPenalty;
  const max = RUBRIC.evidence + RUBRIC.diagnosis + RUBRIC.fix + RUBRIC.validation;
  const total = Math.max(0, evidence + diagnosis + fix + validation - penalties);
  return { evidence, diagnosis, fix, validation, penalties, total, max };
}
