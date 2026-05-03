import React from 'react';

/**
 * CSS stacked bar chart.
 * data: [{ day, hours, ms, breakdown: [{color, name, ms, hours}] }]
 * breakdown opsiyonel — yoksa tek renk (primary) gösterir.
 */
export default function BarChart({ data, title, projects = [] }) {
  const maxValue = Math.max(...data.map(d => d.hours), 0.1);
  const hasBreakdown = data.some(d => d.breakdown?.length > 0);

  // Legend için benzersiz projeler
  const legendProjects = hasBreakdown
    ? [...new Map(
        data.flatMap(d => d.breakdown || []).map(p => [p.color, p])
      ).values()].slice(0, 6)
    : [];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6 gap-4">
        <h3 className="font-headline text-base font-semibold text-on-surface shrink-0">{title}</h3>
        {hasBreakdown && legendProjects.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {legendProjects.map(p => (
              <div key={p.color} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] text-on-surface-variant truncate max-w-[80px]">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 sm:gap-3 h-48">
        {data.map((item, i) => {
          const totalPct = (item.hours / maxValue) * 100;
          const breakdown = item.breakdown?.filter(b => b.hours > 0) || [];

          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-40 relative group">
                {/* Tooltip */}
                {item.hours > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    {item.hours}h
                  </div>
                )}

                {/* Stacked segments */}
                <div
                  className="w-full max-w-[40px] flex flex-col-reverse overflow-hidden rounded-t-md"
                  style={{ height: `${totalPct}%`, transition: 'height 0.5s ease-out' }}
                >
                  {breakdown.length > 0
                    ? breakdown.map((seg, si) => (
                        <div
                          key={seg.color + si}
                          style={{
                            height: `${(seg.ms / item.ms) * 100}%`,
                            backgroundColor: seg.color,
                            minHeight: seg.ms > 0 ? 2 : 0,
                          }}
                        />
                      ))
                    : (
                        <div className="w-full h-full bg-primary" />
                      )
                  }
                </div>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
