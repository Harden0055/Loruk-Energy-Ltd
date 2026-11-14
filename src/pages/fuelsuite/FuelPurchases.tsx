/**
 * FuelSuite — Purchases: supplier, product, qty, buying price, payment method.
 * Purchases add stock (and optionally the new buying price) — never recorded
 * as an expense. Includes the "funded from sales proceeds" panel:
 * proceeds = cash-collected product sales + payments received − spending.
 */
import React, { useMemo, useState } from 'react';
import {
  ShoppingBag, Plus, Trash2, Search, Save, Truck, Wallet, Banknote, TrendingDown, TrendingUp, Landmark,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { format } from 'date-fns';
import {
  useFuelPurchases, useFuelProducts, useFuelPayments, useFuelProductSales,
  createFuelPurchase, deleteFuelPurchase,
  FUEL_PAYMENT_METHODS, FuelPurchase,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import { parseDateToTimestamp, formatDateToInput } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelExportButton, ksh, fmtQty, fmtDate, todayKey, dateKeyOf, fuelInputClass,
} from './fuelShared';

const BAR_COLORS = ['#34D399', '#6366F1', '#8B5CF6', '#F59E0B', '#38BDF8', '#F87171', '#A3E635', '#94A3B8'];

export default function FuelPurchases({ initialAction }: { initialAction?: string }) {
  const { data: purchases, loading } = useFuelPurchases();
  const { data: products } = useFuelProducts();
  const { data: payments } = useFuelPayments();
  const { data: productSales } = useFuelProductSales();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(initialAction === 'addPurchase');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(todayKey());
  const [supplier, setSupplier] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(FUEL_PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [updateBuyingPrice, setUpdateBuyingPrice] = useState(true);

  const selectedProduct = products.find(p => p.id === productId);
  const totalCost = (parseFloat(qty) || 0) * (parseFloat(buyingPrice) || 0);

  // Pre-fill buying price from product
  const pickProduct = (id: string) => {
    setProductId(id);
    const p = products.find(x => x.id === id);
    if (p && p.buyingPrice) setBuyingPrice(String(p.buyingPrice));
  };

  const save = async () => {
    if (!supplier.trim()) { setError('Supplier is required.'); return; }
    if (!selectedProduct) { setError('Choose a product.'); return; }
    const q = parseFloat(qty) || 0;
    const bp = parseFloat(buyingPrice) || 0;
    if (q <= 0) { setError('Quantity must be greater than zero.'); return; }
    if (bp <= 0) { setError('Buying price must be greater than zero.'); return; }
    setSaving(true);
    try {
      await createFuelPurchase({
        date: parseDateToTimestamp(date),
        dateKey: date,
        supplier: supplier.trim(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        qty: q,
        buyingPrice: bp,
        totalCost: q * bp,
        paymentMethod,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }, selectedProduct, { updateBuyingPrice });
      setModalOpen(false);
      setSupplier(''); setQty(''); setBuyingPrice(selectedProduct.buyingPrice ? String(selectedProduct.buyingPrice) : '');
      setReference(''); setNote('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save the purchase.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (p: FuelPurchase) => {
    try {
      await deleteFuelPurchase(p, products.find(x => x.id === p.productId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete the purchase.');
    }
  };

  // ---- Filtering + stats ----
  const inRangePurchases = useMemo(() => purchases.filter(p => range.inRange(p.date)), [purchases, range.start, range.end]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s
      ? inRangePurchases.filter(p =>
          p.supplier.toLowerCase().includes(s) ||
          p.productName.toLowerCase().includes(s) ||
          (p.reference || '').toLowerCase().includes(s))
      : inRangePurchases;
  }, [inRangePurchases, search]);

  const stats = useMemo(() => {
    const total = inRangePurchases.reduce((s, p) => s + p.totalCost, 0);
    const qtyTotal = inRangePurchases.reduce((s, p) => s + p.qty, 0);
    const byProduct = new Map<string, number>();
    inRangePurchases.forEach(p => byProduct.set(p.productName, (byProduct.get(p.productName) || 0) + p.totalCost));
    const chart = [...byProduct.entries()]
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
    return { total, qtyTotal, chart, count: inRangePurchases.length };
  }, [inRangePurchases]);

  // ---- Funding from proceeds ----
  const funding = useMemo(() => {
    const cashSales = productSales
      .filter(s => range.inRange(s.date) && !s.onCredit)
      .reduce((s, x) => s + x.total, 0);
    const creditSales = productSales
      .filter(s => range.inRange(s.date) && s.onCredit)
      .reduce((s, x) => s + x.total, 0);
    const received = payments.filter(p => range.inRange(p.date)).reduce((s, p) => s + p.amount, 0);
    const spent = inRangePurchases.reduce((s, p) => s + p.totalCost, 0);
    const available = cashSales + received - spent;
    return { cashSales, creditSales, received, spent, available };
  }, [productSales, payments, inRangePurchases, range.start, range.end]);

  return (
    <FuelPageShell
      icon={ShoppingBag}
      title="Purchases"
      subtitle="Stock bought from suppliers — updates stock and buying-price history automatically"
      actions={
        <button type="button" onClick={() => { setError(null); setModalOpen(true); }} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Purchase
        </button>
      }
    >
      <FuelKpiGrid
        kpis={[
          { label: 'Purchases', value: String(stats.count), sub: 'in selected period', icon: Truck, tone: 'green' },
          { label: 'Total Spent', value: ksh(stats.total), icon: TrendingDown, tone: 'violet' },
          { label: 'Units Purchased', value: fmtQty(stats.qtyTotal), icon: ShoppingBag, tone: 'green' },
          { label: 'Avg Cost / Unit', value: stats.qtyTotal > 0 ? ksh(stats.total / stats.qtyTotal) : ksh(0), icon: Landmark, tone: 'slate' },
        ]}
      />

      {/* Funding from proceeds */}
      <FuelSection title="Funding from sales proceeds" icon={Wallet}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            { l: 'Cash Sales Collected', v: ksh(funding.cashSales), tone: 'text-emerald-400' },
            { l: 'Other Payments Received', v: ksh(funding.received), tone: 'text-violet-400' },
            { l: 'Credit Sales (Not Cash)', v: ksh(funding.creditSales), tone: 'text-amber-400' },
            { l: 'Purchase Spending (Paid)', v: ksh(funding.spent), tone: 'text-red-400' },
            { l: 'Available Proceeds', v: ksh(funding.available), tone: funding.available >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(x => (
            <div key={x.l} className="rounded-lg border border-theme-border bg-white/[0.02] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">{x.l}</p>
              <p className={`text-sm font-black font-mono mt-0.5 ${x.tone}`}>{x.v}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-theme-text-muted mt-2.5 flex items-start gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
          Available proceeds = cash-collected product sales + payments received − purchase spending. Credit sales are excluded because the money has not been collected yet.
        </p>
      </FuelSection>

      <FuelSection title="Spending by product" icon={ShoppingBag} right={<range.FilterRow />}>
        <div style={{ width: '100%', height: 220 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No purchases in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} layout="vertical" margin={{ top: 4, right: 16, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [ksh(Number(v)), 'Spent']}
                />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {stats.chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Purchase records"
        icon={Truck}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search supplier, product or reference…" />}
      >
        <FuelTable
          headers={['Date', 'Supplier', 'Product', 'Qty', 'Buying Price', 'Total', 'Payment', 'Ref', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(p => (
            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(p.dateKey)}</td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text">{p.supplier}</td>
              <td className="py-2.5 px-2.5 text-xs text-theme-text-muted">{p.productName}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-emerald-400">{fmtQty(p.qty)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{ksh(p.buyingPrice)}</td>
              <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text font-bold">{ksh(p.totalCost)}</td>
              <td className="py-2.5 px-2.5"><FuelBadge tone={p.paymentMethod === 'Cash' ? 'green' : p.paymentMethod === 'M-Pesa' ? 'violet' : 'slate'}>{p.paymentMethod}</FuelBadge></td>
              <td className="py-2.5 px-2.5 text-xs text-gray-500">{p.reference || '—'}</td>
              <td className="py-2.5 px-2.5">
                <div className="flex justify-end">
                  <button type="button" onClick={() => confirmDelete(p)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer" title="Delete purchase (reverses stock)">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading purchases…</p>}
          <FuelExportButton name="fuelsuite_purchases" rows={filtered.map(p => ({
            Date: p.dateKey, Supplier: p.supplier, Product: p.productName, Qty: p.qty,
            'Buying Price': p.buyingPrice, Total: p.totalCost,
            'Payment Method': p.paymentMethod, Reference: p.reference || '', Note: p.note || '',
          }))} />
        </div>
      </FuelSection>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Add purchase modal */}
      {modalOpen && (
        <FuelModal
          title="Add purchase"
          icon={ShoppingBag}
          onClose={() => setModalOpen(false)}
          width="max-w-xl"
          footer={
            <>
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save purchase'}
              </button>
            </>
          }
        >
          {products.filter(p => p.sellable).length === 0 ? (
            <div className="text-xs text-amber-400 bg-amber-500/[0.06] border border-amber-500/30 rounded-lg px-3 py-2.5">
              No sellable products yet. Add products (LPG cylinders, burners, grills) in Products &amp; Prices first.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Date" required>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayKey()} className={`${fuelInputClass} cursor-pointer`} />
                </FuelField>
                <FuelField label="Supplier" required>
                  <input type="text" className={fuelInputClass} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Ola Energy" />
                </FuelField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Product" required>
                  <select value={productId} onChange={e => pickProduct(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    <option value="">— choose —</option>
                    {products.filter(p => p.sellable).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </FuelField>
                <FuelField label="Quantity" required>
                  <input type="number" className={fuelInputClass} value={qty} onChange={e => setQty(e.target.value)} placeholder="0" min="0" />
                </FuelField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Buying price per unit (KSh)" required>
                  <input type="number" className={fuelInputClass} value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} placeholder="0" min="0" />
                </FuelField>
                <FuelField label="Payment method" required>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    {FUEL_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FuelField>
              </div>
              <div className="flex items-center justify-between bg-violet-500/[0.07] border border-violet-500/25 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Total cost</span>
                <span className="text-sm font-black font-mono text-theme-text">{ksh(totalCost)}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-theme-text cursor-pointer">
                <input type="checkbox" checked={updateBuyingPrice} onChange={e => setUpdateBuyingPrice(e.target.checked)} className="accent-emerald-500 cursor-pointer" />
                Update the product's buying price to match this purchase
              </label>
              <div className="grid grid-cols-2 gap-3">
                <FuelField label="Reference (optional)">
                  <input type="text" className={fuelInputClass} value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice / receipt no." />
                </FuelField>
                <FuelField label="Note (optional)">
                  <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth noting" />
                </FuelField>
              </div>
              <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
                <Banknote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                Stock increases automatically when saved. Purchases are never recorded as expenses — they are tracked here and in the proceeds panel.
              </p>
              {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
            </>
          )}
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
