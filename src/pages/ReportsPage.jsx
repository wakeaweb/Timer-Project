import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import {
  calculateTotalDuration, msToHours, formatDurationShort, formatDuration,
  getLast7DaysData, getLast30DaysSessions, getThisMonthSessions,
  countActiveDays, formatDate, formatTimeRange, formatDateRelative,
} from '../utils/timeUtils';

const PERIODS = [
  { key: 'last7',  label: 'Last 7 Days' },
  { key: 'month',  label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all',    label: 'All Time' },
];

// ─── Proje bazlı günlük breakdown ────────────────────────────────────────────
function getLast7DaysProjectData(sessions, projects) {
  const result = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const daySessions = sessions.filter(s => {
      if (!s.endTime) return false;
      const d = new Date(s.startTime);
      return d >= dayStart && d < dayEnd;
    });

    const totalMs = calculateTotalDuration(daySessions);

    // Her proje için ms hesapla
    const breakdown = projects
      .map(p => {
        const ps = daySessions.filter(s => s.projectId === p.id);
        const ms = calculateTotalDuration(ps);
        return { color: p.color, name: p.name, ms, hours: msToHours(ms) };
      })
      .filter(b => b.ms > 0)
      .sort((a, b) => b.ms - a.ms);

    result.push({
      day: i === 0 ? 'Today' : i === 1 ? 'Yst' : dayNames[dayStart.getDay()],
      hours: msToHours(totalMs),
      ms: totalMs,
      breakdown,
    });
  }
  return result;
}

// ─── General Tab ─────────────────────────────────────────────────────────────
function GeneralTab({ sessions, projects, settings }) {
  const currency = settings.currency || '₺';
  const [period, setPeriod] = useState('last7');

  const filteredSessions = useMemo(() => {
    switch (period) {
      case 'last7': {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0,0,0,0);
        return sessions.filter(s => s.endTime && new Date(s.startTime) >= cutoff);
      }
      case 'month':  return getThisMonthSessions(sessions);
      case 'last30': return getLast30DaysSessions(sessions);
      default:       return sessions.filter(s => s.endTime);
    }
  }, [sessions, period]);

  const projectStats = useMemo(() =>
    projects
      .map(project => {
        const ps = filteredSessions.filter(s => s.projectId === project.id);
        const ms = calculateTotalDuration(ps);
        const hours = msToHours(ms);
        const billable = hours * (project.hourlyRate || 0);
        return { project, ms, hours, billable };
      })
      .filter(ps => ps.ms > 0)
      .sort((a, b) => b.ms - a.ms),
  [projects, filteredSessions]);

  const totalMs       = calculateTotalDuration(filteredSessions);
  const totalBillable = projectStats.reduce((sum, ps) => sum + ps.billable, 0);
  const activeDays    = countActiveDays(filteredSessions);
  const avgDailyHours = activeDays > 0 ? Math.round((totalMs / activeDays / 3600000) * 10) / 10 : 0;

  const chartData = getLast7DaysProjectData(sessions.filter(s => s.endTime), projects);

  const donutSegments = projectStats.slice(0, 5).map(ps => ({
    value: ps.ms,
    color: ps.project.color,
    label: ps.project.name,
    displayValue: formatDurationShort(ps.ms),
  }));

  return (
    <div className="space-y-6">
      {/* Period Pills */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              period === p.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Total Tracked"
          value={formatDurationShort(totalMs)}
          subtitle={`${filteredSessions.length} sessions`}
          icon="schedule"
        />
        <StatCard
          title="Billable Amount"
          value={totalBillable > 0 ? `${currency}${Math.round(totalBillable).toLocaleString()}` : '—'}
          subtitle={totalBillable > 0
            ? `${projectStats.filter(ps => ps.project.hourlyRate > 0).length} billable projects`
            : 'No hourly rate set'}
          icon="payments"
        />
        <StatCard
          title="Active Days"
          value={activeDays}
          subtitle={PERIODS.find(p => p.key === period)?.label}
          icon="calendar_today"
        />
        <StatCard
          title="Avg. Daily"
          value={<>{avgDailyHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle={activeDays > 0 ? `over ${activeDays} day${activeDays !== 1 ? 's' : ''}` : 'No data yet'}
          icon="bar_chart"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <BarChart data={chartData} title="Last 7 Days — by Project" />
        </div>
        <div className="lg:col-span-2">
          {donutSegments.length > 0 ? (
            <DonutChart
              total={formatDurationShort(totalMs)}
              title="Time by Project"
              segments={donutSegments}
            />
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">donut_large</span>
              <p className="text-sm text-on-surface-variant text-center">No sessions in this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Project List */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 lg:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline text-base font-semibold text-on-surface">Hours per Project</h3>
          {projectStats.length > 0 && (
            <span className="text-xs text-on-surface-variant">
              {projectStats.length} project{projectStats.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {projectStats.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">bar_chart</span>
            <p className="text-on-surface-variant text-sm">No tracked time in this period</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projectStats.map(({ project, ms, billable }) => {
              const maxMs = projectStats[0].ms;
              return (
                <div key={project.id} className="rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{project.name}</p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {project.clientName || 'No client'}
                          {project.hourlyRate > 0 && ` · ${currency}${Math.round(billable).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-on-surface shrink-0">{formatDurationShort(ms)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(ms / maxMs) * 100}%`, backgroundColor: project.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project Tab ─────────────────────────────────────────────────────────────
function ProjectTab({ sessions, projects, settings }) {
  const currency = settings.currency || '₺';
  const allSessions = sessions.filter(s => s.endTime);

  const [selectedId, setSelectedId] = useState(projects[0]?.id || '');
  const project = projects.find(p => p.id === selectedId);

  const projectSessions = useMemo(() =>
    allSessions
      .filter(s => s.projectId === selectedId)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
  [allSessions, selectedId]);

  const totalMs      = calculateTotalDuration(projectSessions);
  const totalHours   = msToHours(totalMs);
  const hourlyRate   = project?.hourlyRate || 0;
  const totalAmount  = totalHours * hourlyRate;

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">folder_open</span>
        <p className="text-on-surface-variant text-sm">No projects found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: project?.color || '#888' }}
          />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` — ${p.clientName}` : ''}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">
            expand_more
          </span>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden">
        {/* Invoice Header */}
        <div className="p-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="font-headline text-base font-semibold text-on-surface">{project?.name}</p>
            {project?.clientName && (
              <p className="text-xs text-on-surface-variant mt-0.5">{project.clientName}</p>
            )}
          </div>
          <div className="text-right">
            {hourlyRate > 0 && (
              <p className="text-xs text-on-surface-variant">Rate: <span className="font-semibold text-on-surface">{currency}{hourlyRate}/hr</span></p>
            )}
            <p className="text-xs text-on-surface-variant mt-0.5">
              {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''} · {formatDurationShort(totalMs)}
            </p>
          </div>
        </div>

        {projectSessions.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">history</span>
            <p className="text-on-surface-variant text-sm">No sessions recorded for this project</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="bg-surface-container text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Duration</th>
                    <th className="px-3 py-3 flex-1">Description</th>
                    {hourlyRate > 0 && <>
                      <th className="px-3 py-3 text-right">Rate</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {projectSessions.map((session, i) => {
                    const dur = session.duration || (
                      session.endTime
                        ? new Date(session.endTime) - new Date(session.startTime)
                        : 0
                    );
                    const sessionHours = dur / 3600000;
                    const amount = sessionHours * hourlyRate;

                    return (
                      <tr
                        key={session.id}
                        className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-on-surface whitespace-nowrap">
                            {formatDateRelative(session.startTime)}
                          </p>
                          <p className="text-xs text-on-surface-variant">{formatDate(session.startTime)}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-xs text-on-surface-variant whitespace-nowrap">
                            {formatTimeRange(session.startTime, session.endTime)}
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-sm font-bold font-mono-tabular text-primary whitespace-nowrap">
                            {formatDurationShort(dur)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 max-w-[200px]">
                          <p className="text-sm text-on-surface truncate">
                            {session.description || <span className="text-on-surface-variant italic">—</span>}
                          </p>
                        </td>
                        {hourlyRate > 0 && <>
                          <td className="px-3 py-3.5 text-right">
                            <span className="text-xs text-on-surface-variant whitespace-nowrap">
                              {currency}{hourlyRate}/hr
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-sm font-semibold text-on-surface whitespace-nowrap">
                              {currency}{Math.round(amount).toLocaleString()}
                            </span>
                          </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Footer */}
            <div className="border-t border-outline-variant/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface-container/50">
              <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                <span><span className="font-semibold text-on-surface">{projectSessions.length}</span> sessions</span>
                <span className="font-bold font-mono-tabular text-on-surface">{formatDurationShort(totalMs)}</span>
              </div>
              {hourlyRate > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {currency}{Math.round(totalAmount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { projects, sessions, settings } = useApp();
  const [activeTab, setActiveTab] = useState('general');

  const TABS = [
    { id: 'general', label: 'General', icon: 'analytics' },
    { id: 'project', label: 'Project', icon: 'folder_open' },
  ];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mt-4 mb-6 lg:mb-8">
        <h1 className="font-headline text-2xl lg:text-[2rem] font-bold text-on-surface">
          Reports &amp; Analytics
        </h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Track your time, measure your impact</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant/30 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 ${
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
        {activeTab === 'general'
          ? <GeneralTab sessions={sessions} projects={projects} settings={settings} />
          : <ProjectTab sessions={sessions} projects={projects} settings={settings} />
        }
      </div>
    </div>
  );
}
