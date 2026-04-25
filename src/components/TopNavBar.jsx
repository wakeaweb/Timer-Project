import React from 'react';

export default function TopNavBar() {
  return (
    <header className="h-14 bg-surface/80 backdrop-blur-sm border-b border-outline-variant/20 flex items-center justify-end px-6 sticky top-0 z-20">
      {/* Icons */}
      <div className="flex items-center gap-1">
        <button
          id="btn-notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            notifications
          </span>
        </button>
        <button
          id="btn-help"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
          title="Help"
        >
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            help
          </span>
        </button>
      </div>
    </header>
  );
}
