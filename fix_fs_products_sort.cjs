const fs = require('fs');

const file = './src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const standardizeCode = `
  const standardizeProducts = () => {
    confirmDelete('This will replace all current products with the standard list and sorted order. Proceed?', () => {
      const standardProducts = [
        { id: 'white_oil_super_petrol', name: 'Super Petrol', sortOrder: 1 },
        { id: 'white_oil_diesel_fuel', name: 'Diesel Fuel', sortOrder: 2 },
        { id: 'white_oil_super_premium', name: 'Super (Premium)', sortOrder: 3 },
        { id: 'lpg_13kg', name: '13KG LPG', sortOrder: 4 },
        { id: 'lpg_6kg', name: '6KG LPG', sortOrder: 5 },
        { id: 'empty_13kg', name: '13KG LPG - Empty', sortOrder: 6 },
        { id: 'empty_6kg', name: '6KG LPG - Empty', sortOrder: 7 },
        { id: 'acc_burner', name: 'Burner', sortOrder: 8 },
        { id: 'acc_grill', name: 'Grill', sortOrder: 9 },
        { id: 'lube_engine_oil', name: 'Engine oil', sortOrder: 10 },
        { id: 'lube_brake_fluid', name: 'Brake fluid', sortOrder: 11 },
      ];
      setProducts(standardProducts);
    });
  };
`;

// Replace the previous standardizeProducts block
content = content.replace(/const standardizeProducts = \(\) => \{[\s\S]*?setProducts\(standardProducts\);\n    \}\);\n  \};/, standardizeCode.trim());

// We also need to sort them before mapping in the render.
// Find `products.map` and replace with `[...products].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)).map`
content = content.replace(/products\.map\(p => \(/g, '[...products].sort((a: any, b: any) => (a.sortOrder || 99) - (b.sortOrder || 99)).map(p => (');

fs.writeFileSync(file, content);
