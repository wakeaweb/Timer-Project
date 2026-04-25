import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNavBar from './SideNavBar';
import ActiveTimerBanner from './ActiveTimerBanner';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <SideNavBar />
      <div className="ml-[240px] min-h-screen flex flex-col">
        <ActiveTimerBanner />
        <main className="flex-1 px-6 pb-6 pt-3 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
