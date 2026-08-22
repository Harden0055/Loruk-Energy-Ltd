const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

// The botched part is at the top of the file:
//         alert('Products standardized successfully!');      } catch (err: any) {        console.error(err);        setError(err.message || 'Failed to standardize products');      }    });import React
const botched = `        alert('Products standardized successfully!');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to standardize products');
      }
    });import React`;
content = content.replace(botched, 'import React');

// Fix the actual handleFixProducts
const oldHandle = `    confirmDelete('This will delete all current products and recreate them with standard categories and sorted order. Proceed?', async () => {
      try {
        setError(null);
        await replaceProductsWithStandard(products || []);
        alert('Products standardized successfully!');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to standardize products');
      }
    }
  };`;
const newHandle = `    confirmDelete('This will delete all current products and recreate them with standard categories and sorted order. Proceed?', async () => {
      try {
        setError(null);
        await replaceProductsWithStandard(products || []);
        alert('Products standardized successfully!');
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to standardize products');
      }
    });
  };`;
content = content.replace(oldHandle, newHandle);

fs.writeFileSync(file, content);
