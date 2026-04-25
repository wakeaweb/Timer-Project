import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TimerDisplay from '../components/TimerDisplay';
import StatCard from '../components/StatCard';
import SessionTable from '../components/SessionTable';
import TaskList from '../components/TaskList';
import SessionDescriptionModal from '../components/SessionDescriptionModal';
import {
  calculateTotalDuration, formatDurationShort, countActiveDays, formatDate, getWorkingDays, msToHours
} from '../utils/timeUtils';

export default function TimerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, sessions, activeSession, startTimer, pauseTimer, resumeTimer, stopTimer, completeProject } = useApp();

  const [activeTab, setActiveTab] = useState('tasks');
  const [modalOpen, setModalOpen] = useState(false);
  const [stoppedSessionId, setStoppedSessionId] = useState(null);

  const project = projects.find(p => p.id === id);
  const projectSessions = sessions
    .filter(s => s.projectId === id)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-on-surface font-semibold text-lg">Project not found</p>
        <button onClick={() => navigate('/projects')} className="text-primary font-semibold text-sm mt-2">
          Back to Projects
        </button>
      </div>
    );
  }

  const isActiveProject = activeSession?.projectId === id;
  const isCompleted = project.status === 'completed';
  const totalMs = calculateTotalDuration(projectSessions) + (isActiveProject ? activeSession.accumulatedMs : 0);
  const activeDays = countActiveDays(projectSessions);
  const workingDays = getWorkingDays(projectSessions);

  const handleStart = () => startTimer(id);
  const handlePause = () => pauseTimer();
  const handleResume = () => resumeTimer();
  
  const handleStop = () => {
    const sessionId = stopTimer();
    if (sessionId) {
      setStoppedSessionId(sessionId);
      setModalOpen(true);
    }
  };

  const handleMinify = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert("Sizin tarayıcınız Picture-in-Picture (Minify) özelliğini desteklemiyor. (Sadece Chrome 116+ destekler).");
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 300,
        height: 150,
      });

      // PiP penceresine stil ekle
      const style = document.createElement('style');
      style.textContent = `
        body { 
          margin: 0; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          background-color: ${project.color}; 
          color: white; 
          font-family: monospace; 
          font-size: 3rem; 
          font-weight: bold;
          overflow: hidden;
        }
      `;
      pipWindow.document.head.appendChild(style);

      // Sayaç elementini oluştur
      const timerElement = document.createElement('div');
      pipWindow.document.body.appendChild(timerElement);

      // Başlangıç değerini ayarla
      let currentMs = activeSession?.accumulatedMs || 0;
      let lastTime = Date.now();

      const updateTimer = () => {
        if (!activeSession?.isPaused && activeSession?.startTime) {
           const now = Date.now();
           const lastResumedAt = activeSession.lastResumedAt || new Date(activeSession.startTime).getTime();
           currentMs = activeSession.accumulatedMs + (now - lastResumedAt);
        } else {
           currentMs = activeSession?.accumulatedMs || 0;
        }

        const totalSeconds = Math.floor(currentMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      pipWindow.addEventListener('pagehide', () => {
        clearInterval(interval);
      });
      
    } catch (err) {
      console.error("PiP açılamadı:", err);
      alert("Minify özelliği başlatılırken bir hata oluştu.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Project Header */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1 flex items-center gap-2">
          {project.name}
          {isCompleted && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
              Completed
            </span>
          )}
        </h1>
        <p className="text-sm text-on-surface-variant max-w-xl">
          {project.description || 'No description'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-8">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '60%' }} />
      </div>

      {/* Timer + Side Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Timer Card */}
        <div className="col-span-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 flex flex-col items-center justify-center relative">
          
          {/* Minify Button */}
          <button 
            onClick={handleMinify}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors text-on-surface-variant"
            title="Minify (Picture-in-Picture)"
          >
            <span className="material-symbols-outlined text-[18px]">picture_in_picture_alt</span>
          </button>

          {isActiveProject ? (
            <div className="flex flex-col items-center">
              {activeSession.isPaused && (
                <span className="text-xs font-semibold uppercase tracking-widest text-tertiary mb-2">Paused</span>
              )}
              {/* Display component calculates real time if not paused */}
              <TimerDisplay 
                startTime={activeSession.isPaused ? new Date().toISOString() : activeSession.startTime} 
                isRunning={!activeSession.isPaused} 
                initialMs={activeSession.accumulatedMs} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
                {isCompleted ? 'Project Completed' : 'Timer Stopped'}
              </p>
              <p className="font-headline text-7xl font-bold font-mono-tabular text-on-surface/30 leading-none">
                00:00<span className="text-4xl">:00</span>
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 mt-8">
            {!isCompleted && (
              <>
                {isActiveProject ? (
                  <>
                    {activeSession.isPaused ? (
                      <button
                        onClick={handleResume}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-tertiary text-on-tertiary hover:bg-tertiary/90 transition-all shadow-card"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={handlePause}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                        Pause
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-error text-on-error hover:bg-error/90 transition-all shadow-card"
                    >
                      <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-card w-full justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Start Working
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Side Stats */}
        <div className="col-span-2 space-y-4">
          <StatCard
            title="Total Time Spent"
            value={formatDurationShort(totalMs)}
            subtitle={`Across ${projectSessions.length} sessions`}
            icon="schedule"
          />
          <StatCard
            title="Days Active"
            value={`${activeDays} Days`}
            subtitle={`Started ${formatDate(project.createdAt)}`}
            icon="calendar_today"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-outline-variant/30 mb-6">
        {[
          { id: 'tasks', label: 'Tasks', icon: 'checklist' },
          { id: 'sessions', label: 'Sessions', icon: 'history' },
          { id: 'days', label: 'Working Days', icon: 'calendar_month' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'tasks' && <TaskList projectId={id} />}
        
        {activeTab === 'sessions' && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
            <SessionTable sessions={projectSessions} />
          </div>
        )}

        {activeTab === 'days' && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
            {workingDays.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">No working days recorded.</div>
            ) : (
              <div className="space-y-4">
                {workingDays.map(day => (
                  <div key={day.dateString} className="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-headline">
                        {new Date(day.dateString).getDate()}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{day.formattedDate}</p>
                        <p className="text-xs text-on-surface-variant">{day.sessions.length} sessions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-tabular font-bold text-primary">{formatDurationShort(day.totalMs)}</p>
                      <p className="text-xs text-on-surface-variant">{msToHours(day.totalMs)} hrs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SessionDescriptionModal 
        isOpen={modalOpen} 
        sessionId={stoppedSessionId} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
}
