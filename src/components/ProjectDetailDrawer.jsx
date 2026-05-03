import React, { useEffect } from 'react';
import {
  calculateTotalDuration, formatDurationShort, formatDuration,
  countActiveDays, getWorkingDays, formatDateRelative, formatTimeRange,
} from '../utils/timeUtils';

export default function ProjectDetailDrawer({ project, filteredSessions, currency, onClose }) {
  const projectSessions = filteredSessions
    .filter(s => s.projectId === project.id)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const totalMs = calculateTotalDuration(projectSessions);
  const activeDays = countActiveDays(projectSessions);
  const avgSessionMs = projectSessions.length > 0 ? totalMs / projectSessions.length : 0;
  const billable = (totalMs / 3600000) * (project.hourlyRate || 0);
  const workingDays = getWorkingDays(projectSessions).slice(0, 7);
  const recentSessions = projectSessions.slice(0, 8);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Scroll kilitle
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full sm:w-[440px] bg-surface h-full flex flex-col shadow-2xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div
          className="flex items-start gap-3 p-5 border-b border-outline-variant/20"
          style={{ borderTopColor: project.color, borderTopWidth: 3 }}
        >
          <button
            onClick={onClose}
            className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-lg font-bold text-on-surface truncate">{project.name}</h2>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: project.color + '20', color: project.color }}
              >
                {project.type || 'General'}
              </span>
            </div>
            {project.clientName && (
              <p className="text-sm text-on-surface-variant mt-0.5">{project.clientName}</p>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Time', value: formatDurationShort(totalMs), icon: 'schedule' },
              { label: 'Sessions', value: projectSessions.length, icon: 'history' },
              { label: 'Avg. Session', value: formatDurationShort(avgSessionMs), icon: 'avg_time' },
              { label: 'Active Days', value: activeDays, icon: 'calendar_today' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-surface-container rounded-xl p-3 border border-outline-variant/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{icon}</span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
                </div>
                <p className="text-lg font-bold text-on-surface font-mono-tabular">{value}</p>
              </div>
            ))}
          </div>

          {/* Billable */}
          {project.hourlyRate > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary-fixed/30 border border-primary/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                <span className="text-sm font-semibold text-on-surface">Billable Amount</span>
              </div>
              <span className="text-base font-bold text-primary">
                {currency}{Math.round(billable).toLocaleString()}
              </span>
            </div>
          )}

          {projectSessions.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">history</span>
              <p className="text-sm text-on-surface-variant">No sessions in this period</p>
            </div>
          ) : (
            <>
              {/* Working Days */}
              {workingDays.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                    Working Days
                  </h3>
                  <div className="space-y-2">
                    {workingDays.map(day => (
                      <div
                        key={day.dateString}
                        className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-on-surface">{day.formattedDate}</p>
                            <p className="text-xs text-on-surface-variant">{day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono-tabular text-primary">
                          {formatDurationShort(day.totalMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                  Recent Sessions
                </h3>
                <div className="space-y-2">
                  {recentSessions.map(session => {
                    const dur = session.duration || (
                      session.endTime
                        ? new Date(session.endTime) - new Date(session.startTime)
                        : 0
                    );
                    return (
                      <div
                        key={session.id}
                        className="flex items-start justify-between gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/10"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface-variant">
                            {formatDateRelative(session.startTime)}
                            <span className="font-normal mx-1">·</span>
                            {formatTimeRange(session.startTime, session.endTime)}
                          </p>
                          {session.description && (
                            <p className="text-sm text-on-surface mt-0.5 truncate">{session.description}</p>
                          )}
                        </div>
                        <span className="text-sm font-bold font-mono-tabular text-primary shrink-0">
                          {formatDurationShort(dur)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
