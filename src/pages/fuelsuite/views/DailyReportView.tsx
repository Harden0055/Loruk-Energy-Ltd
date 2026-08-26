import React, { useState, useMemo } from 'react';
import { useFuel, calculatePumpMeterDelta } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input } from '../components';
import { normalizeDate } from '../deduplication';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { X, Flame, Printer, ClipboardList } from 'lucide-react';

const COLORS = ['#06b6d4', '#f59e0b'];

export default function DailyReportView() {
  const { activeStation, pumpReadings, lpgTransactions, expenses, invoices, inventoryItems, cashPositions } = useFuel();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLpgProfit, setShowLpgProfit] = useState(false);

  const normSelectedDate = normalizeDate(selectedDate);

  // Filter data by selected date and station with date normalization
  const dailyReadings = useMemo(() => pumpReadings.filter(
    r => normalizeDate(r.date) === normSelectedDate && (activeStation === 'Combined Total' ? true : r.station === activeStation)
  ), [pumpReadings, normSelectedDate, activeStation]);

  const dailyLpgSales = useMemo(() => lpgTransactions.filter(
    t => normalizeDate(t.date) === normSelectedDate && t.type === 'sale' && (activeStation === 'Combined Total' ? true : t.station === activeStation)
  ), [lpgTransactions, normSelectedDate, activeStation]);

  const dailyLpgPurchases = useMemo(() => lpgTransactions.filter(
    t => normalizeDate(t.date) === normSelectedDate && t.type === 'purchase' && (activeStation === 'Combined Total' ? true : t.station === activeStation)
  ), [lpgTransactions, normSelectedDate, activeStation]);

  const dailyExpenses = useMemo(() => expenses.filter(
    e => normalizeDate(e.date) === normSelectedDate && (activeStation === 'Combined Total' ? true : e.station === activeStation)
  ), [expenses, normSelectedDate, activeStation]);

  const dailyInvoices = useMemo(() => invoices.filter(
    i => (activeStation === 'Combined Total' ? true : i.station === activeStation) && normalizeDate(i.date || '') === normSelectedDate
  ), [invoices, activeStation, normSelectedDate]);

  const unpaidDebts = dailyInvoices.filter(i => (Number(i.totalAmount) || 0) - (Number(i.paidAmount) || 0) > 0);

  // Group readings by product (Super, Diesel, etc.)
  const groupedReadings = useMemo(() => {
    const groups: Record<string, {
      litresStart: number;
      litresStop: number;
      totalLitres: number;
      totalSales: number;
    }> = {};

    dailyReadings.forEach(r => {
      const litres = calculatePumpMeterDelta(r.litresStart, r.litresStop);
      const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
      const sales = sAmount > 0 ? sAmount : (litres * r.ratePerLitre);
      
      if (!groups[r.product]) {
        groups[r.product] = {
          litresStart: r.litresStart,
          litresStop: r.litresStop,
          totalLitres: litres,
          totalSales: sales
        };
      } else {
        // Aggregate if multiple readings for same product exist on same day
        groups[r.product].litresStart = Math.min(groups[r.product].litresStart, r.litresStart);
        groups[r.product].litresStop = Math.max(groups[r.product].litresStop, r.litresStop);
        groups[r.product].totalLitres += litres;
        groups[r.product].totalSales += sales;
      }
    });

    return groups;
  }, [dailyReadings]);

  const totalGases = dailyLpgSales.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dailyAccessoriesSales = useMemo(() => inventoryItems.filter(
    i => normalizeDate(i.date) === normSelectedDate && i.type === 'out' && (activeStation === 'Combined Total' ? true : i.station === activeStation) &&
    !i.item.toLowerCase().includes('super') && 
    !i.item.toLowerCase().includes('diesel') && 
    !i.item.toLowerCase().includes('lpg') &&
    !i.item.toLowerCase().includes('cylinder')
  ), [inventoryItems, normSelectedDate, activeStation]);

  const dailyAccessoriesPurchases = useMemo(() => inventoryItems.filter(
    i => normalizeDate(i.date) === normSelectedDate && i.type === 'in' && (activeStation === 'Combined Total' ? true : i.station === activeStation) &&
    !i.item.toLowerCase().includes('super') && 
    !i.item.toLowerCase().includes('diesel') && 
    !i.item.toLowerCase().includes('lpg') &&
    !i.item.toLowerCase().includes('cylinder')
  ), [inventoryItems, normSelectedDate, activeStation]);

  const totalAccessoriesSales = dailyAccessoriesSales.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalAccessoriesPurchases = dailyAccessoriesPurchases.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalGasesPurchases = dailyLpgPurchases.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) + totalAccessoriesPurchases;
  const totalFuelSales = Object.values(groupedReadings).reduce((sum, g) => sum + g.totalSales, 0);
  const totalSales = totalFuelSales + totalGases + totalAccessoriesSales;

  // Invoices & Debt Cash Adjustments
  const uncollectedCreditSalesToday = dailyInvoices.reduce((sum, i) => {
    const total = Number(i.totalAmount) || 0;
    const paid = Number(i.paidAmount) || 0;
    return sum + (total > paid ? (total - paid) : 0);
  }, 0);

  const pastDebtPaymentsCollectedToday = dailyInvoices.reduce((sum, i) => {
    const total = Number(i.totalAmount) || 0;
    const paid = Number(i.paidAmount) || 0;
    // Debt payment collected where total is 0 (paid invoice)
    return sum + (total === 0 ? paid : 0);
  }, 0);

  const totalInvoicesAmount = dailyInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const paidInvoicesAmount = dailyInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const totalDebts = uncollectedCreditSalesToday;

  const dailyCashPos = cashPositions.find(c => normalizeDate(c.date) === normSelectedDate && (activeStation === 'Combined Total' || !c.station || c.station === activeStation));

  const totalExpensesAmount = dailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalMPesaAmount = dailyCashPos?.mPesa ?? 0;

  // Expected Total Cash = Total Sales - Cost of Goods/Refills - Expenses - Uncollected Credit Sales Today + Past Debt Payments Collected Today
  const expectedTotalCash = totalSales - totalGasesPurchases - totalExpensesAmount - uncollectedCreditSalesToday + pastDebtPaymentsCollectedToday;
  const expectedCashOnHand = expectedTotalCash - totalMPesaAmount;
  const cashAtHand = dailyCashPos?.cashOnHand ?? expectedCashOnHand;
  
  // Standard Cash Variance: Actual Cash counted - Expected Cash
  // Positive = Excess / Surplus, Negative = Shortfall / Loss, 0 = Balanced
  const cashDifference = cashAtHand - expectedCashOnHand;

  // Added fuel / Inventory balances could be fetched from InventoryItems
  const dailyFuelAdded = inventoryItems.filter(i => 
    i.date === selectedDate && i.type === 'in' && (activeStation === 'Combined Total' ? true : i.station === activeStation)
  );

  // LPG Modal Stats
  const lpgStatsData = useMemo(() => lpgTransactions.filter(t => activeStation === 'Combined Total' || t.station === activeStation), [lpgTransactions, activeStation]);
  const allLpgSalesAmount = lpgStatsData.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const allLpgPurchasesAmount = lpgStatsData.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);

  const lpgChartData = useMemo(() => {
    const dates = Array.from(new Set(lpgStatsData.map(t => t.date))).sort();
    return dates.map(date => {
      const daySales = lpgStatsData.filter(t => t.date === date && t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const dayPurchases = lpgStatsData.filter(t => t.date === date && t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
      return {
        date,
        Sales: daySales,
        Purchases: dayPurchases,
        Profit: daySales - dayPurchases
      };
    });
  }, [lpgStatsData]);

  if (showLpgProfit) {
    return (
      <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Flame className="text-orange-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-slate-100">LPG Profit Profile (Overall)</h2>
          </div>
          <button 
            onClick={() => setShowLpgProfit(false)}
            className="flex items-center gap-2 px-4 py-2 bg-[#122840] hover:bg-[#3d4270] text-white rounded-lg transition-colors font-medium text-sm print:hidden"
          >
            <X className="w-4 h-4" />
            Back to Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col justify-center bg-cyan-500/10 border border-theme-border p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total LPG Sales</span>
            <span className="text-3xl font-bold text-cyan-400 mt-2">Ksh {allLpgSalesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total LPG Purchases</span>
            <span className="text-3xl font-bold text-orange-400 mt-2">Ksh {allLpgPurchasesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Net Profit (LPG)</span>
            <span className={`text-3xl font-bold mt-2 ${allLpgSalesAmount - allLpgPurchasesAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Ksh {(allLpgSalesAmount - allLpgPurchasesAmount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="glass-panel p-6 rounded-xl border border-theme-border shadow-md">
            <h4 className="text-sm font-bold text-theme-text-muted mb-6 uppercase tracking-wider">Trend Analysis</h4>
            <div className="h-[400px] relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                <BarChart data={lpgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#122840" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Ksh ${val/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0b1928', borderColor: '#122840', color: '#f8fafc', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Sales" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-xl border border-theme-border overflow-hidden flex flex-col shadow-md">
            <h4 className="text-sm font-bold text-theme-text-muted p-6 border-b border-theme-border uppercase tracking-wider">Recent Transactions</h4>
            <div className="overflow-auto flex-1 h-[400px]">
              <table className="modern-table">
                <thead className="bg-[#1e223d] sticky top-0 z-10">
                  <tr className="modern-tr">
                    <th className="modern-th">Date</th>
                    <th className="modern-th">Type</th>
                    <th className="modern-th">Item</th>
                    <th className="modern-th">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lpgStatsData.filter(t => t.type !== 'opening').sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                    <tr key={t.id} className="border-b border-theme-border/50 hover:bg-[#122840]/50 transition-colors">
                      <td className="modern-td">{t.date}</td>
                      <td className="modern-td">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${t.type === 'sale' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="modern-td">{t.item}</td>
                      <td className="modern-td">Ksh {t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {lpgStatsData.filter(t => t.type !== 'opening').length === 0 && (
                    <tr className="modern-tr">
                      <td colSpan={4} className="p-8 text-center text-slate-500">No recent sales or purchases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Daily Station Report</h1>
            <p className="text-theme-text-muted mt-0.5 text-xs">Detailed end-of-day summary & cash reconciliation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-theme-text-muted">Date:</label>
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <button
            onClick={() => {
              try {
                if (window.self !== window.top) {
                  try {
                    window.print();
                  } catch {
                    window.open(window.location.href, '_blank');
                  }
                } else {
                  window.print();
                }
              } catch {
                window.open(window.location.href, '_blank');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 rounded-lg transition-colors text-sm font-medium print:hidden cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto glass-panel border-theme-border shadow-xl">
        <CardHeader className="border-b border-theme-border pb-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl text-cyan-400 uppercase tracking-wider">{activeStation}</CardTitle>
            <p className="text-sm text-theme-text-muted mt-1">Daily Summary Report</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-theme-text">{format(new Date(selectedDate), 'EEEE')}</div>
            <div className="text-sm text-theme-text-muted">{format(new Date(selectedDate), 'dd/MM/yyyy')}</div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-8 text-theme-text-muted font-mono text-sm">
          
          {/* FUEL SALES SECTION */}
          {Object.entries(groupedReadings).map(([product, data]) => (
            <div key={product} className="space-y-2 border-b border-theme-border/50 pb-6">
              <h3 className="text-lg font-bold text-theme-text uppercase tracking-widest mb-4">{product}</h3>
              <div className="flex justify-between items-center mb-1">
                <span>Sales Start (Litres)</span>
                <span>{data.litresStart.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span>Sales Stop (Litres)</span>
                <span>{data.litresStop.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-theme-border/50 text-cyan-400 font-bold">
                <span>Total Litres: {data.totalLitres.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                <span>Ksh {Math.round(data.totalSales).toLocaleString()}</span>
              </div>
            </div>
          ))}

          {Object.keys(groupedReadings).length === 0 && (
            <div className="text-center text-slate-500 py-4 italic border-b border-theme-border/50">
              No fuel pump readings recorded for this date.
            </div>
          )}

          {/* GASES & ADDED FUEL */}
          <div className="space-y-4 border-b border-theme-border/50 pb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg">Gases (LPG Sales)</span>
              <span className="font-bold">Ksh {Math.round(totalGases).toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-lg">Accessories Sales</span>
              <span className="font-bold">Ksh {Math.round(totalAccessoriesSales).toLocaleString()}</span>
            </div>
            
            {dailyFuelAdded.length > 0 && (
              <div className="pt-2 text-theme-text-muted">
                <span className="block mb-1">Added Fuel:</span>
                {dailyFuelAdded.map(item => (
                  <div key={item.id} className="pl-4">
                    {item.quantity} Litres {item.item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOTAL SALES */}
          <div className="flex justify-between items-center text-xl font-bold text-emerald-400 border-b border-theme-border pb-6">
            <span>TOTAL SALES</span>
            <span>Ksh {Math.round(totalSales).toLocaleString()}</span>
          </div>

          {totalGasesPurchases > 0 && (
            <div className="flex justify-between items-center text-lg text-orange-300 border-b border-theme-border py-4">
              <span>LPG Purchases</span>
              <span>Ksh {Math.round(totalGasesPurchases).toLocaleString()}</span>
            </div>
          )}

          {/* LPG PROFIT LINK */}
          {(totalGases > 0 || totalGasesPurchases > 0) && (
            <div className="flex justify-end pt-2 border-b border-theme-border pb-6">
              <button 
                onClick={() => setShowLpgProfit(true)}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 text-sm font-medium transition-colors"
              >
                View LPG Profit Profile
              </button>
            </div>
          )}

          {/* DEPTS & EXPENSES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-theme-border pb-6">
            <div>
              <h4 className="text-lg font-bold text-theme-text border-b border-theme-border pb-2 mb-3">Invoices</h4>
              {unpaidDebts.length > 0 ? (
                <div className="space-y-2">
                  {unpaidDebts.map(debt => (
                    <div key={debt.id} className="flex justify-between">
                      <span>{debt.customerName}</span>
                      <span>{Math.round(debt.totalAmount - debt.paidAmount).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-theme-border font-bold text-orange-400 mt-2">
                    <span>Total Invoices</span>
                    <span>= {Math.round(totalDebts).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">No invoices recorded.</div>
              )}
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-theme-text border-b border-theme-border pb-2 mb-3">Expenses</h4>
              {dailyExpenses.length > 0 ? (
                <div className="space-y-2">
                  {dailyExpenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {exp.expenseCode && (
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                            {exp.expenseCode}
                          </span>
                        )}
                        <span className="text-slate-200">{exp.category}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400">
                        {Math.round(exp.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-theme-border font-bold text-red-400 mt-2">
                    <span>Total Expenses</span>
                    <span>= {Math.round(totalExpensesAmount).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">No expenses recorded.</div>
              )}
            </div>
          </div>

          {/* M-PESA & CASH AT HAND */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xl font-bold bg-[#1d8f58]/20 border border-[#1d8f58]/40 p-4 rounded-lg">
              <span className="text-slate-100">Money in M-Pesa</span>
              <span className="text-emerald-400">Ksh {Math.round(totalMPesaAmount).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center text-xl font-bold bg-[#122840]/30 p-4 rounded-lg">
              <span className="text-slate-100">Cash at hand</span>
              <span className="text-cyan-400">Ksh {Math.round(cashAtHand).toLocaleString()}</span>
            </div>

            <div className={`flex justify-between items-center text-xl font-bold p-4 rounded-lg border ${
              Math.round(cashDifference) > 0 ? 'bg-emerald-500/20 border-emerald-500/40' : 
              Math.round(cashDifference) < 0 ? 'bg-red-500/20 border-red-500/40' : 
              'bg-slate-500/20 border-slate-500/40'
            }`}>
              <span className="text-slate-100">
                {Math.round(cashDifference) > 0 ? 'Excess' : Math.round(cashDifference) < 0 ? 'Short / Loss' : 'Balanced'}
              </span>
              <span className={
                Math.round(cashDifference) > 0 ? 'text-emerald-400' : 
                Math.round(cashDifference) < 0 ? 'text-red-400' : 
                'text-theme-text-muted'
              }>
                {Math.round(cashDifference) !== 0 ? (Math.round(cashDifference) > 0 ? '+' : '') + Math.round(cashDifference).toLocaleString() : '0'}
              </span>
            </div>
          </div>

          {/* VISUAL CASH SPLIT */}
          {(totalMPesaAmount > 0 || cashAtHand > 0) && (
            <div className="pt-6 border-t border-theme-border">
              <h4 className="text-lg font-bold text-theme-text mb-4 text-center">Cash Position Split</h4>
              <div className="h-64 w-full relative overflow-hidden flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'M-Pesa', value: totalMPesaAmount },
                        { name: 'Cash on Hand', value: cashAtHand > 0 ? cashAtHand : 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={COLORS[0]} />
                      <Cell fill={COLORS[1]} />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b1928', borderColor: '#122840', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9' }}
                      formatter={(value: number) => `KES ${value.toLocaleString()}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <p className="text-sm text-theme-text-muted">Total Funds</p>
                  <p className="text-xl font-bold text-theme-text">KES {(totalMPesaAmount + Math.max(0, cashAtHand)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
