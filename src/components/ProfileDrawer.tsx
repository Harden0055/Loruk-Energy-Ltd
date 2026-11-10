import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { X, User, Building2, LogOut, ShieldCheck } from 'lucide-react';

interface ProfileDrawerProps {
  onClose: () => void;
}

/**
 * Main app profile drawer: shows the signed-in account and sign-out action.
 * (Replaces the retired FuelSuite "MiniDashboardProfile".)
 */
export default function ProfileDrawer({ onClose }: ProfileDrawerProps) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const displayName = user?.displayName || user?.email || 'Signed-in user';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end">
      <div onClick={onClose} className="absolute inset-0" />
      <div className="w-full max-w-sm bg-[#090A0F] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-300 relative">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B0D14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/35 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Profile</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Loruk Energy Ltd</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="glass-panel p-4 rounded-2xl space-y-3 border border-white/[0.08]">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Signed-in Account
            </div>
            <p className="text-sm font-bold text-white break-all">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-slate-400 break-all">{user.email}</p>
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl space-y-3 border border-white/[0.08]">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-blue-400" />
              Organisation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fleet &amp; Fuel Logistics Manager — tracking fuel deliveries, fleet transactions, customer ledgers, station reports, and payments.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-[#0B0D14]">
          <button
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } finally {
                setLoggingOut(false);
                onClose();
              }
            }}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-400 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
