import React, { useState, useMemo, useEffect } from 'react';
import { useDeliveries, createDelivery, useCustomers, deleteDelivery, updateCustomer, updateDelivery } from '../lib/db';
import { formatCurrency, formatLitres } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { Search, Plus, Bot, Trash2, AlertTriangle, X, Edit2, Check, SlidersHorizontal, RotateCcw, Fuel, Users, Coins, Flame, Download } from 'lucide-react';
import { format } from 'date-fns';
import AIInputModal from '../components/AIInputModal';
import { Delivery } from '../types';
import Papa from 'papaparse';

interface DeleteDeliveryProps {
  delivery: Delivery;
  customerName: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteDeliveryConfirmModal({ 
  delivery, 
  customerName, 
  isDeleting, 
  error, 
  onConfirm, 
  onClose 
}: DeleteDeliveryProps) {
  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6">
          <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Deletion</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This cannot be undone</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
              Are you sure you want to permanently delete this delivery record? This will remove the record from all dashboard logs.
            </p>
            <div className="glass-panel p-4 rounded-lg space-y-2 border border-theme-border text-sm font-medium">
              <div className="flex justify-between items-center py-1 border-b border-theme-border">
                <span className="text-gray-500 dark:text-gray-400">Customer:</span> 
                <span className="text-gray-950 dark:text-blue-50 font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-theme-border">
                <span className="text-gray-500 dark:text-gray-400">Product:</span> 
                <span className="text-gray-900 dark:text-blue-50 font-semibold">{delivery.productType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-theme-border">
                <span className="text-gray-500 dark:text-gray-400">Litres:</span> 
                <span className="text-gray-900 dark:text-blue-50 font-mono font-semibold">{formatLitres(delivery.litres)} L</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Total Amount:</span> 
                <span className="text-cyan-500 dark:text-blue-400 font-mono font-bold">{formatCurrency(delivery.totalAmount)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-semibold">
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
            className="px-4 py-2 bg-red-600 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: '#dc2626' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteMultipleProps {
  count: number;
  totalValue: number;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteMultipleConfirmModal({
  count,
  totalValue,
  isDeleting,
  error,
  onConfirm,
  onClose
}: DeleteMultipleProps) {
  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6">
          <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Bulk Deletion</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This cannot be undone</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-gray-950 dark:text-blue-50">{count}</span> selected delivery records?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-normal leading-relaxed">
              This will automatically reverse their respective balance and purchase logs on each customer's account.
            </p>
            <div className="glass-panel p-4 rounded-lg space-y-2 border border-theme-border text-sm font-medium">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Total Value:</span> 
                <span className="text-red-600 dark:text-red-400 font-mono font-bold">{formatCurrency(totalValue)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-semibold">
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
            className="px-4 py-2 bg-red-600 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            style={{ backgroundColor: '#dc2626' }}
            id="btn-confirm-bulk-delete"
          >
            {isDeleting ? 'Deleting Selected...' : `Delete Selected (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Deliveries({ onViewCustomer }: { onViewCustomer?: (id: string) => void }) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin' || user?.email?.includes('admin');
  const { deliveries, loading } = useDeliveries();
  const { customers } = useCustomers();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [initialForm, setInitialForm] = useState<any>(null);

  const [deletingDelivery, setDeletingDelivery] = useState<Delivery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    customerId: string;
    productType: string;
    litres: string;
    totalAmount: string;
  } | null>(null);
  const [inlineSaveLoading, setInlineSaveLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterProductType, setFilterProductType] = useState<string>('All');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterMinLitres, setFilterMinLitres] = useState<string>('');
  const [filterMaxLitres, setFilterMaxLitres] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  const startInlineEdit = (d: Delivery) => {
    setEditingId(d.id);
    setEditForm({
      customerId: d.customerId,
      productType: d.productType,
      litres: String(d.litres),
      totalAmount: String(d.totalAmount)
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveInlineEdit = async (id: string) => {
    if (!editForm) return;
    const originalDelivery = deliveries.find(d => d.id === id);
    if (!originalDelivery) return;

    setInlineSaveLoading(true);
    try {
      const newLitres = parseFloat(editForm.litres);
      const newAmt = parseFloat(editForm.totalAmount);

      if (isNaN(newLitres) || newLitres <= 0) {
        alert('Please enter a valid volume (litres) greater than 0.');
        setInlineSaveLoading(false);
        return;
      }

      if (isNaN(newAmt) || newAmt < 0) {
        alert('Please enter a valid total amount.');
        setInlineSaveLoading(false);
        return;
      }

      const newCustomerId = editForm.customerId;
      const newProductType = editForm.productType;

      const customerChanged = originalDelivery.customerId !== newCustomerId;
      const amountChanged = originalDelivery.totalAmount !== newAmt;

      if (customerChanged) {
        const oldCustomer = customers.find(c => c.id === originalDelivery.customerId);
        if (oldCustomer) {
          await updateCustomer(oldCustomer.id, {}, {
            balance: -originalDelivery.totalAmount,
            totalPurchases: -originalDelivery.totalAmount
          });
        }
        const newCustomer = customers.find(c => c.id === newCustomerId);
        if (newCustomer) {
          await updateCustomer(newCustomer.id, {}, {
            balance: newAmt,
            totalPurchases: newAmt
          });
        }
      } else if (amountChanged) {
        const difference = newAmt - originalDelivery.totalAmount;
        const customer = customers.find(c => c.id === originalDelivery.customerId);
        if (customer) {
          await updateCustomer(customer.id, {}, {
            balance: difference,
            totalPurchases: difference
          });
        }
      }

      await updateDelivery(id, {
        customerId: newCustomerId,
        productType: newProductType,
        litres: newLitres,
        totalAmount: newAmt
      });

      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setInlineSaveLoading(false);
    }
  };

  const handleAIResult = (data: any) => {
    if (data.extractedFields) {
      setInitialForm(data.extractedFields);
      setIsAdding(true);
    }
  };

  const exportDeliveries = () => {
    const csv = Papa.unparse(filtered.map(d => ({
        Date: format(d.date, 'yyyy-MM-dd HH:mm'),
        Customer: customers.find(c => c.id === d.customerId)?.name || 'Unknown',
        Product: d.productType,
        Litres: d.litres,
        Amount: d.totalAmount
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deliveries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!deletingDelivery) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const customer = customers.find(c => c.id === deletingDelivery.customerId);
      if (customer) {
        await updateCustomer(customer.id, {}, {
          balance: -deletingDelivery.totalAmount,
          totalPurchases: -deletingDelivery.totalAmount
        });
      }
      await deleteDelivery(deletingDelivery.id);
      setSelectedIds(prev => prev.filter(id => id !== deletingDelivery.id));
      setDeletingDelivery(null);
    } catch (err) {
      console.error(err);
      setDeleteError('Failed to delete delivery. Please check your data and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...deliveries];

    // 1. Text Search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(d => {
        const cust = customers.find(c => c.id === d.customerId);
        return (
          (cust?.name || '').toLowerCase().includes(searchLower) || 
          (d.productType || '').toLowerCase().includes(searchLower) ||
          (d.id || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // 2. Product Type Filter
    if (filterProductType !== 'All') {
      result = result.filter(d => {
        const prod = (d.productType || '').toLowerCase();
        const filter = filterProductType.toLowerCase();
        if (filter.includes('super') && prod.includes('super')) return true;
        if (filter.includes('diesel') && prod.includes('diesel')) return true;
        if (filter.includes('brake') && prod.includes('brake')) return true;
        if (filter.includes('oil') && prod.includes('oil')) return true;
        return prod === filter;
      });
    }

    // 3. Customer Filter
    if (filterCustomerId !== 'All') {
      result = result.filter(d => d.customerId === filterCustomerId);
    }

    // 4. Date Range Filters
    if (filterStartDate) {
      const startMs = new Date(filterStartDate).getTime();
      result = result.filter(d => d.date >= startMs);
    }
    if (filterEndDate) {
      // Add 23h 59m to have an inclusive end date search
      const endMs = new Date(filterEndDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      result = result.filter(d => d.date <= endMs);
    }

    // 5. Volume Filters (Litres)
    if (filterMinLitres) {
      const minVal = parseFloat(filterMinLitres);
      if (!isNaN(minVal)) {
        result = result.filter(d => d.litres >= minVal);
      }
    }
    if (filterMaxLitres) {
      const maxVal = parseFloat(filterMaxLitres);
      if (!isNaN(maxVal)) {
        result = result.filter(d => d.litres <= maxVal);
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return a.date - b.date;
        case 'litres-desc':
          return b.litres - a.litres;
        case 'litres-asc':
          return a.litres - b.litres;
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        case 'date-desc':
        default:
          return b.date - a.date;
      }
    });

    return result;
  }, [deliveries, customers, search, filterProductType, filterCustomerId, filterStartDate, filterEndDate, filterMinLitres, filterMaxLitres, sortBy]);

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      // 1. Group total values to subtract per customer
      const customerAdjustments = new Map<string, number>();
      for (const id of selectedIds) {
        const d = deliveries.find(x => x.id === id);
        if (d) {
          customerAdjustments.set(
            d.customerId, 
            (customerAdjustments.get(d.customerId) || 0) + d.totalAmount
          );
        }
      }

      // 2. Adjust customer balances and purchases
      for (const [customerId, amount] of customerAdjustments.entries()) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          await updateCustomer(customerId, {}, {
            balance: -amount,
            totalPurchases: -amount
          });
        }
      }

      // 3. Delete deliveries from database
      for (const id of selectedIds) {
        await deleteDelivery(id);
      }

      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error(err);
      setBulkDeleteError('An error occurred during bulk deletion. Some records may not have been deleted.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const totalVolume = filtered.reduce((sum, d) => sum + d.litres, 0);
    const dieselVolume = filtered.filter(d => (d.productType || '').toLowerCase().includes('diesel')).reduce((sum, d) => sum + d.litres, 0);
    const superVolume = filtered.filter(d => (d.productType || '').toLowerCase().includes('super')).reduce((sum, d) => sum + d.litres, 0);
    const brakeFluidVolume = filtered.filter(d => (d.productType || '').toLowerCase().includes('brake')).reduce((sum, d) => sum + d.litres, 0);
    const engineOilVolume = filtered.filter(d => (d.productType || '').toLowerCase().includes('oil')).reduce((sum, d) => sum + d.litres, 0);
    const totalValue = filtered.reduce((sum, d) => sum + d.totalAmount, 0);
    const customerCount = new Set(filtered.map(d => d.customerId)).size;
    
    return {
      totalVolume,
      dieselVolume,
      superVolume,
      brakeFluidVolume,
      engineOilVolume,
      totalValue,
      customerCount
    };
  }, [filtered]);

  const bulkDeleteTotalValue = selectedIds.reduce((sum, id) => {
    const d = deliveries.find(x => x.id === id);
    return sum + (d?.totalAmount || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by customer or delivery ID..." 
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setSelectedIds([]); // reset selection when query changes for consistency
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-transparent border border-theme-border dark:border-theme-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-theme-text placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border text-base font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              showFilters 
                ? 'bg-blue-50 dark:bg-white/5 border-theme-border text-cyan-500 dark:text-blue-400 font-bold'
                : 'glass-panel border-theme-border text-gray-700 dark:text-gray-300 hover:bg-white/5 dark:hover:bg-blue-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Filters'}
            {(filterProductType !== 'All' || filterCustomerId !== 'All' || filterStartDate || filterEndDate || filterMinLitres || filterMaxLitres || sortBy !== 'date-desc') && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 skeleton-glow" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto p-2 bg-gradient-to-r from-blue-900/20 to-cyan-900/10 border border-blue-800/30 rounded-xl shadow-inner">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={exportDeliveries}
            className="w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowAIModal(true)}
            className="w-full sm:w-auto bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Bot className="w-4 h-4" />
            AI Auto-Fill
          </button>
          <button 
            onClick={() => {
              setInitialForm(null);
              setIsAdding(true);
            }}
            className="w-full sm:w-auto bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Delivery
          </button>
        </div>
      </div>

      {/* Advanced Collapsible Filters Panel */}
      {showFilters && (
        <div className="p-5 glass-panel border border-theme-border rounded-xl shadow-sm space-y-4 animate-fade-in transition-colors">
          <div className="flex items-center justify-between border-b border-theme-border pb-2.5">
            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              Advanced Filters & sorting
            </h3>
            <button
              onClick={() => {
                setFilterProductType('All');
                setFilterCustomerId('All');
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterMinLitres('');
                setFilterMaxLitres('');
                setSortBy('date-desc');
                setSearch('');
              }}
              className="text-xs font-semibold text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Customer Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Customer</label>
              <select
                value={filterCustomerId}
                onChange={e => setFilterCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All" className="dark:bg-slate-900">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Product Type</label>
              <select
                value={filterProductType}
                onChange={e => setFilterProductType(e.target.value as any)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All" className="dark:bg-slate-900">All Products</option>
                <option value="Diesel" className="dark:bg-slate-900">Diesel</option>
                <option value="Super (Premium)" className="dark:bg-slate-900">Super (Premium)</option>
                <option value="Brake fluid" className="dark:bg-slate-900">Brake fluid</option>
                <option value="Engine oil" className="dark:bg-slate-900">Engine oil</option>
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="date-desc" className="dark:bg-slate-900">Newest First</option>
                <option value="date-asc" className="dark:bg-slate-900">Oldest First</option>
                <option value="litres-desc" className="dark:bg-slate-900">Volume (Highest First)</option>
                <option value="litres-asc" className="dark:bg-slate-900">Volume (Lowest First)</option>
                <option value="amount-desc" className="dark:bg-slate-900">Value (Highest First)</option>
                <option value="amount-asc" className="dark:bg-slate-900">Value (Lowest First)</option>
              </select>
            </div>

            {/* Volume Quick Summary */}
            <div className="flex items-center justify-between p-3.5 glass-panel rounded-lg border border-theme-border text-xs text-gray-500 dark:text-gray-400">
              <div className="space-y-1">
                <div>Filtered Results: <span className="font-bold text-theme-text">{filtered.length} / {deliveries.length}</span></div>
                <div>Total Volume: <span className="font-bold text-gray-905 dark:text-theme-text">{formatLitres(filtered.reduce((sum, x) => sum + x.litres, 0))} L</span></div>
                <div>Total Amount: <span className="font-bold text-gray-950 dark:text-blue-50">{formatCurrency(filtered.reduce((sum, x) => sum + x.totalAmount, 0))}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-theme-border dark:border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-theme-border dark:border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Min Litres */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Min Volume (L)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={filterMinLitres}
                onChange={e => setFilterMinLitres(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-theme-border dark:border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-sm"
              />
            </div>

            {/* Max Litres */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Max Volume (L)</label>
              <input
                type="number"
                placeholder="e.g. 10000"
                value={filterMaxLitres}
                onChange={e => setFilterMaxLitres(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-theme-border dark:border-theme-border text-sm text-theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {isAdding && <AddDeliveryModal onClose={() => setIsAdding(false)} customers={customers} initialData={initialForm} />}
      {showAIModal && <AIInputModal onClose={() => setShowAIModal(false)} onResult={handleAIResult} />}

      {deletingDelivery && (
        <DeleteDeliveryConfirmModal
          delivery={deletingDelivery}
          customerName={customers.find(c => c.id === deletingDelivery.customerId)?.name || 'Unknown'}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => {
            setDeletingDelivery(null);
            setDeleteError(null);
          }}
        />
      )}

      {showBulkDeleteModal && (
        <DeleteMultipleConfirmModal
          count={selectedIds.length}
          totalValue={bulkDeleteTotalValue}
          isDeleting={isBulkDeleting}
          error={bulkDeleteError}
          onConfirm={confirmBulkDelete}
          onClose={() => {
            setShowBulkDeleteModal(false);
            setBulkDeleteError(null);
          }}
        />
      )}

      {/* Mini Dashboard Above Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="deliveries-mini-dashboard">
        {/* Card 1: Total Delivered Value */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors flex items-start justify-between">
          <div className="space-y-1.5 overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block truncate overflow-ellipsis">Total Delivered Value</span>
            <div className="text-2xl font-extrabold font-mono text-cyan-500 dark:text-blue-400 truncate">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-2xs text-gray-400 dark:text-gray-500 truncate">Based on {filtered.length} filtered records</p>
          </div>
          <div className="p-3 rounded-xl shrink-0 glow-blue-wrapper">
            <Coins className="w-5 h-5 glow-blue-icon" />
          </div>
        </div>

        {/* Card 2: Total Volume Delivered */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors flex items-start justify-between">
          <div className="space-y-1.5 overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block truncate overflow-ellipsis">Total Fuel Volume</span>
            <div className="text-2xl font-extrabold font-mono text-theme-text truncate">
              {formatLitres(stats.totalVolume)} <span className="text-sm font-semibold text-gray-400 font-sans">L</span>
            </div>
            <p className="text-2xs text-gray-400 dark:text-gray-500 truncate">Dispatched across stations</p>
          </div>
          <div className="p-3 rounded-xl shrink-0 glow-blue-wrapper">
            <Fuel className="w-5 h-5 glow-blue-icon" />
          </div>
        </div>

        {/* Card 3: Fuel Type Breakdown Progress */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors space-y-2.5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Mix</span>
            <div className="p-1.5 rounded-lg shrink-0 glow-blue-wrapper">
              <Flame className="w-4 h-4 glow-blue-icon" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 text-[10px] font-bold gap-x-2 gap-y-0.5">
              <span className="text-amber-500 dark:text-amber-400 truncate">DSL: {formatLitres(stats.dieselVolume)} L</span>
              <span className="text-emerald-500 dark:text-emerald-400 truncate">SUP: {formatLitres(stats.superVolume)} L</span>
              <span className="text-cyan-500 dark:text-cyan-400 truncate">BRK: {formatLitres(stats.brakeFluidVolume)} L</span>
              <span className="text-purple-500 dark:text-purple-400 truncate">OIL: {formatLitres(stats.engineOilVolume)} L</span>
            </div>
            <div className="h-1.5 w-full glass-panel rounded-full overflow-hidden flex shrink-0">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${stats.totalVolume > 0 ? (stats.dieselVolume / stats.totalVolume) * 100 : 25}%` }}
              />
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${stats.totalVolume > 0 ? (stats.superVolume / stats.totalVolume) * 100 : 25}%` }}
              />
              <div 
                className="bg-cyan-500 h-full transition-all duration-500" 
                style={{ width: `${stats.totalVolume > 0 ? (stats.brakeFluidVolume / stats.totalVolume) * 100 : 25}%` }}
              />
              <div 
                className="bg-purple-500 h-full transition-all duration-500" 
                style={{ width: `${stats.totalVolume > 0 ? (stats.engineOilVolume / stats.totalVolume) * 100 : 25}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              <span>DSL: {stats.totalVolume > 0 ? Math.round((stats.dieselVolume / stats.totalVolume) * 100) : 0}%</span>
              <span>SUP: {stats.totalVolume > 0 ? Math.round((stats.superVolume / stats.totalVolume) * 100) : 0}%</span>
              <span>BRK: {stats.totalVolume > 0 ? Math.round((stats.brakeFluidVolume / stats.totalVolume) * 100) : 0}%</span>
              <span>OIL: {stats.totalVolume > 0 ? Math.round((stats.engineOilVolume / stats.totalVolume) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Serviced Accounts */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors flex items-start justify-between">
          <div className="space-y-1.5 overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block truncate overflow-ellipsis">Active Customers</span>
            <div className="text-2xl font-extrabold font-mono text-theme-text truncate">
              {stats.customerCount}
            </div>
            <p className="text-2xs text-gray-400 dark:text-gray-500 truncate">Sourcing fuel currently</p>
          </div>
          <div className="p-3 rounded-xl shrink-0 glow-blue-wrapper">
            <Users className="w-5 h-5 glow-blue-icon" />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded border border-theme-border overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="dark:bg-transparent border-b border-theme-border transition-colors">
              <tr className="modern-tr">
                <th className="modern-th">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map(d => d.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 text-cyan-500 border-theme-border rounded focus:ring-blue-500 dark:bg-white/5 border-theme-border cursor-pointer"
                  />
                </th>
                <th className="modern-th">Date</th>
                <th className="modern-th">Customer</th>
                <th className="modern-th">Product</th>
                <th className="modern-th">Litres</th>
                <th className="modern-th">Total Amount</th>
                <th className="modern-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-glow">
                    <td className="modern-td">
                      <div className="h-4 w-4 bg-gray-200/80 dark:bg-white/5 rounded mx-auto"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-4 bg-gray-200/80 dark:bg-white/5 rounded w-24"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-4 bg-gray-200/80 dark:bg-white/5 rounded w-36"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-6 bg-gray-200/80 dark:bg-white/5 rounded-md w-16"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-4 bg-gray-200/80 dark:bg-white/5 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-4 bg-gray-200/80 dark:bg-white/5 rounded w-20 ml-auto"></div>
                    </td>
                    <td className="modern-td">
                      <div className="h-8 w-8 bg-gray-200/80 dark:bg-white/5 rounded-md ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr className="modern-tr"><td colSpan={7} className="px-4 py-8 text-center text-gray-600 dark:text-gray-300 text-base">No deliveries found.</td></tr>
              ) : filtered.map((d, idx) => {
                const isEditing = editingId === d.id;
                return (
                  <tr 
                    key={d.id} 
                    className={`${isEditing ? 'bg-blue-50/45 dark:bg-white/5' : 'hover:bg-white/5 dark:hover:bg-blue-900/50'} transition-colors animate-fade-in font-medium text-theme-text`}
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                  >
                    <td className="modern-td">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, d.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== d.id));
                          }
                        }}
                        className="w-4 h-4 text-cyan-500 border-theme-border rounded focus:ring-blue-500 dark:bg-white/5 border-theme-border cursor-pointer"
                      />
                    </td>
                    <td className="modern-td">{format(d.date, 'MMM d, yyyy HH:mm')}</td>
                    <td className="modern-td">
                      {isEditing && editForm ? (
                        <div className="w-full min-w-[150px]">
                          <select
                            value={editForm.customerId}
                            onChange={e => setEditForm({ ...editForm, customerId: e.target.value })}
                            className="w-full px-2 py-1 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            {customers.map(c => (
                              <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => onViewCustomer?.(d.customerId)}
                            className="hover:underline text-sky-400 dark:text-sky-300 font-bold cursor-pointer text-left focus:outline-none glow-sky-text"
                          >
                            {customers.find(c => c.id === d.customerId)?.name || 'Unknown'}
                          </button>
                        </>
                      )}
                    </td>
                    <td className="modern-td">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.productType}
                          onChange={e => setEditForm({ ...editForm, productType: e.target.value })}
                          className="px-2 py-1 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg text-sm font-bold text-theme-text focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="Diesel" className="dark:bg-slate-900">Diesel</option>
                          <option value="Super (Premium)" className="dark:bg-slate-900">Super (Premium)</option>
                          <option value="Brake fluid" className="dark:bg-slate-900">Brake fluid</option>
                          <option value="Engine oil" className="dark:bg-slate-900">Engine oil</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold uppercase tracking-wider ${
                          (d.productType || '').toLowerCase().includes('diesel') 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400' 
                            : (d.productType || '').toLowerCase().includes('brake')
                            ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400'
                            : (d.productType || '').toLowerCase().includes('oil')
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                        }`}>
                          {d.productType}
                        </span>
                      )}
                    </td>
                    <td className="modern-td">
                      {isEditing && editForm ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.litres}
                          onChange={e => setEditForm({ ...editForm, litres: e.target.value })}
                          className="px-2 py-1 glass-panel border border-theme-border rounded-lg text-sm text-theme-text text-right focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 font-mono font-bold"
                        />
                      ) : (
                        formatLitres(d.litres)
                      )}
                    </td>
                    <td className="modern-td">
                      {isEditing && editForm ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.totalAmount}
                          onChange={e => setEditForm({ ...editForm, totalAmount: e.target.value })}
                          className="px-2 py-1 glass-panel border border-theme-border rounded-lg text-sm text-theme-text text-right focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 font-mono font-bold"
                        />
                      ) : (
                        formatCurrency(d.totalAmount)
                      )}
                    </td>
                    <td className="modern-td">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => saveInlineEdit(d.id)}
                            disabled={inlineSaveLoading}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                            title="Save changes"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            disabled={inlineSaveLoading}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/5 dark:hover:bg-blue-900 disabled:opacity-50 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                            title="Cancel edit"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => startInlineEdit(d)}
                            disabled={editingId !== null}
                            className="p-2 text-gray-400 dark:text-blue-500 hover:text-cyan-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                            title="Edit Inline"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setDeletingDelivery(d)}
                            disabled={editingId !== null}
                            className="p-2 text-gray-400 dark:text-blue-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                            title="Delete Delivery"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AddDeliveryModal({ onClose, customers, initialData }: { onClose: () => void, customers: any[], initialData?: any }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // find CustomerId by name if AI gave us a customerId or name that matches
  let matchedCustomerId = '';
  if (initialData?.customerId) {
    const custNameLower = initialData.customerId.toLowerCase();
    const match = customers.find(c => c.name.toLowerCase().includes(custNameLower));
    if (match) matchedCustomerId = match.id;
  }

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('addDeliveryForm');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved delivery form', e);
      }
    }
    return {
      customerId: matchedCustomerId || '',
      productType: initialData?.productType || 'Diesel' as 'Diesel' | 'Super',
      litres: initialData?.litres ? String(initialData.litres) : '',
      totalAmount: initialData?.amount || initialData?.totalAmount ? String(initialData.amount || initialData.totalAmount) : '',
      date: format(new Date(), 'yyyy-MM-dd')
    };
  });

  useEffect(() => {
    localStorage.setItem('addDeliveryForm', JSON.stringify(form));
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.litres || !form.totalAmount) return;
    setLoading(true);
    
    try {
      const amt = parseFloat(form.totalAmount);
      await createDelivery({ 
        customerId: form.customerId, 
        date: new Date(form.date).getTime() || Date.now(),
        productType: form.productType,
        litres: parseFloat(form.litres),
        totalAmount: amt,
        createdBy: user?.uid || 'unknown'
      }, user?.email || 'system');
      const customer = customers.find(c => c.id === form.customerId);
      if (customer) {
        await updateCustomer(customer.id, {}, {
          balance: amt,
          totalPurchases: amt
        });
      }
      localStorage.removeItem('addDeliveryForm');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to record delivery');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-theme-border bg-blue-100/50 dark:bg-white/5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Record Fuel Delivery</h3>
            <button type="button" onClick={onClose} className="text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Customer</label>
              <select 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
              >
                <option value="" disabled className="dark:bg-slate-900">Select a customer</option>
                {customers.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Product Type</label>
              <select 
                value={form.productType}
                onChange={e => setForm({...form, productType: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
              >
                <option value="Diesel" className="dark:bg-slate-900">Diesel</option>
                <option value="Super (Premium)" className="dark:bg-slate-900">Super (Premium)</option>
                <option value="Brake fluid" className="dark:bg-slate-900">Brake fluid</option>
                <option value="Engine oil" className="dark:bg-slate-900">Engine oil</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Delivery Date</label>
              <input 
                type="date"
                required
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Litres</label>
                <input 
                  type="number" step="0.1" required
                  value={form.litres} onChange={e => setForm({...form, litres: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Total Amount (KES)</label>
                <input 
                  type="number" step="1" required
                  value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-50 text-base shadow-sm"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-blue-100/50 dark:bg-white/5 border-t border-theme-border flex justify-end gap-3">
             <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-base font-semibold text-cyan-400 hover:text-blue-900 dark:text-theme-text-muted dark:hover:text-blue-100 transition-colors">Cancel</button>
             <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg text-base font-semibold transition-colors">Record Delivery</button>
          </div>
        </form>
      </div>
    </div>
  );
}
