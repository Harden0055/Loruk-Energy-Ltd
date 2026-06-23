import React, { useState } from 'react';
import { useFuel, Invoice } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td } from '../components';
import { Plus } from 'lucide-react';

export default function InvoicesView() {
  const { invoices, setInvoices } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState<Partial<Invoice>>({
    customerName: '',
    totalAmount: 0,
    paidAmount: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      ...form as Omit<Invoice, 'id'>
    };
    setInvoices([...invoices, newInv]);
    setIsFormOpen(false);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fleet Invoices</h1>
          <p className="text-slate-400 mt-1">Track and manage customer invoices.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Invoice
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>New Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Button type="submit">Save Invoice</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Total (KES)</Th>
              <Th>Paid (KES)</Th>
              <Th>Balance (KES)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(t => {
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
                <tr key={t.id} className="hover:bg-[#13162b] transition-colors">
                  <Td><span className="font-semibold text-slate-200">{t.customerName}</span></Td>
                  <Td>{t.totalAmount.toLocaleString()}</Td>
                  <Td>{t.paidAmount.toLocaleString()}</Td>
                  <Td>{balance.toLocaleString()}</Td>
                  <Td><span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>{statusText}</span></Td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center py-8 text-slate-500">No invoices recorded.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
