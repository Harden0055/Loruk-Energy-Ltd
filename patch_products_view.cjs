const fs = require('fs');
const file = 'src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[form, setForm\] = useState<Partial<Product>>\(\{\n\s*name: '',\n\s*\}\);/,
  "const [form, setForm] = useState<Partial<Product>>({\n    name: '',\n    itemCode: '',\n  });"
);

content = content.replace(
  /const resetForm = \(\) => \{\n\s*setForm\(\{\n\s*name: '',\n\s*\}\);/,
  "const resetForm = () => {\n    setForm({\n      name: '',\n      itemCode: '',\n    });"
);

// Form replacement
content = content.replace(
  /<div className="col-span-1 md:col-span-2">\n\s*<label className="block text-xs text-theme-text-muted mb-1">Product Name<\/label>\n\s*<Input type="text" value=\{form.name\} onChange=\{e => setForm\(\{\.\.\.form, name: e\.target\.value\}\)\} placeholder="e\.g\. Super Premium" required \/>\n\s*<\/div>/,
  `<div className="col-span-1 md:col-span-1">\n                <label className="block text-xs text-theme-text-muted mb-1">Product Name</label>\n                <Input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Super Premium" required />\n              </div>\n              <div className="col-span-1 md:col-span-1">\n                <label className="block text-xs text-theme-text-muted mb-1">Item Code (Optional)</label>\n                <Input type="text" value={form.itemCode || ''} onChange={e => setForm({...form, itemCode: e.target.value})} placeholder="e.g. PRD-001" />\n              </div>`
);

fs.writeFileSync(file, content);
