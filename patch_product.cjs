const fs = require('fs');
const file = 'src/pages/fuelsuite/context.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /export interface Product \{\n\s*id: string;\n\s*name: string;\n\}/g,
  "export interface Product {\n  id: string;\n  name: string;\n  itemCode?: string;\n}"
);
fs.writeFileSync(file, content);
