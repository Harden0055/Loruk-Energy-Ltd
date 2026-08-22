const fs = require('fs');

const file = './src/pages/fuelsuite/views/ProductsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const standardizeCode = `
  const standardizeProducts = () => {
    confirmDelete('This will replace all current products with the standard list and sorted order. Proceed?', () => {
      const standardProducts = [
        { id: 'white_oil_super_petrol', name: 'Super Petrol' },
        { id: 'white_oil_diesel_fuel', name: 'Diesel Fuel' },
        { id: 'white_oil_super_premium', name: 'Super (Premium)' },
        { id: 'lpg_13kg', name: '13KG LPG' },
        { id: 'lpg_6kg', name: '6KG LPG' },
        { id: 'empty_13kg', name: '13KG LPG - Empty' },
        { id: 'empty_6kg', name: '6KG LPG - Empty' },
        { id: 'acc_burner', name: 'Burner' },
        { id: 'acc_grill', name: 'Grill' },
        { id: 'lube_engine_oil', name: 'Engine oil' },
        { id: 'lube_brake_fluid', name: 'Brake fluid' },
      ];
      setProducts(standardProducts);
    });
  };
`;

content = content.replace('  const removeDuplicates =', standardizeCode + '\n  const removeDuplicates =');

content = content.replace(
    '<Button onClick={removeDuplicates} variant="secondary" className="flex items-center gap-2">\n            Remove Duplicates\n          </Button>',
    '<Button onClick={standardizeProducts} variant="secondary" className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400">\n            Standardize Products\n          </Button>'
);

fs.writeFileSync(file, content);
