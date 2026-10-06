const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/DashboardView.tsx', 'utf8');

// I will check what's inside DashboardView
console.log(code.substring(0, 500));
