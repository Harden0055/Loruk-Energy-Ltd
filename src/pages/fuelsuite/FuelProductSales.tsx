/**
 * FuelSuite — Product Sales: sell LPG cylinders, burners, grills etc.
 * Sales reduce stock, warn on over-selling, and keep credit sales separate
 * from cash collected (credit creates a debt transaction instead).
 */
import React, { useMemo, useState } from 'react';
import {
  ShoppingCart, Plus, Trash2, Search, Save, TrendingUp, CreditCard, Banknote, AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  useFuelProductSales, useFuelProducts, useFuelCreditCustomers, useFuelStations,
  createFuelProductSale, recordFuelCreditTx, deleteFuelProductSale,
  FuelProductSale, FuelProduct,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { useFuelStationScope } from './fuelStationContext';
import { parseDateToTimestamp } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelStationBadge, FuelUnassignedNotice, FuelExportButton,
  stationCsvLabel, ksh, fmtQty, fmtDate, todayKey, fuelInputClass,
} from './fuelShared';

const CASH_METHODS = ['Cash', 'M-Pesa', 'Bank', 'Cheque', 'Other'];
const PIE_COLORS = ['#34D399', '#6366F1', '#8B5CF6', '#F59E0B', '#38BDF8', '#94A3B8'];

export default function FuelProductSales({ initialAction }: { initialAction?: string }) {
  const { data: sales, loading } = useFuelProductSales();
  const { data: products } = useFuelProducts();
  const { data: creditCustomers } = useFuelCreditCustomers();
  const { data: stations } = useFuelStations();
  const { scope, isAll, inScope } = useFuelStationScope();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'addSale');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
  const [formStationId, setFormStationId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(CASH_METHODS[0]);
  const [onCredit, setOnCredit] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const selectedProduct = products.find(p => p.id === productId);
  const total = (parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0);
  const stockWarning = selectedProduct ? (parseFloat(qty) || 0) > (selectedProduct.stock || 0) : false;
  const notSellable = selectedProduct ? !selectedProduct.sellable : false;
  const selectedCreditCustomer = creditCustomers.find(c => c.id === creditCustomerId);
  const overLimit = selectedCreditCustomer && selectedCreditCustomer.creditLimit > 0
    ? (selectedCreditCustomer.balance || 0) + total > selectedCreditCustomer.creditLimit
    : false;

  const pickProduct = (id: string) => {
    setProductId(id);
    const p = products.find(x => x.id === id);
    if (p && p.sellingPrice) setUnitPrice(String(p.sellingPrice));
  };

  const save = async () => {
    if (!selectedProduct) { setError('Choose a product.'); return; }
    if (notSellable) { setError('This product is a container (e.g. empty cylinder) and cannot be sold.'); return; }
    const q = parseFloat(qty) || 0;
    const up = parseFloat(unitPrice) || 0;
    if (q <= 0) { setError('Quantity must be greater than zero.'); return; }
    if (up <= 0) { setError('Selling price must be greater than zero.'); return; }
    if (onCredit && !creditCustomerId) { setError('Choose a credit customer for a credit sale.'); return; }
    setSaving(true);
    try {
      let newBalance: number | undefined;
      if (onCredit && selectedCreditCustomer) {
        newBalance = Math.round(((selectedCreditCustomer.balance || 0) + q * up) * 100) / 100;
        await recordFuelCreditTx({
          customerId: selectedCreditCustomer.id,
          customerName: selectedCreditCustomer.name,
          stationId: selectedCreditCustomer.stationId,
          stationName: selectedCreditCustomer.stationName,
          date: parseDateToTimestamp(date),
          dateKey: date,
          amount: q * up,
          type: 'credit',
          note: `Product sale: ${selectedProduct.name} × ${q}`,
        }, selectedCreditCustomer.balance || 0);
      }
      const formStation = stations.find(s => s.id === formStationId);
      await createFuelProductSale({
        date: parseDateToTimestamp(date),
        dateKey: date,
        stationId: formStationId || undefined,
        stationName: formStation?.name || undefined,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        qty: q,
        unitPrice: up,
        total: q * up,
        paymentMethod: onCredit ? 'Credit' : paymentMethod,
        onCredit,
        creditCustomerId: onCredit ? selectedCreditCustomer.id : undefined,
        creditCustomerName: onCredit ? selectedCreditCustomer.name : undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }, selectedProduct, newBalance);
      setModalOpen(false);
      setQty(''); setReference(''); setNote(''); setOnCredit(false); setCreditCustomerId('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save the sale.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (s: FuelProductSale) => {
    if (s.onCredit) {
      setError('Credit sales are managed on the Debts page — delete the credit transaction there.');
      return;
    }
    try {
      await deleteFuelProductSale(s, products.find(p => p.id === s.productId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete the sale.');
    }
  };

  // ---- Filtering + stats (respect the station scope) ----
  const inRangeAll = useMemo(() => sales.filter(s => range.inRange(s.date)), [sales, range.start, range.end]);
  const unassignedCount = useMemo(() => inRangeAll.filter(s => !s.stationId).length, [inRangeAll]);
  const inRangeSales = useMemo(() => inRangeAll.filter(s => inScope(s.stationId)), [inRangeAll, inScope]);

  // Products visible in the picker: with a station selected, that station's
  // products plus unassigned ones (so legacy stock can still be sold).
  const productOptions = useMemo(
    () => (isAll ? products : products.filter(p => p.stationId === scope || !p.stationId)),
    [products, isAll, scope]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s
      ? inRangeSales.filter(x =>
          x.productName.toLowerCase().includes(s) ||
          (x.creditCustomerName || '').toLowerCase().includes(s) ||
          (x.reference || '').toLowerCase().includes(s))
      : inRangeSales;
  }, [inRangeSales, search]);

  const stats = useMemo(() => {
    const cash = inRangeSales.filter(s => !s.onCredit).reduce((a, s) => a + s.total, 0);
    const credit = inRangeSales.filter(s => s.onCredit).reduce((a, s) => a + s.total, 0);
    const byMethod = new Map<string, number>();
    inRangeSales.filter(s => !s.onCredit).forEach(s => byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) || 0) + s.total));
    const chart = [...byMethod.entries()].map(([name, value]) => ({ name, value }));
    return { cash, credit, total: cash + credit, chart };
  }, [inRangeSales]);

  return (
    <FuelPageShell
      icon={ShoppingCart}
      title="Product Sales"
      subtitle="Sell LPG cylinders, burners, grills & more — stock reduces automatically"
      actions={
        <button type="button" onClick={() => { setError(null); setFormStationId(scope !== 'all' ? scope : ''); setModalOpen(true); }} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Record Sale
        </button>
      }
    >
      {!isAll && <FuelUnassignedNotice count={unassignedCount} noun="product sales" />}
      <FuelKpiGrid
        kpis={[
          { label: 'Total Sales', value: ksh(stats.total), sub: range.label, icon: TrendingUp, tone: 'green' },
          { label: 'Cash Collected', value: ksh(stats.cash), icon: Banknote, tone: 'violet' },
          { label: 'Credit Sales', value: ksh(stats.credit), sub: 'not yet collected', icon: CreditCard, tone: 'amber' },
          { label: 'Transactions', value: String(inRangeSales.length), icon: ShoppingCart, tone: 'slate' },
        ]}
      />

      <FuelSection title="Cash sales by payment method" icon={Banknote} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No cash sales in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.chart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {stats.chart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(0,0,0,0.3)" />)}
                </Pie>
                <Legend formatter={(v: any) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [ksh(Number(v)), 'Collected']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Sales records"
        icon={ShoppingCart}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search product, customer or reference…" />}
      >
        <FuelTable
          headers={['Date', 'Station', 'Product', 'Qty', 'Unit Price', 'Total', 'Payment', 'Customer / Ref', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(s => (
            <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(s.dateKey)}</td>
              <td className="py-2.5 px-2.5"><FuelStationBadge stationName={s.stationName} /></td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text">{s.productName}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-emerald-400">{fmtQty(s.qty)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{ksh(s.unitPrice)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text font-bold">{ksh(s.total)}</td>
              <td className="py-2.5 px-2.5">
                <FuelBadge tone={s.onCredit ? 'amber' : s.paymentMethod === 'Cash' ? 'green' : 'violet'}>{s.paymentMethod}</FuelBadge>
              </td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{s.creditCustomerName || s.reference || '—'}</td>
              <td className="py-2.5 px-2.5">
                <div className="flex justify-end">
                  <button type="button" onClick={() => confirmDelete(s)} disabled={s.onCredit} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={s.onCredit ? 'Credit sales are managed in Debts' : 'Delete sale'}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading sales…</p>}
          <FuelExportButton name="fuelsuite_product_sales" rows={filtered.map(s => ({
            Date: s.dateKey, Station: stationCsvLabel(s.stationName), Product: s.productName, Qty: s.qty, 'Unit Price': s.unitPrice, Total: s.total,
            Payment: s.paymentMethod, 'On Credit': s.onCredit ? 'Yes' : 'No',
            Customer: s.creditCustomerName || '', Reference: s.reference || '', Note: s.note || '',
          }))} />
        </div>
      </FuelSection>

      {/* Record sale modal */}
      {modalOpen && (
        <FuelModal
          title="Record product sale"
          icon={ShoppingCart}
          onClose={() => setModalOpen(false)}
          width="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save sale'}
              </button>
            </>
          }
        >
          {productOptions.filter(p => p.sellable).length === 0 ? (
            <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2.5">
              No sellable products for this station yet. Add products in Products &amp; Prices first (empty cylinders cannot be sold).
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Date" required>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
                </FuelField>
                <FuelField label="Station" hint="Where the sale happened">
                  <select value={formStationId} onChange={e => setFormStationId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    <option value="">— Unassigned / company-wide —</option>
                    {stations.filter(s => s.active !== false).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </FuelField>
              </div>
              <FuelField label="Product" required>
                <select value={productId} onChange={e => pickProduct(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                  <option value="">— choose —</option>
                  {productOptions.map(p => (
                    <option key={p.id} value={p.id} disabled={!p.sellable}>
                      {p.name}{!p.stationName ? ' (unassigned)' : ''}{!p.sellable ? ' — container, not sellable' : ''}
                    </option>
                  ))}
                </select>
              </FuelField>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Quantity" required hint={selectedProduct ? `In stock: ${fmtQty(selectedProduct.stock)} ${selectedProduct.unit}` : undefined}>
                  <input type="number" className={fuelInputClass} value={qty} onChange={e => setQty(e.target.value)} placeholder="0" min="0" />
                </FuelField>
                <FuelField label="Selling price per unit (KSh)" required>
                  <input type="number" className={fuelInputClass} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0" min="0" />
                </FuelField>
              </div>
              <div className="flex items-center justify-between bg-emerald-500/[0.07] border border-emerald-500/25 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Sale total</span>
                <span className="text-sm font-black font-mono text-theme-text">{ksh(total)}</span>
              </div>
              {notSellable && (
                <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> This is a container (e.g. an empty cylinder) — it cannot be recorded as sold.
                </div>
              )}
              {stockWarning && !notSellable && (
                <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> This sale would exceed available stock ({fmtQty(selectedProduct?.stock || 0)} {selectedProduct?.unit}). It can still be recorded, but stock will go negative.
                </div>
              )}
              <FuelField label="Payment method" required>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={onCredit} className={`${fuelInputClass} cursor-pointer disabled:opacity-50`}>
                  {CASH_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </FuelField>
              <label className="flex items-center gap-2 text-xs text-theme-text cursor-pointer">
                <input type="checkbox" checked={onCredit} onChange={e => setOnCredit(e.target.checked)} className="accent-violet-500 cursor-pointer" />
                Sale on credit (recorded as debt — not counted as cash collected)
              </label>
              {onCredit && (
                <div className="space-y-2.5">
                  <FuelField label="Credit customer" required hint={formStationId ? 'Showing customers of the selected station (plus unassigned)' : undefined}>
                    <select value={creditCustomerId} onChange={e => setCreditCustomerId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                      <option value="">— choose —</option>
                      {creditCustomers
                        .filter(c => !formStationId || !c.stationId || c.stationId === formStationId)
                        .map(c => <option key={c.id} value={c.id}>{c.name}{!c.stationName && formStationId ? ' (unassigned)' : ''}</option>)}
                    </select>
                  </FuelField>
                  {selectedCreditCustomer && (
                    <p className="text-[11px] text-theme-text-muted">
                      Current balance: <span className="font-mono font-bold text-amber-400">{ksh(selectedCreditCustomer.balance)}</span>
                      {' · '}Limit: <span className="font-mono font-bold text-theme-text">{ksh(selectedCreditCustomer.creditLimit)}</span>
                    </p>
                  )}
                  {overLimit && (
                    <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> This sale would exceed the customer's credit limit.
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Reference (optional)">
                  <input type="text" className={fuelInputClass} value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt no." />
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
