import React, { useState, useMemo } from 'react';
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
  ExternalLink,
  FileSpreadsheet,
  FileDown,
  Download,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Sparkles,
  Filter
} from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function DashboardView() {
  const { activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems, invoices, cashPositions } = useFuel();
  const [filterYear] = useState<string>('All');

  // Quick Reports State
  const [reportDatePreset, setReportDatePreset] = useState<'30d' | '14d' | '7d' | 'month' | 'all' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showQuickReportPreview, setShowQuickReportPreview] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  
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
    { name: 'Fuel', value: fuelRevenue || 1, fill: '#00E676' }, // Candle Green
    { name: 'LPG', value: lpgRevenue || 1, fill: '#8B5CF6' }, // Smart Money Violet
    { name: 'Accessories', value: invRevenue || 1, fill: '#10B981' }, // Jade Accent
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
  
  const colors = ['#00E676', '#8B5CF6', '#10B981', '#A855F7', '#34D399'];
  
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


  // --- Station Specific Summary Metrics ---
  const stationCashPositions = (cashPositions || []).filter(filterByYearAndStation);
  const latestCashPosition = stationCashPositions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || { mPesa: 0, cashOnHand: 0 };
  
  const stationTotalSales = totalRevenue; // Computed above
  const stationTotalPurchases = filteredInv.filter(t => t.type === 'in').reduce((acc, t) => acc + (t.amount || 0), 0); 
  const stationTotalExpenses = filteredExpenses.reduce((acc, t) => acc + (t.amount || 0), 0);
  const stationInvoiceTotal = filteredInvoices.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const stationInvoicePaid = filteredInvoices.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
  
  const stationMpesa = latestCashPosition.mPesa || 0;
  const stationCash = latestCashPosition.cashOnHand || 0;
  
  const stationInventoryValue = filteredInv.filter(t => t.type === 'in' || t.type === 'opening').reduce((acc, t) => acc + (t.amount || 0), 0) - filteredInv.filter(t => t.type === 'out').reduce((acc, t) => acc + (t.amount || 0), 0);

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

  // --- Quick Reports: Daily Summaries for Active Station ---
  const isMatchingStation = (st?: string) => activeStation === 'Combined Total' || st === activeStation;

  // 1. Gather all unique dates for the active station
  const uniqueReportDates = useMemo(() => {
    const datesSet = new Set<string>();

    pumpReadings.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });
    lpgTransactions.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });
    inventoryItems.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });
    expenses.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });
    invoices.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });
    cashPositions.forEach(r => { 
      if (r.date && isMatchingStation(r.station)) datesSet.add(r.date.substring(0, 10)); 
    });

    return Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // Descending chronological
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions, activeStation]);

  // 2. Filter dates by preset
  const filteredReportDates = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (reportDatePreset === 'all') {
      return uniqueReportDates;
    }
    if (reportDatePreset === '7d') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const pastStr = format(past, 'yyyy-MM-dd');
      return uniqueReportDates.filter(d => d >= pastStr && d <= todayStr);
    }
    if (reportDatePreset === '14d') {
      const past = new Date();
      past.setDate(past.getDate() - 14);
      const pastStr = format(past, 'yyyy-MM-dd');
      return uniqueReportDates.filter(d => d >= pastStr && d <= todayStr);
    }
    if (reportDatePreset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const pastStr = format(past, 'yyyy-MM-dd');
      return uniqueReportDates.filter(d => d >= pastStr && d <= todayStr);
    }
    if (reportDatePreset === 'month') {
      const monthPrefix = format(today, 'yyyy-MM');
      return uniqueReportDates.filter(d => d.startsWith(monthPrefix));
    }
    if (reportDatePreset === 'custom') {
      return uniqueReportDates.filter(d => {
        if (customStartDate && d < customStartDate) return false;
        if (customEndDate && d > customEndDate) return false;
        return true;
      });
    }
    return uniqueReportDates;
  }, [uniqueReportDates, reportDatePreset, customStartDate, customEndDate]);

  // 3. Compile daily summary rows
  const dailySummaries = useMemo(() => {
    return filteredReportDates.map(date => {
      // Fuel readings for this date & station
      const dayPumps = pumpReadings.filter(r => isMatchingStation(r.station) && r.date?.startsWith(date));
      const fuelLitres = dayPumps.reduce((acc, r) => acc + calculatePumpMeterDelta(r.litresStart, r.litresStop), 0);
      const fuelRevenue = dayPumps.reduce((acc, r) => {
        const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
        return acc + (sAmount > 0 ? sAmount : (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre));
      }, 0);

      // LPG Sales for this date & station
      const dayLpg = lpgTransactions.filter(r => isMatchingStation(r.station) && r.date?.startsWith(date) && r.type === 'sale');
      const lpgRevenue = dayLpg.reduce((acc, r) => acc + (r.amount || 0), 0);
      const lpgKg = dayLpg.reduce((acc, r) => acc + (r.quantity || 0), 0);

      // Inventory / accessories sales for this date & station
      const dayInv = inventoryItems.filter(r => isMatchingStation(r.station) && r.date?.startsWith(date) && r.type === 'out');
      const accessoriesRevenue = dayInv.reduce((acc, r) => acc + (r.amount || 0), 0);

      // Gross sales
      const totalGrossRevenue = fuelRevenue + lpgRevenue + accessoriesRevenue;

      // Expenses for this date & station
      const dayExpenses = expenses.filter(r => isMatchingStation(r.station) && r.date?.startsWith(date));
      const totalExpenses = dayExpenses.reduce((acc, r) => acc + (r.amount || 0), 0);

      // Net Operating Margin
      const netMargin = totalGrossRevenue - totalExpenses;

      // Invoices issued and paid for this date & station
      const dayInvoices = invoices.filter(r => isMatchingStation(r.station) && r.date?.startsWith(date));
      const invoicesIssued = dayInvoices.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
      const invoicesPaid = dayInvoices.reduce((acc, r) => acc + (r.paidAmount || 0), 0);

      // Cash Positions for this date & station
      const dayCash = cashPositions.filter(r => (activeStation === 'Combined Total' || !r.station || r.station === activeStation) && r.date?.startsWith(date));
      const latestCash = dayCash[dayCash.length - 1];
      const cashOnHand = latestCash?.cashOnHand || 0;
      const mPesa = latestCash?.mPesa || 0;
      const totalCollections = cashOnHand + mPesa;

      return {
        date,
        station: activeStation,
        fuelLitres,
        fuelRevenue,
        lpgRevenue,
        lpgKg,
        accessoriesRevenue,
        totalGrossRevenue,
        expenses: totalExpenses,
        netMargin,
        invoicesIssued,
        invoicesPaid,
        cashOnHand,
        mPesa,
        totalCollections
      };
    });
  }, [filteredReportDates, pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions, activeStation]);

  // Totals for summary footer
  const reportTotals = useMemo(() => {
    return dailySummaries.reduce((acc, row) => ({
      fuelLitres: acc.fuelLitres + row.fuelLitres,
      fuelRevenue: acc.fuelRevenue + row.fuelRevenue,
      lpgRevenue: acc.lpgRevenue + row.lpgRevenue,
      lpgKg: acc.lpgKg + row.lpgKg,
      accessoriesRevenue: acc.accessoriesRevenue + row.accessoriesRevenue,
      totalGrossRevenue: acc.totalGrossRevenue + row.totalGrossRevenue,
      expenses: acc.expenses + row.expenses,
      netMargin: acc.netMargin + row.netMargin,
      invoicesIssued: acc.invoicesIssued + row.invoicesIssued,
      invoicesPaid: acc.invoicesPaid + row.invoicesPaid,
      cashOnHand: acc.cashOnHand + row.cashOnHand,
      mPesa: acc.mPesa + row.mPesa,
      totalCollections: acc.totalCollections + row.totalCollections
    }), {
      fuelLitres: 0,
      fuelRevenue: 0,
      lpgRevenue: 0,
      lpgKg: 0,
      accessoriesRevenue: 0,
      totalGrossRevenue: 0,
      expenses: 0,
      netMargin: 0,
      invoicesIssued: 0,
      invoicesPaid: 0,
      cashOnHand: 0,
      mPesa: 0,
      totalCollections: 0
    });
  }, [dailySummaries]);

  // Export to CSV function
  const handleExportCSV = () => {
    if (dailySummaries.length === 0) {
      alert(`No daily summary records available for ${activeStation} in the selected range.`);
      return;
    }

    const exportRows: any[] = dailySummaries.map(row => ({
      'Date': row.date,
      'Station': row.station,
      'Fuel Litres Sold': Number(row.fuelLitres.toFixed(2)),
      'Fuel Revenue (KES)': Math.round(row.fuelRevenue),
      'LPG Revenue (KES)': Math.round(row.lpgRevenue),
      'Accessories Sales (KES)': Math.round(row.accessoriesRevenue),
      'Total Gross Revenue (KES)': Math.round(row.totalGrossRevenue),
      'Station Expenses (KES)': Math.round(row.expenses),
      'Net Operating Margin (KES)': Math.round(row.netMargin),
      'Invoices Issued (KES)': Math.round(row.invoicesIssued),
      'Invoices Paid (KES)': Math.round(row.invoicesPaid),
      'Cash at Hand (KES)': Math.round(row.cashOnHand),
      'M-Pesa (KES)': Math.round(row.mPesa),
      'Total Till Collections (KES)': Math.round(row.totalCollections),
    }));

    // Add summary row
    exportRows.push({
      'Date': 'TOTALS',
      'Station': activeStation,
      'Fuel Litres Sold': Number(reportTotals.fuelLitres.toFixed(2)),
      'Fuel Revenue (KES)': Math.round(reportTotals.fuelRevenue),
      'LPG Revenue (KES)': Math.round(reportTotals.lpgRevenue),
      'Accessories Sales (KES)': Math.round(reportTotals.accessoriesRevenue),
      'Total Gross Revenue (KES)': Math.round(reportTotals.totalGrossRevenue),
      'Station Expenses (KES)': Math.round(reportTotals.expenses),
      'Net Operating Margin (KES)': Math.round(reportTotals.netMargin),
      'Invoices Issued (KES)': Math.round(reportTotals.invoicesIssued),
      'Invoices Paid (KES)': Math.round(reportTotals.invoicesPaid),
      'Cash at Hand (KES)': Math.round(reportTotals.cashOnHand),
      'M-Pesa (KES)': Math.round(reportTotals.mPesa),
      'Total Till Collections (KES)': Math.round(reportTotals.totalCollections),
    });

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stationSlug = activeStation.replace(/[^a-zA-Z0-9]/g, '_');
    const todayFormatted = format(new Date(), 'yyyy-MM-dd');
    link.href = url;
    link.download = `Loruk_QuickReport_${stationSlug}_DailySummary_${todayFormatted}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccessMessage(`Exported ${dailySummaries.length} daily summaries for ${activeStation} as CSV!`);
    setTimeout(() => {
      setDownloadSuccessMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans p-6 lg:p-8 overflow-y-auto space-y-6 relative">
      
      {/* DeepCharts Signature Ethereal Low-Brightness Atmospheric Fading Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.05),rgba(0,230,118,0.02)_45%,transparent_70%)] pointer-events-none z-0" />

      {/* SVG Definitions for Gradients */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <linearGradient id="purpleBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00E676" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.25)" />
            <stop offset="100%" stopColor="rgba(0, 230, 118, 0.0)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="grid grid-cols-12 gap-6">

        {/* Quick Reports Section */}
        <div className="col-span-12 glass-panel rounded-2xl p-5 border border-white/[0.08] hover:border-purple-500/25 bg-[#000000] relative shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.25)] shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Quick Reports
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shadow-[0_0_10px_rgba(0,230,118,0.15)]">
                      Daily Summary CSV
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-xs text-purple-300 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Station: {activeStation}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    ({dailySummaries.length} {dailySummaries.length === 1 ? 'day' : 'days'})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export daily operational, sales, fuel volume, expense, and till summaries for your active station.
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Preset Selector */}
              <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1 text-xs">
                {(['7d', '14d', '30d', 'month', 'all'] as const).map(preset => (
                  <button
                    key={preset}
                    onClick={() => setReportDatePreset(preset)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      reportDatePreset === preset 
                        ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {preset === '7d' ? '7 Days' : preset === '14d' ? '14 Days' : preset === '30d' ? '30 Days' : preset === 'month' ? 'This Month' : 'All Time'}
                  </button>
                ))}
                <button
                  onClick={() => setReportDatePreset('custom')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    reportDatePreset === 'custom' 
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Table Preview Toggle */}
              <button
                onClick={() => setShowQuickReportPreview(!showQuickReportPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  showQuickReportPreview
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
                title="Preview table on screen"
              >
                <TableIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>{showQuickReportPreview ? 'Hide Preview' : 'Preview Table'}</span>
                {showQuickReportPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* CSV Export Button */}
              <button
                onClick={handleExportCSV}
                disabled={dailySummaries.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#00E676] hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs shadow-[0_0_25px_rgba(0,230,118,0.35)] transition-all cursor-pointer shrink-0"
                title={`Export ${activeStation} daily summary to CSV`}
              >
                <Download className="w-4 h-4 text-white" />
                <span>Export Daily Summary (CSV)</span>
              </button>
            </div>
          </div>

          {/* Custom Date Inputs if Custom is selected */}
          {reportDatePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-3 pb-1 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Custom Range:
              </span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-purple-500/30 text-white text-xs font-mono"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-purple-500/30 text-white text-xs font-mono"
              />
              {(customStartDate || customEndDate) && (
                <button
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Clear dates
                </button>
              )}
            </div>
          )}

          {/* Download Success Alert */}
          {downloadSuccessMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccessMessage}</span>
            </div>
          )}

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Gross Sales</p>
              <p className="text-sm font-bold font-mono text-purple-300 mt-0.5">KES {Math.round(reportTotals.totalGrossRevenue).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Fuel Volume Dispensed</p>
              <p className="text-sm font-bold font-mono text-emerald-300 mt-0.5">{reportTotals.fuelLitres.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Expenses</p>
              <p className="text-sm font-bold font-mono text-rose-300 mt-0.5">KES {Math.round(reportTotals.expenses).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Operating Margin</p>
              <p className={`text-sm font-bold font-mono mt-0.5 ${reportTotals.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                KES {Math.round(reportTotals.netMargin).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] col-span-2 sm:col-span-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Till Collections</p>
              <p className="text-sm font-bold font-mono text-amber-300 mt-0.5">KES {Math.round(reportTotals.totalCollections).toLocaleString()}</p>
            </div>
          </div>

          {/* Quick Table Preview */}
          {showQuickReportPreview && (
            <div className="mt-4 pt-3 border-t border-white/[0.08] overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Daily Summaries Preview ({dailySummaries.length} Records)
                </p>
                <p className="text-[11px] text-slate-400">All columns will be exported to the CSV file</p>
              </div>
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3 text-right">Fuel (L)</th>
                    <th className="py-2.5 px-3 text-right">Fuel Sales</th>
                    <th className="py-2.5 px-3 text-right">LPG Sales</th>
                    <th className="py-2.5 px-3 text-right">Gross Sales</th>
                    <th className="py-2.5 px-3 text-right">Expenses</th>
                    <th className="py-2.5 px-3 text-right">Net Margin</th>
                    <th className="py-2.5 px-3 text-right">Cash / M-Pesa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono text-[11px]">
                  {dailySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500 font-sans">
                        No transactions recorded for {activeStation} in this date range.
                      </td>
                    </tr>
                  ) : (
                      dailySummaries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-2 px-3 font-semibold text-white font-sans">{row.date}</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">{row.station}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">{row.fuelLitres.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td className="py-2 px-3 text-right text-purple-300">KES {Math.round(row.fuelRevenue).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-purple-200">KES {Math.round(row.lpgRevenue).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-white">KES {Math.round(row.totalGrossRevenue).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-rose-300">KES {Math.round(row.expenses).toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-bold ${row.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                          KES {Math.round(row.netMargin).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-300">KES {Math.round(row.totalCollections).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                  {dailySummaries.length > 0 && (
                    <tr className="bg-white/[0.03] font-bold border-t-2 border-emerald-500/40 text-white">
                      <td className="py-2.5 px-3 font-sans">TOTALS</td>
                      <td className="py-2.5 px-3 font-sans text-emerald-400">{activeStation}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">{reportTotals.fuelLitres.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                      <td className="py-2.5 px-3 text-right text-purple-300">KES {Math.round(reportTotals.fuelRevenue).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-purple-200">KES {Math.round(reportTotals.lpgRevenue).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-white">KES {Math.round(reportTotals.totalGrossRevenue).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-rose-300">KES {Math.round(reportTotals.expenses).toLocaleString()}</td>
                      <td className={`py-2.5 px-3 text-right ${reportTotals.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                        KES {Math.round(reportTotals.netMargin).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-300">KES {Math.round(reportTotals.totalCollections).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeStation !== 'Combined Total' && (
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-2">
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-purple-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Total Sales</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationTotalSales.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-emerald-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Purchases</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationTotalPurchases.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-rose-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Expenses</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationTotalExpenses.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-purple-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Invoices Issued</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationInvoiceTotal.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-indigo-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Paid Invoices</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationInvoicePaid.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-emerald-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">M-Pesa</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationMpesa.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-purple-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Cash at Hand</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationCash.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/[0.08] hover:border-emerald-500/30 bg-[#000000] flex flex-col justify-center">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Inventory Value</p>
              <p className="text-sm font-bold text-slate-100 font-mono">KES {stationInventoryValue.toLocaleString()}</p>
            </div>
          </div>
        )}

        
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
