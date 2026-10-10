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
        <div className="glass-panel border border-purple-500/25 bg-purple-500/[0.03] p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Spent</p>
           <h3 className="text-2xl font-black font-mono text-[#7C3AED] mt-2">{formatCurrency(totalExpense)}</h3>
        </div>
        <div className="glass-panel border border-emerald-500/25 bg-emerald-500/[0.03] p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Litres</p>
           <h3 className="text-2xl font-black font-mono text-[#059669] mt-2">{totalLitres.toLocaleString()} <span className="text-xs font-sans font-bold">L</span></h3>
        </div>
        <div className="glass-panel border border-purple-500/25 bg-purple-500/[0.03] p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg Fuel Cost</p>
           <h3 className="text-2xl font-black font-mono text-[#7C3AED] mt-2">{avgCostPerLitre > 0 ? `${formatCurrency(avgCostPerLitre)}/L` : 'N/A'}</h3>
        </div>
        <div className="glass-panel border border-emerald-500/25 bg-emerald-500/[0.03] p-5 rounded-xl">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Fleet</p>
           <h3 className="text-2xl font-black font-mono text-[#059669] mt-2">{activeTrucksCount} <span className="text-xs font-sans font-bold">Trucks</span></h3>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel border border-purple-500/20 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4 text-[#7C3AED]">Fuel Spend by Vehicle</h3>
            <div className="h-56 relative overflow-hidden" >
                <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                    <BarChart data={vehicleSpendData}>
                        <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} />
                        <YAxis stroke="#9ca3af" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', color: '#f3f4f6', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [formatCurrency(value), 'Spend']} 
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {vehicleSpendData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isCurrent ? "#059669" : "#7C3AED"} />
                          ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="glass-panel border border-purple-500/20 p-5 rounded-xl">
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
                        <Area dataKey="amount" fill="rgba(124,58,237,0.35)" stroke="#7C3AED" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
       </div>

       <div className="glass-panel rounded border border-theme-border overflow-hidden mt-6 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
        <h3 className="font-bold text-lg p-4 border-b border-theme-border">Historic Fueling</h3>
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
          <tbody className="divide-y divide-white/5">
            {expenses.sort((a, b) => b.date - a.date).map(e => {
              const s = (e.station || '').toLowerCase();
              let stationClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
              if (s.includes('kapenguria')) {
                stationClass = 'bg-[#059669]/20 text-[#059669] border-[#059669]/40';
              } else if (s.includes('bungoma')) {
                stationClass = 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/40';
              } else if (s.includes('ndalu') || s.includes('junction')) {
                stationClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
              }
              
              return (
                <tr key={e.id} className="hover:bg-white/5 transition-colors">
                  <td className="modern-td">{format(e.date, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-semibold text-[#7C3AED] hover:text-purple-300 cursor-pointer hover:underline font-bold transition-colors" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                  <td className="modern-td">
                    {e.station && (
                      <button
                        type="button"
                        onClick={() => onNavigateToStation?.(e.station, e.station)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${stationClass}`}
                        title={`Open ${e.station} Dashboard`}
                      >
                        <span>{e.station}</span>
                      </button>
                    )}
                  </td>
                  <td className="modern-td">{e.litres ? `${e.litres.toLocaleString()} L` : '-'}</td>
                  <td className="modern-td"><span className="!text-[#7C3AED] font-mono font-bold text-base">{formatCurrency(e.amount)}</span></td>
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

