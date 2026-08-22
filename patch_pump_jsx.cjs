const fs = require('fs');
const file = 'src/pages/fuelsuite/views/DailyDataEntryView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldJsx = /\{pumps\.map\(\(pump, idx\) => \(\s*<div key=\{idx\} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end border-b border-theme-border\/50 pb-4">[\s\S]*?<\/div>\s*<\/div>\s*\)\)\}/;

const newJsx = `{pumps.map((pump, idx) => {
            const salesAmount = (pump.salesStop || 0) - (pump.salesStart || 0);
            const litresSold = (pump.litresStop || 0) - (pump.litresStart || 0);
            const calculatedSales = litresSold * (pump.ratePerLitre || 0);
            const variance = (pump.manualCash || 0) - calculatedSales;

            return (
            <div key={idx} className="border border-theme-border/50 rounded-lg p-4 space-y-4 bg-theme-bg/20">
              <div className="font-semibold text-cyan-400 text-sm">{pump.product}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Start</label>
                  <Input type="number" step="0.01" value={pump.salesStart === 0 ? '' : pump.salesStart} onChange={(e) => {
                    const newPumps = [...pumps];
                    newPumps[idx].salesStart = parseFloat(e.target.value) || 0;
                    setPumps(newPumps);
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Stop</label>
                  <Input type="number" step="0.01" value={pump.salesStop === 0 ? '' : pump.salesStop} onChange={(e) => {
                    const newPumps = [...pumps];
                    newPumps[idx].salesStop = parseFloat(e.target.value) || 0;
                    setPumps(newPumps);
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Amount</label>
                  <Input disabled value={salesAmount.toFixed(2)} className="bg-theme-bg/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Start</label>
                  <Input type="number" step="0.01" value={pump.litresStart === 0 ? '' : pump.litresStart} onChange={(e) => {
                    const newPumps = [...pumps];
                    newPumps[idx].litresStart = parseFloat(e.target.value) || 0;
                    setPumps(newPumps);
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Stop</label>
                  <Input type="number" step="0.01" value={pump.litresStop === 0 ? '' : pump.litresStop} onChange={(e) => {
                    const newPumps = [...pumps];
                    newPumps[idx].litresStop = parseFloat(e.target.value) || 0;
                    setPumps(newPumps);
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Sold</label>
                  <Input disabled value={litresSold.toFixed(2)} className="bg-theme-bg/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Rate (Ksh/L)</label>
                  <Input type="number" step="0.01" value={pump.ratePerLitre === 0 ? '' : pump.ratePerLitre} onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const newPumps = [...pumps];
                    newPumps[idx].ratePerLitre = val;
                    setPumps(newPumps);
                    if (!isNaN(val)) {
                      localStorage.setItem(\`rate_\$\{station\}_\$\{pump.product\}\`, val.toString());
                    }
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Calculated Sales</label>
                  <Input disabled value={calculatedSales.toFixed(2)} className="bg-theme-bg/50 text-cyan-300 font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Manual Cash (Opt)</label>
                  <Input type="number" step="0.01" value={pump.manualCash === 0 ? '' : pump.manualCash} onChange={(e) => {
                    const newPumps = [...pumps];
                    newPumps[idx].manualCash = parseFloat(e.target.value) || 0;
                    setPumps(newPumps);
                  }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted block mb-1">Variance</label>
                  <Input disabled value={variance.toFixed(2)} className={\`bg-theme-bg/50 font-semibold \${variance < 0 ? 'text-red-400' : 'text-emerald-400'}\`} />
                </div>
              </div>
            </div>
          )})}
`;

content = content.replace(oldJsx, newJsx);

fs.writeFileSync(file, content);
