const fs = require('fs');
const file = './src/pages/Ledger.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update custBalanceColor
content = content.replace(
  /const custBalanceColor = custBalance !== 0 \n\s*\? \(custBalance < 0 \? 'text-emerald-600 dark:text-emerald-400' : 'text-pink-600 dark:text-pink-400'\)\n\s*: 'text-blue-900 dark:text-theme-text';/g,
  "const custBalanceColor = custBalance !== 0 ? (custBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400') : 'text-gray-900 dark:text-theme-text';"
);

// If the regex above fails, do a more robust one
content = content.replace(
  /const custBalanceColor = [^;]+;/g,
  "const custBalanceColor = custBalance < 0 ? 'text-green-600 dark:text-green-400' : custBalance > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-theme-text';"
);

// Update overallBalance
content = content.replace(
  /<h3 className=\{\`text-3xl font-bold \$\{overallBalance !== 0 \? 'text-pink-600 dark:text-pink-400' : 'text-blue-900 dark:text-theme-text'\}\`\}>/g,
  "<h3 className={`text-3xl font-bold ${overallBalance < 0 ? 'text-green-600 dark:text-green-400' : overallBalance > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-theme-text'}`}>"
);

// Update the label for overallBalance from pink to purple (if they want it consistent)
content = content.replace(
  /<p className="text-sm font-medium text-pink-500 dark:text-pink-400 mb-1">Total Outstanding Balance \(All Entries\)<\/p>/g,
  '<p className="text-sm font-medium text-purple-500 dark:text-purple-400 mb-1">Total Outstanding Balance (All Entries)</p>'
);

fs.writeFileSync(file, content);
