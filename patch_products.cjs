const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}

code = code.replace("import { Plus, Pencil, Trash2, X } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, Box, Tag, Layers } from 'lucide-react';");

const metricsCode = `
  const metrics = React.useMemo(() => {
    return { total: products.length };
  }, [products]);
`;

code = code.replace("return (\n    <div", metricsCode + "\n  return (\n    <div");

const dashboardCode = `
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Products" value={metrics.total} icon={Box} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Active Categories" value="2" icon={Layers} colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard title="Tracked Items" value={metrics.total} icon={Tag} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>
`;

code = code.replace(/<div className="flex justify-between items-center">[\s\S]*?<\/div>\n/, match => match + dashboardCode);

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', code);
