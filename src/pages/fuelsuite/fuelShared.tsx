/**
 * FuelSuite shared UI: page shell, KPI cards, filters, modal, table & CSV export.
 * Follows the main app's glass-panel / emerald + violet theme.
 */
import React, { useMemo, useState } from 'react';
import { Search, X, Download, CalendarDays, AlertTriangle, MapPin } from 'lucide-react';
import Papa from 'papaparse';
import { FuelStationSwitcher } from './fuelStationContext';

// ---------------- FORMATTING ----------------

export const ksh = (n: number, dp = 2) =>
  `Ksh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

export const kshShort = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  if (Math.abs(v) >= 1_000_000) return `Ksh ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `Ksh ${(v / 1_000).toFixed(1)}K`;
  return `Ksh ${v.toFixed(0)}`;
};

export const fmtQty = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const fmtDate = (ts: number | string) => {
  const d = typeof ts === 'number' ? new Date(ts) : new Date(`${ts}T00:00:00`);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateKeyOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------------- TONES ----------------

export type FuelTone = 'green' | 'violet' | 'amber' | 'slate' | 'red';

export const toneClasses: Record<FuelTone, { text: string; border: string; bg: string }> = {
  green:  { text: 'text-emerald-400',   border: 'border-emerald-500/30',  bg: 'bg-emerald-500/[0.07]' },
  violet: { text: 'text-violet-400',    border: 'border-violet-500/30',   bg: 'bg-violet-500/[0.07]' },
  amber:  { text: 'text-amber-400',     border: 'border-amber-500/30',    bg: 'bg-amber-500/[0.07]' },
  slate:  { text: 'text-slate-300',     border: 'border-white/10',        bg: 'bg-white/[0.03]' },
  red:    { text: 'text-red-400',       border: 'border-red-500/30',      bg: 'bg-red-500/[0.07]' },
};

export const FuelBadge = ({ tone = 'slate', children }: { tone?: FuelTone; children: React.ReactNode }) => {
  const t = toneClasses[tone];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${t.border} ${t.bg} ${t.text} text-[10px] font-bold uppercase tracking-wider whitespace-nowrap`}>
      {children}
    </span>
  );
};

// ---------------- STATION SCOPE HELPERS ----------------

/** Station name cell for tables: violet name, or an amber "Unassigned" flag for legacy records. */
export const FuelStationBadge = ({ stationName }: { stationName?: string }) =>
  stationName
    ? <FuelBadge tone="violet"><MapPin className="w-3 h-3 shrink-0" />{stationName}</FuelBadge>
    : <FuelBadge tone="amber">Unassigned</FuelBadge>;

/** CSV value for the Station column — never blank, so unassigned rows are explicit. */
export const stationCsvLabel = (stationName?: string) => stationName || 'Unassigned';

/**
 * Notice shown on station-specific views when older records exist without a
 * station assignment. They are never silently assigned — the user switches to
 * All Stations (and edits the record) to assign them explicitly.
 */
export const FuelUnassignedNotice = ({ count, noun }: { count: number; noun: string }) => {
  if (count <= 0) return null;
  return (
    <div className="text-[11px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        <span className="font-bold">{count}</span> older {noun} {count === 1 ? 'has' : 'have'} no station assigned
        {' '}and {count === 1 ? 'is' : 'are'} hidden in this station view. Switch to <span className="font-bold">All Stations</span> to
        see them, then edit each one to assign its station — nothing is guessed automatically.
      </span>
    </div>
  );
};

// ---------------- PAGE SHELL ----------------

export function FuelPageShell({
  icon: Icon, title, subtitle, actions, children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 min-w-0">
      <div className="glass-panel rounded-xl px-4 py-4 border border-theme-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 shrink-0">
                <Icon className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-theme-text tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-[11px] sm:text-xs text-theme-text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
        </div>
        {/* Station scope switcher — hidden entirely when no stations exist yet */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] empty:hidden">
          <FuelStationSwitcher />
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------- KPI CARDS ----------------

export interface FuelKpi {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: FuelTone;
}

export const FuelKpiCard = ({ kpi }: { kpi: FuelKpi }) => {
  const t = toneClasses[kpi.tone || 'slate'];
  const Icon = kpi.icon;
  return (
    <div className={`glass-panel rounded-xl p-3.5 border ${t.border} ${t.bg} transition-colors min-w-0`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`w-3.5 h-3.5 ${t.text} shrink-0`} />}
        <span className="text-[9px] sm:text-[10px] font-bold text-theme-text-muted uppercase tracking-wider truncate">{kpi.label}</span>
      </div>
      <div className={`text-base sm:text-lg font-black font-mono ${t.text} tracking-tight truncate`}>{kpi.value}</div>
      {kpi.sub && <div className="text-[10px] text-theme-text-muted mt-0.5 truncate">{kpi.sub}</div>}
    </div>
  );
};

export const FuelKpiGrid = ({ kpis }: { kpis: FuelKpi[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {kpis.map((k, i) => <FuelKpiCard key={i} kpi={k} />)}
  </div>
);

// ---------------- DATE RANGE FILTER ----------------

export type FuelPreset = 'today' | 'week' | 'month' | 'all' | 'custom';

export function useFuelDateRange() {
  const [preset, setPreset] = useState<FuelPreset>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { start, end, label } = useMemo(() => {
    const now = new Date();
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (preset === 'today') {
      return { start: dayStart(now), end: Date.now(), label: 'Today' };
    }
    if (preset === 'week') {
      return { start: dayStart(now) - 6 * 86400000, end: Date.now(), label: 'Last 7 days' };
    }
    if (preset === 'month') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: Date.now(), label: 'This month' };
    }
    if (preset === 'custom') {
      const s = from ? dayStart(new Date(`${from}T00:00:00`)) : 0;
      const e = to ? dayStart(new Date(`${to}T00:00:00`)) + 86399000 : Date.now();
      return { start: s, end: e, label: from || to ? `${from || '…'} → ${to || 'now'}` : 'Custom' };
    }
    return { start: 0, end: Infinity as any, label: 'All time' };
  }, [preset, from, to]);

  const inRange = (ts: number | undefined | null) => {
    if (preset === 'all') return true;
    if (!ts) return false;
    return ts >= start && ts <= end;
  };

  const Component = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-theme-panel border border-theme-border p-0.5 rounded-lg">
        {([
          ['today', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['all', 'All'],
        ] as [FuelPreset, string][]).map(([p, lbl]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
              preset === p ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-theme-text-muted hover:text-theme-text border border-transparent'
            }`}
          >
            {lbl}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset('custom')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
            preset === 'custom' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30' : 'text-theme-text-muted hover:text-theme-text border border-transparent'
          }`}
        >
          <CalendarDays className="w-3 h-3" /> Custom
        </button>
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500" />
          <span className="text-[10px] text-theme-text-muted">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
      )}
      <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );

  return { preset, setPreset, start, end, label, inRange, FilterRow: () => Component };
}

// ---------------- SEARCH ----------------

export function FuelSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-theme-border rounded-lg text-xs text-theme-text outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-500"
      />
    </div>
  );
}

// ---------------- MODAL ----------------

export function FuelModal({
  title, icon: Icon, onClose, children, width = 'max-w-lg', footer,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className={`bg-[#0B0B10] rounded-xl shadow-2xl border border-theme-border w-full ${width} max-h-[92vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-theme-border flex items-center justify-between bg-violet-500/[0.05] shrink-0">
          <h3 className="text-base font-bold text-theme-text flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-violet-400 shrink-0" />}
            <span className="truncate">{title}</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-md transition-colors cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-theme-border flex justify-end gap-2.5 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- FORM FIELD ----------------

export const FuelField = ({ label, labelRight, children, hint, required }: { label: string; labelRight?: React.ReactNode; children: React.ReactNode; hint?: string; required?: boolean }) => (
  <div className="min-w-0">
    <div className="flex items-center justify-between gap-2 mb-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>
      {labelRight}
    </div>
    {children}
    {hint && <p className="text-[10px] text-gray-500 mt-1">{hint}</p>}
  </div>
);

export const fuelInputClass =
  'w-full px-3 py-2 bg-black/40 border border-theme-border rounded-lg text-sm text-theme-text outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-600';

// ---------------- TABLE ----------------

export function FuelTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  if (empty) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
        {children || 'No records yet'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-theme-border">
            {headers.map(h => (
              <th key={h} className="py-2 px-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-theme-text-muted whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">{children}</tbody>
      </table>
    </div>
  );
}

// ---------------- CSV EXPORT ----------------

export function exportFuelCsv(name: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const FuelExportButton = ({ name, rows }: { name: string; rows: Record<string, any>[] }) => (
  <button
    type="button"
    onClick={() => exportFuelCsv(name, rows)}
    disabled={!rows.length}
    className="px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
    title="Export CSV spreadsheet"
  >
    <Download className="w-3.5 h-3.5" /> Export CSV
  </button>
);

// ---------------- SECTION PANEL ----------------

export const FuelSection = ({
  title, icon: Icon, right, children, className = '',
}: {
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`glass-panel rounded-xl border border-theme-border shadow-sm p-4 ${className}`}>
    {title && (
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-black text-theme-text tracking-tight flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-violet-400 shrink-0" />}
          <span className="truncate">{title}</span>
        </h3>
        {right}
      </div>
    )}
    {children}
  </div>
);
