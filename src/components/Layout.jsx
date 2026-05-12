import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNavBar from './SideNavBar';
import MobileBottomNav from './MobileBottomNav';
import ActiveTimerBanner from './ActiveTimerBanner';
import AutoPipController from './AutoPipController';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { refreshFromSupabase, isSyncing } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <AutoPipController />
      {/* Desktop Sidebar */}
      <SideNavBar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 lg:hidden bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-on-surface">menu</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                timer
              </span>
            </div>
            <span className="font-headline text-base font-semibold text-primary">Time Project</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={refreshFromSupabase}
              disabled={isSyncing}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-60"
              aria-label="Yenile"
              title="Buluttan yenile"
            >
              <span
                className={`material-symbols-outlined text-on-surface ${isSyncing ? 'animate-spin' : ''}`}
              >
                sync
              </span>
            </button>
          </div>
        </header>

        <ActiveTimerBanner />
        <main className="flex-1 px-4 sm:px-6 pb-6 pt-3 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
