import React, { useState, useMemo } from 'react';
import { useFuel, PumpReading, LPGTransaction, InventoryItem, Expense, Invoice, CashPosition } from '../context';
import { Database, Search, Pencil, Trash2, Calendar, Building2, Filter, X, Check, AlertCircle } from 'lucide-react';
import { Card, Table, Th, Td } from '../components';

export default function MasterRecordsView() {
  const {
    activeStation,
    stations,
    pumpReadings, setPumpReadings,
    lpgTransactions, setLpgTransactions,
    inventoryItems, setInventoryItems,
    expenses, setExpenses,
    invoices, setInvoices,
    cashPositions, setCashPositions
  } = useFuel();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{ type: string; data: any } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ type: string; id: string } | null>(null);

  // Combine all records into a unified list representation
  const allRecords = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'Pump Reading' | 'LPG Transaction' | 'Inventory' | 'Expense' | 'Invoice' | 'Cash Position';
      date: string;
      station: string;
      title: string;
      details: string;
      amountOrValue: number;
      raw: any;
    }> = [];

    pumpReadings.forEach(r => {
      const volume = r.litresStop - r.litresStart;
      const sales = (r.salesStop || 0) - (r.salesStart || 0);
      list.push({
        id: r.id,
        type: 'Pump Reading',
        date: r.date,
        station: r.station,
        title: `${r.product} (${volume.toFixed(2)} L)`,
        details: `Start: ${r.salesStart}, Stop: ${r.salesStop} | Rate: ${r.ratePerLitre}`,
        amountOrValue: sales > 0 ? sales : volume * r.ratePerLitre,
        raw: r
      });
    });

    lpgTransactions.forEach(t => {
      list.push({
        id: t.id,
        type: 'LPG Transaction',
        date: t.date,
        station: t.station,
        title: `${t.type.toUpperCase()}: ${t.item} (Qty: ${t.quantity})`,
        details: `Type: ${t.type}`,
        amountOrValue: t.amount,
        raw: t
      });
    });

    inventoryItems.forEach(i => {
      list.push({
        id: i.id,
        type: 'Inventory',
        date: i.date,
        station: i.station,
        title: `${i.type.toUpperCase()}: ${i.item} (Qty: ${i.quantity})`,
        details: `Category: Inventory Movement`,
        amountOrValue: i.amount,
        raw: i
      });
    });

    expenses.forEach(e => {
      list.push({
        id: e.id,
        type: 'Expense',
        date: e.date,
        station: e.station,
        title: `${e.category} - ${e.description || e.expenseCode || 'General'}`,
        details: `Payment: ${e.paymentMethod || 'Cash'}`,
        amountOrValue: e.amount,
        raw: e
      });
    });

    invoices.forEach(inv => {
      list.push({
        id: inv.id,
        type: 'Invoice',
        date: inv.date || new Date().toISOString().split('T')[0],
        station: inv.station,
        title: `Invoice: ${inv.customerName}`,
        details: `Total: ${inv.totalAmount} | Paid: ${inv.paidAmount}`,
        amountOrValue: inv.totalAmount,
        raw: inv
      });
    });

    cashPositions.forEach(cp => {
      list.push({
        id: cp.id,
        type: 'Cash Position',
        date: cp.date,
        station: cp.station || 'All Stations',
        title: `Cash Position Reconciliation`,
        details: `M-Pesa: ${cp.mPesa} | Cash on Hand: ${cp.cashOnHand}`,
        amountOrValue: cp.mPesa + cp.cashOnHand,
        raw: cp
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(rec => {
      const matchStation = activeStation === 'Combined Total' || rec.station === activeStation;
      const matchCategory = selectedCategory === 'All' || rec.type === selectedCategory;
      const matchDate = !selectedDateFilter || rec.date === selectedDateFilter;
      const matchSearch = !searchQuery || 
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.date.includes(searchQuery);

      return matchStation && matchCategory && matchDate && matchSearch;
    });
  }, [allRecords, activeStation, selectedCategory, selectedDateFilter, searchQuery]);

  const handleDeleteRecord = (type: string, id: string) => {
    if (type === 'Pump Reading') {
      setPumpReadings(prev => prev.filter(r => r.id !== id));
    } else if (type === 'LPG Transaction') {
      setLpgTransactions(prev => prev.filter(t => t.id !== id));
    } else if (type === 'Inventory') {
      setInventoryItems(prev => prev.filter(i => i.id !== id));
    } else if (type === 'Expense') {
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else if (type === 'Invoice') {
      setInvoices(prev => prev.filter(i => i.id !== id));
    } else if (type === 'Cash Position') {
      setCashPositions(prev => prev.filter(cp => cp.id !== id));
    }
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const { type, data } = editingItem;

    if (type === 'Pump Reading') {
      setPumpReadings(prev => prev.map(r => r.id === data.id ? data : r));
    } else if (type === 'LPG Transaction') {
      setLpgTransactions(prev => prev.map(t => t.id === data.id ? data : t));
    } else if (type === 'Inventory') {
      setInventoryItems(prev => prev.map(i => i.id === data.id ? data : i));
    } else if (type === 'Expense') {
      setExpenses(prev => prev.map(ex => ex.id === data.id ? data : ex));
    } else if (type === 'Invoice') {
      setInvoices(prev => prev.map(inv => inv.id === data.id ? data : inv));
    } else if (type === 'Cash Position') {
      setCashPositions(prev => prev.map(cp => cp.id === data.id ? data : cp));
    }

    setEditingItem(null);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Master Records Manager
            </h1>
            <p className="text-theme-text-muted mt-0.5 text-xs">
              Centralized audit log of all synced entries across pump readings, LPG, inventory, expenses, invoices, and cash positions.
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center border border-theme-border">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            placeholder="Search records, stations, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-theme-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-theme-text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900/50 border border-theme-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Categories</option>
              <option value="Pump Reading">Pump Readings</option>
              <option value="LPG Transaction">LPG Transactions</option>
              <option value="Inventory">Inventory / Accessories</option>
              <option value="Expense">Expenses</option>
              <option value="Invoice">Invoices</option>
              <option value="Cash Position">Cash Positions</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-theme-text-muted" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-slate-900/50 border border-theme-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            {selectedDateFilter && (
              <button 
                onClick={() => setSelectedDateFilter('')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RECORDS TABLE */}
      <Card>
        <Table>
          <thead>
            <tr className="modern-tr">
              <Th>Date</Th>
              <Th>Station</Th>
              <Th>Type</Th>
              <Th>Record Summary</Th>
              <Th>Details</Th>
              <Th>Amount / Value (KES)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => (
                <tr key={`${rec.type}-${rec.id}`} className="hover:theme-bg-gradient transition-colors">
                  <Td>{rec.date}</Td>
                  <Td>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {rec.station}
                    </span>
                  </Td>
                  <Td>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      rec.type === 'Pump Reading' ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/30' :
                      rec.type === 'LPG Transaction' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                      rec.type === 'Inventory' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                      rec.type === 'Expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      rec.type === 'Invoice' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {rec.type}
                    </span>
                  </Td>
                  <Td className="font-medium text-white">{rec.title}</Td>
                  <Td className="text-theme-text-muted text-xs font-mono">{rec.details}</Td>
                  <Td className="font-mono font-semibold text-cyan-400">
                    KES {Math.round(rec.amountOrValue).toLocaleString()}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingItem({ type: rec.type, data: { ...rec.raw } })}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId({ type: rec.type, id: rec.id })}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-12 text-theme-text-muted italic">
                  No records found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-lg w-full border border-theme-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-theme-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-400" />
                Edit {editingItem.type}
              </h3>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-theme-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={editingItem.data.date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                  className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Station</label>
                <select
                  value={editingItem.data.station || stations[0]?.name}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, station: e.target.value } })}
                  className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                >
                  {stations.map(st => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic fields based on type */}
              {editingItem.type === 'Pump Reading' && (
                <>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Product</label>
                    <input
                      type="text"
                      value={editingItem.data.product || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, product: e.target.value } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Litres Start</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.data.litresStart || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, litresStart: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Litres Stop</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.data.litresStop || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, litresStop: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Sales Start</label>
                      <input
                        type="number"
                        value={editingItem.data.salesStart || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, salesStart: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Sales Stop</label>
                      <input
                        type="number"
                        value={editingItem.data.salesStop || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, salesStop: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Rate Per Litre</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.data.ratePerLitre || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, ratePerLitre: parseFloat(e.target.value) || 0 } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {(editingItem.type === 'LPG Transaction' || editingItem.type === 'Inventory') && (
                <>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Item Name</label>
                    <input
                      type="text"
                      value={editingItem.data.item || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, item: e.target.value } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Quantity</label>
                      <input
                        type="number"
                        value={editingItem.data.quantity || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, quantity: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Total Amount (KES)</label>
                      <input
                        type="number"
                        value={editingItem.data.amount || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, amount: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingItem.type === 'Expense' && (
                <>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Category</label>
                    <input
                      type="text"
                      value={editingItem.data.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, category: e.target.value } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Description</label>
                    <input
                      type="text"
                      value={editingItem.data.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Amount (KES)</label>
                    <input
                      type="number"
                      value={editingItem.data.amount || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, amount: parseFloat(e.target.value) || 0 } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'Invoice' && (
                <>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={editingItem.data.customerName || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, customerName: e.target.value } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Total Amount</label>
                      <input
                        type="number"
                        value={editingItem.data.totalAmount || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, totalAmount: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Paid Amount</label>
                      <input
                        type="number"
                        value={editingItem.data.paidAmount || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, paidAmount: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingItem.type === 'Cash Position' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">M-Pesa Amount</label>
                    <input
                      type="number"
                      value={editingItem.data.mPesa || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, mPesa: parseFloat(e.target.value) || 0 } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-400 block mb-1">Cash on Hand</label>
                    <input
                      type="number"
                      value={editingItem.data.cashOnHand || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, cashOnHand: parseFloat(e.target.value) || 0 } })}
                      className="w-full bg-slate-900 border border-theme-border rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-cyan-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-sm w-full border border-theme-border space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Record?</h3>
            <p className="text-slate-300 text-xs">
              Are you sure you want to delete this {confirmDeleteId.type}? This action cannot be undone and will update daily reports accordingly.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(confirmDeleteId.type, confirmDeleteId.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
