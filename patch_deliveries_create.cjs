const fs = require('fs');
const file = './src/pages/Deliveries.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /        date: new Date\(form\.date\)\.getTime\(\) \|\| Date\.now\(\),\n        productType: form\.productType,/,
    "        date: new Date(form.date).getTime() || Date.now(),\n        productId: uniqueProducts.find(p => p.name === form.productType)?.id || '',\n        productType: form.productType,"
);

// We should also add it to `types.ts` `Delivery` interface
let types = fs.readFileSync('./src/types.ts', 'utf8');
types = types.replace(
    /  date: number;\n  productType: string;/,
    "  date: number;\n  productId?: string;\n  productType: string;"
);
fs.writeFileSync('./src/types.ts', types);

fs.writeFileSync(file, content);
