import React, { useState, useMemo } from 'react';
import { useFuel } from '../context';
import { db } from '../../../lib/firebase';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Building2, Plus, Sparkles, Check, X, Pencil, Trash2, ExternalLink, BarChart3, Droplets, TrendingDown, Receipt, Wallet, Banknote, ShieldAlert, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table, Th, Td } from '../components';

export default function StationsView({ onNavigateToDashboard }: { onNavigateToDashboard?: (name: string) => void }) {
  const { stations, setStations, pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions } = useFuel();
  
  const [newStationName, setNewStationName] = useState('');
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [editingStationName, setEditingStationName] = useState('');

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
    };
    
    // Optimistic UI update
    setStations(prev => [...prev, newStation]);
    setNewStationName('');

    try {
      await setDoc(doc(db, 'fuelsuite_stations', newStation.id), newStation);
    } catch (err) {
      console.error('Failed to add station to Firebase:', err);
      // Revert if failed (optional, simple app might skip revert logic for brevity)
    }
  };

  const handleSaveEditStation = async (id: string) => {
    if (!editingStationName.trim()) {
      setEditingStationId(null);
      return;
    }
    
    setStations(prev => prev.map(s => s.id === id ? { ...s, name: editingStationName.trim() } : s));
    setEditingStationId(null);

    try {
      await setDoc(doc(db, 'fuelsuite_stations', id), { id, name: editingStationName.trim() }, { merge: true });
    } catch (err) {
      console.error('Failed to update station in Firebase:', err);
    }
  };

  const handleDeleteStation = async (id: string) => {
    confirmDelete('Are you sure you want to delete this station?', async () => {
      setStations(prev => prev.filter(s => s.id !== id));
      try {
        await deleteDoc(doc(db, 'fuelsuite_stations', id));
      } catch (err) {
        console.error('Failed to delete station in Firebase:', err);
      }
    });
  };

  const handleRestoreDefaultStations = async () => {
    const defaults = [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
    setStations(defaults);
    try {
      for (const d of defaults) {
        await setDoc(doc(db, 'fuelsuite_stations', d.id), d);
      }
    } catch (err) {
      console.error('Failed to restore defaults:', err);
    }
  };

  const stationStats = useMemo(() => {
    const stats: Record<string, any> = {};

    stations.forEach(s => {
      let superSales = 0;
      let dieselSales = 0;
      let otherFuelSales = 0;
      let lpgSales = 0;
      let lpgPurchases = 0;
      let accSales = 0;
      let accPurchases = 0;
      let totalExpenses = 0;
      let invoiceTotal = 0;
      let invoicePaid = 0;
      
      // Pump readings
      pumpReadings.forEach(r => {
        if (r.station === s.name) {
          const lts = (r.litresStop || 0) - (r.litresStart || 0);
          const rev = r.manualCash || (lts * (r.ratePerLitre || 0));
          const p = (r.product || '').toLowerCase();
          if (p.includes('super') || p.includes('pms')) superSales += rev;
          else if (p.includes('diesel') || p.includes('ago')) dieselSales += rev;
          else otherFuelSales += rev;
        }
      });

      // LPG
      lpgTransactions.forEach(t => {
        if (t.station === s.name) {
          if (t.type === 'sale') lpgSales += (t.amount || 0);
          if (t.type === 'purchase') lpgPurchases += (t.amount || 0);
        }
      });

      // Inventory / Accessories
      inventoryItems.forEach(i => {
        if (i.station === s.name) {
          if (i.type === 'out') accSales += (i.amount || 0);
          if (i.type === 'in') accPurchases += (i.amount || 0);
        }
      });

      // Expenses
      expenses.forEach(e => {
        if (e.station === s.name) {
          totalExpenses += (e.amount || 0);
        }
      });

      // Invoices
      invoices.forEach(i => {
        if (i.station === s.name) {
          invoiceTotal += (i.totalAmount || 0);
          invoicePaid += (i.paidAmount || 0);
        }
      });

      // Cash Position (latest)
      const stCash = cashPositions
        .filter(c => c.station === s.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestCP = stCash[0] || { mPesa: 0, cashOnHand: 0 };
      const mpesa = latestCP.mPesa || 0;
      const cash = latestCP.cashOnHand || 0;
      
      const totalSales = superSales + dieselSales + otherFuelSales + lpgSales + accSales;
      const totalPurchases = lpgPurchases + accPurchases; // Simplified

      stats[s.name] = {
        totalSales,
        superSales,
        dieselSales,
        otherSales: otherFuelSales + lpgSales + accSales,
        totalPurchases,
        totalExpenses,
        invoiceTotal,
        invoicePaid,
        mpesa,
        cash,
        available: mpesa + cash
      };
    });

    return stats;
  }, [stations, pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions]);

  const formatC = (n: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 tracking-tight">
            Stations Configuration
          </h1>
          <p className="text-sm text-theme-text-muted">
            Manage your filling stations and view aggregated performance metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Station Management */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-theme-border glass-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-lg text-blue-400">Manage Stations</CardTitle>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold ml-auto">
                  {stations.length} Active
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddStation} className="flex flex-col gap-3">
                <Input 
                  value={newStationName} 
                  onChange={e => setNewStationName(e.target.value)} 
                  placeholder="New station name..." 
                  className="bg-slate-900 border-theme-border text-slate-100 placeholder-slate-500"
                />
                <Button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-slate-950 font-bold">
                  <Plus className="w-4 h-4" /> Add Station
                </Button>
              </form>

              {stations.length === 0 && (
                <div className="pt-2">
                  <Button 
                    onClick={handleRestoreDefaultStations} 
                    variant="secondary" 
                    className="w-full text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Initialize Default Stations
                  </Button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {stations.map(s => (
                  <div key={s.id} className="p-3 rounded-lg border border-theme-border/40 bg-slate-900/30 flex items-center justify-between group">
                    {editingStationId === s.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input 
                          value={editingStationName}
                          onChange={e => setEditingStationName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditStation(s.id);
                            if (e.key === 'Escape') setEditingStationId(null);
                          }}
                          className="text-sm py-1 h-8 bg-slate-950 flex-1"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEditStation(s.id)} className="p-1.5 text-emerald-400 bg-emerald-500/10 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStationId(null)} className="p-1.5 text-slate-400 bg-slate-800 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          <span className="font-semibold text-sm text-slate-200">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onNavigateToDashboard && (
                            <button
                              onClick={() => onNavigateToDashboard(s.name)}
                              className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                              title="Open Dashboard"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingStationId(s.id);
                              setEditingStationName(s.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(s.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Station Performance Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map(s => {
            const stats = stationStats[s.name] || {
              totalSales: 0, superSales: 0, dieselSales: 0, otherSales: 0, totalPurchases: 0,
              totalExpenses: 0, invoiceTotal: 0, invoicePaid: 0, mpesa: 0, cash: 0, available: 0
            };

            return (
              <Card key={s.id} className="border-theme-border glass-panel flex flex-col">
                <CardHeader className="pb-3 border-b border-theme-border/50 bg-slate-900/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                        {s.name}
                      </CardTitle>
                      <div className="text-2xl font-bold text-white mt-1">{formatC(stats.totalSales)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-theme-text-muted mt-0.5">Total Sales</div>
                    </div>
                    {onNavigateToDashboard && (
                      <Button onClick={() => onNavigateToDashboard(s.name)} variant="secondary" className="h-8 px-3 text-xs bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                        Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-2.5 border border-theme-border/40">
                      <div className="text-[10px] text-emerald-400/80 uppercase font-semibold mb-1 flex items-center gap-1.5"><Droplets className="w-3 h-3"/> Super</div>
                      <div className="text-sm font-bold text-slate-200">{formatC(stats.superSales)}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2.5 border border-theme-border/40">
                      <div className="text-[10px] text-amber-400/80 uppercase font-semibold mb-1 flex items-center gap-1.5"><Droplets className="w-3 h-3"/> Diesel</div>
                      <div className="text-sm font-bold text-slate-200">{formatC(stats.dieselSales)}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2.5 border border-theme-border/40">
                      <div className="text-[10px] text-rose-400/80 uppercase font-semibold mb-1 flex items-center gap-1.5"><TrendingDown className="w-3 h-3"/> Expenses</div>
                      <div className="text-sm font-bold text-slate-200">{formatC(stats.totalExpenses)}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2.5 border border-theme-border/40">
                      <div className="text-[10px] text-blue-400/80 uppercase font-semibold mb-1 flex items-center gap-1.5"><TrendingUp className="w-3 h-3"/> Purchases</div>
                      <div className="text-sm font-bold text-slate-200">{formatC(stats.totalPurchases)}</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-theme-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-theme-text-muted">
                        <Receipt className="w-3.5 h-3.5" /> Invoices (Total / Paid)
                      </div>
                      <div className="text-xs font-semibold font-mono text-slate-300">
                        {formatC(stats.invoiceTotal)} / <span className="text-emerald-400">{formatC(stats.invoicePaid)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-theme-text-muted">
                        <Wallet className="w-3.5 h-3.5" /> Liquid Cash (M-Pesa + Cash)
                      </div>
                      <div className="text-xs font-semibold font-mono text-sky-400">
                        {formatC(stats.available)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
