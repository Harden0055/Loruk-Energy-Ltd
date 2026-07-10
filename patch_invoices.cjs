const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/InvoicesView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}

code = code.replace("import { Plus, Pencil, Trash2, X, Users, FileText, UserCheck, UserX } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, Users, FileText, UserCheck, UserX, Receipt, Banknote, AlertCircle } from 'lucide-react';");

const metricsCode = `
  const metrics = React.useMemo(() => {
    const totalInvoiced = filteredData.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = filteredData.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    return { totalInvoiced, totalPaid, totalOutstanding };
  }, [filteredData]);
`;

code = code.replace("return (\n    <div", metricsCode + "\n  return (\n    <div");

const dashboardCode = `
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Invoiced" value={\`KES \${metrics.totalInvoiced.toLocaleString()}\`} icon={Receipt} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total Paid" value={\`KES \${metrics.totalPaid.toLocaleString()}\`} icon={Banknote} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Total Outstanding" value={\`KES \${metrics.totalOutstanding.toLocaleString()}\`} icon={AlertCircle} colorClass="bg-orange-500/10 text-orange-400" />
      </div>
`;

code = code.replace(/<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">[\s\S]*?<\/div>\n/, match => match + dashboardCode);

fs.writeFileSync('src/pages/fuelsuite/views/InvoicesView.tsx', code);
