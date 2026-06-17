import React, { useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { useFleetExpenses, createFleetExpense, deleteFleetExpense, updateFleetExpense } from '../lib/db';
import { formatCurrency, getStationColor } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Trash2, Download, Bot, Pencil, Truck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AIInputModal from '../components/AIInputModal';
import { FleetExpense } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const CAR_REGISTRATIONS = ['KDE 179Y', 'KDL 019S', 'KCY 842Y', 'KCF 119R', 'KDW 028Y'];
const STATIONS = ['Loruk - Ndalu', 'Loruk - Junction', 'Gel - Bungoma', 'Gel - Kapenguria'] as const;
type Station = typeof STATIONS[number];

export default function Fleet({ onNavigateToTruck, onNavigate }: { onNavigateToTruck?: (reg: string) => void, onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { expenses, loading } = useFleetExpenses();
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [carReg, setCarReg] = useState(CAR_REGISTRATIONS[0]);
  const [station, setStation] = useState<Station>(STATIONS[0]);
  const [amount, setAmount] = useState('');
  const [distance, setDistance] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const lastActivity = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      if (!map.has(e.carRegistration) || e.date > map.get(e.carRegistration)!) {
        map.set(e.carRegistration, e.date);
      }
    });
    return map;
  }, [expenses]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCar, setSelectedCar] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // const [showAIModal, setShowAIModal] = useState(false); // Commented out to reduce complexity if unused

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCar !== 'all') result = result.filter(e => e.carRegistration === selectedCar);
    if (selectedStation !== 'all') result = result.filter(e => e.station === selectedStation);
    if (dateFrom) result = result.filter(e => e.date >= new Date(dateFrom).getTime());
    if (dateTo) result = result.filter(e => e.date <= new Date(dateTo).getTime() + 86399999);
    return result;
  }, [expenses, selectedCar, selectedStation, dateFrom, dateTo]);

  const efficiencyTrendData = useMemo(() => {
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = filteredExpenses.filter(e => e.date >= last30Days);
    const groups: Record<string, { totalDist: number, totalAmount: number }> = {};
    recent.forEach(e => {
      const d = format(e.date, 'MMM dd');
      if (!groups[d]) groups[d] = { totalDist: 0, totalAmount: 0 };
      groups[d].totalDist += e.distance || 0;
      groups[d].totalAmount += e.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({
      date,
      efficiency: data.totalAmount > 0 ? data.totalDist / data.totalAmount : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    try {
      const data: Omit<FleetExpense, 'id'> = {
        carRegistration: carReg, station, amount: Number(amount), date: new Date(date).getTime(), createdBy: user?.email || 'Unknown', distance: distance ? Number(distance) : undefined
      };
      if (editingExpenseId) await updateFleetExpense(editingExpenseId, data);
      else await createFleetExpense(data);
      setIsAdding(false);
      setEditingExpenseId(null);
      setAmount(''); setDistance(''); setDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (e) {
      alert('Failed to save expense');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Galana Energy - Fleet Expenses Report', 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Car Reg', 'Station', 'Amount', 'Distance']],
      body: filteredExpenses.map(e => [format(e.date, 'MM/dd/yyyy'), e.carRegistration, e.station || '-', formatCurrency(e.amount), e.distance ? `${e.distance} km` : '-']),
    });
    doc.save(`fleet-expenses-${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-100">Fleet Expenses</h2>
          <p className="text-gray-500">Track fuel consumption logs</p>
        </div>
        <div className="flex gap-3">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('truckDashboard')}
              className="px-5 py-2.5 bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-900/5 cursor-pointer"
            >
               <Truck className="w-5 h-5" />
               Truck Dashboard
            </button>
          )}
          <button onClick={generatePDF} className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"><Download className="w-5 h-5" /> Export</button>
          <button onClick={() => setIsAdding(!isAdding)} className="px-5 py-2.5 bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-900/5 cursor-pointer w-full sm:w-auto"><Plus className="w-5 h-5" /> Add Expense</button>
        </div>
      </div>
      {isAdding && (
        <div className="bg-white/95 dark:bg-blue-950/80 p-6 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 mb-4">{editingExpenseId ? 'Edit' : 'Add'} Expense</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border rounded-lg" />
            <select value={carReg} onChange={(e) => setCarReg(e.target.value)} className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border rounded-lg">{CAR_REGISTRATIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select value={station} onChange={(e) => setStation(e.target.value as Station)} className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border rounded-lg">{STATIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input type="number" required min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border rounded-lg" placeholder="Amount (KES)" />
            <input type="number" min="0" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border rounded-lg" placeholder="Distance (km)" />
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">{editingExpenseId ? 'Update' : 'Save'}</button>
          </form>
        </div>
      )}

      {/* Individual Trucks Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {CAR_REGISTRATIONS.map(reg => {
          const totalConsumption = expenses.filter(e => e.carRegistration === reg).reduce((acc, e) => acc + e.amount, 0);
          const lastDate = lastActivity.get(reg) || 0;
          const isInactive = (Date.now() - lastDate) > 48 * 60 * 60 * 1000;
          return (
            <div 
              key={reg} 
              className={`p-4 border rounded-xl shadow-sm relative ${
                isInactive 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/60' 
                : 'bg-white dark:bg-blue-950 border-gray-200 dark:border-blue-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{reg}</p>
                {isInactive && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </div>
              <h3 className={`text-xl font-bold ${isInactive ? 'text-red-700 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {formatCurrency(totalConsumption)}
              </h3>
            </div>
          );
        })}
      </div>


      {/* Mini Dashboard */}
      <div className="bg-white dark:bg-blue-950 p-6 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-6">
        {/* Filters */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Car</label>
              <select value={selectedCar} onChange={e => setSelectedCar(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Cars</option>
                {CAR_REGISTRATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Station</label>
              <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Stations</option>
                {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
        </div>
        {/* Consumption Summary */}
        <div className="w-full md:w-64 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex flex-col justify-center border border-blue-100 dark:border-blue-800">
           <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Filtered Consumption</p>
           <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
             {formatCurrency(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}
           </h3>
           <p className="text-xs text-blue-500 mt-1">{filteredExpenses.length} logs</p>
        </div>
        
        <div className="flex-1 min-w-[300px] bg-white dark:bg-blue-950 p-4 rounded-lg border border-gray-200 dark:border-blue-900">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Efficiency Trend (Km/KES)</h3>
          <div className="h-32">
            <ResponsiveContainer>
                <LineChart data={efficiencyTrendData}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-blue-950 rounded border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-blue-50 dark:bg-blue-900">
              <th className="px-4 py-3 text-sm">Date</th>
              <th className="px-4 py-3 text-sm">Car</th>
              <th className="px-4 py-3 text-sm">Station</th>
              <th className="px-4 py-3 text-sm text-right">Amount</th>
              <th className="px-4 py-3 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
            {filteredExpenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors duration-300">
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{format(e.date, 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                <td className="px-4 py-3">
                  {e.station && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      e.station === 'Gel - Bungoma' ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200' 
                      : e.station === 'Gel - Kapenguria' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                      : ''
                    }`}>
                      {e.station}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => { setEditingExpenseId(e.id); setCarReg(e.carRegistration); setAmount(e.amount.toString()); setIsAdding(true); }} className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer" title="Edit Expense"><Pencil className="w-4 h-4" /></button>
                    <button 
                      onClick={() => setDeleteDialog({ isOpen: true, id: e.id! })} 
                      className="p-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer" 
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity">
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-150 dark:border-blue-900/40 transform transition-all">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this fleet expense log?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isDeleting}
                onClick={() => setDeleteDialog({ isOpen: false, id: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={async () => {
                  if(!deleteDialog.id) return;
                  setIsDeleting(true);
                  try {
                    await deleteFleetExpense(deleteDialog.id);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsDeleting(false);
                    setDeleteDialog({ isOpen: false, id: null });
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}