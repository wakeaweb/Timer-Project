import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDuration } from '../utils/timeUtils';

export default function ActiveTimerBanner() {
  const { activeSession, projects, pauseTimer, resumeTimer } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) return;
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

  if (!activeSession) return null;

  const project = projects.find(p => p.id === activeSession.projectId);
  if (!project) return null;

  // Do not show banner if we are already on the project page
  if (location.pathname === `/project/${project.id}`) return null;

  const handleBannerClick = () => {
    navigate(`/project/${project.id}`);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (activeSession.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  return (
    <div 
      onClick={handleBannerClick}
      className="sticky top-0 z-30 w-full h-11 sm:h-12 flex items-center justify-between px-3 sm:px-6 cursor-pointer hover:opacity-95 transition-opacity"
      style={{ backgroundColor: project.color, color: '#fff' }}
    >
      <div className="flex items-center gap-3">
        {!activeSession.isPaused ? (
          <span className="w-2 h-2 rounded-full bg-white animate-pulse-dot" />
        ) : (
          <span className="material-symbols-outlined text-[16px]">pause</span>
        )}
        <span className="font-semibold text-sm">
          {project.name}
        </span>
        {activeSession.isPaused && (
          <span className="text-xs uppercase tracking-widest opacity-80">(Paused)</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono-tabular font-bold tracking-wide">
          {formatDuration(elapsed)}
        </span>
        <button
          onClick={handleToggle}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          title={activeSession.isPaused ? 'Resume' : 'Pause'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {activeSession.isPaused ? 'play_arrow' : 'pause'}
          </span>
        </button>
      </div>
    </div>
  );
}
