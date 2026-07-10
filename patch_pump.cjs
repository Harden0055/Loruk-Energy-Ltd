const fs = require('fs');
let code = fs.readFileSync('src/pages/fuelsuite/views/PumpReadingsView.tsx', 'utf8');

if (!code.includes('MetricCard')) {
  code = code.replace(/import {([^}]+)} from '\.\.\/components';/, "import {$1, MetricCard} from '../components';");
}
if (!code.includes('Droplet')) {
  code = code.replace("import { Plus, Pencil, Trash2, X } from 'lucide-react';", "import { Plus, Pencil, Trash2, X, Droplet, TrendingUp, Banknote } from 'lucide-react';");
}

const customCardsRegex = /<div className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-theme-border shadow-sm">[\s\S]*?<\/h3>\s*<\/div>\s*<\/div>/g;
code = code.replace(customCardsRegex, '');

const wrapperRegex = /<div className="flex gap-4 w-full md:w-auto">[\s\S]*?<\/div>\s*<\/div>/;
code = code.replace(wrapperRegex, match => match + `
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Volume" value={\`\${metrics.totalVolume.toFixed(2)} L\`} icon={Droplet} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Expected Sales" value={\`KES \${metrics.expectedSales.toLocaleString()}\`} icon={TrendingUp} colorClass="bg-cyan-500/10 text-cyan-400" />
        <MetricCard title="Collected Cash" value={\`KES \${metrics.collectedCash.toLocaleString()}\`} icon={Banknote} colorClass="bg-emerald-500/10 text-emerald-400" />`);

fs.writeFileSync('src/pages/fuelsuite/views/PumpReadingsView.tsx', code);
