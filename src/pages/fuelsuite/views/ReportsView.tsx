import React from 'react';
import { useFuel } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td } from '../components';

export default function ReportsView() {
  const { activeStation, pumpReadings, expenses, lpgTransactions } = useFuel();

  const filteredReadings = pumpReadings.filter(r => activeStation === 'Combined Total' || r.station === activeStation);
  const filteredExpenses = expenses; // Assuming expenses apply globally or could be filtered similarly

  const fuelRevenue = filteredReadings.reduce((acc, r) => acc + ((r.stopReading - r.startReading) * r.ratePerLitre), 0);
  const lpgRevenue = lpgTransactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const lpgCOGS = lpgTransactions.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);
  const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Simplified approximation of COGS for fuel (assuming 90% cost for demo purposes)
  const fuelCOGS = fuelRevenue * 0.90;

  const totalRevenue = fuelRevenue + lpgRevenue;
  const totalCOGS = fuelCOGS + lpgCOGS;
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - operatingExpenses;

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Financial Reports</h1>
        <p className="text-slate-400 mt-1">Profit & Loss Statement for {activeStation}</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="bg-[#2d325a]/30">
          <CardTitle className="text-center text-xl tracking-wider">LORUK ENERGY P&L STATEMENT</CardTitle>
          <p className="text-center text-xs text-slate-400 mt-2">Station: {activeStation} | Period: ALL TIME</p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm text-slate-200">
            <tbody>
              {/* REVENUE */}
              <tr className="bg-[#13162b]">
                <td className="px-6 py-4 font-bold text-cyan-400" colSpan={2}>REVENUE</td>
              </tr>
              <tr className="border-b border-[#2d325a]">
                <td className="px-6 py-3 pl-10 text-slate-400">Fuel Sales</td>
                <td className="px-6 py-3 text-right">{fuelRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-[#2d325a]">
                <td className="px-6 py-3 pl-10 text-slate-400">LPG Sales</td>
                <td className="px-6 py-3 text-right">{lpgRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="bg-[#1a1d36] font-semibold border-b-2 border-cyan-500/30">
                <td className="px-6 py-4">Total Revenue</td>
                <td className="px-6 py-4 text-right text-cyan-400">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>

              {/* COGS */}
              <tr className="bg-[#13162b]">
                <td className="px-6 py-4 font-bold text-orange-400" colSpan={2}>COST OF GOODS SOLD (Est.)</td>
              </tr>
              <tr className="border-b border-[#2d325a]">
                <td className="px-6 py-3 pl-10 text-slate-400">Fuel COGS</td>
                <td className="px-6 py-3 text-right">({fuelCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
              </tr>
              <tr className="border-b border-[#2d325a]">
                <td className="px-6 py-3 pl-10 text-slate-400">LPG Purchases</td>
                <td className="px-6 py-3 text-right">({lpgCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
              </tr>
              <tr className="bg-[#1a1d36] font-semibold border-b-2 border-orange-500/30">
                <td className="px-6 py-4">Total COGS</td>
                <td className="px-6 py-4 text-right text-orange-400">({totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
              </tr>

              {/* GROSS PROFIT */}
              <tr className="bg-[#2d325a]/20 font-bold border-b border-[#2d325a]">
                <td className="px-6 py-4 text-slate-300">GROSS PROFIT</td>
                <td className="px-6 py-4 text-right">{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>

              {/* EXPENSES */}
              <tr className="bg-[#13162b]">
                <td className="px-6 py-4 font-bold text-red-400" colSpan={2}>OPERATING EXPENSES</td>
              </tr>
              <tr className="border-b border-[#2d325a]">
                <td className="px-6 py-3 pl-10 text-slate-400">General Expenses</td>
                <td className="px-6 py-3 text-right">({operatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
              </tr>
              <tr className="bg-[#1a1d36] font-semibold border-b-2 border-red-500/30">
                <td className="px-6 py-4">Total Expenses</td>
                <td className="px-6 py-4 text-right text-red-400">({operatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
              </tr>

              {/* NET PROFIT */}
              <tr className={`bg-[#2d325a]/50 font-bold text-lg`}>
                <td className="px-6 py-6 text-slate-200">NET PROFIT</td>
                <td className={`px-6 py-6 text-right ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
