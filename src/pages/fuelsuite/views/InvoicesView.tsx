import React, { useState, useMemo } from 'react';
import { useFuel, Invoice, Customer } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard } from '../components';
import { 
  Plus, Pencil, Trash2, X, Users, FileText, UserCheck, Receipt, Banknote, 
  AlertCircle, User, CreditCard, RefreshCw, AlertTriangle, CheckCircle2,
  Search, LayoutGrid, List, MoreVertical, Phone, Mail, MessageSquare, 
  RotateCcw, ShieldAlert, Sparkles, ChevronRight, ExternalLink
} from 'lucide-react';
import { useConfirm } from '../useConfirm';

// Consistent color generator for avatars based on name
const AVATAR_COLORS = [
  'bg-emerald-600/90 text-emerald-100 ring-emerald-500/30',
  'bg-purple-600/90 text-purple-100 ring-purple-500/30',
  'bg-cyan-600/90 text-cyan-100 ring-cyan-500/30',
  'bg-pink-600/90 text-pink-100 ring-pink-500/30',
  'bg-amber-600/90 text-amber-100 ring-amber-500/30',
  'bg-blue-600/90 text-blue-100 ring-blue-500/30',
  'bg-rose-600/90 text-rose-100 ring-rose-500/30',
  'bg-indigo-600/90 text-indigo-100 ring-indigo-500/30',
  'bg-teal-600/90 text-teal-100 ring-teal-500/30',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function InvoicesView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { 
    invoices, 
    setInvoices, 
    customers, 
    setCustomers, 
    activeStation, 
    stations, 
    deduplicateData, 
    checkDuplicates 
  } = useFuel();

  const [activeTab, setActiveTab] = useState<'customers' | 'invoices'>('customers');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dedupeMsg, setDedupeMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStation, setFilterStation] = useState<string>(activeStation);
  const [filterCustomerType, setFilterCustomerType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMinReceivable, setFilterMinReceivable] = useState<string>('');
  const [filterMaxReceivable, setFilterMaxReceivable] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modals & Details State
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    code: '',
    name: '',
    creditLimit: 0,
    openingBalance: 0,
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
    phone: '',
    email: '',
    customerType: 'Retail',
    remarks: '',
  });

  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
    customerName: '',
    totalAmount: 0,
    paidAmount: 0,
  });

  // Statement / Remark popup state
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [activeRemarkCustomer, setActiveRemarkCustomer] = useState<Customer | null>(null);
  const [remarkInput, setRemarkInput] = useState<string>('');

  // Sync station with global context
  React.useEffect(() => {
    setFilterStation(activeStation);
  }, [activeStation]);

  // Unified calculations for customer financial balances
  const customerFinancials = useMemo(() => {
    const map = new Map<string, {
      totalInvoiced: number;
      totalPaid: number;
      netBalance: number;
      isOverLimit: boolean;
      status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVER_LIMIT';
      invoiceCount: number;
    }>();

    customers.forEach(c => {
      const custInvoices = invoices.filter(i => 
        i.customerName?.toLowerCase() === c.name.toLowerCase() && 
        (c.station ? i.station === c.station : true)
      );

      const totalInvoiced = custInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
      const totalPaid = custInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
      const opening = Number(c.openingBalance) || 0;
      const netBalance = opening + totalInvoiced - totalPaid;
      const creditLimit = Number(c.creditLimit) || 0;
      const isOverLimit = creditLimit > 0 && netBalance > creditLimit;

      let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVER_LIMIT' = 'PAID';
      if (isOverLimit) {
        status = 'OVER_LIMIT';
      } else if (netBalance <= 0) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      } else {
        status = 'UNPAID';
      }

      map.set(c.id, {
        totalInvoiced,
        totalPaid,
        netBalance,
        isOverLimit,
        status,
        invoiceCount: custInvoices.length,
      });
    });

    return map;
  }, [customers, invoices]);

  // Filtered Customer List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Station filter
      if (filterStation !== 'Combined Total' && c.station && c.station !== filterStation) {
        return false;
      }

      // Customer Type filter
      if (filterCustomerType !== 'all') {
        const type = c.customerType || 'Retail';
        if (type.toLowerCase() !== filterCustomerType.toLowerCase()) return false;
      }

      const fin = customerFinancials.get(c.id);
      const balance = fin ? fin.netBalance : (c.openingBalance || 0);

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'paid' && balance > 0) return false;
        if (filterStatus === 'partial' && (fin?.status !== 'PARTIAL')) return false;
        if (filterStatus === 'unpaid' && balance <= 0) return false;
        if (filterStatus === 'overlimit' && !fin?.isOverLimit) return false;
      }

      // Receivables Range filter
      if (filterMinReceivable !== '') {
        const min = parseFloat(filterMinReceivable);
        if (!isNaN(min) && balance < min) return false;
      }
      if (filterMaxReceivable !== '') {
        const max = parseFloat(filterMaxReceivable);
        if (!isNaN(max) && balance > max) return false;
      }

      // Search query (matches name, code, phone, email, station)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesCode = c.code?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesStation = c.station?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesEmail && !matchesStation) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const codeA = a.code || '';
      const codeB = b.code || '';
      if (codeA && codeB) {
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      }
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
  }, [customers, filterStation, filterCustomerType, filterStatus, filterMinReceivable, filterMaxReceivable, searchQuery, customerFinancials]);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(i => filterStation === 'Combined Total' || i.station === filterStation)
      .filter(i => !filterDate || i.date === filterDate)
      .filter(i => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          i.customerName?.toLowerCase().includes(q) ||
          i.station?.toLowerCase().includes(q) ||
          i.date?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, filterStation, filterDate, searchQuery]);

  // Overall Financial Summary
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalReceivables = 0;
    let overLimitCount = 0;

    customers.forEach(c => {
      if (filterStation !== 'Combined Total' && c.station && c.station !== filterStation) return;
      const fin = customerFinancials.get(c.id);
      if (fin) {
        totalInvoiced += fin.totalInvoiced;
        totalPaid += fin.totalPaid;
        totalReceivables += fin.netBalance > 0 ? fin.netBalance : 0;
        if (fin.isOverLimit) overLimitCount++;
      } else {
        const ob = Number(c.openingBalance) || 0;
        if (ob > 0) totalReceivables += ob;
      }
    });

    return { totalInvoiced, totalPaid, totalReceivables, overLimitCount };
  }, [customers, customerFinancials, filterStation]);

  // Duplicate detection & handler
  const invoiceDuplicates = useMemo(() => {
    const dupes = checkDuplicates(filterDate || undefined, filterStation === 'Combined Total' ? undefined : filterStation);
    return dupes.breakdown.invoices;
  }, [checkDuplicates, filterDate, filterStation, invoices]);

  const handleCleanDuplicates = () => {
    const res = deduplicateData(filterDate || undefined, filterStation === 'Combined Total' ? undefined : filterStation);
    if (res.breakdown.invoices > 0) {
      setDedupeMsg(`Cleaned ${res.breakdown.invoices} duplicate invoice record(s) successfully.`);
    } else {
      setDedupeMsg('No duplicate invoices found.');
    }
    setTimeout(() => setDedupeMsg(null), 5000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCustomerType('all');
    setFilterStatus('all');
    setFilterMinReceivable('');
    setFilterMaxReceivable('');
    setFilterDate('');
    setFilterStation('Combined Total');
  };

  // Customer Form handlers
  const resetCustomerForm = () => {
    setCustomerForm({
      code: '',
      name: '',
      creditLimit: 0,
      openingBalance: 0,
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
      phone: '',
      email: '',
      customerType: 'Retail',
      remarks: '',
    });
    setEditingCustomerId(null);
    setIsCustomerFormOpen(false);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerForm({
      code: customer.code || '',
      name: customer.name || '',
      creditLimit: customer.creditLimit || 0,
      openingBalance: customer.openingBalance || 0,
      station: customer.station || (stations[0]?.name || 'Station 1'),
      phone: customer.phone || '',
      email: customer.email || '',
      customerType: customer.customerType || 'Retail',
      remarks: customer.remarks || '',
    });
    setEditingCustomerId(customer.id);
    setIsCustomerFormOpen(true);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomerId) {
      setCustomers(prev => prev.map(c => c.id === editingCustomerId ? { ...c, ...customerForm as Customer } : c));
    } else {
      const newCustomer: Customer = {
        id: 'cust_' + Math.random().toString(36).substr(2, 9),
        station: customerForm.station || (stations[0]?.name || 'Station 1'),
        code: customerForm.code || `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: customerForm.name || '',
        creditLimit: Number(customerForm.creditLimit) || 0,
        openingBalance: Number(customerForm.openingBalance) || 0,
        phone: customerForm.phone || '',
        email: customerForm.email || '',
        customerType: customerForm.customerType || 'Retail',
        remarks: customerForm.remarks || '',
      };
      setCustomers(prev => [...prev, newCustomer]);
    }
    resetCustomerForm();
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    confirmDelete(
      `Are you sure you want to delete customer "${customerName}"? This will not delete recorded invoices, but will remove their profile ledger.`,
      () => {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
      }
    );
  };

  // Invoice Form handlers
  const resetInvoiceForm = () => {
    setInvoiceForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
      customerName: '',
      totalAmount: 0,
      paidAmount: 0,
    });
    setEditingInvoiceId(null);
    setIsInvoiceFormOpen(false);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setInvoiceForm({ ...inv });
    setEditingInvoiceId(inv.id);
    setIsInvoiceFormOpen(true);
  };

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInvoiceId) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? { ...inv, ...invoiceForm as Invoice } : inv));
    } else {
      const newInv: Invoice = {
        id: 'inv_' + Math.random().toString(36).substr(2, 9),
        station: invoiceForm.station || (stations[0]?.name || 'Station 1'),
        date: invoiceForm.date || new Date().toISOString().split('T')[0],
        customerName: invoiceForm.customerName || '',
        totalAmount: Number(invoiceForm.totalAmount) || 0,
        paidAmount: Number(invoiceForm.paidAmount) || 0,
      };
      setInvoices(prev => [...prev, newInv]);
    }
    resetInvoiceForm();
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    confirmDelete('Are you sure you want to delete this invoice record?', () => {
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    });
  };

  // Remark quick update
  const handleSaveRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemarkCustomer) return;
    setCustomers(prev => prev.map(c => 
      c.id === activeRemarkCustomer.id ? { ...c, remarks: remarkInput } : c
    ));
    setActiveRemarkCustomer(null);
  };

  // Helper for rendering oval status badge
  const renderStatusBadge = (status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVER_LIMIT', balance: number) => {
    if (status === 'OVER_LIMIT') {
      return (
        <span id="badge-overlimit" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
          Over Limit
        </span>
      );
    }
    if (status === 'PAID') {
      return (
        <span id="badge-paid" className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Paid / Clear
        </span>
      );
    }
    if (status === 'PARTIAL') {
      return (
        <span id="badge-partial" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Partial Paid
        </span>
      );
    }
    return (
      <span id="badge-unpaid" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        Unpaid
      </span>
    );
  };

  return (
    <div id="customer-invoices-dashboard" className="p-4 sm:p-6 lg:p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      {confirmDialog}

      {/* Top Header Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-emerald-500/20 border border-[#00D4FF]/30 flex items-center justify-center text-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.25)]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Customer CRM & Invoices</h1>
              <span className="px-3 py-0.5 rounded-full bg-slate-800/90 text-xs font-semibold text-slate-300 border border-slate-700">
                {activeTab === 'customers' ? `${filteredCustomers.length} Customers` : `${filteredInvoices.length} Invoices`}
              </span>
            </div>
            <p className="text-slate-400 mt-0.5 text-xs">
              Manage accounts, track credit limits, monitor receivables, and audit sales invoices.
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
          {invoiceDuplicates > 0 && (
            <Button
              onClick={handleCleanDuplicates}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold px-3 py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clean {invoiceDuplicates} Duplicates
            </Button>
          )}

          {/* Primary Action Button */}
          {activeTab === 'customers' ? (
            <button
              id="btn-add-customer"
              onClick={() => {
                if (isCustomerFormOpen) resetCustomerForm();
                else setIsCustomerFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-200 cursor-pointer active:scale-95"
            >
              {isCustomerFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Customer</>}
            </button>
          ) : (
            <button
              id="btn-add-invoice"
              onClick={() => {
                if (isInvoiceFormOpen) resetInvoiceForm();
                else setIsInvoiceFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D4FF] hover:bg-[#38bdf8] text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,212,255,0.35)] transition-all duration-200 cursor-pointer active:scale-95"
            >
              {isInvoiceFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Invoice</>}
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Duplicate alerts */}
      {dedupeMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-semibold text-emerald-300">{dedupeMsg}</div>
        </div>
      )}

      {invoiceDuplicates > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              Found <strong className="text-amber-300">{invoiceDuplicates} duplicate invoice(s)</strong> created from multiple saves.
            </p>
          </div>
          <Button 
            onClick={handleCleanDuplicates}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 whitespace-nowrap"
          >
            Clean Now
          </Button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Receivables</p>
            <p className="text-xl font-bold text-[#A855F7] font-mono mt-1">KES {Math.round(metrics.totalReceivables).toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active customer balances</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-bold text-[#00D4FF] font-mono mt-1">KES {Math.round(metrics.totalInvoiced).toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Gross credit sales recorded</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Collections</p>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-1">KES {Math.round(metrics.totalPaid).toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Paid into accounts</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Risk</p>
            <p className="text-xl font-bold text-rose-400 font-mono mt-1">{metrics.overLimitCount} Over Limit</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Exceeding allowed credit</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex gap-4">
          <button
            id="tab-customers"
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2.5 pb-2.5 px-3 border-b-2 font-semibold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'customers'
                ? 'border-emerald-400 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Customers Directory
          </button>
          <button
            id="tab-invoices"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2.5 pb-2.5 px-3 border-b-2 font-semibold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-[#00D4FF] text-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Invoices & Ledger
          </button>
        </div>

        {/* View Mode Toggle (Table / Grid) */}
        {activeTab === 'customers' && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              title="Table View"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Cards Grid View"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Customer Form Modal/Drawer */}
      {isCustomerFormOpen && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              {editingCustomerId ? 'Edit Customer Profile' : 'Add New Customer Profile'}
            </h3>
            <button onClick={resetCustomerForm} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCustomerSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Station / Location</label>
              <Select value={customerForm.station} onChange={e => setCustomerForm({ ...customerForm, station: e.target.value as any })}>
                {stations.map(s => (
                  <option className="bg-slate-900 text-white" key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Customer Code</label>
              <Input
                type="text"
                placeholder="e.g. CUST-001"
                value={customerForm.code || ''}
                onChange={e => setCustomerForm({ ...customerForm, code: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Customer / Organization Name</label>
              <Input
                type="text"
                placeholder="e.g. Tongaren D.E.B Sec."
                value={customerForm.name || ''}
                onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Customer Type</label>
              <Select value={customerForm.customerType || 'Retail'} onChange={e => setCustomerForm({ ...customerForm, customerType: e.target.value })}>
                <option className="bg-slate-900 text-white" value="Retail">Retail</option>
                <option className="bg-slate-900 text-white" value="Commercial">Commercial</option>
                <option className="bg-slate-900 text-white" value="Wholesale">Wholesale</option>
                <option className="bg-slate-900 text-white" value="School/Gov">School / Gov</option>
                <option className="bg-slate-900 text-white" value="Contractor">Contractor</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Phone Number</label>
              <Input
                type="text"
                placeholder="e.g. +254 712 345 678"
                value={customerForm.phone || ''}
                onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="e.g. info@company.com"
                value={customerForm.email || ''}
                onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Credit Limit (KES)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customerForm.creditLimit || ''}
                onChange={e => setCustomerForm({ ...customerForm, creditLimit: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Opening Balance (KES)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customerForm.openingBalance || ''}
                onChange={e => setCustomerForm({ ...customerForm, openingBalance: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="col-span-1 md:col-span-3 lg:col-span-4">
              <label className="block text-xs text-slate-400 font-semibold mb-1">Remarks / Account Notes</label>
              <Input
                type="text"
                placeholder="e.g. Authorized signatories, payment cycles, discount arrangements..."
                value={customerForm.remarks || ''}
                onChange={e => setCustomerForm({ ...customerForm, remarks: e.target.value })}
              />
            </div>

            <div className="col-span-1 md:col-span-3 lg:col-span-4 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={resetCustomerForm}>Cancel</Button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20"
              >
                {editingCustomerId ? 'Update Customer' : 'Save Customer Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Form Modal/Drawer */}
      {isInvoiceFormOpen && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              {editingInvoiceId ? 'Edit Sales Invoice' : 'New Sales Invoice'}
            </h3>
            <button onClick={resetInvoiceForm} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleInvoiceSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Date</label>
              <Input
                type="date"
                value={invoiceForm.date || ''}
                onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Station</label>
              <Select
                value={invoiceForm.station}
                onChange={e => setInvoiceForm({ ...invoiceForm, station: e.target.value as any })}
              >
                {stations.map(s => (
                  <option className="bg-slate-900 text-white" key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
              </Select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-slate-400 font-semibold mb-1">Customer</label>
              <Select
                value={invoiceForm.customerName}
                onChange={e => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                required
              >
                <option className="bg-slate-900 text-white" value="">Select customer ({customers.length} registered)...</option>
                {customers
                  .slice()
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(c => (
                    <option className="bg-slate-900 text-white" key={c.id} value={c.name}>
                      {c.code ? `[${c.code}] ` : ''}{c.name}{c.station && c.station !== invoiceForm.station ? ` (${c.station})` : ''}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Total (KES)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={invoiceForm.totalAmount || ''}
                onChange={e => setInvoiceForm({ ...invoiceForm, totalAmount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Paid (KES)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={invoiceForm.paidAmount || ''}
                onChange={e => setInvoiceForm({ ...invoiceForm, paidAmount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="col-span-1 md:col-span-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={resetInvoiceForm}>Cancel</Button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20"
              >
                {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main CRM Layout: Filter Sidebar + Customers Dashboard */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar Filter Panel (Inventar CRM Style) */}
          <div className="lg:col-span-1 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filter By</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Search Customer</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Name, code, phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Station / Location Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Location / Station</label>
              <Select
                value={filterStation}
                onChange={e => setFilterStation(e.target.value)}
                className="text-xs bg-slate-950 text-white"
              >
                <option className="bg-slate-900 text-white" value="Combined Total">All Stations</option>
                {stations.map(s => (
                  <option className="bg-slate-900 text-white" key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
              </Select>
            </div>

            {/* Customer Type Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Customer Type</label>
              <Select
                value={filterCustomerType}
                onChange={e => setFilterCustomerType(e.target.value)}
                className="text-xs bg-slate-950 text-white"
              >
                <option className="bg-slate-900 text-white" value="all">All Types</option>
                <option className="bg-slate-900 text-white" value="Retail">Retail</option>
                <option className="bg-slate-900 text-white" value="Commercial">Commercial</option>
                <option className="bg-slate-900 text-white" value="Wholesale">Wholesale</option>
                <option className="bg-slate-900 text-white" value="School/Gov">School / Gov</option>
                <option className="bg-slate-900 text-white" value="Contractor">Contractor</option>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Status</label>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs bg-slate-950 text-white"
              >
                <option className="bg-slate-900 text-white" value="all">All Statuses</option>
                <option className="bg-slate-900 text-white" value="paid">Paid / Clear (Zero Debt)</option>
                <option className="bg-slate-900 text-white" value="partial">Partial Paid</option>
                <option className="bg-slate-900 text-white" value="unpaid">Unpaid / Has Debt</option>
                <option className="bg-slate-900 text-white" value="overlimit">Over Credit Limit</option>
              </Select>
            </div>

            {/* Receivables Range */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Receivables Range (KES)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMinReceivable}
                  onChange={e => setFilterMinReceivable(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMaxReceivable}
                  onChange={e => setFilterMaxReceivable(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>

          {/* Right Main Customers Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search and summary ribbon */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">
                Showing <strong className="text-white">{filteredCustomers.length}</strong> of <strong className="text-white">{customers.length}</strong> customers
                {filterStation !== 'Combined Total' && <span className="text-emerald-400 ml-1">({filterStation})</span>}
              </div>
            </div>

            {/* List / Table Mode */}
            {viewMode === 'list' && (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-3">Contact</th>
                        <th className="py-3.5 px-3 text-right">Credit Limit</th>
                        <th className="py-3.5 px-3 text-right">Invoiced</th>
                        <th className="py-3.5 px-3 text-right">Paid</th>
                        <th className="py-3.5 px-3 text-right">Receivables</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-3">Remarks</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredCustomers.map(c => {
                        const fin = customerFinancials.get(c.id);
                        const totalInvoiced = fin ? fin.totalInvoiced : 0;
                        const totalPaid = fin ? fin.totalPaid : 0;
                        const netBalance = fin ? fin.netBalance : (c.openingBalance || 0);
                        const status = fin ? fin.status : (netBalance <= 0 ? 'PAID' : 'UNPAID');
                        const avatarStyle = getAvatarColor(c.name || 'User');

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* Customer Avatar & Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ring-2 ${avatarStyle}`}>
                                  {(c.name || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setStatementCustomer(c)}
                                      className="font-bold text-white text-sm group-hover:text-cyan-400 hover:underline transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                                      title="View Invoices & Payments Statement"
                                    >
                                      <span>{c.name}</span>
                                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                    {c.code && <span className="font-mono text-slate-400">[{c.code}]</span>}
                                    <span>•</span>
                                    <span className="text-slate-400">{c.customerType || 'Retail'}</span>
                                    {c.station && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-400/80">{c.station}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact (Phone / Email) */}
                            <td className="py-3.5 px-3">
                              <div className="text-xs space-y-0.5">
                                {c.phone ? (
                                  <div className="text-slate-300 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-500" /> {c.phone}
                                  </div>
                                ) : (
                                  <span className="text-slate-600 text-[11px] italic">No phone</span>
                                )}
                                {c.email && (
                                  <div className="text-slate-400 text-[11px] truncate max-w-[130px] flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-500" /> {c.email}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Credit Limit */}
                            <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-300">
                              KES {(c.creditLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Invoiced */}
                            <td className="py-3.5 px-3 text-right font-mono text-xs text-[#00D4FF]">
                              KES {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Paid */}
                            <td className="py-3.5 px-3 text-right font-mono text-xs text-emerald-400">
                              KES {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Receivables / Net Balance */}
                            <td className="py-3.5 px-3 text-right font-mono text-xs font-bold">
                              <span className={fin?.isOverLimit ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]' : netBalance > 0 ? 'text-[#A855F7]' : 'text-emerald-400'}>
                                KES {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Colored Oval Status Badge */}
                            <td className="py-3.5 px-4 text-center">
                              {renderStatusBadge(status, netBalance)}
                            </td>

                            {/* Remarks */}
                            <td className="py-3.5 px-3">
                              {c.remarks ? (
                                <button
                                  onClick={() => {
                                    setActiveRemarkCustomer(c);
                                    setRemarkInput(c.remarks || '');
                                  }}
                                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" /> View Remark
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveRemarkCustomer(c);
                                    setRemarkInput('');
                                  }}
                                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                                >
                                  + Add Remark
                                </button>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setStatementCustomer(c)}
                                  title="View Customer Invoices Statement"
                                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEditCustomer(c)}
                                  title="Edit Profile"
                                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id, c.name)}
                                  title="Delete Customer"
                                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-500">
                            <div className="max-w-xs mx-auto text-center space-y-2">
                              <Users className="w-8 h-8 text-slate-600 mx-auto" />
                              <p className="font-semibold text-slate-400 text-sm">No customers matched your filter</p>
                              <p className="text-xs text-slate-600">Try adjusting your search criteria or resetting filters.</p>
                              <Button variant="secondary" onClick={handleResetFilters} className="text-xs mt-2">
                                Reset Filters
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grid Cards Mode (Alternative modern card view) */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map(c => {
                  const fin = customerFinancials.get(c.id);
                  const totalInvoiced = fin ? fin.totalInvoiced : 0;
                  const totalPaid = fin ? fin.totalPaid : 0;
                  const netBalance = fin ? fin.netBalance : (c.openingBalance || 0);
                  const status = fin ? fin.status : (netBalance <= 0 ? 'PAID' : 'UNPAID');
                  const avatarStyle = getAvatarColor(c.name || 'User');

                  return (
                    <div
                      key={c.id}
                      className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-200 space-y-4 shadow-lg hover:shadow-cyan-500/5 relative group"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base ring-2 ${avatarStyle}`}>
                            {(c.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => setStatementCustomer(c)}
                              className="font-bold text-white text-base group-hover:text-cyan-400 hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                              title="View Invoices & Payments Statement"
                            >
                              <span>{c.name}</span>
                              <ExternalLink className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100" />
                            </button>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              {c.code && <span className="font-mono text-slate-400">[{c.code}]</span>}
                              <span>•</span>
                              <span>{c.customerType || 'Retail'}</span>
                              {c.station && <span>• {c.station}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {renderStatusBadge(status, netBalance)}
                        </div>
                      </div>

                      {/* Card Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Credit Limit</p>
                          <p className="text-xs font-mono text-slate-300 font-bold mt-0.5">
                            KES {(c.creditLimit || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Invoiced</p>
                          <p className="text-xs font-mono text-cyan-400 font-bold mt-0.5">
                            KES {totalInvoiced.toLocaleString()}
                          </p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Receivables</p>
                          <p className={`text-xs font-mono font-bold mt-0.5 ${fin?.isOverLimit ? 'text-rose-400' : 'text-purple-400'}`}>
                            KES {netBalance.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Contact & Actions footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          {c.phone && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                              <Phone className="w-3 h-3 text-slate-500" /> {c.phone}
                            </span>
                          )}
                          {c.remarks && (
                            <button
                              onClick={() => {
                                setActiveRemarkCustomer(c);
                                setRemarkInput(c.remarks || '');
                              }}
                              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold underline"
                            >
                              Remark
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatementCustomer(c)}
                            title="Statement"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditCustomer(c)}
                            title="Edit"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            title="Delete"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices & Ledger View */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Quick filter toolbar for invoices */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="min-w-[150px]">
                <label className="block text-xs text-slate-400 font-semibold mb-1">Filter Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="min-w-[180px]">
                <label className="block text-xs text-slate-400 font-semibold mb-1">Station</label>
                <Select
                  value={filterStation}
                  onChange={e => setFilterStation(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option className="bg-slate-900 text-white" value="Combined Total">All Stations</option>
                  {stations.map(s => (
                    <option className="bg-slate-900 text-white" key={s.id || s.name} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              </div>

              <div className="min-w-[200px]">
                <label className="block text-xs text-slate-400 font-semibold mb-1">Search Customer / ID</label>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="text-xs text-slate-400 self-end sm:self-center">
              Total Invoices: <strong className="text-white">{filteredInvoices.length}</strong>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-3">Station</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-3 text-right">Invoice Total</th>
                    <th className="py-3.5 px-3 text-right">Paid Amount</th>
                    <th className="py-3.5 px-3 text-right">Invoice Balance</th>
                    <th className="py-3.5 px-3 text-right">Customer Net Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvoices.map(t => {
                    const invoiceBalance = (Number(t.totalAmount) || 0) - (Number(t.paidAmount) || 0);
                    const customer = customers.find(c => 
                      c.name?.toLowerCase() === t.customerName?.toLowerCase() && 
                      (c.station ? c.station === t.station : true)
                    );

                    // Running ledger calculation for customer
                    const customerInvoices = invoices
                      .filter(i => i.customerName?.toLowerCase() === t.customerName?.toLowerCase() && (t.station ? i.station === t.station : true))
                      .sort((a, b) => {
                        const dCompare = (a.date || '').localeCompare(b.date || '');
                        if (dCompare !== 0) return dCompare;
                        return (a.id || '').localeCompare(b.id || '');
                      });

                    const tIndex = customerInvoices.findIndex(i => i.id === t.id);
                    const customerOpeningBalance = customer ? (customer.openingBalance || 0) : 0;
                    const runningInvoiced = customerInvoices.slice(0, tIndex + 1).reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
                    const runningPaid = customerInvoices.slice(0, tIndex + 1).reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
                    const customerNetBalance = customerOpeningBalance + runningInvoiced - runningPaid;

                    let invStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
                    if (invoiceBalance <= 0) {
                      invStatus = 'PAID';
                    } else if (Number(t.paidAmount) > 0) {
                      invStatus = 'PARTIAL';
                    }

                    const avatarStyle = getAvatarColor(t.customerName || 'Cust');

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{t.date || '-'}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {t.station}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ring-1 ${avatarStyle}`}>
                              {(t.customerName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <button
                              onClick={() => {
                                let cust = customers.find(x => x.name?.toLowerCase() === t.customerName?.toLowerCase());
                                if (!cust) {
                                  cust = {
                                    id: 'cust_temp_' + Math.random(),
                                    code: '',
                                    name: t.customerName || 'Customer',
                                    station: t.station,
                                    creditLimit: 0,
                                    openingBalance: 0,
                                    customerType: 'Retail'
                                  };
                                }
                                setStatementCustomer(cust);
                              }}
                              className="font-bold text-white text-xs group-hover:text-cyan-400 hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                              title="View Invoices & Payments Statement"
                            >
                              <span>{t.customerName}</span>
                              <ExternalLink className="w-3 h-3 text-cyan-400 opacity-60 group-hover:opacity-100" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold text-[#3B82F6]">
                          KES {Number(t.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold text-[#00D4FF]">
                          KES {Number(t.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-xs font-bold">
                          <span className={invoiceBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            KES {invoiceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-[#A855F7]">
                          KES {customerNetBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {renderStatusBadge(invStatus, invoiceBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditInvoice(t)}
                              title="Edit Invoice"
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(t.id)}
                              title="Delete Invoice"
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-400 text-sm">No invoices recorded for this selection</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Statement Dialog */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ${getAvatarColor(statementCustomer.name || 'User')}`}>
                  {(statementCustomer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{statementCustomer.name} - Statement</h3>
                  <p className="text-xs text-slate-400">
                    Code: <span className="font-mono text-slate-300">{statementCustomer.code || 'N/A'}</span> • Credit Limit: <span className="font-mono text-emerald-400">KES {(statementCustomer.creditLimit || 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Opening Balance</p>
                  <p className="text-sm font-bold font-mono text-slate-300 mt-0.5">
                    KES {(statementCustomer.openingBalance || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Invoiced</p>
                  <p className="text-sm font-bold font-mono text-[#00D4FF] mt-0.5">
                    KES {(customerFinancials.get(statementCustomer.id)?.totalInvoiced || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Net Balance Due</p>
                  <p className="text-sm font-bold font-mono text-[#A855F7] mt-0.5">
                    KES {(customerFinancials.get(statementCustomer.id)?.netBalance || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Station</th>
                      <th className="p-3 text-right">Invoiced (KES)</th>
                      <th className="p-3 text-right">Paid (KES)</th>
                      <th className="p-3 text-right">Running Balance (KES)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {invoices
                      .filter(i => i.customerName?.toLowerCase() === statementCustomer.name?.toLowerCase())
                      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                      .map((inv, idx, arr) => {
                        const invBal = (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0);
                        const cumulativeInvoiced = arr.slice(0, idx + 1).reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
                        const cumulativePaid = arr.slice(0, idx + 1).reduce((s, x) => s + (Number(x.paidAmount) || 0), 0);
                        const runningBal = (statementCustomer.openingBalance || 0) + cumulativeInvoiced - cumulativePaid;

                        return (
                          <tr key={inv.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-slate-300">{inv.date}</td>
                            <td className="p-3 text-slate-400">{inv.station}</td>
                            <td className="p-3 text-right font-mono text-[#00D4FF]">{(Number(inv.totalAmount) || 0).toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">{(Number(inv.paidAmount) || 0).toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-purple-400">{runningBal.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              {renderStatusBadge(invBal <= 0 ? 'PAID' : Number(inv.paidAmount) > 0 ? 'PARTIAL' : 'UNPAID', invBal)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" onClick={() => setStatementCustomer(null)}>Close Statement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Remark Popup Dialog */}
      {activeRemarkCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Customer Remarks ({activeRemarkCustomer.name})
              </h4>
              <button onClick={() => setActiveRemarkCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRemark} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5">Remarks / Account Notes</label>
                <textarea
                  rows={4}
                  value={remarkInput}
                  onChange={e => setRemarkInput(e.target.value)}
                  placeholder="Enter notes, payment terms, or special instructions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setActiveRemarkCustomer(null)}>Cancel</Button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Save Remark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
