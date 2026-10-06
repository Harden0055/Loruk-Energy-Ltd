const fs = require('fs');
let code = fs.readFileSync('src/pages/StationDashboard.tsx', 'utf8');

const start = code.indexOf('  const fuelMetrics = useMemo(() => {');
const end = code.indexOf('  }, [stationPumpReadings]);') + '  }, [stationPumpReadings]);'.length;

const newBlock = `  const fuelMetrics = useMemo(() => {
    let superLitres = 0;
    let superRevenue = 0;
    let dieselLitres = 0;
    let dieselRevenue = 0;
    let otherLitres = 0;
    let otherRevenue = 0;

    stationDeliveries.forEach(d => {
      const soldLitres = d.litres || 0;
      const rev = d.totalAmount || 0;
      const prod = (d.productType || '').toLowerCase();

      if (prod.includes('super') || prod.includes('pms') || prod.includes('petrol')) {
        superLitres += soldLitres;
        superRevenue += rev;
      } else if (prod.includes('diesel') || prod.includes('ago')) {
        dieselLitres += soldLitres;
        dieselRevenue += rev;
      } else {
        otherLitres += soldLitres;
        otherRevenue += rev;
      }
    });

    const totalLitres = superLitres + dieselLitres + otherLitres;
    const totalFuelRev = superRevenue + dieselRevenue + otherRevenue;

    return {
      superLitres,
      superRevenue,
      dieselLitres,
      dieselRevenue,
      otherLitres,
      otherRevenue,
      totalLitres,
      totalFuelRev
    };
  }, [stationDeliveries]);`;

code = code.substring(0, start) + newBlock + code.substring(end);
fs.writeFileSync('src/pages/StationDashboard.tsx', code);
