const fs = require('fs');
const file = 'src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const codeA = a\.itemCode \|\| 'ZZZZZ';/g,
  "const codeA = a.itemCode || '~';"
);
content = content.replace(
  /const codeB = b\.itemCode \|\| 'ZZZZZ';/g,
  "const codeB = b.itemCode || '~';"
);

fs.writeFileSync(file, content);
