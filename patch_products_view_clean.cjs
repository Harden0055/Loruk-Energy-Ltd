const fs = require('fs');
let c = fs.readFileSync('src/pages/fuelsuite/views/ProductsView.tsx', 'utf8');

c = c.replace(/const \{ products, setProducts \} = useFuel\(\);/, "const { products, setProducts, stations, setStations } = useFuel();");

c = c.replace(/import \{ useFuel, Product \} from '\.\.\/context';/, "import { useFuel, Product, StationData } from '../context';\nimport { doc, setDoc } from 'firebase/firestore';\nimport { db } from '../../../lib/firebase';");

c = c.replace(/const \[isBulkFormOpen, setIsBulkFormOpen\] = useState\(false\);/, "const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);\n  const [newStationName, setNewStationName] = useState('');");

c = c.replace(/const resetForm = \(\) => \{/, `const handleAddStation = () => {
    if (newStationName.trim()) {
      const newStation: StationData = { id: Math.random().toString(36).substr(2, 9), name: newStationName.trim() };
      setStations(prev => [...prev, newStation]);
      setDoc(doc(db, 'fuelsuite_stations', newStation.id), newStation);
      setNewStationName('');
    }
  };

  const handleDeleteStation = (id: string) => {
    confirmDelete('Are you sure you want to delete this station?', () => {
      setStations(prev => prev.filter(s => s.id !== id));
    });
  };

  const resetForm = () => {`);

const newCard = `
      <Card className="mt-8 border-theme-border glass-panel">
        <CardHeader>
          <CardTitle className="text-lg text-cyan-400">Stations Configuration</CardTitle>
          <p className="text-sm text-theme-text-muted">Manage stations across your application.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input 
              value={newStationName} 
              onChange={e => setNewStationName(e.target.value)} 
              placeholder="Enter new station name (e.g., Loruk Eldoret Station)" 
              className="max-w-md"
            />
            <Button onClick={handleAddStation}><Plus className="w-4 h-4 mr-2" /> Add Station</Button>
          </div>
          <Table>
            <thead>
              <tr className="modern-tr">
                <Th>STATION NAME</Th>
                <Th className="w-24 text-right">ACTIONS</Th>
              </tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.id} className="hover:theme-bg-gradient transition-colors">
                  <Td className="font-semibold text-theme-text">{s.name}</Td>
                  <Td className="text-right">
                    <button onClick={() => handleDeleteStation(s.id)} className="text-theme-text-muted hover:text-red-400 transition-colors p-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <Td colSpan={2} className="text-center text-theme-text-muted py-8">
                    No stations configured. Add one above.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
`;

c = c.replace(/\{confirmDialog\}\n\s*<\/div>/, newCard + "\n      {confirmDialog}\n      </div>");

c = c.replace(/Products Configuration/g, "Settings Configuration");

fs.writeFileSync('src/pages/fuelsuite/views/ProductsView.tsx', c);
