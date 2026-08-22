const fs = require('fs');

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/startReading/g, 'litresStart');
  content = content.replace(/stopReading/g, 'litresStop');
  fs.writeFileSync(file, content);
}

const files = [
  'src/pages/fuelsuite/views/ReportsView.tsx',
  'src/pages/fuelsuite/views/InventoryView.tsx',
  'src/pages/fuelsuite/views/MiniDashboardProfile.tsx',
  'src/pages/fuelsuite/views/DailyDataEntryView.tsx',
  'src/pages/fuelsuite/views/DailyReportView.tsx',
  'src/pages/fuelsuite/views/DashboardView.tsx'
];

files.forEach(replaceInFile);
