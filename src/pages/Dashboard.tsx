import { useCustomers, useDeliveries, usePayments, useFleetExpenses, fetchSeedData } from '../lib/db';
import { formatCurrency, formatLitres, getStationColor } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, Droplets, TrendingUp, AlertCircle, Truck, Fuel, Activity, Building2, DollarSign, ArrowDownLeft, Plus, X, Zap, CarFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSync } from '../lib/sync';
import { format } from 'date-fns';
import { AddDeliveryModal } from './Deliveries';
import { AddPaymentModal } from './Payments';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function Dashboard({ onNavigateToCustomer, onNavigateToTruck }: { onNavigateToCustomer?: (id: string) => void, onNavigateToTruck?: (reg: string) => void }) {
  const { updateLastSync } = useSync();
  const { customers, loading: custLoad } = useCustomers();
  const { deliveries, loading: delLoad } = useDeliveries();
  const { payments, loading: payLoad } = usePayments();
  const { expenses, loading: expLoad } = useFleetExpenses();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (!custLoad && !delLoad && !payLoad && !expLoad) {
      updateLastSync();
    }
  }, [custLoad, delLoad, payLoad, expLoad, updateLastSync]);

  useEffect(() => {
    // Optionally auto-seed once for the preview
    fetchSeedData().catch(console.error);
  }, []);

  // Compute combined recent activity
  const activities = useMemo(() => {
    const deliveryItems = deliveries.map(d => ({
      id: d.id,
      type: 'delivery' as const,
      date: d.date,
      customerId: d.customerId,
      amount: d.totalAmount,
      litres: d.litres,
      productType: d.productType,
      createdBy: d.createdBy
    }));

    const paymentItems = payments.map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.date,
      customerId: p.customerId,
      amount: p.amount,
      createdBy: p.createdBy
    }));

    return [...deliveryItems, ...paymentItems]
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);
  }, [deliveries, payments]);

  if (custLoad || delLoad || payLoad || expLoad) {
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
  const totalRevenue = deliveries.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
  const totalLitres = deliveries.reduce((acc, d) => acc + (d.litres || 0), 0);

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

  // Group deliveries by product for pie chart
  const fuelData = deliveries.reduce((acc, curr) => {
    const existing = acc.find(a => a.name === curr.productType);
    if (existing) existing.value += curr.litres;
    else acc.push({ name: curr.productType, value: curr.litres });
    return acc;
  }, [] as {name: string, value: number}[]);

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

  // Mock revenue trend (in reality, grouped by day/month from deliveries)
  // For simplicity, we just sequence them since this is an example
  const revTrend = [...deliveries].sort((a,b) => a.date - b.date).map(d => ({
    date: new Date(d.date).toLocaleDateString(undefined, {month: 'short', day:'numeric'}),
    Revenue: d.totalAmount
  }));

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="text-blue-600 dark:text-blue-400" />
          <MetricCard title="Total Outstanding Balance" value={formatCurrency(outstandingBalance)} icon={DollarSign} color={outstandingBalanceColor} />
          <MetricCard title="Total Fuel Sold" value={formatLitres(totalLitres)} icon={Droplets} color="text-green-600 dark:text-green-400" />
        </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Customers" value={activeCustomers.toString()} icon={Users} color="text-blue-600 dark:text-blue-400" />
        <MetricCard title="Active Trucks" value={new Set(expenses.map(e => e.carRegistration)).size.toString()} icon={Truck} color="text-blue-600 dark:text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Chart */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col transition-colors lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 tracking-wide">Revenue Trend</h2>
          <div className="h-[220px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Revenue" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
        
        {/* Customer Debt Overview */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col transition-colors lg:col-span-2">
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

        {/* Fuel Distribution */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-4 rounded shadow-sm flex flex-col items-center justify-center transition-colors">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 self-start tracking-wide">Fuel Distribution</h2>
          <div className="h-[180px] w-full text-xs flex justify-center">
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
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded shadow-sm flex flex-col transition-colors lg:col-span-3">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-blue-900 pb-3">
            <h2 className="text-base font-semibold text-gray-950 dark:text-blue-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Activity Feed
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
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4">Customer</th>
                  <th className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right">Volume</th>
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
                    const cust = customers.find(c => c.id === act.customerId);
                    const isDelivery = act.type === 'delivery';
                    
                    return (
                      <tr 
                        key={act.id} 
                        className="hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors text-base font-medium text-gray-900 dark:text-blue-100"
                      >
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {isDelivery ? (
                              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center" title="Delivery">
                                <Truck className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center" title="Payment">
                                <DollarSign className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${isDelivery ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-405'}`}>
                                {isDelivery ? 'Delivery' : 'Payment'}
                              </span>
                              {isDelivery && act.productType && (
                                <span className="text-xs text-gray-400 dark:text-blue-500 font-medium ml-1.5 uppercase font-mono">
                                  {act.productType}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-800" onClick={() => onNavigateToCustomer?.(act.customerId)}>
                          <div className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{cust?.name || 'Unknown Customer'}</div>
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right font-mono font-bold text-gray-600 dark:text-gray-400">
                          {isDelivery && act.litres ? formatLitres(act.litres) : '—'}
                        </td>
                        <td className="border border-gray-200 dark:border-blue-900 py-3 px-4 text-right font-mono font-bold text-gray-900 dark:text-blue-100">
                          <span className={isDelivery ? 'text-gray-900 dark:text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}>
                            {isDelivery ? '' : '+'}{formatCurrency(act.amount)}
                          </span>
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

      {/* Floating "Quick Actions" Menu */}
      <div id="quick-actions-container" className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {isMenuOpen && (
          <div id="quick-actions-menu" className="flex flex-col gap-2.5 items-end mb-1 animate-fade-in group">
            {/* Log Delivery Action */}
            <button
              id="quick-log-delivery"
              onClick={() => {
                setShowDeliveryModal(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm px-4.5 py-2.5 rounded-full shadow-lg shadow-blue-500/10 cursor-pointer transform hover:scale-105 active:scale-95 transition-all text-right border border-blue-400/20"
            >
              <Truck className="w-4 h-4" />
              <span>Log New Delivery</span>
            </button>

            {/* Log Payment Action */}
            <button
              id="quick-log-payment"
              onClick={() => {
                setShowPaymentModal(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm px-4.5 py-2.5 rounded-full shadow-lg shadow-emerald-500/10 cursor-pointer transform hover:scale-105 active:scale-95 transition-all text-right border border-emerald-400/20"
            >
              <DollarSign className="w-4 h-4" />
              <span>Log New Payment</span>
            </button>
          </div>
        )}

        {/* Main Toggle FAB */}
        <button
          id="quick-actions-fab"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ${
            isMenuOpen 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 rotate-45' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
          }`}
          title="Quick Actions Link"
        >
          {isMenuOpen ? <X className="w-6 h-6 animate-none" /> : <Plus className="w-6 h-6 animate-pulse" />}
        </button>
      </div>

      {/* Reusable modal triggers */}
      {showDeliveryModal && (
        <AddDeliveryModal 
          onClose={() => setShowDeliveryModal(false)} 
          customers={customers} 
        />
      )}
      {showPaymentModal && (
        <AddPaymentModal 
          onClose={() => setShowPaymentModal(false)} 
          customers={customers} 
        />
      )}
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
