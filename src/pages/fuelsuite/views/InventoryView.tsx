import React, { useState } from 'react';
import { useFuel, InventoryItem } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus } from 'lucide-react';

export default function InventoryView() {
  const { inventoryItems, setInventoryItems } = useFuel();
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState<Partial<InventoryItem>>({
    date: new Date().toISOString().split('T')[0],
    item: 'Burner',
    quantity: 1,
    amount: 0,
  });

  const filteredData = inventoryItems.filter(i => i.type === activeTab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: activeTab,
      ...form as Omit<InventoryItem, 'id' | 'type'>
    };
    setInventoryItems([...inventoryItems, newItem]);
    setIsFormOpen(false);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Other Inventory</h1>
          <p className="text-slate-400 mt-1">Appliances and accessories (Burners, Grills, etc).</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#2d325a]">
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'in' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setActiveTab('in'); setIsFormOpen(false); }}
        >
          Purchase (In)
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'out' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setActiveTab('out'); setIsFormOpen(false); }}
        >
          Sale (Out)
        </button>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {activeTab === 'in' ? 'Purchase' : 'Sale'}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>New {activeTab === 'in' ? 'Purchase' : 'Sale'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Item Description</label>
                <Input type="text" value={form.item} onChange={e => setForm({...form, item: e.target.value})} placeholder="e.g. Burner" required />
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
                <Button type="submit">Save Entry</Button>
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
              <Th>Item Description</Th>
              <Th>Quantity</Th>
              <Th>Total Amount (KES)</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => (
              <tr key={t.id} className="hover:bg-[#13162b] transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="font-semibold text-slate-200">{t.item}</span></Td>
                <Td>{t.quantity}</Td>
                <Td>{t.amount.toLocaleString()}</Td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-center py-8 text-slate-500">No records found.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
