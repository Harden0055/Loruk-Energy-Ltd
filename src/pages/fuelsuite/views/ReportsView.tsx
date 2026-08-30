import React, { useState } from 'react';
import { useFuel, calculatePumpMeterDelta } from '../context';
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from '../components';
import { FileDown, BarChart3, TrendingUp, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { setupPdfHeader, addPdfFooter } from '../../../lib/pdfTemplate';

export default function ReportsView() {
  const { activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems } = useFuel();
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredReadings = pumpReadings.filter(r => activeStation === 'Combined Total' || r.station === activeStation);
  const filteredInventory = inventoryItems.filter(i => activeStation === 'Combined Total' || i.station === activeStation);
  const filteredExpenses = expenses; // Assuming expenses apply globally or could be filtered similarly

  const fuelRevenue = filteredReadings.reduce((acc, r) => {
    const sAmount = calculatePumpMeterDelta(r.salesStart, r.salesStop);
    return acc + (sAmount > 0 ? sAmount : (calculatePumpMeterDelta(r.litresStart, r.litresStop) * r.ratePerLitre));
  }, 0);
  const lpgRevenue = lpgTransactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const accessoryRevenue = filteredInventory.filter(t => t.type === 'out' && 
    !t.item.toLowerCase().includes('super') && 
    !t.item.toLowerCase().includes('diesel') && 
    !t.item.toLowerCase().includes('lpg') &&
    !t.item.toLowerCase().includes('cylinder')
  ).reduce((acc, t) => acc + t.amount, 0);

  const lpgCOGS = lpgTransactions.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);
  const accessoryPurchases = filteredInventory.filter(t => t.type === 'in' && 
    !t.item.toLowerCase().includes('super') && 
    !t.item.toLowerCase().includes('diesel') && 
    !t.item.toLowerCase().includes('lpg') &&
    !t.item.toLowerCase().includes('cylinder')
  ).reduce((acc, t) => acc + t.amount, 0);

  const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Simplified approximation of COGS for fuel (assuming 90% cost for demo purposes)
  const fuelCOGS = fuelRevenue * 0.90;

  const totalRevenue = fuelRevenue + lpgRevenue + accessoryRevenue;
  const totalCOGS = fuelCOGS + lpgCOGS + accessoryPurchases;
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - operatingExpenses;

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();
      const timestamp = format(Date.now(), 'yyyy-MM-dd_HH-mm');
      
      let currentY = await setupPdfHeader({
        doc,
        title: 'FINANCIAL PROFIT & LOSS',
        leftBoxLines: [
          'Loruk Energy Limited',
          `T/A ${activeStation}`,
          'P.O BOX 342',
        ],
        rightBoxLines: [
          { label: 'Report :', value: 'P&L Statement' },
          { label: 'Station :', value: activeStation },
          { label: 'Date :', value: format(new Date(), 'MMM d, yyyy') }
        ]
      });

      autoTable(doc, {
        startY: currentY + 10,
        head: [['Account Category', 'Amount (KES)']],
        body: [
          ['REVENUE', ''],
          ['  Fuel Sales', Math.round(fuelRevenue).toLocaleString()],
          ['  LPG Sales', Math.round(lpgRevenue).toLocaleString()],
          ['  Accessories Sales', Math.round(accessoryRevenue).toLocaleString()],
          ['Total Revenue', Math.round(totalRevenue).toLocaleString()],
          ['COST OF GOODS SOLD', ''],
          ['  Fuel COGS (Est.)', Math.round(fuelCOGS).toLocaleString()],
          ['  LPG Purchases', Math.round(lpgCOGS).toLocaleString()],
          ['  Accessories Purchases', Math.round(accessoryPurchases).toLocaleString()],
          ['Total COGS', Math.round(totalCOGS).toLocaleString()],
          ['GROSS PROFIT', Math.round(grossProfit).toLocaleString()],
          ['OPERATING EXPENSES', ''],
          ['  General Expenses', Math.round(operatingExpenses).toLocaleString()],
          ['Total Expenses', Math.round(operatingExpenses).toLocaleString()],
          ['NET PROFIT', Math.round(netProfit).toLocaleString()]
        ],
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 212] },
        styles: { fontSize: 10, cellPadding: 5 },
        didParseCell: function (data) {
          const rowText = data.row.raw[0] as string;
          if (rowText === 'REVENUE' || rowText === 'COST OF GOODS SOLD' || rowText === 'OPERATING EXPENSES') {
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.textColor = [15, 23, 42];
          }
          if (rowText === 'Total Revenue' || rowText === 'Total COGS' || rowText === 'Total Expenses') {
             data.cell.styles.fontStyle = 'bold';
          }
          if (rowText === 'GROSS PROFIT' || rowText === 'NET PROFIT') {
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.textColor = [255, 255, 255];
             data.cell.styles.fillColor = rowText === 'NET PROFIT' ? [15, 23, 42] : [71, 85, 105];
          }
        }
      });

      addPdfFooter(doc, (doc as any).lastAutoTable.finalY + 15, activeStation, 'P.O BOX 342');
      
      doc.save(`FuelSuite_PL_${timestamp}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Financial Reports</h1>
            <p className="text-theme-text-muted mt-0.5 text-xs">Profit & Loss Statement and station performance for {activeStation}</p>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-bold transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <FileDown className="w-5 h-5" />
          {isGenerating ? 'Generating...' : 'Export P&L PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={`KES ${Math.round(totalRevenue).toLocaleString()}`} 
          icon={ArrowUpRight} 
          colorClass="bg-blue-500/10 text-blue-400" 
        />
        <MetricCard 
          title="Gross Profit" 
          value={`KES ${Math.round(grossProfit).toLocaleString()}`} 
          icon={TrendingUp} 
          colorClass="bg-blue-500/10 text-blue-400" 
        />
        <MetricCard 
          title="Net Profit" 
          value={`KES ${Math.round(netProfit).toLocaleString()}`} 
          icon={DollarSign} 
          colorClass={netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"} 
        />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="bg-[#122840]/30">
          <CardTitle className="text-center text-xl tracking-wider">LORUK ENERGY P&L STATEMENT</CardTitle>
          <p className="text-center text-xs text-theme-text-muted mt-2">Station: {activeStation} | Period: ALL TIME</p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="modern-table">
            <tbody>
              {/* REVENUE */}
              <tr className="modern-tr">
                <td className="px-6 py-4 font-bold text-blue-400" colSpan={2}>REVENUE</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Fuel Sales</td>
                <td className="modern-td">{Math.round(fuelRevenue).toLocaleString()}</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">LPG Sales</td>
                <td className="modern-td">{Math.round(lpgRevenue).toLocaleString()}</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Accessories Sales</td>
                <td className="modern-td">{Math.round(accessoryRevenue).toLocaleString()}</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Total Revenue</td>
                <td className="modern-td font-semibold text-blue-400">{Math.round(totalRevenue).toLocaleString()}</td>
              </tr>

              {/* COGS */}
              <tr className="modern-tr">
                <td className="px-6 py-4 font-bold text-orange-400" colSpan={2}>COST OF GOODS SOLD (Est.)</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Fuel COGS</td>
                <td className="modern-td">({Math.round(fuelCOGS).toLocaleString()})</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">LPG Purchases</td>
                <td className="modern-td">({Math.round(lpgCOGS).toLocaleString()})</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Accessories Purchases</td>
                <td className="modern-td">({Math.round(accessoryPurchases).toLocaleString()})</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Total COGS</td>
                <td className="modern-td font-semibold text-orange-400">({Math.round(totalCOGS).toLocaleString()})</td>
              </tr>

              {/* GROSS PROFIT */}
              <tr className="modern-tr bg-blue-500/5 font-semibold">
                <td className="modern-td">GROSS PROFIT</td>
                <td className="modern-td text-blue-400">{Math.round(grossProfit).toLocaleString()}</td>
              </tr>

              {/* EXPENSES */}
              <tr className="modern-tr">
                <td className="px-6 py-4 font-bold text-red-400" colSpan={2}>OPERATING EXPENSES</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">General Expenses</td>
                <td className="modern-td">({Math.round(operatingExpenses).toLocaleString()})</td>
              </tr>
              <tr className="modern-tr">
                <td className="modern-td">Total Expenses</td>
                <td className="modern-td font-semibold text-red-400">({Math.round(operatingExpenses).toLocaleString()})</td>
              </tr>

              {/* NET PROFIT */}
              <tr className={`bg-[#122840]/50 font-bold text-lg`}>
                <td className="modern-td">NET PROFIT</td>
                <td className={`px-6 py-6 text-right ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {Math.round(netProfit).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
