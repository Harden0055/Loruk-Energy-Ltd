import React, { useMemo } from 'react';
import { useDailyPumpReadings, useLpgSales, useBurnerSales, useGrillSales } from '../lib/operationsDb';
import { formatCurrency, formatLitres } from '../lib/utils';
import { Building2, Fuel, ShoppingBag, TrendingUp, Flame, HelpCircle } from 'lucide-react';

interface ItemsSoldDashboardProps {
  selectedStation: 'Ndalu' | 'Junction' | 'Combined';
}

export default function ItemsSoldDashboard({ selectedStation }: ItemsSoldDashboardProps) {
  // Operational Hooks
  const { readings, loading: readingsLoading } = useDailyPumpReadings();
  const { sales: lpgSales, loading: lpgLoading } = useLpgSales();
  const { sales: burnerSales, loading: burnerLoading } = useBurnerSales();
  const { sales: grillSales, loading: grillLoading } = useGrillSales();

  const loading = readingsLoading || lpgLoading || burnerLoading || grillLoading;

  const stats = useMemo(() => {
    // Helper to sum properties
    const filterByStation = (list: any[], stationName: 'Ndalu' | 'Junction') => 
      list.filter(item => item.station === stationName);

    // Ndalu Stats
    const ndaluReadings = filterByStation(readings, 'Ndalu');
    const ndaluLpg = filterByStation(lpgSales, 'Ndalu');
    const ndaluBurners = filterByStation(burnerSales, 'Ndalu');
    const ndaluGrills = filterByStation(grillSales, 'Ndalu');

    const ndaluSuperLitres = ndaluReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.litresSold, 0);
    const ndaluSuperRevenue = ndaluReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.manualRevenue, 0);
    
    const ndaluDieselLitres = ndaluReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.litresSold, 0);
    const ndaluDieselRevenue = ndaluReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.manualRevenue, 0);

    const ndaluLpgQty = ndaluLpg.reduce((sum, s) => sum + s.cylindersSold, 0);
    const ndaluLpgRevenue = ndaluLpg.reduce((sum, s) => sum + s.totalSalesAmount, 0);

    const ndaluBurnerQty = ndaluBurners.reduce((sum, s) => sum + s.quantity, 0);
    const ndaluBurnerRevenue = ndaluBurners.reduce((sum, s) => sum + s.salesAmount, 0);

    const ndaluGrillQty = ndaluGrills.reduce((sum, s) => sum + s.quantity, 0);
    const ndaluGrillRevenue = ndaluGrills.reduce((sum, s) => sum + s.salesAmount, 0);

    const ndaluTotalRevenue = ndaluSuperRevenue + ndaluDieselRevenue + ndaluLpgRevenue + ndaluBurnerRevenue + ndaluGrillRevenue;

    // Junction Stats
    const junctionReadings = filterByStation(readings, 'Junction');
    const junctionLpg = filterByStation(lpgSales, 'Junction');
    const junctionBurners = filterByStation(burnerSales, 'Junction');
    const junctionGrills = filterByStation(grillSales, 'Junction');

    const junctionSuperLitres = junctionReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.litresSold, 0);
    const junctionSuperRevenue = junctionReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.manualRevenue, 0);
    
    const junctionDieselLitres = junctionReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.litresSold, 0);
    const junctionDieselRevenue = junctionReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.manualRevenue, 0);

    const junctionLpgQty = junctionLpg.reduce((sum, s) => sum + s.cylindersSold, 0);
    const junctionLpgRevenue = junctionLpg.reduce((sum, s) => sum + s.totalSalesAmount, 0);

    const junctionBurnerQty = junctionBurners.reduce((sum, s) => sum + s.quantity, 0);
    const junctionBurnerRevenue = junctionBurners.reduce((sum, s) => sum + s.salesAmount, 0);

    const junctionGrillQty = junctionGrills.reduce((sum, s) => sum + s.quantity, 0);
    const junctionGrillRevenue = junctionGrills.reduce((sum, s) => sum + s.salesAmount, 0);

    const junctionTotalRevenue = junctionSuperRevenue + junctionDieselRevenue + junctionLpgRevenue + junctionBurnerRevenue + junctionGrillRevenue;

    return {
      ndalu: {
        super: { litres: ndaluSuperLitres, revenue: ndaluSuperRevenue },
        diesel: { litres: ndaluDieselLitres, revenue: ndaluDieselRevenue },
        lpg: { qty: ndaluLpgQty, revenue: ndaluLpgRevenue },
        burner: { qty: ndaluBurnerQty, revenue: ndaluBurnerRevenue },
        grill: { qty: ndaluGrillQty, revenue: ndaluGrillRevenue },
        totalRevenue: ndaluTotalRevenue,
        fuelTotalRevenue: ndaluSuperRevenue + ndaluDieselRevenue,
        appliancesTotalRevenue: ndaluBurnerRevenue + ndaluGrillRevenue
      },
      junction: {
        super: { litres: junctionSuperLitres, revenue: junctionSuperRevenue },
        diesel: { litres: junctionDieselLitres, revenue: junctionDieselRevenue },
        lpg: { qty: junctionLpgQty, revenue: junctionLpgRevenue },
        burner: { qty: junctionBurnerQty, revenue: junctionBurnerRevenue },
        grill: { qty: junctionGrillQty, revenue: junctionGrillRevenue },
        totalRevenue: junctionTotalRevenue,
        fuelTotalRevenue: junctionSuperRevenue + junctionDieselRevenue,
        appliancesTotalRevenue: junctionBurnerRevenue + junctionGrillRevenue
      }
    };
  }, [readings, lpgSales, burnerSales, grillSales]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-blue-900 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-blue-900 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-blue-900 rounded"></div>
        </div>
      </div>
    );
  }

  const { ndalu, junction } = stats;
  const combinedTotalRevenue = ndalu.totalRevenue + junction.totalRevenue;

  // Percentage shares
  const ndaluShare = combinedTotalRevenue > 0 ? (ndalu.totalRevenue / combinedTotalRevenue) * 100 : 50;
  const junctionShare = combinedTotalRevenue > 0 ? (junction.totalRevenue / combinedTotalRevenue) * 100 : 50;

  // Active Profile selection
  const isCombined = selectedStation === 'Combined';
  const showNdalu = selectedStation === 'Combined' || selectedStation === 'Ndalu';
  const showJunction = selectedStation === 'Combined' || selectedStation === 'Junction';

  return (
    <div className="space-y-6">
      {/* SECTION TITLE */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-blue-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          Retail & Station Items Sold Dashboard
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Real-time analysis and comparison of retail items, fuels, and domestic appliances sold
        </p>
      </div>

      {/* RETAIL SHARE GRAPHIC COMPARISON CARD (ONLY SHOW ON COMBINED) */}
      {isCombined && (
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700 dark:text-blue-300">Station Retail Revenue Distribution</h3>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              Total network retail: {formatCurrency(combinedTotalRevenue)}
            </span>
          </div>

          <div className="space-y-2">
            {/* Multi-segmented stack bar */}
            <div className="h-4 w-full bg-gray-100 dark:bg-blue-950 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${ndaluShare}%` }} 
                className="bg-blue-600 h-full transition-all duration-500 hover:opacity-90"
                title={`Ndalu Station: ${ndaluShare.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${junctionShare}%` }} 
                className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90"
                title={`Junction Station: ${junctionShare.toFixed(1)}%`}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-3 h-3 bg-blue-600 rounded-sm"></span>
                <span>Ndalu: {formatCurrency(ndalu.totalRevenue)} ({ndaluShare.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500">
                <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                <span>Junction: {formatCurrency(junction.totalRevenue)} ({junctionShare.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED CATEGORY GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CARD 1: FUELS (SUPER PETROL) */}
        {(showNdalu || showJunction) && (
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-blue-100">Super Petrol</h4>
                    <p className="text-[10px] text-gray-400">Retail fuel pump logs</p>
                  </div>
                </div>
                {isCombined && (
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full">
                    {formatLitres(ndalu.super.litres + junction.super.litres)}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* Ndalu Row */}
                {showNdalu && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Ndalu Station</span>
                      <span>{formatCurrency(ndalu.super.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Volume Sold</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatLitres(ndalu.super.litres)}</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${ndalu.super.litres + junction.super.litres > 0 ? (ndalu.super.litres / (ndalu.super.litres + junction.super.litres)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Junction Row */}
                {showJunction && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Junction Station</span>
                      <span>{formatCurrency(junction.super.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Volume Sold</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatLitres(junction.super.litres)}</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${ndalu.super.litres + junction.super.litres > 0 ? (junction.super.litres / (ndalu.super.litres + junction.super.litres)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-blue-900 flex justify-between items-center text-xs text-gray-400 mt-4">
              <span>Combined Total Rev:</span>
              <span className="font-bold text-gray-800 dark:text-blue-200">
                {formatCurrency(ndalu.super.revenue + junction.super.revenue)}
              </span>
            </div>
          </div>
        )}

        {/* CARD 2: FUELS (DIESEL) */}
        {(showNdalu || showJunction) && (
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-blue-100">Diesel</h4>
                    <p className="text-[10px] text-gray-400">Retail fuel pump logs</p>
                  </div>
                </div>
                {isCombined && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 font-mono font-bold px-2 py-0.5 rounded-full">
                    {formatLitres(ndalu.diesel.litres + junction.diesel.litres)}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* Ndalu Row */}
                {showNdalu && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Ndalu Station</span>
                      <span>{formatCurrency(ndalu.diesel.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Volume Sold</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{formatLitres(ndalu.diesel.litres)}</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${ndalu.diesel.litres + junction.diesel.litres > 0 ? (ndalu.diesel.litres / (ndalu.diesel.litres + junction.diesel.litres)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Junction Row */}
                {showJunction && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Junction Station</span>
                      <span>{formatCurrency(junction.diesel.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Volume Sold</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{formatLitres(junction.diesel.litres)}</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${ndalu.diesel.litres + junction.diesel.litres > 0 ? (junction.diesel.litres / (ndalu.diesel.litres + junction.diesel.litres)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-blue-900 flex justify-between items-center text-xs text-gray-400 mt-4">
              <span>Combined Total Rev:</span>
              <span className="font-bold text-gray-800 dark:text-blue-200">
                {formatCurrency(ndalu.diesel.revenue + junction.diesel.revenue)}
              </span>
            </div>
          </div>
        )}

        {/* CARD 3: LPG CYLINDERS */}
        {(showNdalu || showJunction) && (
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-blue-100">LPG Cylinders</h4>
                    <p className="text-[10px] text-gray-400">LPG retail itemization</p>
                  </div>
                </div>
                {isCombined && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 font-mono font-bold px-2 py-0.5 rounded-full">
                    {ndalu.lpg.qty + junction.lpg.qty} Cyls
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* Ndalu Row */}
                {showNdalu && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Ndalu Station</span>
                      <span>{formatCurrency(ndalu.lpg.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Cylinders Sold</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{ndalu.lpg.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${ndalu.lpg.qty + junction.lpg.qty > 0 ? (ndalu.lpg.qty / (ndalu.lpg.qty + junction.lpg.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Junction Row */}
                {showJunction && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Junction Station</span>
                      <span>{formatCurrency(junction.lpg.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Cylinders Sold</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{junction.lpg.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${ndalu.lpg.qty + junction.lpg.qty > 0 ? (junction.lpg.qty / (ndalu.lpg.qty + junction.lpg.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-blue-900 flex justify-between items-center text-xs text-gray-400 mt-4">
              <span>Combined Total Rev:</span>
              <span className="font-bold text-gray-800 dark:text-blue-200">
                {formatCurrency(ndalu.lpg.revenue + junction.lpg.revenue)}
              </span>
            </div>
          </div>
        )}

        {/* CARD 4: RETALL APPLIANCES (BURNERS) */}
        {(showNdalu || showJunction) && (
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-blue-100">Gas Burners</h4>
                    <p className="text-[10px] text-gray-400">Domestic retail accessories</p>
                  </div>
                </div>
                {isCombined && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-mono font-bold px-2 py-0.5 rounded-full">
                    {ndalu.burner.qty + junction.burner.qty} Sold
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* Ndalu Row */}
                {showNdalu && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Ndalu Station</span>
                      <span>{formatCurrency(ndalu.burner.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Quantity Sold</span>
                      <span className="font-semibold text-amber-600">{ndalu.burner.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${ndalu.burner.qty + junction.burner.qty > 0 ? (ndalu.burner.qty / (ndalu.burner.qty + junction.burner.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Junction Row */}
                {showJunction && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Junction Station</span>
                      <span>{formatCurrency(junction.burner.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Quantity Sold</span>
                      <span className="font-semibold text-amber-600">{junction.burner.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${ndalu.burner.qty + junction.burner.qty > 0 ? (junction.burner.qty / (ndalu.burner.qty + junction.burner.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-blue-900 flex justify-between items-center text-xs text-gray-400 mt-4">
              <span>Combined Total Rev:</span>
              <span className="font-bold text-gray-800 dark:text-blue-200">
                {formatCurrency(ndalu.burner.revenue + junction.burner.revenue)}
              </span>
            </div>
          </div>
        )}

        {/* CARD 5: RETALL APPLIANCES (GRILLS) */}
        {(showNdalu || showJunction) && (
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-blue-100">Gas Grills</h4>
                    <p className="text-[10px] text-gray-400">Domestic retail accessories</p>
                  </div>
                </div>
                {isCombined && (
                  <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 font-mono font-bold px-2 py-0.5 rounded-full">
                    {ndalu.grill.qty + junction.grill.qty} Sold
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* Ndalu Row */}
                {showNdalu && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Ndalu Station</span>
                      <span>{formatCurrency(ndalu.grill.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Quantity Sold</span>
                      <span className="font-semibold text-rose-600">{ndalu.grill.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${ndalu.grill.qty + junction.grill.qty > 0 ? (ndalu.grill.qty / (ndalu.grill.qty + junction.grill.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Junction Row */}
                {showJunction && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-blue-300">
                      <span>Junction Station</span>
                      <span>{formatCurrency(junction.grill.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Quantity Sold</span>
                      <span className="font-semibold text-rose-600">{junction.grill.qty} units</span>
                    </div>
                    {isCombined && (
                      <div className="w-full bg-gray-100 dark:bg-blue-900/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${ndalu.grill.qty + junction.grill.qty > 0 ? (junction.grill.qty / (ndalu.grill.qty + junction.grill.qty)) * 100 : 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-blue-900 flex justify-between items-center text-xs text-gray-400 mt-4">
              <span>Combined Total Rev:</span>
              <span className="font-bold text-gray-800 dark:text-blue-200">
                {formatCurrency(ndalu.grill.revenue + junction.grill.revenue)}
              </span>
            </div>
          </div>
        )}

        {/* CARD 6: KPI AGGREGATES & SUMMARY */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-sm font-bold tracking-tight text-blue-200">Retail Breakdown</h4>
            
            <div className="space-y-3.5 mt-2">
              <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg border border-white/5">
                <span className="text-xs text-blue-100">Fuels (Retail Pump)</span>
                <span className="text-sm font-semibold font-mono text-emerald-400">
                  {formatCurrency((showNdalu ? ndalu.fuelTotalRevenue : 0) + (showJunction ? junction.fuelTotalRevenue : 0))}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg border border-white/5">
                <span className="text-xs text-blue-100">LPG Gas Gasification</span>
                <span className="text-sm font-semibold font-mono text-purple-400">
                  {formatCurrency((showNdalu ? ndalu.lpg.revenue : 0) + (showJunction ? junction.lpg.revenue : 0))}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg border border-white/5">
                <span className="text-xs text-blue-100">Appliances (Burner/Grill)</span>
                <span className="text-sm font-semibold font-mono text-amber-400">
                  {formatCurrency((showNdalu ? ndalu.appliancesTotalRevenue : 0) + (showJunction ? junction.appliancesTotalRevenue : 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4">
            <span className="text-[10px] text-blue-300 block font-bold uppercase tracking-wider">
              {isCombined ? 'Total Network Retail Revenue' : `${selectedStation} retail revenue`}
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-white mt-1 block">
              {formatCurrency(isCombined ? combinedTotalRevenue : (selectedStation === 'Ndalu' ? ndalu.totalRevenue : junction.totalRevenue))}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
