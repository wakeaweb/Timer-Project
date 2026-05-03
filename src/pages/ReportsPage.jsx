import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import {
  calculateTotalDuration, msToHours, formatDurationShort,
  getLast30DaysSessions, getThisMonthSessions,
  countActiveDays, formatDate, formatDateRelative,
} from '../utils/timeUtils';

const PERIODS = [
  { key: 'last7',  label: 'Last 7 Days' },
  { key: 'month',  label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all',    label: 'All Time' },
];

function filterByPeriod(sessions, period) {
  switch (period) {
    case 'last7': {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0,0,0,0);
      return sessions.filter(s => s.endTime && new Date(s.startTime) >= cutoff);
    }
    case 'month':  return getThisMonthSessions(sessions);
    case 'last30': return getLast30DaysSessions(sessions);
    default:       return sessions.filter(s => s.endTime);
  }
}

// Decimal saat: "3.09 h"
function toDecimalHours(ms) {
  return (ms / 3600000).toFixed(2) + ' h';
}

// ─── Son 7 gün, proje bazlı breakdown ────────────────────────────────────────
function getLast7DaysProjectData(sessions, projects) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
    const daySessions = sessions.filter(s => {
      if (!s.endTime) return false;
      const d = new Date(s.startTime);
      return d >= dayStart && d < dayEnd;
    });
    const totalMs = calculateTotalDuration(daySessions);
    const breakdown = projects
      .map(p => { const ps = daySessions.filter(s => s.projectId === p.id); const ms = calculateTotalDuration(ps); return { color: p.color, name: p.name, ms, hours: msToHours(ms) }; })
      .filter(b => b.ms > 0).sort((a, b) => b.ms - a.ms);
    result.push({ day: i === 0 ? 'Today' : i === 1 ? 'Yst' : dayNames[dayStart.getDay()], hours: msToHours(totalMs), ms: totalMs, breakdown });
  }
  return result;
}

// ─── PDF baskı penceresi ──────────────────────────────────────────────────────
function printProjectInvoice(project, sessions, currency, periodLabel) {
  const totalMs    = calculateTotalDuration(sessions);
  const totalHours = totalMs / 3600000;
  const hourlyRate = project.hourlyRate || 0;
  const totalAmt   = totalHours * hourlyRate;
  const today      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const rows = sessions.map(s => {
    const dur = s.duration || (s.endTime ? new Date(s.endTime) - new Date(s.startTime) : 0);
    const h   = dur / 3600000;
    const amt = h * hourlyRate;
    return `
      <tr>
        <td>${formatDate(s.startTime)}</td>
        <td class="num">${h.toFixed(2)} h</td>
        <td>${s.description || '—'}</td>
        ${hourlyRate > 0 ? `<td class="num">${currency}${Math.round(amt).toLocaleString()}</td>` : ''}
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <title>${project.name} — Session Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 48px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; padding-bottom:24px; border-bottom:2px solid #e5e7eb; }
    .brand { font-size:18px; font-weight:700; color:#333; }
    .brand-sub { font-size:11px; color:#888; margin-top:2px; }
    .project-block { text-align:right; }
    .project-name { font-size:20px; font-weight:700; color:${project.color}; }
    .project-client { font-size:12px; color:#666; margin-top:2px; }
    .meta { display:flex; gap:32px; margin-bottom:28px; }
    .meta-item label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#999; }
    .meta-item p { font-size:13px; font-weight:600; color:#333; margin-top:2px; }
    table { width:100%; border-collapse:collapse; margin-bottom:0; }
    thead tr { background:#f8f9fa; }
    th { text-align:left; padding:10px 12px; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#888; font-weight:600; border-bottom:1px solid #e5e7eb; }
    td { padding:10px 12px; border-bottom:1px solid #f3f4f6; color:#333; font-size:12px; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    .num { text-align:right; font-variant-numeric:tabular-nums; }
    .footer { margin-top:0; padding:14px 12px; background:#f8f9fa; border-top:2px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { font-size:12px; color:#666; }
    .footer-right { text-align:right; }
    .total-label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#999; }
    .total-value { font-size:22px; font-weight:700; color:${project.color}; margin-top:2px; }
    .total-hours { font-size:13px; font-weight:600; color:#333; }
    @media print { body { padding:32px; } }
  </style></head><body>
  <div class="header">
    <div>
      <div class="brand">Time Project</div>
      <div class="brand-sub">Session Report · ${today}</div>
    </div>
    <div class="project-block">
      <div class="project-name">${project.name}</div>
      ${project.clientName ? `<div class="project-client">${project.clientName}</div>` : ''}
    </div>
  </div>
  <div class="meta">
    <div class="meta-item"><label>Period</label><p>${periodLabel}</p></div>
    <div class="meta-item"><label>Sessions</label><p>${sessions.length}</p></div>
    <div class="meta-item"><label>Total Hours</label><p>${totalHours.toFixed(2)} h</p></div>
    ${hourlyRate > 0 ? `<div class="meta-item"><label>Hourly Rate</label><p>${currency}${hourlyRate}</p></div>` : ''}
    ${project.status ? `<div class="meta-item"><label>Status</label><p>${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</p></div>` : ''}
  </div>
  <table>
    <thead><tr>
      <th>Date</th>
      <th class="num">Duration</th>
      <th>Description</th>
      ${hourlyRate > 0 ? '<th class="num">Amount</th>' : ''}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <div class="footer-left">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</div>
    <div class="footer-right">
      <div class="total-hours">${totalHours.toFixed(2)} h total</div>
      ${hourlyRate > 0 ? `<div class="total-label">Total Amount</div><div class="total-value">${currency}${Math.round(totalAmt).toLocaleString()}</div>` : ''}
    </div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
}

// ─── Period Dropdown ──────────────────────────────────────────────────────────
function PeriodDropdown({ period, onChange }) {
  return (
    <div className="relative">
      <select
        value={period}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
      >
        {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface-variant">
        expand_more
      </span>
    </div>
  );
}

// ─── General Tab ─────────────────────────────────────────────────────────────
function GeneralTab({ filteredSessions, projects, currency, period }) {
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
  const chartData     = getLast7DaysProjectData(filteredSessions, projects);
  const donutSegments = projectStats.slice(0, 5).map(ps => ({
    value: ps.ms, color: ps.project.color, label: ps.project.name, displayValue: formatDurationShort(ps.ms),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Tracked" value={formatDurationShort(totalMs)} subtitle={`${filteredSessions.length} sessions`} icon="schedule" />
        <StatCard
          title="Billable Amount"
          value={totalBillable > 0 ? `${currency}${Math.round(totalBillable).toLocaleString()}` : '—'}
          subtitle={totalBillable > 0 ? `${projectStats.filter(ps => ps.project.hourlyRate > 0).length} billable projects` : 'No hourly rate set'}
          icon="payments"
        />
        <StatCard title="Active Days" value={activeDays} subtitle={PERIODS.find(p => p.key === period)?.label} icon="calendar_today" />
        <StatCard
          title="Avg. Daily"
          value={<>{avgDailyHours} <span className="text-lg font-normal">hrs</span></>}
          subtitle={activeDays > 0 ? `over ${activeDays} day${activeDays !== 1 ? 's' : ''}` : 'No data yet'}
          icon="bar_chart"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <BarChart data={chartData} title="Last 7 Days — by Project" />
        </div>
        <div className="lg:col-span-2">
          {donutSegments.length > 0 ? (
            <DonutChart total={formatDurationShort(totalMs)} title="Time by Project" segments={donutSegments} />
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">donut_large</span>
              <p className="text-sm text-on-surface-variant text-center">No sessions in this period</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 lg:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline text-base font-semibold text-on-surface">Hours per Project</h3>
          {projectStats.length > 0 && <span className="text-xs text-on-surface-variant">{projectStats.length} project{projectStats.length !== 1 ? 's' : ''}</span>}
        </div>
        {projectStats.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">bar_chart</span>
            <p className="text-on-surface-variant text-sm">No tracked time in this period</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projectStats.map(({ project, ms, billable }) => (
              <div key={project.id} className="rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{project.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {project.clientName || 'No client'}{project.hourlyRate > 0 && ` · ${currency}${Math.round(billable).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-on-surface shrink-0">{formatDurationShort(ms)}</span>
                </div>
                <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(ms / projectStats[0].ms) * 100}%`, backgroundColor: project.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project Tab ─────────────────────────────────────────────────────────────
const STATUS_LABEL = { active: 'Active', completed: 'Completed', paused: 'Paused' };
const STATUS_COLOR = { active: 'text-primary bg-primary/10', completed: 'text-on-surface-variant bg-surface-container-high', paused: 'text-tertiary bg-tertiary/10' };

function ProjectTab({ filteredSessions, projects, currency, period }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || '');
  const project = projects.find(p => p.id === selectedId);

  const projectSessions = useMemo(() =>
    filteredSessions
      .filter(s => s.projectId === selectedId)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
  [filteredSessions, selectedId]);

  const totalMs    = calculateTotalDuration(projectSessions);
  const totalHours = totalMs / 3600000;
  const hourlyRate = project?.hourlyRate || 0;
  const totalAmt   = totalHours * hourlyRate;
  const periodLabel = PERIODS.find(p => p.key === period)?.label || 'All Time';

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">folder_open</span>
        <p className="text-on-surface-variant text-sm">No projects found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Project Dropdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shrink-0 pointer-events-none" style={{ backgroundColor: project?.color || '#888' }} />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full pl-8 pr-8 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.clientName ? ` — ${p.clientName}` : ''} [{STATUS_LABEL[p.status] || p.status}]
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
        </div>
        {/* Status badge */}
        {project && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[project.status] || ''}`}>
            {STATUS_LABEL[project.status] || project.status}
          </span>
        )}
      </div>

      {/* Invoice Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-headline text-base font-semibold text-on-surface">{project?.name}</p>
            </div>
            {project?.clientName && <p className="text-xs text-on-surface-variant mt-0.5">{project.clientName}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              {hourlyRate > 0 && <p className="text-xs text-on-surface-variant">Rate: <span className="font-semibold text-on-surface">{currency}{hourlyRate}/hr</span></p>}
              <p className="text-xs text-on-surface-variant mt-0.5">{projectSessions.length} sessions · {toDecimalHours(totalMs)}</p>
            </div>
            {projectSessions.length > 0 && (
              <button
                onClick={() => printProjectInvoice(project, projectSessions, currency, periodLabel)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-sm shrink-0"
                title="Save as PDF"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {projectSessions.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">history</span>
            <p className="text-on-surface-variant text-sm">No sessions in this period</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="bg-surface-container text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-3 py-3 text-right">Duration</th>
                    <th className="px-3 py-3">Description</th>
                    {hourlyRate > 0 && <th className="px-5 py-3 text-right">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {projectSessions.map(session => {
                    const dur = session.duration || (session.endTime ? new Date(session.endTime) - new Date(session.startTime) : 0);
                    const h   = dur / 3600000;
                    const amt = h * hourlyRate;
                    return (
                      <tr key={session.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/40 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-sm font-medium text-on-surface">{formatDateRelative(session.startTime)}</p>
                          <p className="text-xs text-on-surface-variant">{formatDate(session.startTime)}</p>
                        </td>
                        <td className="px-3 py-3.5 text-right whitespace-nowrap">
                          <span className="text-sm font-bold font-mono-tabular text-primary">{toDecimalHours(dur)}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-sm text-on-surface">
                            {session.description || <span className="text-on-surface-variant italic">—</span>}
                          </p>
                        </td>
                        {hourlyRate > 0 && (
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <span className="text-sm font-semibold text-on-surface">{currency}{Math.round(amt).toLocaleString()}</span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-outline-variant/30 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface-container/40">
              <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                <span><span className="font-semibold text-on-surface">{projectSessions.length}</span> sessions</span>
                <span className="font-bold font-mono-tabular text-on-surface">{toDecimalHours(totalMs)}</span>
              </div>
              {hourlyRate > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{currency}{Math.round(totalAmt).toLocaleString()}</span>
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
  const currency = settings.currency || '₺';

  const [activeTab, setActiveTab] = useState('general');
  const [period, setPeriod] = useState('last7');

  const filteredSessions = useMemo(() => filterByPeriod(sessions, period), [sessions, period]);

  const TABS = [
    { id: 'general', label: 'General', icon: 'analytics' },
    { id: 'project', label: 'Project', icon: 'folder_open' },
  ];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="font-headline text-2xl lg:text-[2rem] font-bold text-on-surface">Reports &amp; Analytics</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Track your time, measure your impact</p>
        </div>
        {/* Period Dropdown — sağ üst */}
        <PeriodDropdown period={period} onChange={setPeriod} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant/30 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
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
          ? <GeneralTab filteredSessions={filteredSessions} projects={projects} currency={currency} period={period} />
          : <ProjectTab filteredSessions={filteredSessions} projects={projects} currency={currency} period={period} />
        }
      </div>
    </div>
  );
}
