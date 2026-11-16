/**
 * FuelSuite — station scope: shared selector state ("All Stations" or one
 * station) persisted in localStorage, plus the switcher UI shown on every
 * FuelSuite page.
 *
 * Scope filtering happens inside each screen (records, totals, charts and
 * exports all read the same scope). Records without a station assigned are
 * never guessed into a station: they are visible under "All Stations" with an
 * "Unassigned" badge, and each screen shows how many unassigned records exist
 * when a single station is selected.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { MapPinned, Layers3 } from 'lucide-react';
import { useFuelStations, FuelStation } from '../../lib/fuelDb';

export const ALL_STATIONS = 'all';
const LS_KEY = 'fs_station_scope';

interface FuelStationScope {
  /** Selected station id, or ALL_STATIONS. */
  scope: string;
  setScope: (id: string) => void;
  stations: FuelStation[];
  isAll: boolean;
  /** 'All Stations' or the selected station's name. */
  scopeName: string;
  /** True when a record belongs to the selected scope (undefined never matches a specific station). */
  inScope: (stationId?: string | null) => boolean;
}

const Ctx = createContext<FuelStationScope | null>(null);

export function FuelStationProvider({ children }: { children: React.ReactNode }) {
  const { data: stations } = useFuelStations();
  const [scope, setScopeState] = useState<string>(() => {
    try { return localStorage.getItem(LS_KEY) || ALL_STATIONS; } catch { return ALL_STATIONS; }
  });

  // If the stored station no longer exists (deleted), fall back to All Stations.
  useEffect(() => {
    if (scope !== ALL_STATIONS && stations.length > 0 && !stations.some(s => s.id === scope)) {
      setScopeState(ALL_STATIONS);
      try { localStorage.setItem(LS_KEY, ALL_STATIONS); } catch {}
    }
  }, [stations, scope]);

  const setScope = (id: string) => {
    setScopeState(id);
    try { localStorage.setItem(LS_KEY, id); } catch {}
  };

  const isAll = scope === ALL_STATIONS;
  const scopeName = isAll ? 'All Stations' : (stations.find(s => s.id === scope)?.name || 'All Stations');
  const inScope = (stationId?: string | null) => (isAll ? true : !!stationId && stationId === scope);

  return (
    <Ctx.Provider value={{ scope, setScope, stations, isAll, scopeName, inScope }}>
      {children}
    </Ctx.Provider>
  );
}

/** May return null when used outside the provider (switcher then renders nothing). */
export function useFuelStationScopeSafe() {
  return useContext(Ctx);
}

export function useFuelStationScope() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFuelStationScope must be used inside FuelStationProvider');
  return ctx;
}

/** Segmented station switcher — "All Stations" plus every active station. */
export function FuelStationSwitcher() {
  const ctx = useFuelStationScopeSafe();
  if (!ctx) return null;
  const { scope, setScope, stations, isAll } = ctx;
  const active = stations.filter(s => s.active !== false);
  if (active.length === 0) return null;

  const seg = (selected: boolean) =>
    `px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
      selected
        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
        : 'text-theme-text-muted hover:text-theme-text border border-transparent'
    }`;

  return (
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <span className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted flex items-center gap-1 shrink-0">
        <MapPinned className="w-3 h-3 text-violet-400" /> Station view
      </span>
      <div className="flex items-center gap-1 bg-black/30 border border-theme-border p-0.5 rounded-lg flex-wrap">
        <button type="button" onClick={() => setScope(ALL_STATIONS)} className={seg(isAll)} title="Show combined totals and records across all stations">
          <Layers3 className="w-3 h-3" /> All Stations
        </button>
        {active.map(st => (
          <button
            key={st.id}
            type="button"
            onClick={() => setScope(st.id)}
            className={seg(scope === st.id)}
            title={`Show only ${st.name}`}
          >
            {st.name}
          </button>
        ))}
      </div>
    </div>
  );
}
