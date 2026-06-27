import React, { useState } from 'react';
import { useFuel, Invoice , STATIONS } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function InvoicesView() {
  const { invoices, setInvoices, activeStation } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Invoice>>({
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
    customerName: '',
    totalAmount: 0,
    paidAmount: 0,
  });

  const filteredData = invoices.filter(i => activeStation === 'Combined Total' || i.station === activeStation);

  const resetForm = () => {
    setForm({
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
      customerName: '',
      totalAmount: 0,
      paidAmount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (invoice: Invoice) => {
    setForm({ ...invoice });
    setEditingId(invoice.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(i => i.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInvoices(invoices.map(inv => inv.id === editingId ? { ...inv, ...form as Invoice } : inv));
    } else {
      const newInv: Invoice = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        ...form as Omit<Invoice, 'id' | 'station'>
      };
      setInvoices([...invoices, newInv]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fleet Invoices</h1>
          <p className="text-slate-400 mt-1">Track and manage customer invoices.</p>
        </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Invoice</>}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Invoice' : 'New Invoice'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Customer Name</label>
                <Input type="text" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Total Amount (KES)</label>
                <Input type="number" step="0.01" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Paid Amount (KES)</label>
                <Input type="number" step="0.01" value={form.paidAmount} onChange={e => setForm({...form, paidAmount: parseFloat(e.target.value)})} required />
              </div>
              <div className="col-span-1 md:col-span-4 flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Invoice' : 'Save Invoice'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Station</Th>
              <Th>Customer</Th>
              <Th>Total (KES)</Th>
              <Th>Paid (KES)</Th>
              <Th>Balance (KES)</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => {
              const balance = t.totalAmount - t.paidAmount;
              let statusText = 'UNPAID';
              let statusClass = 'bg-red-500/10 text-red-500';
              if (balance <= 0) {
                statusText = 'PAID';
                statusClass = 'bg-emerald-500/10 text-emerald-500';
              } else if (t.paidAmount > 0) {
                statusText = 'PARTIAL';
                statusClass = 'bg-amber-500/10 text-amber-500';
              }

              return (
                <tr key={t.id} className="hover:bg-[#0f1123] transition-colors">
                  <Td><span className="text-xs text-slate-400 uppercase tracking-tight font-medium">{t.station}</span></Td>
                  <Td><span className="font-semibold text-slate-200">{t.customerName}</span></Td>
                  <Td>{t.totalAmount.toLocaleString()}</Td>
                  <Td>{t.paidAmount.toLocaleString()}</Td>
                  <Td>{balance.toLocaleString()}</Td>
                  <Td><span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>{statusText}</span></Td>
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
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-center py-8 text-slate-500">No invoices recorded.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
