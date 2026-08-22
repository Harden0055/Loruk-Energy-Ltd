const fs = require('fs');
const file = './src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const outstandingBalanceColor = "text-pink-600 dark:text-pink-400";/,
  "const outstandingBalanceColor = outstandingBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400';"
);

fs.writeFileSync(file, content);
