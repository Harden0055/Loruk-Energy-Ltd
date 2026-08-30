import React, { useState, useMemo } from 'react';
import { useFuel, LPGTransaction , Station } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td, MetricCard, ProductIconBadge } from '../components';
import { Plus, CheckSquare, ShoppingCart, RefreshCcw, Pencil, Trash2, X, Flame, Boxes } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { useConfirm } from '../useConfirm';

export default function LPGView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { lpgTransactions, setLpgTransactions, inventoryItems, activeStation, stations, products } = useFuel();
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'opening'>('sales');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLpgProfit, setShowLpgProfit] = useState(false);

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStation, setFilterStation] = useState<Station>(activeStation);

  React.useEffect(() => {
    setFilterStation(activeStation);
  }, [activeStation]);

  const lpgProductOptions = useMemo(() => {
    const fromCatalog = (products || []).filter(p => 
      p.category === 'LPG' || 
      p.category === 'Accessories' || 
      p.name.toLowerCase().includes('lpg') || 
      p.name.toLowerCase().includes('cylinder') || 
      p.name.toLowerCase().includes('burner') || 
      p.name.toLowerCase().includes('grill')
    );
    if (fromCatalog.length > 0) return fromCatalog.map(p => p.name);
    return ['6Kg LPG', '13Kg LPG', 'Burner', 'Grill', '6Kg LPG - Empty', '13Kg LPG - Empty'];
  }, [products]);

  const [form, setForm] = useState<Partial<LPGTransaction>>({
    date: new Date().toISOString().split('T')[0],
    station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation,
    item: lpgProductOptions[0] || '6Kg LPG',
    quantity: 1,
    rate: 0,
    amount: 0,
  });

  const lpgInventoryItems = inventoryItems
    .filter(i => {
      const n = i.item.toLowerCase();
      const prod = (products || []).find(p => p.name.toLowerCase() === n);
      const isLpgOrAcc = prod && (prod.category === 'LPG' || prod.category === 'Accessories');
      return isLpgOrAcc || n.includes('lpg') || n.includes('cylinder') || n.includes('burner') || n.includes('grill');
    })
    .map(i => ({
      ...i,
      type: (i.type === 'in' ? 'purchase' : i.type === 'out' ? 'sale' : 'opening') as "purchase" | "sale" | "opening",
      item: i.item,
      isFromInventory: true
    }));

  const allLpgData = [...lpgTransactions, ...lpgInventoryItems].sort((a, b) => b.date.localeCompare(a.date));

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

    const isAcc = (item: string) => item.toLowerCase().includes('burner') || item.toLowerCase().includes('grill');

    const lpgStats = statsData.filter(t => !isAcc(t.item));
    const accStats = statsData.filter(t => isAcc(t.item));

    const totalBoughtLpg = lpgStats.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.quantity, 0);
    const totalSoldLpg = lpgStats.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.quantity, 0);
    const totalOpeningLpg = lpgStats.filter(t => t.type === 'opening').reduce((acc, t) => acc + t.quantity, 0);
    const currentInvLpg = totalOpeningLpg + totalBoughtLpg - totalSoldLpg;
    const totalSalesAmountLpg = lpgStats.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
    const totalPurchasesAmountLpg = lpgStats.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);

    const totalBoughtAcc = accStats.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.quantity, 0);
    const totalSoldAcc = accStats.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.quantity, 0);
    const totalOpeningAcc = accStats.filter(t => t.type === 'opening').reduce((acc, t) => acc + t.quantity, 0);
    const currentInvAcc = totalOpeningAcc + totalBoughtAcc - totalSoldAcc;
    const totalSalesAmountAcc = accStats.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
    const totalPurchasesAmountAcc = accStats.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);

    return {
      lpg: { totalOpening: totalOpeningLpg, totalBought: totalBoughtLpg, totalSold: totalSoldLpg, currentInv: currentInvLpg, totalSales: totalSalesAmountLpg, totalPurchases: totalPurchasesAmountLpg },
      acc: { totalOpening: totalOpeningAcc, totalBought: totalBoughtAcc, totalSold: totalSoldAcc, currentInv: currentInvAcc, totalSales: totalSalesAmountAcc, totalPurchases: totalPurchasesAmountAcc }
    };
  }, [allLpgData, filterStation, filterDate]);

  const { lpg, acc } = metrics;

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
      station: activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation,
      item: lpgProductOptions[0] || '6kg Cylinder',
      quantity: 1,
      rate: 0,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLpgTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...form as LPGTransaction } : t));
    } else {
      const newTx: LPGTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        station: form.station || (activeStation === 'Combined Total' ? (stations[0]?.name || 'Station 1') : activeStation),
        type: activeTab === 'sales' ? 'sale' : activeTab === 'purchases' ? 'purchase' : 'opening',
        ...form as Omit<LPGTransaction, 'id' | 'type' | 'station'>
      };
      setLpgTransactions(prev => [...prev, newTx]);
    }
    resetForm();
  };

  if (showLpgProfit) {
    return (<div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)]">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">LPG & Accessories Profit Profile</h2>
              <p className="text-xs text-theme-text-muted">Net margins & volume trends for gas cylinders</p>
            </div>
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
          <div className="flex flex-col justify-center bg-blue-500/10 border border-theme-border p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total Sales</span>
            <span className="text-3xl font-bold text-blue-400 mt-2">Ksh {(lpg.totalSales + acc.totalSales).toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Total Purchases</span>
            <span className="text-3xl font-bold text-orange-400 mt-2">Ksh {(lpg.totalPurchases + acc.totalPurchases).toLocaleString()}</span>
          </div>
          <div className="flex flex-col justify-center bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl shadow-sm">
            <span className="text-sm text-theme-text-muted font-medium">Net Profit</span>
            <span className={`text-3xl font-bold mt-2 ${(lpg.totalSales + acc.totalSales - lpg.totalPurchases - acc.totalPurchases) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Ksh {(lpg.totalSales + acc.totalSales - lpg.totalPurchases - acc.totalPurchases).toLocaleString()}
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
                  {statsData.filter(t => t.type !== 'opening').sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                    <tr key={t.id} className="border-b border-theme-border/50 hover:bg-[#122840]/50 transition-colors">
                      <td className="modern-td">{t.date}</td>
                      <td className="modern-td">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${t.type === 'sale' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="modern-td">
                        <ProductIconBadge name={t.item} category={t.item.toLowerCase().includes('burner') || t.item.toLowerCase().includes('grill') ? 'Accessories' : 'LPG'} size="sm" />
                      </td>
                      <td className="modern-td font-mono font-semibold">Ksh {t.amount.toLocaleString()}</td>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              LPG & Accessories Sales & Inventory
            </h1>
            <p className="text-theme-text-muted mt-0.5 text-xs">Manage gas cylinders, accessories tracking & stock balance.</p>
          </div>
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
              {['Combined Total', ...stations.map(s=>s.name)].map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-panel p-6 rounded-xl border border-theme-border shadow-md bg-orange-500/5">
          <h4 className="text-sm font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Total LPG Stats</h4>
          <p className="text-2xl font-bold text-orange-400">Sales: Ksh {lpg.totalSales.toLocaleString()}</p>
          <p className="text-2xl font-bold text-orange-600">Purchases: Ksh {lpg.totalPurchases.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-6 rounded-xl border border-theme-border shadow-md bg-emerald-500/5">
          <h4 className="text-sm font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Total Accessories Stats</h4>
          <p className="text-2xl font-bold text-emerald-400">Sales: Ksh {acc.totalSales.toLocaleString()}</p>
          <p className="text-2xl font-bold text-emerald-600">Purchases: Ksh {acc.totalPurchases.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-6 rounded-xl border border-theme-border shadow-md bg-green-500/5 flex flex-col justify-center">
          <h4 className="text-sm font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Total Profit</h4>
          <p className="text-3xl font-bold text-green-500">Ksh {(lpg.totalSales - lpg.totalPurchases + acc.totalSales - acc.totalPurchases).toLocaleString()}</p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">LPG Inventory</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Opening Stock" value={`${lpg.totalOpening} Cyls`} icon={Boxes} colorClass="bg-blue-500/10 text-blue-400" />
        <MetricCard title="Total Bought" value={`${lpg.totalBought} Cyls`} icon={ShoppingCart} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total Sold" value={`${lpg.totalSold} Cyls`} icon={CheckSquare} colorClass="bg-blue-500/10 text-blue-400" />
        <MetricCard title="Current Inventory" value={`${lpg.currentInv} Cyls`} icon={RefreshCcw} colorClass="bg-emerald-500/10 text-emerald-400" />
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Accessories Inventory (Burner/Grill)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Opening Stock" value={`${acc.totalOpening} Units`} icon={Boxes} colorClass="bg-blue-500/10 text-blue-400" />
        <MetricCard title="Total Bought" value={`${acc.totalBought} Units`} icon={ShoppingCart} colorClass="bg-[#122840] text-theme-text-muted" />
        <MetricCard title="Total Sold" value={`${acc.totalSold} Units`} icon={CheckSquare} colorClass="bg-blue-500/10 text-blue-400" />
        <MetricCard title="Current Inventory" value={`${acc.currentInv} Units`} icon={RefreshCcw} colorClass="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="flex justify-end pt-2 pb-2">
        <button onClick={() => setShowLpgProfit(true)} className="text-blue-400 hover:text-blue-300 underline underline-offset-4 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400" /> View LPG Profit Profile
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                  {stations.map(s => { const name = s.name; return name; }).map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="block text-xs text-theme-text-muted mb-1">Item / Product</label>
                <Select value={form.item} onChange={e => setForm({...form, item: e.target.value})}>
                  {lpgProductOptions.map(opt => (
                    <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-1 md:col-span-1">
                <label className="block text-xs text-theme-text-muted mb-1">Qty</label>
                <Input 
                  type="number" 
                  value={form.quantity || ''} 
                  onChange={e => {
                    const q = parseInt(e.target.value) || 0;
                    const r = form.rate || 0;
                    setForm({
                      ...form, 
                      quantity: q,
                      amount: r > 0 ? q * r : form.amount
                    });
                  }} 
                  required 
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Rate (Ksh / unit)</label>
                <Input 
                  type="number" 
                  step="any"
                  placeholder="Rate"
                  value={form.rate || ''} 
                  onChange={e => {
                    const r = parseFloat(e.target.value) || 0;
                    const q = form.quantity || 0;
                    setForm({
                      ...form, 
                      rate: r,
                      amount: q > 0 ? q * r : form.amount
                    });
                  }} 
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-theme-text-muted mb-1">Total Amount (KES)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={form.amount || ''} 
                  onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>
              <div className="col-span-1 md:col-span-12 flex justify-end mt-2">
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
                <Td>
                  <ProductIconBadge name={t.item} category={t.item.toLowerCase().includes('burner') || t.item.toLowerCase().includes('grill') ? 'Accessories' : 'LPG'} size="sm" />
                </Td>
                <Td className="font-semibold font-mono">{t.quantity}</Td>
                <Td className="text-[#00D4FF] font-semibold font-mono">KES {t.amount.toLocaleString()}</Td>
                <Td>
                  {!(t as any).isFromInventory ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(t as LPGTransaction)} className="text-theme-text-muted hover:text-[#00D4FF] transition-colors cursor-pointer" title="Edit">
                        <Pencil className="w-4 h-4" />
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