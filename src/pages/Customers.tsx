import React, { useState, useEffect, useMemo } from 'react';
import { useCustomers, createCustomer, deleteCustomer, updateCustomer, createAdjustment, useDeliveries, usePayments, useAdjustments, recalculateCustomerBalance, useCustomerStations, createCustomerStation, updateCustomerStation, deleteCustomerStation } from '../lib/db';
import { formatCurrency, parseDateToTimestamp } from '../lib/utils';
import { Search, Plus, Trash2, Pencil, AlertTriangle, X, ArrowUpDown, Eye, Truck, Download, RefreshCw, Check, MapPin, Users, Fuel, Coins, TrendingUp, Scale } from 'lucide-react';
import { Customer, CustomerStation } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useAuth } from '../lib/auth';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface CustomersProps {
  onViewCustomer?: (id: string) => void;
  onNavigate?: (page: string) => void;
  initialAction?: string;
  initialFilter?: string;
}

export default function Customers({ onViewCustomer, onNavigate, initialAction, initialFilter }: CustomersProps = {}) {
  const { customers, loading: customersLoading } = useCustomers();
  const { deliveries, loading: deliveriesLoading } = useDeliveries();
  const { payments, loading: paymentsLoading } = usePayments();
  const { adjustments, loading: adjustmentsLoading } = useAdjustments();
  const { stations: allCustomerStations } = useCustomerStations();
  const loading = customersLoading || deliveriesLoading || paymentsLoading || adjustmentsLoading;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'credit_risk'>(initialFilter === 'debtors' ? 'credit_risk' : 'all');
  const [isAdding, setIsAdding] = useState(initialAction === 'add');

  useEffect(() => {
    if (initialAction === 'add') {
      setIsAdding(true);
    }
  }, [initialAction]);

  useEffect(() => {
    if (initialFilter === 'debtors') {
      setStatusFilter('credit_risk');
    }
  }, [initialFilter]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [adjustingCustomer, setAdjustingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getCustomerBalance = (c: Customer) => {
    let bal = c.openingBalance 
      ? (c.openingBalanceType === 'advance' ? -c.openingBalance : c.openingBalance) 
      : 0;
    
    // Add all deliveries
    const cDeliveries = deliveries.filter(d => d.customerId === c.id);
    cDeliveries.forEach(d => { bal += (d.totalAmount || 0); });
    
    // Subtract all payments
    const cPayments = payments.filter(p => p.customerId === c.id);
    cPayments.forEach(p => { bal -= (p.amount || 0); });
    
    // Adjust for adjustments
    const cAdjustments = adjustments.filter(a => a.customerId === c.id);
    cAdjustments.forEach(a => {
      bal += (a.type === 'debit' ? (a.amount || 0) : -(a.amount || 0));
    });
    
    return bal;
  };

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

  // Combined KPI across ALL customers: outstanding, deliveries (KES + litres),
  // received, and internal profit (retroactive station/customer margin rule).
  const allCustomersKpi = useMemo(() => {
    const stationsByCustomer = new Map<string, CustomerStation[]>();
    for (const s of allCustomerStations) {
      const arr = stationsByCustomer.get(s.customerId) || [];
      arr.push(s);
      stationsByCustomer.set(s.customerId, arr);
    }
    let litres = 0, sales = 0, received = 0, profit = 0, outstanding = 0, riskCount = 0;
    for (const c of customers) {
      outstanding += getCustomerBalance(c);
      if (c.status === 'credit_risk') riskCount++;
    }
    for (const d of deliveries) {
      litres += d.litres || 0;
      sales += d.totalAmount || 0;
      const sts = stationsByCustomer.get(d.customerId);
      const st = sts?.find(s => s.id === d.stationId);
      let margin = 0;
      if (st) margin = st.profitMargin || 0;
      else if (sts?.length === 1) margin = sts[0].profitMargin || 0;
      else margin = customers.find(c => c.id === d.customerId)?.profitMargin ?? 0;
      profit += (d.litres || 0) * margin;
    }
    for (const p of payments) received += p.amount || 0;
    return { litres, sales, received, profit, outstanding, riskCount, count: customers.length };
  }, [customers, deliveries, payments, adjustments, allCustomerStations]);

  // Delivery litres exist under two storage conventions: current records store
  // split halves ×1000, older records stored raw litres. Detect per record:
  // whichever reading yields a plausible fuel rate (KES 10–5,000 / litre) wins.
  const plausibleLitres = (stored: number, amount: number, preferThousand: boolean): number => {
    if (!(stored > 0)) return 0;
    const asThousand = amount / (stored / 1000);
    const asRaw = amount / stored;
    const ok = (r: number) => r >= 10 && r <= 10000;
    if (ok(asThousand)) return stored / 1000;
    if (ok(asRaw)) return stored;
    return preferThousand ? stored / 1000 : stored;
  };

  // Combined daily fuel rate across ALL customers: total delivery debit (KES) ÷ litres
  // delivered that day, per product. Same rules as the customer-profile KPI:
  // AGO = Diesel, PMS = Super/Petrol, splits feed both lines, LPG/lubricants excluded.
  const combinedRateData = useMemo(() => {
    interface DayPoint { key: string; label: string; sortKey: string; agoAmount: number; agoLitres: number; pmsAmount: number; pmsLitres: number; }
    const byDay = new Map<string, DayPoint>();
    for (const d of deliveries) {
      const hasSplit = !!(d.superLitres || d.dieselLitres);
      if (!d.date || (!(d.litres > 0) && !hasSplit)) continue;
      const pt = String(d.productType || '');
      const low = pt.toLowerCase();
      if (low.includes('lpg') || low.includes('lubricant')) continue;
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      let entry = byDay.get(key);
      if (!entry) {
        entry = {
          key,
          label: `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`,
          sortKey: key,
          agoAmount: 0, agoLitres: 0, pmsAmount: 0, pmsLitres: 0
        };
        byDay.set(key, entry);
      }
      if (pt === 'Super/Diesel Split') {
        // Split litres are stored ×1000 in current records, raw in older ones
        entry.agoLitres += plausibleLitres(d.dieselLitres || 0, d.dieselAmount || 0, true);
        entry.agoAmount += d.dieselAmount || 0;
        entry.pmsLitres += plausibleLitres(d.superLitres || 0, d.superAmount || 0, true);
        entry.pmsAmount += d.superAmount || 0;
      } else if (low.includes('diesel')) {
        entry.agoLitres += plausibleLitres(d.litres || 0, d.totalAmount || 0, false);
        entry.agoAmount += d.totalAmount || 0;
      } else if (low.includes('super')) {
        entry.pmsLitres += plausibleLitres(d.litres || 0, d.totalAmount || 0, false);
        entry.pmsAmount += d.totalAmount || 0;
      }
    }
    return Array.from(byDay.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      // Only days where a fuel was actually delivered with a real debit count;
      // deliveries with litres but no amount (or unmatched products) are skipped
      .filter(e => (e.agoLitres > 0 && e.agoAmount > 0) || (e.pmsLitres > 0 && e.pmsAmount > 0))
      .map(e => ({
        label: e.label,
        AGO: e.agoLitres > 0 && e.agoAmount > 0 ? Number((e.agoAmount / e.agoLitres).toFixed(2)) : null,
        PMS: e.pmsLitres > 0 && e.pmsAmount > 0 ? Number((e.pmsAmount / e.pmsLitres).toFixed(2)) : null
      }));
  }, [deliveries]);

  // Rate of change: latest combined rate vs the previous delivery of that product
  const rateChange = useMemo(() => {
    const series = (key: 'AGO' | 'PMS') =>
      combinedRateData.map(r => r[key]).filter((v): v is number => v != null);
    const agoVals = series('AGO');
    const pmsVals = series('PMS');
    return {
      agoLatest: agoVals.length ? agoVals[agoVals.length - 1] : null,
      agoChange: agoVals.length >= 2 ? Number((agoVals[agoVals.length - 1] - agoVals[agoVals.length - 2]).toFixed(2)) : null,
      pmsLatest: pmsVals.length ? pmsVals[pmsVals.length - 1] : null,
      pmsChange: pmsVals.length >= 2 ? Number((pmsVals[pmsVals.length - 1] - pmsVals[pmsVals.length - 2]).toFixed(2)) : null
    };
  }, [combinedRateData]);

  // Automated background self-healing balance synchronization
  useEffect(() => {
    if (loading || customers.length === 0) return;

    const syncStaleBalances = async () => {
      for (const c of customers) {
        const computed = Math.round(getCustomerBalance(c) * 100) / 100;
        const stored = Math.round((c.balance || 0) * 100) / 100;
        if (stored !== computed) {
          console.log(`Self-healing balance for ${c.name}: Stored=${c.balance}, Computed=${computed}`);
          try {
            await updateCustomer(c.id, { balance: computed });
          } catch (e) {
            console.error(`Failed to self-heal balance for ${c.name}`, e);
          }
        }
      }
    };

    syncStaleBalances();
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
        ProfitMargin: c.profitMargin || 0,
        Balance: getCustomerBalance(c),
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-sky-400" />
          <input 
            type="text" 
            placeholder="Search by ID or name..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-theme-border dark:border-theme-border rounded-lg text-base text-gray-950 dark:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors placeholder:text-gray-400"
          />
        </div>
        <div className="w-full sm:w-48">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-base text-emerald-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer dropdown-green"
          >
            <option value="all" className="bg-[#08080C] text-gray-100">All Statuses</option>
            <option value="active" className="bg-[#08080C] text-emerald-400">Active</option>
            <option value="credit_risk" className="bg-[#08080C] text-indigo-300">Credit Risk</option>
          </select>
        </div>
        <button 
          onClick={exportCustomers}
          className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-base font-semibold flex items-center gap-2 transition-colors cursor-pointer hover:border-emerald-400"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(0,230,118,0.2)] rounded-lg text-base font-semibold flex items-center gap-2 transition-colors cursor-pointer"
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

      {/* Combined KPI across all customers */}
      <div className="glass-panel border border-theme-border rounded-xl p-4 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-theme-text tracking-tight">All Customers Combined</h3>
            <p className="text-[11px] text-theme-text-muted">Portfolio-wide totals across every customer on the books</p>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-lg shadow-sm">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">{allCustomersKpi.count} Customers</span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Outstanding Balance</span>
            </div>
            <div className="text-lg font-black text-indigo-300">Ksh {allCustomersKpi.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">{allCustomersKpi.riskCount} credit risk customer{allCustomersKpi.riskCount === 1 ? '' : 's'}</div>
          </div>
          <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Fuel className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Total Deliveries</span>
            </div>
            <div className="text-lg font-black text-theme-text">Ksh {allCustomersKpi.sales.toLocaleString('en-US')}</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">{allCustomersKpi.litres.toLocaleString('en-US')} L dispensed</div>
          </div>
          <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Total Received</span>
            </div>
            <div className="text-lg font-black text-emerald-300">Ksh {allCustomersKpi.received.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">Settled via till &amp; bank</div>
          </div>
          <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Profit Generated</span>
            </div>
            <div className="text-lg font-black text-emerald-300">Ksh {allCustomersKpi.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-theme-text-muted mt-0.5">Litres × station margin — internal only</div>
          </div>
        </div>
      </div>

      {/* Combined fuel rate of change across all customers */}
      <div className="glass-panel border border-theme-border rounded-xl p-4 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-theme-text tracking-tight">Combined Fuel Rate — All Customers</h3>
            <p className="text-[11px] text-theme-text-muted">Daily delivery debit ÷ litres across every customer, per product</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">AGO</span>
              <span className="text-[11px] font-black text-theme-text">
                {rateChange.agoLatest != null ? `K${rateChange.agoLatest.toFixed(2)}/L` : '—'}
              </span>
              {rateChange.agoChange != null && (
                <span className={`text-[10px] font-bold ${rateChange.agoChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {rateChange.agoChange > 0 ? '▲' : '▼'} K{Math.abs(rateChange.agoChange).toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">PMS</span>
              <span className="text-[11px] font-black text-theme-text">
                {rateChange.pmsLatest != null ? `K${rateChange.pmsLatest.toFixed(2)}/L` : '—'}
              </span>
              {rateChange.pmsChange != null && (
                <span className={`text-[10px] font-bold ${rateChange.pmsChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {rateChange.pmsChange > 0 ? '▲' : '▼'} K{Math.abs(rateChange.pmsChange).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-72 w-full relative overflow-hidden">
          {combinedRateData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
              No fuel deliveries recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={combinedRateData} margin={{ top: 22, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="label" fontSize={11} stroke="#94A3B8" tickLine={false} minTickGap={24} />
                <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={(v) => `K${Math.round(v)}`} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(val: any, name: any) => [`KES ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / L`, `${name} Rate`]}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    zIndex: 100
                  }}
                />
                <Legend verticalAlign="top" height={24} iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="AGO" stroke="#00E676" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeOpacity={0.95} />
                <Line type="monotone" dataKey="PMS" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeOpacity={0.95} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-panel border border-theme-border rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="glass-panel border-b border-theme-border transition-colors">
              <tr className="modern-tr">
                <th className="modern-th">ID</th>
                <th className="modern-th">Name</th>
                <th className="modern-th">Limit</th>
                <th className="modern-th">Opening Bal</th>
                <th className="modern-th">Closing Balance</th>
                <th className="modern-th">Total Purchases</th>
                <th className="modern-th">Margin (KES/L)</th>
                <th className="modern-th">Status</th>
                <th className="modern-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {loading ? (
                <tr className="modern-tr">
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-base">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="modern-tr">
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-base">
                    No customers found.
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/5 dark:hover:bg-sky-950/20 transition-colors">
                  <td className="modern-td">{c.customerId}</td>
                  <td className="modern-td">
                    {onViewCustomer ? (
                      <button 
                        onClick={() => onViewCustomer(c.id)}
                        className="hover:underline text-[#4338CA] hover:text-indigo-300 font-bold cursor-pointer text-left focus:outline-none"
                      >
                        {c.name}
                      </button>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="modern-td">{formatCurrency(c.creditLimit)}</td>
                  <td className="modern-td">
                    <span className={c.openingBalanceType === 'advance' ? '!text-[#059669] font-bold' : (c.openingBalance || 0) > 0 ? '!text-[#4338CA] font-semibold' : 'text-gray-400'}>
                      {c.openingBalanceType === 'advance' ? '-' : ''}{formatCurrency(c.openingBalance || 0)}
                    </span>
                    {c.openingBalanceType === 'advance' && (
                      <span className="block text-[10px] uppercase tracking-wider font-extrabold text-[#059669] mt-0.5">Advance</span>
                    )}
                  </td>
                  {(() => {
                    const dynamicBalance = getCustomerBalance(c);
                    return (
                      <td className={`px-6 py-4 text-base font-mono font-bold text-right ${
                        dynamicBalance > 0 
                          ? '!text-[#4338CA]' 
                          : dynamicBalance < 0 
                            ? '!text-[#059669] font-bold' 
                            : '!text-gray-300'
                      }`}>
                        {formatCurrency(dynamicBalance)}
                        {dynamicBalance < 0 && (
                          <span className="block text-[10px] uppercase tracking-wider font-extrabold !text-[#059669] mt-0.5">Advance Balance</span>
                        )}
                      </td>
                    );
                  })()}
                  <td className="modern-td text-slate-200 font-mono">{formatCurrency(c.totalPurchases)}</td>
                  <td className="modern-td font-mono">
                    {(c.profitMargin || 0) > 0 ? (
                      <span className="!text-[#059669] font-bold">{(c.profitMargin || 0).toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="modern-td">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                      c.status === 'active' 
                        ? 'rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'rounded-md bg-[#4338CA]/15 text-[#4338CA] border border-[#4338CA]/30'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="modern-td">
                    <div className="flex justify-end gap-2">
                      {onViewCustomer && (
                        <button 
                          onClick={() => onViewCustomer(c.id)}
                          className="p-2 text-gray-400 hover:text-[#4338CA] hover:bg-[#4338CA]/15 transition-colors rounded-md cursor-pointer"
                          title="View Customer Dashboard"
                          id={`btn-view-${c.id}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => setAdjustingCustomer(c)}
                        className="p-2 text-gray-400 hover:text-[#4338CA] hover:bg-[#4338CA]/15 transition-colors rounded-md cursor-pointer"
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
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-500/10 transition-colors rounded-md"
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
    profitMargin: '',
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
        profitMargin: Number(form.profitMargin) || 0,
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
    <div className="fixed inset-0 bg-black/45  flex items-center justify-center p-4 z-50">
      <div className="bg-[#0E0E12] rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-theme-border flex justify-between items-center bg-sky-500/5 dark:bg-sky-500/5">
            <h3 className="text-xl font-bold text-sky-300">Add New Customer</h3>
            <button 
              type="button" 
              onClick={onClose}
              className="text-sky-400 hover:text-sky-300 p-1 rounded-md transition-colors cursor-pointer"
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
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Customer ID *</label>
              <input 
                type="text" 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="E.g. CUST-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Customer Name *</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="E.g. Acme Logistics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-sky-300 mb-1.5">Credit Limit (KES) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.creditLimit}
                  onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-sky-300 mb-1.5">Opening Balance *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.openingBalance}
                  onChange={e => setForm({...form, openingBalance: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Opening Balance Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'arrears'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'arrears'
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-bold'
                      : 'border-theme-border dark:border-theme-border text-sky-400 dark:text-sky-300 hover:bg-sky-500/5 glass-panel'
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
                      : 'border-theme-border dark:border-theme-border text-sky-400 dark:text-sky-300 hover:bg-sky-500/5 glass-panel'
                  }`}
                >
                  Advance (Credit)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Profit Margin (KES per Litre)</label>
              <input
                type="number"
                step="0.01"
                value={form.profitMargin}
                onChange={e => setForm({...form, profitMargin: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="e.g. 15"
              />
              <p className="text-xs text-gray-500 mt-1">Applied to all of this customer's deliveries (dated back): litres × margin.</p>
            </div>
          </div>
          <div className="px-6 py-4 bg-sky-500/5 dark:bg-sky-500/5 border-t border-theme-border flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] rounded-lg text-sm font-semibold transition-colors cursor-pointer"
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
    profitMargin: customer.profitMargin?.toString() || '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-customer filling stations (each with its own profit margin)
  const { stations: allStations } = useCustomerStations();
  const stations = allStations
    .filter(s => s.customerId === customer.id)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const [newStationName, setNewStationName] = useState('');
  const [newStationLocation, setNewStationLocation] = useState('');
  const [newStationMargin, setNewStationMargin] = useState('');
  const [stationError, setStationError] = useState<string | null>(null);
  const [stationBusy, setStationBusy] = useState(false);

  const handleAddStation = async () => {
    const trimmed = newStationName.trim();
    if (!trimmed) {
      setStationError('Station name is required.');
      return;
    }
    if (stations.some(s => (s.name || '').trim().toLowerCase() === trimmed.toLowerCase())) {
      setStationError(`Station "${trimmed}" already exists for this customer.`);
      return;
    }
    setStationBusy(true);
    setStationError(null);
    try {
      await createCustomerStation({
        customerId: customer.id,
        name: trimmed,
        location: newStationLocation.trim(),
        profitMargin: Number(newStationMargin) || 0,
      });
      setNewStationName('');
      setNewStationLocation('');
      setNewStationMargin('');
    } catch (err) {
      console.error(err);
      setStationError('Failed to add station. Please try again.');
    } finally {
      setStationBusy(false);
    }
  };

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
        profitMargin: Number(form.profitMargin) || 0,
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
    <div className="fixed inset-0 bg-black/45  flex items-center justify-center p-4 z-50">
      <div className="bg-[#0E0E12] rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transition-colors">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-theme-border flex justify-between items-center bg-sky-500/5 dark:bg-sky-500/5">
            <h3 className="text-xl font-bold text-sky-300">Edit Customer Information</h3>
            <button 
              type="button" 
              onClick={onClose}
              className="text-sky-400 hover:text-sky-300 p-1 rounded-md transition-colors cursor-pointer"
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
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Customer ID *</label>
              <input 
                type="text" 
                required
                value={form.customerId}
                onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="E.g. CUST-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Customer Name *</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="E.g. Acme Logistics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-sky-300 mb-1.5">Credit Limit (KES) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.creditLimit}
                  onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-sky-300 mb-1.5">Opening Balance *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={form.openingBalance}
                  onChange={e => setForm({...form, openingBalance: e.target.value})}
                  className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Opening Balance Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, openingBalanceType: 'arrears'})}
                  className={`px-3 py-2.5 border rounded-lg text-sm font-semibold text-center transition-colors shadow-sm cursor-pointer ${
                    form.openingBalanceType === 'arrears'
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-bold'
                      : 'border-theme-border dark:border-theme-border text-sky-400 dark:text-sky-300 hover:bg-sky-500/5 glass-panel'
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
                      : 'border-theme-border dark:border-theme-border text-sky-400 dark:text-sky-300 hover:bg-sky-500/5 glass-panel'
                  }`}
                >
                  Advance (Credit)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Profit Margin (KES per Litre)</label>
              <input
                type="number"
                step="0.01"
                value={form.profitMargin}
                onChange={e => setForm({...form, profitMargin: e.target.value})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:border-theme-border focus:ring-1 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base shadow-sm"
                placeholder="e.g. 15"
              />
              <p className="text-xs text-gray-500 mt-1">Applied to all of this customer's deliveries (dated back): litres × margin.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sky-300 mb-1.5">Status *</label>
              <select 
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value as 'active' | 'credit_risk'})}
                className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-theme-text dark:text-sky-100 text-base font-semibold cursor-pointer shadow-sm"
              >
                <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="active">Active</option>
                <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="credit_risk">Credit Risk</option>
              </select>
            </div>

            {/* Filling Stations manager */}
            <div className="border border-theme-border dark:border-theme-border rounded-lg p-3 space-y-2.5 bg-sky-500/[0.02]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-sky-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Filling Stations
                </label>
                <span className="text-[10px] text-gray-500 font-bold">{stations.length} station{stations.length === 1 ? '' : 's'}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Add one or more stations for this customer, each with its own profit margin (KES per litre). Stations appear in the delivery form's station dropdown; profit is calculated in the background as litres × margin.
              </p>
              {stationError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg px-2.5 py-1.5">{stationError}</div>
              )}
              {stations.length > 0 && (
                <div className="space-y-1.5">
                  {stations.map(st => (
                    <StationRow key={st.id} station={st} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStationName}
                  onChange={e => setNewStationName(e.target.value)}
                  placeholder="Station name e.g. Pako Filling Station"
                  className="flex-1 min-w-0 px-2.5 py-2 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-theme-text dark:text-sky-100 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddStation}
                  disabled={stationBusy}
                  className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Add station"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStationLocation}
                  onChange={e => setNewStationLocation(e.target.value)}
                  placeholder="Location e.g. Kitale"
                  className="flex-1 min-w-0 px-2.5 py-2 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-theme-text dark:text-sky-100 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newStationMargin}
                  onChange={e => setNewStationMargin(e.target.value)}
                  placeholder="Profit margin KES/L"
                  className="w-32 px-2.5 py-2 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-theme-text dark:text-sky-100 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-sky-500/5 dark:bg-sky-500/5 border-t border-theme-border flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StationRowProps {
  station: CustomerStation;
}

/** Editable row for one filling station of a customer (name, location, profit margin; save & delete). */
function StationRow({ station }: StationRowProps) {
  const [name, setName] = useState(station.name || '');
  const [location, setLocation] = useState(station.location || '');
  const [margin, setMargin] = useState(station.profitMargin != null ? String(station.profitMargin) : '');
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const dirty =
    name.trim() !== (station.name || '') ||
    location.trim() !== (station.location || '') ||
    Number(margin) !== (station.profitMargin || 0);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setRowError('Station name is required.');
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      await updateCustomerStation(station.id, {
        name: trimmed,
        location: location.trim(),
        profitMargin: Number(margin) || 0,
      });
    } catch (err) {
      console.error(err);
      setRowError('Failed to save station.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove station "${station.name}" from this customer?`)) return;
    setBusy(true);
    try {
      await deleteCustomerStation(station.id);
    } catch (err) {
      console.error(err);
      setRowError('Failed to delete station.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="bg-sky-500/[0.04] border border-theme-border dark:border-theme-border rounded-lg px-2 py-1.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-1 bg-transparent border-b border-transparent focus:border-sky-500 text-sky-100 text-sm font-semibold focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !dirty}
            className={`p-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              dirty
                ? 'text-emerald-400 hover:bg-emerald-500/15'
                : 'text-gray-600 cursor-default'
            } disabled:opacity-40`}
            title={dirty ? 'Save station changes' : 'Saved'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            title="Delete station"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 pl-6">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location e.g. Kitale"
            className="flex-1 min-w-0 px-1.5 py-1 bg-transparent border-b border-transparent focus:border-sky-500 text-sky-200 text-xs focus:outline-none"
          />
          <input
            type="number"
            step="0.01"
            value={margin}
            onChange={e => setMargin(e.target.value)}
            title="Profit margin (KES per litre)"
            className="w-24 px-1.5 py-1 bg-transparent border-b border-transparent focus:border-sky-500 text-sky-100 text-sm font-mono text-right focus:outline-none"
          />
        </div>
      </div>
      {rowError && <p className="text-[11px] text-red-500 pl-2">{rowError}</p>}
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
    <div className="fixed inset-0 bg-black/60  flex items-center justify-center p-4 z-50">
      <div className="glass-panel rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden">
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
        date: parseDateToTimestamp(date),
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
    <div className="fixed inset-0 bg-black/60  flex items-center justify-center p-4 z-50 animate-fade-in" id="adjust-balance-modal">
      <div className="bg-[#0E0E12] rounded-xl shadow-2xl border border-theme-border w-full max-w-sm overflow-hidden transform transition-all duration-300">
        <div className="px-6 py-4 border-b border-theme-border bg-[#000000] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Adjust Customer Balance</h3>
            <p className="text-xs text-theme-text-muted font-medium pb-1">Customer: {customer.name} ({customer.customerId})</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
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
            <label className="block text-sm font-semibold text-white mb-1.5">Current Balance</label>
            <div className={`px-4 py-2 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base font-mono font-bold shadow-sm ${
              customer.balance > 0 ? 'text-[#4338CA]' : customer.balance < 0 ? 'text-emerald-400' : 'text-gray-300'
            }`}>
              {formatCurrency(customer.balance)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-2 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'credit'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-white/10 text-gray-400 bg-white/[0.03] hover:text-white'
                }`}
              >
                Credit (-)
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-2 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'debit'
                    ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#6366F1]'
                    : 'border-white/10 text-gray-400 bg-white/[0.03] hover:text-white'
                }`}
              >
                Debit (+)
              </button>
            </div>
            <p className="mt-1 text-xs text-theme-text-muted italic">
              {type === 'credit' 
                ? 'Credits deduct from outstanding balance (e.g., discounts, waivers, payment adjustments).' 
                : 'Debits add to outstanding balance (e.g., surcharges, handling fees).'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Adjustment Date *</label>
            <input
              type="date"
              required
              className="w-full px-4 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-1.5 transition-colors ${type === 'credit' ? 'text-emerald-400' : 'text-[#6366F1]'}`}>
              Adjustment Amount (KES) * {type === 'credit' ? '(Credit - Deduct)' : '(Debit - Add)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className={`w-full px-4 py-2.5 bg-[#000000] rounded-lg text-base font-mono font-bold outline-none transition-all border ${
                type === 'credit'
                  ? 'text-emerald-400 border-emerald-500/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/50'
                  : 'text-[#6366F1] border-[#6366F1]/50 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50'
              }`}
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Reason / Description</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-500 resize-none shadow-sm"
              placeholder="E.g., Special weekend delivery fee waiver..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-theme-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                type === 'credit'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : 'bg-[#4338CA] hover:bg-[#4338CA]/90 text-white'
              }`}
            >
              {loading ? 'Processing...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
