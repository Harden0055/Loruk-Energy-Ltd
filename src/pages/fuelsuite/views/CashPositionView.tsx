import React, { useState } from 'react';
import { useFuel, CashPosition } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td } from '../components';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus } from 'lucide-react';

const COLORS = ['#06b6d4', '#f59e0b'];

export default function CashPositionView() {
  const { cashPositions, setCashPositions } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPos: CashPosition = {
      id: Math.random().toString(36).substr(2, 9),
      ...form as Omit<CashPosition, 'id'>
    };
    setCashPositions([...cashPositions, newPos]);
    setIsFormOpen(false);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cash Position</h1>
          <p className="text-slate-400 mt-1">Track daily bank, M-Pesa, and cash totals.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Position
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Current Split (Latest)</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
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
                    contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-sm text-slate-400">Total Funds</p>
                <p className="text-xl font-bold text-slate-200">KES {(latest.mPesa + latest.cashOnHand).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Log Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                    <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">M-Pesa (KES)</label>
                    <Input type="number" step="0.01" value={form.mPesa} onChange={e => setForm({...form, mPesa: parseFloat(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cash on Hand (KES)</label>
                    <Input type="number" step="0.01" value={form.cashOnHand} onChange={e => setForm({...form, cashOnHand: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex justify-end mt-2">
                    <Button type="submit">Save Position</Button>
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
                  <Th>M-Pesa</Th>
                  <Th>Cash</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {cashPositions.map(t => (
                  <tr key={t.id} className="hover:bg-[#13162b] transition-colors">
                    <Td>{t.date}</Td>
                    <Td className="text-cyan-400">{t.mPesa.toLocaleString()}</Td>
                    <Td className="text-amber-400">{t.cashOnHand.toLocaleString()}</Td>
                    <Td className="font-bold text-slate-200">{(t.mPesa + t.cashOnHand).toLocaleString()}</Td>
                  </tr>
                ))}
                {cashPositions.length === 0 && (
                  <tr>
                    <Td colSpan={4} className="text-center py-8 text-slate-500">No positions recorded.</Td>
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
