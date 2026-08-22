const fs = require('fs');

const file = './src/lib/operationsDb.ts';
let content = fs.readFileSync(file, 'utf8');

const standardizeCode = `
export async function replaceProductsWithStandard(existingProducts: ProductDef[]) {
  // Delete all existing
  for (const p of existingProducts) {
    if (p.id) {
      await deleteDoc(doc(db, 'products', p.id));
      await deleteLocalDoc('products', p.id);
    }
  }

  const standardProducts = [
    { id: 'super_premium', name: 'Super (Premium)', category: 'White Oils', sortOrder: 1 },
    { id: 'diesel', name: 'Diesel', category: 'White Oils', sortOrder: 2 },
    { id: 'engine_oil', name: 'Engine Oil', category: 'Lubricants', sortOrder: 3 },
    { id: 'brake_fluid', name: 'Brake Fluid', category: 'Lubricants', sortOrder: 4 },
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

  // Update past records to point to these strict names
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
        if (mappings[val]) {
          await setDoc(doc(db, col, d.id), { [field]: mappings[val] }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn('Error during product linking', err);
  }
}
`;

content = content.replace(/export async function replaceProductsWithStandard\([\s\S]*?\}\n\}/, standardizeCode.trim());

fs.writeFileSync(file, content);
