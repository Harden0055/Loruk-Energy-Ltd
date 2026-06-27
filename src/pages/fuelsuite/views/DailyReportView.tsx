import React, { useState, useMemo } from 'react';
import { useFuel } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input } from '../components';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { X, Flame, Printer } from 'lucide-react';

const COLORS = ['#06b6d4', '#f59e0b'];

export default function DailyReportView() {
  const { activeStation, pumpReadings, lpgTransactions, expenses, invoices, inventoryItems, cashPositions } = useFuel();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLpgProfit, setShowLpgProfit] = useState(false);

  // Filter data by selected date and station
  const dailyReadings = useMemo(() => pumpReadings.filter(
    r => r.date === selectedDate && (activeStation === 'Combined Total' ? true : r.station === activeStation)
  ), [pumpReadings, selectedDate, activeStation]);

  const dailyLpgSales = useMemo(() => lpgTransactions.filter(
    t => t.date === selectedDate && t.type === 'sale' && (activeStation === 'Combined Total' ? true : t.station === activeStation)
  ), [lpgTransactions, selectedDate, activeStation]);

  const dailyLpgPurchases = useMemo(() => lpgTransactions.filter(
    t => t.date === selectedDate && t.type === 'purchase' && (activeStation === 'Combined Total' ? true : t.station === activeStation)
  ), [lpgTransactions, selectedDate, activeStation]);

  const dailyExpenses = useMemo(() => expenses.filter(
    e => e.date === selectedDate && (activeStation === 'Combined Total' ? true : e.station === activeStation)
  ), [expenses, selectedDate, activeStation]);

  const dailyInvoices = useMemo(() => invoices.filter(
    i => (activeStation === 'Combined Total' ? true : i.station === activeStation)
    // Note: Invoices in context don't have a date field currently, but let's assume they are all debts for now or we filter if added.
    // For now, let's just show all unpaid invoices as debts.
  ), [invoices, activeStation]);

  const unpaidDebts = dailyInvoices.filter(i => i.totalAmount - i.paidAmount > 0);

  // Group readings by product (Super, Diesel, etc.)
  const groupedReadings = useMemo(() => {
    const groups: Record<string, {
      startReading: number;
      stopReading: number;
      totalLitres: number;
      totalSales: number;
    }> = {};

    dailyReadings.forEach(r => {
      const litres = r.stopReading - r.startReading;
      const sales = r.manualCash || (litres * r.ratePerLitre);
      
      if (!groups[r.product]) {
        groups[r.product] = {
          startReading: r.startReading,
          stopReading: r.stopReading,
          totalLitres: litres,
          totalSales: sales
        };
      } else {
        // Aggregate if multiple readings for same product exist on same day
        groups[r.product].startReading = Math.min(groups[r.product].startReading, r.startReading);
        groups[r.product].stopReading = Math.max(groups[r.product].stopReading, r.stopReading);
        groups[r.product].totalLitres += litres;
        groups[r.product].totalSales += sales;
      }
    });

    return groups;
  }, [dailyReadings]);

  const totalGases = dailyLpgSales.reduce((sum, t) => sum + t.amount, 0);
  const totalGasesPurchases = dailyLpgPurchases.reduce((sum, t) => sum + t.amount, 0);
  const totalFuelSales = Object.values(groupedReadings).reduce((sum, g) => sum + g.totalSales, 0);
  const totalSales = totalFuelSales + totalGases;

  const todayInvoices = invoices.filter(i => i.date === selectedDate && (activeStation === 'Combined Total' ? true : i.station === activeStation));
  const totalInvoicesAmount = todayInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const paidInvoicesAmount = todayInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalDebts = totalInvoicesAmount - paidInvoicesAmount;

  const dailyCashPos = cashPositions.find(c => c.date === selectedDate);
  const mPesaExpenses = dailyExpenses.filter(e => e.category.toLowerCase().includes('m-pesa') || e.category.toLowerCase().includes('mpesa') || e.category.toLowerCase().includes('m.pesa'));
  const actualExpenses = dailyExpenses.filter(e => !(e.category.toLowerCase().includes('m-pesa') || e.category.toLowerCase().includes('mpesa') || e.category.toLowerCase().includes('m.pesa')));

  const totalExpensesAmount = actualExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMPesaAmount = dailyCashPos?.mPesa ?? mPesaExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expectedCashOnHand = totalSales - totalGasesPurchases - (totalDebts + totalExpensesAmount + totalMPesaAmount);
  const cashAtHand = dailyCashPos?.cashOnHand ?? expectedCashOnHand;
  
  // As requested: (cash at hand + m-pesa + total expenses + total invoices + total LPG purchase - paid invoices) - total sales
  const sumAccounted = cashAtHand + totalMPesaAmount + totalExpensesAmount + totalInvoicesAmount + totalGasesPurchases - paidInvoicesAmount;
  const cashDifference = sumAccounted - totalSales;

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
            className="flex items-center gap-2 px-4 py-2 bg-[#2d325a] hover:bg-[#3d4270] text-white rounded-lg transition-colors font-medium text-sm print:hidden"
          >
            <X className="w-4 h-4" />
            Back to Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col justify-center bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-slate-400 font-medium">Total LPG Sales</span>
            <span className="text-3xl font-bold text-cyan-400 mt-2">Ksh {allLpgSalesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-slate-400 font-medium">Total LPG Purchases (COGS)</span>
            <span className="text-3xl font-bold text-orange-400 mt-2">- Ksh {allLpgPurchasesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-slate-400 font-medium">Net Profit (LPG)</span>
            <span className={`text-3xl font-bold mt-2 ${allLpgSalesAmount - allLpgPurchasesAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Ksh {(allLpgSalesAmount - allLpgPurchasesAmount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="bg-[#1a1d36] p-6 rounded-xl border border-[#2d325a] shadow-md">
            <h4 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Trend Analysis</h4>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lpgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d325a" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Ksh ${val/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f8fafc', borderRadius: '8px' }}
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
          <div className="bg-[#1a1d36] rounded-xl border border-[#2d325a] overflow-hidden flex flex-col shadow-md">
            <h4 className="text-sm font-bold text-slate-300 p-6 border-b border-[#2d325a] uppercase tracking-wider">Recent Transactions</h4>
            <div className="overflow-auto flex-1 h-[400px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#1e223d] sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-slate-400 font-medium">Date</th>
                    <th className="p-4 text-slate-400 font-medium">Type</th>
                    <th className="p-4 text-slate-400 font-medium">Item</th>
                    <th className="p-4 text-slate-400 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lpgStatsData.filter(t => t.type !== 'opening').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                    <tr key={t.id} className="border-b border-[#2d325a]/50 hover:bg-[#2d325a]/50 transition-colors">
                      <td className="p-4 text-slate-300">{t.date}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${t.type === 'sale' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{t.item}</td>
                      <td className="p-4 text-right font-medium">Ksh {t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {lpgStatsData.filter(t => t.type !== 'opening').length === 0 && (
                    <tr>
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
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Daily Station Report</h1>
          <p className="text-slate-400 mt-1">Detailed end-of-day summary</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-400">Date:</label>
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm font-medium print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto bg-[#1a1d36] border-[#2d325a] shadow-xl">
        <CardHeader className="border-b border-[#2d325a] pb-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl text-cyan-400 uppercase tracking-wider">{activeStation}</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Daily Summary Report</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-200">{format(new Date(selectedDate), 'EEEE')}</div>
            <div className="text-sm text-slate-400">{format(new Date(selectedDate), 'dd/MM/yyyy')}</div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-8 text-slate-300 font-mono text-sm">
          
          {/* FUEL SALES SECTION */}
          {Object.entries(groupedReadings).map(([product, data]) => (
            <div key={product} className="space-y-2 border-b border-[#2d325a]/50 pb-6">
              <h3 className="text-lg font-bold text-slate-200 uppercase tracking-widest mb-4">{product}</h3>
              <div className="flex justify-between items-center mb-1">
                <span>Sales Start (Litres)</span>
                <span>{data.startReading.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span>Sales Stop (Litres)</span>
                <span>{data.stopReading.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#2d325a]/50 text-cyan-400 font-bold">
                <span>Total Litres: {data.totalLitres.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                <span>Ksh {data.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          ))}

          {Object.keys(groupedReadings).length === 0 && (
            <div className="text-center text-slate-500 py-4 italic border-b border-[#2d325a]/50">
              No fuel pump readings recorded for this date.
            </div>
          )}

          {/* GASES & ADDED FUEL */}
          <div className="space-y-4 border-b border-[#2d325a]/50 pb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg">Gases (LPG Sales)</span>
              <span className="font-bold">Ksh {totalGases.toLocaleString()}</span>
            </div>
            
            {dailyFuelAdded.length > 0 && (
              <div className="pt-2 text-slate-400">
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
          <div className="flex justify-between items-center text-xl font-bold text-emerald-400 border-b border-[#2d325a] pb-6">
            <span>TOTAL SALES</span>
            <span>Ksh {totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          {totalGasesPurchases > 0 && (
            <div className="flex justify-between items-center text-lg text-orange-300 border-b border-[#2d325a] py-4">
              <span>Cost of Goods Sold (LPG Purchases)</span>
              <span>- Ksh {totalGasesPurchases.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          )}

          {/* LPG PROFIT LINK */}
          {(totalGases > 0 || totalGasesPurchases > 0) && (
            <div className="flex justify-end pt-2 border-b border-[#2d325a] pb-6">
              <button 
                onClick={() => setShowLpgProfit(true)}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 text-sm font-medium transition-colors"
              >
                View LPG Profit Profile
              </button>
            </div>
          )}

          {/* DEPTS & EXPENSES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#2d325a] pb-6">
            <div>
              <h4 className="text-lg font-bold text-slate-200 border-b border-[#2d325a] pb-2 mb-3">Depts (Debts)</h4>
              {unpaidDebts.length > 0 ? (
                <div className="space-y-2">
                  {unpaidDebts.map(debt => (
                    <div key={debt.id} className="flex justify-between">
                      <span>{debt.customerName}</span>
                      <span>{(debt.totalAmount - debt.paidAmount).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-[#2d325a] font-bold text-orange-400 mt-2">
                    <span>Total Depts</span>
                    <span>= {totalDebts.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">No debts recorded.</div>
              )}
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-slate-200 border-b border-[#2d325a] pb-2 mb-3">Expenses</h4>
              {actualExpenses.length > 0 ? (
                <div className="space-y-2">
                  {actualExpenses.map(exp => (
                    <div key={exp.id} className="flex justify-between">
                      <span className="truncate pr-2">{exp.category}</span>
                      <span>{exp.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-[#2d325a] font-bold text-red-400 mt-2">
                    <span>Total Expenses</span>
                    <span>= {totalExpensesAmount.toLocaleString()}</span>
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
              <span className="text-emerald-400">{totalMPesaAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="flex justify-between items-center text-xl font-bold bg-[#2d325a]/30 p-4 rounded-lg">
              <span className="text-slate-100">Cash at hand</span>
              <span className="text-cyan-400">{cashAtHand.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

            <div className={`flex justify-between items-center text-xl font-bold p-4 rounded-lg border ${
              cashDifference > 0 ? 'bg-emerald-500/20 border-emerald-500/40' : 
              cashDifference < 0 ? 'bg-red-500/20 border-red-500/40' : 
              'bg-slate-500/20 border-slate-500/40'
            }`}>
              <span className="text-slate-100">
                {cashDifference > 0 ? 'Excess' : cashDifference < 0 ? 'Short / Loss' : 'Balanced'}
              </span>
              <span className={
                cashDifference > 0 ? 'text-emerald-400' : 
                cashDifference < 0 ? 'text-red-400' : 
                'text-slate-300'
              }>
                {cashDifference !== 0 ? (cashDifference > 0 ? '+' : '') + cashDifference.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
              </span>
            </div>
          </div>

          {/* VISUAL CASH SPLIT */}
          {(totalMPesaAmount > 0 || cashAtHand > 0) && (
            <div className="pt-6 border-t border-[#2d325a]">
              <h4 className="text-lg font-bold text-slate-200 mb-4 text-center">Cash Position Split</h4>
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
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
                      contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9' }}
                      formatter={(value: number) => `KES ${value.toLocaleString()}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <p className="text-sm text-slate-400">Total Funds</p>
                  <p className="text-xl font-bold text-slate-200">KES {(totalMPesaAmount + Math.max(0, cashAtHand)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
