const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('import { useProducts, addProduct, updateProduct, deleteProduct } from \\\'../lib/operationsDb\\\';', 'import { useProducts, addProduct, updateProduct, deleteProduct, replaceProductsWithStandard } from \\\'../lib/operationsDb\\\';');

const fixFunc = `
  const handleFixProducts = async () => {
    if (confirm('This will delete all current products and recreate them with standard categories and sorted order. Proceed?')) {
      try {
        setError(null);
        await replaceProductsWithStandard(products || []);
        alert('Products standardized successfully!');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to standardize products');
      }
    }
  };
`;

content = content.replace('const handleDelete = async', fixFunc + '\n  const handleDelete = async');

content = content.replace('<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">', '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">\n        <button onClick={handleFixProducts} className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-lg text-sm font-bold">Standardize Products</button>');

// Instead of using uniqueProducts, use products directly because they will be clean.
content = content.replace(/uniqueProducts/g, '(products || [])');
content = content.replace('// Use a map to filter out duplicate product names (case-insensitive)', '');
content = content.replace(/const uniqueProducts = Object.values\([^)]+\)\);/s, '');
content = content.replace(/const uniqueProducts = Object.values\([\s\S]*?Record<string, ProductDef>\)\n  \);/, '');

fs.writeFileSync(file, content);
