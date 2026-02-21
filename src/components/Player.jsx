import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Square, ArrowLeft } from 'lucide-react';
import TimerWorker from '../workers/timer.worker.js?worker';
import {
  PHASE_UI,
  calcSessionState,
  calcElapsedToPhase,
  calcTotalDuration,
  formatPlayerTime
} from '../lib/exercises.js';
import {
  resumeAudio,
  playChimeNow,
  scheduleSessionChimes,
  cancelScheduledChimes
} from '../lib/audio.js';

export default function Player({ exercise, onClose, onFinish }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exercise.cycles[0][0].duration);

  const wakeLockRef = useRef(null);
  const workerRef = useRef(null);
  const sessionStartRef = useRef(null); // Date.now() adjusted for elapsed time
  const hasStartedRef = useRef(false);  // true after first Play press
  const isPlayingRef = useRef(false);   // ref mirror for use inside event handlers
  const onFinishRef = useRef(onFinish);
  const exerciseRef = useRef(exercise);

  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  const currentCycle = exercise.cycles[cycleIndex];
  const currentPhase = currentCycle?.[phaseIndex];

  const totalDuration = useMemo(() => calcTotalDuration(exercise), [exercise]);

  // --- Wake Lock ---

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch (_) {
      // Wake lock denied (low battery, etc.) — not fatal
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // --- Worker (drives UI countdown) ---

  useEffect(() => {
    const worker = new TimerWorker();
    worker.onmessage = () => setTimeLeft(prev => prev - 1);
    workerRef.current = worker;
    return () => {
      worker.terminate();
      cancelScheduledChimes();
    };
  }, []);

  // --- Session completion helper ---

  const buildLogEntry = () => ({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    exerciseName: exercise.name,
    totalCycles: exercise.cycles.length,
    settings: exercise.params ? JSON.parse(JSON.stringify(exercise.params)) : {}
  });

  const completeSession = useCallback(() => {
    workerRef.current?.postMessage('stop');
    cancelScheduledChimes();
    releaseWakeLock();
    setIsPlaying(false);
    isPlayingRef.current = false;
    sessionStartRef.current = null;
    onFinishRef.current(buildLogEntry());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseWakeLock]);

  // --- Phase transition state machine ---

  useEffect(() => {
    if (!isPlaying || timeLeft > 0) return;

    if (phaseIndex < currentCycle.length - 1) {
      const next = phaseIndex + 1;
      setPhaseIndex(next);
      setTimeLeft(currentCycle[next].duration);
    } else if (cycleIndex < exercise.cycles.length - 1) {
      const nextCi = cycleIndex + 1;
      setCycleIndex(nextCi);
      setPhaseIndex(0);
      setTimeLeft(exercise.cycles[nextCi][0].duration);
    } else {
      completeSession();
    }
  }, [timeLeft, isPlaying, phaseIndex, cycleIndex, currentCycle, exercise.cycles, completeSession]);

  // --- Visibility change: resync from wall clock when screen comes back on ---

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;

      // Re-acquire wake lock if system released it while we were visible
      if (isPlayingRef.current) requestWakeLock();

      if (!sessionStartRef.current || !isPlayingRef.current) return;

      const elapsed = (Date.now() - sessionStartRef.current) / 1000;

      if (elapsed >= totalDuration) {
        completeSession();
        return;
      }

      const state = calcSessionState(exerciseRef.current, elapsed);
      if (!state.done) {
        setCycleIndex(state.cycleIndex);
        setPhaseIndex(state.phaseIndex);
        setTimeLeft(state.timeLeft);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [totalDuration, completeSession, requestWakeLock]);

  // --- Play / Pause toggle ---

  const handleTogglePlay = async () => {
    if (isPlaying) {
      // Pause
      workerRef.current?.postMessage('stop');
      cancelScheduledChimes();
      releaseWakeLock();
      setIsPlaying(false);
      isPlayingRef.current = false;
      sessionStartRef.current = null;
    } else {
      // Play / Resume — must call resumeAudio inside the click handler
      await resumeAudio();

      // Reconstruct how far through the session we are so wall-clock resync
      // stays accurate across pause/resume cycles.
      const elapsedBefore =
        calcElapsedToPhase(exerciseRef.current, cycleIndex, phaseIndex) +
        (currentPhase.duration - timeLeft);
      sessionStartRef.current = Date.now() - elapsedBefore * 1000;

      // First-ever press: play an immediate chime for the starting phase
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        playChimeNow('phase');
      }

      // Pre-schedule all future chimes on the audio thread
      scheduleSessionChimes(exercise, cycleIndex, phaseIndex, timeLeft);

      workerRef.current?.postMessage('start');
      setIsPlaying(true);
      isPlayingRef.current = true;
      requestWakeLock();
    }
  };

  const handleStop = () => {
    workerRef.current?.postMessage('stop');
    cancelScheduledChimes();
    releaseWakeLock();
    sessionStartRef.current = null;
    isPlayingRef.current = false;
    onClose();
  };

  if (!currentPhase) return null;
  const ui = PHASE_UI[currentPhase.type];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in zoom-in-95">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8 text-slate-100">
        <button onClick={handleStop} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold">{exercise.name}</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            Cycle {cycleIndex + 1} / {exercise.cycles.length}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Breathing circle */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-16">
        <div
          className={`absolute inset-0 rounded-full opacity-20 ${ui.bg}`}
          style={{
            transform: `scale(${isPlaying ? ui.scale : 1})`,
            transition: `transform ${isPlaying ? currentPhase.duration : 0.5}s linear`
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center w-48 h-48 bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl">
          <span className={`text-xl font-bold mb-1 ${ui.color}`}>{ui.text}</span>
          <span className="text-5xl font-mono text-white tracking-tighter">{formatPlayerTime(timeLeft)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-8">
        <button
          onClick={handleStop}
          className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <Square size={24} />
        </button>
        <button
          onClick={handleTogglePlay}
          className="w-20 h-20 rounded-full bg-sky-500 text-slate-900 flex items-center justify-center shadow-lg hover:bg-sky-400 transition-all active:scale-95"
        >
          {isPlaying
            ? <Pause size={32} fill="currentColor" />
            : <Play size={32} fill="currentColor" className="ml-1" />
          }
        </button>
      </div>

      {/* Next phase hint */}
      <div className="mt-8 text-center text-slate-500 text-sm h-6">
        {phaseIndex < currentCycle.length - 1 ? (
          <span>
            Next: <span className={PHASE_UI[currentCycle[phaseIndex + 1].type].color}>
              {PHASE_UI[currentCycle[phaseIndex + 1].type].text}
            </span>
          </span>
        ) : (
          cycleIndex < exercise.cycles.length - 1
            ? <span>Next Cycle Coming Up...</span>
            : null
        )}
      </div>

      {/* iOS background audio note */}
      <p className="mt-6 text-center text-[10px] text-slate-600 px-6">
        Android: chimes play with screen off. iPhone: keep screen on for audio.
      </p>
    </div>
  );
}
