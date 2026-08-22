const fs = require('fs');
const file = './src/pages/Customers.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update balance color
content = content.replace(
  /\? 'text-pink-600 dark:text-pink-400'/g,
  "? 'text-purple-600 dark:text-purple-400'"
);
content = content.replace(
  /\? 'text-emerald-600 dark:text-emerald-400 font-semibold'/g,
  "? 'text-green-600 dark:text-green-400 font-semibold'"
);
content = content.replace(
  /text-emerald-600 dark:text-emerald-400 mt-0\.5/g,
  "text-green-600 dark:text-green-400 mt-0.5"
);

fs.writeFileSync(file, content);
