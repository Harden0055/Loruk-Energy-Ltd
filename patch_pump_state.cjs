const fs = require('fs');
const file = 'src/pages/fuelsuite/views/DailyDataEntryView.tsx';
let content = fs.readFileSync(file, 'utf8');

// The initial state function
content = content.replace(
  /return products\.filter\(p => !p\.name\.toLowerCase\(\)\.includes\('oil'\)\)\.map\(p => \(\{\n\s*product: p\.name,\n\s*startReading: 0,\n\s*stopReading: 0,\n\s*ratePerLitre: parseFloat\(localStorage\.getItem\(\`rate_\$\{initialStation\}_\$\{p\.name\}\`\) \|\| '0'\),\n\s*manualCash: 0\n\s*\}\)\);/,
  `return products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel')).map(p => ({
      product: p.name,
      salesStart: 0,
      salesStop: 0,
      litresStart: 0,
      litresStop: 0,
      ratePerLitre: parseFloat(localStorage.getItem(\`rate_\$\{initialStation\}_\$\{p.name\}\`) || '0'),
      manualCash: 0
    }));`
);

// The useEffect that sets pumps
content = content.replace(
  /setPumps\(products\.filter\(p => !p\.name\.toLowerCase\(\)\.includes\('oil'\)\)\.map\(p => \{\n\s*const lastReading = previousReadings\.find\(pr => pr\.product === p\.name\);\n\s*const storedRate = parseFloat\(localStorage\.getItem\(\`rate_\$\{station\}_\$\{p\.name\}\`\) \|\| '0'\);\n\s*return \{\n\s*product: p\.name,\n\s*startReading: lastReading \? lastReading\.stopReading : 0,\n\s*stopReading: 0,\n\s*ratePerLitre: storedRate > 0 \? storedRate : \(lastReading \? lastReading\.ratePerLitre : 0\),\n\s*manualCash: 0\n\s*\};\n\s*\}\)\);/,
  `setPumps(products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel')).map(p => {
      const lastReading = previousReadings.find(pr => pr.product === p.name);
      const storedRate = parseFloat(localStorage.getItem(\`rate_\$\{station\}_\$\{p.name\}\`) || '0');
      return {
        product: p.name,
        salesStart: lastReading ? lastReading.salesStop : 0,
        salesStop: 0,
        litresStart: lastReading ? lastReading.litresStop : 0,
        litresStop: 0,
        ratePerLitre: storedRate > 0 ? storedRate : (lastReading ? lastReading.ratePerLitre : 0),
        manualCash: 0
      };
    }));`
);

// Save logic
content = content.replace(
  /const newPumpReadings: PumpReading\[\] = pumps\.filter\(p => p\.stopReading! > 0 \|\| p\.startReading! > 0\)\.map\(p => \(\{\n\s*id: generateId\(\),\n\s*date,\n\s*station,\n\s*product: p\.product!,\n\s*startReading: p\.startReading \|\| 0,\n\s*stopReading: p\.stopReading \|\| 0,\n\s*ratePerLitre: p\.ratePerLitre \|\| 0,\n\s*manualCash: p\.manualCash \|\| 0\n\s*\}\)\);/,
  `const newPumpReadings: PumpReading[] = pumps.filter(p => p.litresStop! > 0 || p.litresStart! > 0 || p.salesStop! > 0).map(p => ({
      id: generateId(),
      date,
      station,
      product: p.product!,
      salesStart: p.salesStart || 0,
      salesStop: p.salesStop || 0,
      litresStart: p.litresStart || 0,
      litresStop: p.litresStop || 0,
      ratePerLitre: p.ratePerLitre || 0,
      manualCash: p.manualCash || 0
    }));`
);

fs.writeFileSync(file, content);
