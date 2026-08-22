const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /className=\{\`text-2xl font-black font-mono tracking-tight leading-none \$\{calculatedBalance < 0 \? 'text-emerald-600 dark:text-emerald-400' : 'text-pink-600 dark:text-pink-400'\}\`\}/g,
  "className={`text-2xl font-black font-mono tracking-tight leading-none ${calculatedBalance < 0 ? 'text-green-600 dark:text-green-400' : calculatedBalance > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}"
);

fs.writeFileSync(file, content);
