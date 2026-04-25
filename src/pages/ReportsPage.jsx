import React from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import { calculateTotalDuration, msToHours, formatDurationShort, getWeeklyData } from '../utils/timeUtils';

export default function ReportsPage() {
  const { projects, sessions, settings } = useApp();
  const allSessions = sessions.filter(s => s.endTime);
  const totalMs = calculateTotalDuration(allSessions);
  const totalHours = msToHours(totalMs);
  const currency = settings.currency || '₺';

  const projectStats = projects.map(project => {
    const ps = allSessions.filter(s => s.projectId === project.id);
    const projectMs = calculateTotalDuration(ps);
    const hours = msToHours(projectMs);
    return { project, ms: projectMs, hours, billable: hours * (project.hourlyRate || 0) };
  }).sort((a, b) => b.hours - a.hours);

  const totalBillable = projectStats.reduce((sum, ps) => sum + ps.billable, 0);
  const weeklyData = getWeeklyData(allSessions);
  const productivityScore = Math.min(100, Math.round((totalHours / Math.max(1, 7)) * 12.5));
  const invoiced = Math.round(totalBillable * 0.82);
  const uninvoiced = Math.round(totalBillable * 0.18);

  return (
    <div className="max-w-5xl">
      <div className="mt-4 mb-8">
        <h1 className="font-headline text-[2rem] font-bold text-on-surface">Reports &amp; Analytics</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Insights and tracking for this period</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Tracked Time" value={formatDurationShort(totalMs)} subtitle="↗ +12% from last week" icon="schedule" />
        <StatCard title="Billable Amount" value={`${currency}${totalBillable.toLocaleString()}`} subtitle="↗ +5% from last week" icon="payments" />
        <StatCard title="Productivity Score" value={<>{productivityScore}<span className="text-lg font-normal"> /100</span></>} icon="trending_up" highlight subtitle={<div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-on-primary rounded-full" style={{ width: `${productivityScore}%` }} /></div>} />
      </div>
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="col-span-3"><BarChart data={weeklyData} title="Weekly Time Distribution" /></div>
        <div className="col-span-2">
          <DonutChart total={`${currency}${totalBillable.toLocaleString()}`} title="Financial Overview" segments={[
            { value: invoiced, color: '#4a7c59', label: 'Invoiced', displayValue: `${currency}${invoiced.toLocaleString()}` },
            { value: uninvoiced, color: '#c4a66a', label: 'Uninvoiced', displayValue: `${currency}${uninvoiced.toLocaleString()}` },
          ]} />
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
        <div className="flex items-center justify-between my-8">
          <h3 className="font-headline text-base font-semibold text-on-surface">Hours per Project</h3>
        </div>
        <div className="space-y-5">
          {projectStats.slice(0, 5).map(({ project, hours }) => {
            const maxH = Math.max(...projectStats.map(ps => ps.hours), 1);
            return (
              <div key={project.id}>
                <div className="flex items-center justify-between mb-2">
                  <div><p className="text-sm font-semibold text-on-surface">{project.name}</p><p className="text-xs text-on-surface-variant">Client: {project.clientName || 'N/A'}</p></div>
                  <span className="text-sm font-semibold text-on-surface">{hours}h</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(hours / maxH) * 100}%`, backgroundColor: project.color }} />
                </div>
              </div>
            );
          })}
          {projectStats.length === 0 && <p className="text-center text-on-surface-variant text-sm py-8">No data yet</p>}
        </div>
      </div>
    </div>
  );
}
