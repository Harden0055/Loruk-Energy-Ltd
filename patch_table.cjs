const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace pink/emerald in the table with purple/green
content = content.replace(
  /\? 'text-pink-600 dark:text-pink-400'/g,
  "? 'text-purple-600 dark:text-purple-400'"
);
content = content.replace(
  /\? 'text-emerald-600 dark:text-emerald-400'/g,
  "? 'text-green-600 dark:text-green-400'"
);
content = content.replace(
  /: 'text-emerald-600 dark:text-emerald-400 font-medium'/g,
  ": 'text-green-600 dark:text-green-400 font-medium'"
);

// Apply Math.abs to balanceAfter
content = content.replace(
  /\{formatCurrency\(e\.balanceAfter\)\}/g,
  "{formatCurrency(Math.abs(e.balanceAfter))}"
);

fs.writeFileSync(file, content);
