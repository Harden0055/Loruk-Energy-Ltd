const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

c = c.replace(/<\/Card>\s*<Card className="mt-8 border-theme-border glass-panel">/, "</Card>\n      )}\n      <Card className=\"mt-8 border-theme-border glass-panel\">");

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', c);
