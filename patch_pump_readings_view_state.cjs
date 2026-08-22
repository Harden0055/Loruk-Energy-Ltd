const fs = require('fs');
const file = 'src/pages/fuelsuite/views/PumpReadingsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[form, setForm\] = useState<Partial<PumpReading>>\(\{\n\s*date: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\],\n\s*station: STATIONS\[0\],\n\s*product: products\[0\]\?\.name \|\| 'Super Petrol',\n\s*startReading: 0,\n\s*stopReading: 0,\n\s*ratePerLitre: 0,\n\s*manualCash: 0,\n\s*\}\);/,
  `const [form, setForm] = useState<Partial<PumpReading>>({
    date: new Date().toISOString().split('T')[0],
    station: STATIONS[0],
    product: products[0]?.name || 'Super Petrol',
    salesStart: 0,
    salesStop: 0,
    litresStart: 0,
    litresStop: 0,
    ratePerLitre: 0,
    manualCash: 0,
  });`
);

content = content.replace(
  /const resetForm = \(\) => \{\n\s*setForm\(\{\n\s*date: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\],\n\s*station: STATIONS\[0\],\n\s*product: products\[0\]\?\.name \|\| 'Super Petrol',\n\s*startReading: 0,\n\s*stopReading: 0,\n\s*ratePerLitre: 0,\n\s*manualCash: 0,\n\s*\}\);/,
  `const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: STATIONS[0],
      product: products[0]?.name || 'Super Petrol',
      salesStart: 0,
      salesStop: 0,
      litresStart: 0,
      litresStop: 0,
      ratePerLitre: 0,
      manualCash: 0,
    });`
);

content = content.replace(
  /const totalVolume = filteredReadings\.reduce\(\(sum, r\) => sum \+ \(r\.stopReading - r\.startReading\), 0\);\n\s*const expectedSales = filteredReadings\.reduce\(\(sum, r\) => sum \+ \(r\.stopReading - r\.startReading\) \* r\.ratePerLitre, 0\);/g,
  `const totalVolume = filteredReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
    const expectedSales = filteredReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart) * r.ratePerLitre, 0);`
);

fs.writeFileSync(file, content);
