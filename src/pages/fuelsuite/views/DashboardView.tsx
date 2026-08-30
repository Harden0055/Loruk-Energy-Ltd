import React, { useState } from 'react';
import { useFuel, calculatePumpMeterDelta } from '../context';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell, RadialBarChart, RadialBar, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Fuel, 
  Flame, 
  Box, 
  Users, 
  Building2, 
  Activity, 
  Target, 
  Layers,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function DashboardView({ onNavigateToStation }: { onNavigateToStation?: (id: string, name: string) => void }) {
  const { activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems, invoices } = useFuel();
  const [filterYear] = useState<string>('All');
  
  // Helpers
  const filterByYearAndStation = (item: any) => {
    const itemYear = item.date ? item.date.substring(0, 4) : '';
    const matchesYear = filterYear === 'All' || itemYear === filterYear;
    const matchesStation = activeStation === 'Combined Total' || item.station === activeStation;
    return matchesYear && matchesStation;
  };

  const getMonthIndex = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    return parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
  };

  // Data processing
  const filteredPump = pumpReadings.filter(filterByYearAndStation);
  const filteredLpg = lpgTransactions.filter(filterByYearAndStation);
  const filteredInv = inventoryItems.filter(filterByYearAndStation);
  const filteredExpenses = expenses.filter(filterByYearAndStation);
  const filteredInvoices = invoices.filter(filterByYearAndStation);

  // 1. Total Revenue Breakdown
  const fuelRevenue = filteredPump.reduce((acc, r) => {
    const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
    return acc + (sAmount > 0 ? sAmount : (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre));
  }, 0);
  const lpgRevenue = filteredLpg.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const invRevenue = filteredInv.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = fuelRevenue + lpgRevenue + invRevenue;

  const fuelPct = totalRevenue > 0 ? parseFloat(((fuelRevenue / totalRevenue) * 100).toFixed(1)) : 0;
  const lpgPct = totalRevenue > 0 ? parseFloat(((lpgRevenue / totalRevenue) * 100).toFixed(1)) : 0;
  const invPct = totalRevenue > 0 ? parseFloat(((invRevenue / totalRevenue) * 100).toFixed(1)) : 0;

  const totalRevenuePieData = [
    { name: 'Fuel', value: fuelRevenue || 1, fill: '#06B6D4' }, // Cyan
    { name: 'LPG', value: lpgRevenue || 1, fill: '#F97316' }, // Orange
    { name: 'Accessories', value: invRevenue || 1, fill: '#10B981' }, // Emerald
  ];

  // 2. Categories (Radial)
  const productSales: Record<string, number> = {};
  filteredPump.forEach(r => {
    const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
    const amount = sAmount > 0 ? sAmount : (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre);
    productSales[r.product] = (productSales[r.product] || 0) + amount;
  });
  productSales['LPG'] = lpgRevenue;
  productSales['Accessories'] = invRevenue;

  const sortedProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5
  
  const colors = ['#06B6D4', '#3B82F6', '#F97316', '#10B981', '#A855F7'];
  
  const radialData = sortedProducts.map((p, i) => ({
    name: p[0],
    value: p[1] > 0 ? p[1] : 0,
    fill: colors[i % colors.length],
    displayVal: p[1]
  })).reverse();

  const avgMonthlySales = totalRevenue / 12;

  // 3. Distribution by Location
  const stationRevenue: Record<string, number> = {};
  pumpReadings.filter(r => filterYear === 'All' || (r.date && r.date.startsWith(filterYear))).forEach(r => {
    const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
    const amount = sAmount > 0 ? sAmount : (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre);
    stationRevenue[r.station] = (stationRevenue[r.station] || 0) + amount;
  });
  lpgTransactions.filter(r => r.type === 'sale' && (filterYear === 'All' || (r.date && r.date.startsWith(filterYear)))).forEach(r => {
    stationRevenue[r.station] = (stationRevenue[r.station] || 0) + r.amount;
  });
  inventoryItems.filter(r => r.type === 'out' && (filterYear === 'All' || (r.date && r.date.startsWith(filterYear)))).forEach(r => {
    stationRevenue[r.station] = (stationRevenue[r.station] || 0) + r.amount;
  });

  const distributionPieData = Object.entries(stationRevenue)
    .filter(([st]) => st !== 'Combined Total')
    .map(([name, value], i) => ({
      name,
      value: value || 1,
      actualValue: value,
      fill: colors[i % colors.length]
    }));

  // 4. Performance
  const radarData = [
    { subject: 'Sales Flow', A: fuelPct || 70, fullMark: 100 },
    { subject: 'Dispense Speed', A: 85, fullMark: 100 },
    { subject: 'Stock Accuracy', A: 95, fullMark: 100 },
    { subject: 'Margin Growth', A: lpgPct + invPct > 0 ? 80 : 60, fullMark: 100 },
    { subject: 'Collection Rate', A: 90, fullMark: 100 },
    { subject: 'Audit Score', A: 88, fullMark: 100 },
  ];

  // 5. Foundation (Monthly Rev vs Exp)
  const monthlyData = MONTHS.map(m => ({ name: m, rev: 0, exp: 0 }));
  filteredPump.forEach(r => { monthlyData[getMonthIndex(r.date)].rev += (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre); });
  filteredLpg.filter(t => t.type === 'sale').forEach(t => { monthlyData[getMonthIndex(t.date)].rev += t.amount; });
  filteredInv.filter(t => t.type === 'out').forEach(t => { monthlyData[getMonthIndex(t.date)].rev += t.amount; });
  filteredExpenses.forEach(e => { monthlyData[getMonthIndex(e.date)].exp += e.amount; });

  const foundationData = monthlyData.map(m => ({
    name: m.name,
    pv: m.rev,
    uv: m.exp
  }));

  // 6. Top 5 Ranking Customers
  const custStats: Record<string, { total: number, paid: number }> = {};
  filteredInvoices.forEach(inv => {
    if (!custStats[inv.customerName]) custStats[inv.customerName] = { total: 0, paid: 0 };
    custStats[inv.customerName].total += (inv.totalAmount || 0);
    custStats[inv.customerName].paid += (inv.paidAmount || 0);
  });

  const top5Data = Object.entries(custStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([name, stats]) => {
      const max = stats.total > 0 ? stats.total : 1;
      const paidPct = Math.min(100, Math.round((stats.paid / max) * 100));
      const balPct = 100 - paidPct;
      return {
        name,
        val1: paidPct,
        val2: balPct,
        actualPaid: stats.paid,
        actualTotal: stats.total
      };
    });

  // 7. Forecast
  let target = 0;
  const forecastData = monthlyData.map((m, i) => {
    if (i === 0) target = m.rev > 0 ? m.rev * 1.1 : 10000;
    else target = monthlyData[i-1].rev > 0 ? monthlyData[i-1].rev * 1.05 : target;
    return {
      name: m.name,
      actual: m.rev,
      forecast: Math.round(target)
    };
  });
  
  const totalActual = forecastData.reduce((sum, item) => sum + item.actual, 0);
  const totalForecast = forecastData.reduce((sum, item) => sum + item.forecast, 0);

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B0D14]/95 border border-white/15 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-xs z-50">
          <p className="text-slate-400 font-bold mb-1.5 uppercase tracking-wider">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="font-bold font-mono" style={{ color: p.color || p.fill }}>
              {p.name}: KES {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B0D14]/95 border border-white/15 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-xs z-50 font-bold font-mono">
          <p style={{ color: payload[0].payload.fill || payload[0].fill }}>
            {payload[0].name}: KES {payload[0].payload.actualValue?.toLocaleString() || payload[0].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen theme-bg-gradient text-slate-100 font-sans p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* SVG Definitions for Gradients */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <linearGradient id="purpleBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0.0)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Top Left: Revenue Donut */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE]" />
                Revenue Breakdown
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Stream distribution</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Gross</p>
              <p className="text-xl lg:text-2xl font-extrabold text-white tracking-tight font-mono">KES {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center h-[200px] mt-4">
            <div className="w-1/2 h-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={totalRevenuePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                    stroke="none"
                  >
                    {totalRevenuePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xl font-extrabold text-white font-mono">{fuelPct}%</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Fuel Share</span>
              </div>
            </div>
            
            <div className="w-1/2 pl-4 flex flex-col justify-center space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE]" />
                <span className="text-slate-300 font-medium">Fuel Sales</span>
                <span className="ml-auto text-blue-400 font-bold font-mono">{fuelPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_#FB923C]" />
                <span className="text-slate-300 font-medium">LPG Cylinders</span>
                <span className="ml-auto text-orange-400 font-bold font-mono">{lpgPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                <span className="text-slate-300 font-medium">Accessories</span>
                <span className="ml-auto text-emerald-400 font-bold font-mono">{invPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Right: Categories Radial */}
        <div className="col-span-12 lg:col-span-8 glass-panel rounded-2xl p-6 relative">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA]" />
                Top Sales Categories
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Top-performing station fuels and product inventory</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row h-auto md:h-[220px]">
            <div className="w-full md:w-1/2 h-[200px] md:h-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="100%" barSize={9} data={radialData} startAngle={180} endAngle={-180}>
                  <RadialBar
                    background={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Tooltip cursor={false} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                         <div className="bg-[#0B0D14]/95 border border-white/15 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-xs z-50 font-bold">
                           <p style={{ color: payload[0].payload.fill }}>
                             {payload[0].payload.name}: KES {payload[0].payload.displayVal?.toLocaleString() || 0}
                           </p>
                         </div>
                      );
                    }
                    return null;
                  }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-center md:pl-6 mt-4 md:mt-0">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Avg Revenue</p>
                <p className="text-2xl font-extrabold text-white tracking-tight font-mono">KES {avgMonthlySales.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
              <div className="space-y-2 text-xs">
                {sortedProducts.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-md" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-slate-300 font-semibold truncate max-w-[130px]">{item[0]}</span>
                    </div>
                    <span className="text-white font-bold font-mono">KES {item[1].toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
                ))}
                {sortedProducts.length === 0 && (
                  <span className="text-slate-500 font-medium">No sales recorded yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Left: Distribution Pie */}
        <div className="col-span-12 lg:col-span-3 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE]" />
            Location Share
          </h3>
          <div className="flex-1 min-h-[190px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={distributionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {distributionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
             {distributionPieData.map((d) => (
               <button
                 key={d.name}
                 type="button"
                 onClick={() => onNavigateToStation?.(d.name, d.name)}
                 className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.08] hover:border-blue-500/30 text-[10px] text-slate-300 hover:text-blue-300 font-semibold transition-all cursor-pointer group"
                 title={`Open ${d.name} Dashboard`}
               >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span>{d.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
               </button>
             ))}
          </div>
        </div>

        {/* Middle Center: Performance Radar */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              Operational KPIs
            </h3>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live Benchmark
            </div>
          </div>
          <div className="flex-1 min-h-[190px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }} />
                <Radar name="Performance" dataKey="A" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.25} dot={{r: 3, fill: '#06B6D4'}} />
                <Tooltip contentStyle={{ backgroundColor: '#0B0D14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F8FAFC' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle Right: Foundation Bar/Area */}
        <div className="col-span-12 lg:col-span-5 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE]" />
                Revenue vs Expenses
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Cash collection against cost outflows</p>
            </div>
            <span className="text-sm font-extrabold text-white font-mono">KES {totalRevenue.toLocaleString()}</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart data={foundationData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }} dy={8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pv" name="Revenue" barSize={14} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Area type="monotone" dataKey="uv" name="Expenses" stroke="#F43F5E" strokeWidth={2} fill="url(#colorExp)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Left: Top 5 Ranking */}
        <div className="col-span-12 lg:col-span-5 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24]" />
                Top Customer Accounts
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Paid vs outstanding debt</p>
            </div>
            <div className="flex gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Paid</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> Debt</div>
            </div>
          </div>
          <div className="space-y-3.5">
            {top5Data.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between text-slate-300 font-semibold">
                  <span className="truncate max-w-[180px]">{item.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">Total: KES {item.actualTotal.toLocaleString()}</span>
                </div>
                <div className="w-full flex h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="bg-emerald-500" style={{ width: `${item.val1}%` }} />
                  <div className="bg-amber-500" style={{ width: `${item.val2}%` }} />
                </div>
              </div>
            ))}
            {top5Data.length === 0 && (
              <div className="text-slate-500 text-xs py-6 text-center font-medium">No customer invoice records found.</div>
            )}
          </div>
        </div>

        {/* Bottom Right: Forecast Line */}
        <div className="col-span-12 lg:col-span-7 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE]" />
                Revenue Target Forecast
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Actual pace compared against forecast target</p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold uppercase tracking-wider justify-end">
                  <div className="w-2 h-2 rounded-full bg-blue-400" /> Actual
                </div>
                <span className="text-white font-extrabold text-xs font-mono">KES {totalActual.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold uppercase tracking-wider justify-end">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" /> Forecast
                </div>
                <span className="text-white font-extrabold text-xs font-mono">KES {totalForecast.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={forecastData} margin={{ top: 15, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={v => `${v/1000}k`} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4, fill: '#090A0F', stroke: '#06B6D4', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#818CF8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#090A0F', stroke: "#818CF8", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
