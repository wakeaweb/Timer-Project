import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TimerDisplay from '../components/TimerDisplay';
import StatCard from '../components/StatCard';
import SessionTable from '../components/SessionTable';
import TaskList from '../components/TaskList';
import ConfirmDialog from '../components/ConfirmDialog';
import SessionDescriptionModal from '../components/SessionDescriptionModal';
import {
  calculateTotalDuration, msToHours, formatDurationShort,
  formatDateRelative, countActiveDays, formatDate, getWorkingDays,
} from '../utils/timeUtils';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    projects, sessions, activeSession, tasks,
    startTimer, pauseTimer, resumeTimer, stopTimer,
    removeProject, editProject, editSession, completeProject, reopenProject,
  } = useApp();

  const project = projects.find(p => p.id === id);
  const projectSessions = sessions
    .filter(s => s.projectId === id)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const [activeTab, setActiveTab] = useState('tasks');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [stoppedSessionId, setStoppedSessionId] = useState(null);

  if (!project) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
          error_outline
        </span>
        <p className="text-on-surface font-semibold text-lg mb-1">Project not found</p>
        <button
          onClick={() => navigate('/projects')}
          className="text-primary font-semibold text-sm hover:underline mt-2"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const isActiveProject = activeSession?.projectId === id;
  const isCompleted = project.status === 'completed';
  const completedSessions = projectSessions.filter(s => s.endTime);
  const totalMs = calculateTotalDuration(completedSessions) + (isActiveProject ? activeSession.accumulatedMs : 0);
  const totalHours = msToHours(totalMs);
  const activeDays = countActiveDays(projectSessions);
  const workingDays = getWorkingDays(projectSessions);
  const projectTasks = tasks.filter(t => t.projectId === id);
  const estimatedHours = project.estimatedHours || 0;
  const progressPct = estimatedHours > 0 ? Math.min(100, (totalHours / estimatedHours) * 100) : 0;

  const statusColors = {
    active: 'bg-primary-fixed text-on-primary-fixed-variant',
    paused: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    completed: 'bg-surface-container-high text-on-surface-variant',
  };

  const handleDelete = () => {
    removeProject(id);
    navigate('/projects');
  };

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
      alert("Tarayıcınız Picture-in-Picture özelliğini desteklemiyor. (Chrome 116+ gerekli).");
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 120,
      });

      const style = document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, ${project.color}, ${project.color}dd);
          color: white;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }
        .name { padding: 12px 16px 4px; font-size: 13px; font-weight: 600; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .timer { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
        .controls { display: flex; gap: 8px; padding: 8px 16px 12px; justify-content: center; }
        .btn { border: none; background: rgba(255,255,255,0.2); color: white; padding: 6px 16px; border-radius: 999px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; display: flex; align-items: center; gap: 4px; }
        .btn:hover { background: rgba(255,255,255,0.35); }
        .btn.stop { background: rgba(255,60,60,0.5); }
        .btn.stop:hover { background: rgba(255,60,60,0.7); }
      `;
      pipWindow.document.head.appendChild(style);

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = project.name;
      pipWindow.document.body.appendChild(nameEl);

      const timerEl = document.createElement('div');
      timerEl.className = 'timer';
      pipWindow.document.body.appendChild(timerEl);

      const controlsEl = document.createElement('div');
      controlsEl.className = 'controls';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn';
      toggleBtn.textContent = activeSession?.isPaused ? '▶ Resume' : '⏸ Pause';

      const stopBtn = document.createElement('button');
      stopBtn.className = 'btn stop';
      stopBtn.textContent = '⏹ Stop';

      controlsEl.appendChild(toggleBtn);
      controlsEl.appendChild(stopBtn);
      pipWindow.document.body.appendChild(controlsEl);

      // Button actions via BroadcastChannel
      const channel = new BroadcastChannel('terra_time_pip');

      toggleBtn.addEventListener('click', () => {
        channel.postMessage({ type: 'TOGGLE' });
        toggleBtn.textContent = toggleBtn.textContent.includes('Pause') ? '▶ Resume' : '⏸ Pause';
      });

      stopBtn.addEventListener('click', () => {
        channel.postMessage({ type: 'STOP' });
        pipWindow.close();
      });

      // Listen for commands from main window
      const mainChannel = new BroadcastChannel('terra_time_pip');
      mainChannel.onmessage = (e) => {
        if (e.data.type === 'TOGGLE') {
          if (activeSession?.isPaused) resumeTimer(); else pauseTimer();
        }
        if (e.data.type === 'STOP') {
          handleStop();
        }
      };

      let currentMs = activeSession?.accumulatedMs || 0;

      const updateTimer = () => {
        if (!activeSession?.isPaused && activeSession?.startTime) {
          const now = Date.now();
          const lastResumedAt = activeSession.lastResumedAt || new Date(activeSession.startTime).getTime();
          currentMs = activeSession.accumulatedMs + (now - lastResumedAt);
        } else {
          currentMs = activeSession?.accumulatedMs || 0;
        }
        const totalSeconds = Math.floor(currentMs / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        timerEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      pipWindow.addEventListener('pagehide', () => {
        clearInterval(interval);
        channel.close();
        mainChannel.close();
      });

    } catch (err) {
      console.error("PiP açılamadı:", err);
      alert("Minify özelliği başlatılırken bir hata oluştu.");
    }
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    link.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <Link to="/projects" className="hover:text-primary transition-colors">
          Projects
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface font-medium truncate">{project.name}</span>
      </nav>

      {/* ──────────────── SECTION 1: Header ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between my-4 lg:my-8 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <h1 className="font-headline text-xl sm:text-2xl lg:text-[2rem] font-bold text-on-surface">
              {project.name}
            </h1>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusColors[project.status]}`}>
              {isActiveProject && !activeSession.isPaused ? 'RUNNING' : project.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm text-on-surface-variant flex-wrap">
            {project.clientName && <span>{project.clientName}</span>}
            {project.clientName && project.type && <span>·</span>}
            {project.type && (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: project.color + '20', color: project.color }}>
                {project.type}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {project.status === 'active' && (
            <>
              {!isActiveProject && (
                <button
                  id="btn-start-timer"
                  onClick={handleStart}
                  className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Start
                </button>
              )}
              <button
                id="btn-edit-project"
                onClick={() => navigate(`/project/${project.id}/edit`)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                id="btn-complete-project"
                onClick={() => completeProject(project.id)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold bg-on-surface text-inverse-on-surface hover:bg-on-surface/90 transition-all"
              >
                <span className="hidden sm:inline">Complete</span>
                <span className="sm:hidden material-symbols-outlined text-[16px]">check</span>
              </button>
            </>
          )}
          {project.status === 'completed' && (
            <button
              onClick={() => reopenProject(project.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reopen
            </button>
          )}
          <button
            id="btn-delete-project"
            onClick={() => setShowDeleteDialog(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-error hover:bg-error-container transition-colors"
            title="Delete project"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {estimatedHours > 0 && (
        <div className="mb-6">
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            {totalHours} / {estimatedHours} hrs ({Math.round(progressPct)}%)
          </p>
        </div>
      )}

      {/* ──────────────── SECTION 2: Timer + Stats ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {/* Active Session Card */}
        <div className="sm:col-span-2 lg:col-span-1 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-center relative">
          {/* Minify Button */}
          {isActiveProject && (
            <button
              onClick={handleMinify}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors text-on-surface-variant"
              title="Minify (Picture-in-Picture)"
            >
              <span className="material-symbols-outlined text-[16px]">picture_in_picture_alt</span>
            </button>
          )}

          {isActiveProject ? (
            <div className="flex flex-col items-center">
              <TimerDisplay
                startTime={activeSession.isPaused ? new Date().toISOString() : (activeSession.lastResumedAt ? new Date(activeSession.lastResumedAt).toISOString() : activeSession.startTime)}
                isRunning={!activeSession.isPaused}
                initialMs={activeSession.accumulatedMs}
                isPaused={activeSession.isPaused}
              />
              {/* Controls */}
              <div className="flex items-center gap-3 mt-4">
                {activeSession.isPaused ? (
                  <button
                    onClick={handleResume}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-tertiary text-on-tertiary hover:bg-tertiary/90 transition-all shadow-card"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">pause</span>
                    Pause
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-error text-on-error hover:bg-error/90 transition-all shadow-card"
                >
                  <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                {isCompleted ? 'Project Completed' : 'No Active Session'}
              </p>
              <p className="font-headline text-4xl lg:text-5xl font-bold font-mono-tabular text-on-surface/20 leading-none">
                00:00<span className="text-2xl lg:text-3xl">:00</span>
              </p>
              {!isCompleted && (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-card mt-4"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  Start Working
                </button>
              )}
            </div>
          )}
        </div>

        {/* Total Time */}
        <StatCard
          title="Total Time Spent"
          value={<>{totalHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle={`${completedSessions.length} sessions completed`}
          icon="schedule"
        />

        {/* Days Active */}
        <StatCard
          title="Days Active"
          value={`${activeDays}`}
          subtitle={`Started ${formatDate(project.createdAt)}`}
          icon="calendar_today"
        />
      </div>

      {/* ──────────────── SECTION 3: Tabs ──────────────── */}
      <div className="flex gap-2 sm:gap-4 border-b border-outline-variant/30 mb-4 lg:mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'tasks', label: 'Tasks', icon: 'checklist', count: projectTasks.length },
          { id: 'sessions', label: 'Sessions', icon: 'history', count: completedSessions.length },
          { id: 'days', label: 'Days', icon: 'calendar_month', count: workingDays.length },
          ...(project.files?.length > 0 ? [{ id: 'files', label: 'Files', icon: 'attach_file', count: project.files.length }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 pb-3 px-1.5 sm:px-2 text-xs sm:text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'tasks' && <TaskList projectId={id} />}

        {activeTab === 'sessions' && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-3 sm:p-6">
            <SessionTable
              sessions={projectSessions}
              onEditSession={(sessionId, updates) => editSession(sessionId, updates)}
            />
          </div>
        )}

        {activeTab === 'days' && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-3 sm:p-6">
            {workingDays.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">No working days recorded.</div>
            ) : (
              <div className="space-y-3">
                {workingDays.map(day => (
                  <div key={day.dateString} className="flex items-center justify-between p-3 sm:p-4 bg-surface-container rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-headline text-sm sm:text-base">
                        {new Date(day.dateString).getDate()}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface text-sm sm:text-base">{day.formattedDate}</p>
                        <p className="text-xs text-on-surface-variant">{day.sessions.length} sessions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-tabular font-bold text-primary text-sm sm:text-base">{formatDurationShort(day.totalMs)}</p>
                      <p className="text-xs text-on-surface-variant">{msToHours(day.totalMs)} hrs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && project.files?.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-3 sm:p-6">
            <div className="space-y-2">
              {project.files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/10">
                  <span className="material-symbols-outlined text-[20px] text-primary">description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
                    <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Project?"
        message={`All sessions and data for "${project.name}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <SessionDescriptionModal
        isOpen={modalOpen}
        sessionId={stoppedSessionId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
