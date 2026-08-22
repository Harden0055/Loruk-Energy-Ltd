const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1\.5 uppercase tracking-wide"/g,
  'className="text-xs text-green-600 dark:text-green-400 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wide"'
);

fs.writeFileSync(file, content);
