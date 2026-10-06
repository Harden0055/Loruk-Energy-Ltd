const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');

// Replace totalGrossRevenue definition
code = code.replace(/const totalGrossRevenue = fuelMetrics\.totalFuelRev \+ lpgRevenue;/, 
  'const totalDeliveriesValue = stationDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);');

// Fix net operating profit to use totalDeliveriesValue or just remove it if it makes no sense. 
// "profit" doesn't make sense if it's deliveries vs expenses. Let's just do Deliveries Value - Expenses.
code = code.replace(/const netOperatingProfit = totalGrossRevenue - totalExpensesAmount;/,
  'const netOperatingProfit = totalDeliveriesValue - totalExpensesAmount;');
code = code.replace(/const profitMarginPct = totalGrossRevenue > 0 \? \(netOperatingProfit \/ totalGrossRevenue\) \* 100 : 0;/,
  'const profitMarginPct = totalDeliveriesValue > 0 ? (netOperatingProfit / totalDeliveriesValue) * 100 : 0;');

// Update Metric 1 text
code = code.replace(/>Gross Revenue</, '>Deliveries Value<');
code = code.replace(/\{totalGrossRevenue\.toLocaleString/g, '{totalDeliveriesValue.toLocaleString');
code = code.replace(/Fuel: <span className="font-bold text-blue-300">Ksh \{fuelMetrics\.totalFuelRev\.toLocaleString\(\)\}<\/span>/,
  'Fuel Deliveries: <span className="font-bold text-blue-300">Ksh {totalDeliveriesValue.toLocaleString()}</span>');

// Update Metric 2 text (Volume)
code = code.replace(/>Total Fuel Sales</, '>Total Fuel Deliveries<');

// Update Metric 3 text (LPG Revenue -> wait, we removed LPG sales. Let's remove Metric 3 and make it something else or just leave it blank)
// Wait, Metric 3 is LPG Sales. Let's replace Metric 3 with "Deliveries Count"
code = code.replace(/>LPG Sales Revenue</, '>Deliveries Count<');
code = code.replace(/\{lpgRevenue\.toLocaleString/g, '{stationDeliveries.length.toLocaleString');
code = code.replace(/Ksh \{lpgRevenue/, '{stationDeliveries.length');
code = code.replace(/Sold <span className="font-bold text-orange-300">\{lpgCylindersSold\}<\/span> cylinders/,
  '<span className="font-bold text-orange-300">{stationDeliveries.length}</span> total delivery records');

// Update Metric 4 text (Net Profit -> Net Cashflow or similar since it's Deliveries - Expenses)
code = code.replace(/>Net Operating Profit</, '>Deliveries vs Expenses<');
code = code.replace(/>Margin: \{profitMarginPct\.toFixed\(1\)\}%</, 'Ratio: {profitMarginPct.toFixed(1)}%');

fs.writeFileSync('src/pages/StationDashboard.tsx', code);
