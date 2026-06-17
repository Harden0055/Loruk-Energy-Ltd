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
  });

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
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-blue-300 dark:border-blue-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900 dark:text-blue-100 placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAIModal(true)}
            className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors border border-blue-200"
          >
            <Bot className="w-4 h-4" />
            AI Auto-Fill
          </button>
          <button 
            onClick={() => {
              setInitialForm(null);
              setIsAdding(true);
            }}
            className="w-full sm:w-auto bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

      <div className="bg-white dark:bg-blue-950 rounded border border-gray-200 dark:border-blue-900 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-50 dark:bg-blue-900 border-b border-gray-200 dark:border-blue-900 transition-colors">
              <tr>
                <th className="px-4 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-left">Date</th>
                <th className="px-4 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-left">Customer</th>
                <th className="px-4 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-base">Loading payments...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-base">No payments found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors">
                  <td className="px-4 py-3 text-base text-gray-600 dark:text-gray-400">{format(p.date, 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-4 py-3 text-base font-medium text-gray-800 dark:text-blue-200"><button className="hover:underline text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => onViewCustomer?.(p.customerId)}>{customers.find(c => c.id === p.customerId)?.name || 'Unknown'}</button></td>
                  <td className="px-4 py-3 text-base font-mono font-medium text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
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
                      className="p-2 text-gray-400 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/25 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-sm overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">{isEditing ? 'Edit Payment' : 'Record Payment'}</h3>
            <button type="button" onClick={onClose} className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Customer</label>
              <select 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm font-semibold cursor-pointer"
              >
                <option value="" disabled>Select a customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Payment Date</label>
              <input 
                type="date"
                required
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Amount (KES)</label>
              <input 
                type="number" step="0.01" required
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3">
             <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-base font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors">Cancel</button>
             <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-base font-semibold transition-colors">Save Payment</button>
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-blue-950 rounded-xl shadow-2xl border border-gray-200 dark:border-blue-900 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
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
            <div className="bg-gray-50 dark:bg-blue-950/40 p-4 rounded-lg space-y-2 border border-gray-100 dark:border-blue-900 text-sm font-medium">
              <div className="flex justify-between items-center py-1 border-b border-gray-100/30 dark:border-blue-900/50">
                <span className="text-gray-500 dark:text-gray-400">Customer:</span> 
                <span className="text-gray-950 dark:text-blue-50 font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100/30 dark:border-blue-900/50">
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
