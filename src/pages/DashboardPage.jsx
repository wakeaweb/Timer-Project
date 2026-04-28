import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActiveTimerCard from '../components/ActiveTimerCard';
import {
  msToHours, calculateTotalDuration, getGreeting,
  getTodaySessions, getThisWeekSessions, getThisMonthSessions,
  getLast30DaysSessions, getLastActiveTime, formatDateRelative,
  getLast7DaysData,
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

  // Last 7 days chart data
  const last7Days = getLast7DaysData(sessions);
  const maxDayHours = Math.max(...last7Days.map(d => d.hours), 10);

  // Recent projects (up to 10 for list view)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  // Today's tasks (incomplete tasks from active projects)
  const todayTasks = tasks
    .filter(t => !t.isCompleted && activeProjects.some(p => p.id === t.projectId))
    .slice(0, 10);

  return (
    <div className="max-w-5xl">
      {/* Greeting */}
      <div className="mt-4 mb-6 lg:mb-8">
        <h1 className="font-headline text-2xl lg:text-[2rem] font-bold text-on-surface mb-1">
          {getGreeting()}, {settings.userName}.
        </h1>
        <p className="text-on-surface-variant text-sm">
          Here's a look at your earthy endeavor today.
        </p>
      </div>

      {/* ─── Row 1: Today Metrics (3 cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
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
          value={<span className="text-xl lg:text-2xl">{lastActiveLabel}{lastActiveTime ? ',' : ''} <span className="text-base lg:text-lg font-normal">{lastActiveTime}</span></span>}
          subtitle="Most recent session"
          icon="update"
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      {/* ─── Row 2: Period Metrics (3 cards) - Hidden on mobile ─── */}
      <div className="hidden md:grid grid-cols-3 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard
          title="This Week"
          value={<>{weekHours} <span className="text-sm lg:text-lg font-normal">hrs</span></>}
          subtitle="This week"
          icon="date_range"
        />
        <StatCard
          title="This Month"
          value={<>{monthHours} <span className="text-sm lg:text-lg font-normal">hrs</span></>}
          subtitle="This month"
          icon="calendar_month"
        />
        <StatCard
          title="Last 30 Days"
          value={<>{last30Hours} <span className="text-sm lg:text-lg font-normal">hrs</span></>}
          subtitle="Last 30 days"
          icon="trending_up"
        />
      </div>

      {/* ─── Row 3: Last 7 Days Chart (col 1-2) + Active Timer (col 3) ─── */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 mb-6 lg:mb-8">
        {/* Active Timer (compact, col 3) - Moves to top on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          <ActiveTimerCard compact />
        </div>

        {/* Last 7 Days Bar Chart */}
        <div className="order-2 lg:order-1 lg:col-span-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-base font-semibold text-on-surface">Last 7 Days</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {msToHours(last7Days.reduce((s, d) => s + d.ms, 0))} hrs total
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3 h-36 lg:h-44">
            {last7Days.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                {/* Hour label */}
                <span className="text-[10px] lg:text-xs font-semibold text-on-surface-variant h-4 flex items-end">
                  {item.hours > 0 ? `${item.hours}h` : ''}
                </span>
                {/* Bar */}
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className="w-full max-w-[36px] lg:max-w-[44px] rounded-t-lg transition-all duration-500 ease-out"
                    style={{
                      height: item.hours > 0 ? `${Math.max(8, (item.hours / maxDayHours) * 100)}%` : '4px',
                      backgroundColor: item.hours > 0 ? '#4a7c59' : '#e4e0d8',
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                {/* Day label */}
                <span className={`text-[10px] lg:text-xs font-medium h-4 flex items-start ${item.day === 'Today' ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Row 4: Today's Focus (col 1) + Recent Projects list (col 2) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's Focus */}
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 lg:p-6 flex flex-col h-[380px]">
          <h3 className="font-headline text-base font-semibold text-on-surface mb-4 shrink-0">
            Today's Focus
          </h3>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {todayTasks.length > 0 ? (
              todayTasks.map(task => {
                const taskProject = projects.find(p => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/project/${task.projectId}`)}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
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
              activeProjects.slice(0, 5).map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
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

        {/* Recent Projects (list) */}
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 lg:p-6 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-headline text-base font-semibold text-on-surface">Recent Projects</h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
            >
              View all
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {recentProjects.length > 0 ? (
              recentProjects.map(project => {
                const projectSessions = sessions.filter(s => s.projectId === project.id && s.endTime);
                const totalHours = msToHours(calculateTotalDuration(projectSessions));
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {project.clientName || 'No client'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold font-mono-tabular text-on-surface">
                        {totalHours}<span className="text-[10px] font-normal text-on-surface-variant ml-0.5">h</span>
                      </p>
                      <span
                        className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          project.status === 'completed'
                            ? 'bg-surface-container-high text-on-surface-variant'
                            : 'bg-primary-fixed text-on-primary-fixed-variant'
                        }`}
                      >
                        {project.status === 'completed' ? 'Done' : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-[32px] text-outline-variant mb-2">folder_off</span>
                <p className="text-sm text-on-surface-variant">No projects yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
