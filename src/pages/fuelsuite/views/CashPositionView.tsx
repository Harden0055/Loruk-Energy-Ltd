import React, { useState } from 'react';
import { useFuel, CashPosition } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td , MetricCard} from '../components';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Pencil, Trash2, X, Wallet, Smartphone, Banknote } from 'lucide-react';

const COLORS = ['#00D4FF', '#3B82F6'];

export default function CashPositionView() {
  const { cashPositions, setCashPositions } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<CashPosition>>({
    date: new Date().toISOString().split('T')[0],
    mPesa: 0,
    cashOnHand: 0,
  });

  const latest = cashPositions[cashPositions.length - 1] || { mPesa: 0, cashOnHand: 0 };
  const pieData = [
    { name: 'M-Pesa', value: latest.mPesa },
    { name: 'Cash on Hand', value: latest.cashOnHand },
  ];

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      mPesa: 0,
      cashOnHand: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (pos: CashPosition) => {
    setForm({ ...pos });
    setEditingId(pos.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this position?')) {
      setCashPositions(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setCashPositions(prev => prev.map(pos => pos.id === editingId ? { ...pos, ...form as CashPosition } : pos));
    } else {
      const newPos: CashPosition = {
        id: Math.random().toString(36).substr(2, 9),
        ...form as Omit<CashPosition, 'id'>
      };
      setCashPositions(prev => [...prev, newPos]);
    }
    resetForm();
  };

  
  const metrics = React.useMemo(() => {
    const totalMpesa = cashPositions.reduce((sum, c) => sum + c.mPesa, 0);
    const totalCash = cashPositions.reduce((sum, c) => sum + c.cashOnHand, 0);
    const total = totalMpesa + totalCash;
    return { total, mPesa: totalMpesa, cash: totalCash };
  }, [cashPositions]);

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cash Position</h1>
          <p className="text-theme-text-muted mt-1">Track daily bank, M-Pesa, and cash totals.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Cash Flow" value={`KES ${metrics.total.toLocaleString()}`} icon={Wallet} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total M-Pesa" value={`KES ${metrics.mPesa.toLocaleString()}`} icon={Smartphone} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Total Cash on Hand" value={`KES ${metrics.cash.toLocaleString()}`} icon={Banknote} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Position</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Current Split (Latest)</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0b1928', borderColor: '#122840', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-sm text-theme-text-muted">Total Funds</p>
                <p className="text-xl font-bold text-theme-text">KES {(latest.mPesa + latest.cashOnHand).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Cash Position' : 'Log Cash Position'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                    <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">M-Pesa (KES)</label>
                    <Input type="number" step="0.01" value={form.mPesa} onChange={e => setForm({...form, mPesa: parseFloat(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Cash on Hand (KES)</label>
                    <Input type="number" step="0.01" value={form.cashOnHand} onChange={e => setForm({...form, cashOnHand: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex justify-end mt-2">
                    <Button type="submit">{editingId ? 'Update Position' : 'Save Position'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <thead>
                <tr className="modern-tr">
                  <Th>Date</Th>
                  <Th>M-Pesa</Th>
                  <Th>Cash</Th>
                  <Th>Total</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
               <tbody>
                {[...cashPositions].sort((a,b) => ((b.createdAt || b.date) > (a.createdAt || a.date) ? -1 : 1)).map(t => (
                  <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                    <Td>{t.date}</Td>
                    <Td className="text-[#00D4FF] font-semibold font-mono">KES {t.mPesa.toLocaleString()}</Td>
                    <Td className="text-[#3B82F6] font-semibold font-mono">KES {t.cashOnHand.toLocaleString()}</Td>
                    <Td className="text-[#00D4FF] font-bold font-mono">KES {(t.mPesa + t.cashOnHand).toLocaleString()}</Td>
                    <Td>
                      <div className="flex gap-3">
                        <button onClick={() => handleEdit(t)} className="text-theme-text-muted hover:text-[#00D4FF] transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="text-theme-text-muted hover:text-red-400 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {cashPositions.length === 0 && (
                  <tr className="modern-tr">
                    <Td colSpan={5} className="text-center py-8 text-slate-500">No positions recorded.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
