const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/DashboardView.tsx', 'utf8');

// Add cashPositions to useFuel
code = code.replace(/const \{ activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems, invoices \} = useFuel\(\);/,
  'const { activeStation, pumpReadings, expenses, lpgTransactions, inventoryItems, invoices, cashPositions } = useFuel();');

// Calculate the stats before the return statement
const calcBlock = `
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
`;

const returnIndex = code.indexOf('  return (');
code = code.substring(0, returnIndex) + calcBlock + '\n' + code.substring(returnIndex);

// UI block to insert inside the return, right after <div className="grid grid-cols-12 gap-6">
const uiBlock = `
        {activeStation !== 'Combined Total' && (
          <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-2">
            <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Total Sales</p>
              <p className="text-sm font-bold text-slate-100">KES {stationTotalSales.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Purchases</p>
              <p className="text-sm font-bold text-slate-100">KES {stationTotalPurchases.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Expenses</p>
              <p className="text-sm font-bold text-slate-100">KES {stationTotalExpenses.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Invoices Issued</p>
              <p className="text-sm font-bold text-slate-100">KES {stationInvoiceTotal.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Paid Invoices</p>
              <p className="text-sm font-bold text-slate-100">KES {stationInvoicePaid.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">M-Pesa</p>
              <p className="text-sm font-bold text-slate-100">KES {stationMpesa.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">Cash at Hand</p>
              <p className="text-sm font-bold text-slate-100">KES {stationCash.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 flex flex-col justify-center">
              <p className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider mb-1">Inventory Value</p>
              <p className="text-sm font-bold text-slate-100">KES {stationInventoryValue.toLocaleString()}</p>
            </div>
          </div>
        )}
`;

const gridIndex = code.indexOf('<div className="grid grid-cols-12 gap-6">') + '<div className="grid grid-cols-12 gap-6">'.length;
code = code.substring(0, gridIndex) + '\n' + uiBlock + code.substring(gridIndex);

fs.writeFileSync('src/pages/fuelsuite/views/DashboardView.tsx', code);
