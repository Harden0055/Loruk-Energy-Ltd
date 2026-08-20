const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('                          {e.type === \\\'delivery\\\' ? <Truck className="w-4 h-4 glow-blue-icon" /> : null}', '                          {e.type === \\\'delivery\\\' ? <Truck className="w-4 h-4 glow-blue-icon" /> : null}\n                          {e.type === \\\'payment\\\' ? <DollarSign className="w-4 h-4 text-emerald-400 stroke-emerald-400 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> : null}\n                        </div>');

fs.writeFileSync(file, content);
