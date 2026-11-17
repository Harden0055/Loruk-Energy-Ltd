/**
 * FuelSuite — Stations & Salespeople management.
 */
import React, { useState, useEffect } from 'react';
import {
  MapPinned, Plus, Pencil, Power, Search, Building2, UserRound, Phone, Save, X,
} from 'lucide-react';
import {
  useFuelStations, useFuelSalespeople,
  createFuelStation, updateFuelStation,
  createFuelSalesperson, updateFuelSalesperson,
  FuelStation, FuelSalesperson,
} from '../../lib/fuelDb';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, fuelInputClass,
} from './fuelShared';

export default function FuelSetup({ initialAction }: { initialAction?: string }) {
  const { data: stations, loading } = useFuelStations();
  const { data: salespeople, loading: spLoading } = useFuelSalespeople();

  const [search, setSearch] = useState('');
  const [stationModal, setStationModal] = useState<{ open: boolean; editing: FuelStation | null }>({ open: initialAction === 'addStation', editing: null });
  const [spModal, setSpModal] = useState<{ open: boolean; editing: FuelSalesperson | null }>({ open: false, editing: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form: station
  const [stName, setStName] = useState('');
  const [stLocation, setStLocation] = useState('');
  const [stActive, setStActive] = useState(true);
  const [stReadingOrder, setStReadingOrder] = useState<'ago' | 'pms'>('ago');
  // Form: salesperson
  const [spName, setSpName] = useState('');
  const [spPhone, setSpPhone] = useState('');
  const [spStations, setSpStations] = useState<string[]>([]);
  const [spActive, setSpActive] = useState(true);

  const openStationModal = (editing: FuelStation | null) => {
    setStName(editing?.name || '');
    setStLocation(editing?.location || '');
    setStActive(editing ? editing.active !== false : true);
    setStReadingOrder(editing?.readingOrder || 'ago');
    setStationModal({ open: true, editing });
    setError(null);
  };

  const openSpModal = (editing: FuelSalesperson | null) => {
    setSpName(editing?.name || '');
    setSpPhone(editing?.phone || '');
    setSpStations(editing?.stationIds || []);
    setSpActive(editing ? editing.active !== false : true);
    setSpModal({ open: true, editing });
    setError(null);
  };

  const saveStation = async () => {
    if (!stName.trim()) { setError('Station name is required.'); return; }
    setSaving(true);
    try {
      if (stationModal.editing) {
        await updateFuelStation(stationModal.editing.id, { name: stName.trim(), location: stLocation.trim(), active: stActive, readingOrder: stReadingOrder });
      } else {
        await createFuelStation({ name: stName.trim(), location: stLocation.trim(), active: stActive, readingOrder: stReadingOrder });
      }
      setStationModal({ open: false, editing: null });
    } catch (err) {
      console.error(err);
      setError('Failed to save the station.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStationActive = async (s: FuelStation) => {
    await updateFuelStation(s.id, { name: s.name, active: !s.active });
  };

  const saveSalesperson = async () => {
    if (!spName.trim()) { setError('Salesperson name is required.'); return; }
    setSaving(true);
    try {
      if (spModal.editing) {
        await updateFuelSalesperson(spModal.editing.id, { name: spName.trim(), phone: spPhone.trim(), stationIds: spStations, active: spActive });
      } else {
        await createFuelSalesperson({ name: spName.trim(), phone: spPhone.trim(), stationIds: spStations, active: spActive });
      }
      setSpModal({ open: false, editing: null });
    } catch (err) {
      console.error(err);
      setError('Failed to save the salesperson.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSpActive = async (sp: FuelSalesperson) => {
    await updateFuelSalesperson(sp.id, { name: sp.name, phone: sp.phone, stationIds: sp.stationIds, active: !sp.active });
  };

  const q = search.trim().toLowerCase();
  const stFiltered = q ? stations.filter(s => s.name.toLowerCase().includes(q) || (s.location || '').toLowerCase().includes(q)) : stations;
  const spFiltered = q ? salespeople.filter(s => s.name.toLowerCase().includes(q) || (s.phone || '').includes(q)) : salespeople;

  const activeStations = stations.filter(s => s.active !== false);
  const activeSp = salespeople.filter(s => s.active !== false);

  // Keep list of station ids stable for checkbox handling
  const toggleSpStation = (id: string) => {
    setSpStations(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  useEffect(() => {
    if (spModal.open && activeStations.length > 0 && spStations.length === 0 && !spModal.editing) {
      setSpStations([activeStations[0].id]);
    }
  }, [spModal.open]);

  return (
    <FuelPageShell
      icon={MapPinned}
      title="Stations & Salespeople"
      subtitle="Manage fuel stations and the salespeople assigned to them"
      actions={
        <>
          <button type="button" onClick={() => openStationModal(null)} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Station
          </button>
          <button type="button" onClick={() => openSpModal(null)} className="px-3 py-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Salesperson
          </button>
        </>
      }
    >
      <FuelKpiGrid
        kpis={[
          { label: 'Stations', value: String(stations.length), sub: `${activeStations.length} active`, icon: Building2, tone: 'green' },
          { label: 'Salespeople', value: String(salespeople.length), sub: `${activeSp.length} active`, icon: UserRound, tone: 'violet' },
          { label: 'Unassigned Stations', value: String(stations.filter(s => !salespeople.some(sp => sp.stationIds?.includes(s.id))).length), icon: MapPinned, tone: 'amber' },
        ]}
      />

      <FuelSection
        title="Stations"
        icon={Building2}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search stations or salespeople…" />}
      >
        <FuelTable headers={['Name', 'Location', 'Salespeople', 'Status', '']} empty={stFiltered.length === 0}>
          {stFiltered.map(s => {
            const assigned = salespeople.filter(sp => sp.stationIds?.includes(s.id));
            return (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text">{s.name}</td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{s.location || '—'}</td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">
                  {assigned.length === 0 ? <span className="text-amber-400">None assigned</span> : assigned.map(a => a.name).join(', ')}
                </td>
                <td className="py-2.5 px-2.5"><FuelBadge tone={s.active !== false ? 'green' : 'slate'}>{s.active !== false ? 'Active' : 'Inactive'}</FuelBadge></td>
                <td className="py-2.5 px-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => toggleStationActive(s)} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer" title={s.active !== false ? 'Deactivate' : 'Activate'}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => openStationModal(s)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Edit station">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </FuelTable>
        {loading && <p className="text-xs text-gray-500 mt-2">Loading stations…</p>}
      </FuelSection>

      <FuelSection title="Salespeople" icon={UserRound}>
        {/* Both lists are filtered by the single search box above. */}
        <FuelTable headers={['Name', 'Phone', 'Stations', 'Status', '']} empty={spFiltered.length === 0}>
          {spFiltered.map(sp => (
            <tr key={sp.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text">{sp.name}</td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{sp.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{sp.phone}</span> : '—'}</td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">
                {(sp.stationIds || []).map(id => stations.find(s => s.id === id)?.name).filter(Boolean).join(', ') || <span className="text-amber-400">Not assigned</span>}
              </td>
              <td className="py-2.5 px-2.5"><FuelBadge tone={sp.active !== false ? 'green' : 'slate'}>{sp.active !== false ? 'Active' : 'Inactive'}</FuelBadge></td>
              <td className="py-2.5 px-2.5">
                <div className="flex items-center gap-1 justify-end">
                  <button type="button" onClick={() => toggleSpActive(sp)} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer" title={sp.active !== false ? 'Deactivate' : 'Activate'}>
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => openSpModal(sp)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Edit salesperson">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </FuelTable>
        {spLoading && <p className="text-xs text-gray-500 mt-2">Loading salespeople…</p>}
      </FuelSection>

      {/* Station modal */}
      {stationModal.open && (
        <FuelModal
          title={stationModal.editing ? 'Edit station' : 'Add station'}
          icon={Building2}
          onClose={() => setStationModal({ open: false, editing: null })}
          footer={
            <>
              <button type="button" onClick={() => setStationModal({ open: false, editing: null })} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={saveStation} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save station'}
              </button>
            </>
          }
        >
          <FuelField label="Station name" required>
            <input type="text" className={fuelInputClass} value={stName} onChange={e => setStName(e.target.value)} placeholder="e.g. Loruk — Junction" />
          </FuelField>
          <FuelField label="Location (optional)">
            <input type="text" className={fuelInputClass} value={stLocation} onChange={e => setStLocation(e.target.value)} placeholder="e.g. Kitale Road" />
          </FuelField>
          <FuelField label="First machine section on the daily report" hint="AGO = Diesel, PMS = Petrol">
            <select value={stReadingOrder} onChange={e => setStReadingOrder(e.target.value as 'ago' | 'pms')} className={`${fuelInputClass} cursor-pointer`}>
              <option value="ago">AGO (Diesel) first</option>
              <option value="pms">PMS (Petrol) first</option>
            </select>
          </FuelField>
          <label className="flex items-center gap-2 text-xs text-theme-text cursor-pointer">
            <input type="checkbox" checked={stActive} onChange={e => setStActive(e.target.checked)} className="accent-emerald-500 cursor-pointer" />
            Active (available for daily records)
          </label>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Salesperson modal */}
      {spModal.open && (
        <FuelModal
          title={spModal.editing ? 'Edit salesperson' : 'Add salesperson'}
          icon={UserRound}
          onClose={() => setSpModal({ open: false, editing: null })}
          footer={
            <>
              <button type="button" onClick={() => setSpModal({ open: false, editing: null })} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={saveSalesperson} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save salesperson'}
              </button>
            </>
          }
        >
          <FuelField label="Name" required>
            <input type="text" className={fuelInputClass} value={spName} onChange={e => setSpName(e.target.value)} placeholder="Full name" />
          </FuelField>
          <FuelField label="Phone (optional)">
            <input type="tel" className={fuelInputClass} value={spPhone} onChange={e => setSpPhone(e.target.value)} placeholder="07…" />
          </FuelField>
          <FuelField label="Assigned stations">
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-theme-border rounded-lg p-2.5 bg-black/20">
              {stations.length === 0 && <p className="text-[11px] text-gray-500">No stations yet — add a station first.</p>}
              {stations.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-theme-text cursor-pointer">
                  <input type="checkbox" checked={spStations.includes(s.id)} onChange={() => toggleSpStation(s.id)} className="accent-emerald-500 cursor-pointer" />
                  {s.name}
                </label>
              ))}
            </div>
          </FuelField>
          <label className="flex items-center gap-2 text-xs text-theme-text cursor-pointer">
            <input type="checkbox" checked={spActive} onChange={e => setSpActive(e.target.checked)} className="accent-emerald-500 cursor-pointer" />
            Active
          </label>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
