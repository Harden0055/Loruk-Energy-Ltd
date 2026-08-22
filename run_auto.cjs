const fs = require('fs');
let content = fs.readFileSync('./src/pages/Products.tsx', 'utf8');

const autoRun = `
  useEffect(() => {
    if (products && products.length > 0) {
      const hasDuplicates = new Set(products.map(p => p.name)).size !== products.length;
      if (hasDuplicates || !products.find(p => p.id === 'white_oil_super_petrol')) {
        console.log('Auto-standardizing products...');
        replaceProductsWithStandard(products).catch(console.error);
      }
    }
  }, [products]);
`;

content = content.replace('  const resetForm', autoRun + '\n  const resetForm');
fs.writeFileSync('./src/pages/Products.tsx', content);
