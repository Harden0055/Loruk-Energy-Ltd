import React, { useState } from 'react';
import { useFuel, Expense , STATIONS } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td , MetricCard} from '../components';
import { Plus, Pencil, Trash2, X, Receipt, CreditCard, Banknote } from 'lucide-react';

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

  const filteredData = expenses.filter(e => activeStation === 'Combined Total' || e.station === activeStation).sort((a,b) => b.date.localeCompare(a.date));

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

  
  const metrics = React.useMemo(() => {
    const total = filteredData.reduce((sum, e) => sum + e.amount, 0);
    const mPesa = filteredData.filter(e => e.category.toLowerCase().includes('m-pesa') || e.category.toLowerCase().includes('mpesa') || e.category.toLowerCase().includes('m.pesa')).reduce((sum, e) => sum + e.amount, 0);
    const cash = total - mPesa;
    return { total, mPesa, cash };
  }, [filteredData]);

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Expenses</h1>
          <p className="text-theme-text-muted mt-1">Log station operational expenses.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Expenses" value={`KES ${metrics.total.toLocaleString()}`} icon={Receipt} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="M-Pesa Expenses" value={`KES ${metrics.mPesa.toLocaleString()}`} icon={CreditCard} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Cash Expenses" value={`KES ${metrics.cash.toLocaleString()}`} icon={Banknote} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>
        <Button 
          onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} 
          variant={isFormOpen ? 'secondary' : 'purple'}
          className="flex items-center gap-2"
        >
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
                <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {STATIONS.map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Category</label>
                <Input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Electricity" required />
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Amount (KES)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required />
              </div>
              <div className="col-span-1 md:col-span-4 flex justify-end mt-2">
                <Button type="submit" variant="purple">{editingId ? 'Update Expense' : 'Save Expense'}</Button>
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
              <Th>Station</Th>
              <Th>Category</Th>
              <Th>Amount (KES)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => (
              <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">{t.station}</span></Td>
                <Td><span className="font-semibold text-theme-text">{t.category}</span></Td>
                <Td className="text-[#B15DFF] font-semibold font-mono">KES {t.amount.toLocaleString()}</Td>
                <Td>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(t)} className="text-theme-text-muted hover:text-[#B15DFF] transition-colors cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-theme-text-muted hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr className="modern-tr">
                <Td colSpan={4} className="text-center py-8 text-slate-500">No expenses recorded.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
