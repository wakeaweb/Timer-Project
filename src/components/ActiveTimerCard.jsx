import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDuration } from '../utils/timeUtils';

/**
 * Dashboard'daki yeşil zamanlayıcı kartı
 * compact=true: küçük versiyon (tek sütun, Row 3 col-3 için)
 */
export default function ActiveTimerCard({ compact = false }) {
  const { activeSession, projects, pauseTimer, resumeTimer, stopTimer } = useApp();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }

    if (activeSession.isPaused) {
      setElapsed(activeSession.accumulatedMs);
      return;
    }

    const update = () => {
      const now = Date.now();
      const lastResumedAt = activeSession.lastResumedAt || new Date(activeSession.startTime).getTime();
      setElapsed(activeSession.accumulatedMs + (now - lastResumedAt));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ─── Empty State ───
  if (!activeSession) {
    return (
      <div className={`bg-gradient-to-br from-primary-fixed to-primary-fixed-dim rounded-2xl flex flex-col items-center justify-center h-full ${compact ? 'p-5 min-h-[200px]' : 'p-8 min-h-[200px]'}`}>
        <span className={`material-symbols-outlined text-primary mb-2 ${compact ? 'text-[32px]' : 'text-[40px]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          timer
        </span>
        <p className={`text-on-surface font-semibold mb-1 ${compact ? 'text-base' : 'text-lg'}`}>No Active Timer</p>
        <p className="text-on-surface-variant text-xs mb-3">Start tracking time on a project</p>
        <button
          onClick={() => navigate('/projects')}
          className="bg-primary text-on-primary px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-primary/90 transition-all"
        >
          Browse Projects
        </button>
      </div>
    );
  }

  const project = projects.find(p => p.id === activeSession.projectId);
  const startedAt = new Date(activeSession.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleToggle = () => {
    if (activeSession.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  // ─── Compact Version ───
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 lg:p-7 text-on-primary relative overflow-hidden h-full flex flex-col justify-center min-h-[300px]">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />

        <div className="relative z-10 flex flex-col justify-center h-full gap-5">
          <div>
            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              {activeSession.isPaused ? (
                <span className="material-symbols-outlined text-[14px] text-on-primary/80">pause</span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse-dot" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-widest text-on-primary/80">
                {activeSession.isPaused ? 'Paused' : 'Active'}
              </span>
            </div>

            {/* Project name */}
            <h3 className="font-headline text-xl font-bold text-on-primary mb-1 truncate">
              {project?.name || 'Unknown Project'}
            </h3>
            <p className="text-sm text-on-primary/70">
              {project?.clientName || 'Working...'}
            </p>
          </div>

          <div>
            {/* Timer */}
            <p className="font-headline text-4xl lg:text-5xl font-bold font-mono-tabular tracking-tight text-on-primary mb-1">
              {formatDuration(elapsed)}
            </p>
            <p className="text-xs text-on-primary/60">Started {startedAt}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-2">
            <button
              id="btn-dashboard-toggle"
              onClick={handleToggle}
              className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border border-white/20 flex-1"
            >
              <span className="material-symbols-outlined text-[18px]">
                {activeSession.isPaused ? 'play_arrow' : 'pause'}
              </span>
              {activeSession.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              id="btn-dashboard-stop"
              onClick={() => stopTimer()}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border border-white/15 flex-1"
            >
              <span className="material-symbols-outlined text-[18px]">stop_circle</span>
              Stop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full Version (original) ───
  return (
    <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 text-on-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {activeSession.isPaused ? (
            <span className="material-symbols-outlined text-[14px] text-on-primary/80">pause</span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse-dot" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-widest text-on-primary/80">
            {activeSession.isPaused ? 'Paused' : 'Active Now'}
          </span>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-headline text-xl font-bold text-on-primary mb-0.5">
              {project?.name || 'Unknown Project'}
            </h3>
            <p className="text-sm text-on-primary/70">
              {project?.description?.slice(0, 50) || 'Working...'}
            </p>
          </div>
          {project && (
            <div className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/15">
              {project.type || 'General'}
            </div>
          )}
        </div>

        {/* Timer */}
        <p className="font-headline text-5xl font-bold font-mono-tabular tracking-tight mb-1 text-on-primary">
          {formatDuration(elapsed)}
        </p>
        <p className="text-xs text-on-primary/60 mb-5">Started at {startedAt}</p>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            id="btn-dashboard-toggle"
            onClick={handleToggle}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full text-sm font-semibold transition-all border border-white/20"
          >
            <span className="material-symbols-outlined text-[18px]">
              {activeSession.isPaused ? 'play_arrow' : 'pause'}
            </span>
            {activeSession.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            id="btn-dashboard-stop"
            onClick={() => {
              stopTimer();
              // no modal here, can add description from project page
            }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-semibold transition-all border border-white/15"
          >
            <span className="material-symbols-outlined text-[18px]">stop_circle</span>
            Stop
          </button>
          <button
            id="btn-dashboard-view"
            onClick={() => navigate(`/project/${activeSession.projectId}`)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-semibold transition-all border border-white/15 ml-auto"
          >
            View
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
