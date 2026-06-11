const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Export PDF buttons
  // bg-blue-100/50 hover:bg-blue-100 text-blue-600 ... border border-blue-200
  content = content.replace(/bg-blue-100\/50 hover:bg-blue-100 text-blue-600(.*?)border border-blue-200/g, 
    'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50$1border border-blue-200');
    
  // AI Auto-Fill buttons
  // bg-purple-100 hover:bg-purple-200 text-purple-700 ... border border-purple-200
  content = content.replace(/bg-purple-100 hover:bg-purple-200 text-purple-700(.*?)border border-purple-200/g,
    'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50$1border border-blue-200');

  // Any other purple texts explicitly missing
  content = content.replace(/text-purple-700/g, 'text-blue-600 dark:text-blue-300');

  fs.writeFileSync(filePath, content);
}

const dir = 'src/pages';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    replaceInFile(path.join(dir, file));
  }
});
