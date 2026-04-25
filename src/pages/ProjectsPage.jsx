import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { msToHours, calculateTotalDuration, formatDuration } from '../utils/timeUtils';

// Mini timer component
function InlineTimer({ session }) {
  const [elapsed, setElapsed] = useState(session.accumulatedMs);

  useEffect(() => {
    if (session.isPaused) {
      setElapsed(session.accumulatedMs);
      return;
    }
    const update = () => {
      const now = Date.now();
      const lastResumedAt = session.lastResumedAt || new Date(session.startTime).getTime();
      setElapsed(session.accumulatedMs + (now - lastResumedAt));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return <span className="font-mono-tabular tracking-wide">{formatDuration(elapsed)}</span>;
}

export default function ProjectsPage() {
  const { projects, sessions, activeSession, removeProject, startTimer, pauseTimer, resumeTimer, stopTimer } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);

  const filtered = projects.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const counts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const getProjectHours = (projectId) => {
    const projectSessions = sessions.filter(s => s.projectId === projectId && s.endTime);
    return msToHours(calculateTotalDuration(projectSessions));
  };

  const getStatus = (project) => {
    if (project.status === 'completed') return { label: 'COMPLETED', color: 'bg-surface-container-high text-on-surface-variant' };
    if (activeSession?.projectId === project.id && !activeSession.isPaused) return { label: 'RUNNING', color: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' };
    if (activeSession?.projectId === project.id && activeSession.isPaused) return { label: 'PAUSED', color: 'bg-error-container text-on-error-container' };
    const projectSessions = sessions.filter(s => s.projectId === project.id);
    if (projectSessions.length === 0) return { label: 'DRAFT', color: 'bg-surface-container-highest text-on-surface-variant' };
    return { label: 'IN PROGRESS', color: 'bg-primary-fixed text-on-primary-fixed-variant' };
  };

  const handleDelete = () => {
    if (deleteId) {
      removeProject(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mt-4 mb-8">
        <div>
          <h1 className="font-headline text-[2rem] font-bold text-on-surface">Projects</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Manage your projects and track progress
          </p>
        </div>
        <button
          id="btn-new-project"
          onClick={() => navigate('/new-project')}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/90 transition-all shadow-card hover:shadow-lg active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Project
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-container rounded-xl p-1">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${filter === f
                ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
              }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Project List (Table) */}
      {sorted.length > 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/30 bg-surface-container/50">
                <th className="py-3 pl-5 pr-4">Project</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4 text-right">Hours</th>
                <th className="py-3 pr-4 text-right">Status</th>
                <th className="py-3 pr-5 text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(project => {
                const hours = getProjectHours(project.id);
                const status = getStatus(project);
                return (
                  <tr
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="border-b border-outline-variant/15 hover:bg-surface-container-low/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                            {project.name}
                          </p>
                          {project.estimatedHours > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1 w-20 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(100, (hours / project.estimatedHours) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-on-surface-variant">
                                {Math.round((hours / project.estimatedHours) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-sm text-on-surface-variant">{project.clientName || '—'}</span>
                    </td>
                    <td className="py-4 pr-4">
                      {project.type ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: project.color + '15', color: project.color }}>
                          {project.type}
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className="font-mono-tabular text-sm font-semibold text-on-surface">
                        {hours}<span className="text-xs font-normal text-on-surface-variant ml-0.5">h</span>
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      {activeSession?.projectId === project.id && !activeSession.isPaused ? (
                        <span className={`text-[12px] font-semibold tracking-wider px-2.5 py-1 rounded-full ${status.color}`}>
                          <InlineTimer session={activeSession} />
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      {activeSession?.projectId === project.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => activeSession.isPaused ? resumeTimer() : pauseTimer()}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSession.isPaused
                                ? 'bg-tertiary text-on-tertiary hover:bg-tertiary/90'
                                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                              }`}
                            title={activeSession.isPaused ? 'Resume' : 'Pause'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {activeSession.isPaused ? 'play_arrow' : 'pause'}
                            </span>
                          </button>
                          <button
                            onClick={() => stopTimer()}
                            className="w-8 h-8 rounded-full bg-error/10 text-error hover:bg-error/20 flex items-center justify-center transition-colors"
                            title="Stop"
                          >
                            <span className="material-symbols-outlined text-[16px]">stop</span>
                          </button>
                        </div>
                      ) : (
                        project.status === 'active' && (
                          <button
                            onClick={() => startTimer(project.id)}
                            className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors"
                            title="Start"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
            folder_off
          </span>
          <p className="text-on-surface font-semibold text-lg mb-1">No projects found</p>
          <p className="text-on-surface-variant text-sm mb-4">
            {filter !== 'all' ? 'Try a different filter' : 'Create your first project to get started'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => navigate('/new-project')}
              className="bg-primary text-on-primary px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Create Project
            </button>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Project?"
        message="All sessions and data for this project will be permanently deleted. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
