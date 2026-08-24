import React, { useState, useMemo } from 'react';
import { useFuel, PumpReading , Station } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td , MetricCard, ProductIconBadge } from '../components';
import { Plus, Pencil, Trash2, X, Droplet, TrendingUp, Banknote, Fuel } from 'lucide-react';
import { useConfirm } from '../useConfirm';

export default function PumpReadingsView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { activeStation, setActiveStation, pumpReadings, setPumpReadings, products , stations} = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStation, setFilterStation] = useState<Station>(activeStation);

  React.useEffect(() => {
    setFilterStation(activeStation);
  }, [activeStation]);

  const defaultStation = activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation;

  const [form, setForm] = useState<Partial<PumpReading>>({
    date: new Date().toISOString().split('T')[0],
    station: defaultStation,
    product: products[0]?.name || 'Super ( Premium )',
    salesStart: 0,
    salesStop: 0,
    litresStart: 0,
    litresStop: 0,
    ratePerLitre: 0,
  });

  const filteredReadings = useMemo(() => {
    return pumpReadings.filter(r => 
      (filterStation === 'Combined Total' || r.station === filterStation) &&
      (!filterDate || r.date === filterDate)
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [pumpReadings, filterStation, filterDate]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: (stations[0]?.name || 'Station 1'),
      product: products[0]?.name || 'Super Petrol',
      salesStart: 0,
      salesStop: 0,
      litresStart: 0,
      litresStop: 0,
      ratePerLitre: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (reading: PumpReading) => {
    setForm({ ...reading });
    setEditingId(reading.id);
    setIsFormOpen(true);
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

  const metrics = useMemo(() => {
    const totalVolume = filteredReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
    const pmsVolume = filteredReadings.filter(r => r.product.toLowerCase().includes('super') || r.product.toLowerCase().includes('pms')).reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
    const agoVolume = filteredReadings.filter(r => r.product.toLowerCase().includes('diesel') || r.product.toLowerCase().includes('ago')).reduce((sum, r) => sum + (r.litresStop - r.litresStart), 0);
    const totalSalesAmount = filteredReadings.reduce((sum, r) => sum + ((r.salesStop || 0) - (r.salesStart || 0)), 0);
    const calculatedSales = filteredReadings.reduce((sum, r) => sum + (r.litresStop - r.litresStart) * r.ratePerLitre, 0);
    const netVariance = totalSalesAmount - calculatedSales;
    return { totalVolume, pmsVolume, agoVolume, totalSalesAmount, calculatedSales, netVariance };
  }, [filteredReadings]);

  return (<div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              White Oils
            </h1>
            <p className="text-theme-text-muted mt-0.5 text-xs">Log and track daily dispenser meter readings & fuel reconciliation.</p>
          </div>
        </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Reading</>}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4 glass-panel p-4 rounded-lg border border-theme-border">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1">
            <label className="block text-xs text-theme-text-muted mb-1">Date</label>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-theme-text-muted mb-1">Station</label>
            <Select value={filterStation} onChange={e => setFilterStation(e.target.value as Station)} className="h-9">
              {['Combined Total', ...stations.map(s=>s.name)].map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Volume" value={`${metrics.totalVolume.toFixed(2)} L`} icon={Droplet} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="PMS Volume" value={`${metrics.pmsVolume.toFixed(2)} L`} icon={Droplet} colorClass="bg-cyan-500/10 text-cyan-400" />
        <MetricCard title="AGO Volume" value={`${metrics.agoVolume.toFixed(2)} L`} icon={Droplet} colorClass="bg-blue-500/10 text-blue-400" />
        <MetricCard title="Total Sales Amount" value={`KES ${Math.round(metrics.totalSalesAmount).toLocaleString()}`} icon={TrendingUp} colorClass="bg-cyan-500/10 text-cyan-400" />
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Pump Reading' : 'New Pump Reading'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                  <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                    {stations.map(s => { const name = s.name; return name; }).map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Product</label>
                  <Select value={form.product} onChange={e => setForm({...form, product: e.target.value})}>
                    {products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel') || p.category === 'Fuel').map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Sales Start</label>
                  <Input type="number" step="0.01" value={form.salesStart} onChange={e => setForm({...form, salesStart: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Sales Stop</label>
                  <Input type="number" step="0.01" value={form.salesStop} onChange={e => setForm({...form, salesStop: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Litres Start</label>
                  <Input type="number" step="0.01" value={form.litresStart} onChange={e => setForm({...form, litresStart: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Litres Stop</label>
                  <Input type="number" step="0.01" value={form.litresStop} onChange={e => setForm({...form, litresStop: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Rate per Litre</label>
                  <Input type="number" step="0.01" value={form.ratePerLitre} onChange={e => setForm({...form, ratePerLitre: parseFloat(e.target.value)})} required />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Reading' : 'Save Reading'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <thead>
            <tr className="modern-tr">
              <Th>Date</Th>
              <Th>Station</Th>
              <Th>Product</Th>
              <Th>Volume (L)</Th>
              <Th>Sales Amount (KES)</Th>
              <Th>Variance</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredReadings.map(r => {
              const volume = r.litresStop - r.litresStart;
              const salesAmount = (r.salesStop || 0) - (r.salesStart || 0);
              const calculated = volume * r.ratePerLitre;
              const variance = salesAmount - calculated;
              return (
                <tr key={r.id} className="hover:theme-bg-gradient transition-colors">
                  <Td>{r.date}</Td>
                  <Td>{r.station}</Td>
                  <Td>
                    <ProductIconBadge name={r.product} category="Fuel" size="sm" />
                  </Td>
                  <Td className="font-semibold font-mono">{volume.toFixed(2)}</Td>
                  <Td className="text-cyan-400 font-semibold font-mono">KES {Math.round(salesAmount).toLocaleString()}</Td>
                  <Td>
                    <span className={`font-semibold font-mono ${Math.round(variance) === 0 ? 'text-theme-text-muted' : Math.round(variance) > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {Math.round(variance) > 0 ? '+' : ''}{Math.round(variance).toLocaleString()}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(r)} className="text-theme-text-muted hover:text-[#00D4FF] transition-colors cursor-pointer" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      </div>
  );
}