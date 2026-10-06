const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');

const start = code.indexOf('  // Monthly / Daily Sales & Expenses Trend Line');
const end = code.indexOf('  }, [stationPumpReadings, stationLpgSales, stationExpenses]);') + '  }, [stationPumpReadings, stationLpgSales, stationExpenses]);'.length;

const newBlock = `  // Monthly / Daily Deliveries & Expenses Trend Line
  const timelineTrendData = useMemo(() => {
    const groups: Record<string, { dateStr: string; DeliveriesValue: number; Expenses: number; Litres: number; timestamp: number }> = {};
    
    stationDeliveries.forEach(d => {
      const dateStr = format(new Date(d.date), 'MMM dd');
      if (!groups[dateStr]) groups[dateStr] = { dateStr, DeliveriesValue: 0, Expenses: 0, Litres: 0, timestamp: d.date };
      groups[dateStr].DeliveriesValue += (d.totalAmount || 0);
      groups[dateStr].Litres += (d.litres || 0);
    });

    stationExpenses.forEach(e => {
      const dateStr = format(new Date(e.date), 'MMM dd');
      if (!groups[dateStr]) groups[dateStr] = { dateStr, DeliveriesValue: 0, Expenses: 0, Litres: 0, timestamp: e.date };
      groups[dateStr].Expenses += (e.amount || 0);
    });

    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp).slice(-14);
  }, [stationDeliveries, stationExpenses]);`;

code = code.substring(0, start) + newBlock + code.substring(end);

// Also replace 'Revenue' with 'DeliveriesValue' in the AreaChart component below
code = code.replace(/dataKey="Revenue"/g, 'dataKey="DeliveriesValue"');
code = code.replace(/<Area type="monotone" dataKey="DeliveriesValue" stroke="#38BDF8" strokeWidth=\{2\.5\} fillOpacity=\{1\} fill="url\(#revGrad\)" \/>/, '<Area type="monotone" dataKey="DeliveriesValue" name="Deliveries" stroke="#38BDF8" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />');
code = code.replace(/>Station Revenue & Expense Dynamics</, '>Station Deliveries & Expense Dynamics<');
code = code.replace(/>Time-series comparison of incoming sales vs outflow expenses</, '>Time-series comparison of incoming deliveries vs outflow expenses<');

fs.writeFileSync('src/pages/StationDashboard.tsx', code);
