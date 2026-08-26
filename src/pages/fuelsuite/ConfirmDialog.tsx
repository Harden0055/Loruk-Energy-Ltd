import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: { isOpen: boolean, message: string, onConfirm: () => void, onCancel: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-panel p-6 rounded-2xl max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Confirm Action</h3>
            <p className="text-[11px] text-slate-400">Please review before proceeding</p>
          </div>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed mb-6 pl-0.5">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-400 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};
