const fs = require('fs');
const file = './src/lib/operationsDb.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
  const standardProducts = [
    { id: 'super_premium', name: 'Super (Premium)', category: 'White Oils', sortOrder: 1 },
    { id: 'diesel', name: 'Diesel', category: 'White Oils', sortOrder: 2 },
    { id: 'engine_oil', name: 'Engine Oil', category: 'Lubricants', sortOrder: 3 },
    { id: 'brake_fluid', name: 'Brake Fluid', category: 'Lubricants', sortOrder: 4 },
    { id: 'lpg_13kg', name: '13KG LPG', category: 'LPG', sortOrder: 5 },
    { id: 'lpg_6kg', name: '6KG LPG', category: 'LPG', sortOrder: 6 },
    { id: 'empty_13kg', name: '13KG LPG - Empty', category: 'Empties', sortOrder: 7 },
    { id: 'empty_6kg', name: '6KG LPG - Empty', category: 'Empties', sortOrder: 8 },
    { id: 'acc_burner', name: 'Burner', category: 'Burners and Grills', sortOrder: 9 },
    { id: 'acc_grill', name: 'Grill', category: 'Burners and Grills', sortOrder: 10 },
  ];
`;

content = content.replace(/const standardProducts = \[[\s\S]*?\];/, replacement.trim());
fs.writeFileSync(file, content);
