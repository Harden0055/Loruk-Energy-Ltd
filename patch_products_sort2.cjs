const fs = require('fs');
const file = 'src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\{\[\.\.\.products\]\.sort\(\(a: any, b: any\) => \{\n\s*const codeA = a\.itemCode \|\| '~';\n\s*const codeB = b\.itemCode \|\| '~';\n\s*return codeA\.localeCompare\(codeB\);\n\s*\}\)\.map\(p => \(/g,
  `{[...products].sort((a: any, b: any) => {
                if (!a.itemCode && !b.itemCode) return (a.sortOrder || 99) - (b.sortOrder || 99);
                if (!a.itemCode) return 1;
                if (!b.itemCode) return -1;
                return a.itemCode.localeCompare(b.itemCode);
              }).map(p => (`
);

fs.writeFileSync(file, content);
