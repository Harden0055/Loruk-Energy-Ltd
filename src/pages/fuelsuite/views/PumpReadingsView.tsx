import React, { useState, useMemo } from 'react';
import { useFuel, PumpReading , STATIONS, Station } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function PumpReadingsView() {
  const { activeStation, setActiveStation, pumpReadings, setPumpReadings, products } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStation, setFilterStation] = useState<Station>(activeStation);

  const [form, setForm] = useState<Partial<PumpReading>>({
    date: new Date().toISOString().split('T')[0],
    station: STATIONS[0],
    product: products[0]?.name || 'Super Petrol',
    startReading: 0,
    stopReading: 0,
    ratePerLitre: 0,
    manualCash: 0,
  });

  const filteredReadings = useMemo(() => {
    return pumpReadings.filter(r => 
      (filterStation === 'Combined Total' || r.station === filterStation) &&
      (!filterDate || r.date === filterDate)
    );
  }, [pumpReadings, filterStation, filterDate]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: STATIONS[0],
      product: products[0]?.name || 'Super Petrol',
      startReading: 0,
      stopReading: 0,
      ratePerLitre: 0,
      manualCash: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (reading: PumpReading) => {
    setForm({ ...reading });
    setEditingId(reading.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this reading?')) {
      setPumpReadings(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPumpReadings(prev => prev.map(r => r.id === editingId ? { ...r, ...form as PumpReading } : r));
    } else {
      const newReading: PumpReading = {
        id: Math.random().toString(36).substr(2, 9),
        ...form as Omit<PumpReading, 'id'>
      };
      setPumpReadings(prev => [...prev, newReading]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pump Readings</h1>
          <p className="text-slate-400 mt-1">Log and track daily fuel dispenser readings.</p>
        </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Reading</>}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4 bg-[#1a1d36]/50 p-4 rounded-lg border border-[#2d325a]">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Station</label>
            <Select value={filterStation} onChange={e => setFilterStation(e.target.value as Station)} className="h-9">
              {['Combined Total', ...STATIONS].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Pump Reading' : 'New Pump Reading'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Product</label>
                <Select value={form.product} onChange={e => setForm({...form, product: e.target.value})}>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rate per Litre</label>
                <Input type="number" step="0.01" value={form.ratePerLitre} onChange={e => setForm({...form, ratePerLitre: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Reading</label>
                <Input type="number" step="0.01" value={form.startReading} onChange={e => setForm({...form, startReading: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stop Reading</label>
                <Input type="number" step="0.01" value={form.stopReading} onChange={e => setForm({...form, stopReading: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Manual Cash Collected</label>
                <Input type="number" step="0.01" value={form.manualCash} onChange={e => setForm({...form, manualCash: parseFloat(e.target.value)})} required />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">{editingId ? 'Update Reading' : 'Save Reading'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Station</Th>
              <Th>Product</Th>
              <Th>Volume (L)</Th>
              <Th>Expected (KES)</Th>
              <Th>Collected (KES)</Th>
              <Th>Variance</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredReadings.map(r => {
              const volume = r.stopReading - r.startReading;
              const expected = volume * r.ratePerLitre;
              const variance = r.manualCash - expected;
              return (
                <tr key={r.id} className="hover:bg-[#0f1123] transition-colors">
                  <Td>{r.date}</Td>
                  <Td>{r.station}</Td>
                  <Td><span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{r.product}</span></Td>
                  <Td>{volume.toFixed(2)}</Td>
                  <Td>{expected.toLocaleString()}</Td>
                  <Td>{r.manualCash.toLocaleString()}</Td>
                  <Td>
                    <span className={`font-semibold ${variance === 0 ? 'text-slate-400' : variance > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(r)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {filteredReadings.length === 0 && (
              <tr>
                <Td colSpan={8} className="text-center py-8 text-slate-500">No readings found for {activeStation}.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
