import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home', icon: 'dashboard' },
  { path: '/projects', label: 'Projects', icon: 'folder' },
  { path: '/new-project', label: 'New', icon: 'add_circle', highlight: true },
  { path: '/reports', label: 'Reports', icon: 'bar_chart' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface/95 backdrop-blur-lg border-t border-outline-variant/20 safe-area-bottom">
      <div className="flex items-stretch justify-around h-16 max-w-md mx-auto px-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-semibold transition-colors relative
              ${item.highlight
                ? 'text-primary'
                : isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !item.highlight && (
                  <span className="absolute top-1 w-4 h-0.5 rounded-full bg-primary" />
                )}
                <span
                  className={`material-symbols-outlined transition-all ${
                    item.highlight ? 'text-[28px]' : 'text-[22px]'
                  }`}
                  style={{
                    fontVariationSettings: isActive || item.highlight ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span className={item.highlight ? 'sr-only' : ''}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
