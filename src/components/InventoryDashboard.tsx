import React, { useMemo } from 'react';
import { 
  useDailyPumpReadings, 
  useLpgSales, 
  useLpgPurchases, 
  useBurnerSales, 
  useBurnerPurchases, 
  useGrillSales, 
  useGrillPurchases,
  useOpeningStocks
} from '../lib/operationsDb';
import { formatLitres, getStationColor } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from 'recharts';
import { Database, Fuel, Flame, ShoppingBag, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface InventoryDashboardProps {
  selectedStation: 'Ndalu' | 'Junction' | 'Combined';
}

export default function InventoryDashboard({ selectedStation }: InventoryDashboardProps) {
  // Database Hooks
  const { readings, loading: readingsLoading } = useDailyPumpReadings();
  const { sales: lpgSales, loading: lpgSalesLoading } = useLpgSales();
  const { purchases: lpgPurchases, loading: lpgPurchasesLoading } = useLpgPurchases();
  const { sales: burnerSales, loading: burnerSalesLoading } = useBurnerSales();
  const { purchases: burnerPurchases, loading: burnerPurchasesLoading } = useBurnerPurchases();
  const { sales: grillSales, loading: grillSalesLoading } = useGrillSales();
  const { purchases: grillPurchases, loading: grillPurchasesLoading } = useGrillPurchases();
  const { openingStocks, loading: stocksLoading } = useOpeningStocks();

  const loading = 
    readingsLoading || 
    lpgSalesLoading || 
    lpgPurchasesLoading || 
    burnerSalesLoading || 
    burnerPurchasesLoading || 
    grillSalesLoading || 
    grillPurchasesLoading ||
    stocksLoading;

  // Inventory logic helper (Module 9-inspired but adapted for Dashboard with Combined support)
  const inventorySummary = useMemo(() => {
    const filterByStat = (item: { station: string }) => selectedStation === 'Combined' || item.station === selectedStation;

    const filteredReadings = readings.filter(filterByStat);
    const filteredLpgSales = lpgSales.filter(filterByStat);
    const filteredLpgPurchases = lpgPurchases.filter(filterByStat);
    const filteredBurnerSales = burnerSales.filter(filterByStat);
    const filteredBurnerPurchases = burnerPurchases.filter(filterByStat);
    const filteredGrillSales = grillSales.filter(filterByStat);
    const filteredGrillPurchases = grillPurchases.filter(filterByStat);

    // Initial stock levels resolved dynamically from opening stock DB or falling back to safe defaults if unconfigured
    let initSuper = 50000; 
    let initDiesel = 50000;
    let initLpg6kg = 125;
    let initLpg13kg = 125;
    let initEmptyCylinders6kg = 100;
    let initEmptyCylinders13kg = 100;
    let initBurners = 100;
    let initGrills = 80;

    const ndaluStock = openingStocks.find(s => s.id === 'Ndalu' || s.station === 'Ndalu');
    const junctionStock = openingStocks.find(s => s.id === 'Junction' || s.station === 'Junction');

    const ndaluSuper = ndaluStock ? ndaluStock.super : 25000;
    const ndaluDiesel = ndaluStock ? ndaluStock.diesel : 25000;
    const ndaluLpg6kg = ndaluStock ? ndaluStock.lpg6kg : 60;
    const ndaluLpg13kg = ndaluStock ? ndaluStock.lpg13kg : 65;
    const ndaluEmptyCylinders6kg = ndaluStock ? ndaluStock.emptyCylinders6kg : 50;
    const ndaluEmptyCylinders13kg = ndaluStock ? ndaluStock.emptyCylinders13kg : 50;
    const ndaluBurner = ndaluStock ? ndaluStock.burner : 50;
    const ndaluGrill = ndaluStock ? ndaluStock.grill : 40;

    const junctionSuper = junctionStock ? junctionStock.super : 25000;
    const junctionDiesel = junctionStock ? junctionStock.diesel : 25000;
    const junctionLpg6kg = junctionStock ? junctionStock.lpg6kg : 60;
    const junctionLpg13kg = junctionStock ? junctionStock.lpg13kg : 65;
    const junctionEmptyCylinders6kg = junctionStock ? junctionStock.emptyCylinders6kg : 50;
    const junctionEmptyCylinders13kg = junctionStock ? junctionStock.emptyCylinders13kg : 50;
    const junctionBurner = junctionStock ? junctionStock.burner : 50;
    const junctionGrill = junctionStock ? junctionStock.grill : 40;

    if (selectedStation === 'Ndalu') {
      initSuper = ndaluSuper;
      initDiesel = ndaluDiesel;
      initLpg6kg = ndaluLpg6kg;
      initLpg13kg = ndaluLpg13kg;
      initEmptyCylinders6kg = ndaluEmptyCylinders6kg;
      initEmptyCylinders13kg = ndaluEmptyCylinders13kg;
      initBurners = ndaluBurner;
      initGrills = ndaluGrill;
    } else if (selectedStation === 'Junction') {
      initSuper = junctionSuper;
      initDiesel = junctionDiesel;
      initLpg6kg = junctionLpg6kg;
      initLpg13kg = junctionLpg13kg;
      initEmptyCylinders6kg = junctionEmptyCylinders6kg;
      initEmptyCylinders13kg = junctionEmptyCylinders13kg;
      initBurners = junctionBurner;
      initGrills = junctionGrill;
    } else {
      // Combined
      initSuper = ndaluSuper + junctionSuper;
      initDiesel = ndaluDiesel + junctionDiesel;
      initLpg6kg = ndaluLpg6kg + junctionLpg6kg;
      initLpg13kg = ndaluLpg13kg + junctionLpg13kg;
      initEmptyCylinders6kg = ndaluEmptyCylinders6kg + junctionEmptyCylinders6kg;
      initEmptyCylinders13kg = ndaluEmptyCylinders13kg + junctionEmptyCylinders13kg;
      initBurners = ndaluBurner + junctionBurner;
      initGrills = ndaluGrill + junctionGrill;
    }

    // Calculations
    const dieselSold = filteredReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.litresSold, 0);
    const superSold = filteredReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.litresSold, 0);

    const lpgRefillsSold6kgCount = filteredLpgSales.reduce((sum, s) => sum + (s.sold6kg || 0), 0);
    const lpgRefillsSold13kgCount = filteredLpgSales.reduce((sum, s) => sum + (s.sold13kg || 0), 0);
    const completeGasSoldCount = filteredLpgSales.reduce((sum, s) => sum + (s.completeGasSold || 0), 0);
    const emptyCylindersSold6kgCount = filteredLpgSales.reduce((sum, s) => sum + (s.emptyCylindersSold6kg || 0), 0);
    const emptyCylindersSold13kgCount = filteredLpgSales.reduce((sum, s) => sum + (s.emptyCylindersSold13kg || 0), 0);

    const lpgBought6kgCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.bought6kg || 0), 0);
    const lpgBought13kgCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.bought13kg || 0), 0);

    const emptyCylindersBought6kgCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.emptyCylindersBought6kg || 0), 0);
    const emptyCylindersBought13kgCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.emptyCylindersBought13kg || 0), 0);

    const emptyCylindersClosing6kg = initEmptyCylinders6kg + lpgRefillsSold6kgCount + emptyCylindersBought6kgCount - emptyCylindersSold6kgCount;
    const emptyCylindersClosing13kg = initEmptyCylinders13kg + lpgRefillsSold13kgCount + emptyCylindersBought13kgCount - emptyCylindersSold13kgCount - completeGasSoldCount;

    // ... (rest of the inventory summary object needs to be updated)

    const burnersBoughtCount = filteredBurnerPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const burnersSoldCount = filteredBurnerSales.reduce((sum, s) => sum + (s.quantity || 0), 0) + completeGasSoldCount;

    const grillsBoughtCount = filteredGrillPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const grillsSoldCount = filteredGrillSales.reduce((sum, s) => sum + (s.quantity || 0), 0) + completeGasSoldCount;

    return {
      super: { 
        opening: initSuper, 
        purchased: 0, 
        sold: superSold, 
        closing: initSuper - superSold,
        percentage: ((initSuper - superSold) / initSuper) * 100,
        unit: 'L',
        icon: Fuel,
        color: '#10b981'
      },
      diesel: { 
        opening: initDiesel, 
        purchased: 0, 
        sold: dieselSold, 
        closing: initDiesel - dieselSold,
        percentage: ((initDiesel - dieselSold) / initDiesel) * 100,
        unit: 'L',
        icon: Fuel,
        color: '#3b82f6'
      },
      lpg6kg: { 
        opening: initLpg6kg, 
        purchased: lpgBought6kgCount, 
        sold: lpgRefillsSold6kgCount, 
        closing: initLpg6kg + lpgBought6kgCount - lpgRefillsSold6kgCount,
        percentage: ((initLpg6kg + lpgBought6kgCount - lpgRefillsSold6kgCount) / (initLpg6kg + lpgBought6kgCount || 1)) * 100,
        unit: 'Cyls',
        icon: Flame,
        color: '#6366f1'
      },
      lpg13kg: { 
        opening: initLpg13kg,
        purchased: lpgBought13kgCount,
        sold: lpgRefillsSold13kgCount,
        closing: initLpg13kg + lpgBought13kgCount - lpgRefillsSold13kgCount,
        percentage: ((initLpg13kg + lpgBought13kgCount - lpgRefillsSold13kgCount) / (initLpg13kg + lpgBought13kgCount || 1)) * 100,
        unit: 'Cyls',
        icon: Flame,
        color: '#8b5cf6'
      },
      emptyCylinder6kg: {
        opening: initEmptyCylinders6kg,
        purchased: emptyCylindersBought6kgCount + lpgRefillsSold6kgCount,
        sold: emptyCylindersSold6kgCount,
        closing: emptyCylindersClosing6kg,
        percentage: ((emptyCylindersClosing6kg) / (initEmptyCylinders6kg + emptyCylindersBought6kgCount + lpgRefillsSold6kgCount || 1)) * 100,
        unit: 'Cyls',
        icon: Database,
        color: '#a855f7'
      },
      emptyCylinder13kg: {
        opening: initEmptyCylinders13kg,
        purchased: emptyCylindersBought13kgCount + lpgRefillsSold13kgCount,
        sold: emptyCylindersSold13kgCount + completeGasSoldCount,
        closing: emptyCylindersClosing13kg - completeGasSoldCount,
        percentage: ((emptyCylindersClosing13kg - completeGasSoldCount) / (initEmptyCylinders13kg + emptyCylindersBought13kgCount + lpgRefillsSold13kgCount || 1)) * 100,
        unit: 'Cyls',
        icon: Database,
        color: '#d946ef'
      },
      burner: { 
        opening: initBurners, 
        purchased: burnersBoughtCount, 
        sold: burnersSoldCount, 
        closing: initBurners + burnersBoughtCount - burnersSoldCount,
        percentage: ((initBurners + burnersBoughtCount - burnersSoldCount) / (initBurners + burnersBoughtCount || 1)) * 100,
        unit: 'Units',
        icon: ShoppingBag,
        color: '#f59e0b'
      },
      grill: { 
        opening: initGrills, 
        purchased: grillsBoughtCount, 
        sold: grillsSoldCount, 
        closing: initGrills + grillsBoughtCount - grillsSoldCount,
        percentage: ((initGrills + grillsBoughtCount - grillsSoldCount) / (initGrills + grillsBoughtCount || 1)) * 100,
        unit: 'Units',
        icon: ShoppingBag,
        color: '#ec4899'
      }
    };
  }, [readings, lpgSales, lpgPurchases, burnerSales, burnerPurchases, grillSales, grillPurchases, selectedStation, openingStocks]);

  const fuelChartData = useMemo(() => {
    return [
      {
        name: 'Super Petrol',
        'Opening Stock': inventorySummary.super.opening,
        'Sold In Period': inventorySummary.super.sold,
        'Closing Stock': inventorySummary.super.closing,
      },
      {
        name: 'Diesel Fuel',
        'Opening Stock': inventorySummary.diesel.opening,
        'Sold In Period': inventorySummary.diesel.sold,
        'Closing Stock': inventorySummary.diesel.closing,
      }
    ];
  }, [inventorySummary]);

  const retailAppliancesChartData = useMemo(() => {
    return [
      {
        name: 'LPG 6kg',
        'Opening Stock': inventorySummary.lpg6kg.opening,
        'Items Purchased': inventorySummary.lpg6kg.purchased,
        'Items Sold': inventorySummary.lpg6kg.sold,
        'Closing Stock': inventorySummary.lpg6kg.closing,
      },
      {
        name: 'LPG 13kg',
        'Opening Stock': inventorySummary.lpg13kg.opening,
        'Items Purchased': inventorySummary.lpg13kg.purchased,
        'Items Sold': inventorySummary.lpg13kg.sold,
        'Closing Stock': inventorySummary.lpg13kg.closing,
      },
      {
        name: 'Empty LPG 6kg',
        'Opening Stock': inventorySummary.emptyCylinder6kg.opening,
        'Items Purchased': inventorySummary.emptyCylinder6kg.purchased,
        'Items Sold': inventorySummary.emptyCylinder6kg.sold,
        'Closing Stock': inventorySummary.emptyCylinder6kg.closing,
      },
      {
        name: 'Empty LPG 13kg',
        'Opening Stock': inventorySummary.emptyCylinder13kg.opening,
        'Items Purchased': inventorySummary.emptyCylinder13kg.purchased,
        'Items Sold': inventorySummary.emptyCylinder13kg.sold,
        'Closing Stock': inventorySummary.emptyCylinder13kg.closing,
      },
      {
        name: 'Eco Burners',
        'Opening Stock': inventorySummary.burner.opening,
        'Items Purchased': inventorySummary.burner.purchased,
        'Items Sold': inventorySummary.burner.sold,
        'Closing Stock': inventorySummary.burner.closing,
      },
      {
        name: 'Charcoal Grills',
        'Opening Stock': inventorySummary.grill.opening,
        'Items Purchased': inventorySummary.grill.purchased,
        'Items Sold': inventorySummary.grill.sold,
        'Closing Stock': inventorySummary.grill.closing,
      }
    ];
  }, [inventorySummary]);

  // Alert Thresholds - items below 40% are warning, below 25% are critical
  const statusItems = useMemo(() => {
    const list = [
      { label: 'Super Petrol', value: inventorySummary.super },
      { label: 'Diesel Fuel', value: inventorySummary.diesel },
      { label: 'LPG 6kg', value: inventorySummary.lpg6kg },
      { label: 'LPG 13kg', value: inventorySummary.lpg13kg },
      { label: 'Empty LPG 6kg', value: inventorySummary.emptyCylinder6kg },
      { label: 'Empty LPG 13kg', value: inventorySummary.emptyCylinder13kg },
      { label: 'Eco Burners', value: inventorySummary.burner },
      { label: 'Charcoal Grills', value: inventorySummary.grill }
    ];

    return list.map(item => {
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (item.value.percentage < 40) {
        status = 'critical';
      } else if (item.value.percentage < 60) {
        status = 'warning';
      }
      return {
        ...item,
        status
      };
    });
  }, [inventorySummary]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-blue-900 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[280px] bg-gray-200 dark:bg-blue-900 rounded"></div>
          <div className="h-[280px] bg-gray-200 dark:bg-blue-900 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION TITLE & CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-blue-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Inventory Stock Levels & Logistics (Live)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time visual monitoring of liquid fuel capacities and retail warehouse commodities
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg border border-gray-150 dark:border-blue-900 text-xs text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-blue-500" />
          <span>Active Scope: </span>
          <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {selectedStation === 'Combined' ? 'Entire Station Network' : `${selectedStation} Station`}
          </span>
        </div>
      </div>

      {/* QUICK BENTO GRID METRICS WITH MICRO-GAUGES */}
      <div id="inventory-bento-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statusItems.map(item => {
          const Icon = item.value.icon;
          const statusColors = 
            item.status === 'critical'
              ? 'border-rose-200 dark:border-rose-950/50 bg-rose-50/20 text-rose-600'
              : item.status === 'warning'
                ? 'border-amber-200 dark:border-amber-950/50 bg-amber-50/20 text-amber-600'
                : 'border-emerald-200 dark:border-emerald-950/50 bg-emerald-50/20 text-emerald-600';

          return (
            <div 
              key={item.label} 
              className={`bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/60 p-4.5 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-300 relative group overflow-hidden`}
            >
              {/* Top Row: Label and Icon */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs text-gray-400 group-hover:text-gray-500 font-bold transition-all uppercase tracking-wide">
                    {item.label}
                  </h4>
                  <span className="text-xl font-bold font-mono text-gray-900 dark:text-blue-100 mt-1 block">
                    {item.value.closing.toLocaleString()} <span className="text-[11px] text-gray-400 font-normal">{item.value.unit}</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-blue-900/20 text-gray-500 dark:text-blue-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Progress and Level Indicators */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-gray-400">Level (Remaining)</span>
                  <span className={`font-mono ${item.status === 'critical' ? 'text-rose-500' : item.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {item.value.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 w-full bg-gray-100 dark:bg-blue-900/10 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${item.value.percentage}%` }} 
                    className={`h-full rounded-full transition-all duration-700 ${
                      item.status === 'critical' 
                        ? 'bg-rose-500 shadow-xs shadow-rose-500/20' 
                        : item.status === 'warning' 
                          ? 'bg-amber-400 shadow-xs shadow-amber-400/20' 
                          : 'bg-emerald-500 shadow-xs shadow-emerald-500/20'
                    }`}
                  />
                </div>

                {/* Bottom Diagnosis indicator */}
                <div className={`flex items-center gap-1 text-[10px] p-1 px-1.5 rounded-lg border ${statusColors} font-semibold font-mono mt-2`}>
                  {item.status === 'critical' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>CRITICAL LOW STOCK</span>
                    </>
                  ) : item.status === 'warning' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>WARNING: TOP-UP REQUIRED</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>HEALTHY CAPACITY</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECHARTS PLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: LIQUID FUELS CAPACITY (LITRES) */}
        <div id="fuel-inventory-chart-card" className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-emerald-500" />
                Liquid Fuels Volume Diagnostic
              </h3>
              <p className="text-[10px] text-gray-400">Total litres of Super & Diesel currently available at pumps</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 p-1 px-2 rounded-full font-mono">
              Unit: Litres (L)
            </span>
          </div>

          <div className="h-[260px] w-full text-xs mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={fuelChartData} 
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-blue-900" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  tickLine={false} 
                  axisLine={false} 
                  className="font-semibold text-gray-500 dark:text-gray-400" 
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${(val / 1000)}k`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e3a8a', 
                    color: '#f3f4f6', 
                    border: '1px solid #3b82f6', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'monospace'
                  }} 
                  formatter={(value: number) => [`${value.toLocaleString()} L`, 'Value']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Opening Stock" fill="#a7f3d0" radius={[4, 4, 0, 0]} name="Opening baseline" opacity={0.3} />
                <Bar dataKey="Sold In Period" fill="#ef4444" radius={[4, 4, 0, 0]} name="Total sold" />
                <Bar dataKey="Closing Stock" fill="#10b981" radius={[4, 4, 0, 0]} name="Closing inventory" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: COMMODITIES & APPLIANCES (UNITS) */}
        <div id="retail-inventory-chart-card" className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-500" />
                LPG & Domestic Retail Appliances
              </h3>
              <p className="text-[10px] text-gray-400">Total cylinders, eco burners and charcoal grills in local stock</p>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 p-1 px-2 rounded-full font-mono">
              Unit: Units/Cylinders
            </span>
          </div>

          <div className="h-[260px] w-full text-xs mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={retailAppliancesChartData} 
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                barSize={16}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-blue-900" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  tickLine={false} 
                  axisLine={false} 
                  className="font-semibold text-gray-500 dark:text-gray-400" 
                />
                <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e3a8a', 
                    color: '#f3f4f6', 
                    border: '1px solid #3b82f6', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'monospace'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Opening Stock" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Opening baseline" opacity={0.3} />
                <Bar dataKey="Items Purchased" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Refills/Restocks" />
                <Bar dataKey="Items Sold" fill="#f87171" radius={[4, 4, 0, 0]} name="Commodities sold" />
                <Bar dataKey="Closing Stock" fill="#6366f1" radius={[4, 4, 0, 0]} name="Closing stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
