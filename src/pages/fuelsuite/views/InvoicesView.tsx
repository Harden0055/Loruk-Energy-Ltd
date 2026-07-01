import React, { useState } from 'react';
import { useFuel, Invoice, Customer, STATIONS } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X, Users, FileText } from 'lucide-react';

export default function InvoicesView() {
  const { invoices, setInvoices, customers, setCustomers, activeStation } = useFuel();
  const [activeTab, setActiveTab] = useState<'invoices' | 'customers'>('invoices');
  
  // Invoice state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStation, setFilterStation] = useState<string>(activeStation);
  const [form, setForm] = useState<Partial<Invoice>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
    customerName: '',
    totalAmount: 0,
    paidAmount: 0,
  });

  // Customer state
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({ 
    code: '', 
    name: '', 
    creditLimit: 0, 
    openingBalance: 0,
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation
  });

  // Keep filterStation in sync with global activeStation if it changes (optional but good pattern)
  React.useEffect(() => {
    setFilterStation(activeStation);
  }, [activeStation]);

  const filteredData = invoices
    .filter(i => filterStation === 'Combined Total' || i.station === filterStation)
    .filter(i => !filterDate || i.date === filterDate);
    
  const filteredCustomers = customers
    .filter(c => filterStation === 'Combined Total' || c.station === filterStation);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
      customerName: '',
      totalAmount: 0,
      paidAmount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const resetCustomerForm = () => {
    setCustomerForm({ 
      code: '', 
      name: '', 
      creditLimit: 0, 
      openingBalance: 0,
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation 
    });
    setEditingCustomerId(null);
    setIsCustomerFormOpen(false);
  };

  const handleEdit = (invoice: Invoice) => {
    setForm({ ...invoice });
    setEditingId(invoice.id);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerForm({ ...customer });
    setEditingCustomerId(customer.id);
    setIsCustomerFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInvoices(prev => prev.map(inv => inv.id === editingId ? { ...inv, ...form as Invoice } : inv));
    } else {
      const newInv: Invoice = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        ...form as Omit<Invoice, 'id' | 'station'>
      };
      setInvoices(prev => [...prev, newInv]);
    }
    resetForm();
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomerId) {
      setCustomers(prev => prev.map(c => c.id === editingCustomerId ? { ...c, ...customerForm as Customer } : c));
    } else {
      const newCustomer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        station: customerForm.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        code: customerForm.code || '',
        name: customerForm.name || '',
        creditLimit: customerForm.creditLimit || 0,
        openingBalance: customerForm.openingBalance || 0,
      };
      setCustomers(prev => [...prev, newCustomer]);
    }
    resetCustomerForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Customer Invoices</h1>
          <p className="text-theme-text-muted mt-1">Track and manage daily customer invoices and balances.</p>
        </div>
        
        {activeTab === 'invoices' ? (
          <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
            {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Invoice</>}
          </Button>
        ) : (
          <Button onClick={() => { if (isCustomerFormOpen) resetCustomerForm(); else setIsCustomerFormOpen(true); }} className="flex items-center gap-2">
            {isCustomerFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Customer</>}
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b border-theme-border mb-6">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'invoices' ? 'border-[#00D4FF] text-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'border-transparent text-theme-text-muted hover:text-white'}`}
        >
          <FileText className="w-4 h-4" /> Invoices
        </button>
        <button 
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'customers' ? 'border-[#00D4FF] text-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'border-transparent text-theme-text-muted hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Customers
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 glass-panel p-4 rounded-lg border border-theme-border">
        <div className="flex gap-4 w-full md:w-auto">
          {activeTab === 'invoices' && (
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-theme-text-muted mb-1">Date</label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9" />
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-theme-text-muted mb-1">Filter by Station</label>
            <Select value={filterStation} onChange={e => setFilterStation(e.target.value)} className="h-9">
              <option value="Combined Total">Combined Total (All)</option>
              {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Invoice' : 'New Invoice'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                    <Input type="date" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                    <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                      {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-theme-text-muted mb-1">Customer</label>
                    <Select value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required>
                      <option value="">Select a customer...</option>
                      {customers.filter(c => c.station === form.station).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Total (KES)</label>
                    <Input type="number" step="0.01" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: parseFloat(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Paid (KES)</label>
                    <Input type="number" step="0.01" value={form.paidAmount} onChange={e => setForm({...form, paidAmount: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1 md:col-span-6 flex justify-end mt-2">
                    <Button type="submit">{editingId ? 'Update Invoice' : 'Save Invoice'}</Button>
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
                    <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                      <Td><span className="text-sm text-theme-text-muted">{t.date || '-'}</span></Td>
                      <Td><span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">{t.station}</span></Td>
                      <Td><span className="font-semibold text-theme-text">{t.customerName}</span></Td>
                      <Td className="text-[#3B82F6] font-semibold font-mono">KES {t.totalAmount.toLocaleString()}</Td>
                      <Td className="text-[#00D4FF] font-semibold font-mono">KES {t.paidAmount.toLocaleString()}</Td>
                      <Td className={`${balance > 0 ? 'text-[#00D4FF]' : 'text-emerald-400'} font-semibold font-mono`}>KES {balance.toLocaleString()}</Td>
                      <Td><span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>{statusText}</span></Td>
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
                  );
                })}
                {filteredData.length === 0 && (
                  <tr className="modern-tr">
                    <Td colSpan={8} className="text-center py-8 text-slate-500">No invoices recorded.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isCustomerFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCustomerId ? 'Edit Customer' : 'New Customer'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCustomerSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                    <Select value={customerForm.station} onChange={e => setCustomerForm({...customerForm, station: e.target.value as any})}>
                      {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Customer Code</label>
                    <Input type="text" value={customerForm.code} onChange={e => setCustomerForm({...customerForm, code: e.target.value})} required placeholder="e.g. CUST-001" />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Customer Name</label>
                    <Input type="text" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Credit Limit (KES)</label>
                    <Input type="number" step="0.01" value={customerForm.creditLimit} onChange={e => setCustomerForm({...customerForm, creditLimit: parseFloat(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-text-muted mb-1">Opening Balance (KES)</label>
                    <Input type="number" step="0.01" value={customerForm.openingBalance} onChange={e => setCustomerForm({...customerForm, openingBalance: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="col-span-1 md:col-span-5 flex justify-end mt-2">
                    <Button type="submit">{editingCustomerId ? 'Update' : 'Save'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <thead>
                <tr className="modern-tr">
                  <Th>Station</Th>
                  <Th>Code</Th>
                  <Th>Customer Name</Th>
                  <Th>Credit Limit (KES)</Th>
                  <Th>Opening Balance (KES)</Th>
                  <Th>Total Invoiced (KES)</Th>
                  <Th>Total Paid (KES)</Th>
                  <Th>Net Balance (KES)</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => {
                  const customerInvoices = invoices.filter(i => i.customerName === c.name && i.station === c.station);
                  const totalAmount = customerInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
                  const totalPaid = customerInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
                  const openingBalance = c.openingBalance || 0;
                  const balance = openingBalance + totalAmount - totalPaid;
                  const creditLimit = c.creditLimit || 0;
                  const isOverLimit = balance > creditLimit;

                  return (
                    <tr key={c.id} className="hover:theme-bg-gradient transition-colors">
                      <Td><span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">{c.station}</span></Td>
                      <Td><span className="text-xs text-theme-text-muted font-mono">{c.code}</span></Td>
                      <Td><span className="font-semibold text-theme-text">{c.name}</span></Td>
                      <Td>{creditLimit.toLocaleString(undefined, {minimumFractionDigits: 2})}</Td>
                      <Td>{openingBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</Td>
                      <Td>{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</Td>
                      <Td>{totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className={balance > 0 ? (isOverLimit ? "text-rose-500 font-bold" : "text-amber-400 font-medium") : "text-emerald-400 font-medium"}>
                            {balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                          {isOverLimit && <span className="text-[10px] text-rose-500">Over Limit</span>}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex gap-3">
                          <button onClick={() => handleEditCustomer(c)} className="text-theme-text-muted hover:text-cyan-400 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCustomer(c.id)} className="text-theme-text-muted hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr className="modern-tr">
                    <Td colSpan={9} className="text-center py-8 text-slate-500">No customers found.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
