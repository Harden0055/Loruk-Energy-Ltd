const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');

// Add Droplets import
code = code.replace(/import \{ \n  Building2,/, 'import {\n  Droplets,\n  Building2,');

// Remove invoiceNumber column from deliveries table
code = code.replace(/<th className="modern-th">Invoice No\.<\/th>/, '');
code = code.replace(/<td className="modern-td font-medium text-slate-700 dark:text-slate-300">\s*\{d\.invoiceNumber \|\| '-'\}\s*<\/td>/, '');
code = code.replace(/<td colSpan=\{5\}/, '<td colSpan={4}');

fs.writeFileSync('src/pages/StationDashboard.tsx', code);
