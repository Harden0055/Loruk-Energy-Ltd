import React, { useMemo } from 'react';
import { useFuel, STATIONS } from '../context';
import { X, User, BarChart2, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface MiniDashboardProfileProps {
  onClose: () => void;
}

const COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6'];

export default function MiniDashboardProfile({ onClose }: MiniDashboardProfileProps) {
  const { pumpReadings, lpgTransactions, expenses, invoices } = useFuel();

  const stationData = useMemo(() => {
    return STATIONS.map(station => {
      const pReadings = pumpReadings.filter(r => r.station === station);
      const fuelRevenue = pReadings.reduce((sum, r) => sum + ((r.stopReading - r.startReading) * r.ratePerLitre), 0);
      const fuelLitres = pReadings.reduce((sum, r) => sum + (r.stopReading - r.startReading), 0);
      
      const lTransactions = lpgTransactions.filter(t => t.station === station);
      const lpgRevenue = lTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);

      const stExpenses = expenses.filter(e => e.station === station);
      const totalExp = stExpenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        name: station,
        fuelRevenue,
        fuelLitres,
        lpgRevenue,
        totalRevenue: fuelRevenue + lpgRevenue,
        expenses: totalExp,
        net: (fuelRevenue + lpgRevenue) - totalExp
      };
    });
  }, [pumpReadings, lpgTransactions, expenses]);

  const productData = useMemo(() => {
    const products: Record<string, { revenue: number, volume: number }> = {};
    
    pumpReadings.forEach(r => {
      if (!products[r.product]) products[r.product] = { revenue: 0, volume: 0 };
      products[r.product].revenue += ((r.stopReading - r.startReading) * r.ratePerLitre);
      products[r.product].volume += (r.stopReading - r.startReading);
    });

    lpgTransactions.filter(t => t.type === 'sale').forEach(t => {
      const prodName = t.item;
      if (!products[prodName]) products[prodName] = { revenue: 0, volume: 0 };
      products[prodName].revenue += t.amount;
      products[prodName].volume += 1; // 1 unit for LPG
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
    <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-[#1a1d36] h-full shadow-2xl flex flex-col border-l border-[#2d325a] animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-[#2d325a] flex items-center justify-between bg-[#1e223d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Profile & Summary Overview</h2>
              <p className="text-xs text-slate-400">Detailed station and product performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-[#2d325a] hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#2d325a]/30 p-4 rounded-xl border border-[#2d325a]">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              </div>
              <div className="text-xl font-bold text-cyan-400">Ksh {overallTotalRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-[#2d325a]/30 p-4 rounded-xl border border-[#2d325a]">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <BarChart2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
              </div>
              <div className="text-xl font-bold text-orange-400">Ksh {overallTotalExpenses.toLocaleString()}</div>
            </div>
            <div className="bg-[#2d325a]/30 p-4 rounded-xl border border-[#2d325a]">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Net Position</span>
              </div>
              <div className={`text-xl font-bold ${overallNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Ksh {overallNetProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Station Performance Chart */}
          <div className="bg-[#2d325a]/20 p-5 rounded-xl border border-[#2d325a]">
            <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">Station Revenue vs Expenses</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d325a" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `Ksh ${v/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f8fafc', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Performance Chart */}
          <div className="bg-[#2d325a]/20 p-5 rounded-xl border border-[#2d325a]">
            <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">Revenue by Product</h3>
            <div className="h-64 flex items-center justify-center">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                    >
                      {productData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f8fafc', borderRadius: '8px' }}
                      formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500">No product data available</div>
              )}
            </div>
          </div>

          {/* Detailed Station Table */}
          <div className="bg-[#2d325a]/20 rounded-xl border border-[#2d325a] overflow-hidden">
            <div className="p-4 border-b border-[#2d325a] bg-[#1e223d]">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Station Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1a1d36]">
                  <tr>
                    <th className="p-3 text-slate-400 font-medium">Station</th>
                    <th className="p-3 text-slate-400 font-medium text-right">Fuel Rev.</th>
                    <th className="p-3 text-slate-400 font-medium text-right">LPG Rev.</th>
                    <th className="p-3 text-slate-400 font-medium text-right">Expenses</th>
                    <th className="p-3 text-slate-400 font-medium text-right">Net Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d325a]">
                  {stationData.map(st => (
                    <tr key={st.name} className="hover:bg-[#2d325a]/50 transition-colors">
                      <td className="p-3 text-slate-200 font-medium">{st.name}</td>
                      <td className="p-3 text-right text-slate-300">Ksh {st.fuelRevenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-300">Ksh {st.lpgRevenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-orange-400">Ksh {st.expenses.toLocaleString()}</td>
                      <td className={`p-3 text-right font-bold ${st.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Ksh {st.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
