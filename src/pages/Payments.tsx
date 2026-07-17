import React, { useState } from 'react';
import { usePayments, createPayment, useCustomers, updateCustomer, deletePayment, updatePayment } from '../lib/db';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { Search, Plus, Bot, Trash2, AlertTriangle, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { Payment } from '../types';
import AIInputModal from '../components/AIInputModal';

export default function Payments({ onViewCustomer }: { onViewCustomer?: (id: string) => void }) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin' || user?.email?.includes('admin');
  const { payments, loading } = usePayments();
  const { customers } = useCustomers();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [initialForm, setInitialForm] = useState<any>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deletingPayment) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const customer = customers.find(c => c.id === deletingPayment.customerId);
      if (customer) {
        await updateCustomer(customer.id, {}, { balance: deletingPayment.amount }, user?.email || 'system');
      }
      await deletePayment(deletingPayment.id);
      setDeletingPayment(null);
    } catch (err: any) {
      console.error(err);
      setDeleteError(err?.message || 'An error occurred while deleting the payment.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAIResult = (data: any) => {
    if (data.extractedFields) {
      setInitialForm(data.extractedFields);
      setIsAdding(true);
    }
  };

  const filtered = payments.filter(p => {
    const cust = customers.find(c => c.id === p.customerId);
    return cust?.name.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => (b.createdAt || b.date) - (a.createdAt || a.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search payments..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-theme-border dark:border-theme-border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-theme-text placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto p-2 bg-gradient-to-r from-emerald-900/20 to-teal-900/10 border border-emerald-800/30 rounded-xl shadow-inner">
          <button 
            onClick={() => setShowAIModal(true)}
            className="w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Bot className="w-4 h-4" />
            AI Auto-Fill
          </button>
          <button 
            onClick={() => {
              setInitialForm(null);
              setIsAdding(true);
            }}
            className="w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {isAdding && <AddPaymentModal onClose={() => setIsAdding(false)} customers={customers} initialData={initialForm} />}
      {showAIModal && <AIInputModal onClose={() => setShowAIModal(false)} onResult={handleAIResult} />}

      {deletingPayment && (
        <DeletePaymentConfirmModal
          payment={deletingPayment}
          customerName={customers.find(c => c.id === deletingPayment.customerId)?.name || 'Unknown'}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => {
            setDeletingPayment(null);
            setDeleteError(null);
          }}
        />
      )}

      <div className="glass-panel rounded border border-theme-border overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="dark:bg-transparent border-b border-theme-border transition-colors">
              <tr className="modern-tr">
                <th className="modern-th">Date</th>
                <th className="modern-th">Customer</th>
                <th className="modern-th">Amount</th>
                <th className="modern-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                <tr className="modern-tr"><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-base">Loading payments...</td></tr>
              ) : filtered.length === 0 ? (
                <tr className="modern-tr"><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-base">No payments found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/5 dark:hover:bg-blue-900/50 transition-colors">
                  <td className="modern-td">{format(p.date, 'MMM d, yyyy HH:mm')}</td>
                  <td className="modern-td"><button className="hover:underline text-sky-400 dark:text-sky-300 cursor-pointer glow-sky-text font-bold" onClick={() => onViewCustomer?.(p.customerId)}>{customers.find(c => c.id === p.customerId)?.name || 'Unknown'}</button></td>
                  <td className="modern-td text-emerald-400 font-semibold font-mono text-base">{formatCurrency(p.amount)}</td>
                  <td className="modern-td">
                    <button 
                      onClick={() => {
                        setInitialForm({
                          id: p.id,
                          customerId: p.customerId,
                          amount: p.amount,
                          date: p.date
                        });
                        setIsAdding(true);
                      }}
                      className="p-2 text-gray-400 dark:text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                      title="Edit Payment"
                      id={`btn-edit-payment-${p.id}`}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setDeletingPayment(p)}
                      className="p-2 text-gray-400 dark:text-blue-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                      title="Delete Payment"
                      id={`btn-delete-payment-${p.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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

export function AddPaymentModal({ onClose, customers, initialData }: { onClose: () => void, customers: any[], initialData?: any }) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin' || user?.email?.includes('admin');
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  // find CustomerId by name if AI gave us a customerId or name that matches
  let matchedCustomerId = '';
  if (isEditing) {
    matchedCustomerId = initialData.customerId;
  } else if (initialData?.customerId) {
    const custNameLower = initialData.customerId.toLowerCase();
    const match = customers.find(c => c.name.toLowerCase().includes(custNameLower));
    if (match) matchedCustomerId = match.id;
  }

  const initialDateStr = initialData?.date 
    ? (typeof initialData.date === 'number' 
        ? format(initialData.date, 'yyyy-MM-dd') 
        : initialData.date)
    : format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    customerId: matchedCustomerId || '',
    amount: (initialData?.amount !== undefined) ? String(initialData.amount) : '',
    date: initialDateStr
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.amount) return;
    setLoading(true);
    try {
      const amountVal = parseFloat(form.amount);
      const newTimestamp = new Date(form.date).getTime() || Date.now();

      if (isEditing) {
        const oldAmount = parseFloat(initialData.amount);
        
        if (initialData.customerId === form.customerId) {
            // Same customer, update the difference
            const difference = amountVal - oldAmount;
            if (difference !== 0) {
               await updateCustomer(form.customerId, {}, { balance: -difference });
            }
        } else {
             // Revert from old customer
             const oldCust = customers.find(c => c.id === initialData.customerId);
             if (oldCust) {
               await updateCustomer(oldCust.id, {}, { balance: oldAmount });
             }

             // Apply to new customer
             const currentCust = customers.find(c => c.id === form.customerId);
             if (currentCust) {
               await updateCustomer(currentCust.id, {}, { balance: -amountVal });
             }
        }

        // 2. Update payment document
        await updatePayment(initialData.id, {
          customerId: form.customerId,
          date: newTimestamp,
          amount: amountVal
        });
      } else {
        // Normal Create Mode
        await createPayment({ 
          customerId: form.customerId, 
          date: newTimestamp,
          amount: amountVal,
          createdBy: user?.uid || 'unknown'
        }, user?.email || 'system');
        const customer = customers.find(c => c.id === form.customerId);
        if (customer) {
          await updateCustomer(customer.id, {}, { balance: -amountVal });
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert(isEditing ? 'Failed to update payment' : 'Failed to record payment');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45  flex items-center justify-center p-4 z-50">
      <div className="bg-[#0E0E12] rounded-xl shadow-2xl border border-theme-border w-full max-w-sm overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-theme-border bg-emerald-500/5 dark:bg-emerald-500/5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-emerald-400">{isEditing ? 'Edit Payment' : 'Record Payment'}</h3>
            <button type="button" onClick={onClose} className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-emerald-400 mb-1.5">Customer</label>
              <select 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-theme-text dark:text-blue-50 text-base shadow-sm font-semibold cursor-pointer"
              >
                <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="" disabled>Select a customer...</option>
                {customers.map(c => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-emerald-400 mb-1.5">Payment Date</label>
              <input 
                type="date"
                required
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-theme-text dark:text-blue-50 text-base shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-emerald-400 mb-1.5">Amount (KES)</label>
              <input 
                type="number" step="0.01" required
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-theme-text dark:text-blue-50 text-base shadow-sm"
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-emerald-500/5 dark:bg-emerald-500/5 border-t border-theme-border flex justify-end gap-3">
             <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-base font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">Cancel</button>
             <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-lg text-base font-semibold transition-colors cursor-pointer">Save Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeletePaymentProps {
  payment: Payment;
  customerName: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function DeletePaymentConfirmModal({
  payment,
  customerName,
  isDeleting,
  error,
  onConfirm,
  onClose
}: DeletePaymentProps) {
  return (
    <div className="fixed inset-0 bg-black/45  flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6">
          <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Deletion</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This will reverse the payment impact on customer balance</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
              Are you sure you want to permanently delete this payment? This will add the payment amount back to the customer's outstanding balance and remove the transaction from all ledger entries.
            </p>
            <div className="glass-panel p-4 rounded-lg space-y-2 border border-theme-border text-sm font-medium">
              <div className="flex justify-between items-center py-1 border-b border-theme-border">
                <span className="text-gray-500 dark:text-gray-400">Customer:</span> 
                <span className="text-gray-950 dark:text-blue-50 font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-theme-border">
                <span className="text-gray-500 dark:text-gray-400">Date:</span> 
                <span className="text-gray-950 dark:text-blue-50 font-semibold">{format(payment.date, 'MMM d, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Payment Amount:</span> 
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatCurrency(payment.amount)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 glass-panel border-t border-theme-border flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-theme-border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 glass-panel hover:bg-white/5 dark:hover:bg-blue-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={async () => await onConfirm()}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-605 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: '#dc2626' }}
            id="btn-confirm-delete-payment"
          >
            {isDeleting ? 'Deleting...' : 'Delete Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
