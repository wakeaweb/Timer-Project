import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/projects', label: 'Projects', icon: 'folder' },
  { path: '/reports', label: 'Reports', icon: 'bar_chart' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export default function SideNavBar({ mobileOpen, onClose }) {
  const { settings, isSyncing, refreshFromSupabase } = useApp();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-[240px] bg-surface-container-low border-r border-outline-variant/30 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Close button (mobile only) */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        aria-label="Close menu"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-lg font-semibold text-primary leading-tight">
              Time Project
            </h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-on-surface-variant leading-tight">Freelancer Pro</p>
              {isSyncing && (
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" title="Senkronize ediliyor..." />
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* New Entry Button */}
      <div className="px-4 mb-4">
        <button
          id="btn-new-entry"
          onClick={() => handleNav('/new-project')}
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-full font-semibold text-sm hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-lg active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Project
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                id={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-outline-variant/30 bg-surface-container-low/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-fixed-variant shrink-0">
              {settings.userName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">
                {settings.userName || 'Kullanıcı'}
              </p>
              <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refreshFromSupabase}
              disabled={isSyncing}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors disabled:opacity-60"
              title="Buluttan yenile"
              aria-label="Yenile"
            >
              <span className={`material-symbols-outlined text-[20px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
              title="Çıkış Yap"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
