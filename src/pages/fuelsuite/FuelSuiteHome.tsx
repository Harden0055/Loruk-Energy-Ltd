/**
 * FuelSuite — Main dashboard: headline KPIs (today, this month, money position),
 * graphs for fuel litres and money flow, quick actions and status panels.
 */
import React, { useMemo } from 'react';
import {
  LayoutGrid, ClipboardList, ShoppingCart, ShoppingBag, Receipt, HandCoins,
  Banknote, MapPinned, Package, Fuel, TrendingUp, TrendingDown, Wallet,
  ChevronRight, AlertTriangle, CalendarDays, Coins,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useAuth } from '../../lib/auth';
import {
  useFuelDailyRecords, useFuelProducts, useFuelPurchases,
  useFuelProductSales, useFuelExpenses, useFuelCreditCustomers, useFuelPayments,
} from '../../lib/fuelDb';
import { useFuelStationScope } from './fuelStationContext';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, ksh, fmtQty, fmtDate, todayKey, dateKeyOf,
  meterSold,
} from './fuelShared';

interface FuelSuiteHomeProps {
  onNavigate: (page: string, action?: string) => void;
}

const QUICK_ACTIONS: Array<{
  page: string;
  action?: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { page: 'fuelDaily', label: 'New Daily Fuel Record', desc: 'AGO & PMS machine readings', icon: ClipboardList, tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.07]' },
  { page: 'fuelSales', action: 'addSale', label: 'Record Product Sale', desc: 'Cylinders, burners, grills', icon: ShoppingCart, tone: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.07]' },
  { page: 'fuelProfit', label: 'LPG & Accessories Profit', desc: 'Margins, cost & profit', icon: Coins, tone: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.07]' },
  { page: 'fuelPurchases', action: 'addPurchase', label: 'Add Purchase', desc: 'Stock bought from supplier', icon: ShoppingBag, tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.07]' },
  { page: 'fuelExpenses', action: 'addExpense', label: 'Add Expense', desc: 'Operational spending', icon: Receipt, tone: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.07]' },
  { page: 'fuelDebts', action: 'addCreditCustomer', label: 'Add Credit Customer', desc: 'Limits & balances', icon: HandCoins, tone: 'text-amber-400 border-amber-500/30 bg-amber-500/[0.07]' },
  { page: 'fuelPaidDebts', action: 'recordRepayment', label: 'Record Debt Repayment', desc: 'Partial payments welcome', icon: Banknote, tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.07]' },
  { page: 'fuelSetup', action: 'addStation', label: 'Add Station or Salesperson', desc: 'Stations & staff', icon: MapPinned, tone: 'text-violet-400 border-violet-500/30 bg-violet-500/[0.07]' },
  { page: 'fuelProducts', action: 'addProduct', label: 'Add Product or Update Prices', desc: 'Buying & selling prices', icon: Package, tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.07]' },
];

const diffTone = (d: number): 'green' | 'red' | 'violet' =>
  d < 0 ? 'red' : Math.abs(d) > 1000 ? 'violet' : 'green';

export default function FuelSuiteHome({ onNavigate }: FuelSuiteHomeProps) {
  const { user } = useAuth();
  const { stations, scope, setScope, isAll, scopeName, inScope } = useFuelStationScope();
  const { data: records } = useFuelDailyRecords();
  const { data: products } = useFuelProducts();
  const { data: purchases } = useFuelPurchases();
  const { data: sales } = useFuelProductSales();
  const { data: expenses } = useFuelExpenses();
  const { data: creditCustomers } = useFuelCreditCustomers();
  const { data: payments } = useFuelPayments();

  const snap = useMemo(() => {
    const today = todayKey();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // ---- Scope-filter every ledger so totals never mix stations ----
    const scopedRecords = records.filter(r => inScope(r.stationId));
    const scopedSales = sales.filter(s => inScope(s.stationId));
    const scopedPayments = payments.filter(p => inScope(p.stationId));
    const scopedPurchases = purchases.filter(p => inScope(p.stationId));
    const scopedExpenses = expenses.filter(e => inScope(e.stationId));
    const scopedCustomers = creditCustomers.filter(c => inScope(c.stationId));
    const scopedProducts = products.filter(p => inScope(p.stationId));

    // ---- Today's fuel figures ----
    const todayRecords = scopedRecords.filter(r => r.dateKey === today);
    const litresToday = todayRecords.reduce(
      (s, r) => s + meterSold(r.ago?.litresStop || 0, r.ago?.litresStart || 0) + meterSold(r.pms?.litresStop || 0, r.pms?.litresStart || 0), 0
    );
    const expectedToday = todayRecords.reduce(
      (s, r) => s + meterSold(r.ago?.litresStop || 0, r.ago?.litresStart || 0) * (r.ago?.rate || 0)
               + meterSold(r.pms?.litresStop || 0, r.pms?.litresStart || 0) * (r.pms?.rate || 0), 0
    );
    const machineToday = todayRecords.reduce(
      (s, r) => s + meterSold(r.ago?.salesStop || 0, r.ago?.salesStart || 0) + meterSold(r.pms?.salesStop || 0, r.pms?.salesStart || 0), 0
    );
    const diffToday = machineToday - expectedToday;

    // ---- This month ----
    const inMonth = <T extends { date: number }>(rows: T[]) => rows.filter(x => x.date >= monthStart);
    const cashSalesMonth = inMonth(scopedSales).filter((s: any) => !s.onCredit).reduce((a, s: any) => a + s.total, 0);
    const purchasesMonth = inMonth(scopedPurchases).reduce((a, p: any) => a + p.totalCost, 0);
    const expensesMonth = inMonth(scopedExpenses).reduce((a, e: any) => a + e.amount, 0);
    const paymentsMonth = inMonth(scopedPayments).reduce((a, p: any) => a + p.amount, 0);

    // ---- Money position (all time, within scope) ----
    const cashSalesAll = scopedSales.filter(s => !s.onCredit).reduce((a, s) => a + s.total, 0);
    const receivedAll = scopedPayments.reduce((a, p) => a + p.amount, 0);
    const spentAll = scopedPurchases.reduce((a, p) => a + p.totalCost, 0);
    const outstanding = scopedCustomers.reduce((a, c) => a + (c.balance || 0), 0);

    // ---- Charts: last 7 days ----
    const days: Array<{
      key: string; label: string;
      ago: number; pms: number; inK: number; outK: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKeyOf(d.getTime());
      const dayRecords = scopedRecords.filter(r => r.dateKey === key);
      days.push({
        key,
        label: fmtDate(key).slice(0, 6),
        ago: Math.round(dayRecords.reduce((s, r) => s + meterSold(r.ago?.litresStop || 0, r.ago?.litresStart || 0), 0)),
        pms: Math.round(dayRecords.reduce((s, r) => s + meterSold(r.pms?.litresStop || 0, r.pms?.litresStart || 0), 0)),
        inK: Math.round(
          scopedSales.filter(s => s.dateKey === key && !s.onCredit).reduce((a, s) => a + s.total, 0) +
          scopedPayments.filter(p => p.dateKey === key).reduce((a, p) => a + p.amount, 0)
        ),
        outK: Math.round(
          scopedPurchases.filter(p => p.dateKey === key).reduce((a, p) => a + p.totalCost, 0) +
          scopedExpenses.filter(e => e.dateKey === key).reduce((a, e) => a + e.amount, 0)
        ),
      });
    }

    return {
      litresToday, expectedToday, diffToday, machineToday, cashSalesMonth,
      purchasesMonth, expensesMonth, paymentsMonth,
      available: cashSalesAll + receivedAll - spentAll,
      outstanding, days,
      scopedProducts,
      activeStations: stations.filter(s => s.active !== false),
    };
  }, [records, sales, payments, purchases, expenses, creditCustomers, products, stations, inScope]);

  const firstName = (user?.displayName || user?.email || '').split(/[@ ]/)[0];

  return (
    <FuelPageShell
      icon={LayoutGrid}
      title="FuelSuite Dashboard"
      subtitle={`Karibu${firstName ? `, ${firstName}` : ''} — ${isAll ? 'combined view across all stations' : `${scopeName} only`}`}
    >
      {/* KPI board — today */}
      <FuelSection title="Today" icon={CalendarDays}>
        <FuelKpiGrid
          kpis={[
            { label: 'Litres Sold Today', value: `${fmtQty(snap.litresToday)} L`, sub: 'AGO + PMS', icon: Fuel, tone: 'green' },
            { label: 'Expected Fuel Sales', value: ksh(snap.expectedToday), sub: 'litres × rate', icon: TrendingUp, tone: 'violet' },
            { label: 'Machine Sales', value: ksh(snap.machineToday), icon: Banknote, tone: 'violet' },
            { label: 'Difference Today', value: ksh(snap.diffToday), sub: 'machine − expected', icon: AlertTriangle, tone: diffTone(snap.diffToday) },
          ]}
        />
      </FuelSection>

      {/* KPI board — this month & money position */}
      <FuelSection title="This month & money position" icon={Wallet}>
        <FuelKpiGrid
          kpis={[
            { label: 'Product Sales (Cash)', value: ksh(snap.cashSalesMonth), sub: 'this month', icon: ShoppingCart, tone: 'green' },
            { label: 'Purchase Spending', value: ksh(snap.purchasesMonth), sub: 'this month', icon: ShoppingBag, tone: 'violet' },
            { label: 'Expenses', value: ksh(snap.expensesMonth), sub: 'this month', icon: Receipt, tone: 'red' },
            { label: 'Payments Received', value: ksh(snap.paymentsMonth), sub: 'this month', icon: Banknote, tone: 'green' },
            { label: 'Available Proceeds', value: ksh(snap.available), sub: 'cash in − spending, all time', icon: Wallet, tone: snap.available >= 0 ? 'green' : 'red' },
            { label: 'Outstanding Debts', value: ksh(snap.outstanding), sub: 'owed by credit customers', icon: HandCoins, tone: snap.outstanding > 0 ? 'amber' : 'green' },
            { label: 'Active Stations', value: String(snap.activeStations.length), sub: `of ${stations.length}`, icon: MapPinned, tone: 'slate' },
            { label: 'Products', value: String(snap.scopedProducts.length), sub: `${snap.scopedProducts.filter(p => p.sellable).length} sellable`, icon: Package, tone: 'slate' },
          ]}
        />
      </FuelSection>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FuelSection title="Fuel litres sold — last 7 days" icon={Fuel}>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={snap.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [`${fmtQty(Number(v))} L`, String(name)]}
                />
                <Legend formatter={(v: any) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="ago" name="AGO (Diesel)" fill="#34D399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pms" name="PMS (Petrol)" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FuelSection>

        <FuelSection title="Money in vs money out — last 7 days" icon={TrendingUp}>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={snap.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fsIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="fsOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [ksh(Number(v)), name === 'inK' ? 'Money In' : 'Money Out']}
                />
                <Legend formatter={(v: any) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                <Area type="monotone" dataKey="inK" name="Money In" stroke="#34D399" strokeWidth={2} fill="url(#fsIn)" />
                <Area type="monotone" dataKey="outK" name="Money Out" stroke="#8B5CF6" strokeWidth={2} fill="url(#fsOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </FuelSection>
      </div>
      <p className="text-[10px] text-theme-text-muted -mt-2 flex items-start gap-1.5 px-1">
        <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-400" />
        Money in = cash-collected product sales + payments received. Money out = purchase spending + expenses. Credit sales are excluded from money in until repaid.
      </p>

      {/* Quick actions */}
      <FuelSection title="Quick actions" icon={LayoutGrid}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.label}
              type="button"
              onClick={() => onNavigate(a.page, a.action)}
              className={`text-left rounded-xl border p-3 transition-all hover:scale-[1.02] cursor-pointer group ${a.tone}`}
            >
              <div className="flex items-start justify-between gap-2">
                <a.icon className="w-5 h-5 shrink-0" />
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
              <p className="text-xs font-black text-theme-text mt-2 leading-tight">{a.label}</p>
              <p className="text-[10px] text-theme-text-muted mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </FuelSection>

      {/* Station & stock snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FuelSection title={`Stations (${snap.activeStations.length} active) — tap to switch view`} icon={MapPinned}>
          {snap.activeStations.length === 0 ? (
            <div className="text-xs text-amber-400 py-2">
              No active stations yet.{' '}
              <button type="button" onClick={() => onNavigate('fuelSetup', 'addStation')} className="underline font-bold cursor-pointer hover:text-amber-300">Add your first station</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {snap.activeStations.map(st => {
                const stToday = records.filter(r => r.stationId === st.id && r.dateKey === todayKey());
                const litres = stToday.reduce(
                  (s, r) => s + meterSold(r.ago?.litresStop || 0, r.ago?.litresStart || 0) + meterSold(r.pms?.litresStop || 0, r.pms?.litresStart || 0), 0
                );
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setScope(st.id)}
                    className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                      scope === st.id
                        ? 'bg-violet-500/[0.1] border-violet-500/40'
                        : 'bg-white/[0.03] border-theme-border hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`text-xs font-bold truncate ${scope === st.id ? 'text-violet-300' : 'text-theme-text'}`}>{st.name}</span>
                    <span className="text-[10px] font-mono text-theme-text-muted shrink-0">
                      {stToday.length > 0 ? `${fmtQty(litres)} L today` : 'no record today'}
                    </span>
                  </button>
                );
              })}
              {!isAll && (
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className="w-full text-[10px] font-bold uppercase tracking-wider text-theme-text-muted hover:text-theme-text border border-dashed border-theme-border rounded-lg px-3 py-2 transition-colors cursor-pointer"
                >
                  Show all stations combined
                </button>
              )}
            </div>
          )}
        </FuelSection>

        <FuelSection title={isAll ? 'Low / out of stock' : `Low / out of stock — ${scopeName}`} icon={Package}>
          {snap.scopedProducts.filter(p => p.sellable && (p.stock || 0) <= 0).length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 py-2">
              <TrendingUp className="w-4 h-4" /> All sellable products have stock.
            </p>
          ) : (
            <div className="space-y-1.5">
              {snap.scopedProducts.filter(p => p.sellable && (p.stock || 0) <= 0).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate('fuelPurchases', 'addPurchase')}
                  className="w-full flex items-center justify-between gap-2 bg-amber-500/[0.06] border border-amber-500/25 rounded-lg px-3 py-2 hover:bg-amber-500/[0.12] transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-amber-400 truncate">{p.itemCode ? `${p.itemCode} · ${p.name}` : p.name}</span>
                  <span className="text-[10px] font-mono text-theme-text-muted shrink-0">out of stock — restock?</span>
                </button>
              ))}
            </div>
          )}
        </FuelSection>
      </div>
    </FuelPageShell>
  );
}
