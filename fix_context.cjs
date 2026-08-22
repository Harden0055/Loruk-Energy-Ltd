const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/context.tsx', 'utf8');

c = c.replace(/const \[customers, setCustomers, stations, setStations\] = useFirebaseCollection<Customer>\('fuelsuite_customers', \[\]\);/, 
"const [customers, setCustomers] = useFirebaseCollection<Customer>('fuelsuite_customers', []);");

c = c.replace(/value=\{\{\n\s*activeStation,\n\s*setActiveStation,\n\s*pumpReadings,\n\s*setPumpReadings,\n\s*lpgTransactions,\n\s*setLpgTransactions,\n\s*inventoryItems,\n\s*setInventoryItems,\n\s*expenses,\n\s*setExpenses,\n\s*invoices,\n\s*setInvoices,\n\s*cashPositions,\n\s*setCashPositions,\n\s*products,\n\s*setProducts,\n\s*customers,\n\s*setCustomers\n\s*\}\}/,
`value={{
      activeStation,
      setActiveStation,
      pumpReadings,
      setPumpReadings,
      lpgTransactions,
      setLpgTransactions,
      inventoryItems,
      setInventoryItems,
      expenses,
      setExpenses,
      invoices,
      setInvoices,
      cashPositions,
      setCashPositions,
      products,
      setProducts,
      customers,
      setCustomers,
      stations,
      setStations
    }}`);

fs.writeFileSync('src/pages/fuelsuite/context.tsx', c);
