import React from 'react';

export const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: { isOpen: boolean, message: string, onConfirm: () => void, onCancel: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel p-6 rounded-2xl max-w-sm w-full mx-4 border border-theme-border/50 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
        <p className="text-theme-text-muted mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
