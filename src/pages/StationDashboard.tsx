import React, { useState, useMemo } from 'react';
import { 
  useStations, 
  useDailyPumpReadings, 
  useDailyExpenses, 
  useLpgSales, 
  useLpgPurchases, 
  useCashPositions, 
  useDailyInvoices, 
  useLpgInventory, 
  useDailyReports, 
  useFuelRates,
  useOpeningStocks
} from '../lib/operationsDb';
import { useDeliveries, useFleetExpenses } from '../lib/db';
import { formatCurrency, formatLitres } from '../lib/utils';
import { format } from 'date-fns';
import { 
  Building2, 
  MapPin, 
  Fuel, 
  Flame, 
  DollarSign, 
  TrendingUp, 
  ReceiptText, 
  Truck, 
  Wallet, 
  Search, 
  Download, 
  Printer, 
  ArrowUpDown, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Filter, 
  ChevronDown, 
  Layers, 
  FileText, 
  BarChart3, 
  PieChart as PieIcon, 
  Percent, 
  Gauge, 
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Plus,
  Clock,
  CarFront,
  Box
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface StationDashboardProps {
  stationId?: string | null;
  stationName?: string | null;
  onNavigateToStation?: (id: string, name: string) => void;
  onBack?: () => void;
  onNavigateToPage?: (page: string) => void;
  isInFuelSuite?: boolean;
}

const PIE_COLORS = ['#38BDF8', '#3B82F6', '#F97316', '#10B981', '#A855F7', '#EC4899', '#EAB308'];

export default function StationDashboard({
  stationId,
  stationName,
  onNavigateToStation,
  onBack,
  onNavigateToPage,
  isInFuelSuite = false
}: StationDashboardProps) {
  const { stations, loading: stationsLoading } = useStations();
  const { readings: pumpReadings = [] } = useDailyPumpReadings();
  const { expenses = [] } = useDailyExpenses();
  const { sales: lpgSales = [] } = useLpgSales();
  const { purchases: lpgPurchases = [] } = useLpgPurchases();
  const { positions: cashPositions = [] } = useCashPositions();
  const { invoices = [] } = useDailyInvoices();
  const { inventory: lpgInventory = [] } = useLpgInventory();
  const { reports: dailyReports = [] } = useDailyReports();
  const { rates: fuelRates = [] } = useFuelRates();
  const { openingStocks = [] } = useOpeningStocks();
  const { deliveries = [] } = useDeliveries();
  const { expenses: fleetExpenses = [] } = useFleetExpenses();

  // Active Station determination
  const currentStation = useMemo(() => {
    if (stationId) {
      const found = stations.find(s => s.id === stationId);
      if (found) return found;
    }
    if (stationName) {
      const trimmed = stationName.trim().toLowerCase();
      const found = stations.find(s => 
        s.name.toLowerCase() === trimmed || 
        s.name.toLowerCase().includes(trimmed) || 
        trimmed.includes(s.name.toLowerCase()) ||
        (s.code && s.code.toLowerCase() === trimmed)
      );
      if (found) return found;
    }
    return stations[0] || {
      id: 'default-1',
      name: stationName || 'Ndalu Station',
      code: 'ST-001',
      location: 'Ndalu',
      status: 'active',
      tradingAs: 'T/A Loruk Energy Ltd',
      poBox: 'P.O BOX 342'
    };
  }, [stations, stationId, stationName]);

  const activeName = currentStation.name;

  // Flexible station matcher helper
  const matchesStation = (itemStation: string | undefined | null) => {
    if (!itemStation) return false;
    const s = itemStation.trim().toLowerCase();
    const cur = activeName.trim().toLowerCase();
    const curCode = (currentStation.code || '').trim().toLowerCase();
    const curLoc = (currentStation.location || '').trim().toLowerCase();

    // Direct match or partial containment
    if (s === cur) return true;
    if (curCode && s === curCode) return true;
    if (cur.includes('ndalu') && s.includes('ndalu')) return true;
    if (cur.includes('junction') && s.includes('junction')) return true;
    if (cur.includes('loruk') && s.includes('loruk')) return true;
    if (curLoc && s.includes(curLoc)) return true;
    return s.includes(cur) || cur.includes(s);
  };

  // State Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'fuel' | 'lpg' | 'expenses' | 'invoices' | 'timeline'>('overview');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'fuel' | 'lpg' | 'expense' | 'invoice' | 'delivery'>('all');

  // Filter by date
  const isWithinDateRange = (timestampOrDateStr: number | string | undefined) => {
    if (!timestampOrDateStr) return true;
    if (dateRange === 'all') return true;

    const time = typeof timestampOrDateStr === 'string' 
      ? new Date(timestampOrDateStr).getTime() 
      : timestampOrDateStr;

    if (isNaN(time)) return true;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (dateRange === '7d') return now - time <= 7 * oneDay;
    if (dateRange === '30d') return now - time <= 30 * oneDay;
    if (dateRange === 'this_month') {
      const curDate = new Date(now);
      const targetDate = new Date(time);
      return curDate.getFullYear() === targetDate.getFullYear() && curDate.getMonth() === targetDate.getMonth();
    }
    return true;
  };

  // 1. Filtered Pump Readings for this station
  const stationPumpReadings = useMemo(() => {
    return (pumpReadings || [])
      .filter(r => matchesStation(r.station))
      .filter(r => isWithinDateRange(r.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [pumpReadings, activeName, dateRange]);

  // 2. Filtered Expenses for this station
  const stationExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => matchesStation(e.station))
      .filter(e => isWithinDateRange(e.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [expenses, activeName, dateRange]);

  // 3. Filtered LPG Sales & Purchases
  const stationLpgSales = useMemo(() => {
    return (lpgSales || [])
      .filter(l => matchesStation(l.station))
      .filter(l => isWithinDateRange(l.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [lpgSales, activeName, dateRange]);

  const stationLpgPurchases = useMemo(() => {
    return (lpgPurchases || [])
      .filter(l => matchesStation(l.station))
      .filter(l => isWithinDateRange(l.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [lpgPurchases, activeName, dateRange]);

  // 4. Filtered Invoices
  const stationInvoices = useMemo(() => {
    return (invoices || [])
      .filter(inv => matchesStation(inv.station))
      .filter(inv => isWithinDateRange(inv.invoiceDate || inv.createdAt))
      .sort((a, b) => ((b.invoiceDate || b.createdAt) || 0) - ((a.invoiceDate || a.createdAt) || 0));
  }, [invoices, activeName, dateRange]);

  // 5. Filtered Cash Positions
  const stationCashPositions = useMemo(() => {
    return (cashPositions || [])
      .filter(c => matchesStation(c.station))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [cashPositions, activeName]);

  // 6. Filtered Fleet Fueling at this station
  const stationFleetExpenses = useMemo(() => {
    return (fleetExpenses || [])
      .filter(f => matchesStation(f.station))
      .filter(f => isWithinDateRange(f.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [fleetExpenses, activeName, dateRange]);

  // 7. Deliveries received
  const stationDeliveries = useMemo(() => {
    return (deliveries || [])
      .filter(d => isWithinDateRange(d.date))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [deliveries, dateRange]);

  // --- Aggregate Metrics ---
  const fuelMetrics = useMemo(() => {
    let superLitres = 0;
    let superRevenue = 0;
    let dieselLitres = 0;
    let dieselRevenue = 0;
    let otherLitres = 0;
    let otherRevenue = 0;

    stationPumpReadings.forEach(r => {
      const soldLitres = r.litresSold || (r.litresStop >= r.litresStart ? r.litresStop - r.litresStart : 0);
      const rev = r.calculatedRevenue || r.manualRevenue || (soldLitres * (r.ratePerLitre || 0));
      const prod = (r.product || '').toLowerCase();

      if (prod.includes('super') || prod.includes('pms') || prod.includes('petrol')) {
        superLitres += soldLitres;
        superRevenue += rev;
      } else if (prod.includes('diesel') || prod.includes('ago')) {
        dieselLitres += soldLitres;
        dieselRevenue += rev;
      } else {
        otherLitres += soldLitres;
        otherRevenue += rev;
      }
    });

    const totalLitres = superLitres + dieselLitres + otherLitres;
    const totalFuelRev = superRevenue + dieselRevenue + otherRevenue;

    return {
      superLitres,
      superRevenue,
      dieselLitres,
      dieselRevenue,
      otherLitres,
      otherRevenue,
      totalLitres,
      totalFuelRev
    };
  }, [stationPumpReadings]);

  const lpgRevenue = useMemo(() => {
    return stationLpgSales.reduce((sum, s) => sum + (s.totalSalesAmount || 0), 0);
  }, [stationLpgSales]);

  const lpgCost = useMemo(() => {
    return stationLpgPurchases.reduce((sum, p) => sum + (p.purchaseCost || 0), 0);
  }, [stationLpgPurchases]);

  const totalExpensesAmount = useMemo(() => {
    return stationExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [stationExpenses]);

  const totalGrossRevenue = fuelMetrics.totalFuelRev + lpgRevenue;
  const netOperatingProfit = totalGrossRevenue - totalExpensesAmount;
  const profitMarginPct = totalGrossRevenue > 0 ? (netOperatingProfit / totalGrossRevenue) * 100 : 0;

  // Invoices & Receivables
  const totalInvoiced = stationInvoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
  const totalInvoicesPaid = stationInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const outstandingInvoicesBalance = totalInvoiced - totalInvoicesPaid;

  // Cash Position
  const latestCashPosition = stationCashPositions[0] || { cashAtHand: 0, mpesaBalance: 0 };
  const totalLiquidCash = (latestCashPosition.cashAtHand || 0) + (latestCashPosition.mpesaBalance || 0);

  // Current Fuel Rates for this station
  const currentRates = useMemo(() => {
    const rates = (fuelRates || []).filter(r => matchesStation(r.station));
    const superRate = rates.find(r => r.product.toLowerCase().includes('super'))?.rate || 198.50;
    const dieselRate = rates.find(r => r.product.toLowerCase().includes('diesel'))?.rate || 185.00;
    return { superRate, dieselRate };
  }, [fuelRates, activeName]);

  // Expenses categorized
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    stationExpenses.forEach(e => {
      const cat = e.category || 'General';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [stationExpenses]);

  // Product Revenue Distribution (for Donut Chart)
  const productDistributionData = useMemo(() => {
    const data = [
      { name: 'Super (PMS)', value: fuelMetrics.superRevenue || 0, color: '#38BDF8' },
      { name: 'Diesel (AGO)', value: fuelMetrics.dieselRevenue || 0, color: '#3B82F6' },
      { name: 'LPG Gas', value: lpgRevenue || 0, color: '#F97316' },
    ];
    if (fuelMetrics.otherRevenue > 0) {
      data.push({ name: 'Other Fuels', value: fuelMetrics.otherRevenue, color: '#10B981' });
    }
    return data.filter(d => d.value > 0);
  }, [fuelMetrics, lpgRevenue]);

  // Monthly / Daily Sales & Expenses Trend Line
  const timelineTrendData = useMemo(() => {
    const groups: Record<string, { dateStr: string; Revenue: number; Expenses: number; Litres: number; timestamp: number }> = {};

    stationPumpReadings.forEach(r => {
      const d = format(new Date(r.date), 'MMM dd');
      if (!groups[d]) groups[d] = { dateStr: d, Revenue: 0, Expenses: 0, Litres: 0, timestamp: r.date };
      const soldLitres = r.litresSold || (r.litresStop >= r.litresStart ? r.litresStop - r.litresStart : 0);
      const rev = r.calculatedRevenue || r.manualRevenue || (soldLitres * (r.ratePerLitre || 0));
      groups[d].Revenue += rev;
      groups[d].Litres += soldLitres;
    });

    stationLpgSales.forEach(s => {
      const d = format(new Date(s.date), 'MMM dd');
      if (!groups[d]) groups[d] = { dateStr: d, Revenue: 0, Expenses: 0, Litres: 0, timestamp: s.date };
      groups[d].Revenue += (s.totalSalesAmount || 0);
    });

    stationExpenses.forEach(e => {
      const d = format(new Date(e.date), 'MMM dd');
      if (!groups[d]) groups[d] = { dateStr: d, Revenue: 0, Expenses: 0, Litres: 0, timestamp: e.date };
      groups[d].Expenses += (e.amount || 0);
    });

    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp).slice(-14);
  }, [stationPumpReadings, stationLpgSales, stationExpenses]);

  // Unified Audit Timeline Events
  const timelineEvents = useMemo(() => {
    const list: Array<{
      id: string;
      date: number;
      type: 'fuel' | 'lpg' | 'expense' | 'invoice' | 'delivery';
      title: string;
      subtitle: string;
      amount: number;
      litres?: number;
      category?: string;
      status?: string;
    }> = [];

    stationPumpReadings.forEach(r => {
      const sold = r.litresSold || (r.litresStop >= r.litresStart ? r.litresStop - r.litresStart : 0);
      const amt = r.calculatedRevenue || r.manualRevenue || (sold * (r.ratePerLitre || 0));
      list.push({
        id: `pump-${r.id || r.date}`,
        date: r.date,
        type: 'fuel',
        title: `${r.product || 'Fuel'} Dispensed`,
        subtitle: `Meters: ${r.litresStart?.toLocaleString()} → ${r.litresStop?.toLocaleString()} (${sold.toLocaleString()} L @ Ksh ${r.ratePerLitre || 0})`,
        amount: amt,
        litres: sold,
        category: r.product
      });
    });

    stationLpgSales.forEach(s => {
      list.push({
        id: `lpg-${s.id || s.date}`,
        date: s.date,
        type: 'lpg',
        title: `LPG Sale (${s.cylindersSold || 0} Cylinders)`,
        subtitle: `6kg: ${s.sold6kg || 0} | 13kg: ${s.sold13kg || 0} | Gas Refill / Complete`,
        amount: s.totalSalesAmount || 0
      });
    });

    stationExpenses.forEach(e => {
      list.push({
        id: `exp-${e.id || e.date}`,
        date: e.date,
        type: 'expense',
        title: `Expense: ${e.category || 'General'}`,
        subtitle: e.description || 'Station operating expense voucher',
        amount: e.amount || 0,
        category: e.category
      });
    });

    stationInvoices.forEach(inv => {
      list.push({
        id: `inv-${inv.id || inv.invoiceDate}`,
        date: inv.invoiceDate || inv.createdAt || Date.now(),
        type: 'invoice',
        title: `Invoice #${inv.invoiceNumber}: ${inv.customerName}`,
        subtitle: `Balance: Ksh ${(inv.balance || 0).toLocaleString()} • Status: ${inv.status || 'UNPAID'}`,
        amount: inv.invoiceAmount || 0,
        status: inv.status
      });
    });

    stationFleetExpenses.forEach(f => {
      list.push({
        id: `fleet-${f.id || f.date}`,
        date: f.date,
        type: 'delivery',
        title: `Fleet Fueling: ${f.carRegistration}`,
        subtitle: `Dispensed: ${f.litres?.toLocaleString() || 0} L by ${f.createdBy || 'Staff'}`,
        amount: f.amount || 0,
        litres: f.litres
      });
    });

    return list
      .filter(item => {
        if (timelineFilter !== 'all' && item.type !== timelineFilter) return false;
        if (timelineSearch) {
          const term = timelineSearch.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(term);
          const matchSub = item.subtitle.toLowerCase().includes(term);
          const matchCat = (item.category || '').toLowerCase().includes(term);
          return matchTitle || matchSub || matchCat;
        }
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }, [stationPumpReadings, stationLpgSales, stationExpenses, stationInvoices, stationFleetExpenses, timelineFilter, timelineSearch]);

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans p-2 sm:p-4 text-theme-text" id="station-dashboard-container">
      {/* Top Breadcrumb & Station Switcher Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-theme-border shadow-sm">
        <div className="flex items-center gap-3.5 flex-wrap">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-theme-text-muted hover:text-white border border-theme-border transition-all cursor-pointer shadow-sm"
              title="Return to Stations List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md font-bold border border-blue-500/25">
                {currentStation.code || 'ST-001'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                currentStation.status === 'active' 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStation.status === 'active' ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]' : 'bg-rose-400'}`} />
                {currentStation.status === 'active' ? 'OPERATING STATION' : 'INACTIVE'}
              </span>
              {currentStation.location && (
                <span className="inline-flex items-center gap-1 text-xs text-theme-text-muted font-medium">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {currentStation.location}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-theme-text tracking-tight mt-1">
              {currentStation.name}
            </h1>
            <p className="text-xs text-theme-text-muted font-medium">
              {currentStation.tradingAs || 'Loruk Energy Fuel Operations'} • {currentStation.poBox || 'P.O. Box 342'}
            </p>
          </div>
        </div>

        {/* Station Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Station selector dropdown */}
          <div className="flex items-center gap-2 bg-theme-panel border border-theme-border rounded-xl px-3 py-2 shadow-inner">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
            <select
              value={currentStation.id || currentStation.name}
              onChange={(e) => {
                const selected = stations.find(s => s.id === e.target.value || s.name === e.target.value);
                if (selected && onNavigateToStation) {
                  onNavigateToStation(selected.id!, selected.name);
                }
              }}
              className="bg-transparent text-xs font-bold text-theme-text focus:outline-none cursor-pointer pr-2"
              title="Switch Station"
            >
              {stations.map(st => (
                <option key={st.id || st.name} value={st.id || st.name} className="bg-[var(--theme-sidebar-bg,#070914)] text-theme-text font-bold">
                  {st.name} ({st.code || 'ST'})
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center bg-theme-panel border border-theme-border rounded-xl p-1">
            {(['all', '7d', '30d', 'this_month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
              >
                {range === 'all' ? 'All Time' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'Month'}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrintDossier}
            className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-theme-text border border-theme-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Print Station Dossier"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Dashboard (6 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Gross Revenue */}
        <div className="glass-panel rounded-xl p-4 border border-blue-500/30 bg-blue-500/[0.03] shadow-[0_0_20px_rgba(59,130,246,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Gross Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <span className="text-xs font-bold text-blue-400/80 mr-1">Ksh</span>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-blue-400 tracking-tight leading-none">
                {totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-[10px] text-theme-text-muted font-medium mt-1.5 truncate">
              Fuel: <span className="font-bold text-blue-300">Ksh {fuelMetrics.totalFuelRev.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Fuel Volume Dispensed */}
        <div className="glass-panel rounded-xl p-4 border border-sky-500/30 bg-sky-500/[0.03] shadow-[0_0_20px_rgba(56,189,248,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Total Dispensed</p>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <h3 className="text-xl sm:text-2xl font-black font-mono text-sky-400 tracking-tight leading-none">
                {fuelMetrics.totalLitres.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </h3>
              <span className="text-xs font-bold text-sky-400/80 ml-1">L</span>
            </div>
            <p className="text-[10px] text-theme-text-muted font-medium mt-1.5 truncate">
              PMS: {fuelMetrics.superLitres.toLocaleString()}L • AGO: {fuelMetrics.dieselLitres.toLocaleString()}L
            </p>
          </div>
        </div>

        {/* Metric 3: Station Operating Expenses */}
        <div className="glass-panel rounded-xl p-4 border border-rose-500/30 bg-rose-500/[0.03] shadow-[0_0_20px_rgba(244,63,94,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Operating Expenses</p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <span className="text-xs font-bold text-rose-400/80 mr-1">Ksh</span>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-rose-400 tracking-tight leading-none">
                {totalExpensesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-[10px] text-theme-text-muted font-medium mt-1.5 truncate">
              {stationExpenses.length} expense vouchers logged
            </p>
          </div>
        </div>

        {/* Metric 4: Net Operating Profit */}
        <div className="glass-panel rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/[0.03] shadow-[0_0_20px_rgba(16,185,129,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Net Operating Profit</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <span className="text-xs font-bold text-emerald-400/80 mr-1">Ksh</span>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-400 text-glow-green tracking-tight leading-none">
                {netOperatingProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded mt-1.5 border border-emerald-500/30">
              <Percent className="w-2.5 h-2.5" /> Margin: {profitMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 5: Liquid Cash & M-Pesa */}
        <div className="glass-panel rounded-xl p-4 border border-purple-500/30 bg-purple-500/[0.03] shadow-[0_0_20px_rgba(168,85,247,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Cash & M-Pesa</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <span className="text-xs font-bold text-purple-400/80 mr-1">Ksh</span>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-purple-400 tracking-tight leading-none">
                {totalLiquidCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-[10px] text-theme-text-muted font-medium mt-1.5 truncate">
              Cash: Ksh {(latestCashPosition.cashAtHand || 0).toLocaleString()} • M-Pesa: Ksh {(latestCashPosition.mpesaBalance || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Metric 6: Outstanding Invoices Balance */}
        <div className="glass-panel rounded-xl p-4 border border-amber-500/30 bg-amber-500/[0.03] shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-extrabold text-theme-text-muted uppercase tracking-wider">Receivables Owed</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline">
              <span className="text-xs font-bold text-amber-400/80 mr-1">Ksh</span>
              <h3 className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-tight leading-none">
                {outstandingInvoicesBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-[10px] text-theme-text-muted font-medium mt-1.5 truncate">
              {stationInvoices.filter(i => i.status !== 'PAID').length} pending invoices
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-theme-border overflow-x-auto gap-2 pb-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & Charts', icon: BarChart3 },
          { id: 'fuel', label: 'Fuel Pump Operations', icon: Fuel },
          { id: 'lpg', label: 'LPG Gas & Cylinders', icon: Flame },
          { id: 'expenses', label: 'Operating Expenses', icon: ReceiptText },
          { id: 'invoices', label: 'Invoices & Credit', icon: FileText },
          { id: 'timeline', label: 'Audit Statement Timeline', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-extrabold'
                  : 'border-transparent text-theme-text-muted hover:text-theme-text hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICAL CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Revenue vs Expenses Evolution */}
            <div className="lg:col-span-2 glass-panel border border-theme-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-theme-text tracking-tight">Station Revenue & Expense Dynamics</h3>
                  <p className="text-xs text-theme-text-muted">Time-series comparison of incoming sales vs outflow expenses</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 rounded-lg shadow-sm">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Performance Scale</span>
                </div>
              </div>

              <div className="h-72 w-full relative">
                {timelineTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
                    No timeline transactions recorded yet for this station
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                      <XAxis dataKey="dateStr" fontSize={11} stroke="#94A3B8" tickLine={false} />
                      <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={(v) => `K${Math.round(v/1000)}k`} tickLine={false} />
                      <Tooltip
                        formatter={(val: any, name: any) => [`KES ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                          borderColor: 'rgba(56, 189, 248, 0.3)',
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                          color: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="Revenue" stroke="#38BDF8" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                      <Area type="monotone" dataKey="Expenses" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#expGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Product Revenue Distribution Donut */}
            <div className="glass-panel border border-theme-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-black text-theme-text tracking-tight">Revenue Stream Share</h3>
                  <p className="text-xs text-theme-text-muted">Proportional breakdown by fuel & LPG product types</p>
                </div>

                <div className="h-52 w-full relative">
                  {productDistributionData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
                      No sales data logged
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productDistributionData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {productDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, 'Revenue']}
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#fff'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-3 border-t border-theme-border">
                {productDistributionData.map(p => (
                  <div key={p.name} className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-theme-text-muted">{p.name}</span>
                    </div>
                    <span className="font-mono font-bold text-theme-text">Ksh {p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Indicators & Rates Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Fuel Pricing */}
            <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Station Pump Prices</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 font-bold">Active Tariffs</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white/[0.02] border border-theme-border rounded-xl">
                  <span className="text-xs text-theme-text-muted block">Super (PMS)</span>
                  <span className="text-lg font-black font-mono text-sky-400">Ksh {currentRates.superRate.toFixed(2)}/L</span>
                </div>
                <div className="p-3 bg-white/[0.02] border border-theme-border rounded-xl">
                  <span className="text-xs text-theme-text-muted block">Diesel (AGO)</span>
                  <span className="text-lg font-black font-mono text-blue-400">Ksh {currentRates.dieselRate.toFixed(2)}/L</span>
                </div>
              </div>
            </div>

            {/* Volume Breakdown Summary */}
            <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-sm space-y-3">
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Dispensed Volume Mix</span>
              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-theme-text-muted">Super Petrol</span>
                    <span className="font-mono font-bold text-sky-400">{fuelMetrics.superLitres.toLocaleString()} L</span>
                  </div>
                  <div className="h-1.5 bg-theme-panel rounded-full overflow-hidden border border-theme-border/60">
                    <div 
                      className="h-full bg-sky-400 rounded-full" 
                      style={{ width: `${fuelMetrics.totalLitres > 0 ? (fuelMetrics.superLitres / fuelMetrics.totalLitres) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-theme-text-muted">Diesel AGO</span>
                    <span className="font-mono font-bold text-blue-400">{fuelMetrics.dieselLitres.toLocaleString()} L</span>
                  </div>
                  <div className="h-1.5 bg-theme-panel rounded-full overflow-hidden border border-theme-border/60">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${fuelMetrics.totalLitres > 0 ? (fuelMetrics.dieselLitres / fuelMetrics.totalLitres) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Expenses Distribution */}
            <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-sm space-y-3">
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Operating Expense Categories</span>
              <div className="space-y-2 pt-1">
                {expenseByCategory.slice(0, 3).map((exp, idx) => (
                  <div key={exp.name} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-theme-text-muted">{exp.name}</span>
                    <span className="font-mono font-bold text-rose-400">Ksh {exp.value.toLocaleString()}</span>
                  </div>
                ))}
                {expenseByCategory.length === 0 && (
                  <span className="text-xs text-theme-text-muted italic">No expense records logged</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUEL PUMP OPERATIONS */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-theme-border flex justify-between items-center flex-wrap gap-3">
              <div>
                <h3 className="text-base font-black text-theme-text tracking-tight">Meter Readings & Dispenser Logs</h3>
                <p className="text-xs text-theme-text-muted">Detailed pump meter shifts, litres dispensed, and cash revenues</p>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 bg-sky-500/15 text-sky-400 rounded-lg border border-sky-500/30">
                {stationPumpReadings.length} Meter Logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="modern-tr">
                    <th className="modern-th">Date & Time</th>
                    <th className="modern-th">Product</th>
                    <th className="modern-th text-right">Start Meter</th>
                    <th className="modern-th text-right">Stop Meter</th>
                    <th className="modern-th text-right">Volume (L)</th>
                    <th className="modern-th text-right">Rate/L</th>
                    <th className="modern-th text-right">Revenue (Ksh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm font-medium">
                  {stationPumpReadings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-theme-text-muted text-sm">
                        No pump meter readings logged for {currentStation.name}.
                      </td>
                    </tr>
                  ) : (
                    stationPumpReadings.map((r, idx) => {
                      const sold = r.litresSold || (r.litresStop >= r.litresStart ? r.litresStop - r.litresStart : 0);
                      const rev = r.calculatedRevenue || r.manualRevenue || (sold * (r.ratePerLitre || 0));
                      const isSuper = (r.product || '').toLowerCase().includes('super');
                      return (
                        <tr key={r.id || idx} className="hover:bg-white/[0.03] transition-colors">
                          <td className="modern-td font-mono text-xs text-theme-text-muted">
                            {format(new Date(r.date), 'dd-MMM-yyyy HH:mm')}
                          </td>
                          <td className="modern-td">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                              isSuper ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}>
                              <Fuel className="w-3.5 h-3.5" />
                              {r.product}
                            </span>
                          </td>
                          <td className="modern-td text-right font-mono text-xs">{r.litresStart?.toLocaleString()}</td>
                          <td className="modern-td text-right font-mono text-xs">{r.litresStop?.toLocaleString()}</td>
                          <td className="modern-td text-right font-mono font-bold text-xs text-sky-400">
                            {sold.toLocaleString()} L
                          </td>
                          <td className="modern-td text-right font-mono text-xs">Ksh {r.ratePerLitre || 0}</td>
                          <td className="modern-td text-right font-mono font-bold text-xs text-emerald-400">
                            Ksh {rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      )}

      {/* TAB 3: LPG GAS & CYLINDERS */}
      {activeTab === 'lpg' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-orange-500/30 bg-orange-500/[0.03]">
              <span className="text-xs font-bold text-theme-text-muted uppercase">Total LPG Sales</span>
              <h3 className="text-2xl font-black font-mono text-orange-400 mt-1">
                Ksh {lpgRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">{stationLpgSales.length} retail sale transactions</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-theme-border">
              <span className="text-xs font-bold text-theme-text-muted uppercase">LPG Replenishments</span>
              <h3 className="text-2xl font-black font-mono text-theme-text mt-1">
                Ksh {lpgCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">{stationLpgPurchases.length} stock refill batches</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03]">
              <span className="text-xs font-bold text-theme-text-muted uppercase">LPG Gross Margin</span>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">
                Ksh {(lpgRevenue - lpgCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">Net cylinder retail margin</p>
            </div>
          </div>

          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-theme-border">
              <h3 className="text-base font-black text-theme-text tracking-tight">LPG Cylinder Sales Log</h3>
              <p className="text-xs text-theme-text-muted">6kg, 13kg, and 50kg cylinder refills and complete gas transactions</p>
            </div>

            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="modern-tr">
                    <th className="modern-th">Date</th>
                    <th className="modern-th text-center">Total Cylinders</th>
                    <th className="modern-th text-center">6kg Sold</th>
                    <th className="modern-th text-center">13kg Sold</th>
                    <th className="modern-th text-right">Total Amount (Ksh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm font-medium">
                  {stationLpgSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-theme-text-muted text-sm">
                        No LPG sales logged for this station.
                      </td>
                    </tr>
                  ) : (
                    stationLpgSales.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="modern-td font-mono text-xs text-theme-text-muted">
                          {format(new Date(s.date), 'dd-MMM-yyyy')}
                        </td>
                        <td className="modern-td text-center font-bold text-orange-400">
                          {s.cylindersSold || 0}
                        </td>
                        <td className="modern-td text-center font-mono text-xs">{s.sold6kg || 0}</td>
                        <td className="modern-td text-center font-mono text-xs">{s.sold13kg || 0}</td>
                        <td className="modern-td text-right font-mono font-bold text-xs text-emerald-400">
                          Ksh {(s.totalSalesAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES & COST CONTROL */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-theme-border flex justify-between items-center flex-wrap gap-3">
              <div>
                <h3 className="text-base font-black text-theme-text tracking-tight">Station Expense Vouchers</h3>
                <p className="text-xs text-theme-text-muted">Comprehensive cost breakdown: Utilities, staff, maintenance, and supplies</p>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 bg-rose-500/15 text-rose-400 rounded-lg border border-rose-500/30">
                Total: Ksh {totalExpensesAmount.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="modern-tr">
                    <th className="modern-th">Date</th>
                    <th className="modern-th">Category</th>
                    <th className="modern-th">Description</th>
                    <th className="modern-th text-right">Amount (Ksh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm font-medium">
                  {stationExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-theme-text-muted text-sm">
                        No expense records registered for {currentStation.name}.
                      </td>
                    </tr>
                  ) : (
                    stationExpenses.map((e, idx) => (
                      <tr key={e.id || idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="modern-td font-mono text-xs text-theme-text-muted">
                          {format(new Date(e.date), 'dd-MMM-yyyy')}
                        </td>
                        <td className="modern-td">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            {e.category || 'General'}
                          </span>
                        </td>
                        <td className="modern-td text-theme-text-muted max-w-[280px] truncate" title={e.description}>
                          {e.description || 'No notes provided'}
                        </td>
                        <td className="modern-td text-right font-mono font-bold text-xs text-rose-400">
                          Ksh {(e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INVOICES & STATION CUSTOMERS */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.03]">
              <span className="text-xs font-bold text-theme-text-muted uppercase">Total Invoiced</span>
              <h3 className="text-2xl font-black font-mono text-blue-400 mt-1">
                Ksh {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03]">
              <span className="text-xs font-bold text-theme-text-muted uppercase">Settled Payments</span>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">
                Ksh {totalInvoicesPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.03]">
              <span className="text-xs font-bold text-theme-text-muted uppercase">Pending Receivables</span>
              <h3 className="text-2xl font-black font-mono text-amber-400 mt-1">
                Ksh {outstandingInvoicesBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-theme-border">
              <h3 className="text-base font-black text-theme-text tracking-tight">Station Invoices Ledger</h3>
              <p className="text-xs text-theme-text-muted">Issued customer invoices and credit balances associated with this location</p>
            </div>

            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="modern-tr">
                    <th className="modern-th">Invoice #</th>
                    <th className="modern-th">Customer Name</th>
                    <th className="modern-th">Date</th>
                    <th className="modern-th text-right">Invoice Amount</th>
                    <th className="modern-th text-right">Paid</th>
                    <th className="modern-th text-right">Balance</th>
                    <th className="modern-th text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm font-medium">
                  {stationInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-theme-text-muted text-sm">
                        No customer invoices linked to this station.
                      </td>
                    </tr>
                  ) : (
                    stationInvoices.map((inv, idx) => (
                      <tr key={inv.id || idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="modern-td font-mono font-bold text-xs text-blue-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="modern-td font-bold text-theme-text">
                          {inv.customerName}
                        </td>
                        <td className="modern-td font-mono text-xs text-theme-text-muted">
                          {format(new Date(inv.invoiceDate || inv.createdAt || Date.now()), 'dd-MMM-yyyy')}
                        </td>
                        <td className="modern-td text-right font-mono font-bold text-xs">
                          Ksh {(inv.invoiceAmount || 0).toLocaleString()}
                        </td>
                        <td className="modern-td text-right font-mono text-xs text-emerald-400">
                          Ksh {(inv.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="modern-td text-right font-mono font-bold text-xs text-amber-400">
                          Ksh {(inv.balance || 0).toLocaleString()}
                        </td>
                        <td className="modern-td text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : inv.status === 'PARTIAL'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}>
                            {inv.status || 'UNPAID'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT STATEMENT TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-theme-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-theme-text tracking-tight">Complete Station Activity Timeline</h3>
                  <p className="text-xs text-theme-text-muted">Chronological audit stream of every fuel dispense, LPG sale, delivery, and cost voucher</p>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-1.5 bg-theme-panel border border-theme-border p-1 rounded-xl">
                  {(['all', 'fuel', 'lpg', 'expense', 'invoice', 'delivery'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTimelineFilter(f)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                        timelineFilter === f
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm font-extrabold'
                          : 'text-theme-text-muted hover:text-theme-text'
                      }`}
                    >
                      {f === 'all' ? 'All Events' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search bar */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  type="text"
                  placeholder="Search activity description, product, reference..."
                  value={timelineSearch}
                  onChange={e => setTimelineSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-theme-border rounded-xl text-xs sm:text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-theme-text-muted"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="modern-tr">
                    <th className="modern-th">Date & Time</th>
                    <th className="modern-th">Activity</th>
                    <th className="modern-th">Details & Notes</th>
                    <th className="modern-th text-right">Volume</th>
                    <th className="modern-th text-right">Financial Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm font-medium">
                  {timelineEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-theme-text-muted text-sm">
                        No transactions registered matching this filter query.
                      </td>
                    </tr>
                  ) : (
                    timelineEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="modern-td font-mono text-xs text-theme-text-muted">
                          {format(new Date(e.date), 'dd-MMM-yyyy HH:mm')}
                        </td>
                        <td className="modern-td">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${
                              e.type === 'fuel' 
                                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' 
                                : e.type === 'lpg'
                                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                                  : e.type === 'expense'
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            }`}>
                              {e.type === 'fuel' && <Fuel className="w-3.5 h-3.5" />}
                              {e.type === 'lpg' && <Flame className="w-3.5 h-3.5" />}
                              {e.type === 'expense' && <ReceiptText className="w-3.5 h-3.5" />}
                              {e.type === 'invoice' && <FileText className="w-3.5 h-3.5" />}
                              {e.type === 'delivery' && <Truck className="w-3.5 h-3.5" />}
                            </div>
                            <span className="font-bold text-xs text-theme-text">{e.title}</span>
                          </div>
                        </td>
                        <td className="modern-td text-xs text-theme-text-muted max-w-[280px] truncate" title={e.subtitle}>
                          {e.subtitle}
                        </td>
                        <td className="modern-td text-right font-mono text-xs">
                          {e.litres ? `${e.litres.toLocaleString()} L` : '—'}
                        </td>
                        <td className="modern-td text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={e.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}>
                            {e.type === 'expense' ? '-' : '+'}Ksh {e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
