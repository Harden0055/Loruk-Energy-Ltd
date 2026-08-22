const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/DailyDataEntryView.tsx', 'utf8');

c = c.replace(/const previousReadings = pumpReadings[\s\S]*?\.sort[\s\S]*?\);/, 
`const previousReadings = pumpReadings
      .filter(pr => pr.station === station && pr.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));`);

c = c.replace(/setPumps\(products\.filter\(p => p\.name\.toLowerCase\(\)\.includes\('super'\) \|\| p\.name\.toLowerCase\(\)\.includes\('diesel'\)\)\.map\(p => \{/,
`// Only reset if all pumps are zero (empty) or if it's the initial load.
    const isAllZeros = pumps.every(p => !p.salesStop && !p.litresStop && !p.salesStart && !p.litresStart);
    if (!isAllZeros) return;

    setPumps(products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel')).map(p => {`);

c = c.replace(/\}, \[date, station, products\]\); \/\/ Intentionally omitting pumpReadings to prevent form reset when another entry is saved/, 
`}, [date, station, products, pumpReadings]);`);

fs.writeFileSync('src/pages/fuelsuite/views/DailyDataEntryView.tsx', c);
