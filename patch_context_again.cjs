const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/context.tsx', 'utf8');

c = c.replace(/value=\{\{([^}]+)\}\}/, (match, group1) => {
  if (!group1.includes('stations')) {
    return 'value={{' + group1 + ', stations, setStations}}';
  }
  return match;
});

fs.writeFileSync('src/pages/fuelsuite/context.tsx', c);
