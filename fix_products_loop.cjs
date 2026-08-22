const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

const badCode = `  useEffect(() => {
    if (products && products.length > 0) {
      const hasDuplicates = new Set(products.map(p => p.name)).size !== products.length;
      if (hasDuplicates || !products.find(p => p.id === 'white_oil_super_petrol')) {
        console.log('Auto-standardizing products...');
        replaceProductsWithStandard(products).catch(console.error);
      }
    }
  }, [products]);`;

content = content.replace(badCode, '');
fs.writeFileSync(file, content);
