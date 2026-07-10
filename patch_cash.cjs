const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/CashPositionView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}

code = code.replace("import { Plus, Pencil, Trash2, X } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, Wallet, Smartphone, Banknote } from 'lucide-react';");

const metricsCode = `
  const metrics = React.useMemo(() => {
    const totalMpesa = cashPositions.reduce((sum, c) => sum + c.mPesa, 0);
    const totalCash = cashPositions.reduce((sum, c) => sum + c.cashOnHand, 0);
    const total = totalMpesa + totalCash;
    return { total, mPesa: totalMpesa, cash: totalCash };
  }, [cashPositions]);
`;

code = code.replace("return (\n    <div", metricsCode + "\n  return (\n    <div");

const dashboardCode = `
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Cash Flow" value={\`KES \${metrics.total.toLocaleString()}\`} icon={Wallet} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total M-Pesa" value={\`KES \${metrics.mPesa.toLocaleString()}\`} icon={Smartphone} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Total Cash on Hand" value={\`KES \${metrics.cash.toLocaleString()}\`} icon={Banknote} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>
`;

code = code.replace(/<div className="flex justify-between items-center">[\s\S]*?<\/div>\n/, match => match + dashboardCode);

fs.writeFileSync('src/pages/fuelsuite/views/CashPositionView.tsx', code);
