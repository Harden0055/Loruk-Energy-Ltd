import { useState, useMemo } from 'react';
import { 
  useCustomers, 
  useDeliveries, 
  usePayments, 
  useAdjustments, 
  deleteDelivery, 
  deletePayment, 
  deleteAdjustment, 
  updateCustomer 
} from '../lib/db';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../lib/auth';
import { Search, Filter, Download, Wallet, Trash2, AlertTriangle, Truck, Coins, ArrowUp, ArrowDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { setupPdfHeader, addPdfFooter } from '../lib/pdfTemplate';

interface LedgerEntry {
  id: string;
  date: number;
  type: 'delivery' | 'payment' | 'adjustment_debit' | 'adjustment_credit';
  note: string;
  debit: number; // Delivery or Debit adjustment amount
  credit: number; // Payment or Credit adjustment amount
  customerId: string;
  customerName: string;
}

export default function Ledger({ onViewCustomer }: { onViewCustomer?: (id: string) => void }) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin' || user?.email?.includes('admin');
  const { customers, loading: cl } = useCustomers();
  const { deliveries, loading: dl } = useDeliveries();
  const { payments, loading: pl } = usePayments();
  const { adjustments, loading: al } = useAdjustments();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'delivery' | 'payment'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const [deletingEntry, setDeletingEntry] = useState<LedgerEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDeleteEntry = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const dbId = deletingEntry.id.substring(4); // e.g. del-xyz -> xyz, pay-xyz -> xyz, adj-xyz -> xyz
      const type = deletingEntry.type;
      
      const customer = customers.find(c => c.id === deletingEntry.customerId);
      if (customer) {
        let balanceChange = 0;
        let totalPurchasesChange = 0;

        if (type === 'delivery') {
          balanceChange = -deletingEntry.debit;
          totalPurchasesChange = -deletingEntry.debit;
        } else if (type === 'payment') {
          balanceChange = deletingEntry.credit;
        } else if (type === 'adjustment_debit') {
          balanceChange = -deletingEntry.debit;
          totalPurchasesChange = -deletingEntry.debit;
        } else if (type === 'adjustment_credit') {
          balanceChange = deletingEntry.credit;
        }

        await updateCustomer(customer.id, {}, {
          balance: balanceChange,
          totalPurchases: totalPurchasesChange
        });
      }

      if (type === 'delivery') {
        await deleteDelivery(dbId);
      } else if (type === 'payment') {
        await deletePayment(dbId);
      } else if (type === 'adjustment_debit' || type === 'adjustment_credit') {
        await deleteAdjustment(dbId);
      }

      setDeletingEntry(null);
    } catch (err) {
      console.error(err);
      setDeleteError('An error occurred while deleting the ledger entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = cl || dl || pl || al;

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.name || 'Unknown';
  };

  const ledgerEntries = useMemo(() => {
    if (loading) return [];

    const entries: LedgerEntry[] = [];

    deliveries.forEach(d => {
      entries.push({
        id: `del-${d.id}`,
        date: d.date,
        type: 'delivery',
        note: `Delivery`,
        debit: d.totalAmount,
        credit: 0,
        customerId: d.customerId,
        customerName: getCustomerName(d.customerId)
      });
    });

    payments.forEach(p => {
      entries.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'payment',
        note: `Payment`,
        debit: 0,
        credit: p.amount,
        customerId: p.customerId,
        customerName: getCustomerName(p.customerId)
      });
    });

    adjustments.forEach(adj => {
      entries.push({
        id: `adj-${adj.id}`,
        date: adj.date,
        type: adj.type === 'debit' ? 'adjustment_debit' : 'adjustment_credit',
        note: adj.type === 'debit' ? 'Debit Note' : 'Credit Note',
        debit: adj.type === 'debit' ? adj.amount : 0,
        credit: adj.type === 'credit' ? adj.amount : 0,
        customerId: adj.customerId,
        customerName: getCustomerName(adj.customerId)
      });
    });

    // Sort chronologically
    return entries.sort((a, b) => a.date - b.date);
  }, [deliveries, payments, adjustments, customers, loading]);

  const filteredEntries = useMemo(() => {
    let result = ledgerEntries;

    if (selectedCustomerId !== 'all') {
      result = result.filter(e => e.customerId === selectedCustomerId);
    }

    // Calculate dynamic starting balance
    let initialBalance = 0;
    if (selectedCustomerId !== 'all') {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      const ob = selectedCustomer?.openingBalance || 0;
      initialBalance = selectedCustomer?.openingBalanceType === 'advance' ? -ob : ob;
    } else {
      initialBalance = customers.reduce((sum, c) => {
        const ob = c.openingBalance || 0;
        return sum + (c.openingBalanceType === 'advance' ? -ob : ob);
      }, 0);
    }

    // Accumulate any transactions that occurred before dateFrom
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      const priorTransactions = result.filter(e => e.date < fromTime);
      const priorDebits = priorTransactions.reduce((sum, e) => sum + e.debit, 0);
      const priorCredits = priorTransactions.reduce((sum, e) => sum + e.credit, 0);
      initialBalance += (priorDebits - priorCredits);
    }

    if (filterType !== 'all') {
      result = result.filter(e => {
        if (filterType === 'delivery') {
          return e.type === 'delivery' || e.type === 'adjustment_debit';
        } else if (filterType === 'payment') {
          return e.type === 'payment' || e.type === 'adjustment_credit';
        } else if (filterType === 'manual') {
          return e.type === 'adjustment_debit' || e.type === 'adjustment_credit';
        }
        return true;
      });
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter(e => e.date >= fromTime);
    }

    if (dateTo) {
      // Add one day to include the whole "to" date
      const toTime = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      result = result.filter(e => e.date <= toTime);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => e.note.toLowerCase().includes(term));
    }

    let runningBalance = initialBalance;
    const entriesWithBalance = result.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
    return entriesWithBalance.sort((a, b) => b.date - a.date);
  }, [ledgerEntries, selectedCustomerId, filterType, dateFrom, dateTo, searchTerm, customers]);

  const totalDebits = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = filteredEntries.reduce((sum, e) => sum + e.credit, 0);

  const overallBalance = useMemo(() => {
    const trxSum = ledgerEntries.reduce((sum, e) => sum + e.debit - e.credit, 0);
    const openingBal = customers.reduce((sum, c) => {
      const ob = c.openingBalance || 0;
      return sum + (c.openingBalanceType === 'advance' ? -ob : ob);
    }, 0);
    return trxSum + openingBal;
  }, [ledgerEntries, customers]);

  const generatePDF = async () => {
    const doc = new jsPDF();
    const customerName = selectedCustomerId === 'all' ? 'All Customers' : getCustomerName(selectedCustomerId);
    
    let currentY = await setupPdfHeader({
      doc,
      title: 'GENERAL LEDGER REPORT',
      leftBoxLines: [
        'Loruk Energy Limited',
        'T/A Finance & Accounting',
        'P.O BOX 342',
        `Customer: ${customerName}`
      ],
      rightBoxLines: [
        { label: 'From Date    :', value: dateFrom ? format(new Date(dateFrom), 'MMM dd, yyyy') : 'Start' },
        { label: 'To Date        :', value: dateTo ? format(new Date(dateTo), 'MMM dd, yyyy') : 'Present' }
      ]
    });

    // Summary Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text('Summary:', 14, currentY);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total Debits: ${formatCurrency(totalDebits)}`, 14, currentY + 6);
    doc.text(`Total Credits: ${formatCurrency(totalCredits)}`, 14, currentY + 12);
    const netChange = totalDebits - totalCredits;
    doc.text(`Net Change: ${formatCurrency(Math.abs(netChange))} ${netChange > 0 ? 'Due' : 'Credit'}`, 14, currentY + 18);

    currentY += 24;

    const headRow = ['Date', 'Note', 'Debit', 'Credit', 'Balance'];
    if (selectedCustomerId === 'all') {
      headRow.splice(1, 0, 'Customer');
    }

    const rows = [...filteredEntries].map(e => {
      const row = [
        format(e.date, 'MM/dd/yyyy'),
        e.note,
        e.debit > 0 ? formatCurrency(e.debit) : '-',
        e.credit > 0 ? formatCurrency(e.credit) : '-',
        formatCurrency(e.runningBalance)
      ];
      if (selectedCustomerId === 'all') {
        row.splice(1, 0, e.customerName);
      }
      return row;
    });

    autoTable(doc, {
      startY: currentY,
      head: [headRow],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
      bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
      styles: { fontSize: 9 }
    });

    // Add summary section (Closing Balance)
    let summaryY = (doc as any).lastAutoTable.finalY + 10;
    if (summaryY + 20 > 270) {
      doc.addPage();
      summaryY = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(14, summaryY, 182, 14, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    
    const closingBalanceValue = filteredEntries.length > 0 
      ? filteredEntries[filteredEntries.length - 1].runningBalance 
      : 0;
    const balanceValText = closingBalanceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(`Closing Balance (KES) :   ${balanceValText}`, 192, summaryY + 9, { align: 'right' });

    // @ts-ignore
    addPdfFooter(doc, summaryY + 14 + 10);

    doc.save(`ledger-report-${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">General Ledger</h2>
          <p className="text-gray-500">Track all financial transactions</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={filteredEntries.length === 0}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {selectedCustomer && (() => {
        const custBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].runningBalance : (selectedCustomer?.openingBalanceType === 'advance' ? -(selectedCustomer.openingBalance || 0) : (selectedCustomer?.openingBalance || 0));
        const custBalanceColor = custBalance !== 0 
          ? 'text-pink-600 dark:text-pink-400' 
          : 'text-gray-900 dark:text-blue-50';
        return (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel border border-theme-border p-6 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Credit Limit</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-blue-50">{formatCurrency(selectedCustomer.creditLimit)}</h3>
          </div>
          <div className="glass-panel border border-theme-border p-6 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outstanding Balance</p>
            <h3 className={`text-2xl font-bold ${custBalanceColor}`}>
              {formatCurrency(custBalance)}
            </h3>
          </div>
        </div>
      )})()}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-blue-950 border border-theme-border p-6 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-pink-500 dark:text-pink-400 mb-1">Total Outstanding Balance (All Entries)</p>
          <h3 className={`text-3xl font-bold ${overallBalance !== 0 ? 'text-pink-600 dark:text-pink-400' : 'text-blue-900 dark:text-theme-text'}`}>
            {formatCurrency(overallBalance)}
          </h3>
        </div>
        <div className="w-14 h-14 glass-panel rounded-full shadow-sm flex items-center justify-center">
          <Wallet className="w-7 h-7 text-pink-500 dark:text-pink-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 glass-panel border border-theme-border rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-text cursor-pointer"
          >
            <option value="all" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-text cursor-pointer"
          >
            <option value="all" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">All Transactions</option>
            <option value="delivery" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Deliveries (Debit)</option>
            <option value="payment" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Payments (Credit)</option>
            <option value="manual" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Manual Adjustments</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-text"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-text"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-blue-950 border border-theme-border p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-400 dark:text-blue-400 mb-1">Filtered Debits (Deliveries)</p>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-theme-text">{formatCurrency(totalDebits)}</h3>
          </div>
          <div className="w-12 h-12 glass-panel rounded-full shadow-sm flex items-center justify-center">
            <ArrowUp className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-blue-950 border border-theme-border p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-400 dark:text-blue-400 mb-1">Filtered Credits (Payments)</p>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-theme-text">{formatCurrency(totalCredits)}</h3>
          </div>
          <div className="w-12 h-12 glass-panel rounded-full shadow-sm flex items-center justify-center">
            <ArrowDown className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-blue-950 border border-theme-border p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-400 dark:text-blue-400 mb-1">Net Change</p>
            <h3 className={`text-2xl font-bold ${totalDebits - totalCredits > 0 ? 'text-blue-900 dark:text-theme-text' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(Math.abs(totalDebits - totalCredits))}
              <span className="text-sm font-normal ml-1 text-gray-500 dark:text-gray-300">{totalDebits - totalCredits > 0 ? 'Due' : 'Credit'}</span>
            </h3>
          </div>
          <div className="w-12 h-12 glass-panel rounded-full shadow-sm flex items-center justify-center">
            <Coins className="w-6 h-6 text-cyan-500 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {deletingEntry && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 animate-scale-in">
            <div className="p-6">
              <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                <AlertTriangle className="w-8 h-8 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Deletion</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This will reverse its balance impact on the customer</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
                  Are you sure you want to permanently delete this transaction? This will automatically recalculate the customer's balance and purchases log.
                </p>

                <div className="glass-panel p-4 rounded-lg space-y-2 border border-theme-border text-sm font-medium">
                  <div className="flex justify-between items-center py-1 border-b border-theme-border">
                    <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                    <span className="text-gray-950 dark:text-blue-50 font-bold">{deletingEntry.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-theme-border">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-gray-950 dark:text-blue-50 capitalize font-semibold">{deletingEntry.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-theme-border">
                    <span className="text-gray-500 dark:text-gray-400">Note:</span>
                    <span className="text-gray-950 dark:text-blue-50 font-semibold">{deletingEntry.note}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                    <span className={`font-semibold font-mono ${deletingEntry.debit > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(deletingEntry.debit || deletingEntry.credit)}
                    </span>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg flex gap-2 items-start text-red-700 dark:text-red-400 text-sm font-semibold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 glass-panel border-t border-theme-border flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setDeletingEntry(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-theme-border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 glass-panel hover:bg-white/5 dark:hover:bg-blue-900 transition-colors"
                id="btn-cancel-delete"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDeleteEntry}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                style={{ backgroundColor: '#dc2626' }}
                id="btn-confirm-delete-entry"
              >
                {isDeleting ? 'Deleting...' : 'Delete Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded border border-theme-border overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="modern-tr">
                <th className="modern-th">Date</th>
                {selectedCustomerId === 'all' && <th className="modern-th">Customer</th>}
                <th className="modern-th">Note</th>
                <th className="modern-th">Debit</th>
                <th className="modern-th">Credit</th>
                <th className="modern-th">Balance</th>
                <th className="modern-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                <tr className="modern-tr"><td colSpan={selectedCustomerId === 'all' ? 7 : 6} className="px-4 py-8 text-center text-gray-500 text-base">Loading ledger...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr className="modern-tr"><td colSpan={selectedCustomerId === 'all' ? 7 : 6} className="px-4 py-8 text-center text-gray-500 text-base">No transactions found.</td></tr>
              ) : [...filteredEntries].reverse().map(e => (
                <tr key={e.id} className="hover:bg-white/5 dark:hover:bg-blue-900/50 transition-colors duration-300">
                  <td className="modern-td">{format(e.date, 'MMM d, yyyy HH:mm')}</td>
                  {selectedCustomerId === 'all' && <td className="modern-td"><button className="hover:underline text-sky-400 dark:text-sky-300 cursor-pointer glow-sky-text font-bold" onClick={() => onViewCustomer?.(e.customerId)}>{e.customerName}</button></td>}
                  <td className="modern-td">
                    <span className="flex items-center gap-2">
                       {e.type === 'delivery' || e.type === 'adjustment_debit' ? (
                         <ArrowUp className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                       ) : (
                         <ArrowDown className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                       )}
                       <span>{e.note}</span>
                    </span>
                  </td>
                  <td className="modern-td">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</td>
                  <td className="modern-td">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</td>
                  <td className={`px-4 py-3 text-base font-mono font-medium text-right ${e.runningBalance > 0 ? 'text-red-600 dark:text-red-400' : e.runningBalance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-500 dark:text-blue-400'}`}>{formatCurrency(e.runningBalance)}</td>
                  <td className="modern-td">
                    <button 
                      onClick={() => setDeletingEntry(e)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-md inline-flex items-center justify-center cursor-pointer"
                      title="Delete Transaction"
                      id={`btn-delete-entry-${e.id}`}
                    >
                      <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-605 dark:hover:text-red-400" />
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
