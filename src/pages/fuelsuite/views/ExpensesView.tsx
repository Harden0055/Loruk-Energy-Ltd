import React, { useState } from 'react';
import { useFuel, Expense , STATIONS } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function ExpensesView() {
  const { expenses, setExpenses, activeStation } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
    category: 'Electricity',
    amount: 0,
  });

  const filteredData = expenses.filter(e => activeStation === 'Combined Total' || e.station === activeStation);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
      category: 'Electricity',
      amount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setForm({ ...expense });
    setEditingId(expense.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setExpenses(prev => prev.map(exp => exp.id === editingId ? { ...exp, ...form as Expense } : exp));
    } else {
      const newEx: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        ...form as Omit<Expense, 'id' | 'station'>
      };
      setExpenses(prev => [...prev, newEx]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Expenses</h1>
          <p className="text-slate-400 mt-1">Log station operational expenses.</p>
        </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Expense</>}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Expense' : 'New Expense'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <Input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Electricity" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (KES)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required />
              </div>
              <div className="col-span-1 md:col-span-4 flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Expense' : 'Save Expense'}</Button>
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
              <Th>Category</Th>
              <Th>Amount (KES)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => (
              <tr key={t.id} className="hover:bg-[#0f1123] transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="text-xs text-slate-400 uppercase tracking-tight font-medium">{t.station}</span></Td>
                <Td><span className="font-semibold text-slate-200">{t.category}</span></Td>
                <Td className="text-red-400">{t.amount.toLocaleString()}</Td>
                <Td>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-center py-8 text-slate-500">No expenses recorded.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
