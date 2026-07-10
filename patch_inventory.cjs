const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/InventoryView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}

code = code.replace("import { Plus, Pencil, Trash2, X, AlertCircle } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, AlertCircle, Box, PackagePlus, PackageMinus } from 'lucide-react';");

const metricsCode = `
  const metrics = React.useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalBal = 0;
    Object.values(inventorySummary).forEach(s => {
      totalIn += s.in;
      totalOut += s.out;
      totalBal += s.balance;
    });
    return { totalIn, totalOut, totalBal };
  }, [inventorySummary]);
`;

code = code.replace("return (\n    <div", metricsCode + "\n  return (\n    <div");

const dashboardCode = `
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Received" value={metrics.totalIn.toLocaleString(undefined, { maximumFractionDigits: 2 })} icon={PackagePlus} colorClass="bg-cyan-500/10 text-cyan-400" />
        <MetricCard title="Total Dispatched" value={metrics.totalOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} icon={PackageMinus} colorClass="bg-orange-500/10 text-orange-400" />
        <MetricCard title="Total Balance" value={metrics.totalBal.toLocaleString(undefined, { maximumFractionDigits: 2 })} icon={Box} colorClass="bg-emerald-500/10 text-emerald-400" />
      </div>
`;

code = code.replace(/<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">[\s\S]*?<\/div>\n/, match => match + dashboardCode);

fs.writeFileSync('src/pages/fuelsuite/views/InventoryView.tsx', code);
