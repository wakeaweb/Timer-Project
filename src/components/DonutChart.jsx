import React from 'react';

/**
 * SVG donut chart — Raporlar sayfasında finansal genel bakış
 */
export default function DonutChart({ total, segments, title }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Segmentlerin sayısal toplamını kendi hesapla — total prop string olabilir
  const totalValue = segments.reduce((sum, seg) => sum + (seg.value || 0), 0);
  let currentOffset = 0;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
      <h3 className="font-headline text-base font-semibold text-on-surface mb-6">{title}</h3>

      <div className="flex items-center justify-center gap-8">
        {/* SVG Donut */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-surface-container-high"
            />
            {/* Segments */}
            {segments.map((seg, i) => {
              const percentage = totalValue > 0 ? seg.value / totalValue : 0;
              const dashLength = circumference * percentage;
              const dashOffset = circumference * currentOffset;
              currentOffset += percentage;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              );
            })}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Value
            </span>
            <span className="font-headline text-xl font-bold text-on-surface">
              {total}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <div>
                <p className="text-sm text-on-surface">{seg.label}</p>
                <p className="text-xs font-semibold text-on-surface-variant">{seg.displayValue}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
