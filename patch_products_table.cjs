const fs = require('fs');
const file = 'src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header
content = content.replace(
  /<Th>Product Name<\/Th>/,
  "<Th>Product Name</Th>\n                <Th>Item Code</Th>"
);

// Cell
content = content.replace(
  /<span className="font-semibold text-theme-text">\{p\.name\}<\/span>\n\s*<\/Td>/,
  `<span className="font-semibold text-theme-text">{p.name}</span>\n                  </Td>\n                  <Td>\n                    <span className="text-theme-text-muted">{p.itemCode || '-'}</span>\n                  </Td>`
);

fs.writeFileSync(file, content);
