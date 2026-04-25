import React from 'react';

/**
 * Özet metrik kartı — Dashboard ve Proje Detay'da kullanılır
 * @param {string} title - Kart başlığı
 * @param {string|number} value - Ana değer
 * @param {string} subtitle - Alt açıklama
 * @param {string} icon - Material icon adı
 * @param {string} iconBg - İkon arka plan renk sınıfı
 * @param {boolean} highlight - Vurgulu kart (koyu arka plan)
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-primary-fixed',
  highlight = false,
  className = '',
}) {
  return (
    <div
      className={`
        rounded-xl py-3.5 px-5 transition-all duration-300 hover:shadow-card group
        ${highlight
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-lowest border border-outline-variant/20'
        }
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-0">
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            highlight ? 'text-on-primary/80' : 'text-on-surface-variant'
          }`}
        >
          {title}
        </p>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              highlight ? 'bg-white/20' : iconBg
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                highlight ? 'text-on-primary' : 'text-primary'
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          </div>
        )}
      </div>
      <p
        className={`font-headline text-[2rem] font-bold leading-tight mt-1 ${
          highlight ? 'text-on-primary' : 'text-on-surface'
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p
          className={`text-xs mt-1 ${
            highlight ? 'text-on-primary/70' : 'text-on-surface-variant'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
