import React, { useState, useMemo } from 'react';
import { useFuel, Expense, ExpenseTemplate, ExpenseFrequency, ExpensePaymentMethod } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard } from '../components';
import { 
  Plus, Pencil, Trash2, X, Receipt, CreditCard, Banknote, ReceiptText, 
  Zap, Users, Truck, Wrench, UtensilsCrossed, Building2, Droplet, 
  Shield, Award, Wifi, Sparkles, RefreshCw, Filter, Search, 
  CheckCircle2, ChevronRight, Bookmark, ArrowUpRight, Info, Check, Tag, Clock, CalendarDays, Coins
} from 'lucide-react';
import { useConfirm } from '../useConfirm';

export const getExpenseBadgeMeta = (category?: string, code?: string) => {
  const text = `${code || ''} ${category || ''}`.toLowerCase();
  
  if (text.includes('gen') || text.includes('generator')) {
    return { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
  }
  if (text.includes('lunch') || text.includes('meal') || text.includes('food') || text.includes('diet') || text.includes('welfare')) {
    return { icon: UtensilsCrossed, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
  }
  if (text.includes('elect') || text.includes('power') || text.includes('token') || text.includes('kplc')) {
    return { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', badge: 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60' };
  }
  if (text.includes('rent') || text.includes('lease') || text.includes('ground')) {
    return { icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', badge: 'bg-purple-950/60 text-purple-300 border-purple-800/60' };
  }
  if (text.includes('salar') || text.includes('wage') || text.includes('staff') || text.includes('casual') || text.includes('labour')) {
    return { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-950/60 text-blue-300 border-blue-800/60' };
  }
  if (text.includes('water') || text.includes('sanitat') || text.includes('sewer')) {
    return { icon: Droplet, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60' };
  }
  if (text.includes('sec') || text.includes('guard') || text.includes('patrol')) {
    return { icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', badge: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60' };
  }
  if (text.includes('lic') || text.includes('permit') || text.includes('epra') || text.includes('county') || text.includes('tax')) {
    return { icon: Award, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30', badge: 'bg-teal-950/60 text-teal-300 border-teal-800/60' };
  }
  if (text.includes('maint') || text.includes('repair') || text.includes('service') || text.includes('nozzle')) {
    return { icon: Wrench, color: 'text-lime-400', bg: 'bg-lime-500/10 border-lime-500/30', badge: 'bg-lime-950/60 text-lime-300 border-lime-800/60' };
  }
  if (text.includes('transport') || text.includes('fuel') || text.includes('fare') || text.includes('vehicle')) {
    return { icon: Truck, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', badge: 'bg-sky-950/60 text-sky-300 border-sky-800/60' };
  }
  if (text.includes('wifi') || text.includes('internet') || text.includes('airtime') || text.includes('pos')) {
    return { icon: Wifi, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', badge: 'bg-sky-950/60 text-sky-300 border-sky-800/60' };
  }
  if (text.includes('clean') || text.includes('soap') || text.includes('detergent')) {
    return { icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30', badge: 'bg-pink-950/60 text-pink-300 border-pink-800/60' };
  }
  return { icon: ReceiptText, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
};

export default function ExpensesView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { expenses, setExpenses, activeStation, stations, expenseTemplates, setExpenseTemplates } = useFuel();
  
  const [activeTab, setActiveTab] = useState<'log' | 'recurring' | 'analytics'>('log');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<{ isOpen: boolean, code: string | null }>({ isOpen: false, code: null });

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCode, setFilterCode] = useState('ALL');
  const [filterRecurring, setFilterRecurring] = useState<'ALL' | 'RECURRING' | 'ONEOFF'>('ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');

  // Expense Template Form Modal (for managing recurring master codes)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<ExpenseTemplate>>({
    code: '',
    name: '',
    category: 'Operations',
    defaultAmount: 0,
    frequency: 'Monthly',
    isRecurring: true,
    defaultPaymentMethod: 'Cash',
    notes: '',
  });

  // Expense Log Form
  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation,
    expenseCode: 'EXP-GEN',
    category: 'Operations & Fuel',
    description: '',
    amount: 2500,
    paymentMethod: 'Cash',
    isRecurring: true,
    frequency: 'Weekly',
  });

  const filteredData = useMemo(() => {
    return expenses
      .filter(e => activeStation === 'Combined Total' || e.station === activeStation)
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (e.expenseCode || '').toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.station || '').toLowerCase().includes(q)
        );
      })
      .filter(e => {
        if (filterCode === 'ALL') return true;
        return e.expenseCode === filterCode;
      })
      .filter(e => {
        if (filterRecurring === 'ALL') return true;
        if (filterRecurring === 'RECURRING') return e.isRecurring === true;
        return e.isRecurring !== true;
      })
      .filter(e => {
        if (filterPayment === 'ALL') return true;
        return (e.paymentMethod || 'Cash').toLowerCase() === filterPayment.toLowerCase();
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, activeStation, searchQuery, filterCode, filterRecurring, filterPayment]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation,
      expenseCode: expenseTemplates[0]?.code || 'EXP-GEN',
      category: expenseTemplates[0]?.category || 'Operations & Fuel',
      description: '',
      amount: expenseTemplates[0]?.defaultAmount || 0,
      paymentMethod: expenseTemplates[0]?.defaultPaymentMethod || 'Cash',
      isRecurring: expenseTemplates[0]?.isRecurring ?? true,
      frequency: expenseTemplates[0]?.frequency || 'Monthly',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSelectTemplatePreset = (code: string) => {
    const t = expenseTemplates.find(tpl => tpl.code === code);
    if (t) {
      setForm(prev => ({
        ...prev,
        expenseCode: t.code,
        category: t.category,
        amount: prev.amount && prev.amount > 0 && editingId ? prev.amount : (t.defaultAmount || 0),
        paymentMethod: t.defaultPaymentMethod || 'Cash',
        isRecurring: t.isRecurring,
        frequency: t.frequency,
        description: prev.description ? prev.description : t.name,
      }));
    } else {
      setForm(prev => ({ ...prev, expenseCode: code }));
    }
  };

  const handleEdit = (expense: Expense) => {
    setForm({ ...expense });
    setEditingId(expense.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setExpenses(prev => prev.map(exp => exp.id === editingId ? { ...exp, ...form as Expense } : exp));
    } else {
      const newEx: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation),
        date: form.date || new Date().toISOString().split('T')[0],
        expenseCode: form.expenseCode || 'EXP-MISC',
        category: form.category || 'General & Admin',
        description: form.description || '',
        amount: Number(form.amount) || 0,
        paymentMethod: (form.paymentMethod as ExpensePaymentMethod) || 'Cash',
        isRecurring: form.isRecurring ?? false,
        frequency: (form.frequency as ExpenseFrequency) || 'As Needed',
      };
      setExpenses(prev => [newEx, ...prev]);
    }
    resetForm();
  };

  // Quick log an expense straight from the recurring catalog
  const handleQuickLogTemplate = (t: ExpenseTemplate) => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation,
      expenseCode: t.code,
      category: t.category,
      description: t.name,
      amount: t.defaultAmount || 0,
      paymentMethod: t.defaultPaymentMethod || 'Cash',
      isRecurring: t.isRecurring,
      frequency: t.frequency,
    });
    setEditingId(null);
    setIsFormOpen(true);
    setActiveTab('log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Template CRUD
  const handleOpenTemplateModal = (template?: ExpenseTemplate) => {
    if (template) {
      setEditingTemplateId(template.id);
      setTemplateForm({ ...template });
    } else {
      setEditingTemplateId(null);
      setTemplateForm({
        code: `EXP-CODE-${Math.floor(10 + Math.random() * 90)}`,
        name: '',
        category: 'Operations',
        defaultAmount: 0,
        frequency: 'Monthly',
        isRecurring: true,
        defaultPaymentMethod: 'Cash',
        notes: '',
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.code || !templateForm.name) return;

    const formattedCode = templateForm.code.trim().toUpperCase();

    if (editingTemplateId) {
      setExpenseTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, ...templateForm, code: formattedCode } as ExpenseTemplate : t));
    } else {
      const newT: ExpenseTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        code: formattedCode,
        name: templateForm.name!.trim(),
        category: templateForm.category || 'Operations',
        defaultAmount: Number(templateForm.defaultAmount) || 0,
        frequency: templateForm.frequency || 'Monthly',
        isRecurring: templateForm.isRecurring ?? true,
        defaultPaymentMethod: templateForm.defaultPaymentMethod || 'Cash',
        notes: templateForm.notes || '',
      };
      setExpenseTemplates(prev => [...prev, newT]);
    }
    setIsTemplateModalOpen(false);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = filteredData.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const mPesa = filteredData
      .filter(e => (e.paymentMethod === 'M-Pesa') || e.category.toLowerCase().includes('m-pesa') || (e.expenseCode || '').toLowerCase().includes('mpesa'))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cash = filteredData
      .filter(e => e.paymentMethod === 'Cash' || (!e.paymentMethod && !e.category.toLowerCase().includes('m-pesa')))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const recurringTotal = filteredData
      .filter(e => e.isRecurring)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // Top recurring code
    const codeCounts: Record<string, number> = {};
    filteredData.forEach(e => {
      const c = e.expenseCode || 'EXP-MISC';
      codeCounts[c] = (codeCounts[c] || 0) + Number(e.amount || 0);
    });
    const sortedCodes = Object.entries(codeCounts).sort((a, b) => b[1] - a[1]);
    const topCode = sortedCodes[0] ? `${sortedCodes[0][0]} (KES ${sortedCodes[0][1].toLocaleString()})` : 'None';

    return { total, mPesa, cash, recurringTotal, topCode };
  }, [filteredData]);

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">Expenses & Recurring Costs</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {activeStation === 'Combined Total' ? 'All Stations' : activeStation}
              </span>
            </div>
            <p className="text-theme-text-muted mt-0.5 text-xs">
              Manage recurring expense parameters like Generator, Lunch, Electricity, Rent, Wages, and operational disbursements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <button 
            onClick={() => handleOpenTemplateModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <Bookmark className="w-4 h-4" /> Manage Expense Codes
          </button>
          
          <Button 
            onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} 
            variant={isFormOpen ? 'secondary' : 'purple'}
            className="flex items-center gap-2"
          >
            {isFormOpen ? <><X className="w-4 h-4" /> Cancel Entry</> : <><Plus className="w-4 h-4" /> Record Expense</>}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border/60 pb-3">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'log'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses Ledger ({filteredData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'recurring'
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Recurring Parameters & Codes ({expenseTemplates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Recurring Cost Analysis</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Expenses" 
          value={`KES ${metrics.total.toLocaleString()}`} 
          icon={Receipt} 
          colorClass="bg-[#122840] text-theme-text-muted" 
        />
        <MetricCard 
          title="M-Pesa Disbursed" 
          value={`KES ${metrics.mPesa.toLocaleString()}`} 
          icon={CreditCard} 
          colorClass="bg-emerald-500/10 text-emerald-400" 
        />
        <MetricCard 
          title="Cash Disbursed" 
          value={`KES ${metrics.cash.toLocaleString()}`} 
          icon={Banknote} 
          colorClass="bg-cyan-500/10 text-cyan-400" 
        />
        <MetricCard 
          title="Recurring Costs" 
          value={`KES ${metrics.recurringTotal.toLocaleString()}`} 
          icon={RefreshCw} 
          colorClass="bg-purple-500/10 text-purple-400" 
        />
      </div>

      {/* EXPENSE LOGGING FORM */}
      {isFormOpen && (
        <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-[#0d1e33]/90 to-slate-950/90 shadow-2xl">
          <CardHeader className="border-b border-theme-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-100">
                    {editingId ? 'Edit Station Expense Record' : 'Record New Station Expense'}
                  </CardTitle>
                  <p className="text-xs text-slate-400">
                    Assign an expense code (e.g. Generator, Lunch, Electricity, Rent) to categorize and track recurring costs.
                  </p>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Quick Template Preset Bar */}
              <div>
                <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Load Recurring Expense Parameter
                </label>
                <div className="flex flex-wrap gap-2">
                  {expenseTemplates.map(tpl => {
                    const meta = getExpenseBadgeMeta(tpl.category, tpl.code);
                    const Icon = meta.icon;
                    const isSelected = form.expenseCode === tpl.code;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplatePreset(tpl.code)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                            : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className="font-mono font-bold">{tpl.code}</span>
                        <span className="text-slate-400">({tpl.name})</span>
                        {tpl.defaultAmount && tpl.defaultAmount > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            KES {tpl.defaultAmount.toLocaleString()}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Date</label>
                  <Input 
                    type="date" 
                    value={form.date} 
                    onChange={e => setForm({ ...form, date: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Station</label>
                  <Select 
                    value={form.station} 
                    onChange={e => setForm({ ...form, station: e.target.value as any })}
                  >
                    {stations.map(s => (
                      <option className="bg-slate-900 text-slate-100" key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">
                    Expense Code <span className="text-cyan-400">*</span>
                  </label>
                  <Input 
                    type="text" 
                    value={form.expenseCode || ''} 
                    onChange={e => setForm({ ...form, expenseCode: e.target.value.toUpperCase() })} 
                    placeholder="e.g. EXP-GEN, EXP-LUNCH, EXP-ELEC" 
                    className="font-mono font-bold uppercase tracking-wider text-cyan-300"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Category / Group</label>
                  <Input 
                    type="text" 
                    value={form.category || ''} 
                    onChange={e => setForm({ ...form, category: e.target.value })} 
                    placeholder="e.g. Utilities, Staff Welfare, Facilities" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">
                    Amount (KES) <span className="text-rose-400">*</span>
                  </label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.amount === 0 ? '' : form.amount} 
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00" 
                    className="font-mono font-bold text-slate-100"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Payment Method</label>
                  <Select 
                    value={form.paymentMethod || 'Cash'} 
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value as ExpensePaymentMethod })}
                  >
                    <option className="bg-slate-900 text-slate-100" value="Cash">Cash on Hand</option>
                    <option className="bg-slate-900 text-slate-100" value="M-Pesa">M-Pesa Paybill / Till</option>
                    <option className="bg-slate-900 text-slate-100" value="Bank Transfer">Bank Transfer / Cheque</option>
                    <option className="bg-slate-900 text-slate-100" value="Other">Other / Credit</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Recurring Frequency</label>
                  <Select 
                    value={form.frequency || 'Monthly'} 
                    onChange={e => setForm({ ...form, frequency: e.target.value as ExpenseFrequency, isRecurring: e.target.value !== 'As Needed' })}
                  >
                    <option className="bg-slate-900 text-slate-100" value="Daily">Daily (e.g. Staff Lunch)</option>
                    <option className="bg-slate-900 text-slate-100" value="Weekly">Weekly (e.g. Generator Fuel)</option>
                    <option className="bg-slate-900 text-slate-100" value="Monthly">Monthly (e.g. Rent, Power, Water)</option>
                    <option className="bg-slate-900 text-slate-100" value="Quarterly">Quarterly (e.g. Licenses)</option>
                    <option className="bg-slate-900 text-slate-100" value="As Needed">As Needed / One-off</option>
                  </Select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                    <input 
                      type="checkbox" 
                      checked={form.isRecurring ?? true} 
                      onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Mark as Recurring Expense</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-muted mb-1.5">Description / Memo / Token Ref</label>
                <Input 
                  type="text" 
                  value={form.description || ''} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="e.g. 50L Diesel for backup generator during power outage / KPLC Token: 4829-1029-4820" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-theme-border/40">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="purple" className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> {editingId ? 'Update Expense Record' : 'Save Expense Record'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: EXPENSES LOG TABLE */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-900/60 border border-theme-border/60 rounded-2xl p-3.5">
            <div className="flex-1 flex items-center gap-2.5 bg-slate-950/80 border border-theme-border/60 rounded-xl px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by code, category, station, description..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Expense Code Filter */}
              <Select 
                value={filterCode} 
                onChange={e => setFilterCode(e.target.value)} 
                className="text-xs py-1.5 px-2.5 bg-slate-950 border-theme-border/60 text-slate-300 w-auto"
              >
                <option value="ALL">All Expense Codes</option>
                {expenseTemplates.map(t => (
                  <option key={t.id} value={t.code}>{t.code} - {t.name}</option>
                ))}
              </Select>

              {/* Recurring Filter */}
              <Select 
                value={filterRecurring} 
                onChange={e => setFilterRecurring(e.target.value as any)} 
                className="text-xs py-1.5 px-2.5 bg-slate-950 border-theme-border/60 text-slate-300 w-auto"
              >
                <option value="ALL">All Recurring & One-Off</option>
                <option value="RECURRING">Recurring Only</option>
                <option value="ONEOFF">One-Off Only</option>
              </Select>

              {/* Payment Filter */}
              <Select 
                value={filterPayment} 
                onChange={e => setFilterPayment(e.target.value)} 
                className="text-xs py-1.5 px-2.5 bg-slate-950 border-theme-border/60 text-slate-300 w-auto"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </Select>
            </div>
          </div>

          {/* Table */}
          <Card>
            <Table>
              <thead>
                <tr className="modern-tr">
                  <Th>Date</Th>
                  <Th>Station</Th>
                  <Th>Expense Code</Th>
                  <Th>Category & Description</Th>
                  <Th>Type & Frequency</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Amount (KES)</Th>
                  <Th className="text-center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  filteredData.reduce((acc, expense) => {
                    const key = expense.expenseCode || 'EXP-MISC';
                    if (!acc[key]) {
                      acc[key] = { ...expense, amount: 0, count: 0, expenses: [] };
                    }
                    acc[key].amount += Number(expense.amount || 0);
                    acc[key].count += 1;
                    acc[key].expenses.push(expense);
                    return acc;
                  }, {} as Record<string, Expense & { count: number, expenses: Expense[] }>)
                ).map(([code, t]) => {
                  const meta = getExpenseBadgeMeta(t.category, t.expenseCode);
                  const CatIcon = meta.icon;
                  
                  return (
                    <tr 
                      key={code} 
                      className="hover:theme-bg-gradient transition-colors cursor-pointer"
                      onClick={() => setIsDetailsModalOpen({ isOpen: true, code })}
                    >
                      <Td className="whitespace-nowrap font-mono text-xs text-slate-300">
                        {t.expenses.map(e => e.date).sort().reverse()[0]} (Latest)
                      </Td>
                      <Td>
                        <span className="text-xs text-theme-text-muted uppercase tracking-tight font-semibold">
                          {t.station}
                        </span>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${meta.badge}`}>
                          <Tag className="w-3 h-3 opacity-70" />
                          {code}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${meta.bg}`}>
                            <CatIcon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 text-xs">
                              {t.category}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {t.count} entries
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {t.isRecurring ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <RefreshCw className="w-3 h-3" />
                            <span>{t.frequency || 'Monthly'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">One-off</span>
                        )}
                      </Td>
                      <Td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          (t.paymentMethod || '').toLowerCase().includes('m-pesa') || (t.paymentMethod || '').toLowerCase().includes('mpesa')
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            : (t.paymentMethod || '').toLowerCase().includes('bank')
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                        }`}>
                          {t.paymentMethod || 'Cash'}
                        </span>
                      </Td>
                      <Td className="text-right font-mono font-bold text-rose-400 text-sm">
                        KES {Number(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}


                {filteredData.length === 0 && (
                  <tr>
                    <Td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <ReceiptText className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-300">No matching expense records found</p>
                        <p className="text-xs text-slate-500 mt-0.5">Click "Record Expense" to add station operational disbursements or recurring costs.</p>
                      </div>
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>

      {/* Details Modal */}
      {isDetailsModalOpen.isOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto bg-slate-900 border-theme-border">
            <CardHeader className="flex flex-row justify-between items-center border-b border-theme-border/60 pb-4">
              <CardTitle className="text-lg font-bold">Expenses for {isDetailsModalOpen.code}</CardTitle>
              <Button variant="secondary" onClick={() => setIsDetailsModalOpen({ isOpen: false, code: null })}>Close</Button>
            </CardHeader>
            <CardContent className="p-4">
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th className="text-right">Amount (KES)</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData
                    .filter(e => e.expenseCode === isDetailsModalOpen.code)
                    .sort((a,b) => b.date.localeCompare(a.date))
                    .map(e => (
                      <tr key={e.id}>
                        <Td>{e.date}</Td>
                        <Td>{e.description}</Td>
                        <Td className="text-right">KES {e.amount.toLocaleString()}</Td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
        </div>
      )}

      {/* TAB 2: RECURRING EXPENSE PARAMETERS & CODES CATALOG */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4">
            <div>
              <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-400" />
                Master Recurring Expense Parameters
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Standard preset codes (Generator, Lunch, Electricity, Rent, Wages, etc.) used across daily entries and forecasting.
              </p>
            </div>
            <Button 
              onClick={() => handleOpenTemplateModal()} 
              variant="purple" 
              className="flex items-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4" /> Add Custom Expense Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseTemplates.map(tpl => {
              const meta = getExpenseBadgeMeta(tpl.category, tpl.code);
              const Icon = meta.icon;
              
              // Count logged expenses with this code
              const count = expenses.filter(e => e.expenseCode === tpl.code).length;
              const totalSpent = expenses.filter(e => e.expenseCode === tpl.code).reduce((sum, e) => sum + (e.amount || 0), 0);

              return (
                <div 
                  key={tpl.id}
                  className="rounded-2xl border border-theme-border/60 bg-slate-900/60 p-5 space-y-4 hover:border-purple-500/40 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.bg}`}>
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-cyan-300">{tpl.code}</span>
                            {tpl.isRecurring && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                                {tpl.frequency}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-100 text-sm mt-0.5">{tpl.name}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button 
                          onClick={() => handleOpenTemplateModal(tpl)}
                          className="p-1 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                          title="Edit Code Parameter"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {tpl.notes || `${tpl.category} expense for forecourt operations.`}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-theme-border/40 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Default Budget</span>
                        <span className="font-mono font-bold text-slate-200">
                          KES {Number(tpl.defaultAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Default Payment</span>
                        <span className="font-semibold text-emerald-400">
                          {tpl.defaultPaymentMethod || 'Cash'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-2 rounded-xl border border-theme-border/40">
                      <span className="text-slate-400">Logged ({count} entries):</span>
                      <span className="font-mono font-bold text-rose-400">KES {totalSpent.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickLogTemplate(tpl)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.1)] active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Expense for Today
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RECURRING COST ANALYSIS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Recurring vs One-Off</h4>
                  <p className="text-xs text-slate-400">Proportion of operational overhead</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-purple-300">Recurring Overhead</span>
                    <span className="text-slate-200 font-mono">
                      KES {metrics.recurringTotal.toLocaleString()} ({metrics.total > 0 ? Math.round((metrics.recurringTotal / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.total > 0 ? Math.min(100, (metrics.recurringTotal / metrics.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">One-Off Disbursements</span>
                    <span className="text-slate-200 font-mono">
                      KES {(metrics.total - metrics.recurringTotal).toLocaleString()} ({metrics.total > 0 ? Math.round(((metrics.total - metrics.recurringTotal) / metrics.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.total > 0 ? Math.min(100, ((metrics.total - metrics.recurringTotal) / metrics.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Disbursement Channels</h4>
                  <p className="text-xs text-slate-400">Payment methods used</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-theme-border/40">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Cash On Hand:
                  </span>
                  <span className="font-mono font-bold text-cyan-400">KES {metrics.cash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-theme-border/40">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> M-Pesa Disbursed:
                  </span>
                  <span className="font-mono font-bold text-emerald-400">KES {metrics.mPesa.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span> Bank / Cheque:
                  </span>
                  <span className="font-mono font-bold text-blue-400">
                    KES {(metrics.total - metrics.cash - metrics.mPesa > 0 ? metrics.total - metrics.cash - metrics.mPesa : 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Key Recurring Parameters</h4>
                  <p className="text-xs text-slate-400">Top cost drivers</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                {expenseTemplates.slice(0, 4).map(tpl => {
                  const spent = expenses.filter(e => e.expenseCode === tpl.code).reduce((sum, e) => sum + (e.amount || 0), 0);
                  return (
                    <div key={tpl.id} className="flex justify-between items-center py-1 border-b border-theme-border/30">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-300">{tpl.code}</span>
                        <span className="text-slate-400 truncate max-w-[120px]">{tpl.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-rose-400">KES {spent.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EXPENSE CODE TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Bookmark className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">
                  {editingTemplateId ? 'Edit Expense Parameter Code' : 'Create Recurring Expense Parameter'}
                </h3>
              </div>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">
                    Expense Code <span className="text-purple-400">*</span>
                  </label>
                  <Input 
                    type="text" 
                    value={templateForm.code || ''} 
                    onChange={e => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })} 
                    placeholder="e.g. EXP-GEN, EXP-RENT" 
                    className="font-mono font-bold uppercase tracking-wider text-purple-300"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">
                    Parameter Name <span className="text-purple-400">*</span>
                  </label>
                  <Input 
                    type="text" 
                    value={templateForm.name || ''} 
                    onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} 
                    placeholder="e.g. Generator Fuel & Servicing" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">Category / Department</label>
                  <Input 
                    type="text" 
                    value={templateForm.category || ''} 
                    onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })} 
                    placeholder="e.g. Operations, Utilities, Rent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">Default Estimated Budget (KES)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={templateForm.defaultAmount === 0 ? '' : templateForm.defaultAmount} 
                    onChange={e => setTemplateForm({ ...templateForm, defaultAmount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00" 
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">Recurrence Frequency</label>
                  <Select 
                    value={templateForm.frequency || 'Monthly'} 
                    onChange={e => setTemplateForm({ ...templateForm, frequency: e.target.value as ExpenseFrequency })}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="As Needed">As Needed / One-off</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-text-muted mb-1">Default Payment Channel</label>
                  <Select 
                    value={templateForm.defaultPaymentMethod || 'Cash'} 
                    onChange={e => setTemplateForm({ ...templateForm, defaultPaymentMethod: e.target.value as ExpensePaymentMethod })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-muted mb-1">Notes / Description</label>
                <Input 
                  type="text" 
                  value={templateForm.notes || ''} 
                  onChange={e => setTemplateForm({ ...templateForm, notes: e.target.value })} 
                  placeholder="e.g. Diesel supply and quarterly engine oil service" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-theme-border/40">
                <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="purple" className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> {editingTemplateId ? 'Update Parameter' : 'Save Parameter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
