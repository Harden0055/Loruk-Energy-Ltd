const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');
const expensesBlockStart = code.indexOf('{activeTab === \'expenses\' && (');

const deliveriesBlock = `      {activeTab === 'deliveries' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-theme-border">
                    <th className="modern-th">Date</th>
                    <th className="modern-th">Invoice No.</th>
                    <th className="modern-th">Product</th>
                    <th className="modern-th text-right">Volume</th>
                    <th className="modern-th text-right">Value (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {stationDeliveries.map(d => (
                    <tr key={d.id} className="modern-tr group">
                      <td className="modern-td">{format(d.date || 0, 'MMM dd, yyyy')}</td>
                      <td className="modern-td font-medium text-slate-700 dark:text-slate-300">
                        {d.invoiceNumber || '-'}
                      </td>
                      <td className="modern-td">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {d.productType}
                        </span>
                      </td>
                      <td className="modern-td text-right font-medium text-slate-700 dark:text-slate-300">
                        {d.litres.toLocaleString()} L
                      </td>
                      <td className="modern-td text-right font-bold text-slate-700 dark:text-slate-300">
                        {d.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stationDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-theme-text-muted">
                        No deliveries recorded for this station.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}\n`;

const newCode = code.substring(0, expensesBlockStart) + deliveriesBlock + code.substring(expensesBlockStart);
fs.writeFileSync('src/pages/StationDashboard.tsx', newCode);
