const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');
const fuelBlockStart = code.indexOf('{activeTab === \'fuel\' && (');
const lpgBlockStart = code.indexOf('{activeTab === \'lpg\' && (');
const expensesBlockStart = code.indexOf('{activeTab === \'expenses\' && (');
const invoicesBlockStart = code.indexOf('{activeTab === \'invoices\' && (');
const timelineBlockStart = code.indexOf('{activeTab === \'timeline\' && (');

// We want to delete fuel and lpg blocks (from fuelBlockStart to expensesBlockStart)
// and invoices block (from invoicesBlockStart to timelineBlockStart)

const newCode = code.substring(0, fuelBlockStart) + code.substring(expensesBlockStart, invoicesBlockStart) + code.substring(timelineBlockStart);
fs.writeFileSync('src/pages/StationDashboard.tsx', newCode);
