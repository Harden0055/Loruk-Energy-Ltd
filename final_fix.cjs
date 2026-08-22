const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

// The file currently has:
// </Card>
// <CardHeader>
//   <CardTitle className="text-lg text-cyan-400">Stations Configuration</CardTitle>
//   <p className="text-sm text-theme-text-muted">Manage stations across your application.</p>
// </CardHeader>
// <CardContent>
// ...
// </CardContent>
// </Card>
// 
// And we want to turn it into:
// </Card>
// )}
// <Card className="mt-8 border-theme-border glass-panel">
// <CardHeader>
// ...

c = c.replace(/<\/Card>\s*<CardHeader>\s*<CardTitle className="text-lg text-cyan-400">Stations Configuration<\/CardTitle>/,
  "</Card>\n      )}\n\n      <Card className=\"mt-8 border-theme-border glass-panel\">\n        <CardHeader>\n          <CardTitle className=\"text-lg text-cyan-400\">Stations Configuration</CardTitle>");

// We also need to find where the `</Card>` for stations ends and check if it's correct.
// Since the original wipe removed `</Card>\n      {confirmDialog}`, let's check the end of the file.

const tailMatch = c.match(/<\/Card>\s*\{confirmDialog\}/);
if (!tailMatch) {
  c = c.replace(/\{confirmDialog\}/, "</Card>\n      {confirmDialog}");
}

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', c);
