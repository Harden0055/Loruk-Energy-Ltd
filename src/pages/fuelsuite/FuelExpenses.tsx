/**
 * FuelSuite — Expenses: date, category, description, amount, payment method.
 * Categories are manageable; purchases are NOT recorded here.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Receipt, Plus, Pencil, Trash2, Search, Save, TrendingDown, Tag, X, ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useFuelExpenses, useFuelExpenseCategories, useFuelStations, ensureFuelExpenseCategories,
  createFuelExpense, updateFuelExpense, deleteFuelExpense,
  createFuelExpenseCategory, deleteFuelExpenseCategory,
  FUEL_PAYMENT_METHODS, FuelExpense,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { useFuelStationScope } from './fuelStationContext';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelStationBadge, FuelUnassignedNotice, FuelExportButton,
  stationCsvLabel, ksh, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

const BAR_COLORS = ['#8B5CF6', '#34D399', '#6366F1', '#F59E0B', '#F87171', '#38BDF8', '#A3E635', '#FB923C', '#94A3B8'];

export default function FuelExpenses({ initialAction }: { initialAction?: string }) {
  const { data: expenses, loading } = useFuelExpenses();
  const { data: categories } = useFuelExpenseCategories();
  const { data: stations } = useFuelStations();
  const { scope, isAll, inScope } = useFuelStationScope();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'addExpense');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  // "+ Add Type" quick modal: create a new expense type in one step.
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeSaving, setTypeSaving] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FuelExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FuelExpense | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
  const [formStationId, setFormStationId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(FUEL_PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // Seed default categories once
  useEffect(() => {
    ensureFuelExpenseCategories(categories).catch(console.error);
  }, [categories.length]);

  const openModal = (exp: FuelExpense | null) => {
    setEditing(exp);
    setDate(exp ? exp.dateKey : todayKey());
    setFormStationId(exp ? (exp.stationId || '') : (scope !== 'all' ? scope : ''));
    setCategory(exp?.category || categories[0]?.name || '');
    setDescription(exp?.description || '');
    setAmount(exp ? String(exp.amount) : '');
    setPaymentMethod(exp?.paymentMethod || FUEL_PAYMENT_METHODS[0]);
    setReference(exp?.reference || '');
    setNote(exp?.note || '');
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!category) { setError('Choose a category.'); return; }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    try {
      const payload = {
        date: parseDateToTimestamp(date),
        dateKey: date,
        stationId: formStationId || undefined,
        stationName: stations.find(s => s.id === formStationId)?.name || undefined,
        category,
        description: description.trim(),
        amount: amt,
        paymentMethod,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      };
      if (editing) {
        await updateFuelExpense(editing.id, editing, payload);
      } else {
        await createFuelExpense(payload);
      }
      setModalOpen(false);
      setEditing(null);
      setDescription(''); setAmount(''); setReference(''); setNote('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save the expense.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteFuelExpense(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete the expense.');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('That category already exists.');
      return;
    }
    try {
      await createFuelExpenseCategory(name);
      setNewCategory('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to add the category.');
    }
  };

  /** "+ Add Type" quick modal: create a new expense type (e.g. Lunch meal, generator fuel). */
  const addType = async () => {
    const name = typeName.trim();
    if (!name) { setTypeError('Type name is required.'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setTypeError('That expense type already exists.');
      return;
    }
    setTypeSaving(true);
    setTypeError(null);
    try {
      await createFuelExpenseCategory(name);
      setTypeModalOpen(false);
      setTypeName('');
    } catch (err) {
      console.error(err);
      setTypeError('Failed to add the expense type. Try again.');
    } finally {
      setTypeSaving(false);
    }
  };

  const inRangeAll = useMemo(() => expenses.filter(e => range.inRange(e.date)), [expenses, range.start, range.end]);
  const unassignedCount = useMemo(() => inRangeAll.filter(e => !e.stationId).length, [inRangeAll]);
  const inRange = useMemo(() => inRangeAll.filter(e => inScope(e.stationId)), [inRangeAll, inScope]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s
      ? inRange.filter(e =>
          e.category.toLowerCase().includes(s) ||
          e.description.toLowerCase().includes(s) ||
          (e.reference || '').toLowerCase().includes(s))
      : inRange;
  }, [inRange, search]);

  const stats = useMemo(() => {
    const total = inRange.reduce((s, e) => s + e.amount, 0);
    const byCat = new Map<string, number>();
    inRange.forEach(e => byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
    const chart = [...byCat.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    return { total, chart, top: chart[0] };
  }, [inRange]);

  // ---- Expense types & totals: one row per category used in the period,
  // clickable to drill into its day-by-day list. ----
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const categoryRows = useMemo(() => {
    const byCat = new Map<string, { count: number; total: number }>();
    inRange.forEach(e => {
      const cur = byCat.get(e.category) || { count: 0, total: 0 };
      byCat.set(e.category, { count: cur.count + 1, total: cur.total + e.amount });
    });
    return [...byCat.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [inRange]);
  const drillRows = useMemo(() => (
    drillCategory
      ? inRange.filter(e => e.category === drillCategory).sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || ''))
      : []
  ), [drillCategory, inRange]);
  const drillTotal = useMemo(() => drillRows.reduce((s, e) => s + e.amount, 0), [drillRows]);

  return (
    <FuelPageShell
      icon={Receipt}
      title="Expenses"
      subtitle="Operational spending by category — purchases are tracked separately under Purchases"
      actions={
        <button type="button" onClick={() => openModal(null)} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      }
    >
      {!isAll && <FuelUnassignedNotice count={unassignedCount} noun="expenses" />}
      <FuelKpiGrid
        kpis={[
          { label: 'Total Expenses', value: ksh(stats.total), sub: range.label, icon: TrendingDown, tone: 'red' },
          { label: 'Entries', value: String(inRange.length), icon: Receipt, tone: 'slate' },
          { label: 'Top Category', value: stats.top ? stats.top.name : '—', sub: stats.top ? ksh(stats.top.amount) : undefined, icon: Tag, tone: 'violet' },
          { label: 'Categories', value: String(categories.length), icon: Tag, tone: 'green' },
        ]}
      />

      <FuelSection title="Spending by category" icon={Tag} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No expenses in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} angle={-18} dy={10} height={50} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [ksh(Number(v)), 'Spent']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {stats.chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Expense types & totals"
        icon={Tag}
        right={<span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">click a type to see its day-by-day list</span>}
      >
        <FuelTable
          headers={['Expense type', 'Entries', 'Share', 'Total']}
          empty={categoryRows.length === 0}
        >
          {categoryRows.map(c => {
            const share = stats.total > 0 ? Math.round((c.total / stats.total) * 100) : 0;
            return (
              <tr
                key={c.name}
                onClick={() => setDrillCategory(c.name)}
                className="hover:bg-violet-500/[0.06] transition-colors cursor-pointer group"
              >
                <td className="py-2.5 px-2.5">
                  <span className="text-xs font-bold text-violet-300 group-hover:text-violet-200 inline-flex items-center gap-1">
                    {c.name}
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{c.count}</td>
                <td className="py-2.5 px-2.5">
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-theme-text-muted w-8 text-right">{share}%</span>
                  </div>
                </td>
                <td className="py-2.5 px-2.5 text-xs font-mono font-bold text-red-400">{ksh(c.total)}</td>
              </tr>
            );
          })}
        </FuelTable>
        {categoryRows.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between px-2.5">
            <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
              {categoryRows.length} type{categoryRows.length === 1 ? '' : 's'} · {inRange.length} expense{inRange.length === 1 ? '' : 's'}
            </span>
            <span className="text-xs font-mono font-black text-red-400">Total {ksh(stats.total)}</span>
          </div>
        )}
      </FuelSection>

      <FuelSection
        title="Expense records"
        icon={Receipt}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <FuelSearch value={search} onChange={setSearch} placeholder="Search category, description or ref…" />
            <button type="button" onClick={() => { setTypeName(''); setTypeError(null); setTypeModalOpen(true); }} className="px-2.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap" title="Add a new type of expense, e.g. Lunch meal, generator fuel">
              <Plus className="w-3.5 h-3.5" /> Add Type
            </button>
            <button type="button" onClick={() => setCatModalOpen(true)} className="px-2.5 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap">
              <Tag className="w-3.5 h-3.5" /> Categories
            </button>
          </div>
        }
      >
        <FuelTable
          headers={['Date', 'Station', 'Category', 'Description', 'Amount', 'Payment', 'Ref', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(e => (
            <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(e.dateKey)}</td>
              <td className="py-2.5 px-2.5"><FuelStationBadge stationName={e.stationName} /></td>
              <td className="py-2.5 px-2.5"><FuelBadge tone="violet">{e.category}</FuelBadge></td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted max-w-[220px] truncate">{e.description || '—'}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-red-400 font-bold">{ksh(e.amount)}</td>
              <td className="py-2.5 px-2.5"><FuelBadge tone={e.paymentMethod === 'Cash' ? 'green' : 'violet'}>{e.paymentMethod}</FuelBadge></td>
              <td className="py-2.5 px-2.5 text-xs text-gray-500">{e.reference || '—'}</td>
              <td className="py-2.5 px-2.5">
                <div className="flex items-center gap-1 justify-end">
                  <button type="button" onClick={() => setDeleteTarget(e)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer" title="Delete expense">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => openModal(e)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Edit expense">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading expenses…</p>}
          <FuelExportButton name="fuelsuite_expenses" rows={filtered.map(e => ({
            Date: e.dateKey, Station: stationCsvLabel(e.stationName), Category: e.category, Description: e.description, Amount: e.amount,
            'Payment Method': e.paymentMethod, Reference: e.reference || '', Note: e.note || '',
          }))} />
        </div>
      </FuelSection>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Expense modal */}
      {modalOpen && (
        <FuelModal
          title={editing ? 'Edit expense' : 'Add expense'}
          icon={Receipt}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          width="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => { setModalOpen(false); setEditing(null); }} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save expense'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Date" required>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
            </FuelField>
            <FuelField label="Station" hint="Which station this expense belongs to">
              <select value={formStationId} onChange={e => setFormStationId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                <option value="">— Unassigned / company-wide —</option>
                {stations.filter(s => s.active !== false).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FuelField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Category" required>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                {categories.length === 0 && <option value="">—</option>}
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FuelField>
          </div>
          <FuelField label="Description">
            <input type="text" className={fuelInputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Generator diesel top-up" />
          </FuelField>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Amount (KSh)" required>
              <input type="number" className={fuelInputClass} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
            </FuelField>
            <FuelField label="Payment method" required>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                {FUEL_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FuelField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Reference (optional)">
              <input type="text" className={fuelInputClass} value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt no." />
            </FuelField>
            <FuelField label="Note (optional)">
              <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth noting" />
            </FuelField>
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Expense-type drill-down: day-by-day list for one category */}
      {drillCategory && (
        <FuelModal
          title={`Expense type — ${drillCategory}`}
          icon={Tag}
          width="max-w-2xl"
          onClose={() => setDrillCategory(null)}
          footer={
            <>
              <span className="text-xs font-mono font-black text-red-400 mr-auto">Total {ksh(drillTotal)} · {drillRows.length} entr{drillRows.length === 1 ? 'y' : 'ies'}</span>
              <button type="button" onClick={() => setDrillCategory(null)} className="px-3.5 py-2 rounded-lg text-xs font-bold text-gray-300 border border-theme-border hover:bg-white/[0.05] transition-colors cursor-pointer">
                Done
              </button>
            </>
          }
        >
          <div className="text-xs space-y-3">
            <div className="bg-white/[0.03] border border-theme-border rounded-lg px-3 py-2 flex items-center justify-between flex-wrap gap-1">
              <span className="text-gray-400">Period: <span className="text-theme-text font-bold">{range.label}</span></span>
              <span className="text-gray-400">Average per entry: <span className="font-mono font-bold text-theme-text">{ksh(drillRows.length > 0 ? Math.round((drillTotal / drillRows.length) * 100) / 100 : 0)}</span></span>
            </div>
            {drillRows.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
                No expenses for this type in this period
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-theme-border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#0B0B10]">
                    <tr className="text-[9px] uppercase tracking-wider text-theme-text-muted">
                      <th className="text-left font-bold px-2.5 py-1.5">Date</th>
                      <th className="text-left font-bold px-2 py-1.5">Station</th>
                      <th className="text-left font-bold px-2 py-1.5">Description</th>
                      <th className="text-right font-bold px-2 py-1.5">Amount</th>
                      <th className="text-left font-bold px-2.5 py-1.5">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillRows.map(e => (
                      <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                        <td className="px-2.5 py-1.5 font-bold text-theme-text whitespace-nowrap">{fmtDate(e.dateKey)}</td>
                        <td className="px-2 py-1.5"><FuelStationBadge stationName={e.stationName} /></td>
                        <td className="px-2 py-1.5 text-theme-text-muted max-w-[200px] truncate">{e.description || '—'}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold text-red-400">{ksh(e.amount)}</td>
                        <td className="px-2.5 py-1.5"><FuelBadge tone={e.paymentMethod === 'Cash' ? 'green' : 'violet'}>{e.paymentMethod}</FuelBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FuelModal>
      )}

      {/* "+ Add Type" quick modal */}
      {typeModalOpen && (
        <FuelModal
          title="Add type of expense"
          icon={Tag}
          width="max-w-md"
          onClose={() => { setTypeModalOpen(false); setTypeName(''); }}
          footer={
            <>
              <button type="button" onClick={() => { setTypeModalOpen(false); setTypeName(''); }} className="px-3.5 py-2 rounded-lg text-xs font-bold text-gray-300 border border-theme-border hover:bg-white/[0.05] transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={addType}
                disabled={typeSaving || !typeName.trim()}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> {typeSaving ? 'Saving…' : 'Add type'}
              </button>
            </>
          }
        >
          <div className="text-xs space-y-3">
            <FuelField label="Expense type name" required hint="e.g. Lunch meal, generator fuel, airtime">
              <input
                type="text"
                className={fuelInputClass}
                value={typeName}
                onChange={e => setTypeName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
                placeholder="e.g. Lunch meal"
                autoFocus
              />
            </FuelField>
            <p className="text-[10px] text-gray-500">
              The new type appears immediately in the category dropdowns everywhere, including the daily report.
            </p>
            {typeError && <div className="text-[11px] text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{typeError}</div>}
          </div>
        </FuelModal>
      )}

      {/* Categories manager */}
      {catModalOpen && (
        <FuelModal
          title="Manage expense categories"
          icon={Tag}
          width="max-w-md"
          onClose={() => { setCatModalOpen(false); setNewCategory(''); }}
          footer={
            <button type="button" onClick={() => { setCatModalOpen(false); setNewCategory(''); }} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Done</button>
          }
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              className={fuelInputClass}
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="New category name"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
            />
            <button type="button" onClick={addCategory} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap">Add</button>
          </div>
          <div className="space-y-1.5 mt-1">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white/[0.03] border border-theme-border rounded-lg px-3 py-2">
                <span className="text-xs text-theme-text font-semibold">{c.name}</span>
                <button
                  type="button"
                  onClick={async () => { await deleteFuelExpenseCategory(c.id, c.name); }}
                  className="p-1 text-gray-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                  title="Remove category"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-[11px] text-gray-500">No categories yet.</p>}
          </div>
          <p className="text-[10px] text-gray-500">Removing a category does not delete past expenses that used it.</p>
        </FuelModal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <FuelModal
          title="Delete expense?"
          icon={Trash2}
          width="max-w-md"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Keep it</button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          }
        >
          <p className="text-xs text-theme-text-muted">
            Delete the <span className="font-bold text-theme-text">{deleteTarget.category}</span> expense of <span className="font-mono font-bold text-theme-text">{ksh(deleteTarget.amount)}</span>? This is logged in the audit trail.
          </p>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
