const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/DashboardView.tsx', 'utf8');

const calcBlockStr = `
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

// Remove it from wherever it is now
code = code.replace(calcBlockStr, '');

// Insert it right before "const CustomTooltip"
const customTooltipIndex = code.indexOf('  // Custom tooltips');
code = code.substring(0, customTooltipIndex) + calcBlockStr + '\n' + code.substring(customTooltipIndex);

fs.writeFileSync('src/pages/fuelsuite/views/DashboardView.tsx', code);
