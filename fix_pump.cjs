const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/PumpReadingsView.tsx', 'utf8');

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-6">\s*<\/div>/g, '');

fs.writeFileSync('src/pages/fuelsuite/views/PumpReadingsView.tsx', code);
