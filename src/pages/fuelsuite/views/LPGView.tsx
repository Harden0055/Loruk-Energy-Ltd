import React, { useState } from 'react';
import { useFuel, LPGTransaction } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard } from '../components';
import { Plus, CheckSquare, ShoppingCart, RefreshCcw, Pencil, Trash2, X } from 'lucide-react';

export default function LPGView() {
  const { lpgTransactions, setLpgTransactions, inventoryItems, activeStation } = useFuel();
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'opening'>('sales');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<LPGTransaction>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? 'Ndalu Station' : activeStation,
    item: '6kg Cylinder',
    quantity: 1,
    amount: 0,
  });

  const lpgInventoryItems = inventoryItems
    .filter(i => i.type === 'opening' && (i.item === '6kg LPG' || i.item === '13kg LPG' || i.item === '6kg Cylinder' || i.item === '13kg Cylinder'))
    .map(i => ({
      ...i,
      type: 'opening' as const,
      item: i.item.replace('LPG', 'Cylinder').trim(), // Normalize naming
      isFromInventory: true
    }));

  const allLpgData = [...lpgTransactions, ...lpgInventoryItems];

  const filteredData = allLpgData.filter(t => 
    t.type === (activeTab === 'sales' ? 'sale' : activeTab === 'purchases' ? 'purchase' : 'opening') &&
    (activeStation === 'Combined Total' || t.station === activeStation)
  );

  const statsData = allLpgData.filter(t => activeStation === 'Combined Total' || t.station === activeStation);
  const totalBought = statsData.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.quantity, 0);
  const totalSold = statsData.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.quantity, 0);
  const totalOpening = statsData.filter(t => t.type === 'opening').reduce((acc, t) => acc + t.quantity, 0);
  const currentInv = totalOpening + totalBought - totalSold;

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? 'Ndalu Station' : activeStation,
      item: '6kg Cylinder',
      quantity: 1,
      amount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (tx: LPGTransaction) => {
    setForm({ ...tx });
    setEditingId(tx.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setLpgTransactions(lpgTransactions.filter(t => t.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLpgTransactions(lpgTransactions.map(t => t.id === editingId ? { ...t, ...form as LPGTransaction } : t));
    } else {
      const newTx: LPGTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? 'Ndalu Station' : activeStation),
        type: activeTab === 'sales' ? 'sale' : activeTab === 'purchases' ? 'purchase' : 'opening',
        ...form as Omit<LPGTransaction, 'id' | 'type' | 'station'>
      };
      setLpgTransactions([...lpgTransactions, newTx]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">LPG Sales & Inventory</h1>
          <p className="text-slate-400 mt-1">Manage LPG gas cylinders tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Bought" value={`${totalBought} Cylinders`} icon={ShoppingCart} colorClass="bg-[#2d325a] text-slate-300" />
        <MetricCard title="Total Sold" value={`${totalSold} Cylinders`} icon={CheckSquare} colorClass="bg-cyan-500/10 text-cyan-400" />
        <MetricCard title="Current Inventory" value={`${currentInv} Cylinders`} icon={RefreshCcw} colorClass="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="flex gap-4 border-b border-[#2d325a]">
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'sales' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setActiveTab('sales'); resetForm(); }}
        >
          LPG Sales
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'purchases' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setActiveTab('purchases'); resetForm(); }}
        >
          LPG Purchases
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'opening' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setActiveTab('opening'); resetForm(); }}
        >
          Opening Stock
        </button>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add {activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}</>}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? `Edit ${activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}` : `New ${activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  <option value="Ndalu Station">Ndalu Station</option>
                  <option value="Junction Station">Junction Station</option>
                </Select>
              </div>
              <div className="col-span-1 md:col-span-1 lg:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Item Size</label>
                <Select value={form.item} onChange={e => setForm({...form, item: e.target.value})}>
                  <option value="6kg Cylinder">6kg Cylinder</option>
                  <option value="13kg Cylinder">13kg Cylinder</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Qty</label>
                <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} required />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Total Amount (KES)</label>
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
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Station</Th>
              <Th>Item Details</Th>
              <Th>Quantity</Th>
              <Th>Total Amount (KES)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => (
              <tr key={t.id} className="hover:bg-[#0f1123] transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="text-xs text-slate-400 uppercase tracking-tight font-medium">{t.station}</span></Td>
                <Td><span className="font-semibold text-slate-200">{t.item}</span></Td>
                <Td>{t.quantity}</Td>
                <Td>{t.amount.toLocaleString()}</Td>
                <Td>
                  {!(t as any).isFromInventory ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">via Inventory</span>
                  )}
                </Td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center py-8 text-slate-500">No {activeTab} records found.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
