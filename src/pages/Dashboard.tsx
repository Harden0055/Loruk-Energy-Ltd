import { useCustomers, useFleetExpenses, fetchSeedData, deleteSeedData } from '../lib/db';
import { formatCurrency, formatLitres } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, TrendingUp, AlertCircle, Truck, Fuel, Activity, DollarSign, Plus, X, CarFront, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSync } from '../lib/sync';
import { format } from 'date-fns';

const COLORS = ['#00D4FF', '#a855f7', '#7C3AED', '#3b82f6', '#00e676'];

export default function Dashboard({ selectedStation, onNavigateToCustomer, onNavigateToTruck }: { selectedStation: 'Ndalu' | 'Junction' | 'Combined', onNavigateToCustomer?: (id: string) => void, onNavigateToTruck?: (reg: string) => void }) {
  const { updateLastSync } = useSync();
  const { customers, loading: custLoad } = useCustomers();
  const { expenses, loading: expLoad } = useFleetExpenses();

  useEffect(() => {
    if (!custLoad && !expLoad) {
      updateLastSync();
    }
  }, [custLoad, expLoad, updateLastSync]);

  const [isWiping, setIsWiping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const hasDemoData = useMemo(() => {
    return customers.some(c => c.customerId === 'CUST-001' || c.customerId === 'CUST-002');
  }, [customers]);

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

  // Station specific calculations
  const stationFilter = (item: { station: 'Ndalu' | 'Junction' }) => selectedStation === 'Combined' || item.station === selectedStation;

  const inactiveTrucks = useMemo(() => {
    const now = Date.now();
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const lastActivity: Record<string, number> = {};
    expenses.forEach(e => {
      if (!lastActivity[e.carRegistration] || e.date > lastActivity[e.carRegistration]) {
        lastActivity[e.carRegistration] = e.date;
      }
    });
    return Object.entries(lastActivity)
      .filter(([_, date]) => (now - date) > FORTY_EIGHT_HOURS)
      .map(([reg, date]) => ({ reg, lastDate: date }));
  }, [expenses]);

  // Compute combined recent activity based on Fleet Fueling
  const activities = useMemo(() => {
    return expenses.map(e => ({
      id: e.id,
      type: 'expense' as const,
      date: e.date,
      carRegistration: e.carRegistration,
      amount: e.amount,
      createdBy: e.createdBy,
      station: e.station
    }))
    .sort((a, b) => b.date - a.date)
    .slice(0, 10);
  }, [expenses]);

  // Group fleet fueling by date for trend chart
  const fleetTrend = useMemo(() => {
    const grouped = expenses.reduce((acc, curr) => {
      const dateStr = new Date(curr.date).toLocaleDateString(undefined, {month: 'short', day:'numeric'});
      acc[dateStr] = (acc[dateStr] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, amount]) => ({ date, Amount: amount }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [expenses]);

  if (custLoad || expLoad) {
    return <div className="animate-pulse space-y-6">
      <div className="h-32 bg-gray-200 dark:theme-bg-gradient rounded flex gap-4">
         <div className="flex-1 bg-transparent rounded-lg"></div>
         <div className="flex-1 bg-transparent rounded-lg"></div>
      </div>
      <div className="h-64 bg-gray-200 dark:theme-bg-gradient rounded"></div>
    </div>;
  }

  // --- Base Metrics ---
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const outstandingBalance = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const outstandingBalanceColor = outstandingBalance > 0 ? "text-red-600 dark:text-red-400" : outstandingBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-theme-text";
  
  const totalFleetExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const activeTrucksCount = new Set(expenses.map(e => e.carRegistration)).size;
  const avgExpensePerTruck = activeTrucksCount > 0 ? totalFleetExpenses / activeTrucksCount : 0;

  const fleetExpensesSummary = expenses.reduce((acc, curr) => {
    let car = acc.find(c => c.carRegistration === curr.carRegistration);
    if (!car) {
      car = { carRegistration: curr.carRegistration, totalAmount: 0, totalDistance: 0 };
      acc.push(car);
    }
    car.totalAmount += curr.amount;
    car.totalDistance += (curr.distance || 0);
    return acc;
  }, [] as { carRegistration: string, totalAmount: number, totalDistance: number }[])
  .map(c => ({
    ...c,
    avgCostPerKm: c.totalDistance > 0 ? c.totalAmount / c.totalDistance : 0
  }))
  .sort((a,b) => b.totalAmount - a.totalAmount);

  const TruckTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fill="#9ca3af" fontSize={10} onClick={() => onNavigateToTruck?.(payload.value)} className="cursor-pointer hover:fill-blue-500 dark:hover:fill-blue-400">
        {payload.value}
      </text>
    );
  };

  const CustomerTick = (props: any) => {
    const { x, y, payload } = props;
    const customer = customers.find(c => c.name === payload.value);
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fill="#9ca3af" fontSize={10} onClick={() => customer && onNavigateToCustomer?.(customer.id)} className="cursor-pointer hover:fill-blue-500 dark:hover:fill-blue-400">
        {payload.value}
      </text>
    );
  };

  let sortedCustomers = [...customers].sort((a,b) => b.balance - a.balance);
  let topDebtorsList = sortedCustomers.length > 10 
    ? [...sortedCustomers.slice(0, 5), ...sortedCustomers.slice(-5)]
    : sortedCustomers;

  const topDebtors = topDebtorsList.map(c => ({
    name: c.name,
    Debt: c.balance
  }));

  return (
    <div className="space-y-6">

      {/* Seed/Demo Data Banner Alert - REMOVED */}
      {/* Inactive Trucks Warning - REMOVED */}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
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

      {/* FuelSuite Pro Banner */}
      <div className="theme-bg-gradient border border-theme-border glow-cyan p-6 rounded-xl shadow-lg relative overflow-hidden group transition-all hover:border-theme-border">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity className="w-32 h-32 text-cyan-400 glow-cyan-text" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gradient flex items-center gap-2">
               FuelSuite Pro <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded uppercase tracking-widest border border-theme-border glow-cyan">New</span>
            </h2>
            <p className="text-theme-text-muted mt-1 max-w-xl">
              Access the dedicated energy management dashboard for complete station analytics, pump readings, LPG tracking, and real-time P&L reporting.
            </p>
          </div>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/?page=fuelsuite');
              window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'fuelsuite' } }));
            }}
            className="shrink-0 px-6 py-3 bg-gradient-primary hover:opacity-90 text-white font-bold rounded-lg shadow-lg glow-purple transition-all border-0 flex items-center gap-2"
          >
            Launch FuelSuite <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Outstanding Balances" value={formatCurrency(outstandingBalance)} icon={DollarSign} color={outstandingBalanceColor} />
        <MetricCard title="Total Fleet Fueling" value={formatCurrency(totalFleetExpenses)} icon={TrendingUp} color="text-orange-500 dark:text-orange-400" />
        <MetricCard title="Average Expense per Truck" value={formatCurrency(avgExpensePerTruck)} icon={CarFront} color="text-cyan-500 dark:text-blue-400" />
        <MetricCard title="Active Customers" value={activeCustomers.toString()} icon={Users} color="text-emerald-600 dark:text-emerald-400" />
        <MetricCard title="Active Trucks" value={activeTrucksCount.toString()} icon={Truck} color="text-cyan-600 dark:text-cyan-400 glow-cyan-text" />
      </div>

      {/* SVG Definitions for Premium Gradients */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <linearGradient id="purpleBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B3DFF" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139, 61, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(139, 61, 255, 0.0)" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Customer Debt Overview */}
      <div className="glass-panel p-6 rounded-[20px] flex flex-col transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B15DFF] shadow-[0_0_8px_#B15DFF]" />
            Top Customer Balances
          </h2>
        </div>
        <div className="h-[220px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDebtors} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
              <XAxis type="number" stroke="#71717A" tickLine={false} axisLine={false} hide />
              <YAxis dataKey="name" type="category" tick={<CustomerTick />} stroke="#71717A" tickLine={false} axisLine={false} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(18, 18, 22, 0.9)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', backdropFilter: 'blur(16px)' }} 
                cursor={{fill: 'rgba(139, 61, 255, 0.08)', opacity: 0.2}} 
                formatter={(value: number) => [`${value >= 0 ? 'Debt: ' : 'Advance: '}${formatCurrency(Math.abs(value))}`, 'Balance']}
              />
              <Bar dataKey="Debt" fill="url(#purpleBlueGrad)" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Fueling Trend Chart */}
        <div className="glass-panel p-6 rounded-[20px] flex flex-col transition-all duration-300 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B15DFF] shadow-[0_0_8px_#B15DFF]" />
              Fleet Fueling Trend
            </h2>
          </div>
          <div className="h-[220px] w-full text-xs">
            {fleetTrend.length === 0 ? (
              <div className="text-center text-sm text-[#71717A] py-8">No fleet fueling logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fleetTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717A" tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(18, 18, 22, 0.9)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', backdropFilter: 'blur(16px)' }} />
                  <Line type="monotone" dataKey="Amount" stroke="url(#purpleBlueGrad)" strokeWidth={3} dot={{ stroke: '#B15DFF', strokeWidth: 2, r: 4, fill: '#09090B' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#B15DFF' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fleet Fueling Comparison Widget */}
        <div className="glass-panel p-6 rounded-[20px] flex flex-col transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
              Fleet Fueling Comparison
            </h2>
          </div>
          <div className="h-[220px] w-full text-xs">
             {fleetExpensesSummary.length === 0 ? (
               <div className="text-center text-sm text-[#71717A] py-8">No fleet fueling logged yet.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={fleetExpensesSummary} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
                   <XAxis type="number" stroke="#71717A" tickLine={false} axisLine={false} hide />
                   <YAxis dataKey="carRegistration" type="category" tick={<TruckTick />} stroke="#71717A" tickLine={false} axisLine={false} width={80} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(18, 18, 22, 0.9)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', backdropFilter: 'blur(16px)' }} 
                     cursor={{fill: 'rgba(59, 130, 246, 0.08)', opacity: 0.2}} 
                     formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                   />
                   <Bar dataKey="totalAmount" fill="url(#purpleBlueGrad)" radius={[0, 4, 4, 0]} barSize={10} name="Total Amount" />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>
        


          {/* h-180 container block
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fuelData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                    {fuelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 mt-2 self-start">
            {fuelData.map((fd, i) => (
              <div key={fd.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                 <span className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length]}}></span>
                 {fd.name} ({formatLitres(fd.value)})
              </div>
            ))}
          </div>
          */}

        {/* Recent Activity Feed */}
        <div className="glass-panel border border-theme-border p-5 rounded shadow-sm flex flex-col transition-colors lg:col-span-3">
          <div className="flex items-center justify-between mb-4 border-b border-theme-border pb-3">
            <h2 className="text-base font-semibold text-gray-950 dark:text-theme-text flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Fleet Fueling Activity Feed
            </h2>
            <span className="text-xs font-mono font-medium text-gray-400 dark:text-blue-500">
              Live updates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr className="modern-tr">
                  <th className="modern-th">Activity</th>
                  <th className="modern-th">Vehicle</th>
                  <th className="modern-th">Station</th>
                  <th className="modern-th">Amount</th>
                  <th className="modern-th">Processed By</th>
                  <th className="modern-th">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
                {activities.length === 0 ? (
                  <tr className="modern-tr">
                    <td colSpan={6} className="border border-theme-border py-8 text-center text-sm text-gray-400">
                      No recent activities recorded yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    return (
                      <tr 
                        key={act.id} 
                        className="hover:bg-white/5 dark:hover:bg-blue-900/50 transition-colors text-base font-medium text-theme-text"
                      >
                        <td className="modern-td">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center" title="Fleet Expense">
                              <CarFront className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400">
                                Fleet Expense
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="border border-theme-border py-3 px-4 cursor-pointer hover:bg-white/10 dark:hover:bg-blue-800" onClick={() => onNavigateToTruck?.(act.carRegistration)}>
                          <div className="font-bold text-cyan-500 dark:text-blue-400 hover:underline">{act.carRegistration}</div>
                        </td>
                        <td className="modern-td">
                          {act.station}
                        </td>
                        <td className="modern-td">
                          {formatCurrency(act.amount)}
                        </td>
                        <td className="border border-theme-border py-3 px-4 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 select-all max-w-[120px] truncate" title={act.createdBy}>
                          {act.createdBy || 'System'}
                        </td>
                        <td className="modern-td">
                          {format(act.date, 'MMM d, yyyy HH:mm')}
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

    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="glass-panel p-5 rounded-[20px] transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_0_50px_rgba(139,61,255,0.18)] hover:border-[#8B3DFF]/30 flex flex-col justify-between h-36">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold tracking-wider text-[#A1A1AA] uppercase">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-[#8B3DFF]/10 flex items-center justify-center border border-[#8B3DFF]/25 shadow-[0_0_15px_rgba(139,61,255,0.25)] shrink-0">
          <Icon className="w-4 h-4 text-[#B15DFF]" />
        </div>
      </div>
      <div>
        <p className="text-xl xl:text-2xl font-bold text-white tracking-tight leading-none mb-2">{value}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#22C55E]" />
          Operational
        </div>
      </div>
    </div>
  )
}
