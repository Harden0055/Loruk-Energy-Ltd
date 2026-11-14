/**
 * FuelSuite — Expenses: date, category, description, amount, payment method.
 * Categories are manageable; purchases are NOT recorded here.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Receipt, Plus, Pencil, Trash2, Search, Save, TrendingDown, Tag, X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useFuelExpenses, useFuelExpenseCategories, ensureFuelExpenseCategories,
  createFuelExpense, updateFuelExpense, deleteFuelExpense,
  createFuelExpenseCategory, deleteFuelExpenseCategory,
  FUEL_PAYMENT_METHODS, FuelExpense,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelExportButton, ksh, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

const BAR_COLORS = ['#8B5CF6', '#34D399', '#6366F1', '#F59E0B', '#F87171', '#38BDF8', '#A3E635', '#FB923C', '#94A3B8'];

export default function FuelExpenses({ initialAction }: { initialAction?: string }) {
  const { data: expenses, loading } = useFuelExpenses();
  const { data: categories } = useFuelExpenseCategories();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'addExpense');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editing, setEditing] = useState<FuelExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FuelExpense | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
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

  const inRange = useMemo(() => expenses.filter(e => range.inRange(e.date)), [expenses, range.start, range.end]);

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
        title="Expense records"
        icon={Receipt}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <FuelSearch value={search} onChange={setSearch} placeholder="Search category, description or ref…" />
            <button type="button" onClick={() => setCatModalOpen(true)} className="px-2.5 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap">
              <Tag className="w-3.5 h-3.5" /> Categories
            </button>
          </div>
        }
      >
        <FuelTable
          headers={['Date', 'Category', 'Description', 'Amount', 'Payment', 'Ref', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(e => (
            <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(e.dateKey)}</td>
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
            Date: e.dateKey, Category: e.category, Description: e.description, Amount: e.amount,
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
