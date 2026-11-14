/**
 * FuelSuite — Products: LPG cylinders, burners, grills & other items.
 * Empty cylinders are non-sellable containers. Buying/selling prices editable.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Package, Plus, Pencil, Trash2, Search, Save, ShoppingCart, Ban, CheckCircle2, Layers,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useFuelProducts, createFuelProduct, updateFuelProduct, deleteFuelProduct,
  useFuelProductSales, useFuelPurchases, ensureFuelDefaultProducts,
  FUEL_PRODUCT_CATEGORIES, FuelProduct,
} from '../../lib/fuelDb';
import { useFuelDateRange } from './fuelShared';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelExportButton, ksh, fmtQty, fuelInputClass,
} from './fuelShared';

const CAT_COLORS: Record<string, string> = {
  'LPG Cylinder': '#34D399',
  'Burner': '#6366F1',
  'Grill': '#8B5CF6',
  'White Oils': '#38BDF8',
  'Other': '#94A3B8',
};

/** Next free item code: FS-0001, FS-0002, … skipping codes already taken. */
const nextItemCode = (products: FuelProduct[]) => {
  const taken = new Set(products.map(p => (p.itemCode || '').toUpperCase()).filter(Boolean));
  let n = products.length + 1;
  for (let i = 1; i <= products.length + 1; i++) {
    if (!taken.has(`FS-${String(i).padStart(4, '0')}`)) { n = i; break; }
  }
  return `FS-${String(n).padStart(4, '0')}`;
};

export default function FuelProducts({ initialAction }: { initialAction?: string }) {
  const { data: products, loading } = useFuelProducts();
  const { data: sales } = useFuelProductSales();
  const { data: purchases } = useFuelPurchases();
  const range = useFuelDateRange();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: FuelProduct | null }>({ open: initialAction === 'addProduct', editing: null });
  const [deleteTarget, setDeleteTarget] = useState<FuelProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(FUEL_PRODUCT_CATEGORIES[0]);  const [unit, setUnit] = useState('pcs');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sellable, setSellable] = useState(true);

  // Seed Premium & Diesel (White Oils) once, when no products exist yet
  useEffect(() => {
    ensureFuelDefaultProducts(products).catch(console.error);
  }, [products.length]);

  const openModal = (p: FuelProduct | null) => {
    setItemCode(p?.itemCode || nextItemCode(products));
    setName(p?.name || '');
    setCategory(p?.category || FUEL_PRODUCT_CATEGORIES[0]);
    setUnit(p?.unit || 'pcs');
    setBuyingPrice(p ? String(p.buyingPrice) : '');
    setSellingPrice(p ? String(p.sellingPrice) : '');
    setStock(p ? String(p.stock) : '');
    setSellable(p ? p.sellable : true);
    setModal({ open: true, editing: p });
    setError(null);
  };

  const save = async () => {
    if (!name.trim()) { setError('Product name is required.'); return; }
    const bp = parseFloat(buyingPrice) || 0;
    const sp = parseFloat(sellingPrice) || 0;
    const st = parseFloat(stock) || 0;
    setSaving(true);
    try {
      const payload = {
        itemCode: itemCode.trim(),
        name: name.trim(), category, unit: unit.trim() || 'pcs',
        buyingPrice: bp, sellingPrice: sp, stock: st, sellable,
      };
      if (modal.editing) {
        await updateFuelProduct(modal.editing.id, modal.editing, payload);
      } else {
        await createFuelProduct(payload);
      }
      setModal({ open: false, editing: null });
    } catch (err) {
      console.error(err);
      setError('Failed to save the product.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteFuelProduct(deleteTarget.id, deleteTarget.name);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete the product.');
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    : products;

  // Stats (respect date filter where relevant)
  const stats = useMemo(() => {
    const soldInRange = sales.filter(s => range.inRange(s.date));
    const boughtInRange = purchases.filter(p => range.inRange(p.date));
    const stockValue = products.reduce((s, p) => s + (p.stock || 0) * (p.buyingPrice || 0), 0);
    const soldQtyByProduct = new Map<string, number>();
    soldInRange.forEach(s => soldQtyByProduct.set(s.productId, (soldQtyByProduct.get(s.productId) || 0) + s.qty));
    return {
      count: products.length,
      sellableCount: products.filter(p => p.sellable).length,
      stockValue,
      chart: products
        .map(p => ({ name: p.name, qty: soldQtyByProduct.get(p.id) || 0, cat: p.category }))
        .filter(d => d.qty > 0)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8),
    };
  }, [products, sales, purchases, range.start, range.end]);

  return (
    <FuelPageShell
      icon={Package}
      title="Products & Prices"
      subtitle="LPG cylinders, burners, grills and other items — buying & selling prices, stock levels"
      actions={
        <button type="button" onClick={() => openModal(null)} className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      }
    >
      <FuelKpiGrid
        kpis={[
          { label: 'Products', value: String(stats.count), sub: `${stats.sellableCount} sellable`, icon: Package, tone: 'green' },
          { label: 'Stock Value (Cost)', value: ksh(stats.stockValue), icon: Layers, tone: 'violet' },
          { label: 'Range Filter', value: range.label, icon: Search, tone: 'slate' },
        ]}
      />

      <FuelSection
        title="Units sold in selected period"
        icon={ShoppingCart}
        right={<range.FilterRow />}
      >
        <div style={{ width: '100%', height: 200 }}>
          {stats.chart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted">No product sales in this period yet</div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-14} dy={8} height={44} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${v} ${'units'}`, 'Sold']}
                />
                <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                  {stats.chart.map((d, i) => <Cell key={i} fill={CAT_COLORS[d.cat] || '#94A3B8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </FuelSection>

      <FuelSection
        title="Product list"
        icon={Package}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search products…" />}
      >
        <FuelTable
          headers={['Code', 'Product', 'Category', 'Buying', 'Selling', 'Margin', 'Stock', 'Sellable', '']}
          empty={filtered.length === 0}
        >
          {filtered.map(p => {
            const margin = (p.sellingPrice || 0) - (p.buyingPrice || 0);
            const lowStock = p.sellable && (p.stock || 0) <= 0;
            return (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-2.5 text-xs font-mono text-violet-400 font-bold whitespace-nowrap">{p.itemCode || '—'}</td>
                <td className="py-2.5 px-2.5 text-xs font-bold text-theme-text">{p.name}</td>
                <td className="py-2.5 px-2.5"><FuelBadge tone={p.category === 'LPG Cylinder' ? 'green' : p.category === 'Burner' ? 'violet' : 'slate'}>{p.category}</FuelBadge></td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text-muted">{ksh(p.buyingPrice)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono text-theme-text">{ksh(p.sellingPrice)}</td>
                <td className={`py-2.5 px-2.5 text-xs font-mono ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ksh(margin)}</td>
                <td className="py-2.5 px-2.5 text-xs font-mono">
                  <span className={lowStock ? 'text-amber-400' : 'text-theme-text'}>{fmtQty(p.stock)} {p.unit}</span>
                  {lowStock && <FuelBadge tone="amber">out</FuelBadge>}
                </td>
                <td className="py-2.5 px-2.5">
                  {p.sellable
                    ? <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                    : <span className="text-amber-400 flex items-center gap-1 text-[10px] font-bold"><Ban className="w-3.5 h-3.5" /> Container</span>}
                </td>
                <td className="py-2.5 px-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer" title="Delete product">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => openModal(p)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Edit product & prices">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </FuelTable>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          {loading && <p className="text-xs text-gray-500">Loading products…</p>}
          <FuelExportButton name="fuelsuite_products" rows={filtered.map(p => ({
            'Item Code': p.itemCode || '',
            Name: p.name, Category: p.category, Unit: p.unit,
            'Buying Price': p.buyingPrice, 'Selling Price': p.sellingPrice,
            Stock: p.stock, Sellable: p.sellable ? 'Yes' : 'No (container)',
          }))} />
        </div>
      </FuelSection>

      {/* Product modal */}
      {modal.open && (
        <FuelModal
          title={modal.editing ? 'Edit product' : 'Add product'}
          icon={Package}
          onClose={() => setModal({ open: false, editing: null })}
          footer={
            <>
              <button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save product'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-[minmax(0,110px)_1fr] gap-3">
            <FuelField label="Item code" hint="Auto-suggested">
              <input type="text" className={fuelInputClass} value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="FS-0001" />
            </FuelField>
            <FuelField label="Product name" required>
              <input type="text" className={fuelInputClass} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LPG Cylinder 6kg (Filled)" />
            </FuelField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Category" required>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                {FUEL_PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FuelField>
            <FuelField label="Unit">
              <input type="text" className={fuelInputClass} value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs" />
            </FuelField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FuelField label="Buying price (KSh)" required>
              <input type="number" className={fuelInputClass} value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} placeholder="0" />
            </FuelField>
            <FuelField label="Selling price (KSh)" required>
              <input type="number" className={fuelInputClass} value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0" />
            </FuelField>
          </div>
          <FuelField label="Stock on hand" required hint="Updated automatically by purchases and sales">
            <input type="number" className={fuelInputClass} value={stock} onChange={e => setStock(e.target.value)} placeholder="0" />
          </FuelField>
          <label className="flex items-start gap-2 text-xs text-theme-text cursor-pointer">
            <input type="checkbox" checked={sellable} onChange={e => setSellable(e.target.checked)} className="accent-emerald-500 mt-0.5 cursor-pointer" />
            <span>Sellable product. <span className="text-amber-400 font-semibold">Uncheck for empty cylinders / containers</span> — these hold stock but can never be recorded as sold.</span>
          </label>
          {error && <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        </FuelModal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <FuelModal
          title="Delete product?"
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
            Delete <span className="font-bold text-theme-text">{deleteTarget.name}</span>? Past purchases and sales keep their records, but the product will no longer appear in pickers. Stock will not be adjusted.
          </p>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
