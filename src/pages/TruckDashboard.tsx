import React, { useMemo } from 'react';
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
  CartesianGrid, 
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';

const FALLBACK_REGISTRATIONS = [
  'KDE 179Y',
  'KDL 019S',
  'KCY 842Y',
  'KCF 119R',
  'KDW 028Y'
];

export default function TruckDashboard({ truckReg, onNavigateToTruck, onBack }: { truckReg?: string | null, onNavigateToTruck?: (reg: string) => void, onBack?: () => void }) {
  const { expenses: allExpenses } = useFleetExpenses();
  const { trucks } = useTrucks();

  const CAR_REGISTRATIONS = useMemo(() => {
    return trucks.length > 0 ? trucks.map(t => t.registration) : FALLBACK_REGISTRATIONS;
  }, [trucks]);

  const expenses = useMemo(() => {
    return truckReg ? allExpenses.filter(e => e.carRegistration === truckReg) : allExpenses;
  }, [allExpenses, truckReg]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLitres = expenses.reduce((sum, e) => sum + (e.litres || 0), 0);
  const activeTrucksCount = new Set(expenses.map(e => e.carRegistration)).size;
  const avgCostPerLitre = totalLitres > 0 ? totalExpense / totalLitres : 0;

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

  const efficiencyTrendData = useMemo(() => {
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = expenses.filter(e => e.date >= last30Days);
    const groups: Record<string, { totalLitres: number, totalAmount: number }> = {};
    recent.forEach(e => {
      const d = format(e.date, 'MMM dd');
      if (!groups[d]) groups[d] = { totalLitres: 0, totalAmount: 0 };
      groups[d].totalLitres += e.litres || 0;
      groups[d].totalAmount += e.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({
      date,
      efficiency: data.totalAmount > 0 ? data.totalLitres / data.totalAmount : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

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
        <button className="bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
           <Download className="w-4 h-4" /> Export Report
        </button>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel border border-theme-border p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Spent</p>
           <h3 className="text-2xl font-black font-mono text-cyan-500 dark:text-blue-400 mt-2">{formatCurrency(totalExpense)}</h3>
        </div>
        <div className="glass-panel border border-theme-border p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Litres</p>
           <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">{totalLitres.toLocaleString()} <span className="text-xs font-sans font-bold">L</span></h3>
        </div>
        <div className="glass-panel border border-theme-border p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg Fuel Cost</p>
           <h3 className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-2">{avgCostPerLitre > 0 ? `${formatCurrency(avgCostPerLitre)}/L` : 'N/A'}</h3>
        </div>
        <div className="glass-panel border border-theme-border p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Fleet</p>
           <h3 className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">{activeTrucksCount} <span className="text-xs font-sans font-bold">Trucks</span></h3>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel border p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4">Fuel Spend by Vehicle</h3>
            <div className="h-64 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={vehicleSpendData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="amount">
                          {vehicleSpendData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isCurrent ? "#93c5fd" : "#1e40af"} />
                          ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="glass-panel border p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4">Expenditure Trend</h3>
            <div className="h-64 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={timelineChartData}>
                        <XAxis dataKey="dateStr" />
                        <YAxis />
                        <Tooltip />
                        <Area dataKey="amount" fill="#2563eb" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="glass-panel border p-5 rounded-xl lg:col-span-2">
            <h3 className="font-bold text-lg mb-4">Fuel Efficiency Trend (L/KES)</h3>
            <div className="h-64 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={efficiencyTrendData}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
       </div>

       <div className="glass-panel rounded border overflow-hidden mt-6">
        <h3 className="font-bold text-lg p-4 border-b">Historic Fueling</h3>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="modern-tr">
                <th className="modern-th">Date</th>
                <th className="modern-th">Car Reg</th>
                <th className="modern-th">Station</th>
                <th className="modern-th">Litres</th>
                <th className="modern-th">Amount</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-blue-900">
            {expenses.sort((a, b) => b.date - a.date).map(e => {
              const badgeClass = e.station === 'Gel - Bungoma' ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200' 
                                : e.station === 'Gel - Kapenguria' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                                : e.station === 'Kengas' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                                : '';
              
              return (
                <tr key={e.id} className="hover:bg-white/5 dark:hover:bg-blue-800/10">
                  <td className="modern-td">{format(e.date, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-semibold text-cyan-500 dark:text-blue-400 cursor-pointer hover:underline glow-blue-text" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                  <td className="modern-td">
                    {e.station && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                        {e.station}
                      </span>
                    )}
                  </td>
                  <td className="modern-td">{e.litres ? `${e.litres.toLocaleString()} L` : '-'}</td>
                  <td className="modern-td">{formatCurrency(e.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

