const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /if \(confirm\('This will delete all current products and recreate them with standard categories and sorted order\. Proceed\?'\)\) \{/,
    "confirmDelete('This will delete all current products and recreate them with standard categories and sorted order. Proceed?', async () => {"
);

content = content.replace(
    /        alert\('Products standardized successfully!'\);\n      \} catch \(err: any\) \{\n        console\.error\(err\);\n        setError\(err\.message || 'Failed to standardize products'\);\n      \}\n    \}/,
    `        alert('Products standardized successfully!');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to standardize products');
      }
    });`
);

fs.writeFileSync(file, content);
