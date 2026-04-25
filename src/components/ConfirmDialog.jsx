import React from 'react';

/**
 * Silme / aksiyon onay modalı
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = true,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-error-container' : 'bg-primary-fixed'}`}>
            <span className={`material-symbols-outlined text-[20px] ${danger ? 'text-error' : 'text-primary'}`}>
              {danger ? 'warning' : 'info'}
            </span>
          </div>
          <h3 className="font-headline text-lg font-semibold text-on-surface">{title}</h3>
        </div>

        <p className="text-sm text-on-surface-variant mb-6 pl-[52px]">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            id="btn-confirm-cancel"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="btn-confirm-action"
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
              danger
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'bg-primary text-on-primary hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
