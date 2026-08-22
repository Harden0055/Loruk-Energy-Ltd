const fs = require('fs');
const file = './src/pages/Deliveries.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /        customerId: newCustomerId,\n        productType: newProductType,/,
    "        customerId: newCustomerId,\n        productId: uniqueProducts.find(p => p.name === newProductType)?.id || '',\n        productType: newProductType,"
);

fs.writeFileSync(file, content);
