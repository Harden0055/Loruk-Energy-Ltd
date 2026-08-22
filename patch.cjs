const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\{formatCurrency\(calculatedBalance\)\}/g,
  "{formatCurrency(Math.abs(calculatedBalance))}"
);
fs.writeFileSync(file, content);
