const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

// The file has:
// </Card>
// <Card className="mt-8 border-theme-border glass-panel">

c = c.replace(/<\/Card>\n<Card className="mt-8 border-theme-border glass-panel">/, "</Card>\n      )}\n      <Card className=\"mt-8 border-theme-border glass-panel\">");

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', c);
