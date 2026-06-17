import React, { useState, useEffect } from 'react';
import { useCustomers, createCustomer, deleteCustomer, updateCustomer, createAdjustment, useDeliveries, usePayments, useAdjustments, recalculateCustomerBalance } from '../lib/db';
import { formatCurrency } from '../lib/utils';
import { Search, Plus, Trash2, Pencil, AlertTriangle, X, ArrowUpDown, Eye, Truck, Download, RefreshCw } from 'lucide-react';
import { Customer } from '../types';
import { useAuth } from '../lib/auth';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface CustomersProps {
  onViewCustomer?: (id: string) => void;
  onNavigate?: (page: string) => void;
}

export default function Customers({ onViewCustomer, onNavigate }: CustomersProps = {}) {
  const { customers, loading } = useCustomers();
  const { deliveries } = useDeliveries();
  const { payments } = usePayments();
  const { adjustments } = useAdjustments();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'credit_risk'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [adjustingCustomer, setAdjustingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = customers.filter(c => 
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customerId.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'all' || c.status === statusFilter)
  ).sort((a, b) => {
    const idA = (a.customerId || '').toUpperCase().trim();
    const idB = (b.customerId || '').toUpperCase().trim();
    if (idA === 'CUST-001') return -1;
    if (idB === 'CUST-001') return 1;
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  });

  useEffect(() => {
    if (!sessionStorage.getItem('loruk_balance_fixed_v2') && !loading && customers.length > 0) {
      sessionStorage.setItem('loruk_balance_fixed_v2', 'true');
      const fixAll = async () => {
         for (const c of customers) {
            await recalculateCustomerBalance(
              c.id,
              deliveries.filter(d => d.customerId === c.id),
              payments.filter(p => p.customerId === c.id),
              adjustments.filter(a => a.customerId === c.id),
              c.openingBalance || 0,
              c.openingBalanceType || 'arrears'
            );
         }
         console.log('Automated balance recalculation complete for all customers');
      };
      fixAll();
    }
  }, [customers, deliveries, payments, adjustments, loading]);

  const confirmDelete = async () => {
    console.log('confirmDelete called for customer:', deletingCustomer?.name);
    if (!deletingCustomer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(deletingCustomer.id);
      console.log('Customer deleted successfully');
      setDeletingCustomer(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setDeleteError('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
      console.log('confirmDelete finished');
    }
  };

  const exportCustomers = () => {
    const csv = Papa.unparse(filtered.map(c => ({
        ID: c.customerId,
        Name: c.name,
        CreditLimit: c.creditLimit,
        OpeningBalance: c.openingBalance,
        Balance: c.balance,
        Status: c.status
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-blue-500" />
          <input 
            type="text" 
            placeholder="Search by ID or name..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-blue-300 dark:border-blue-700 rounded-lg text-base text-gray-950 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-gray-400"
          />
        </div>
        <div className="w-full sm:w-48">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-4 py-2.5 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800/60 rounded-lg text-base text-blue-900 dark:text-blue-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all" className="dark:bg-blue-950">All Statuses</option>
            <option value="active" className="dark:bg-blue-950">Active</option>
            <option value="credit_risk" className="dark:bg-blue-950">Credit Risk</option>
          </select>
        </div>
        <button 
          onClick={exportCustomers}
          className="px-5 py-2.5 bg-gray-100/75 hover:bg-gray-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-gray-700 dark:text-blue-300 border border-gray-200 dark:border-blue-800/50 rounded-lg text-base font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-900/5 cursor-pointer"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-5 py-2.5 bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-lg text-base font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-900/5 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {isAdding && (
        <AddCustomerModal 
          customers={customers} 
          onClose={() => setIsAdding(false)} 
        />
      )}

      {editingCustomer && (
        <EditCustomerModal 
          customer={editingCustomer} 
          customers={customers} 
          onClose={() => setEditingCustomer(null)} 
        />
      )}

      {deletingCustomer && (
        <DeleteConfirmModal 
          customer={deletingCustomer}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => {
            setDeletingCustomer(null);
            setDeleteError(null);
          }}
        />
      )}

      {adjustingCustomer && (
        <AdjustBalanceModal 
          customer={adjustingCustomer}
          onClose={() => setAdjustingCustomer(null)}
        />
      )}

      <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-blue-900 border-b border-gray-200 dark:border-blue-800 transition-colors">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider text-right">Limit</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider text-right">Opening Bal</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider text-right">Closing Balance</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider text-right">Total Purchases</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-base">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-base">
                    No customers found.
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors">
                  <td className="px-6 py-4 text-base text-gray-500 dark:text-gray-400 font-mono font-medium">{c.customerId}</td>
                  <td className="px-6 py-4 text-base font-semibold text-gray-900 dark:text-blue-100">
                    {onViewCustomer ? (
                      <button 
                        onClick={() => onViewCustomer(c.id)}
                        className="hover:underline text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-left focus:outline-none"
                      >
                        {c.name}
                      </button>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-6 py-4 text-base font-mono text-gray-500 dark:text-gray-400 text-right font-medium">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-6 py-4 text-base font-mono text-right font-medium">
                    <span className={c.openingBalanceType === 'advance' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                      {c.openingBalanceType === 'advance' ? '-' : ''}{formatCurrency(c.openingBalance || 0)}
                    </span>
                    {c.openingBalanceType === 'advance' && (
                      <span className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">Advance</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-base font-mono font-bold text-right ${
                    c.balance > 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : c.balance < 0 
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                        : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {formatCurrency(c.balance)}
                    {c.balance < 0 && (
                      <span className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">Advance Balance</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-base font-mono text-blue-600 dark:text-blue-400 text-right font-medium">{formatCurrency(c.totalPurchases)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      c.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' 
                        : 'bg-red-100 text-red-800 dark:bg-red-950/45 dark:text-red-400 border border-red-200 dark:border-red-900'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {onViewCustomer && (
                        <button 
                          onClick={() => onViewCustomer(c.id)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25 transition-colors rounded-md cursor-pointer"
                          title="View Customer Dashboard"
                          id={`btn-view-${c.id}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => setAdjustingCustomer(c)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors rounded-md"
                        title="Credit / Debit Adjustment"
                        id={`btn-adjust-${c.id}`}
                      >
                        <ArrowUpDown className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Recalculate and fix balance for ${c.name}?`)) {
                            await recalculateCustomerBalance(
                              c.id,
                              deliveries.filter(d => d.customerId === c.id),
                              payments.filter(p => p.customerId === c.id),
                              adjustments.filter(a => a.customerId === c.id),
                              c.openingBalance || 0,
                              c.openingBalanceType || 'arrears'
                            );
                            alert('Balance recalculated for ' + c.name);
                          }
                        }}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors rounded-md"
                        title="Recalculate & Fix Balance"
                        id={`btn-recalc-${c.id}`}
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setEditingCustomer(c)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-md"
                        title="Edit Customer"
                        id={`btn-edit-${c.id}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setDeletingCustomer(c)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-md"
                        title="Delete Customer"
                        id={`btn-delete-${c.id}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  customers: Customer[];
}

function AddCustomerModal({ onClose, customers }: ModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    customerId: '',
    name: '',
    creditLimit: '',
    openingBalance: '',
    openingBalanceType: 'arrears',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedId = form.customerId.trim();
    const trimmedName = form.name.trim();

    if (!trimmedId || !trimmedName) {
      setError('Please fill in all required fields.');
      return;
    }

    // Uniqueness validation
    const idExists = customers.some(
      c => c.customerId.toLowerCase().trim() === trimmedId.toLowerCase()
    );

    if (idExists) {
      setError(`Customer ID "${trimmedId}" is already taken. Please enter a unique ID.`);
      return;
    }

    setLoading(true);
    try {
      const opBal = Number(form.openingBalance) || 0;
      const initialBalance = form.openingBalanceType === 'advance' ? -opBal : opBal;
      await createCustomer({ 
        customerId: trimmedId,
        name: trimmedName, 
        creditLimit: Number(form.creditLimit) || 0,
        balance: initialBalance, 
        totalPurchases: 0, 
        status: 'active',
        openingBalance: opBal,
        openingBalanceType: form.openingBalanceType as 'arrears' | 'advance',
        updatedBy: user?.email || 'system',
        actionType: 'create'
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to add customer. Please check your data and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-md overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center bg-blue-100/50 dark:bg-blue-950/50">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Add New Customer</h3>
            <button 
              type="button" 
              onClick={onClose}
              className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-medium">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Customer ID *</label>
              <input 
                type="text" 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                placeholder="E.g. CUST-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Customer Name *</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                placeholder="E.g. Acme Logistics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Credit Limit (KES) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.creditLimit}
                  onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Opening Balance *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.openingBalance}
                  onChange={e => setForm({...form, openingBalance: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Opening Balance Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'arrears'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'arrears'
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 bg-white dark:bg-blue-950'
                  }`}
                >
                  Arrears (Debit)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'advance'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'advance'
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 bg-white dark:bg-blue-950'
                  }`}
                >
                  Advance (Credit)
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditProps {
  customer: Customer;
  customers: Customer[];
  onClose: () => void;
}

function EditCustomerModal({ customer, customers, onClose }: EditProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    customerId: customer.customerId || '',
    name: customer.name || '',
    creditLimit: customer.creditLimit?.toString() || '0',
    openingBalance: customer.openingBalance?.toString() || '0',
    openingBalanceType: customer.openingBalanceType || 'arrears',
    status: customer.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedId = form.customerId.trim();
    const trimmedName = form.name.trim();

    if (!trimmedId || !trimmedName) {
      setError('Please fill in all required fields.');
      return;
    }

    // Uniqueness validation against other customers
    const idExists = customers.some(
      c => c.id !== customer.id && c.customerId.toLowerCase().trim() === trimmedId.toLowerCase()
    );

    if (idExists) {
      setError(`Customer ID "${trimmedId}" is already registered to another customer.`);
      return;
    }

    setLoading(true);
    try {
      const originalOpeningBalance = customer.openingBalance || 0;
      const originalType = customer.openingBalanceType || 'arrears';
      const originalBalanceEffect = originalType === 'advance' ? -originalOpeningBalance : originalOpeningBalance;

      const newOpeningBalance = Number(form.openingBalance) || 0;
      const newType = form.openingBalanceType || 'arrears';
      const newBalanceEffect = newType === 'advance' ? -newOpeningBalance : newOpeningBalance;

      const balanceDiff = newBalanceEffect - originalBalanceEffect;

      await updateCustomer(customer.id, {
        customerId: trimmedId,
        name: trimmedName,
        creditLimit: Number(form.creditLimit) || 0,
        status: form.status as 'active' | 'credit_risk',
        openingBalance: newOpeningBalance,
        openingBalanceType: newType as 'arrears' | 'advance',
      }, {
         balance: balanceDiff,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update customer. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-md overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center bg-blue-100/50 dark:bg-blue-950/50">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Edit Customer Information</h3>
            <button 
              type="button" 
              onClick={onClose}
              className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-medium">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Customer ID *</label>
              <input 
                type="text" 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                placeholder="E.g. CUST-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Customer Name *</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                placeholder="E.g. Acme Logistics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Credit Limit (KES) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.creditLimit}
                  onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Opening Balance *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.openingBalance}
                  onChange={e => setForm({...form, openingBalance: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Opening Balance Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'arrears'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'arrears'
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 bg-white dark:bg-blue-950'
                  }`}
                >
                  Arrears (Debit)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'advance'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'advance'
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 bg-white dark:bg-blue-950'
                  }`}
                >
                  Advance (Credit)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Status *</label>
              <select 
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value as 'active' | 'credit_risk'})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base font-semibold cursor-pointer shadow-sm"
              >
                <option value="active">Active</option>
                <option value="credit_risk">Credit Risk</option>
              </select>
            </div>
          </div>
          <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteProps {
  customer: Customer;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteConfirmModal({ customer, isDeleting, error, onConfirm, onClose }: DeleteProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-blue-950 rounded-xl shadow-2xl border border-gray-200 dark:border-blue-900 w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3.5 text-red-600 dark:text-red-500 mb-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertTriangle className="w-8 h-8 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Deletion</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This cannot be undone</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
              Are you sure you want to permanently delete customer <span className="font-bold text-gray-950 dark:text-blue-50">"{customer.name}"</span>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All references, transactions, and balance history for Customer ID <strong className="font-mono">{customer.customerId}</strong> will look for a parent reference or be orphaned.
            </p>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-blue-950/20 border-t border-gray-100 dark:border-blue-900 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-200 dark:border-blue-900 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-blue-950 hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={async () => await onConfirm()}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: '#dc2626' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdjustBalanceProps {
  customer: Customer;
  onClose: () => void;
}

function AdjustBalanceModal({ customer, onClose }: AdjustBalanceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a brief explanation/description for this adjustment.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create adjustment document
      await createAdjustment({
        customerId: customer.id,
        date: new Date(date).getTime() || Date.now(),
        type,
        amount: amountVal,
        description: description.trim(),
        createdBy: user?.uid || 'unknown'
      }, user?.email || 'system');

      // 2. Adjust customer balance
      // debit = increases customer outstanding balance (debit balance / customer owes more)
      // credit = reduces customer outstanding balance (credit balance / customer owes less)
      const balanceChange = type === 'debit' ? amountVal : -amountVal;
      const totalPurchasesChange = type === 'debit' ? amountVal : 0;

      await updateCustomer(customer.id, {}, { 
        balance: balanceChange, 
        totalPurchases: totalPurchasesChange 
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving the adjustment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="adjust-balance-modal">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-sm overflow-hidden transform transition-all duration-300">
        <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-50">Adjust Customer Balance</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium pb-1">Customer: {customer.name} ({customer.customerId})</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 text-red-700 rounded-lg text-sm font-semibold flex gap-2 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Current Balance</label>
            <div className="px-4 py-2 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base font-mono font-bold text-blue-900 dark:text-blue-50 shadow-sm">
              {formatCurrency(customer.balance)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-2 px-4 rounded-lg border text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  type === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                    : 'border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-950 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50'
                }`}
              >
                Credit (-)
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-2 px-4 rounded-lg border text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  type === 'debit'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 ring-2 ring-red-500/10'
                    : 'border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-950 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50'
                }`}
              >
                Debit (+)
              </button>
            </div>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-300 italic">
              {type === 'credit' 
                ? 'Credits deduct from outstanding balance (e.g., discounts, waivers, payment adjustments).' 
                : 'Debits add to outstanding balance (e.g., surcharges, handling fees).'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Adjustment Date *</label>
            <input
              type="date"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Adjustment Amount (KES)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-blue-300 dark:placeholder:text-blue-700 shadow-sm"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Reason / Description</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-blue-300 dark:placeholder:text-blue-700 resize-none shadow-sm"
              placeholder="E.g., Special weekend delivery fee waiver..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-blue-200 dark:border-blue-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-blue-900/10"
            >
              {loading ? 'Processing...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
