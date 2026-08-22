const fs = require('fs');

// We have duplicated declarations. Let's just fix it by getting the file before any patch or cleaning it up via regex.
let c = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

c = c.replace(/const \[newStationName, setNewStationName\] = useState\(''\);\n\s*const \[newStationName, setNewStationName\] = useState\(''\);/, "const [newStationName, setNewStationName] = useState('');");

c = c.replace(/const handleAddStation = \(\) => \{\n\s*if \(newStationName\.trim\(\)\) \{\n\s*const newStation: StationData = \{ id: Math\.random\(\)\.toString\(36\)\.substr\(2, 9\), name: newStationName\.trim\(\) \};\n\s*setStations\(prev => \[\.\.\.prev, newStation\]\);\n\s*setDoc\(doc\(db, 'fuelsuite_stations', newStation\.id\), newStation\);\n\s*setNewStationName\(''\);\n\s*\}\n\s*\};\n\s*const handleDeleteStation = \(id: string\) => \{\n\s*confirmDelete\('Are you sure you want to delete this station\?', \(\) => \{\n\s*setStations\(prev => prev\.filter\(s => s\.id !== id\)\);\n\s*\}\);\n\s*\};\n\n\s*/, "");

c = c.replace(/<\/Card>(\s|\n|<Card className="mt-8 border-theme-border glass-panel">[\s\S]*?<\/Card>)*\{confirmDialog\}/g, "</Card>\n      {confirmDialog}");

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', c);
