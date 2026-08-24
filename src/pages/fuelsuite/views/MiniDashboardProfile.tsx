import React, { useMemo } from 'react';
import { useFuel } from '../context';
import { X, User, BarChart2, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface MiniDashboardProfileProps {
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

const COLORS = ['#3B82F6', '#00D4FF', '#60A5FA', '#38BDF8', '#22C55E'];

export default function MiniDashboardProfile({ onClose, onNavigate }: MiniDashboardProfileProps) {
  const { pumpReadings, lpgTransactions, inventoryItems, products, expenses, stations} = useFuel();

  const stationData = useMemo(() => {
    return stations.map(station => { const name = station.name; return name; }).map(station => {
      const pReadings = pumpReadings.filter(r => r.station === station);
      
      const superReadings = pReadings.filter(r => r.product.toLowerCase().includes('super'));
      const superLitres = superReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
      const superSales = superReadings.reduce((sum, r) => sum + ((r.salesStop || 0) - (r.salesStart || 0)), 0);
      
      const dieselReadings = pReadings.filter(r => r.product.toLowerCase().includes('diesel'));
      const dieselLitres = dieselReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
      const dieselSales = dieselReadings.reduce((sum, r) => sum + ((r.salesStop || 0) - (r.salesStart || 0)), 0);
      
      const fuelRevenue = pReadings.reduce((sum, r) => sum + ((r.salesStop || 0) - (r.salesStart || 0)), 0);
      const fuelLitres = pReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
      
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
    const products: Record<string, { revenue: number, volume: number }> = {};
    
    pumpReadings.forEach(r => {
      if (!products[r.product]) products[r.product] = { revenue: 0, volume: 0 };
      products[r.product].revenue += ((r.salesStop || 0) - (r.salesStart || 0));
      products[r.product].volume += (r.litresStop - r.litresStart);
    });

    lpgTransactions.filter(t => t.type === 'sale').forEach(t => {
      const prodName = t.item;
      if (!products[prodName]) products[prodName] = { revenue: 0, volume: 0 };
      products[prodName].revenue += t.amount;
      products[prodName].volume += 1; 
    });

    return Object.entries(products).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      volume: data.volume
    })).sort((a, b) => b.revenue - a.revenue);
  }, [pumpReadings, lpgTransactions]);

  const overallTotalRevenue = stationData.reduce((sum, s) => sum + s.totalRevenue, 0);
  const overallTotalExpenses = stationData.reduce((sum, s) => sum + s.expenses, 0);
  const overallNetProfit = overallTotalRevenue - overallTotalExpenses;

  return (
    <div className="fixed inset-0 bg-[#00000095]  z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-[#0E0E11] h-full shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col border-l border-white/5 animate-in slide-in-from-right duration-300">
        
        <svg className="absolute w-0 h-0" width="0" height="0">
          <defs>
            <linearGradient id="profilePurpleBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
          </defs>
        </svg>

        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#09090B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/35 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <User className="w-5 h-5 text-[#00D4FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Profile & Summary Overview</h2>
              <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-mono">Detailed station and product performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#A1A1AA] hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all">
              <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" />
                Revenue
              </div>
              <div className="text-base xl:text-lg font-bold text-white tracking-tight">Ksh {overallTotalRevenue.toLocaleString()}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all">
              <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#F59E0B]" />
                Expenses
              </div>
              <div className="text-base xl:text-lg font-bold text-white tracking-tight">Ksh {overallTotalExpenses.toLocaleString()}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-28 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all">
              <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#22C55E]" />
                Net Position
              </div>
              <div className={`text-base xl:text-lg font-bold tracking-tight ${overallNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Ksh {overallNetProfit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase mb-2">White Oils</h4>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Super</p>
                  <p className="text-xs text-white">{stationData.reduce((sum, s) => sum + s.superLitres, 0).toLocaleString()} L</p>
                  <p className="text-xs text-cyan-400">Ksh {stationData.reduce((sum, s) => sum + s.superSales, 0).toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Diesel</p>
                  <p className="text-xs text-white">{stationData.reduce((sum, s) => sum + s.dieselLitres, 0).toLocaleString()} L</p>
                  <p className="text-xs text-cyan-400">Ksh {stationData.reduce((sum, s) => sum + s.dieselSales, 0).toLocaleString()}</p>
               </div>
               <div className="col-span-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Combined Total</p>
                  <p className="text-xs text-white font-bold">{stationData.reduce((sum, s) => sum + s.fuelLitres, 0).toLocaleString()} L / Ksh {stationData.reduce((sum, s) => sum + s.fuelRevenue, 0).toLocaleString()}</p>
               </div>
            </div>
            <button onClick={() => onNavigate('WhiteOilsProfit')} className="flex items-center gap-1 text-[10px] text-[#3B82F6] hover:text-[#00D4FF] font-bold uppercase tracking-wider mt-2">
              View Profit Profile <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <h4 className="text-xs font-bold text-[#A1A1AA] uppercase mb-2">LPG</h4>
              <p className="text-xs text-white">Sales: Ksh {stationData.reduce((sum, s) => sum + s.lpgSales, 0).toLocaleString()}</p>
              <p className="text-xs text-[#A1A1AA]">Purchases: Ksh {stationData.reduce((sum, s) => sum + s.lpgPurchases, 0).toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <h4 className="text-xs font-bold text-[#A1A1AA] uppercase mb-2">Accessories</h4>
              <p className="text-xs text-white">Sales: Ksh {stationData.reduce((sum, s) => sum + s.accSales, 0).toLocaleString()}</p>
              <p className="text-xs text-[#A1A1AA]">Purchases: Ksh {stationData.reduce((sum, s) => sum + s.accPurchases, 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Station Performance Chart */}
          <div className="glass-panel p-5 rounded-[20px]">
            <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" />
              Station Revenue vs Expenses
            </h3>
            <div className="h-56 relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                <BarChart data={stationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717A" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={v => `Ksh ${v/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF', borderRadius: '12px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="url(#profilePurpleBlue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Performance Chart */}
          <div className="glass-panel p-5 rounded-[20px]">
            <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" />
              Revenue by Product
            </h3>
            <div className="h-56 w-full relative overflow-hidden flex items-center justify-center">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                      stroke="none"
                    >
                      {productData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF', borderRadius: '12px' }}
                      formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[#71717A] font-semibold text-xs">No product data available</div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
