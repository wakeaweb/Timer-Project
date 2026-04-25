import React, { useState } from 'react';
import { formatDateRelative, formatTimeRange, formatDuration } from '../utils/timeUtils';

/**
 * Seans listesi tablosu — Proje Detay sayfasında
 */
export default function SessionTable({ sessions, maxRows, onEditSession }) {
  const displayed = maxRows ? sessions.slice(0, maxRows) : sessions;
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const startEditing = (session) => {
    setEditingId(session.id);
    setEditText(session.description || '');
  };

  const saveEdit = () => {
    if (onEditSession && editingId) {
      onEditSession(editingId, { description: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  if (displayed.length === 0) {
    return (
      <div className="text-center py-10">
        <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">
          history
        </span>
        <p className="text-on-surface-variant text-sm">No sessions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/30">
            <th className="pb-3 pr-4">Date &amp; Time</th>
            <th className="pb-3 pr-4">Session Description</th>
            <th className="pb-3 text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((session, i) => {
            const duration = session.duration || (
              session.endTime
                ? new Date(session.endTime) - new Date(session.startTime)
                : Date.now() - new Date(session.startTime)
            );

            return (
              <tr
                key={session.id}
                className={`border-b border-outline-variant/15 hover:bg-surface-container-low/50 transition-colors
                  ${i === 0 ? 'animate-fade-in' : ''}`}
              >
                <td className="py-4 pr-4">
                  <p className="text-sm font-semibold text-on-surface">
                    {formatDateRelative(session.startTime)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formatTimeRange(session.startTime, session.endTime)}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  {editingId === session.id ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      autoFocus
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest border border-primary/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Add description..."
                    />
                  ) : (
                    <div className="flex items-center gap-2 group/desc">
                      <p className="text-sm text-on-surface">
                        {session.description || <span className="text-on-surface-variant italic">No description</span>}
                      </p>
                      {onEditSession && session.endTime && (
                        <button
                          onClick={() => startEditing(session)}
                          className="opacity-0 group-hover/desc:opacity-100 text-outline-variant hover:text-primary transition-all shrink-0"
                          title="Edit description"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-4 text-right">
                  <span className="font-mono-tabular text-sm font-semibold text-primary">
                    {formatDuration(duration)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
