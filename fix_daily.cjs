const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/DailyDataEntryView.tsx', 'utf8');

const importReplacement = `import React, { useState, useRef, useEffect } from 'react';`;
c = c.replace(/import React, \{ useState \} from 'react';/, importReplacement);

const newEffect = `  const contextRef = useRef({ date, station });

  useEffect(() => {
    const isNewContext = contextRef.current.date !== date || contextRef.current.station !== station;
    if (isNewContext) {
      contextRef.current = { date, station };
    }

    const previousReadings = pumpReadings
      .filter(pr => pr.station === station && pr.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));
      
    // Only reset if all pumps are zero (empty) or if the date/station changed
    const isAllZeros = pumps.every(p => !p.salesStop && !p.litresStop && !p.salesStart && !p.litresStart);
    if (!isNewContext && !isAllZeros) return;

    setPumps(products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel')).map(p => {
      const lastReading = previousReadings.find(pr => pr.product === p.name);
      const storedRate = parseFloat(localStorage.getItem(\`rate_\${station}_\${p.name}\`) || '0');
      return {
        product: p.name,
        salesStart: lastReading ? lastReading.salesStop : 0,
        salesStop: 0,
        litresStart: lastReading ? lastReading.litresStop : 0,
        litresStop: 0,
        ratePerLitre: storedRate > 0 ? storedRate : (lastReading ? lastReading.ratePerLitre : 0),
        manualCash: 0
      };
    }));
  }, [date, station, products, pumpReadings]);`;

c = c.replace(/React\.useEffect\(\(\) => \{[\s\S]*?\}, \[date, station, products, pumpReadings\]\);/m, newEffect);

fs.writeFileSync('src/pages/fuelsuite/views/DailyDataEntryView.tsx', c);
