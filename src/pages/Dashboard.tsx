import { useCustomers, useFleetExpenses, fetchSeedData, deleteSeedData } from '../lib/db';
import { formatCurrency, formatLitres } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, TrendingUp, AlertCircle, Truck, Fuel, Activity, DollarSign, Plus, X, CarFront, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSync } from '../lib/sync';
import { format } from 'date-fns';
import { useDailyPumpReadings, useDailyExpenses, useDailyInvoices, useCashPositions } from '../lib/operationsDb';
import ItemsSoldDashboard from '../components/ItemsSoldDashboard';
import InventoryDashboard from '../components/InventoryDashboard';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function Dashboard({ selectedStation, onNavigateToCustomer, onNavigateToTruck }: { selectedStation: 'Ndalu' | 'Junction' | 'Combined', onNavigateToCustomer?: (id: string) => void, onNavigateToTruck?: (reg: string) => void }) {
  const { updateLastSync } = useSync();
  const { customers, loading: custLoad } = useCustomers();
  const { expenses, loading: expLoad } = useFleetExpenses();

  // Integrated Operational Hooks
  const { readings } = useDailyPumpReadings();
  const { expenses: dailyExpenses } = useDailyExpenses();
  const { invoices: dailyInvoices } = useDailyInvoices();
  const { positions } = useCashPositions();

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

  const opsFuelRevenue = readings.filter(stationFilter).reduce((sum, r) => sum + r.manualRevenue, 0);
  const opsExpenses = dailyExpenses.filter(stationFilter).reduce((sum, e) => sum + e.amount, 0);
  const opsInvoicesDue = dailyInvoices.filter(stationFilter).reduce((sum, i) => sum + i.balance, 0);
  const opsVariance = readings.filter(stationFilter).reduce((sum, r) => sum + ((r.litresSold * r.ratePerLitre) - r.manualRevenue), 0);

  const latestLiquidity = useMemo(() => {
    const list = positions.filter(stationFilter);
    return list.length > 0 ? (list[0].mpesaBalance + list[0].cashAtHand) : 0;
  }, [positions, selectedStation]);

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

  // Compute combined recent activity based on Fleet Expenses
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

  // Group fleet expenses by date for trend chart
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
      <div className="h-32 bg-gray-200 dark:bg-blue-900 rounded flex gap-4">
         <div className="flex-1 bg-gray-300 dark:bg-blue-900 rounded-lg"></div>
         <div className="flex-1 bg-gray-300 dark:bg-blue-900 rounded-lg"></div>
      </div>
      <div className="h-64 bg-gray-200 dark:bg-blue-900 rounded"></div>
    </div>;
  }

  // --- Base Metrics ---
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const outstandingBalance = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const outstandingBalanceColor = outstandingBalance > 0 ? "text-red-600 dark:text-red-400" : outstandingBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-blue-100";
  
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
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-amber-200 dark:border-amber-900/40">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to remove all seeded demonstration records? This will safely wipe the mock customers, deliveries, payments, and other mock data, while keeping all your custom entered data completely untouched.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isWiping}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Outstanding Balances" value={formatCurrency(outstandingBalance)} icon={DollarSign} color={outstandingBalanceColor} />
        <MetricCard title="Total Fleet Expenses" value={formatCurrency(totalFleetExpenses)} icon={TrendingUp} color="text-orange-500 dark:text-orange-400" />
        <MetricCard title="Average Expense per Truck" value={formatCurrency(avgExpensePerTruck)} icon={CarFront} color="text-blue-600 dark:text-blue-400" />
        <MetricCard title="Active Customers" value={activeCustomers.toString()} icon={Users} color="text-emerald-600 dark:text-emerald-400" />
        <MetricCard title="Active Trucks" value={activeTrucksCount.toString()} icon={Truck} color="text-purple-600 dark:text-purple-400" />
      </div>

      {/* Customer Debt Overview */}
      <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col transition-colors">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 tracking-wide">Top Balances</h2>
        <div className="h-[220px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDebtors} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} hide />
              <YAxis dataKey="name" type="category" tick={<CustomerTick />} stroke="#9ca3af" tickLine={false} axisLine={false} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} 
                cursor={{fill: '#1e40af', opacity: 0.2}} 
                formatter={(value: number) => [`${value >= 0 ? 'Debt: ' : 'Advance: '}${formatCurrency(Math.abs(value))}`, 'Balance']}
              />
              <Bar dataKey="Debt" fill="#0ea5e9" radius={[0, 2, 2, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retail Items Sold & Station Comparison Dashboard */}
      <ItemsSoldDashboard selectedStation={selectedStation} />

      {/* Real-time Logistics & Inventory Stock Levels Dashboard */}
      <InventoryDashboard selectedStation={selectedStation} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fleet Expenses Trend Chart */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col transition-colors lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 tracking-wide">Fleet Expenses Trend</h2>
          <div className="h-[220px] w-full text-xs">
            {fleetTrend.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">No fleet expenses logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fleetTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fleet Expenses Comparison Widget */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col transition-colors">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 tracking-wide flex items-center gap-2">
             <CarFront className="w-4 h-4" /> Fleet Expenses Comparison
          </h2>
          <div className="h-[220px] w-full text-xs">
             {fleetExpensesSummary.length === 0 ? (
               <div className="text-center text-sm text-gray-400 py-8">No fleet expenses logged yet.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={fleetExpensesSummary} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={false} />
                   <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} hide />
                   <YAxis dataKey="carRegistration" type="category" tick={<TruckTick />} stroke="#9ca3af" tickLine={false} axisLine={false} width={80} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} 
                     cursor={{fill: '#1e40af', opacity: 0.2}} 
                     formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                   />
                   <Bar dataKey="totalAmount" fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={10} name="Total Amount" />
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
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded shadow-sm flex flex-col transition-colors lg:col-span-3">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-blue-900 pb-3">
            <h2 className="text-base font-semibold text-gray-950 dark:text-blue-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Fleet Expenses Activity Feed
            </h2>
            <span className="text-xs font-mono font-medium text-gray-400 dark:text-blue-500">
              Live updates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-blue-900 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4">Activity</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4">Vehicle</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4">Station</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right">Amount</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4">Processed By</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-200 dark:border-blue-900 py-8 text-center text-sm text-gray-400">
                      No recent activities recorded yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    return (
                      <tr 
                        key={act.id} 
                        className="hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors text-base font-medium text-gray-900 dark:text-blue-100"
                      >
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4">
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
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-800" onClick={() => onNavigateToTruck?.(act.carRegistration)}>
                          <div className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{act.carRegistration}</div>
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-gray-600 dark:text-gray-400">
                          {act.station}
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(act.amount)}
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 select-all max-w-[120px] truncate" title={act.createdBy}>
                          {act.createdBy || 'System'}
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
    <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-300 font-medium tracking-wide">{title}</p>
        <Icon className="w-4 h-4 text-gray-400 dark:text-gray-400" />
      </div>
      <p className={`text-2xl font-bold ${color?.replace('gray-900', 'gray-900 dark:text-white') || 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}
