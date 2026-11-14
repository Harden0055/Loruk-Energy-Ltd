/**
 * FuelSuite — Payments: money received by M-Pesa, cash at hand, etc.
 * Distinct from debt repayments (Paid Debts) and product sales.
 */
import React, { useMemo, useState } from 'react';
import {
  Smartphone, Plus, Trash2, Search, Save, TrendingUp, Banknote, Wrench,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useFuelPayments, createFuelPayment, deleteFuelPayment,
  FuelPayment,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelExportButton, ksh, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

const PAYMENT_METHODS = ['M-Pesa', 'Cash at Hand', 'Bank', 'Other'];
const BAR_COLORS = ['#8B5CF6', '#34D399', '#6366F1', '#F59E0B'];

export default function FuelPayments({ initialAction }: { initialAction?: string }) {
  const { data: payments, loading } = useFuelPayments();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'addPayment');
  const [deleteTarget, setDeleteTarget] = useState<FuelPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const openModal = () => {
    setDate(todayKey());
    setAmount('');
    setMethod(PAYMENT_METHODS[0]);
    setReference('');
    setNote('');
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    try {
      await createFuelPayment({
        date: parseDateToTimestamp(date),
        dateKey: date,
        amount: amt,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      setModalOpen(false);
      setAmount(''); setReference(''); setNote('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteFuelPayment(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete the payment.');
    } finally {
      setSaving(false);
    }
  };

  const inRange = useMemo(() => payments.filter(p => range.inRange(p.date)), [payments, range.start, range.end]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s
      ? inRange.filter(p =>
          p.method.toLowerCase().includes(s) ||
          (p.reference || '').toLowerCase().includes(s) ||
          (p.note || '').toLowerCase().includes(s))
      : inRange;
  }, [inRange, search]);

  const stats = useMemo(() => {
    const total = inRange.reduce((s, p) => s + p.amount, 0);
    const mpesa = inRange.filter(p => p.method === 'M-Pesa').reduce((s, p) => s + p.amount, 0);
    const cash = inRange.filter(p => p.method === 'Cash at Hand').reduce((s, p) => s + p.amount, 0);
    const byMethod = new Map<string, number>();
    inRange.forEach(p => byMethod.set(p.method, (byMethod.get(p.method) || 0) + p.amount));
    const chart = [...byMethod.entries()].map(([name, value]) => ({ name, value }));
    return { total, mpesa, cash, chart };
  }, [inRange]);

  return (
    <FuelPageShell
      icon={Smartphone}
      title="Payments"
      subtitle="Money received by M-Pesa or cash at hand — separate from debt repayments and product sales"
      actions={
        <button type="button" onClick={openModal} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Payment
        </button>
      }
    >
      <FuelKpiGrid
        kpis={[
          { label: 'Total Received', value: ksh(stats.total), sub: range.label, icon: TrendingUp, tone: 'violet' },
          { label: 'M-Pesa', value: ksh(stats.mpesa), icon: Smartphone, tone: 'green' },
          { label: 'Cash at Hand', value: ksh(stats.cash), icon: Banknote, tone: 'green' },
          { label: 'Entries', value: String(inRange.length), icon: Wrench, tone: 'slate' },
        ]}
      />

      <FuelSection title="Received by method" icon={Smartphone} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No payments in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [ksh(Number(v)), 'Received']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Payment records"
        icon={Smartphone}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search method, reference or note…" />}
      >
        <FuelTable
          headers={['Date', 'Amount', 'Method', 'Reference', 'Note', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(p => (
            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(p.dateKey)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-violet-400 font-bold">{ksh(p.amount)}</td>
              <td className="py-2.5 px-2.5">
                <FuelBadge tone={p.method === 'M-Pesa' ? 'violet' : p.method === 'Cash at Hand' ? 'green' : 'slate'}>{p.method}</FuelBadge>
              </td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted font-mono">{p.reference || '—'}</td>
              <td className="py-2.5 px-2.5 text-xs text-gray-500 max-w-[200px] truncate">{p.note || '—'}</td>
              <td className="py-2.5 px-2.5">
                <div className="flex justify-end">
                  <button type="button" onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer" title="Delete payment">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading payments…</p>}
          <FuelExportButton name="fuelsuite_payments" rows={filtered.map(p => ({
            Date: p.dateKey, Amount: p.amount, Method: p.method,
            Reference: p.reference || '', Note: p.note || '',
          }))} />
        </div>
      </FuelSection>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Add payment modal */}
      {modalOpen && (
        <FuelModal
          title="Add payment received"
          icon={Smartphone}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save payment'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Date" required>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
            </FuelField>
            <FuelField label="Amount (KSh)" required>
              <input type="number" className={fuelInputClass} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
            </FuelField>
          </div>
          <FuelField label="Method" required>
            <select value={method} onChange={e => setMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </FuelField>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Transaction reference (optional)">
              <input type="text" className={fuelInputClass} value={reference} onChange={e => setReference(e.target.value)} placeholder="M-Pesa code / receipt no." />
            </FuelField>
            <FuelField label="Note (optional)">
              <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth noting" />
            </FuelField>
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <FuelModal
          title="Delete payment?"
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
            Delete the <span className="font-bold text-theme-text">{deleteTarget.method}</span> payment of{' '}
            <span className="font-mono font-bold text-violet-400">{ksh(deleteTarget.amount)}</span>? This is logged in the audit trail.
          </p>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
