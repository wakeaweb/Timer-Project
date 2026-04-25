import React from 'react';

/**
 * CSS bar chart — Raporlar sayfasında haftalık dağılım
 */
export default function BarChart({ data, title }) {
  const maxValue = Math.max(...data.map(d => d.hours), 1);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline text-base font-semibold text-on-surface">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            Billable
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-tertiary-container" />
            Non-Billable
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-48">
        {data.map((item, i) => (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col items-center justify-end h-40 relative">
              {/* Billable portion */}
              <div
                className="w-full max-w-[40px] rounded-t-md bg-primary transition-all duration-500 ease-out"
                style={{
                  height: `${(item.hours / maxValue) * 100 * 0.7}%`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
              {/* Non-billable portion */}
              <div
                className="w-full max-w-[40px] bg-tertiary-container transition-all duration-500 ease-out"
                style={{
                  height: `${(item.hours / maxValue) * 100 * 0.3}%`,
                  animationDelay: `${i * 80 + 40}ms`,
                }}
              />
            </div>
            <span className="text-xs text-on-surface-variant font-medium">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
