const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/fuelsuite/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (!file.includes('context.tsx') && content.includes('STATIONS')) {
    // Remove STATIONS from import { ... STATIONS } from '../context'
    content = content.replace(/,\s*STATIONS\b/g, '');
    content = content.replace(/\bSTATIONS\s*,\s*/g, '');
    content = content.replace(/\{\s*STATIONS\s*\}/g, '{}');
    
    // Add stations to useFuel if not present
    if (content.includes('useFuel();')) {
      content = content.replace(/const \{([^}]+)\} = useFuel\(\);/, (match, group1) => {
        if (!group1.includes('stations')) {
          return `const {${group1}, stations} = useFuel();`;
        }
        return match;
      });
    }

    // Now replace STATIONS usages:
    // STATIONS[0] -> (stations[0]?.name || 'Combined Total')
    content = content.replace(/STATIONS\[0\]/g, "(stations[0]?.name || 'Station 1')");
    
    // STATIONS.map -> stations.map(s => s.name)
    content = content.replace(/STATIONS\.map\(\s*([a-zA-Z0-9_]+)\s*=>/g, "stations.map($1 => { const name = $1.name; return name; }).map($1 =>");
    // Wait, simpler:
    content = content.replace(/STATIONS\.map/g, "stations.map(s => s.name).map");
    // If it's ['Combined Total', ...STATIONS].map
    content = content.replace(/\[\s*'Combined Total'\s*,\s*\.\.\.STATIONS\s*\]/g, "['Combined Total', ...stations.map(s=>s.name)]");

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Patched', file);
    }
  }
});
