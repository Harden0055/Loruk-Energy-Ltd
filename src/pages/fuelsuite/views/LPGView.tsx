import React, { useState, useMemo } from 'react';
import { useFuel, LPGTransaction , STATIONS, Station } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard } from '../components';
import { Plus, CheckSquare, ShoppingCart, RefreshCcw, Pencil, Trash2, X, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export default function LPGView() {
  const { lpgTransactions, setLpgTransactions, inventoryItems, activeStation } = useFuel();
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'opening'>('sales');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLpgProfit, setShowLpgProfit] = useState(false);

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStation, setFilterStation] = useState<Station>(activeStation);

  const [form, setForm] = useState<Partial<LPGTransaction>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
    item: '6kg Cylinder',
    quantity: 1,
    amount: 0,
  });

  const lpgInventoryItems = inventoryItems
    .filter(i => (i.item === '6kg LPG' || i.item === '13kg LPG' || i.item === '6kg Cylinder' || i.item === '13kg Cylinder'))
    .map(i => ({
      ...i,
      type: (i.type === 'in' ? 'purchase' : i.type === 'out' ? 'sale' : 'opening') as "purchase" | "sale" | "opening",
      item: i.item.replace('LPG', 'Cylinder').trim(), // Normalize naming
      isFromInventory: true
    }));

  const allLpgData = [...lpgTransactions, ...lpgInventoryItems].sort((a, b) => ((b.createdAt || b.date) > (a.createdAt || a.date) ? -1 : 1));

  const filteredData = useMemo(() => {
    return allLpgData.filter(t => 
      t.type === (activeTab === 'sales' ? 'sale' : activeTab === 'purchases' ? 'purchase' : 'opening') &&
      (filterStation === 'Combined Total' || t.station === filterStation) &&
      (!filterDate || t.date === filterDate)
    );
  }, [allLpgData, activeTab, filterStation, filterDate]);

  const metrics = useMemo(() => {
    const statsData = allLpgData.filter(t => 
      (filterStation === 'Combined Total' || t.station === filterStation) &&
      (!filterDate || t.date === filterDate)
    );
    const totalBought = statsData.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.quantity, 0);
    const totalSold = statsData.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.quantity, 0);
    const totalOpening = statsData.filter(t => t.type === 'opening').reduce((acc, t) => acc + t.quantity, 0);
    const currentInv = totalOpening + totalBought - totalSold;
    const totalSalesAmount = statsData.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
    const totalPurchasesAmount = statsData.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);

    return {
      totalBought,
      totalSold,
      currentInv,
      totalSalesAmount,
      totalPurchasesAmount,
      stats: [
        { label: 'Purchased', value: totalBought },
        { label: 'Sold', value: totalSold },
        { label: 'Net', value: totalBought - totalSold },
      ]
    };
  }, [allLpgData, filterStation, filterDate]);

  const { totalBought, totalSold, currentInv, totalSalesAmount, totalPurchasesAmount } = metrics;

  const statsData = allLpgData;

  const chartData = React.useMemo(() => {
    const dates = Array.from(new Set(statsData.map(t => t.date))).sort();
    return dates.map(date => {
      const daySales = statsData.filter(t => t.date === date && t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const dayPurchases = statsData.filter(t => t.date === date && t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
      return {
        date,
        Sales: daySales,
        Purchases: dayPurchases,
        Profit: daySales - dayPurchases
      };
    });
  }, [statsData]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      station: activeStation === 'Combined Total' ? STATIONS[0] : activeStation,
      item: '6kg Cylinder',
      quantity: 1,
      amount: 0,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (tx: LPGTransaction) => {
    setForm({ ...tx });
    setEditingId(tx.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setLpgTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLpgTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...form as LPGTransaction } : t));
    } else {
      const newTx: LPGTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? STATIONS[0] : activeStation),
        type: activeTab === 'sales' ? 'sale' : activeTab === 'purchases' ? 'purchase' : 'opening',
        ...form as Omit<LPGTransaction, 'id' | 'type' | 'station'>
      };
      setLpgTransactions(prev => [...prev, newTx]);
    }
    resetForm();
  };

  if (showLpgProfit) {
    return (
      <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Flame className="text-orange-400 w-8 h-8" />
            <h2 className="text-2xl font-bold text-slate-100">LPG Profit Profile</h2>
          </div>
          <button 
            onClick={() => setShowLpgProfit(false)}
            className="flex items-center gap-2 px-4 py-2 bg-[#122840] hover:bg-[#3d4270] text-white rounded-lg transition-colors font-medium text-sm"
          >
            <X className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col justify-center bg-cyan-500/10 border border-theme-border p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total LPG Sales</span>
            <span className="text-3xl font-bold text-cyan-400 mt-2">Ksh {totalSalesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total LPG Purchases</span>
            <span className="text-3xl font-bold text-orange-400 mt-2">Ksh {totalPurchasesAmount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Net Profit (LPG)</span>
            <span className={`text-3xl font-bold mt-2 ${totalSalesAmount - totalPurchasesAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Ksh {(totalSalesAmount - totalPurchasesAmount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="glass-panel p-6 rounded-xl border border-theme-border shadow-md">
            <h4 className="text-sm font-bold text-theme-text-muted mb-6 uppercase tracking-wider">Trend Analysis</h4>
            <div className="h-[400px] relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#122840" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Ksh ${val/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0b1928', borderColor: '#122840', color: '#f8fafc', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Sales" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-xl border border-theme-border overflow-hidden flex flex-col shadow-md">
            <h4 className="text-sm font-bold text-theme-text-muted p-6 border-b border-theme-border uppercase tracking-wider">Recent Transactions</h4>
            <div className="overflow-auto flex-1 h-[400px]">
              <table className="modern-table">
                <thead className="bg-[#1e223d] sticky top-0 z-10">
                  <tr className="modern-tr">
                    <th className="modern-th">Date</th>
                    <th className="modern-th">Type</th>
                    <th className="modern-th">Item</th>
                    <th className="modern-th">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.filter(t => t.type !== 'opening').sort((a,b) => ((b.createdAt || b.date) > (a.createdAt || a.date) ? -1 : 1)).map(t => (
                    <tr key={t.id} className="border-b border-theme-border/50 hover:bg-[#122840]/50 transition-colors">
                      <td className="modern-td">{t.date}</td>
                      <td className="modern-td">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${t.type === 'sale' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="modern-td">{t.item}</td>
                      <td className="modern-td">Ksh {t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {statsData.filter(t => t.type !== 'opening').length === 0 && (
                    <tr className="modern-tr">
                      <td colSpan={4} className="p-8 text-center text-slate-500">No recent sales or purchases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">LPG Sales & Inventory</h1>
          <p className="text-theme-text-muted mt-1">Manage LPG gas cylinders tracking.</p>
        </div>
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
              {['Combined Total', ...STATIONS].map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Bought" value={`${totalBought} Cylinders`} icon={ShoppingCart} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total Sold" value={`${totalSold} Cylinders`} icon={CheckSquare} colorClass="bg-cyan-500/10 text-cyan-400" />
        <MetricCard title="Current Inventory" value={`${currentInv} Cylinders`} icon={RefreshCcw} colorClass="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="flex justify-end pt-2 pb-2">
        <button onClick={() => setShowLpgProfit(true)} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 text-sm font-medium transition-colors">
          View LPG Profit Profile
        </button>
      </div>

      <div className="flex gap-4 border-b border-theme-border">
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'sales' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('sales'); resetForm(); }}
        >
          LPG Sales
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'purchases' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('purchases'); resetForm(); }}
        >
          LPG Purchases
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'opening' ? 'text-[#00D4FF] border-b-2 border-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.25)]' : 'text-theme-text-muted hover:text-white'}`}
          onClick={() => { setActiveTab('opening'); resetForm(); }}
        >
          Opening Stock
        </button>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add {activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}</>}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? `Edit ${activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}` : `New ${activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Opening Stock'}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {STATIONS.map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="col-span-1 md:col-span-1 lg:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Item Size</label>
                <Select value={form.item} onChange={e => setForm({...form, item: e.target.value})}>
                  <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="6kg Cylinder">6kg Cylinder</option>
                  <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="13kg Cylinder">13kg Cylinder</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Qty</label>
                <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} required />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-theme-text-muted mb-1">Total Amount (KES)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required />
              </div>
              <div className="col-span-1 md:col-span-5 flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Entry' : 'Save Entry'}</Button>
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
              <Th>Item Details</Th>
              <Th>Quantity</Th>
              <Th>Total Amount (KES)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => (
              <tr key={t.id} className="hover:theme-bg-gradient transition-colors">
                <Td>{t.date}</Td>
                <Td><span className="text-xs text-theme-text-muted uppercase tracking-tight font-medium">{t.station}</span></Td>
                <Td><span className="font-semibold text-theme-text">{t.item}</span></Td>
                <Td className="font-semibold font-mono">{t.quantity}</Td>
                <Td className="text-[#00D4FF] font-semibold font-mono">KES {t.amount.toLocaleString()}</Td>
                <Td>
                  {!(t as any).isFromInventory ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(t as LPGTransaction)} className="text-theme-text-muted hover:text-[#00D4FF] transition-colors cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-theme-text-muted hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">via Inventory</span>
                  )}
                </Td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr className="modern-tr">
                <Td colSpan={5} className="text-center py-8 text-slate-500">No {activeTab} records found.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
