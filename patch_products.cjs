const fs = require('fs');
const file = './src/lib/operationsDb.ts';
let content = fs.readFileSync(file, 'utf8');

const newFunc = `
export async function replaceProductsWithStandard(existingProducts: ProductDef[]) {
  // Delete all existing
  for (const p of existingProducts) {
    if (p.id) {
      await deleteDoc(doc(db, 'products', p.id));
      await deleteLocalDoc('products', p.id);
    }
  }

  const standardProducts = [
    { id: 'white_oil_super_petrol', name: 'Super Petrol', category: 'White Oils', sortOrder: 1 },
    { id: 'white_oil_diesel_fuel', name: 'Diesel Fuel', category: 'White Oils', sortOrder: 2 },
    { id: 'white_oil_super_premium', name: 'Super (Premium)', category: 'White Oils', sortOrder: 3 },
    { id: 'lpg_13kg', name: '13KG LPG', category: 'LPG', sortOrder: 4 },
    { id: 'lpg_6kg', name: '6KG LPG', category: 'LPG', sortOrder: 5 },
    { id: 'empty_13kg', name: '13KG LPG - Empty', category: 'Empties', sortOrder: 6 },
    { id: 'empty_6kg', name: '6KG LPG - Empty', category: 'Empties', sortOrder: 7 },
    { id: 'acc_burner', name: 'Burner', category: 'Burners and Grills', sortOrder: 8 },
    { id: 'acc_grill', name: 'Grill', category: 'Burners and Grills', sortOrder: 9 },
    { id: 'lube_engine_oil', name: 'Engine oil', category: 'Lubricants', sortOrder: 10 },
    { id: 'lube_brake_fluid', name: 'Brake fluid', category: 'Lubricants', sortOrder: 11 },
  ];

  for (const sp of standardProducts) {
    const payload = { 
      name: sp.name, 
      category: sp.category,
      sortOrder: sp.sortOrder,
      createdAt: Date.now(),
      createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'System'
    };
    await setDoc(doc(db, 'products', sp.id), payload);
    await addLocalDoc('products', { ...payload, id: sp.id });
  }
}
`;

content += '\n' + newFunc;
fs.writeFileSync(file, content);
