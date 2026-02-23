export const createPhase = (type, duration) => ({ type, duration });
export const p = (label, value, step = 1, min = 0) => ({ label, value, step, min });

export const formatTime = (totalSeconds) => {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

export const formatPlayerTime = (totalSeconds) => {
  if (totalSeconds < 60) return totalSeconds.toString();
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const calc = (start, target, cycles, index) => {
  if (cycles <= 1) return start;
  return Math.round(start + ((target - start) / (cycles - 1)) * index);
};

export const DEFAULT_EXERCISES = [
  { id: 'co2-std', name: 'CO2 Tolerance Table', category: 'Tables', sortOrder: 0, params: { cycles: p('Total Cycles', 8, 1, 1), startRest: p('Starting Rest', 120, 5, 0), targetRest: p('Target Rest', 15, 5, 0), in: p('Inhale', 5), holdIn: p('Hold (Full)', 45, 5), out: p('Exhale', 10), holdOut: p('Hold (Empty)', 0) } },
  { id: 'co2-exh', name: 'Exhaled CO2 Table', category: 'Tables', sortOrder: 1, params: { cycles: p('Total Cycles', 8, 1, 1), startRest: p('Starting Rest', 90, 5, 0), targetRest: p('Target Rest', 30, 5, 0), in: p('Inhale', 5), out: p('Exhale', 10), holdIn: p('Hold (Full)', 0), holdOut: p('Hold (Empty)', 15, 5) } },
  { id: 'o2-std', name: 'O2 Tolerance Table', category: 'Tables', sortOrder: 2, params: { cycles: p('Total Cycles', 8, 1, 1), rest: p('Rest Time', 120, 5), in: p('Inhale', 5), startHoldIn: p('Starting Hold', 30, 5), targetHoldIn: p('Target Hold', 135, 5), out: p('Exhale', 10), holdOut: p('Hold (Empty)', 0) } },
  { id: 'tri1', name: 'Triangle: Progressive', category: 'Triangle Breath', sortOrder: 7, params: { cycles: p('Total Cycles', 6, 1, 1), startPhase: p('Starting Phase', 4, 1), targetPhase: p('Target Phase', 9, 1), rest: p('Rest Time', 30, 5), holdOut: p('Hold (Empty)', 0) } },
  { id: 'nadi', name: 'Nadi Shodhana', category: 'Custom', sortOrder: 8, params: { cycles: p('Total Cycles', 5, 1, 1), in: p('Inhale', 16, 1), holdIn: p('Hold (Full)', 64, 1), out: p('Exhale', 32, 1), holdOut: p('Hold (Empty)', 0), rest: p('Rest Time', 0) } }
];

export const getGenerator = (template, params) => {
  const cyclesCount = params.cycles.value;
  return Array.from({ length: cyclesCount }).map((_, i) => {
    const phases = [];
    const inVal = params.startIn && params.targetIn ? calc(params.startIn.value, params.targetIn.value, cyclesCount, i) : (params.in?.value || params.startPhase?.value || 0);
    if (inVal > 0) phases.push(createPhase('in', inVal));
    const holdFullVal = params.startHoldIn && params.targetHoldIn ? calc(params.startHoldIn.value, params.targetHoldIn.value, cyclesCount, i) : (params.holdIn?.value || params.startPhase?.value || 0);
    if (holdFullVal > 0) phases.push(createPhase('holdIn', holdFullVal));
    const outVal = params.startOut && params.targetOut ? calc(params.startOut.value, params.targetOut.value, cyclesCount, i) : (params.out?.value || params.startPhase?.value || 0);
    if (outVal > 0) phases.push(createPhase('out', outVal));
    const holdEmptyVal = params.startHoldOut && params.targetHoldOut ? calc(params.startHoldOut.value, params.targetHoldOut.value, cyclesCount, i) : (params.holdOut?.value || 0);
    if (holdEmptyVal > 0) phases.push(createPhase('holdOut', holdEmptyVal));
    const restVal = params.startRest && params.targetRest ? calc(params.startRest.value, params.targetRest.value, cyclesCount, i) : (params.rest?.value || 0);
    const isLastCycle = i === cyclesCount - 1;
    if (restVal > 0 && !isLastCycle) phases.push(createPhase('rest', restVal));
    return phases;
  });
};

export const PHASE_UI = {
  in: { text: 'Breathe In', color: 'text-sky-400', bg: 'bg-sky-400', scale: 1.5 },
  holdIn: { text: 'Hold Full', color: 'text-indigo-400', bg: 'bg-indigo-400', scale: 1.5 },
  out: { text: 'Breathe Out', color: 'text-teal-400', bg: 'bg-teal-400', scale: 0.8 },
  holdOut: { text: 'Hold Empty', color: 'text-emerald-500', bg: 'bg-emerald-500', scale: 0.8 },
  rest: { text: 'Normal Breathing', color: 'text-slate-400', bg: 'bg-slate-500', scale: 1 }
};

/**
 * Given total elapsed seconds, find which phase the session is currently in.
 * Returns { cycleIndex, phaseIndex, timeLeft, done }.
 */
export const calcSessionState = (exercise, elapsedSeconds) => {
  let remaining = elapsedSeconds;
  for (let ci = 0; ci < exercise.cycles.length; ci++) {
    const cycle = exercise.cycles[ci];
    for (let pi = 0; pi < cycle.length; pi++) {
      const phase = cycle[pi];
      if (remaining < phase.duration) {
        return {
          cycleIndex: ci,
          phaseIndex: pi,
          timeLeft: Math.ceil(phase.duration - remaining),
          done: false
        };
      }
      remaining -= phase.duration;
    }
  }
  return {
    cycleIndex: exercise.cycles.length - 1,
    phaseIndex: exercise.cycles[exercise.cycles.length - 1].length - 1,
    timeLeft: 0,
    done: true
  };
};

/**
 * Sum of durations of all phases before (cycleIdx, phaseIdx).
 * Used to reconstruct session start time on resume.
 */
export const calcElapsedToPhase = (exercise, cycleIdx, phaseIdx) => {
  let elapsed = 0;
  for (let ci = 0; ci <= cycleIdx; ci++) {
    const cycle = exercise.cycles[ci];
    const maxPhase = ci < cycleIdx ? cycle.length : phaseIdx;
    for (let pi = 0; pi < maxPhase; pi++) {
      elapsed += cycle[pi].duration;
    }
  }
  return elapsed;
};

export const calcTotalDuration = (exercise) =>
  exercise.cycles.flat().reduce((sum, phase) => sum + phase.duration, 0);
