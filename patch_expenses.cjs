const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/ExpensesView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}

if (!code.includes('import { Plus, Pencil, Trash2, X')) {
   // Wait, it is there
}

code = code.replace("import { Plus, Pencil, Trash2, X } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, Receipt, CreditCard, Banknote } from 'lucide-react';");

const metricsCode = `
  const metrics = React.useMemo(() => {
    const total = filteredData.reduce((sum, e) => sum + e.amount, 0);
    const mPesa = filteredData.filter(e => e.category.toLowerCase().includes('m-pesa') || e.category.toLowerCase().includes('mpesa') || e.category.toLowerCase().includes('m.pesa')).reduce((sum, e) => sum + e.amount, 0);
    const cash = total - mPesa;
    return { total, mPesa, cash };
  }, [filteredData]);
`;

code = code.replace("return (\n    <div", metricsCode + "\n  return (\n    <div");

const dashboardCode = `
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Expenses" value={\`KES \${metrics.total.toLocaleString()}\`} icon={Receipt} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="M-Pesa Expenses" value={\`KES \${metrics.mPesa.toLocaleString()}\`} icon={CreditCard} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Cash Expenses" value={\`KES \${metrics.cash.toLocaleString()}\`} icon={Banknote} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>
`;

code = code.replace(/<div className="flex justify-between items-center">[\s\S]*?<\/div>\n/, match => match + dashboardCode);

fs.writeFileSync('src/pages/fuelsuite/views/ExpensesView.tsx', code);
