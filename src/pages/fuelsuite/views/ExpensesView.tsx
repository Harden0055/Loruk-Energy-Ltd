import React, { useState } from 'react';
import { useFuel, Expense } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus } from 'lucide-react';

export default function ExpensesView() {
  const { expenses, setExpenses } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Electricity',
    amount: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEx: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      ...form as Omit<Expense, 'id'>
    };
    setExpenses([...expenses, newEx]);
    setIsFormOpen(false);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Expenses</h1>
          <p className="text-slate-400 mt-1">Log station operational expenses.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <Input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Electricity" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (KES)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required />
              </div>
              <div className="col-span-1 md:col-span-3 flex justify-end mt-2">
                <Button type="submit">Save Expense</Button>
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
              <Th>Category</Th>
              <Th>Amount (KES)</Th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(t => (
              <tr key={t.id} className="hover:bg-[#13162b] transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="font-semibold text-slate-200">{t.category}</span></Td>
                <Td className="text-red-400">{t.amount.toLocaleString()}</Td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <Td colSpan={3} className="text-center py-8 text-slate-500">No expenses recorded.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
