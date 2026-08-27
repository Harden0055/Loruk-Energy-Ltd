import React, { useState } from 'react';
import { useFuel, CashPosition } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td, MetricCard } from '../components';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Pencil, Trash2, X, Wallet, Smartphone, Banknote, Building2, Calendar } from 'lucide-react';
import { useConfirm } from '../useConfirm';

const COLORS = ['#10B981', '#06B6D4'];

export default function CashPositionView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { cashPositions, setCashPositions, activeStation, stations } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<CashPosition>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
    mPesa: 0,
    cashOnHand: 0,
    losses: 0,
    lossesNote: '',
  });

  const filteredPositions = cashPositions.filter(p => 
    activeStation === 'Combined Total' || !p.station || p.station === activeStation
  ).sort((a, b) => b.date.localeCompare(a.date));

  const latest = filteredPositions[0] || { mPesa: 0, cashOnHand: 0, losses: 0 };
  const latestExactCash = Math.max(0, (latest.cashOnHand || 0) - (latest.losses || 0));
  const pieData = [
    { name: 'M-Pesa', value: latest.mPesa || 0, fill: '#10B981' },
    { name: 'Net Cash on Hand', value: latestExactCash, fill: '#06B6D4' },
  ];

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
      mPesa: 0,
      cashOnHand: 0,
      losses: 0,
      lossesNote: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (pos: CashPosition) => {
    setForm({ ...pos });
    setEditingId(pos.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    confirmDelete('Are you sure you want to delete this cash position entry?', () => {
      setCashPositions(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setCashPositions(prev => prev.map(pos => pos.id === editingId ? { ...pos, ...form as CashPosition } : pos));
    } else {
      const newPos: CashPosition = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation),
        ...form as Omit<CashPosition, 'id'>
      };
      setCashPositions(prev => [...prev, newPos]);
    }
    resetForm();
  };

  const metrics = React.useMemo(() => {
    const totalMpesa = filteredPositions.reduce((sum, c) => sum + (c.mPesa || 0), 0);
    const totalGrossCash = filteredPositions.reduce((sum, c) => sum + (c.cashOnHand || 0), 0);
    const totalLosses = filteredPositions.reduce((sum, c) => sum + (c.losses || 0), 0);
    const totalExactNetCash = Math.max(0, totalGrossCash - totalLosses);
    const total = totalMpesa + totalExactNetCash;
    return { total, mPesa: totalMpesa, cash: totalGrossCash, losses: totalLosses, exactNetCash: totalExactNetCash };
  }, [filteredPositions]);

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-300">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Cash Position & Liquidity</h1>
            <p className="text-slate-400 mt-0.5 text-xs">Track daily bank, M-Pesa, register cash count, operational losses, and exact net cash at hand.</p>
          </div>
        </div>

        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Log Cash Position</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          title="Total Net Funds" 
          value={`KES ${metrics.total.toLocaleString()}`} 
          icon={Wallet} 
          colorClass="bg-blue-500/15 text-blue-400 border border-blue-500/30" 
        />
        <MetricCard 
          title="Total M-Pesa" 
          value={`KES ${metrics.mPesa.toLocaleString()}`} 
          icon={Smartphone} 
          colorClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
        />
        <MetricCard 
          title="Exact Net Cash on Hand" 
          value={`KES ${metrics.exactNetCash.toLocaleString()}`} 
          icon={Banknote} 
          colorClass="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" 
        />
        <MetricCard 
          title="Total Losses Deducted" 
          value={`KES ${metrics.losses.toLocaleString()}`} 
          icon={Banknote} 
          colorClass="bg-red-500/15 text-red-400 border border-red-500/30" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                Current Split (Latest Entry)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex flex-col items-center justify-center p-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0D14', borderColor: 'rgba(255,255,255,0.1)', color: '#F8FAFC', borderRadius: '12px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Latest Net Available Funds</p>
                <p className="text-xl font-extrabold text-white font-mono mt-0.5">
                  KES {((latest.mPesa || 0) + latestExactCash).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {isFormOpen && (
            <Card className="border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <CardHeader>
                <CardTitle className="text-cyan-400">{editingId ? 'Edit Cash Position' : 'Log Cash Position'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date</label>
                      <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">M-Pesa (KES)</label>
                      <Input type="number" step="0.01" value={form.mPesa} onChange={e => setForm({...form, mPesa: parseFloat(e.target.value) || 0})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">Gross Cash Count (KES)</label>
                      <Input type="number" step="0.01" value={form.cashOnHand} onChange={e => setForm({...form, cashOnHand: parseFloat(e.target.value) || 0})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5">Losses (KES)</label>
                      <Input type="number" step="0.01" value={form.losses} onChange={e => setForm({...form, losses: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Losses Explanation / Note</label>
                    <Input 
                      type="text" 
                      placeholder="e.g. Pump calibration variance, transit discrepancy, cashier deficit" 
                      value={form.lossesNote || ''} 
                      onChange={e => setForm({...form, lossesNote: e.target.value})} 
                    />
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-sans">Calculated Exact Cash at Hand:</span>
                    <strong className="text-emerald-400 text-sm">
                      KES {Math.max(0, (form.cashOnHand || 0) - (form.losses || 0)).toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                    <Button type="submit">{editingId ? 'Update Position' : 'Save Position'}</Button>
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
                  <Th>M-Pesa</Th>
                  <Th>Gross Cash</Th>
                  <Th>Losses</Th>
                  <Th>Exact Net Cash</Th>
                  <Th>Total Funds</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map(t => {
                  const gross = t.cashOnHand || 0;
                  const loss = t.losses || 0;
                  const netCash = Math.max(0, gross - loss);
                  const total = (t.mPesa || 0) + netCash;

                  return (
                    <tr key={t.id} className="modern-tr">
                      <Td className="font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.date}</span>
                        </div>
                      </Td>
                      <Td className="text-xs text-slate-400 font-medium">{t.station || 'Loruk Ndalu'}</Td>
                      <Td className="text-emerald-400 font-bold font-mono">KES {(t.mPesa || 0).toLocaleString()}</Td>
                      <Td className="text-slate-300 font-mono">KES {gross.toLocaleString()}</Td>
                      <Td className="font-mono">
                        {loss > 0 ? (
                          <span className="text-red-400 font-bold" title={t.lossesNote || 'Loss'}>
                            - KES {loss.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </Td>
                      <Td className="text-cyan-400 font-bold font-mono">KES {netCash.toLocaleString()}</Td>
                      <Td className="text-white font-extrabold font-mono">KES {total.toLocaleString()}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(t)} 
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors cursor-pointer border border-cyan-500/20" 
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)} 
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer border border-red-500/20" 
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {filteredPositions.length === 0 && (
                  <tr className="modern-tr">
                    <Td colSpan={8} className="text-center py-8 text-slate-500">No positions recorded.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
