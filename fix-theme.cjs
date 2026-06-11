const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content
    .replace(/dark:text-gray-100/g, 'dark:text-blue-100')
    .replace(/dark:text-gray-200/g, 'dark:text-blue-200')
    .replace(/dark:text-gray-50/g, 'dark:text-blue-50');
  fs.writeFileSync(filePath, content);
}

const dir = 'src/pages';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    replaceInFile(path.join(dir, file));
  }
});
replaceInFile('src/components/AIInputModal.tsx');
replaceInFile('src/App.tsx');
replaceInFile('src/components/Sidebar.tsx');

