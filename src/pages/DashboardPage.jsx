import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActiveTimerCard from '../components/ActiveTimerCard';
import ProjectCard from '../components/ProjectCard';
import {
  msToHours, calculateTotalDuration, getGreeting,
  getTodaySessions, getThisWeekSessions, getThisMonthSessions,
  getLast30DaysSessions, getLastActiveTime, formatDateRelative,
} from '../utils/timeUtils';

export default function DashboardPage() {
  const { projects, sessions, tasks, settings } = useApp();
  const navigate = useNavigate();

  const activeProjects = projects.filter(p => p.status === 'active');

  // ─── Metrics ───
  const todaySessions = getTodaySessions(sessions);
  const todayMs = calculateTotalDuration(todaySessions);
  const todayHours = msToHours(todayMs);
  const todayCount = todaySessions.length;

  const weekMs = calculateTotalDuration(getThisWeekSessions(sessions));
  const weekHours = msToHours(weekMs);

  const monthMs = calculateTotalDuration(getThisMonthSessions(sessions));
  const monthHours = msToHours(monthMs);

  const last30Ms = calculateTotalDuration(getLast30DaysSessions(sessions));
  const last30Hours = msToHours(last30Ms);

  const lastActive = getLastActiveTime(sessions);
  const lastActiveLabel = lastActive ? formatDateRelative(lastActive) : 'Never';
  const lastActiveTime = lastActive
    ? new Date(lastActive).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  // Recent 3 projects
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  // Today's tasks (incomplete tasks from active projects)
  const todayTasks = tasks
    .filter(t => !t.isCompleted && activeProjects.some(p => p.id === t.projectId))
    .slice(0, 4);

  return (
    <div className="max-w-5xl">
      {/* Greeting */}
      <div className="mt-4 mb-8">
        <h1 className="font-headline text-[2rem] font-bold text-on-surface mb-1">
          {getGreeting()}, {settings.userName}.
        </h1>
        <p className="text-on-surface-variant text-sm">
          Here's a look at your earthy endeavor today.
        </p>
      </div>

      {/* ─── Row 1: Today Metrics (3 cards) ─── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard
          title="Today Hours Worked"
          value={<>{todayHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle={todayHours > 0 ? `+${todayHours} hrs today` : 'No sessions today'}
          icon="schedule"
        />
        <StatCard
          title="Today Total Sessions"
          value={todayCount}
          subtitle={todayCount > 0 ? `${todayCount} session${todayCount > 1 ? 's' : ''} completed` : 'Start tracking!'}
          icon="event_note"
        />
        <StatCard
          title="Last Active"
          value={<span className="text-2xl">{lastActiveLabel}{lastActiveTime ? ',' : ''} <span className="text-lg font-normal">{lastActiveTime}</span></span>}
          subtitle="Most recent session"
          icon="update"
        />
      </div>

      {/* ─── Row 2: Period Metrics (3 cards) ─── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          title="This Week Hours"
          value={<>{weekHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle="This week"
          icon="date_range"
        />
        <StatCard
          title="This Month Hours"
          value={<>{monthHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle="This month"
          icon="calendar_month"
        />
        <StatCard
          title="Last 30 Days Hours"
          value={<>{last30Hours} <span className="text-lg font-normal">hrs</span></>}
          subtitle="Last 30 days"
          icon="trending_up"
        />
      </div>

      {/* ─── Row 3: Active Timer + Today's Focus ─── */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="col-span-3">
          <ActiveTimerCard />
        </div>
        <div className="col-span-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
          <h3 className="font-headline text-base font-semibold text-on-surface mb-4">
            Today's Focus
          </h3>
          <div className="space-y-2">
            {todayTasks.length > 0 ? (
              todayTasks.map(task => {
                const taskProject = projects.find(p => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/project/${task.projectId}`)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: taskProject?.color || '#4a7c59' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {taskProject?.name || 'Unknown project'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              activeProjects.slice(0, 3).map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {project.clientName}
                    </p>
                  </div>
                </div>
              ))
            )}
            {activeProjects.length === 0 && todayTasks.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-4">
                No active projects to focus on
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 4: Recent Projects ─── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-semibold text-on-surface">Recent Projects</h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View all
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {recentProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
