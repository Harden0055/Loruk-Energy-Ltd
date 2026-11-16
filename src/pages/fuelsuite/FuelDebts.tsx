/**
 * FuelSuite — Debts: credit customers, limits, balances and credit transactions.
 * Balance = opening balance + credit sales − repayments. Over-limit warnings.
 */
import React, { useMemo, useState } from 'react';
import {
  HandCoins, Plus, Pencil, Trash2, Search, Save, Users, CreditCard, AlertTriangle, UserRound,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  useFuelCreditCustomers, useFuelCreditTxs, useFuelProductSales, useFuelStations,
  createFuelCreditCustomer, updateFuelCreditCustomer, recordFuelCreditTx, deleteFuelCreditCustomer,
  FuelCreditCustomer,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { useFuelStationScope } from './fuelStationContext';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelStationBadge, FuelUnassignedNotice, FuelExportButton,
  stationCsvLabel, ksh, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

export default function FuelDebts({ initialAction }: { initialAction?: string }) {
  const { data: customers, loading } = useFuelCreditCustomers();
  const { data: txs } = useFuelCreditTxs();
  const { data: productSales } = useFuelProductSales();
  const { data: stations } = useFuelStations();
  const { scope, isAll, inScope } = useFuelStationScope();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [customerModal, setCustomerModal] = useState<{ open: boolean; editing: FuelCreditCustomer | null }>({ open: initialAction === 'addCreditCustomer', editing: null });
  const [creditModal, setCreditModal] = useState<FuelCreditCustomer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FuelCreditCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer form
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cStationId, setCStationId] = useState('');
  const [cLimit, setCLimit] = useState('');
  const [cOpening, setCOpening] = useState('');
  // Credit tx form
  const [tDate, setTDate] = useState(todayKey());
  const [tAmount, setTAmount] = useState('');
  const [tNote, setTNote] = useState('');

  const openCustomerModal = (c: FuelCreditCustomer | null) => {
    setCName(c?.name || '');
    setCPhone(c?.phone || '');
    setCStationId(c ? (c.stationId || '') : (scope !== 'all' ? scope : ''));
    setCLimit(c ? String(c.creditLimit) : '');
    setCOpening('');
    setCustomerModal({ open: true, editing: c });
    setError(null);
  };

  const saveCustomer = async () => {
    if (!cName.trim()) { setError('Customer name is required.'); return; }
    setSaving(true);
    try {
      const stationFields = {
        stationId: cStationId || undefined,
        stationName: stations.find(s => s.id === cStationId)?.name || undefined,
      };
      if (customerModal.editing) {
        await updateFuelCreditCustomer(customerModal.editing.id, customerModal.editing, {
          name: cName.trim(),
          phone: cPhone.trim(),
          ...stationFields,
          creditLimit: parseFloat(cLimit) || 0,
        });
      } else {
        await createFuelCreditCustomer({
          name: cName.trim(),
          phone: cPhone.trim(),
          ...stationFields,
          creditLimit: parseFloat(cLimit) || 0,
          openingBalance: parseFloat(cOpening) || 0,
        });
      }
      setCustomerModal({ open: false, editing: null });
    } catch (err) {
      console.error(err);
      setError('Failed to save the customer.');
    } finally {
      setSaving(false);
    }
  };

  const saveCreditTx = async () => {
    if (!creditModal) return;
    const amt = parseFloat(tAmount) || 0;
    if (amt <= 0) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    try {
      await recordFuelCreditTx({
        customerId: creditModal.id,
        customerName: creditModal.name,
        stationId: creditModal.stationId,
        stationName: creditModal.stationName,
        date: parseDateToTimestamp(tDate),
        dateKey: tDate,
        amount: amt,
        type: 'credit',
        note: tNote.trim() || undefined,
      }, creditModal.balance || 0);
      setCreditModal(null);
      setTAmount(''); setTNote('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to record the credit transaction.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteFuelCreditCustomer(deleteTarget.id, deleteTarget.name);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete the customer.');
    } finally {
      setSaving(false);
    }
  };

  const usageOf = (c: FuelCreditCustomer) =>
    c.creditLimit > 0 ? Math.min(100, Math.round(((c.balance || 0) / c.creditLimit) * 100)) : 0;

  // Station scope: customers belong to a station; unassigned ones stay visible
  // only under All Stations (never guessed into a station).
  const scopedCustomers = useMemo(() => customers.filter(c => inScope(c.stationId)), [customers, inScope]);
  const unassignedCount = useMemo(() => customers.filter(c => !c.stationId).length, [customers]);

  const sorted = useMemo(
    () => [...scopedCustomers].sort((a, b) => (b.balance || 0) - (a.balance || 0)),
    [scopedCustomers]
  );
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? sorted.filter(c => c.name.toLowerCase().includes(s) || (c.phone || '').includes(s)) : sorted;
  }, [sorted, search]);

  const stats = useMemo(() => {
    const outstanding = scopedCustomers.reduce((s, c) => s + (c.balance || 0), 0);
    const withBalance = scopedCustomers.filter(c => (c.balance || 0) > 0.009);
    const overLimit = scopedCustomers.filter(c => c.creditLimit > 0 && (c.balance || 0) > c.creditLimit);
    const creditSalesInRange = productSales.filter(s => s.onCredit && range.inRange(s.date) && inScope(s.stationId));
    const chart = withBalance.slice(0, 8).map(c => ({ name: c.name, balance: c.balance, limit: c.creditLimit }));
    return { outstanding, withBalance: withBalance.length, overLimit: overLimit.length, creditSalesInRange, chart };
  }, [scopedCustomers, productSales, inScope, range.start, range.end]);

  const recentCredits = useMemo(
    () => txs.filter(t => t.type === 'credit' && inScope(t.stationId)),
    [txs, inScope]
  );

  return (
    <FuelPageShell
      icon={HandCoins}
      title="Debts"
      subtitle="Credit customers, limits and outstanding balances"
      actions={
        <button type="button" onClick={() => openCustomerModal(null)} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Credit Customer
        </button>
      }
    >
      {!isAll && <FuelUnassignedNotice count={unassignedCount} noun="credit customers" />}
      <FuelKpiGrid
        kpis={[
          { label: 'Outstanding Total', value: ksh(stats.outstanding), icon: HandCoins, tone: stats.overLimit > 0 ? 'red' : 'violet' },
          { label: 'Customers with Balance', value: String(stats.withBalance), sub: `of ${scopedCustomers.length}`, icon: Users, tone: 'amber' },
          { label: 'Over Limit', value: String(stats.overLimit), sub: 'needs attention', icon: AlertTriangle, tone: stats.overLimit > 0 ? 'red' : 'slate' },
          { label: 'Credit Sales (period)', value: ksh(stats.creditSalesInRange.reduce((s, x) => s + x.total, 0)), icon: CreditCard, tone: 'violet' },
        ]}
      />

      <FuelSection title="Balances by customer" icon={Users} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No customers with balances yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} layout="vertical" margin={{ top: 4, right: 16, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [ksh(Number(v)), name === 'balance' ? 'Balance' : 'Limit']}
                />
                <Bar dataKey="balance" radius={[0, 4, 4, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Credit customers"
        icon={UserRound}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search customers…" />}
      >
        <FuelTable
          headers={['Customer', 'Station', 'Phone', 'Balance', 'Credit Limit', 'Usage', 'Status', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(c => {
            const usage = usageOf(c);
            const over = c.creditLimit > 0 && (c.balance || 0) > c.creditLimit;
            return (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text">{c.name}</td>
                <td className="py-2.5 px-2.5"><FuelStationBadge stationName={c.stationName} /></td>
                <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{c.phone || '—'}</td>
                <td className={`py-2.5 px-2.5 text-xs font-mono font-bold ${(c.balance || 0) > 0 ? 'text-violet-400' : 'text-emerald-400'}`}>{ksh(c.balance || 0)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{ksh(c.creditLimit)}</td>
                <td className="py-2.5 px-2.5 min-w-[110px]">
                  {c.creditLimit > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${over ? 'bg-red-500' : usage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usage}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold font-mono ${over ? 'text-red-400' : 'text-theme-text-muted'}`}>{usage}%</span>
                    </div>
                  ) : <span className="text-[10px] text-gray-500">no limit</span>}
                </td>
                <td className="py-2.5 px-2.5">
                  {over ? <FuelBadge tone="red">over limit</FuelBadge>
                    : (c.balance || 0) > 0 ? <FuelBadge tone="violet">owing</FuelBadge>
                    : <FuelBadge tone="green">clear</FuelBadge>}
                </td>
                <td className="py-2.5 px-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer" title="Delete customer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => { setTDate(todayKey()); setTAmount(''); setTNote(''); setCreditModal(c); }} className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors cursor-pointer" title="Record credit transaction">
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => openCustomerModal(c)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Edit customer & limit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading customers…</p>}
          <FuelExportButton name="fuelsuite_credit_customers" rows={filtered.map(c => ({
            Customer: c.name, Station: stationCsvLabel(c.stationName), Phone: c.phone || '', Balance: c.balance || 0, 'Credit Limit': c.creditLimit,
            'Usage %': usageOf(c),
          }))} />
        </div>
      </FuelSection>

      <FuelSection title="Recent credit transactions" icon={CreditCard}>
        <FuelTable headers={['Date', 'Station', 'Customer', 'Type', 'Amount', 'Balance After', 'Note']} empty={recentCredits.length === 0}>
          {recentCredits.slice(0, 12).map(t => (
            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(t.dateKey)}</td>
              <td className="py-2.5 px-2.5"><FuelStationBadge stationName={t.stationName} /></td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text">{t.customerName}</td>
              <td className="py-2.5 px-2.5"><FuelBadge tone="amber">credit</FuelBadge></td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-amber-400 font-bold">{ksh(t.amount)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-violet-400">{ksh(t.balanceAfter)}</td>
              <td className="py-2.5 px-2.5 text-xs text-gray-500 max-w-[200px] truncate">{t.note || '—'}</td>
            </tr>
          ))}
        </FuelTable>
      </FuelSection>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Customer modal */}
      {customerModal.open && (
        <FuelModal
          title={customerModal.editing ? 'Edit credit customer' : 'Add credit customer'}
          icon={UserRound}
          onClose={() => setCustomerModal({ open: false, editing: null })}
          footer={
            <>
              <button type="button" onClick={() => setCustomerModal({ open: false, editing: null })} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={saveCustomer} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save customer'}
              </button>
            </>
          }
        >
          <FuelField label="Customer / business name" required>
            <input type="text" className={fuelInputClass} value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Kwanza Hotel" />
          </FuelField>
          <FuelField label="Phone (optional)">
            <input type="tel" className={fuelInputClass} value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="07…" />
          </FuelField>
          <FuelField label="Station" hint="Which station this customer buys at">
            <select value={cStationId} onChange={e => setCStationId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
              <option value="">— Unassigned —</option>
              {stations.filter(s => s.active !== false).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FuelField>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Credit limit (KSh)" required>
              <input type="number" className={fuelInputClass} value={cLimit} onChange={e => setCLimit(e.target.value)} placeholder="0" min="0" />
            </FuelField>
            {!customerModal.editing && (
              <FuelField label="Opening balance (KSh)" hint="Owed from before FuelSuite">
                <input type="number" className={fuelInputClass} value={cOpening} onChange={e => setCOpening(e.target.value)} placeholder="0" min="0" />
              </FuelField>
            )}
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Credit transaction modal */}
      {creditModal && (
        <FuelModal
          title={`Record credit — ${creditModal.name}`}
          icon={CreditCard}
          onClose={() => setCreditModal(null)}
          footer={
            <>
              <button type="button" onClick={() => setCreditModal(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={saveCreditTx} disabled={saving} className="px-4 py-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Record credit'}
              </button>
            </>
          }
        >
          <p className="text-[11px] text-theme-text-muted">
            Current balance: <span className="font-mono font-bold text-violet-400">{ksh(creditModal.balance)}</span>
            {' · '}Limit: <span className="font-mono font-bold text-theme-text">{ksh(creditModal.creditLimit)}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Date" required>
              <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
            </FuelField>
            <FuelField label="Amount (KSh)" required>
              <input type="number" className={fuelInputClass} value={tAmount} onChange={e => setTAmount(e.target.value)} placeholder="0" min="0" />
            </FuelField>
          </div>
          <FuelField label="Note (optional)">
            <input type="text" className={fuelInputClass} value={tNote} onChange={e => setTNote(e.target.value)} placeholder="e.g. goods supplied on account" />
          </FuelField>
          {creditModal.creditLimit > 0 &&
            (creditModal.balance || 0) + (parseFloat(tAmount) || 0) > creditModal.creditLimit && (
            <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> This credit would exceed the customer's limit.
            </div>
          )}
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <FuelModal
          title="Delete credit customer?"
          icon={Trash2}
          width="max-w-md"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Keep them</button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          }
        >
          <p className="text-xs text-theme-text-muted">
            Delete <span className="font-bold text-theme-text">{deleteTarget.name}</span> with an outstanding balance of{' '}
            <span className="font-mono font-bold text-violet-400">{ksh(deleteTarget.balance || 0)}</span>? Their transaction history remains for reference.
          </p>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
