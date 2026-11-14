import React, { useMemo, useState } from 'react';
import { useFleetExpenses, useTrucks } from '../lib/db';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { CarFront, TrendingUp, Route, Gauge, Fuel, MapPin, Award, CheckCircle2, Download } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart,
  Area
} from 'recharts';

const FALLBACK_REGISTRATIONS = [
  'KDE 179Y',
  'KDL 019S',
  'KCY 842Y',
  'KCF 119R',
  'KDW 028Y'
];

const FLEET_PRODUCTS = ['Diesel', 'Premium', 'Engine Oil', 'Brake Fluid', 'Greasing'] as const;

export default function TruckDashboard({ 
  truckReg, 
  onNavigateToTruck, 
  onBack,
  onNavigateToStation
}: { 
  truckReg?: string | null;
  onNavigateToTruck?: (reg: string) => void;
  onBack?: () => void;
  onNavigateToStation?: (id: string, name: string) => void;
}) {
  const { expenses: allExpenses } = useFleetExpenses();
  const { trucks } = useTrucks();
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const CAR_REGISTRATIONS = useMemo(() => {
    return trucks.length > 0 ? trucks.map(t => t.registration) : FALLBACK_REGISTRATIONS;
  }, [trucks]);

  const expenses = useMemo(() => {
    return truckReg ? allExpenses.filter(e => e.carRegistration === truckReg) : allExpenses;
  }, [allExpenses, truckReg]);

  const displayedExpenses = useMemo(() => {
    if (selectedProduct === 'all') return expenses;
    const target = selectedProduct.toLowerCase().trim();
    return expenses.filter(e => (e.product || 'Diesel').toLowerCase().trim() === target);
  }, [expenses, selectedProduct]);

  const totalExpense = displayedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLitres = displayedExpenses.reduce((sum, e) => sum + (e.litres || 0), 0);

  // Per-station fuel consumption summary for this truck
  const stationFuelData = useMemo(() => {
    const map = new Map<string, { name: string; litres: number; amount: number }>();
    for (const e of displayedExpenses) {
      const name = (e.station || '').trim() || 'Unknown Station';
      const key = name.toLowerCase();
      const cur = map.get(key) || { name, litres: 0, amount: 0 };
      cur.litres += e.litres || 0;
      cur.amount += e.amount || 0;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.litres - a.litres);
  }, [displayedExpenses]);

  // Per-station badge colors (same palette as Fleet Consumption Logs):
  // Bungoma = indigo, Ndalu = violet, Junction = purple, Kapenguria = green,
  // everyone else gets a slightly different shade of green (deterministic).
  const getStationBadgeStyle = (stationName: string) => {
    const s = (stationName || '').toLowerCase();
    if (s.includes('bungoma')) return 'bg-indigo-500/15 text-indigo-400 border border-transparent hover:border-indigo-400/40';
    if (s.includes('ndalu')) return 'bg-violet-500/15 text-violet-400 border border-transparent hover:border-violet-400/40';
    if (s.includes('junction')) return 'bg-purple-500/15 text-purple-400 border border-transparent hover:border-purple-400/40';
    if (s.includes('kapenguria')) return 'bg-emerald-500/15 text-emerald-400 border border-transparent hover:border-emerald-400/40';
    const greens = [
      'bg-emerald-500/15 text-emerald-400 border border-transparent hover:border-emerald-400/40',
      'bg-emerald-600/15 text-emerald-500 border border-transparent hover:border-emerald-500/40',
      'bg-green-500/15 text-green-400 border border-transparent hover:border-green-400/40',
      'bg-emerald-400/15 text-emerald-300 border border-transparent hover:border-emerald-300/40',
      'bg-green-600/15 text-green-500 border border-transparent hover:border-green-500/40',
    ];
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return greens[hash % greens.length];
  };

  const vehicleSpendData = useMemo(() => {
    return CAR_REGISTRATIONS.map(car => {
      // Use allExpenses to compare all vehicles
      const carExpenses = allExpenses.filter(e => e.carRegistration === car);
      const amount = carExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: car,
        amount,
        isCurrent: car === truckReg
      };
    });
  }, [allExpenses, truckReg]);

  const timelineChartData = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => a.date - b.date);
    const grouped: { [key: string]: { dateStr: string; amount: number } } = {};
    
    sorted.forEach(e => {
        const dateStr = format(e.date, 'MMM dd');
        if (!grouped[dateStr]) grouped[dateStr] = { dateStr, amount: 0 };
        grouped[dateStr].amount += e.amount;
    });

    return Object.values(grouped).slice(-10);
  }, [expenses]);

  const getProductBadgeStyle = (productName?: string) => {
    const p = (productName || 'Diesel').toLowerCase();
    if (p.includes('engine oil')) {
      return 'bg-[#6366F1]/15 text-[#818CF8] border border-transparent hover:border-[#818CF8]/40';
    }
    if (p.includes('brake fluid')) {
      return 'bg-amber-500/15 text-amber-300 border border-transparent hover:border-amber-400/40';
    }
    if (p.includes('greasing')) {
      return 'bg-cyan-500/15 text-cyan-300 border border-transparent hover:border-cyan-400/40';
    }
    if (p.includes('premium') || p.includes('super')) {
      return 'bg-teal-500/15 text-teal-300 border border-transparent hover:border-teal-400/40';
    }
    return 'bg-emerald-500/15 text-emerald-400 border border-transparent hover:border-emerald-400/40';
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans p-2">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="px-3 py-1.5 glass-panel hover:bg-white/5 dark:hover:bg-blue-900 border border-theme-border text-theme-text-muted text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              title="Go Back"
            >
              &larr; Back
            </button>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">Truck Fleet Performance Dashboard</h2>
        </div>
        <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
           <Download className="w-4 h-4" /> Export Report
        </button>
      </div>
      
       {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel border border-transparent hover:border-[#6366F1]/50 bg-[#4338CA]/[0.03] p-5 rounded-xl transition-colors">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Spent</p>
           <h3 className="text-2xl font-black font-mono text-[#4338CA] mt-2">{formatCurrency(totalExpense)}</h3>
        </div>
        <div className="glass-panel border border-transparent hover:border-emerald-400/50 bg-emerald-500/[0.03] p-5 rounded-xl transition-colors">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Litres</p>
           <h3 className="text-2xl font-black font-mono text-[#059669] mt-2">{totalLitres.toLocaleString()} <span className="text-xs font-sans font-bold">L</span></h3>
        </div>
        <div className="glass-panel border border-transparent hover:border-emerald-400/50 bg-emerald-500/[0.03] p-5 rounded-xl sm:col-span-2 lg:col-span-2 transition-colors">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fuel Consumed by Station</p>
           {stationFuelData.length === 0 ? (
             <p className="text-xs text-theme-text-muted py-2">No fuel consumed yet.</p>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
               {stationFuelData.map(st => (
                 <div key={st.name}>
                   <div className="flex items-center justify-between gap-2">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold truncate transition-all cursor-default ${getStationBadgeStyle(st.name)}`}>
                       {st.name}
                     </span>
                     <span className="font-mono text-sm font-bold text-emerald-400 whitespace-nowrap">
                       {st.litres.toLocaleString('en-US', { maximumFractionDigits: 2 })} L
                     </span>
                   </div>
                   <div className="h-1 mt-1.5 rounded-full bg-white/5 overflow-hidden">
                     <div
                       className="h-full rounded-full bg-emerald-500/60 transition-all"
                       style={{ width: `${totalLitres > 0 ? Math.max(2, (st.litres / totalLitres) * 100) : 0}%` }}
                     />
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel border border-[#4338CA]/30 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4 text-[#4338CA]">Fuel Spend by Vehicle</h3>
            <div className="h-56 relative overflow-hidden" >
                <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                    <BarChart data={vehicleSpendData}>
                        <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} />
                        <YAxis stroke="#9ca3af" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', color: '#f3f4f6', border: '1px solid rgba(67, 56, 202,0.4)', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [formatCurrency(value), 'Spend']} 
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {vehicleSpendData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isCurrent ? "#059669" : "#4338CA"} />
                          ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="glass-panel border border-[#4338CA]/30 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4 text-[#059669]">Expenditure Trend</h3>
            <div className="h-56 relative overflow-hidden" >
                <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                    <AreaChart data={timelineChartData}>
                        <XAxis dataKey="dateStr" stroke="#9ca3af" tickLine={false} />
                        <YAxis stroke="#9ca3af" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', color: '#f3f4f6', border: '1px solid rgba(5,150,105,0.4)', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [formatCurrency(value), 'Expenditure']}
                        />
                        <Area dataKey="amount" fill="rgba(67, 56, 202,0.35)" stroke="#4338CA" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
       </div>

       <div className="glass-panel rounded-xl border border-theme-border overflow-hidden mt-6 shadow-[0_0_15px_rgba(79, 70, 229,0.15)]">
        <div className="p-3.5 border-b border-theme-border flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-200">Historic Fueling & Expenses</h3>
            <span className="text-xs font-mono text-slate-400">
              ({displayedExpenses.length} {displayedExpenses.length === 1 ? 'log' : 'logs'})
            </span>
            {selectedProduct !== 'all' && (
              <span className="text-[10px] font-semibold text-slate-100 bg-[#4338CA]/15 border border-[#4338CA]/30 px-2 py-0.5 rounded">
                Viewing {selectedProduct} Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Filter by Product:</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-2.5 py-1 bg-black border border-[#4338CA]/40 rounded-lg text-xs font-bold text-[#4338CA] focus:outline-none focus:ring-1 focus:ring-[#4338CA] shadow-sm cursor-pointer"
              >
                <option value="all" className="bg-black text-slate-200">All Products ({expenses.length})</option>
                {FLEET_PRODUCTS.map((prod) => {
                  const count = expenses.filter(e => (e.product || 'Diesel').toLowerCase().trim() === prod.toLowerCase().trim()).length;
                  return (
                    <option key={`td-prod-${prod}`} value={prod} className="bg-black text-slate-200">
                      {prod} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedProduct('all')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedProduct === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-theme-border'
                }`}
              >
                All
              </button>
              {FLEET_PRODUCTS.map((p) => {
                const isSelected = selectedProduct.toLowerCase().trim() === p.toLowerCase().trim();
                return (
                  <button
                    key={`td-btn-${p}`}
                    type="button"
                    onClick={() => setSelectedProduct(isSelected ? 'all' : p)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-theme-border'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {selectedProduct !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedProduct('all')}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="modern-tr">
                <th className="modern-th">Date</th>
                <th className="modern-th">Car Reg</th>
                <th className="modern-th">Station</th>
                <th className="modern-th">Product</th>
                <th className="modern-th">Litres / Qty</th>
                <th className="modern-th">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    No transactions found for product <span className="font-bold text-indigo-300">"{selectedProduct}"</span>.
                    <button
                      type="button"
                      onClick={() => setSelectedProduct('all')}
                      className="ml-2 text-indigo-400 hover:underline cursor-pointer font-semibold"
                    >
                      Clear filter
                    </button>
                  </td>
                </tr>
              ) : (
                [...displayedExpenses].sort((a, b) => b.date - a.date).map(e => {
                  const stationClass = getStationBadgeStyle(e.station);

                  return (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="modern-td">{format(e.date, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 font-semibold text-[#4338CA] hover:text-indigo-300 cursor-pointer hover:underline font-bold transition-colors" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                      <td className="modern-td">
                        {e.station && (
                          <button
                            type="button"
                            onClick={() => onNavigateToStation?.(e.station, e.station)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${stationClass}`}
                            title={`Open ${e.station} Dashboard`}
                          >
                            <span>{e.station}</span>
                          </button>
                        )}
                      </td>
                      <td className="modern-td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${getProductBadgeStyle(e.product)}`}>
                          {e.product || 'Diesel'}
                        </span>
                      </td>
                      <td className="modern-td">{e.litres ? `${e.litres.toLocaleString()} ${e.product === 'Greasing' ? 'serv' : 'L'}` : '-'}</td>
                      <td className="modern-td">
                        <span className="!text-[#4338CA] font-mono font-bold text-base tabular-nums">{formatCurrency(e.amount)}</span>
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

