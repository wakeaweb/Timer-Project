import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import ProjectDetailDrawer from '../components/ProjectDetailDrawer';
import {
  calculateTotalDuration, msToHours, formatDurationShort,
  getLast7DaysData, getThisWeekSessions, getThisMonthSessions,
  getLast30DaysSessions, countActiveDays,
} from '../utils/timeUtils';

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
];

export default function ReportsPage() {
  const { projects, sessions, settings } = useApp();
  const currency = settings.currency || '₺';

  const [period, setPeriod] = useState('week');
  const [selectedProject, setSelectedProject] = useState(null);

  // Döneme göre filtreli seanslar
  const filteredSessions = useMemo(() => {
    switch (period) {
      case 'week':   return getThisWeekSessions(sessions);
      case 'month':  return getThisMonthSessions(sessions);
      case 'last30': return getLast30DaysSessions(sessions);
      default:       return sessions.filter(s => s.endTime);
    }
  }, [sessions, period]);

  // Proje istatistikleri
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

  const totalMs = calculateTotalDuration(filteredSessions);
  const totalHours = msToHours(totalMs);
  const totalBillable = projectStats.reduce((sum, ps) => sum + ps.billable, 0);
  const activeDays = countActiveDays(filteredSessions);
  const avgDailyHours = activeDays > 0 ? Math.round((totalMs / activeDays / 3600000) * 10) / 10 : 0;
  const chartData = getLast7DaysData(filteredSessions);

  // Donut: proje bazlı süre dağılımı (gerçek veri)
  const donutSegments = projectStats.slice(0, 5).map(ps => ({
    value: ps.ms,
    color: ps.project.color,
    label: ps.project.name,
    displayValue: formatDurationShort(ps.ms),
  }));

  return (
    <div className="max-w-5xl">
      {/* Header + Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="font-headline text-2xl lg:text-[2rem] font-bold text-on-surface">
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {PERIODS.find(p => p.key === period)?.label} overview
          </p>
        </div>

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
      </div>

      {/* Stat Cards — 4 gerçek metrik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard
          title="Total Tracked"
          value={formatDurationShort(totalMs)}
          subtitle={`${filteredSessions.length} sessions`}
          icon="schedule"
        />
        <StatCard
          title="Billable Amount"
          value={totalBillable > 0 ? `${currency}${Math.round(totalBillable).toLocaleString()}` : '—'}
          subtitle={totalBillable > 0 ? `${projectStats.filter(ps => ps.project.hourlyRate > 0).length} billable projects` : 'No hourly rate set'}
          icon="payments"
        />
        <StatCard
          title="Active Days"
          value={activeDays}
          subtitle={period === 'all' ? 'All time' : PERIODS.find(p => p.key === period)?.label}
          icon="calendar_today"
        />
        <StatCard
          title="Avg. Daily"
          value={<>{avgDailyHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle={activeDays > 0 ? `over ${activeDays} day${activeDays !== 1 ? 's' : ''}` : 'No data yet'}
          icon="bar_chart"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3">
          <BarChart data={chartData} title="Last 7 Days" />
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
              {projectStats.length} active project{projectStats.length !== 1 ? 's' : ''}
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
            {projectStats.map(({ project, hours, ms, billable }) => {
              const maxMs = projectStats[0].ms;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="w-full text-left group rounded-xl p-3 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{project.name}</p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {project.clientName || 'No client'}
                          {project.hourlyRate > 0 && ` · ${currency}${Math.round(billable).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-on-surface">{formatDurationShort(ms)}</span>
                      <span className="material-symbols-outlined text-[16px] text-outline-variant group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(ms / maxMs) * 100}%`, backgroundColor: project.color }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Detail Drawer */}
      {selectedProject && (
        <ProjectDetailDrawer
          project={selectedProject}
          filteredSessions={filteredSessions}
          currency={currency}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
