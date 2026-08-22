const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">\s*Active customer outstanding balance\.\s*<\/p>/g,
  '<p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wide">Active customer outstanding balance.</p>'
);

fs.writeFileSync(file, content);
