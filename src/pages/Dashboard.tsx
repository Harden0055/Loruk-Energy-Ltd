import { 
  useCustomers, 
  useFleetExpenses, 
  useDeliveries, 
  usePayments, 
  useTrucks, 
  deleteSeedData 
} from '../lib/db';
import { formatCurrency, formatLitres } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Truck, 
  Fuel, 
  Activity, 
  DollarSign, 
  CarFront, 
  Building2, 
  ExternalLink 
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSync } from '../lib/sync';
import { useTheme } from '../lib/theme';
import { format } from 'date-fns';
import { Customer } from '../types';

export default function Dashboard({ 
  selectedStation, 
  onNavigateToCustomer, 
  onNavigateToTruck,
  onNavigateToStation 
}: { 
  selectedStation: 'Ndalu' | 'Junction' | 'Combined';
  onNavigateToCustomer?: (id: string) => void;
  onNavigateToTruck?: (reg: string) => void;
  onNavigateToStation?: (id: string, name: string) => void;
}) {
  const { updateLastSync } = useSync();
  const { activeConfig } = useTheme();
  const { customers, loading: custLoad } = useCustomers();
  const { expenses, loading: expLoad } = useFleetExpenses();
  const { deliveries, loading: delLoad } = useDeliveries();
  const { payments, loading: payLoad } = usePayments();
  const { trucks: dbTrucks, loading: truckLoad } = useTrucks();

  useEffect(() => {
    if (!custLoad && !expLoad && !delLoad && !payLoad && !truckLoad) {
      updateLastSync();
    }
  }, [custLoad, expLoad, delLoad, payLoad, truckLoad, updateLastSync]);

  const [isWiping, setIsWiping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [liveTab, setLiveTab] = useState<'transactions' | 'customers' | 'trucks'>('transactions');
  const [txFilter, setTxFilter] = useState<'all' | 'delivery' | 'payment' | 'fleet'>('all');

  const handleClearDemoData = async () => {
    setIsWiping(true);
    try {
      await deleteSeedData();
    } catch (err: any) {
      console.error('Failed to clear seed data: ', err);
    } finally {
      setIsWiping(false);
      setShowClearConfirm(false);
    }
  };

  // Fast map of customers
  const customerMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach(c => {
      map[c.id] = c;
      if (c.customerId) map[c.customerId] = c;
    });
    return map;
  }, [customers]);

  // Loading skeleton
  if (custLoad || expLoad || delLoad || payLoad || truckLoad) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-28 bg-white/5 rounded-[20px]"></div>
          <div className="h-28 bg-white/5 rounded-[20px]"></div>
          <div className="h-28 bg-white/5 rounded-[20px]"></div>
        </div>
        <div className="h-64 bg-white/5 rounded-[20px]"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-white/5 rounded-[20px] lg:col-span-2"></div>
          <div className="h-72 bg-white/5 rounded-[20px]"></div>
        </div>
      </div>
    );
  }

  // --- Base Metrics ---
  const outstandingBalance = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const outstandingBalanceColor = outstandingBalance < 0 ? 'text-[#059669]' : 'text-purple-400';
  
  const totalFleetExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const activeTrucksCount = new Set(expenses.map(e => e.carRegistration)).size;
  const avgExpensePerTruck = activeTrucksCount > 0 ? totalFleetExpenses / activeTrucksCount : 0;

  // --- Fleet Fueling Comparison Horizontal Bar Graph Data ---
  const fleetExpensesSummary = expenses.reduce((acc, curr) => {
    let car = acc.find(c => c.carRegistration === curr.carRegistration);
    if (!car) {
      car = { carRegistration: curr.carRegistration, totalAmount: 0, totalLitres: 0 };
      acc.push(car);
    }
    car.totalAmount += curr.amount;
    car.totalLitres += (curr.litres || 0);
    return acc;
  }, [] as { carRegistration: string, totalAmount: number, totalLitres: number }[])
  .map(c => ({
    ...c,
    avgCostPerLitre: c.totalLitres > 0 ? c.totalAmount / c.totalLitres : 0
  }))
  .sort((a,b) => b.totalAmount - a.totalAmount);

  // --- Top Customer Balances Horizontal Bar Graph Data ---
  const sortedCustomers = [...customers].sort((a,b) => b.balance - a.balance);
  const topDebtorsList = sortedCustomers.length > 10 
    ? [...sortedCustomers.slice(0, 5), ...sortedCustomers.slice(-5)]
    : sortedCustomers;

  const topDebtors = topDebtorsList.map(c => ({
    name: c.name,
    Debt: c.balance
  }));

  const TruckTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text 
        x={x} 
        y={y} 
        dy={4} 
        textAnchor="end" 
        fill="#9ca3af" 
        fontSize={10} 
        onClick={() => onNavigateToTruck?.(payload.value)} 
        className="cursor-pointer hover:fill-purple-400"
      >
        {payload.value}
      </text>
    );
  };

  const CustomerTick = (props: any) => {
    const { x, y, payload } = props;
    const customer = customers.find(c => c.name === payload.value);
    return (
      <text 
        x={x} 
        y={y} 
        dy={4} 
        textAnchor="end" 
        fill="#9ca3af" 
        fontSize={10} 
        onClick={() => customer && onNavigateToCustomer?.(customer.id)} 
        className="cursor-pointer hover:fill-purple-400 font-medium"
      >
        {payload.value}
      </text>
    );
  };

  // --- Top Customers Live ---
  const topCustomersLive = [...customers]
    .map(c => {
      const custDeliveries = deliveries.filter(d => d.customerId === c.id || d.customerId === c.customerId);
      const deliveryLitres = custDeliveries.reduce((acc, d) => acc + (d.litres || 0), 0);
      const deliveryTotal = custDeliveries.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
      const effectivePurchases = Math.max(c.totalPurchases || 0, deliveryTotal);
      return {
        ...c,
        deliveryLitres,
        deliveryCount: custDeliveries.length,
        effectivePurchases
      };
    })
    .sort((a, b) => {
      const scoreA = (a.effectivePurchases * 2) + Math.abs(a.balance || 0);
      const scoreB = (b.effectivePurchases * 2) + Math.abs(b.balance || 0);
      return scoreB - scoreA;
    })
    .slice(0, 6);

  // --- Trucks Live ---
  const regMap: Record<string, {
    registration: string;
    totalAmount: number;
    totalLitres: number;
    lastDate: number;
    lastStation: string;
    expenseCount: number;
    status: 'active' | 'inactive';
  }> = {};

  dbTrucks.forEach(t => {
    if (t.registration) {
      const reg = t.registration.trim().toUpperCase();
      regMap[reg] = {
        registration: reg,
        totalAmount: 0,
        totalLitres: 0,
        lastDate: t.createdAt || 0,
        lastStation: 'Fleet Base',
        expenseCount: 0,
        status: t.status || 'active'
      };
    }
  });

  expenses.forEach(e => {
    const reg = (e.carRegistration || 'TRUCK').trim().toUpperCase();
    if (!regMap[reg]) {
      regMap[reg] = {
        registration: reg,
        totalAmount: 0,
        totalLitres: 0,
        lastDate: 0,
        lastStation: e.station || 'Station',
        expenseCount: 0,
        status: 'active'
      };
    }
    const item = regMap[reg];
    item.totalAmount += e.amount || 0;
    item.totalLitres += e.litres || 0;
    item.expenseCount += 1;
    if (e.date > item.lastDate) {
      item.lastDate = e.date;
      item.lastStation = e.station || item.lastStation;
    }
  });

  const now = Date.now();
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

  const liveTrucks = Object.values(regMap)
    .sort((a, b) => b.lastDate - a.lastDate || b.totalAmount - a.totalAmount)
    .slice(0, 6)
    .map(t => ({
      ...t,
      isLiveOperating: (now - t.lastDate) < FORTY_EIGHT_HOURS && t.lastDate > 0
    }));

  // --- Very Recent Transactions Live Stream ---
  interface RecentTransaction {
    id: string;
    kind: 'delivery' | 'payment' | 'fleet';
    date: number;
    partyName: string;
    partyId?: string;
    isCustomer: boolean;
    isTruck: boolean;
    title: string;
    detail: string;
    litres?: number;
    amount: number;
    station: string;
    createdBy: string;
  }

  const allRecentTransactions: RecentTransaction[] = [
    // Deliveries
    ...deliveries.map(d => {
      const cust = customerMap[d.customerId];
      const prodName = d.productType ? `${d.productType} Fuel` : 'Fuel Delivery';
      return {
        id: `del-${d.id}`,
        kind: 'delivery' as const,
        date: d.date || d.createdAt || 0,
        partyName: cust?.name || d.customerId || 'Customer',
        partyId: d.customerId,
        isCustomer: true,
        isTruck: false,
        title: 'Customer Delivery',
        detail: prodName,
        litres: d.litres || (d.superLitres || 0) + (d.dieselLitres || 0) || 0,
        amount: d.totalAmount || 0,
        station: (d as any).station || (selectedStation !== 'Combined' ? selectedStation : 'Ndalu'),
        createdBy: d.createdBy || 'Cashier'
      };
    }),
    // Payments
    ...payments.map(p => {
      const cust = customerMap[p.customerId];
      return {
        id: `pay-${p.id}`,
        kind: 'payment' as const,
        date: p.date || p.createdAt || 0,
        partyName: cust?.name || p.customerId || 'Customer',
        partyId: p.customerId,
        isCustomer: true,
        isTruck: false,
        title: 'Payment Received',
        detail: 'Account Settlement',
        litres: undefined,
        amount: p.amount || 0,
        station: (p as any).station || (selectedStation !== 'Combined' ? selectedStation : 'Accounts'),
        createdBy: p.createdBy || 'Cashier'
      };
    }),
    // Fleet Fueling
    ...expenses.map(e => ({
      id: `exp-${e.id}`,
      kind: 'fleet' as const,
      date: e.date || 0,
      partyName: e.carRegistration || 'Fleet Truck',
      partyId: e.carRegistration,
      isCustomer: false,
      isTruck: true,
      title: 'Fleet Fueling',
      detail: e.station ? `${e.station} Station` : 'Internal Fleet Fuel',
      litres: e.litres || 0,
      amount: e.amount || 0,
      station: e.station || 'Station',
      createdBy: e.createdBy || 'Attendant'
    }))
  ].sort((a, b) => b.date - a.date);

  const filteredTransactions = txFilter === 'all' 
    ? allRecentTransactions.slice(0, 15) 
    : allRecentTransactions.filter(t => t.kind === txFilter).slice(0, 15);

  const counts = {
    all: allRecentTransactions.length,
    delivery: allRecentTransactions.filter(t => t.kind === 'delivery').length,
    payment: allRecentTransactions.filter(t => t.kind === 'payment').length,
    fleet: allRecentTransactions.filter(t => t.kind === 'fleet').length,
  };

  return (
    <div className="space-y-6">

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
          <div className="glass-panel w-full max-w-sm rounded-xl shadow-2xl p-6 border border-amber-200 dark:border-amber-900/40">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to remove all seeded demonstration records? This will safely wipe the mock customers, deliveries, payments, and other mock data, while keeping all your custom entered data completely untouched.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isWiping}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-white/10 dark:theme-bg-gradient/30 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isWiping}
                onClick={handleClearDemoData}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer flex items-center gap-2"
              >
                {isWiping ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard 
          title="Total Outstanding Balances" 
          value={formatCurrency(outstandingBalance)} 
          icon={DollarSign} 
          color={outstandingBalanceColor} 
        />
        <MetricCard 
          title="Total Fleet Fueling" 
          value={formatCurrency(totalFleetExpenses)} 
          icon={TrendingUp} 
          color="text-purple-400" 
        />
        <MetricCard 
          title="Average Expense per Truck" 
          value={formatCurrency(avgExpensePerTruck)} 
          icon={CarFront} 
          color="text-emerald-400" 
        />
      </div>

      {/* Customer Credits and Debits Overview (Horizontal Bar Graph - RESTORED) */}
      <div className="glass-panel p-6 rounded-[20px] flex flex-col transition-all duration-300 border border-theme-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full shadow-sm"
              style={{ backgroundColor: activeConfig.primaryColor, boxShadow: `0 0 8px ${activeConfig.primaryColor}` }}
            />
            Top Customer Balances
          </h2>
          <span className="text-xs text-gray-500 font-mono">Live Customer Credits & Debits</span>
        </div>
        <div className="h-[220px] w-full text-xs relative overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={topDebtors} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
              <XAxis type="number" stroke="#71717A" tickLine={false} axisLine={false} hide />
              <YAxis dataKey="name" type="category" tick={<CustomerTick />} stroke="#71717A" tickLine={false} axisLine={false} width={160} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10, 10, 14, 0.98)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px' }} 
                cursor={{fill: `${activeConfig.primaryColor}15`, opacity: 0.2}} 
                formatter={(value: number) => [`${value >= 0 ? 'Debt: ' : 'Advance: '}${formatCurrency(Math.abs(value))}`, 'Balance']}
              />
              <Bar dataKey="Debt" fill={activeConfig.primaryColor} radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Grid: Replaced Zigzag Graph with Live Operations (Col 2) + Kept Fleet Horizontal Bar Graph (Col 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* REPLACED FLEET FUELING TREND (ZIGZAG GRAPH) WITH: Very Recent Transactions, Top Customers & Trucks Live */}
        <div className="glass-panel p-5 rounded-[20px] flex flex-col transition-all duration-300 lg:col-span-2 border border-theme-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-theme-border">
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: activeConfig.secondaryColor, boxShadow: `0 0 8px ${activeConfig.secondaryColor}` }}
              />
              <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
                Live Operations
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00E676]" />
                  LIVE
                </span>
              </h2>
            </div>

            {/* View Selector Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setLiveTab('transactions')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  liveTab === 'transactions' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Recent Transactions</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveTab('customers')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  liveTab === 'customers' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Top Customers</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveTab('trucks')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  liveTab === 'trucks' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>Trucks Live</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENT: VERY RECENT TRANSACTIONS */}
          {liveTab === 'transactions' && (
            <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
              {allRecentTransactions.slice(0, 5).length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">No recent transactions recorded yet.</div>
              ) : (
                allRecentTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                        {tx.kind === 'delivery' && (
                          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                            <Fuel className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {tx.kind === 'payment' && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {tx.kind === 'fleet' && (
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {tx.isCustomer ? (
                            <button
                              type="button"
                              onClick={() => tx.partyId && onNavigateToCustomer?.(tx.partyId)}
                              className="font-bold text-[#7C3AED] hover:text-purple-300 hover:underline cursor-pointer truncate text-left"
                            >
                              {tx.partyName}
                            </button>
                          ) : tx.isTruck ? (
                            <button
                              type="button"
                              onClick={() => tx.partyId && onNavigateToTruck?.(tx.partyId)}
                              className="font-bold text-[#7C3AED] hover:text-purple-300 hover:underline cursor-pointer truncate text-left"
                            >
                              {tx.partyName}
                            </button>
                          ) : (
                            <span className="font-bold text-white truncate">{tx.partyName}</span>
                          )}
                          <span className="text-[10px] text-gray-400 font-mono">({tx.detail})</span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span>{tx.station}</span>
                          <span>•</span>
                          <span>{tx.date > 0 ? format(tx.date, 'HH:mm • MMM d') : 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-xs ${
                        tx.kind === 'payment' ? '!text-[#059669]' : '!text-[#9333EA]'
                      }`}>
                        {tx.kind === 'payment' ? '+ ' : ''}{formatCurrency(tx.amount)}
                      </div>
                      {tx.litres && tx.litres > 0 && (
                        <div className="text-[10px] text-gray-400 font-mono">{formatLitres(tx.litres)}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: TOP CUSTOMERS LIVE */}
          {liveTab === 'customers' && (
            <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
              {topCustomersLive.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">No customer accounts logged yet.</div>
              ) : (
                topCustomersLive.map((cust, idx) => {
                  const isOwing = (cust.balance || 0) > 0;
                  const isAdvance = (cust.balance || 0) < 0;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => onNavigateToCustomer?.(cust.id)}
                      className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-400'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#7C3AED] group-hover:text-purple-300 hover:underline transition-colors truncate">
                            {cust.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Purchases: {formatCurrency(cust.effectivePurchases)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <div className="text-[9px] uppercase font-semibold text-gray-400">Balance</div>
                          <div className={`font-mono font-bold text-xs ${
                            isOwing ? '!text-[#9333EA]' : isAdvance ? '!text-[#059669]' : 'text-gray-400'
                          }`}>
                            {isAdvance && 'Adv '}{formatCurrency(Math.abs(cust.balance || 0))}
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB CONTENT: TRUCKS LIVE */}
          {liveTab === 'trucks' && (
            <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
              {liveTrucks.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">No fleet trucks logged yet.</div>
              ) : (
                liveTrucks.map((truck) => (
                  <div
                    key={truck.registration}
                    onClick={() => onNavigateToTruck?.(truck.registration)}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-[#7C3AED] flex items-center justify-center shrink-0">
                        <Truck className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#7C3AED] group-hover:text-purple-300 hover:underline transition-colors truncate">
                            {truck.registration}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1 py-0.2 rounded border ${
                            truck.isLiveOperating 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${truck.isLiveOperating ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                            {truck.isLiveOperating ? 'Operating' : 'Standby'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {truck.lastStation} • {truck.lastDate > 0 ? format(truck.lastDate, 'MMM d, HH:mm') : 'No logs'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-[9px] uppercase font-semibold text-gray-400">Total Fuel</div>
                        <div className="font-mono font-bold text-xs !text-[#9333EA]">
                          {formatCurrency(truck.totalAmount)}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Fleet Fueling Comparison Widget (Horizontal Bar Graph - RESTORED) */}
        <div className="glass-panel p-6 rounded-[20px] flex flex-col transition-all duration-300 border border-theme-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: activeConfig.tertiaryColor, boxShadow: `0 0 8px ${activeConfig.tertiaryColor}` }}
              />
              Fleet Fueling Comparison
            </h2>
          </div>
          <div className="h-[220px] w-full text-xs relative overflow-hidden">
             {fleetExpensesSummary.length === 0 ? (
               <div className="text-center text-sm text-[#71717A] py-8">No fleet fueling logged yet.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                 <BarChart data={fleetExpensesSummary} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
                   <XAxis type="number" stroke="#71717A" tickLine={false} axisLine={false} hide />
                   <YAxis dataKey="carRegistration" type="category" tick={<TruckTick />} stroke="#71717A" tickLine={false} axisLine={false} width={80} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(10, 10, 14, 0.98)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px' }} 
                     cursor={{fill: `${activeConfig.secondaryColor}15`, opacity: 0.2}} 
                     formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                   />
                   <Bar dataKey="totalAmount" fill={activeConfig.secondaryColor} radius={[0, 4, 4, 0]} barSize={10} name="Total Amount" />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>

      </div>

      {/* Very Recent Transactions Feed (Full Width at Bottom) */}
      <div className="glass-panel border border-theme-border p-5 rounded-[20px] shadow-sm flex flex-col transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400 glow-blue-icon" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Very Recent Transactions
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00E676]" />
                  LIVE STREAM
                </span>
              </h2>
              <p className="text-xs text-gray-400">Real-time deliveries, payments, and fleet fueling</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txFilter === 'all' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setTxFilter('delivery')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txFilter === 'delivery' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Deliveries ({counts.delivery})
            </button>
            <button
              onClick={() => setTxFilter('payment')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txFilter === 'payment' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Payments ({counts.payment})
            </button>
            <button
              onClick={() => setTxFilter('fleet')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                txFilter === 'fleet' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Fleet Fueling ({counts.fleet})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="modern-tr">
                <th className="modern-th">Type</th>
                <th className="modern-th">Party / Vehicle</th>
                <th className="modern-th">Details</th>
                <th className="modern-th">Station</th>
                <th className="modern-th">Litres</th>
                <th className="modern-th">Amount</th>
                <th className="modern-th">Processed By</th>
                <th className="modern-th">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900/40">
              {filteredTransactions.length === 0 ? (
                <tr className="modern-tr">
                  <td colSpan={8} className="modern-td py-10 text-center text-sm text-gray-400">
                    No transactions matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-white/5 transition-colors text-sm font-medium text-theme-text group"
                    >
                      {/* Transaction Type */}
                      <td className="modern-td">
                        <div className="flex items-center gap-2">
                          {tx.kind === 'delivery' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              <Fuel className="w-3 h-3" />
                              Delivery
                            </span>
                          )}
                          {tx.kind === 'payment' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <DollarSign className="w-3 h-3" />
                              Payment
                            </span>
                          )}
                          {tx.kind === 'fleet' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              <Truck className="w-3 h-3" />
                              Fleet Fuel
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Party / Vehicle */}
                      <td className="modern-td">
                        {tx.isCustomer ? (
                          <button
                            type="button"
                            onClick={() => tx.partyId && onNavigateToCustomer?.(tx.partyId)}
                            className="font-bold text-[#7C3AED] hover:text-purple-300 hover:underline cursor-pointer text-left transition-colors flex items-center gap-1"
                          >
                            <span>{tx.partyName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                          </button>
                        ) : tx.isTruck ? (
                          <button
                            type="button"
                            onClick={() => tx.partyId && onNavigateToTruck?.(tx.partyId)}
                            className="font-bold text-[#7C3AED] hover:text-purple-300 hover:underline cursor-pointer text-left transition-colors flex items-center gap-1"
                          >
                            <span>{tx.partyName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                          </button>
                        ) : (
                          <span className="font-semibold text-white">{tx.partyName}</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="modern-td text-gray-300 text-xs">
                        {tx.detail}
                      </td>

                      {/* Station */}
                      <td className="modern-td">
                        {tx.station ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToStation?.(tx.station, tx.station)}
                            className="inline-flex items-center gap-1 font-bold text-[#7C3AED] hover:text-purple-300 hover:underline cursor-pointer text-xs"
                          >
                            <Building2 className="w-3 h-3 text-[#7C3AED]" />
                            <span>{tx.station}</span>
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs">N/A</span>
                        )}
                      </td>

                      {/* Volume Litres */}
                      <td className="modern-td text-xs font-mono text-gray-300">
                        {tx.litres && tx.litres > 0 ? formatLitres(tx.litres) : '-'}
                      </td>

                      {/* Amount */}
                      <td className="modern-td">
                        <span className={`font-mono font-bold text-sm ${
                          tx.kind === 'payment'
                            ? '!text-[#059669]'
                            : '!text-[#9333EA]'
                        }`}>
                          {tx.kind === 'payment' ? '+ ' : ''}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Processed By */}
                      <td className="modern-td text-xs font-mono text-gray-400 truncate max-w-[120px]" title={tx.createdBy}>
                        {tx.createdBy || 'Staff'}
                      </td>

                      {/* Date & Time */}
                      <td className="modern-td text-xs text-gray-400 font-mono">
                        {tx.date > 0 ? format(tx.date, 'MMM d, yyyy HH:mm') : 'Recent'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="glass-panel p-5 rounded-[20px] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:border-purple-500/40 flex flex-col justify-between min-h-[128px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-[#A1A1AA] uppercase">{title}</p>
        <div className="w-8 h-8 rounded-xl shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color || 'text-purple-400'}`} />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm sm:text-base lg:text-[18px] font-bold text-white tracking-tight leading-snug mb-1 font-mono truncate" title={value}>{value}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#00E676]" />
          Operational
        </div>
      </div>
    </div>
  );
}
