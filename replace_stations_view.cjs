const fs = require('fs');

const code = `import React, { useState } from 'react';
import { useFuel } from '../context';
import { db } from '../../../lib/firebase';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Building2, Plus, Sparkles, Check, X, Pencil, Trash2, ExternalLink, MapPin } from 'lucide-react';
import { Button, Input, Table, Th, Td } from '../components';

export default function StationsView({ onNavigateToDashboard }: { onNavigateToDashboard?: (name: string) => void }) {
  const { stations, setStations } = useFuel();
  const [newStationName, setNewStationName] = useState('');
  
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: '', code: '', location: '', tradingAs: '', poBox: '', status: '' });

  const confirmDelete = (msg: string, onConfirm: () => void) => {
    if (window.confirm(msg)) {
      onConfirm();
    }
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName.trim()) return;
    
    const newStation = {
      id: Date.now().toString(),
      name: newStationName.trim(),
      code: \`ST-\${stations.length + 1}\`.padStart(6, '0'),
      location: '',
      tradingAs: '',
      poBox: '',
      status: 'active'
    };
    
    setStations(prev => [...prev, newStation]);
    setNewStationName('');
    try {
      await setDoc(doc(db, 'fuelsuite_stations', newStation.id), newStation);
    } catch (err) {
      console.error('Failed to add station:', err);
    }
  };

  const handleSaveEditStation = async (id: string) => {
    if (!editingData.name.trim()) return;
    
    setStations(prev => prev.map(s => s.id === id ? { ...s, ...editingData } : s));
    setEditingStationId(null);
    try {
      await setDoc(doc(db, 'fuelsuite_stations', id), { id, ...editingData }, { merge: true });
    } catch (err) {
      console.error('Failed to update station:', err);
    }
  };

  const handleDeleteStation = async (id: string) => {
    confirmDelete('Are you sure you want to delete this station?', async () => {
      setStations(prev => prev.filter(s => s.id !== id));
      try {
        await deleteDoc(doc(db, 'fuelsuite_stations', id));
      } catch (err) {
        console.error('Failed to delete station:', err);
      }
    });
  };

  const activeStations = stations.filter(s => s.status === 'active' || !s.status).length;
  const inactiveStations = stations.length - activeStations;

  return (
    <div className="space-y-6 animate-fade-in p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Stations Configuration</h1>
          <p className="text-sm text-theme-text-muted mt-1">Manage your filling stations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-theme-border/50 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stations</div>
            <div className="text-xl font-bold text-white">{stations.length}</div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-theme-border/50 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active</div>
            <div className="text-xl font-bold text-white">{activeStations}</div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-theme-border/50 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-center text-rose-400">
            <X className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inactive</div>
            <div className="text-xl font-bold text-white">{inactiveStations}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40">
        <div className="flex-1 w-full max-w-sm">
           {/* Search omitted for brevity */}
        </div>
        <form onSubmit={handleAddStation} className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="New station name..."
            value={newStationName}
            onChange={e => setNewStationName(e.target.value)}
            className="w-full sm:w-64 bg-slate-950 border-theme-border"
          />
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Station
          </Button>
        </form>
      </div>

      <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-xs bg-slate-900/40">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr className="bg-slate-950/50">
                <Th>STATION NAME & CODE</Th>
                <Th>LOCATION</Th>
                <Th>TRADING AS (T/A)</Th>
                <Th>P.O. BOX ADDRESS</Th>
                <Th>STATUS</Th>
                <Th className="text-right">ACTIONS</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/30">
              {stations.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <Td>
                    {editingStationId === s.id ? (
                      <div className="space-y-2">
                        <Input value={editingData.name} onChange={e => setEditingData({...editingData, name: e.target.value})} placeholder="Name" className="h-8 text-xs" />
                        <Input value={editingData.code} onChange={e => setEditingData({...editingData, code: e.target.value})} placeholder="Code" className="h-8 text-xs" />
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-slate-200">{s.name}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{s.code || '-'}</div>
                      </div>
                    )}
                  </Td>
                  <Td>
                    {editingStationId === s.id ? (
                      <Input value={editingData.location} onChange={e => setEditingData({...editingData, location: e.target.value})} placeholder="Location" className="h-8 text-xs" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {s.location || '-'}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {editingStationId === s.id ? (
                      <Input value={editingData.tradingAs} onChange={e => setEditingData({...editingData, tradingAs: e.target.value})} placeholder="Trading As" className="h-8 text-xs" />
                    ) : (
                      <span className="text-xs text-slate-300">{s.tradingAs || '-'}</span>
                    )}
                  </Td>
                  <Td>
                    {editingStationId === s.id ? (
                      <Input value={editingData.poBox} onChange={e => setEditingData({...editingData, poBox: e.target.value})} placeholder="P.O. Box" className="h-8 text-xs" />
                    ) : (
                      <span className="text-xs text-slate-300 font-mono">{s.poBox || '-'}</span>
                    )}
                  </Td>
                  <Td>
                    {editingStationId === s.id ? (
                      <select 
                        value={editingData.status} 
                        onChange={e => setEditingData({...editingData, status: e.target.value})}
                        className="bg-slate-900 border border-theme-border rounded-lg text-xs px-2 py-1.5 text-slate-200 focus:outline-none"
                      >
                        <option value="active">ACTIVE</option>
                        <option value="inactive">INACTIVE</option>
                      </select>
                    ) : (
                      <span className={\`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border \${(!s.status || s.status === 'active') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}\`}>
                        {(!s.status || s.status === 'active') ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {editingStationId === s.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleSaveEditStation(s.id)} className="p-1.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStationId(null)} className="p-1.5 text-slate-400 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {onNavigateToDashboard && (
                          <button onClick={() => onNavigateToDashboard(s.name)} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold transition-colors">
                            <BarChart3 className="w-3 h-3" /> Dashboard
                          </button>
                        )}
                        <button onClick={() => {
                          setEditingStationId(s.id);
                          setEditingData({ name: s.name, code: s.code || '', location: s.location || '', tradingAs: s.tradingAs || '', poBox: s.poBox || '', status: s.status || 'active' });
                        }} className="p-1.5 text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteStation(s.id)} className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <Td colSpan={6} className="text-center py-12 text-slate-500">
                    No stations configured. Add a station to get started.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/fuelsuite/views/StationsView.tsx', code);
