import React, { useState, useMemo } from 'react';
import { useFuel, InventoryItem , STATIONS } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X, AlertCircle } from 'lucide-react';

const STANDARD_PRODUCTS = [
  'Diesel',
  'Super',
  '6kg LPG',
  '13kg LPG',
  'Empty 6kg',
  'Empty 13kg',
  'Burner',
  'Grill'
];

export default function InventoryView() {
  const { inventoryItems, setInventoryItems, activeStation, pumpReadings, lpgTransactions } = useFuel();
  const [activeTab, setActiveTab] = useState<'overview' | 'in' | 'out' | 'opening'>('overview');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  const [form, setForm] = useState<Partial<InventoryItem>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
    item: 'Diesel',
    quantity: 1,
    amount: 0,
  });

  const filteredData = useMemo(() => {
    let combined: any[] = [];
    
    // Base Inventory Items
    combined = [...inventoryItems.filter(i => 
      i.type === activeTab && 
      (activeStation === 'Combined Total' || i.station === activeStation) &&
      (!filterDate || i.date <= filterDate)
    ).map(i => ({ ...i, source: 'inventory' }))];

    // Add Pump Readings to 'out'
    if (activeTab === 'out') {
      pumpReadings.forEach(p => {
        if ((activeStation === 'Combined Total' || p.station === activeStation) && (!filterDate || p.date <= filterDate)) {
          const volume = p.stopReading - p.startReading;
          if (volume > 0) {
            combined.push({
              id: p.id,
              date: p.date,
              station: p.station,
              item: p.product,
              quantity: volume,
              amount: volume * p.ratePerLitre,
              source: 'pump'
            });
          }
        }
      });
    }

    // Add LPG Transactions
    lpgTransactions.forEach(l => {
      if ((activeStation === 'Combined Total' || l.station === activeStation) && (!filterDate || l.date <= filterDate)) {
        if (
          (activeTab === 'out' && l.type === 'sale') ||
          (activeTab === 'in' && l.type === 'purchase') ||
          (activeTab === 'opening' && l.type === 'opening')
        ) {
          combined.push({
            id: l.id,
            date: l.date,
            station: l.station,
            item: l.item,
            quantity: l.quantity,
            amount: l.amount || 0,
            source: 'lpg'
          });
        }
      }
    });

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inventoryItems, pumpReadings, lpgTransactions, activeTab, activeStation, filterDate]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
      item: 'Diesel',
      quantity: 1,
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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setInventoryItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInventoryItems(prev => prev.map(i => i.id === editingId ? { ...i, ...form as InventoryItem } : i));
    } else {
      const newItem: InventoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        type: activeTab as any,
        ...form as Omit<InventoryItem, 'id' | 'type' | 'station'>
      };
      setInventoryItems(prev => [...prev, newItem]);
    }
    resetForm();
  };

  // Calculate Overview Balances
  const inventorySummary = useMemo(() => {
    const summary: Record<string, { opening: number; in: number; out: number; balance: number }> = {};
    
    STANDARD_PRODUCTS.forEach(p => {
      summary[p] = { opening: 0, in: 0, out: 0, balance: 0 };
    });

    const relevantInventory = inventoryItems.filter(i => (activeStation === 'Combined Total' || i.station === activeStation) && (!filterDate || i.date <= filterDate));
    const relevantPumps = pumpReadings.filter(p => (activeStation === 'Combined Total' || p.station === activeStation) && (!filterDate || p.date <= filterDate));
    const relevantLpg = lpgTransactions.filter(l => (activeStation === 'Combined Total' || l.station === activeStation) && (!filterDate || l.date <= filterDate));

    // Process Inventory Items (Opening, In, Out)
    relevantInventory.forEach(item => {
      if (!summary[item.item]) {
        summary[item.item] = { opening: 0, in: 0, out: 0, balance: 0 };
      }
      if (item.type === 'opening') summary[item.item].opening += item.quantity;
      if (item.type === 'in') summary[item.item].in += item.quantity;
      if (item.type === 'out') summary[item.item].out += item.quantity;
    });

    // Process Pump Readings for Fuel Out
    relevantPumps.forEach(pump => {
      const sold = pump.stopReading - pump.startReading;
      if (pump.product.toLowerCase().includes('diesel')) {
        summary['Diesel'].out += sold;
      } else if (pump.product.toLowerCase().includes('super')) {
        summary['Super'].out += sold;
      }
    });

    // Process LPG Transactions for LPG Out and Empty In/Out
    relevantLpg.forEach(lpg => {
      const qty = lpg.quantity;
      if (lpg.type === 'sale') {
        if (lpg.item.includes('6kg')) {
          summary['6kg LPG'].out += qty;
          summary['Empty 6kg'].in += qty; // Customer brings empty
        } else if (lpg.item.includes('13kg')) {
          summary['13kg LPG'].out += qty;
          summary['Empty 13kg'].in += qty; // Customer brings empty
        }
      } else if (lpg.type === 'purchase') {
        if (lpg.item.includes('6kg')) {
          summary['6kg LPG'].in += qty;
          summary['Empty 6kg'].out += qty; // Give empty to supplier
        } else if (lpg.item.includes('13kg')) {
          summary['13kg LPG'].in += qty;
          summary['Empty 13kg'].out += qty; // Give empty to supplier
        }
      } else if (lpg.type === 'opening') {
         if (lpg.item.includes('6kg')) summary['6kg LPG'].opening += qty;
         else if (lpg.item.includes('13kg')) summary['13kg LPG'].opening += qty;
      }
    });

    // Calculate balances
    Object.keys(summary).forEach(key => {
      summary[key].balance = summary[key].opening + summary[key].in - summary[key].out;
    });

    return summary;
  }, [inventoryItems, pumpReadings, lpgTransactions, activeStation, filterDate]);

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inventory Management</h1>
          <p className="text-theme-text-muted mt-1">Track opening stock, purchases, and sales for all products.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-theme-text-muted whitespace-nowrap">As of Date:</label>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9 w-40" />
        </div>
      </div>

      <div className="flex gap-4 border-b border-theme-border">
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'overview' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('overview'); resetForm(); }}
        >
          Overview
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'opening' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('opening'); resetForm(); }}
        >
          Opening Stock
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'in' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('in'); resetForm(); }}
        >
          Purchase (In)
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'out' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('out'); resetForm(); }}
        >
          Sale (Out)
        </button>
      </div>

      {activeTab === 'overview' ? (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr className="modern-tr">
                  <Th>Product</Th>
                  <Th className="text-right">Opening Stock</Th>
                  <Th className="text-right">Total In</Th>
                  <Th className="text-right">Total Out</Th>
                  <Th className="text-right">Current Balance</Th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(inventorySummary).sort().map(product => (
                  <tr key={product} className="hover:theme-bg-gradient transition-colors">
                    <Td><span className="font-semibold text-theme-text">{product}</span></Td>
                    <Td className="text-right">{inventorySummary[product].opening.toLocaleString()}</Td>
                    <Td className="text-right text-emerald-400">+{inventorySummary[product].in.toLocaleString()}</Td>
                    <Td className="text-right text-purple-400">-{inventorySummary[product].out.toLocaleString()}</Td>
                    <Td className="text-right font-bold text-blue-400">{inventorySummary[product].balance.toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
              {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add {activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}</>}
            </Button>
          </div>

          {activeTab === 'in' && (
            <div className="bg-blue-900/20 border border-theme-border rounded-lg p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                Purchasing filled LPG will automatically decrease your empty cylinders stock.
              </p>
            </div>
          )}

          {activeTab === 'out' && (
            <div className="bg-blue-900/20 border border-theme-border rounded-lg p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                Selling filled LPG via LPG Transactions automatically increases your empty cylinders stock. Manually logging LPG sales here works similarly.
              </p>
            </div>
          )}

          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? `Edit ${activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}` : `New ${activeTab === 'in' ? 'Purchase' : activeTab === 'out' ? 'Sale' : 'Opening Stock'}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                    <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                    <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                      {STATIONS.map(s => <option className="dark:bg-slate-900" key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Product</label>
                    <Select value={form.item} onChange={e => setForm({...form, item: e.target.value})} required>
                      {STANDARD_PRODUCTS.map(p => (
                        <option className="dark:bg-slate-900" key={p} value={p}>{p}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Qty</label>
                    <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-theme-text-muted mb-1">Total Amount (KES)</label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1 md:col-span-5 flex justify-end mt-2">
                    <Button type="submit">{editingId ? 'Update Entry' : 'Save Entry'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="modern-tr">
                    <Th>Date</Th>
                    <Th>Station</Th>
                    <Th>Product</Th>
                    <Th>Quantity</Th>
                    <Th>Total Amount (KES)</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(t => (
                    <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                      <Td>{t.date}</Td>
                      <Td><span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">{t.station}</span></Td>
                      <Td><span className="font-semibold text-theme-text">{t.item}</span></Td>
                      <Td>{t.quantity}</Td>
                      <Td>{t.amount.toLocaleString()}</Td>
                      <Td>
                        {t.source === 'inventory' ? (
                          <div className="flex gap-3">
                            <button onClick={() => handleEdit(t)} className="text-theme-text-muted hover:text-cyan-400 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="text-theme-text-muted hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">via {t.source === 'pump' ? 'Pump Readings' : 'LPG'}</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr className="modern-tr">
                      <Td colSpan={6} className="text-center py-8 text-slate-500">No records found.</Td>
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
