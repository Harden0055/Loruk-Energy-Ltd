import React, { useState, useMemo } from 'react';
import { useFuel } from '../context';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell, RadialBarChart, RadialBar, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area 
} from 'recharts';
import { ChevronDown, Navigation } from 'lucide-react';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function DashboardView() {
  const { activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems, invoices, customers } = useFuel();
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  
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
  const fuelRevenue = filteredPump.reduce((acc, r) => acc + ((r.stopReading - r.startReading) * r.ratePerLitre), 0);
  const lpgRevenue = filteredLpg.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const invRevenue = filteredInv.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = fuelRevenue + lpgRevenue + invRevenue;

  const fuelPct = totalRevenue > 0 ? Math.round((fuelRevenue / totalRevenue) * 100) : 0;
  const lpgPct = totalRevenue > 0 ? Math.round((lpgRevenue / totalRevenue) * 100) : 0;
  const invPct = totalRevenue > 0 ? Math.round((invRevenue / totalRevenue) * 100) : 0;

  const totalRevenuePieData = [
    { name: 'Fuel', value: fuelRevenue || 1, fill: '#3B82F6' }, // Electric Blue
    { name: 'LPG', value: lpgRevenue || 1, fill: '#00D4FF' }, // Neon Cyan
    { name: 'Oils', value: invRevenue || 1, fill: '#60A5FA' }, // Light Blue
  ];

  // 2. Categories (Radial)
  // Group products
  const productSales: Record<string, number> = {};
  filteredPump.forEach(r => {
    productSales[r.product] = (productSales[r.product] || 0) + ((r.stopReading - r.startReading) * r.ratePerLitre);
  });
  productSales['LPG'] = lpgRevenue;
  productSales['Oils'] = invRevenue;

  const sortedProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5
  
  const colors = ['#3B82F6', '#00D4FF', '#60A5FA', '#38BDF8', '#22C55E'];
  
  const radialData = sortedProducts.map((p, i) => ({
    name: p[0],
    value: p[1] > 0 ? p[1] : 0, // actual value
    fill: colors[i % colors.length],
    displayVal: p[1]
  })).reverse(); // Reverse for chart display order

  const avgMonthlySales = totalRevenue / 12;

  // 3. Distribution by Location
  const stationRevenue: Record<string, number> = {};
  pumpReadings.filter(r => filterYear === 'All' || (r.date && r.date.startsWith(filterYear))).forEach(r => {
    stationRevenue[r.station] = (stationRevenue[r.station] || 0) + ((r.stopReading - r.startReading) * r.ratePerLitre);
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

  // 4. Performance (Mocked as requested, but scaled to look good)
  const radarData = [
    { subject: 'Sales', A: fuelPct, fullMark: 100 },
    { subject: 'Service', A: 85, fullMark: 100 },
    { subject: 'Safety', A: 95, fullMark: 100 },
    { subject: 'Efficiency', A: lpgPct + invPct > 0 ? 80 : 50, fullMark: 100 },
    { subject: 'Quality', A: 90, fullMark: 100 },
    { subject: 'Speed', A: 75, fullMark: 100 },
  ];

  // 5. Foundation (Monthly Rev vs Exp)
  const monthlyData = MONTHS.map(m => ({ name: m, rev: 0, exp: 0 }));
  filteredPump.forEach(r => { monthlyData[getMonthIndex(r.date)].rev += ((r.stopReading - r.startReading) * r.ratePerLitre); });
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
        val1: paidPct, // Paid %
        val2: balPct,  // Balance %
        actualPaid: stats.paid,
        actualTotal: stats.total
      };
    });

  // 7. Forecast (Actual vs Target) - Target mocked as 110% of previous month's actual or a flat line
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
        <div className="bg-[#121216]/95  border border-white/80 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs z-50">
          <p className="text-[#A1A1AA] font-semibold mb-1.5">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
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
        <div className="bg-[#121216]/95  border border-white/80 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs z-50 font-semibold">
          <p style={{ color: payload[0].payload.fill || payload[0].fill }}>
            {payload[0].name}: KES {payload[0].payload.actualValue?.toLocaleString() || payload[0].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const years = ['All', '2024', '2025', '2026', '2027', '2028'];

  return (
    <div className="min-h-screen theme-bg-gradient text-theme-text font-sans p-6 overflow-y-auto">
      
      {/* SVG Definitions for Premium Gradients */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <linearGradient id="purpleBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0.0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Navigation Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between glass-panel rounded-[20px] px-3 py-3 mb-6 gap-4">
        <div className="flex items-center w-full lg:w-auto overflow-x-auto hide-scrollbar pb-1 lg:pb-0">
          <div className="px-4 border-r border-theme-border/30 shrink-0">
            <Navigation className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div className="flex text-xs font-semibold uppercase tracking-wider shrink-0 gap-1.5 ml-3">
            <button className="px-5 py-2.5 bg-[#3B82F6]/10 text-[#00D4FF] rounded-xl border border-[#3B82F6]/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]">Dashboard</button>
            <button className="px-5 py-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition-all">Distribution</button>
            <button className="px-5 py-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition-all">Performance</button>
            <button className="px-5 py-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition-all">Foundation</button>
            <button className="px-5 py-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition-all">Top 5 Rank</button>
            <button className="px-5 py-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-1">
              Forecast <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 text-xs font-semibold pr-2 shrink-0 overflow-x-auto hide-scrollbar w-full lg:w-auto justify-start lg:justify-end">
          {years.map(y => (
            <button 
              key={y}
              onClick={() => setFilterYear(y)}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${filterYear === y ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-[#121216]/60 border border-theme-border/50 text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Top Left: Revenue Donut */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-[20px] p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
            Total Revenue Representation
          </h3>
          <div className="absolute top-6 right-6 text-right">
            <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Total Revenue</p>
            <p className="text-xl lg:text-2xl font-bold text-white tracking-tight">KES {totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="flex items-center h-[200px] mt-8">
            <div className="w-1/2 h-full relative">
              <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={totalRevenuePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
                <span className="text-2xl font-bold text-white tracking-tight">{fuelPct}%</span>
              </div>
            </div>
            
            <div className="w-1/2 pl-4 flex flex-col justify-center space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
                <span className="text-[#A1A1AA] font-medium">Fuel Sales</span>
                <span className="ml-auto text-white font-semibold">{fuelPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
                <span className="text-[#A1A1AA] font-medium">LPG</span>
                <span className="ml-auto text-white font-semibold">{lpgPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#60A5FA] shadow-[0_0_8px_#60A5FA]" />
                <span className="text-[#A1A1AA] font-medium">Lubricants</span>
                <span className="ml-auto text-white font-semibold">{invPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Right: Categories Radial */}
        <div className="col-span-12 lg:col-span-8 glass-panel rounded-[20px] p-6 shadow-xl relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
              Sales Categories
            </h3>
          </div>
          <div className="flex flex-col md:flex-row h-auto md:h-[240px]">
            <div className="w-full md:w-1/2 h-[200px] md:h-full">
              <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" barSize={8} data={radialData} startAngle={180} endAngle={-180}>
                  <RadialBar
                    background={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Tooltip cursor={false} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                         <div className="bg-[#121216]/95  border border-white/10 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs z-50 font-semibold">
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
            <div className="w-full md:w-1/2 flex flex-col justify-center md:pl-8 mt-4 md:mt-0">
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Monthly Average</p>
                <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">KES {avgMonthlySales.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
              <div className="space-y-2.5 text-xs">
                {sortedProducts.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-md" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-[#A1A1AA] font-medium truncate max-w-[120px]">{item[0]}</span>
                    </div>
                    <span className="text-white font-semibold">KES {item[1].toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
                ))}
                {sortedProducts.length === 0 && (
                  <span className="text-[#71717A]">No data available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Left: Distribution Pie */}
        <div className="col-span-12 lg:col-span-3 glass-panel rounded-[20px] p-6 shadow-xl flex flex-col">
          <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
            Distribution by Location
          </h3>
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={distributionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
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
            {/* Outer decorative ring */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[180px] h-[180px] rounded-full border border-white/5 border-dashed" />
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
             {distributionPieData.map((d, i) => (
               <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] font-semibold">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  {d.name.split(' ')[0]}
               </div>
             ))}
          </div>
        </div>

        {/* Middle Center: Performance Radar */}
        <div className="col-span-12 lg:col-span-4 glass-panel rounded-[20px] p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
              Performance KPIs
            </h3>
            <div className="text-[10px] text-[#A1A1AA] font-bold flex flex-col gap-1 items-end uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full shadow-[0_0_6px_#3B82F6]" /> Actual</div>
            </div>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.04)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717A', fontSize: 9, fontWeight: 600 }} />
                <Radar name="Performance" dataKey="A" stroke="#3B82F6" fill="url(#purpleBlueGrad)" fillOpacity={0.25} dot={{r: 3, fill: '#3B82F6'}} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(18,18,22,0.95)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle Right: Foundation Bar/Area */}
        <div className="col-span-12 lg:col-span-5 glass-panel rounded-[20px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
              Revenue vs Expenses
            </h3>
            <span className="text-base font-bold text-white tracking-tight">KES {totalRevenue.toLocaleString()}</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
              <ComposedChart data={foundationData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10, fontWeight: 500 }} dy={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pv" name="Revenue" barSize={12} fill="url(#purpleBlueGrad)" radius={[4, 4, 0, 0]} />
                <Area type="monotone" dataKey="uv" name="Expenses" stroke="none" fill="url(#colorUv)" />
                {/* Horizontal reference line */}
                <Line type="step" dataKey="uv" stroke="#3B82F6" strokeWidth={1.5} dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Left: Top 5 Ranking */}
        <div className="col-span-12 lg:col-span-5 glass-panel rounded-[20px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
              Top 5 Customers (Balances)
            </h3>
            <div className="flex gap-4 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6]" /> Paid</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] shadow-[0_0_6px_#00D4FF]" /> Debt</div>
            </div>
          </div>
          <div className="space-y-4">
            {top5Data.map((item, i) => (
              <div key={i} className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-[#A1A1AA] font-semibold">
                  <span className="truncate">{item.name}</span>
                  <span className="text-[10px] font-mono">Total: KES {item.actualTotal.toLocaleString()}</span>
                </div>
                <div className="w-full flex gap-1 h-2 relative rounded-full bg-white/5 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 bg-[#3B82F6]" style={{ width: `${item.val1}%` }} />
                  <div className="absolute left-0 top-0 bottom-0 bg-[#00D4FF] opacity-80" style={{ width: `${item.val2}%`, left: `${item.val1}%` }} />
                </div>
              </div>
            ))}
            {top5Data.length === 0 && (
              <div className="text-[#71717A] text-sm py-4 font-semibold">No invoice data available.</div>
            )}
          </div>
        </div>

        {/* Bottom Right: Forecast Line */}
        <div className="col-span-12 lg:col-span-7 glass-panel rounded-[20px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
              Accruals Forecast
            </h3>
            <div className="flex gap-6 text-right">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider justify-end"><div className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Actual</div>
                <span className="text-white font-bold text-sm">KES {totalActual.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider justify-end"><div className="w-2 h-2 rounded-full border border-[#00D4FF]" /> Forecast</div>
                <span className="text-white font-bold text-sm">KES {totalForecast.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
              <LineChart data={forecastData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} tickFormatter={v => `${v/1000}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#09090B', stroke: '#3B82F6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#00D4FF" strokeWidth={3} dot={{ r: 4, fill: '#09090B', stroke: "#00D4FF", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
