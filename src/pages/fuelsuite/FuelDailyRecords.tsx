/**
 * FuelSuite — Daily Fuel Records.
 * Machine stop readings for AGO/PMS per station, date and salesperson, with
 * auto-filled start readings, computed sales figures, validation flags,
 * a review step before saving, and authorized corrections with audit trail.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  ClipboardList, Plus, Pencil, AlertTriangle, Save, Eye,
  CalendarDays, Fuel, ChevronDown, ChevronUp, History, MapPin, UserRound
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useFuelStations, useFuelSalespeople, useFuelDailyRecords,
  createFuelDailyRecord, correctFuelDailyRecord,
  FuelStation, FuelSalesperson, FuelDailyRecord, FuelProductReading,
} from '../../lib/fuelDb';
import { parseDateToTimestamp, formatDateToInput } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelTone, ksh, fmtQty, fmtDate, todayKey, dateKeyOf, fuelInputClass,
} from './fuelShared';

interface FuelDailyRecordsProps {
  initialAction?: string;
  onNavigate?: (page: string) => void;
}

const emptyReading = (rate = 0): FuelProductReading => ({
  salesStart: 0, salesStop: 0, litresStart: 0, litresStop: 0, rate,
});

const num = (v: string) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Derived figures for one product reading
const compute = (r: FuelProductReading) => {
  const litresSold = (r.litresStop || 0) - (r.litresStart || 0);
  const machineSales = (r.salesStop || 0) - (r.salesStart || 0);
  const expected = litresSold * (r.rate || 0);
  const difference = machineSales - expected;
  return { litresSold, machineSales, expected, difference };
};

export default function FuelDailyRecords({ initialAction, onNavigate }: FuelDailyRecordsProps) {
  const { data: stations, loading: stationsLoading } = useFuelStations();
  const salespeople = useFuelSalespeople().data;
  const { data: records, loading } = useFuelDailyRecords();

  const activeStations = stations.filter(s => s.active !== false);

  const [stationId, setStationId] = useState<string>('');
  const [dateKey, setDateKey] = useState(todayKey());
  const [salespersonId, setSalespersonId] = useState('');

  // Form state
  const [ago, setAgo] = useState<FuelProductReading>(emptyReading());
  const [pms, setPms] = useState<FuelProductReading>(emptyReading());
  const [note, setNote] = useState('');
  const [startSource, setStartSource] = useState<'auto' | 'manual'>('manual');

  const [editingRecord, setEditingRecord] = useState<FuelDailyRecord | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Default station once stations load
  useEffect(() => {
    if (!stationId && activeStations.length > 0) setStationId(activeStations[0].id);
  }, [activeStations.length, stationId]);

  const station = stations.find(s => s.id === stationId);
  const stationSalespeople = salespeople.filter(
    sp => sp.active !== false && (!stationId || sp.stationIds?.includes(stationId))
  );

  // Salesperson options for the selected station
  useEffect(() => {
    if (stationSalespeople.length > 0 && !stationSalespeople.some(sp => sp.id === salespersonId)) {
      setSalespersonId(stationSalespeople[0].id);
    }
    if (stationSalespeople.length === 0) setSalespersonId('');
  }, [stationId, salespeople.length]);

  // Auto-fill start readings from the previous recorded stop for this station
  const previousRecord = useMemo(() => {
    if (!stationId) return null;
    return records
      .filter(r => r.stationId === stationId && r.dateKey < dateKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] || null;
  }, [records, stationId, dateKey]);

  // Load auto start readings when station/date changes and not editing
  useEffect(() => {
    if (editingRecord) return;
    if (previousRecord) {
      setAgo({ ...emptyReading(ago.rate), salesStart: previousRecord.ago?.salesStop || 0, litresStart: previousRecord.ago?.litresStop || 0 });
      setPms({ ...emptyReading(pms.rate), salesStart: previousRecord.pms?.salesStop || 0, litresStart: previousRecord.pms?.litresStop || 0 });
      setStartSource('auto');
    } else {
      setStartSource('manual');
    }
  }, [previousRecord?.id, dateKey, stationId, editingRecord]);

  // Keep rates when previousRecord changes
  const setAgoField = (k: keyof FuelProductReading, v: string) => setAgo(prev => ({ ...prev, [k]: num(v) }));
  const setPmsField = (k: keyof FuelProductReading, v: string) => setPms(prev => ({ ...prev, [k]: num(v) }));

  const agoC = compute(ago);
  const pmsC = compute(pms);
  const totalExpected = agoC.expected + pmsC.expected;
  const totalDifference = agoC.difference + pmsC.difference;

  // ---- Flags ----
  const duplicate = useMemo(() => {
    if (editingRecord) return null;
    return records.find(r => r.stationId === stationId && r.dateKey === dateKey && r.salespersonId === salespersonId) || null;
  }, [records, stationId, dateKey, salespersonId, editingRecord]);

  const duplicateAnySalesperson = useMemo(
    () => records.filter(r => r.stationId === stationId && r.dateKey === dateKey),
    [records, stationId, dateKey]
  );

  const missingReadings =
    ago.litresStop <= 0 || ago.salesStop <= 0 || pms.litresStop <= 0 || pms.salesStop <= 0;

  const negativeReading =
    agoC.litresSold < 0 || agoC.machineSales < 0 || pmsC.litresSold < 0 || pmsC.machineSales < 0;

  const unreliablePrevious = previousRecord
    ? (compute(previousRecord.ago).litresSold < 0 || compute(previousRecord.pms).litresSold < 0)
    : false;

  const unusualDifference =
    Math.abs(agoC.difference) > Math.max(1000, Math.abs(agoC.expected) * 0.02) ||
    Math.abs(pmsC.difference) > Math.max(1000, Math.abs(pmsC.expected) * 0.02);

  const flags: Array<{ tone: FuelTone; text: string }> = [];
  if (duplicate) flags.push({ tone: 'red', text: 'Duplicate: this station, date and salesperson already has a record' });
  else if (duplicateAnySalesperson.length > 0) flags.push({ tone: 'amber', text: `${duplicateAnySalesperson.length} record(s) already exist for this station & date (different salesperson)` });
  if (missingReadings) flags.push({ tone: 'amber', text: 'Some stop readings are missing or zero' });
  if (negativeReading) flags.push({ tone: 'red', text: 'Negative difference: a stop reading is below its start reading' });
  if (unreliablePrevious) flags.push({ tone: 'amber', text: 'Previous record has negative readings — auto start figures may be unreliable' });
  if (unusualDifference) flags.push({ tone: 'violet', text: 'Unusual difference between machine sales and expected sales (>2%)' });

  const blockingSave = !!duplicate || negativeReading || !stationId || !dateKey;

  // Load a record into the form for editing
  const startEdit = (rec: FuelDailyRecord) => {
    setEditingRecord(rec);
    setStationId(rec.stationId);
    setDateKey(rec.dateKey);
    setSalespersonId(rec.salespersonId || '');
    setAgo({ ...emptyReading(), ...rec.ago });
    setPms({ ...emptyReading(), ...rec.pms });
    setNote(rec.note || '');
    setStartSource(rec.startSource || 'manual');
    setCorrectionReason('');
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setCorrectionReason('');
    setNotice(null);
    if (previousRecord) {
      setAgo({ ...emptyReading(ago.rate), salesStart: previousRecord.ago?.salesStop || 0, litresStart: previousRecord.ago?.litresStop || 0 });
      setPms({ ...emptyReading(pms.rate), salesStart: previousRecord.pms?.salesStop || 0, litresStart: previousRecord.pms?.litresStop || 0 });
    } else {
      setAgo(emptyReading(ago.rate));
      setPms(emptyReading(pms.rate));
    }
  };

  const openReview = () => {
    setError(null);
    if (blockingSave) {
      setError(duplicate ? 'A record already exists for this station, date and salesperson.' : 'Fix the flagged issues before continuing.');
      return;
    }
    setReviewOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const dateTs = parseDateToTimestamp(dateKey);
      const salesperson = salespeople.find(sp => sp.id === salespersonId);
      if (editingRecord) {
        if (!correctionReason.trim()) {
          setError('A reason is required for authorized corrections.');
          setSaving(false);
          return;
        }
        await correctFuelDailyRecord(
          editingRecord,
          {
            ago, pms, note, startSource,
            salespersonId: salespersonId || undefined,
            salespersonName: salesperson?.name || editingRecord.salespersonName,
          },
          correctionReason.trim()
        );
        setNotice('Correction saved and logged in the audit trail.');
      } else {
        await createFuelDailyRecord({
          stationId,
          stationName: station?.name || '',
          dateKey,
          date: dateTs,
          salespersonId: salespersonId || undefined,
          salespersonName: salesperson?.name,
          ago, pms, note, startSource,
        });
        setNotice('Daily record saved.');
      }
      setReviewOpen(false);
      setEditingRecord(null);
      setCorrectionReason('');
      setNote('');
      setAgo(emptyReading(ago.rate));
      setPms(emptyReading(pms.rate));
      setStartSource(previousRecord ? 'auto' : 'manual');
    } catch (err) {
      console.error(err);
      setError('Failed to save the record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Records table for the selected station ----
  const stationRecords = useMemo(() => {
    const base = records.filter(r => !stationId || r.stationId === stationId);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? base.filter(r =>
          r.dateKey.includes(q) ||
          (r.salespersonName || '').toLowerCase().includes(q) ||
          r.stationName.toLowerCase().includes(q))
      : base;
    return [...filtered].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [records, stationId, search]);

  const rangeKpis = useMemo(() => {
    const todays = records.filter(r => r.dateKey === todayKey());
    const litres = todays.reduce((s, r) => s + compute(r.ago).litresSold + compute(r.pms).litresSold, 0);
    const expected = todays.reduce((s, r) => s + compute(r.ago).expected + compute(r.pms).expected, 0);
    const diff = todays.reduce((s, r) => s + compute(r.ago).difference + compute(r.pms).difference, 0);
    return { count: todays.length, litres, expected, diff };
  }, [records]);

  const diffTone = (d: number): FuelTone => (d < 0 ? 'red' : Math.abs(d) > 1000 ? 'violet' : 'green');

  const ReadingGrid = ({ reading, computed, setter, label, color }: {
    reading: FuelProductReading;
    computed: ReturnType<typeof compute>;
    setter: (k: keyof FuelProductReading, v: string) => void;
    label: string;
    color: string;
  }) => (
    <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
          <Fuel className={`w-3.5 h-3.5 ${color}`} /> {label}
        </h4>
        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">Machine readings</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <FuelField label="Litres Start"><input type="number" className={fuelInputClass} value={reading.litresStart || ''} onChange={e => setter('litresStart', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Litres Stop"><input type="number" className={fuelInputClass} value={reading.litresStop || ''} onChange={e => setter('litresStop', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Sales Start (KSh)"><input type="number" className={fuelInputClass} value={reading.salesStart || ''} onChange={e => setter('salesStart', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Sales Stop (KSh)"><input type="number" className={fuelInputClass} value={reading.salesStop || ''} onChange={e => setter('salesStop', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Rate / L (KSh)"><input type="number" className={fuelInputClass} value={reading.rate || ''} onChange={e => setter('rate', e.target.value)} placeholder="0" /></FuelField>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
        {[
          { l: 'Litres Sold', v: `${fmtQty(computed.litresSold)} L`, tone: computed.litresSold < 0 ? 'red' : 'green' },
          { l: 'Machine Sales', v: ksh(computed.machineSales), tone: computed.machineSales < 0 ? 'red' : 'violet' },
          { l: 'Expected Sales', v: ksh(computed.expected), tone: 'slate' },
          { l: 'Difference', v: ksh(computed.difference), tone: diffTone(computed.difference) },
        ].map(x => {
          const tones: Record<string, string> = { red: 'text-red-400 border-red-500/25 bg-red-500/[0.06]', green: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]', violet: 'text-violet-400 border-violet-500/25 bg-violet-500/[0.06]', slate: 'text-slate-300 border-white/10 bg-white/[0.03]' };
          return (
            <div key={x.l} className={`rounded-lg border px-2.5 py-1.5 ${tones[x.tone]}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">{x.l}</p>
              <p className="text-xs font-black font-mono mt-0.5">{x.v}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <FuelPageShell
      icon={ClipboardList}
      title="Daily Fuel Records"
      subtitle="Machine stop readings per station, date and salesperson — recorded after collection"
    >
      {/* KPI strip */}
      <FuelKpiGrid
        kpis={[
          { label: 'Records Today', value: String(rangeKpis.count), icon: ClipboardList, tone: 'green' },
          { label: 'Litres Sold Today', value: `${fmtQty(rangeKpis.litres)} L`, icon: Fuel, tone: 'green' },
          { label: 'Expected Sales Today', value: ksh(rangeKpis.expected), icon: CalendarDays, tone: 'violet' },
          { label: 'Difference Today', value: ksh(rangeKpis.diff), icon: AlertTriangle, tone: diffTone(rangeKpis.diff) },
        ]}
      />

      {/* Entry form */}
      <FuelSection
        title={editingRecord ? `Editing record — ${editingRecord.stationName} · ${editingRecord.dateKey}` : 'New daily record'}
        icon={editingRecord ? Pencil : Plus}
      >
        {editingRecord && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1 bg-violet-500/[0.07] border border-violet-500/25 rounded-lg px-3 py-2">
            <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Authorized edit — a reason is required, and the change is kept in the audit trail.
            </span>
            <button type="button" onClick={cancelEdit} className="text-[10px] font-bold text-gray-400 hover:text-white cursor-pointer">Cancel edit</button>
          </div>
        )}

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FuelField label="Station" required>
            <select value={stationId} onChange={e => setStationId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
              {activeStations.length === 0 && <option value="">No active stations</option>}
              {activeStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FuelField>
          <FuelField label="Date" required>
            <input type="date" value={dateKey} onChange={e => setDateKey(e.target.value)} className={`${fuelInputClass} cursor-pointer`} />
          </FuelField>
          <FuelField label="Salesperson" required hint={stationSalespeople.length === 0 ? 'No salesperson assigned to this station — add one in Stations & Salespeople.' : undefined}>
            <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)} className={`${fuelInputClass} cursor-pointer`} disabled={stationSalespeople.length === 0}>
              {stationSalespeople.length === 0 && <option value="">—</option>}
              {stationSalespeople.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </FuelField>
        </div>

        {/* Start reading source */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {previousRecord ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Start readings auto-filled from {fmtDate(previousRecord.date)} ({previousRecord.salespersonName || 'record'}) — editable if authorized.
            </span>
          ) : (
            <span className="text-violet-400 font-bold flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              First record for this station — enter the start readings manually.
            </span>
          )}
        </div>

        <ReadingGrid reading={ago} computed={agoC} setter={setAgoField} label="AGO (Diesel)" color="text-emerald-400" />
        <ReadingGrid reading={pms} computed={pmsC} setter={setPmsField} label="PMS (Petrol)" color="text-violet-400" />

        <FuelField label="Note (optional)">
          <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. generator ran overnight" />
        </FuelField>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="space-y-1.5">
            {flags.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-[11px] font-semibold rounded-lg px-3 py-2 border ${
                f.tone === 'red' ? 'text-red-400 border-red-500/30 bg-red-500/[0.06]'
                : f.tone === 'amber' ? 'text-amber-400 border-amber-500/30 bg-amber-500/[0.06]'
                : 'text-violet-400 border-violet-500/30 bg-violet-500/[0.06]'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {f.text}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
        )}
        {notice && !editingRecord && (
          <div className="text-xs text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/30 rounded-lg px-3 py-2">{notice}</div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-theme-text-muted">
            Expected total: <span className="font-mono font-bold text-theme-text">{ksh(totalExpected)}</span>
            {' · '}Difference: <span className={`font-mono font-bold ${totalDifference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(totalDifference)}</span>
          </div>
          <button
            type="button"
            onClick={openReview}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Eye className="w-4 h-4" /> Review &amp; Save
          </button>
        </div>
      </FuelSection>

      {/* Records table */}
      <FuelSection title={`Recorded days — ${station?.name || 'select a station'}`} icon={MapPin}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search date or salesperson…" />}
      >
        <FuelTable
          headers={['Date', 'Salesperson', 'AGO Litres', 'AGO Sales', 'AGO Diff', 'PMS Litres', 'PMS Sales', 'PMS Diff', 'Status', '']}
          empty={stationRecords.length === 0}
        >
          {stationRecords.map(rec => {
            const ra = compute(rec.ago);
            const rp = compute(rec.pms);
            const isExpanded = expandedRow === rec.id;
            return (
              <React.Fragment key={rec.id}>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(rec.dateKey)}</td>
                  <td className="py-2 px-2.5 text-xs text-theme-text-muted whitespace-nowrap">{rec.salespersonName || '—'}</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-emerald-400">{fmtQty(ra.litresSold)} L</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-theme-text">{ksh(ra.machineSales)}</td>
                  <td className={`py-2 px-2.5 text-xs font-mono ${ra.difference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(ra.difference)}</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-violet-400">{fmtQty(rp.litresSold)} L</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-theme-text">{ksh(rp.machineSales)}</td>
                  <td className={`py-2 px-2.5 text-xs font-mono ${rp.difference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(rp.difference)}</td>
                  <td className="py-2 px-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {(rec.corrections?.length || 0) > 0 && <FuelBadge tone="violet">corrected</FuelBadge>}
                      {ra.difference < 0 || rp.difference < 0 ? <FuelBadge tone="red">negative</FuelBadge>
                        : Math.abs(ra.difference) > 1000 || Math.abs(rp.difference) > 1000 ? <FuelBadge tone="violet">unusual</FuelBadge>
                        : <FuelBadge tone="green">ok</FuelBadge>}
                    </div>
                  </td>
                  <td className="py-2 px-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button type="button" onClick={() => setExpandedRow(isExpanded ? null : rec.id)} className="p-1.5 text-gray-500 hover:text-white rounded-md cursor-pointer" title="Details">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => startEdit(rec)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Correct this record">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={10} className="px-2.5 pb-3">
                      <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3 text-[11px] space-y-1.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          {(['ago', 'pms'] as const).map(p => (
                            <div key={p} className="space-y-0.5">
                              <p className="font-bold text-theme-text uppercase text-[9px] tracking-wider">{p}</p>
                              <p className="text-gray-400">Start: L {fmtQty(rec[p].litresStart)} / KSh {fmtQty(rec[p].salesStart)}</p>
                              <p className="text-gray-400">Stop: L {fmtQty(rec[p].litresStop)} / KSh {fmtQty(rec[p].salesStop)}</p>
                              <p className="text-gray-400">Rate: {ksh(rec[p].rate)}/L</p>
                            </div>
                          ))}
                          <div className="space-y-0.5">
                            <p className="font-bold text-theme-text uppercase text-[9px] tracking-wider">Meta</p>
                            <p className="text-gray-400">Start source: {rec.startSource || 'manual'}</p>
                            <p className="text-gray-400">Recorded by: {rec.createdBy || '—'}</p>
                            <p className="text-gray-400">Saved: {format(rec.createdAt, 'dd MMM yyyy HH:mm')}</p>
                          </div>
                        </div>
                        {rec.note && <p className="text-gray-400">Note: {rec.note}</p>}
                        {(rec.corrections?.length || 0) > 0 && (
                          <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                            <p className="font-bold text-violet-400 uppercase text-[9px] tracking-wider">Correction history</p>
                            {rec.corrections!.map((c, i) => (
                              <p key={i} className="text-gray-400">{format(c.at, 'dd MMM yyyy HH:mm')} — {c.by}: {c.reason} ({c.changes})</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </FuelTable>
        {loading && <p className="text-xs text-gray-500 mt-2">Loading records…</p>}
      </FuelSection>

      {/* Review step modal */}
      {reviewOpen && (
        <FuelModal
          title={editingRecord ? 'Review correction' : 'Review daily record'}
          icon={Eye}
          onClose={() => setReviewOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setReviewOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Go back</button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (editingRecord && !correctionReason.trim())}
                className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingRecord ? 'Save correction' : 'Confirm & save record'}
              </button>
            </>
          }
        >
          <div className="text-xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">Station &amp; date</p>
                <p className="font-bold text-theme-text">{station?.name}</p>
                <p className="text-gray-400">{fmtDate(dateKey)}</p>
              </div>
              <div className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">Salesperson</p>
                <p className="font-bold text-theme-text flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5 text-violet-400" /> {salespeople.find(sp => sp.id === salespersonId)?.name || '—'}</p>
                <p className="text-gray-400">Start source: {startSource}</p>
              </div>
            </div>
            {([['AGO (Diesel)', ago, agoC], ['PMS (Petrol)', pms, pmsC]] as [string, FuelProductReading, ReturnType<typeof compute>][]).map(([label, r, c]) => (
              <div key={label} className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">{label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 font-mono">
                  <span className="text-gray-400">Litres sold: <span className="text-emerald-400 font-bold">{fmtQty(c.litresSold)} L</span></span>
                  <span className="text-gray-400">Machine: <span className="text-theme-text font-bold">{ksh(c.machineSales)}</span></span>
                  <span className="text-gray-400">Expected: <span className="text-violet-400 font-bold">{ksh(c.expected)}</span></span>
                  <span className="text-gray-400">Difference: <span className={`${c.difference < 0 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>{ksh(c.difference)}</span></span>
                </div>
              </div>
            ))}
            {editingRecord && (
              <FuelField label="Reason for correction" required>
                <input type="text" className={fuelInputClass} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="e.g. wrong stop figure keyed yesterday" />
              </FuelField>
            )}
            {flags.some(f => f.tone === 'red') && (
              <div className="text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Some flags are still active — double-check before saving.
              </div>
            )}
          </div>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
