/**
 * Audio scheduler for PranaFlow.
 *
 * Uses a persistent AudioContext and pre-schedules chimes at absolute audio
 * clock timestamps. Because the Web Audio engine runs on a separate OS thread,
 * pre-scheduled events fire even when the JS main thread is throttled by the
 * browser (Android background / screen dimmed). This is the most reliable
 * approach for background audio without a server.
 *
 * iOS limitation: WebKit fully suspends its audio engine when the screen
 * locks. Pre-scheduling cannot survive a hard screen lock on iOS.
 */

let audioCtx = null;
let scheduledNodes = []; // { osc, scheduledAt }

const getCtx = () => {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
};

/**
 * Must be called inside a user-gesture handler (e.g. Play button click)
 * to unlock the AudioContext on iOS/Safari.
 */
export const resumeAudio = async () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  } catch (e) {
    // Audio unavailable
    return null;
  }
};

const schedulePhaseChime = (ctx, at) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.3, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.51);

    scheduledNodes.push({ osc, scheduledAt: at });
  } catch (e) {
    // ignore
  }
};

const scheduleCompletionChime = (ctx, at) => {
  try {
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const noteAt = at + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteAt);
      gain.gain.setValueAtTime(0, noteAt);
      gain.gain.linearRampToValueAtTime(0.3, noteAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteAt + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteAt);
      osc.stop(noteAt + 0.61);

      scheduledNodes.push({ osc, scheduledAt: noteAt });
    });
  } catch (e) {
    // ignore
  }
};

/**
 * Play an immediate chime (for the first press of Play to signal session start).
 */
export const playChimeNow = (type = 'phase') => {
  try {
    const ctx = getCtx();
    const at = ctx.currentTime + 0.05;
    if (type === 'phase') schedulePhaseChime(ctx, at);
    else scheduleCompletionChime(ctx, at);
  } catch (e) {
    // ignore
  }
};

/**
 * Pre-schedule all future phase transition chimes and a completion chime.
 *
 * Call this when:
 *   - Session starts (Play pressed for first time)
 *   - Session resumes after pause
 *
 * @param exercise             The exercise object with .cycles array
 * @param fromCycleIdx         Current cycle index
 * @param fromPhaseIdx         Current phase index within cycle
 * @param timeLeftInCurrentPhase  Seconds remaining in the current phase
 */
export const scheduleSessionChimes = (exercise, fromCycleIdx, fromPhaseIdx, timeLeftInCurrentPhase) => {
  cancelScheduledChimes();
  try {
    const ctx = getCtx();
    let offset = timeLeftInCurrentPhase;

    for (let ci = fromCycleIdx; ci < exercise.cycles.length; ci++) {
      const cycle = exercise.cycles[ci];
      const startPi = ci === fromCycleIdx ? fromPhaseIdx + 1 : 0;

      for (let pi = startPi; pi < cycle.length; pi++) {
        schedulePhaseChime(ctx, ctx.currentTime + offset);
        offset += cycle[pi].duration;
      }
    }

    // Completion chime at the very end of the session
    scheduleCompletionChime(ctx, ctx.currentTime + offset);
  } catch (e) {
    // Audio scheduling failed silently
  }
};

/**
 * Cancel all future scheduled chimes by stopping their oscillators immediately.
 * Call this on pause or stop.
 */
export const cancelScheduledChimes = () => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  scheduledNodes.forEach(({ osc, scheduledAt }) => {
    if (scheduledAt > now) {
      try {
        osc.stop(now);
      } catch (_) {
        // Already stopped or not started
      }
    }
  });
  scheduledNodes = [];
};
