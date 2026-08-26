import React, { useMemo } from 'react';
import { useFuel, calculatePumpMeterDelta } from '../context';
import { X, User, BarChart2, TrendingUp, DollarSign, ArrowRight, Building2, Fuel, Flame, Box, ShieldCheck, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface MiniDashboardProfileProps {
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

const COLORS = ['#06B6D4', '#3B82F6', '#F97316', '#10B981', '#A855F7'];

export default function MiniDashboardProfile({ onClose, onNavigate }: MiniDashboardProfileProps) {
  const { pumpReadings, lpgTransactions, inventoryItems, products, expenses, stations } = useFuel();

  const stationData = useMemo(() => {
    return stations.map(station => station.name).map(station => {
      const pReadings = pumpReadings.filter(r => r.station === station);
      
      const superReadings = pReadings.filter(r => r.product.toLowerCase().includes('super'));
      const superLitres = superReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.litresStart, r.litresStop), 0);
      const superSales = superReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.salesStart, r.salesStop), 0);
      
      const dieselReadings = pReadings.filter(r => r.product.toLowerCase().includes('diesel'));
      const dieselLitres = dieselReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.litresStart, r.litresStop), 0);
      const dieselSales = dieselReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.salesStart, r.salesStop), 0);
      
      const fuelRevenue = pReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.salesStart, r.salesStop), 0);
      const fuelLitres = pReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.litresStart, r.litresStop), 0);
      
      const lTransactions = lpgTransactions.filter(t => t.station === station);
      const lpgSales = lTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const lpgPurchases = lTransactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);

      const accProducts = products.filter(p => p.category === 'Accessories').map(p => p.name);
      const accSales = inventoryItems.filter(i => i.station === station && i.type === 'out' && accProducts.includes(i.item)).reduce((sum, i) => sum + i.amount, 0);
      const accPurchases = inventoryItems.filter(i => i.station === station && i.type === 'in' && accProducts.includes(i.item)).reduce((sum, i) => sum + i.amount, 0);

      const stExpenses = expenses.filter(e => e.station === station);
      const totalExp = stExpenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        name: station,
        fuelRevenue,
        fuelLitres,
        superLitres,
        superSales,
        dieselLitres,
        dieselSales,
        lpgSales,
        lpgPurchases,
        accSales,
        accPurchases,
        totalRevenue: fuelRevenue + lpgSales + accSales,
        expenses: totalExp,
        net: (fuelRevenue + lpgSales + accSales) - totalExp
      };
    });
  }, [pumpReadings, lpgTransactions, inventoryItems, products, expenses, stations]);

  const productData = useMemo(() => {
    const productsMap: Record<string, { revenue: number, volume: number }> = {};
    
    pumpReadings.forEach(r => {
      if (!productsMap[r.product]) productsMap[r.product] = { revenue: 0, volume: 0 };
      productsMap[r.product].revenue += calculatePumpMeterDelta(r.salesStart, r.salesStop);
      productsMap[r.product].volume += calculatePumpMeterDelta(r.litresStart, r.litresStop);
    });

    lpgTransactions.filter(t => t.type === 'sale').forEach(t => {
      const prodName = t.item;
      if (!productsMap[prodName]) productsMap[prodName] = { revenue: 0, volume: 0 };
      productsMap[prodName].revenue += t.amount;
      productsMap[prodName].volume += 1; 
    });

    return Object.entries(productsMap).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      volume: data.volume
    })).sort((a, b) => b.revenue - a.revenue);
  }, [pumpReadings, lpgTransactions]);

  const overallTotalRevenue = stationData.reduce((sum, s) => sum + s.totalRevenue, 0);
  const overallTotalExpenses = stationData.reduce((sum, s) => sum + s.expenses, 0);
  const overallNetProfit = overallTotalRevenue - overallTotalExpenses;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-[#090A0F] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-300">
        
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B0D14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Station Performance Overview</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Consolidated station & product audit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 border border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
                Total Revenue
              </div>
              <div className="text-base xl:text-lg font-extrabold text-white tracking-tight font-mono">KES {overallTotalRevenue.toLocaleString()}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 border border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#FB7185]" />
                Expenses
              </div>
              <div className="text-base xl:text-lg font-extrabold text-white tracking-tight font-mono">KES {overallTotalExpenses.toLocaleString()}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 border border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                Net Position
              </div>
              <div className={`text-base xl:text-lg font-extrabold tracking-tight font-mono ${overallNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                KES {overallNetProfit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-3.5 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Fuel className="w-4 h-4 text-cyan-400" />
                White Oils Volume & Value
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
               <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-[10px] text-cyan-400 font-bold uppercase">Super Petrol</p>
                  <p className="text-xs font-bold text-white mt-1">{stationData.reduce((sum, s) => sum + s.superLitres, 0).toLocaleString()} L</p>
                  <p className="text-xs font-mono font-bold text-cyan-400">KES {stationData.reduce((sum, s) => sum + s.superSales, 0).toLocaleString()}</p>
               </div>
               <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-[10px] text-blue-400 font-bold uppercase">Automotive Diesel</p>
                  <p className="text-xs font-bold text-white mt-1">{stationData.reduce((sum, s) => sum + s.dieselLitres, 0).toLocaleString()} L</p>
                  <p className="text-xs font-mono font-bold text-blue-400">KES {stationData.reduce((sum, s) => sum + s.dieselSales, 0).toLocaleString()}</p>
               </div>
               <div className="col-span-2 p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Combined Station Volume</p>
                    <p className="text-xs text-white font-extrabold font-mono mt-0.5">{stationData.reduce((sum, s) => sum + s.fuelLitres, 0).toLocaleString()} Litres</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Value</p>
                    <p className="text-xs text-cyan-400 font-extrabold font-mono mt-0.5">KES {stationData.reduce((sum, s) => sum + s.fuelRevenue, 0).toLocaleString()}</p>
                  </div>
               </div>
            </div>
            {onNavigate && (
              <button onClick={() => onNavigate('WhiteOilsProfit')} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider mt-2 cursor-pointer transition-colors">
                View White Oils Detailed Log <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-400 uppercase">
                <Flame className="w-4 h-4 text-orange-400" />
                LPG Operations
              </div>
              <p className="text-xs font-semibold text-white">Sales: <span className="font-mono text-orange-400">KES {stationData.reduce((sum, s) => sum + s.lpgSales, 0).toLocaleString()}</span></p>
              <p className="text-xs font-semibold text-slate-400 mt-1">Purchases: <span className="font-mono">KES {stationData.reduce((sum, s) => sum + s.lpgPurchases, 0).toLocaleString()}</span></p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-400 uppercase">
                <Box className="w-4 h-4 text-emerald-400" />
                Accessories Stock
              </div>
              <p className="text-xs font-semibold text-white">Sales: <span className="font-mono text-emerald-400">KES {stationData.reduce((sum, s) => sum + s.accSales, 0).toLocaleString()}</span></p>
              <p className="text-xs font-semibold text-slate-400 mt-1">Purchases: <span className="font-mono">KES {stationData.reduce((sum, s) => sum + s.accPurchases, 0).toLocaleString()}</span></p>
            </div>
          </div>

          {/* Station Performance Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
              Station Revenue vs Expenses Comparison
            </h3>
            <div className="h-56 relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={stationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={v => `KES ${v/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0B0D14', borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', borderRadius: '12px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Performance Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818CF8]" />
              Revenue Share by Product
            </h3>
            <div className="h-56 w-full relative overflow-hidden flex items-center justify-center">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="revenue"
                      stroke="none"
                    >
                      {productData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0B0D14', borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', borderRadius: '12px' }}
                      formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 font-medium text-xs">No product data available</div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
