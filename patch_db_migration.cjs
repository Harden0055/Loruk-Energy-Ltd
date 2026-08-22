const fs = require('fs');
const file = './src/lib/operationsDb.ts';
let content = fs.readFileSync(file, 'utf8');

const newMigration = `
  // Update past records to point to these strict names AND link productId
  const nameToId = {
    'Super (Premium)': 'super_premium',
    'Super Petrol': 'super_premium',
    'Diesel': 'diesel',
    'Diesel Fuel': 'diesel',
    'Engine Oil': 'engine_oil',
    'Engine oil': 'engine_oil',
    'Brake Fluid': 'brake_fluid',
    'Brake fluid': 'brake_fluid',
    '13KG LPG': 'lpg_13kg',
    '6KG LPG': 'lpg_6kg',
    '13KG LPG - Empty': 'empty_13kg',
    '6KG LPG - Empty': 'empty_6kg',
    'Burner': 'acc_burner',
    'Grill': 'acc_grill'
  };

  const mappings = {
    'Super Petrol': 'Super (Premium)',
    'Diesel Fuel': 'Diesel',
    'Engine oil': 'Engine Oil',
    'Brake fluid': 'Brake Fluid'
  };

  try {
    const collectionsToUpdate = [
      { col: 'deliveries', field: 'productType' },
      { col: 'fuel_rates', field: 'product' },
      { col: 'pump_readings', field: 'product' }
    ];

    for (const { col, field } of collectionsToUpdate) {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) {
        const val = d.data()[field];
        const newName = mappings[val] || val;
        const productId = nameToId[newName] || nameToId[val];
        
        const updates = {};
        if (mappings[val]) {
          updates[field] = mappings[val];
        }
        if (productId) {
          updates['productId'] = productId;
        }
        
        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, col, d.id), updates, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn('Error during product linking', err);
  }
`;

content = content.replace(
    /  \/\/ Update past records to point to these strict names[\s\S]*?console\.warn\('Error during product linking', err\);\n  \}/,
    newMigration.trim()
);

fs.writeFileSync(file, content);
