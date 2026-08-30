import React, { useState, useMemo, useEffect } from 'react';
import { useFuel, InventoryItem, Product, calculatePumpMeterDelta } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard, ProductIconBadge } from '../components';
import { Plus, Pencil, Trash2, X, AlertCircle, Box, PackagePlus, PackageMinus, Tag, Eraser, Boxes } from 'lucide-react';
import { useConfirm } from '../useConfirm';
import { sortProductsList } from './ProductsView';

// Helper to reliably link any recorded item/pump/LPG string to an active master product from the Product List
export const findLinkedProduct = (recordedItemName: string | undefined, productList: Product[]): Product | undefined => {
  if (!recordedItemName || !productList || productList.length === 0) return undefined;
  const target = recordedItemName.trim().toLowerCase();

  // 1. Direct Item Code Match (e.g. "001", "002")
  const byCode = productList.find(p => p.itemCode && p.itemCode.trim().toLowerCase() === target);
  if (byCode) return byCode;

  // 2. Direct Exact Name Match
  const byExactName = productList.find(p => p.name.trim().toLowerCase() === target);
  if (byExactName) return byExactName;

  // 3. Match format "[001] Product Name" or "001 - Product Name" or "Product Name (001)"
  for (const p of productList) {
    const pCode = (p.itemCode || '').trim().toLowerCase();
    const pName = p.name.trim().toLowerCase();
    if (pCode && (target === `${pName} (${pCode})` || target === `[${pCode}] ${pName}` || target === `${pCode} - ${pName}`)) {
      return p;
    }
  }

  // 4. Normalized Alphanumeric Match (strips spaces, brackets, hyphens)
  const cleanTarget = target.replace(/[^a-z0-9]/g, '');
  for (const p of productList) {
    const cleanP = p.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTarget === cleanP && cleanTarget.length > 0) return p;
  }

  // 5. Fuel Aliases Linking
  if (target.includes('super') || target.includes('petrol') || target.includes('pms') || target.includes('premium')) {
    const matched = productList.find(p => {
      const n = p.name.toLowerCase();
      return n.includes('super') || n.includes('petrol') || n.includes('pms') || n.includes('premium');
    });
    if (matched) return matched;
  }

  if (target.includes('diesel') || target.includes('ago') || target.includes('gasoil')) {
    const matched = productList.find(p => {
      const n = p.name.toLowerCase();
      return n.includes('diesel') || n.includes('ago') || n.includes('gasoil');
    });
    if (matched) return matched;
  }

  // 6. LPG Aliases Linking (respecting size 6kg vs 13kg and filled vs empty)
  if (target.includes('6kg') || target.includes('6 kg')) {
    const targetIsEmpty = target.includes('empty');
    const matched = productList.find(p => {
      const n = p.name.toLowerCase();
      const pIsEmpty = n.includes('empty');
      return (n.includes('6kg') || n.includes('6 kg')) && pIsEmpty === targetIsEmpty;
    });
    if (matched) return matched;
  }

  if (target.includes('13kg') || target.includes('13 kg')) {
    const targetIsEmpty = target.includes('empty');
    const matched = productList.find(p => {
      const n = p.name.toLowerCase();
      const pIsEmpty = n.includes('empty');
      return (n.includes('13kg') || n.includes('13 kg')) && pIsEmpty === targetIsEmpty;
    });
    if (matched) return matched;
  }

  // 7. Accessories & Other Products
  if (target.includes('burner')) {
    const matched = productList.find(p => p.name.toLowerCase().includes('burner'));
    if (matched) return matched;
  }
  if (target.includes('grill')) {
    const matched = productList.find(p => p.name.toLowerCase().includes('grill'));
    if (matched) return matched;
  }
  if (target.includes('engine')) {
    const matched = productList.find(p => p.name.toLowerCase().includes('engine'));
    if (matched) return matched;
  }
  if (target.includes('brake')) {
    const matched = productList.find(p => p.name.toLowerCase().includes('brake'));
    if (matched) return matched;
  }

  return undefined;
};

export default function InventoryView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { 
    inventoryItems, 
    setInventoryItems, 
    activeStation, 
    pumpReadings, 
    setPumpReadings, 
    lpgTransactions, 
    setLpgTransactions, 
    stations, 
    products 
  } = useFuel();

  const [activeTab, setActiveTab] = useState<'overview' | 'in' | 'out' | 'opening' | 'reconciliation'>('overview');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [reconciliationForm, setReconciliationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    station: '',
    item: '',
    quantity: 0,
    adjustmentType: 'add' as 'add' | 'subtract',
    reason: ''
  });

  // 1. LINK PRODUCTS FROM MASTER PRODUCT LIST (Sorted by itemCode/order)
  // No hardcoded products; this list drives the entire inventory view
  const activeProducts = useMemo(() => {
    return sortProductsList(products || []);
  }, [products]);

  const [form, setForm] = useState<Partial<InventoryItem>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
    item: activeProducts[0]?.name || '',
    quantity: 1,
    rate: 0,
    amount: 0,
  });

  // Keep form selection aligned with available products
  useEffect(() => {
    if (activeProducts.length > 0) {
      if (!form.item || !activeProducts.some(p => p.name === form.item)) {
        setForm(prev => ({ ...prev, item: activeProducts[0].name }));
      }
    }
  }, [activeProducts]);

  // 2. INVENTORY SUMMARY: Strictly contains only products from the Product List in sorted order
  const inventorySummary = useMemo(() => {
    const summary: Record<string, { product: Product; opening: number; in: number; out: number; balance: number }> = {};
    
    // Seed summary strictly for catalog products
    activeProducts.forEach(p => {
      summary[p.id] = { 
        product: p, 
        opening: 0, 
        in: 0, 
        out: 0, 
        balance: 0 
      };
    });

    const relevantInventory = inventoryItems.filter(i => 
      (activeStation === 'Combined Total' || i.station === activeStation) && 
      (!filterDate || i.date <= filterDate)
    );
    const relevantPumps = pumpReadings.filter(p => 
      (activeStation === 'Combined Total' || p.station === activeStation) && 
      (!filterDate || p.date <= filterDate)
    );
    const relevantLpg = lpgTransactions.filter(l => 
      (activeStation === 'Combined Total' || l.station === activeStation) && 
      (!filterDate || l.date <= filterDate)
    );

    // Process Inventory Items
    relevantInventory.forEach(item => {
      const linked = findLinkedProduct(item.item, activeProducts);
      if (linked && summary[linked.id]) {
        if (item.type === 'opening') summary[linked.id].opening += Number(item.quantity) || 0;
        if (item.type === 'in') summary[linked.id].in += Number(item.quantity) || 0;
        if (item.type === 'out') summary[linked.id].out += Number(item.quantity) || 0;
      }
    });

    // Process Pump Readings
    relevantPumps.forEach(pump => {
      const sold = calculatePumpMeterDelta(pump.litresStart, pump.litresStop);
      if (sold > 0) {
        const linked = findLinkedProduct(pump.product, activeProducts);
        if (linked && summary[linked.id]) {
          summary[linked.id].out += sold;
        }
      }
    });

    // Process LPG Transactions
    relevantLpg.forEach(lpg => {
      const qty = Number(lpg.quantity) || 0;
      const completeQty = Number(lpg.completeQuantity) || 0;
      if (qty > 0 || completeQty > 0) {
        const linked = findLinkedProduct(lpg.item, activeProducts);
        if (linked && summary[linked.id]) {
          if (lpg.type === 'sale') summary[linked.id].out += (qty + completeQty);
          else if (lpg.type === 'purchase') summary[linked.id].in += qty;
          else if (lpg.type === 'opening') summary[linked.id].opening += qty;
        }

        // Automatic empty cylinder calculation if empty item exists in Product List
        if (lpg.type === 'sale') {
          const is6Kg = lpg.item.toLowerCase().includes('6kg') || lpg.item.toLowerCase().includes('6 kg');
          const is13Kg = lpg.item.toLowerCase().includes('13kg') || lpg.item.toLowerCase().includes('13 kg');
          const emptyLinked = activeProducts.find(p => {
            const n = p.name.toLowerCase();
            if (!n.includes('empty')) return false;
            if (is6Kg && (n.includes('6kg') || n.includes('6 kg'))) return true;
            if (is13Kg && (n.includes('13kg') || n.includes('13 kg'))) return true;
            return false;
          });
          
          if (emptyLinked && summary[emptyLinked.id]) {
            // Refills: receive empty cylinder (IN)
            summary[emptyLinked.id].in += qty;
            // Complete package: empty cylinder leaves (OUT)
            summary[emptyLinked.id].out += completeQty;
          }
          
          // Complete package accessories deduction (Burner & Grill for 6Kg complete)
          if (completeQty > 0 && is6Kg) {
            const burner = activeProducts.find(p => p.name.toLowerCase().includes('burner'));
            if (burner && summary[burner.id]) summary[burner.id].out += completeQty;
            const grill = activeProducts.find(p => p.name.toLowerCase().includes('grill'));
            if (grill && summary[grill.id]) summary[grill.id].out += completeQty;
          }
        } else if (lpg.type === 'purchase') {
          const is6Kg = lpg.item.toLowerCase().includes('6kg') || lpg.item.toLowerCase().includes('6 kg');
          const is13Kg = lpg.item.toLowerCase().includes('13kg') || lpg.item.toLowerCase().includes('13 kg');
          const emptyLinked = activeProducts.find(p => {
            const n = p.name.toLowerCase();
            if (!n.includes('empty')) return false;
            if (is6Kg && (n.includes('6kg') || n.includes('6 kg'))) return true;
            if (is13Kg && (n.includes('13kg') || n.includes('13 kg'))) return true;
            return false;
          });
          if (emptyLinked && summary[emptyLinked.id]) {
            // When buying full LPG, you give empty cylinder to supplier (OUT)
            summary[emptyLinked.id].out += qty;
          }
        }
      }
    });

    // Calculate balances
    Object.values(summary).forEach(item => {
      item.balance = item.opening + item.in - item.out;
    });

    return summary;
  }, [activeProducts, inventoryItems, pumpReadings, lpgTransactions, activeStation, filterDate]);

  // 3. FILTERED TRANSACTION DATA (Opening, Purchases, Sales):
  // Exclusively shows records linked to products in the Product List
  const filteredData = useMemo(() => {
    let combined: any[] = [];
    
    // Inventory Items (Opening, Purchases, Sales)
    inventoryItems.forEach(i => {
      if (
        i.type === activeTab &&
        (activeStation === 'Combined Total' || i.station === activeStation) &&
        (!filterDate || i.date <= filterDate)
      ) {
        const linked = findLinkedProduct(i.item, activeProducts);
        if (linked) {
          combined.push({
            id: i.id,
            date: i.date,
            station: i.station,
            item: linked.name,
            itemCode: linked.itemCode,
            quantity: Number(i.quantity) || 0,
            amount: Number(i.amount) || 0,
            source: 'inventory',
            productIndex: activeProducts.indexOf(linked),
          });
        }
      }
    });

    // Add Pump Readings to 'out'
    if (activeTab === 'out') {
      pumpReadings.forEach(p => {
        if (
          (activeStation === 'Combined Total' || p.station === activeStation) &&
          (!filterDate || p.date <= filterDate)
        ) {
          const linked = findLinkedProduct(p.product, activeProducts);
          if (linked) {
            const volume = calculatePumpMeterDelta(p.litresStart, p.litresStop);
            if (volume > 0) {
              combined.push({
                id: p.id,
                date: p.date,
                station: p.station,
                item: linked.name,
                itemCode: linked.itemCode,
                quantity: volume,
                amount: volume * (p.ratePerLitre || 0),
                source: 'pump',
                productIndex: activeProducts.indexOf(linked),
              });
            }
          }
        }
      });
    }

    // Add LPG Transactions
    lpgTransactions.forEach(l => {
      if (
        (activeStation === 'Combined Total' || l.station === activeStation) &&
        (!filterDate || l.date <= filterDate)
      ) {
        const linked = findLinkedProduct(l.item, activeProducts);
        if (linked) {
          if (
            (activeTab === 'out' && l.type === 'sale') ||
            (activeTab === 'in' && l.type === 'purchase') ||
            (activeTab === 'opening' && l.type === 'opening')
          ) {
            combined.push({
              id: l.id,
              date: l.date,
              station: l.station,
              item: linked.name,
              itemCode: linked.itemCode,
              quantity: Number(l.quantity) || 0,
              amount: Number(l.amount) || 0,
              source: 'lpg',
              productIndex: activeProducts.indexOf(linked),
            });
          }
        }
      }
    });

    // Sort by Date Descending, then product list order
    return combined.sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return a.productIndex - b.productIndex;
    });
  }, [inventoryItems, pumpReadings, lpgTransactions, activeTab, activeStation, filterDate, activeProducts]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalBal = 0;
    Object.values(inventorySummary).forEach(s => {
      totalIn += s.in;
      totalOut += s.out;
      totalBal += s.balance;
    });
    return { 
      totalIn, 
      totalOut, 
      totalBal, 
      productCount: activeProducts.length 
    };
  }, [inventorySummary, activeProducts]);

  // Count unlinked records in database that don't match any product in Product List
  const unlinkedCount = useMemo(() => {
    return inventoryItems.filter(item => !findLinkedProduct(item.item, activeProducts)).length;
  }, [inventoryItems, activeProducts]);

  // Purge unlinked records from database
  const handlePurgeUnlinked = () => {
    confirmDelete(`Found ${unlinkedCount} inventory record(s) for products that do not exist in your Product List. Permanently delete these unlinked records?`, () => {
      setInventoryItems(prev => prev.filter(item => findLinkedProduct(item.item, activeProducts) !== undefined));
    });
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
      item: activeProducts[0]?.name || '',
      quantity: 1,
      rate: 0,
      amount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setForm({ ...item });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInventoryItems(prev => prev.map(i => i.id === editingId ? { ...i, ...form as InventoryItem } : i));
    } else {
      const newItem: InventoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation),
        type: activeTab as any,
        ...form as Omit<InventoryItem, 'id' | 'type' | 'station'>
      };
      setInventoryItems(prev => [...prev, newItem]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">Inventory Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {activeStation === 'Combined Total' ? 'All Stations' : activeStation}
              </span>
            </div>
            <p className="text-theme-text-muted mt-0.5 text-xs">
              Opening stock, purchases, and sales dynamically linked to your master Product List.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {unlinkedCount > 0 && (
            <Button 
              variant="secondary" 
              onClick={handlePurgeUnlinked} 
              className="py-2 text-xs text-amber-400 hover:text-amber-300 border-amber-500/30 flex items-center gap-1.5"
              title="Delete unlinked orphan records from database"
            >
              <Eraser className="w-3.5 h-3.5" />
              Purge {unlinkedCount} Unlinked
            </Button>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-theme-text-muted whitespace-nowrap">As of Date:</label>
            <Input 
              type="date" 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)} 
              className="w-40 text-xs"
            />
          </div>
          {filterDate && (
            <Button variant="secondary" onClick={() => setFilterDate('')} className="py-2 text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Catalog Products" 
          value={metrics.productCount} 
          icon={Tag} 
          colorClass="bg-blue-500/10 text-blue-400" 
        />
        <MetricCard 
          title="Total Stock In" 
          value={`+${metrics.totalIn.toLocaleString()}`} 
          icon={PackagePlus} 
          colorClass="bg-emerald-500/10 text-emerald-400" 
        />
        <MetricCard 
          title="Total Stock Out" 
          value={`-${metrics.totalOut.toLocaleString()}`} 
          icon={PackageMinus} 
          colorClass="bg-purple-500/10 text-purple-400" 
        />
        <MetricCard 
          title="Current Stock Balance" 
          value={metrics.totalBal.toLocaleString()} 
          icon={Box} 
          colorClass="bg-blue-500/10 text-blue-400" 
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-theme-border">
        <button
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'overview' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'
          }`}
          onClick={() => { setActiveTab('overview'); setIsFormOpen(false); }}
        >
          Inventory Summary
        </button>
        <button
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'opening' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'
          }`}
          onClick={() => { setActiveTab('opening'); resetForm(); }}
        >
          Opening Stock
        </button>
        <button
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'in' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'
          }`}
          onClick={() => { setActiveTab('in'); resetForm(); }}
        >
          Purchase (In)
        </button>
        <button
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'out' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'
          }`}
          onClick={() => { setActiveTab('out'); resetForm(); }}
        >
          Sale (Out)
        </button>
        <button
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${
            activeTab === 'reconciliation' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'
          }`}
          onClick={() => { setActiveTab('reconciliation'); }}
        >
          Reconciliation
        </button>
      </div>

      {/* OVERVIEW TAB: Strictly products from Product List in itemCode order */}
      {activeTab === 'overview' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventory Summary</CardTitle>
              <p className="text-xs text-theme-text-muted mt-1">
                Products strictly linked to your Product List and ordered by Item Code.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {activeStation === 'Combined Total' ? 'All Stations Combined' : activeStation}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="modern-tr">
                  <Th>PRODUCT NAME</Th>
                  <Th>ITEM CODE</Th>
                  <Th>CATEGORY</Th>
                  <Th>UOM</Th>
                  <Th className="text-right">OPENING STOCK</Th>
                  <Th className="text-right">TOTAL IN</Th>
                  <Th className="text-right">TOTAL OUT</Th>
                  <Th className="text-right">CURRENT BALANCE</Th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((p) => {
                  const item = inventorySummary[p.id] || { opening: 0, in: 0, out: 0, balance: 0 };
                  const uom = p.uom || (p.name.toLowerCase().includes('lpg') ? 'Cylinder' : p.name.toLowerCase().includes('diesel') || p.name.toLowerCase().includes('super') ? 'Litre' : 'Piece');
                  const cat = p.category || (p.name.toLowerCase().includes('lpg') ? 'LPG' : p.name.toLowerCase().includes('diesel') || p.name.toLowerCase().includes('super') ? 'Fuel' : 'Accessories');
                  return (
                    <tr key={p.id} className="hover:theme-bg-gradient transition-colors">
                      <Td>
                        <ProductIconBadge name={p.name} category={cat} size="sm" />
                      </Td>
                      <Td>
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          {p.itemCode || '-'}
                        </span>
                      </Td>
                      <Td>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {cat}
                        </span>
                      </Td>
                      <Td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono text-blue-300 bg-blue-950/40 border border-blue-800/40">
                          {uom}
                        </span>
                      </Td>
                      <Td className="text-right font-mono text-slate-300">{item.opening.toLocaleString()} <span className="text-[10px] text-slate-500">{uom}</span></Td>
                      <Td className="text-right font-mono text-emerald-400">+{item.in.toLocaleString()}</Td>
                      <Td className="text-right font-mono text-purple-400">-{item.out.toLocaleString()}</Td>
                      <Td className="text-right font-mono font-bold text-blue-300">
                        {item.balance.toLocaleString()} <span className="text-[10px] text-blue-400/70 font-normal">{uom}</span>
                      </Td>
                    </tr>
                  );
                })}
                {activeProducts.length === 0 && (
                  <tr className="modern-tr">
                    <Td colSpan={8} className="text-center py-10 text-slate-500">
                      No products configured in Product List. Go to Settings to add products with Item Codes.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : activeTab === 'reconciliation' ? (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              const qty = Number(reconciliationForm.quantity);
              if (qty <= 0) return;
              
              setInventoryItems(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                date: reconciliationForm.date,
                station: reconciliationForm.station || (stations[0]?.name || 'Station 1'),
                type: reconciliationForm.adjustmentType === 'add' ? 'in' : 'out',
                item: reconciliationForm.item,
                quantity: qty,
                amount: 0,
              }]);
              alert('Reconciliation entry added.');
              setReconciliationForm({...reconciliationForm, quantity: 0, reason: ''});
            }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                <Input type="date" value={reconciliationForm.date} onChange={e => setReconciliationForm({...reconciliationForm, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                <Select value={reconciliationForm.station || (activeStation === 'Combined Total' ? stations[0]?.name : activeStation)} onChange={e => setReconciliationForm({...reconciliationForm, station: e.target.value})}>
                  {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Product</label>
                <Select value={reconciliationForm.item} onChange={e => setReconciliationForm({...reconciliationForm, item: e.target.value})} required>
                  <option value="">Select Product</option>
                  {activeProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Adjustment</label>
                <div className="flex gap-2">
                  <Select value={reconciliationForm.adjustmentType} onChange={e => setReconciliationForm({...reconciliationForm, adjustmentType: e.target.value as any})} className="flex-1">
                    <option value="add">Add to Stock</option>
                    <option value="subtract">Subtract from Stock</option>
                  </Select>
                  <Input type="number" step="any" value={reconciliationForm.quantity || ''} onChange={e => setReconciliationForm({...reconciliationForm, quantity: parseFloat(e.target.value) || 0})} className="flex-1" required />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Reason</label>
                <Input value={reconciliationForm.reason} onChange={e => setReconciliationForm({...reconciliationForm, reason: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Submit Reconciliation</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-theme-text-muted">
              {activeTab === 'in' && 'Log incoming inventory purchases for products in your catalog'}
              {activeTab === 'out' && 'Log outgoing inventory sales for products in your catalog'}
              {activeTab === 'opening' && 'Set baseline opening stock quantities for products in your catalog'}
            </p>
            <Button 
              onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} 
              className="flex items-center gap-2"
            >
              {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add {activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}</>}
            </Button>
          </div>

          {activeTab === 'in' && (
            <div className="bg-blue-900/20 border border-theme-border rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                Purchasing filled LPG will automatically decrease empty cylinder stock if empty cylinders are configured in your Product List.
              </p>
            </div>
          )}

          {activeTab === 'out' && (
            <div className="bg-blue-900/20 border border-theme-border rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                Selling filled LPG automatically increases empty cylinder stock if empty cylinders are configured in your Product List.
              </p>
            </div>
          )}

          {/* Form Modal / Panel */}
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? `Edit ${activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}` : `New ${activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                    <Input 
                      type="date" 
                      value={form.date} 
                      onChange={e => setForm({...form, date: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                    <Select 
                      value={form.station} 
                      onChange={e => setForm({...form, station: e.target.value as any})}
                    >
                      {stations.map(s => (
                        <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Products dropdown strictly populated from Product List */}
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs text-theme-text-muted mb-1">Product (From Product List)</label>
                    <Select 
                      value={form.item} 
                      onChange={e => setForm({...form, item: e.target.value})} 
                      required
                    >
                      {activeProducts.map(p => (
                        <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>
                          {p.itemCode ? `[${p.itemCode}] ` : ''}{p.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs text-theme-text-muted mb-1">Quantity</label>
                    <Input 
                      type="number" 
                      step="any"
                      value={form.quantity || ''} 
                      onChange={e => {
                        const q = parseFloat(e.target.value) || 0;
                        const r = form.rate || 0;
                        setForm({
                          ...form, 
                          quantity: q,
                          amount: r > 0 ? q * r : form.amount
                        });
                      }} 
                      required 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Rate (Ksh / unit)</label>
                    <Input 
                      type="number" 
                      step="any"
                      placeholder="Rate"
                      value={form.rate || ''} 
                      onChange={e => {
                        const r = parseFloat(e.target.value) || 0;
                        const q = form.quantity || 0;
                        setForm({
                          ...form, 
                          rate: r,
                          amount: q > 0 ? q * r : form.amount
                        });
                      }} 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Total Amount (KES)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={form.amount || ''} 
                      onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} 
                      required 
                    />
                  </div>

                  <div className="col-span-1 md:col-span-12 flex justify-end gap-3 mt-2">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingId ? 'Update Entry' : 'Save Entry'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Transactions table: strictly linked to Product List */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="modern-tr">
                    <Th>DATE</Th>
                    <Th>STATION</Th>
                    <Th>ITEM CODE</Th>
                    <Th>PRODUCT</Th>
                    <Th className="text-right">QUANTITY</Th>
                    <Th className="text-right">TOTAL AMOUNT (KES)</Th>
                    <Th className="text-right">ACTIONS</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(t => {
                    const linked = findLinkedProduct(t.item, activeProducts);
                    return (
                      <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                        <Td>{t.date}</Td>
                        <Td>
                          <span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">
                            {t.station}
                          </span>
                        </Td>
                        <Td>
                          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                            {linked?.itemCode || t.itemCode || '-'}
                          </span>
                        </Td>
                        <Td>
                          <ProductIconBadge name={linked?.name || t.item} category={linked?.name.toLowerCase().includes('burner') || linked?.name.toLowerCase().includes('grill') ? 'Accessories' : linked?.category} size="sm" />
                        </Td>
                        <Td className="text-right font-mono font-semibold text-slate-200">{t.quantity.toLocaleString()}</Td>
                        <Td className="text-right font-mono font-semibold text-purple-400">KES {t.amount.toLocaleString()}</Td>
                        <Td className="text-right">
                          {t.source === 'inventory' ? (
                            <div className="flex gap-3 justify-end items-center">
                              <button 
                                onClick={() => handleEdit(t)} 
                                className="text-theme-text-muted hover:text-blue-400 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-3 justify-end items-center">
                              <span className="text-xs text-slate-500 italic">
                                via {t.source === 'pump' ? 'Pump Readings' : 'LPG'}
                              </span>
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr className="modern-tr">
                      <Td colSpan={7} className="text-center py-8 text-slate-500">
                        No {activeTab} records found for products in the Product List.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </>
      )}

    </div>
  );
}
