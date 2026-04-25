import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function SessionDescriptionModal({ isOpen, sessionId, onClose }) {
  const { sessions, editSession } = useApp();
  const session = sessions.find(s => s.id === sessionId);
  const [description, setDescription] = useState(session?.description || '');

  if (!isOpen || !session) return null;

  const handleSave = (e) => {
    e.preventDefault();
    editSession(sessionId, { description });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-lg border border-outline-variant/30">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-[28px] text-primary">edit_note</span>
          <h2 className="font-headline text-xl font-bold text-on-surface">Session Saved</h2>
        </div>
        
        <p className="text-sm text-on-surface-variant mb-4">
          Add a description to remember what you worked on during this session.
        </p>

        <form onSubmit={handleSave}>
          <textarea
            autoFocus
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Brainstorming new logo concepts..."
            className="w-full px-4 py-3 mb-6 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm resize-none"
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-card"
            >
              Save Description
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
