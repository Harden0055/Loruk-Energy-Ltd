/**
 * FuelSuite — Paid Debts: debt repayments, including partial payments,
 * with each customer's remaining balance after each payment.
 */
import React, { useMemo, useState } from 'react';
import {
  Banknote, Plus, Search, Save, TrendingUp, CheckCircle2, UserRound,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useFuelCreditCustomers, useFuelCreditTxs,
  recordFuelCreditTx,
  FUEL_PAYMENT_METHODS,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { useFuelStationScope } from './fuelStationContext';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelStationBadge, FuelUnassignedNotice, FuelExportButton,
  stationCsvLabel, ksh, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

const BAR_COLORS = ['#34D399', '#6366F1', '#8B5CF6', '#F59E0B', '#38BDF8', '#A3E635'];

export default function FuelPaidDebts({ initialAction }: { initialAction?: string }) {
  const { data: customers } = useFuelCreditCustomers();
  const { data: txs, loading } = useFuelCreditTxs();
  const { isAll, inScope } = useFuelStationScope();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'recordRepayment');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(FUEL_PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // Station scope: only customers of the selected station can repay in this
  // view; repayments are tagged with the customer's station.
  const owingCustomers = useMemo(
    () => customers.filter(c => (c.balance || 0) > 0.009 && inScope(c.stationId)),
    [customers, inScope]
  );
  const unassignedCount = useMemo(
    () => txs.filter(t => t.type === 'repayment' && !t.stationId).length,
    [txs]
  );

  const selectedCustomer = customers.find(c => c.id === customerId);
  const amt = parseFloat(amount) || 0;
  const balanceAfter = selectedCustomer ? Math.round(((selectedCustomer.balance || 0) - amt) * 100) / 100 : 0;
  const overpayWarning = selectedCustomer && amt > (selectedCustomer.balance || 0);

  const openModal = () => {
    setDate(todayKey());
    setCustomerId(owingCustomers[0]?.id || '');
    setAmount('');
    setMethod(FUEL_PAYMENT_METHODS[0]);
    setReference('');
    setNote('');
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!selectedCustomer) { setError('Choose a customer.'); return; }
    if (amt <= 0) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    try {
      await recordFuelCreditTx({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        stationId: selectedCustomer.stationId,
        stationName: selectedCustomer.stationName,
        date: parseDateToTimestamp(date),
        dateKey: date,
        amount: amt,
        type: 'repayment',
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }, selectedCustomer.balance || 0);
      setModalOpen(false);
      setAmount(''); setReference(''); setNote('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to record the repayment.');
    } finally {
      setSaving(false);
    }
  };

  const repaymentsInRangeAll = useMemo(() => txs.filter(t => t.type === 'repayment' && range.inRange(t.date)), [txs, range.start, range.end]);
  const repaymentsInRange = useMemo(() => repaymentsInRangeAll.filter(t => inScope(t.stationId)), [repaymentsInRangeAll, inScope]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s
      ? repaymentsInRange.filter(t =>
          t.customerName.toLowerCase().includes(s) ||
          (t.reference || '').toLowerCase().includes(s))
      : repaymentsInRange;
  }, [repaymentsInRange, search]);

  const stats = useMemo(() => {
    const total = repaymentsInRange.reduce((s, t) => s + t.amount, 0);
    const remaining = owingCustomers.reduce((s, c) => s + (c.balance || 0), 0);
    const byCustomer = new Map<string, number>();
    repaymentsInRange.forEach(t => byCustomer.set(t.customerName, (byCustomer.get(t.customerName) || 0) + t.amount));
    const chart = [...byCustomer.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    return { total, remaining, chart, count: repaymentsInRange.length };
  }, [repaymentsInRange, owingCustomers]);

  return (
    <FuelPageShell
      icon={Banknote}
      title="Paid Debts"
      subtitle="Repayments received from credit customers — partial payments supported"
      actions={
        <button
          type="button"
          onClick={() => { if (owingCustomers.length === 0) { setError('No customers owe anything right now.'); return; } openModal(); }}
          className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Record Repayment
        </button>
      }
    >
      {!isAll && <FuelUnassignedNotice count={unassignedCount} noun="repayments" />}
      <FuelKpiGrid
        kpis={[
          { label: 'Repayments Received', value: ksh(stats.total), sub: range.label, icon: TrendingUp, tone: 'green' },
          { label: 'Remaining Owed', value: ksh(stats.remaining), icon: Banknote, tone: stats.remaining > 0 ? 'violet' : 'green' },
          { label: 'Payments', value: String(stats.count), icon: CheckCircle2, tone: 'slate' },
          { label: 'Customers Owing', value: String(owingCustomers.length), icon: UserRound, tone: 'amber' },
        ]}
      />

      <FuelSection title="Repayments by customer" icon={UserRound} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No repayments in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} angle={-16} dy={10} height={48} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [ksh(Number(v)), 'Repaid']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      {/* Remaining balances summary */}
      <FuelSection title="Remaining balances" icon={Banknote}>
        {owingCustomers.length === 0 ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5 py-2">
            <CheckCircle2 className="w-4 h-4" /> All credit customers are fully settled.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {owingCustomers.map(c => (
              <div key={c.id} className="rounded-lg border border-theme-border bg-white/[0.02] px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-theme-text truncate">{c.name}</p>
                  <p className="text-[10px] text-theme-text-muted">Limit {ksh(c.creditLimit)}</p>
                </div>
                <p className="text-xs font-mono font-black text-violet-400 shrink-0">{ksh(c.balance)}</p>
              </div>
            ))}
          </div>
        )}
      </FuelSection>

      <FuelSection
        title="Repayment records"
        icon={CheckCircle2}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search customer or reference…" />}
      >
        <FuelTable
          headers={['Date', 'Station', 'Customer', 'Amount', 'Method', 'Balance After', 'Ref', 'Note']}
          empty={filtered.length === 0}
        >
          {filtered.map(t => {
            const remaining = customers.find(c => c.id === t.customerId)?.balance || 0;
            return (
              <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(t.dateKey)}</td>
                <td className="py-2.5 px-2.5"><FuelStationBadge stationName={t.stationName} /></td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text">{t.customerName}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-emerald-400 font-bold">{ksh(t.amount)}</td>
                <td className="py-2.5 px-2.5"><FuelBadge tone={t.method === 'Cash' ? 'green' : 'violet'}>{t.method || '—'}</FuelBadge></td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text">{ksh(t.balanceAfter)}</td>
                <td className="py-2.5 px-2.5 text-xs text-gray-500">{t.reference || '—'}</td>
                <td className="py-2.5 px-2.5 text-xs text-gray-500 max-w-[180px] truncate">{t.note || '—'}</td>
              </tr>
            );
          })}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading repayments…</p>}
          <FuelExportButton name="fuelsuite_paid_debts" rows={filtered.map(t => ({
            Date: t.dateKey, Station: stationCsvLabel(t.stationName), Customer: t.customerName, Amount: t.amount, Method: t.method || '',
            'Balance After': t.balanceAfter, Reference: t.reference || '', Note: t.note || '',
          }))} />
        </div>
      </FuelSection>

      {error && (
        <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Repayment modal */}
      {modalOpen && (
        <FuelModal
          title="Record debt repayment"
          icon={Banknote}
          onClose={() => setModalOpen(false)}
          width="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Record repayment'}
              </button>
            </>
          }
        >
          {owingCustomers.length === 0 ? (
            <div className="text-xs text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/30 rounded-lg px-3 py-2.5">
              No customers currently owe anything.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Customer" required hint={selectedCustomer ? `Owes ${ksh(selectedCustomer.balance)}` : undefined}>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    {owingCustomers.map(c => <option key={c.id} value={c.id}>{c.name} — owes {ksh(c.balance)}</option>)}
                  </select>
                </FuelField>
                <FuelField label="Date" required>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
                </FuelField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Amount (KSh)" required hint="Partial payments are fine">
                  <input type="number" className={fuelInputClass} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
                </FuelField>
                <FuelField label="Method" required>
                  <select value={method} onChange={e => setMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    {FUEL_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FuelField>
              </div>
              <div className="flex items-center justify-between bg-emerald-500/[0.07] border border-emerald-500/25 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Balance after payment</span>
                <span className={`text-sm font-black font-mono ${balanceAfter <= 0.009 ? 'text-emerald-400' : 'text-violet-400'}`}>{ksh(balanceAfter)}</span>
              </div>
              {overpayWarning && (
                <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2">
                  This is more than the customer owes — the balance will go negative (customer credit).
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Reference (optional)">
                  <input type="text" className={fuelInputClass} value={reference} onChange={e => setReference(e.target.value)} placeholder="M-Pesa code / receipt" />
                </FuelField>
                <FuelField label="Note (optional)">
                  <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth noting" />
                </FuelField>
              </div>
              {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
            </>
          )}
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
