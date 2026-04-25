import React, { useState, useEffect } from 'react';
import { formatDuration } from '../utils/timeUtils';

/**
 * Büyük zamanlayıcı sayacı — TimerPage'de kullanılır
 */
export default function TimerDisplay({ startTime, isRunning = true, initialMs = 0, isPaused = false }) {
  const [elapsed, setElapsed] = useState(initialMs);

  useEffect(() => {
    // If not running, just show the accumulated time
    if (!isRunning) {
      setElapsed(initialMs);
      return;
    }

    if (!startTime) return;
    
    const update = () => {
      setElapsed(initialMs + (Date.now() - new Date(startTime).getTime()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRunning, initialMs]);

  const formatted = formatDuration(elapsed);
  const [hours, minutes, seconds] = formatted.split(':');

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
        Active Session {isPaused && <span className="text-tertiary lowercase normal-case">(Paused)</span>}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="font-headline text-6xl md:text-7xl font-bold font-mono-tabular text-on-surface leading-none">
          {hours}
        </span>
        <span className="font-headline text-6xl md:text-7xl font-bold text-on-surface-variant/40 leading-none">
          :
        </span>
        <span className="font-headline text-6xl md:text-7xl font-bold font-mono-tabular text-on-surface leading-none">
          {minutes}
        </span>
        <span className="font-headline text-3xl md:text-4xl font-bold text-on-surface-variant/60 leading-none self-end mb-2">
          :{seconds}
        </span>
      </div>
    </div>
  );
}
