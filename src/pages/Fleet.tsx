import React, { useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { useFleetExpenses, createFleetExpense, deleteFleetExpense, updateFleetExpense } from '../lib/db';
import { formatCurrency, getStationColor } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Trash2, Download, Bot, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AIInputModal from '../components/AIInputModal';
import { FleetExpense } from '../types';

const CAR_REGISTRATIONS = ['KDE 179Y', 'KDL 019S', 'KCY 842Y', 'KCF 119R', 'KDW 028Y'];
const STATIONS = ['Loruk - Ndalu', 'Loruk - Junction', 'Gel - Bungoma', 'Gel - Kapenguria'] as const;
type Station = typeof STATIONS[number];

export default function Fleet({ onNavigateToTruck }: { onNavigateToTruck?: (reg: string) => void }) {
  const { user } = useAuth();
  const { expenses, loading } = useFleetExpenses();
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [carReg, setCarReg] = useState(CAR_REGISTRATIONS[0]);
  const [station, setStation] = useState<Station>(STATIONS[0]);
  const [amount, setAmount] = useState('');
  const [distance, setDistance] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [selectedCar, setSelectedCar] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCar !== 'all') result = result.filter(e => e.carRegistration === selectedCar);
    if (selectedStation !== 'all') result = result.filter(e => e.station === selectedStation);
    if (dateFrom) result = result.filter(e => e.date >= new Date(dateFrom).getTime());
    if (dateTo) result = result.filter(e => e.date <= new Date(dateTo).getTime() + 86399999);
    return result;
  }, [expenses, selectedCar, selectedStation, dateFrom, dateTo]);

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
          <button onClick={generatePDF} className="bg-blue-50 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 border border-blue-200 cursor-pointer"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Expense</button>
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

      <div className="bg-white dark:bg-blue-950 rounded border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] overflow-hidden">
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
                  <button onClick={() => { setEditingExpenseId(e.id); setCarReg(e.carRegistration); setAmount(e.amount.toString()); setIsAdding(true); }} className="p-1 text-blue-600"><Pencil className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}