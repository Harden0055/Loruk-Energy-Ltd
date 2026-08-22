const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/fuelsuite/**/*.tsx');
files.push('src/pages/Fleet.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (file.includes('context.tsx')) {
    content = content.replace(/export const STATIONS = \['Loruk Energy Ltd', 'Ndalu Station', 'Junction Station'\] as const;\n/, '');
    content = content.replace(/export type Station = typeof STATIONS\[number\] \| 'Combined Total';\n/, "export type Station = string;\nexport interface StationData { id: string; name: string; }\n");
    content = content.replace(/customers: Customer\[\];\n  setCustomers: React.Dispatch<React.SetStateAction<Customer\[\]>>;\n\}/, "customers: Customer[];\n  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;\n  stations: StationData[];\n  setStations: React.Dispatch<React.SetStateAction<StationData[]>>;\n}");
    
    // add useFirebaseCollection for stations
    content = content.replace(/const \[customers, setCustomers\] = useFirebaseCollection<Customer>\('fuelsuite_customers', \[\]\);/, "const [customers, setCustomers] = useFirebaseCollection<Customer>('fuelsuite_customers', []);\n  const [stations, setStations] = useFirebaseCollection<StationData>('fuelsuite_stations', [{id: '1', name: 'Loruk Ndalu Filling Station'}, {id: '2', name: 'Loruk Junction Filling Station'}]);");
    
    // add stations to FuelContext.Provider value
    content = content.replace(/customers, setCustomers/, "customers, setCustomers, stations, setStations");
    changed = true;
  }

  fs.writeFileSync(file, content);
});
