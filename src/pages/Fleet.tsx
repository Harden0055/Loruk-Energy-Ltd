import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useFleetExpenses, createFleetExpense, deleteFleetExpense, updateFleetExpense, useTrucks } from '../lib/db';
import { formatCurrency, getStationColor } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Trash2, Download, Bot, Pencil, Truck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AIInputModal from '../components/AIInputModal';
import { FleetExpense } from '../types';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { setupPdfHeader, addPdfFooter } from '../lib/pdfTemplate';

import { useStations } from '../lib/operationsDb';

const FALLBACK_REGISTRATIONS = ['KDE 179Y', 'KDL 019S', 'KCY 842Y', 'KCF 119R', 'KDW 028Y'];
const FALLBACK_STATIONS = ['Loruk - Ndalu', 'Loruk - Junction', 'Gel - Bungoma', 'Gel - Kapenguria', 'Kengas'];
type Station = string;

export default function Fleet({ onNavigateToTruck, onNavigate }: { onNavigateToTruck?: (reg: string) => void, onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { expenses, loading } = useFleetExpenses();
  const { trucks } = useTrucks();

  const CAR_REGISTRATIONS = useMemo(() => {
    return trucks.length > 0 ? trucks.map(t => t.registration) : FALLBACK_REGISTRATIONS;
  }, [trucks]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [carReg, setCarReg] = useState('');
  
  useEffect(() => {
    if (CAR_REGISTRATIONS.length > 0 && (!carReg || !CAR_REGISTRATIONS.includes(carReg))) {
      setCarReg(CAR_REGISTRATIONS[0]);
    }
  }, [CAR_REGISTRATIONS, carReg]);

  const { stations } = useStations();
  const STATION_OPTIONS = useMemo(() => {
    const activeStations = stations.filter(s => s.status === 'active');
    return activeStations.length > 0 
      ? activeStations.map(s => ({ value: s.name, label: s.tradingAs || s.name }))
      : FALLBACK_STATIONS.map(s => ({ value: s, label: s }));
  }, [stations]);

  const STATIONS = useMemo(() => STATION_OPTIONS.map(o => o.value), [STATION_OPTIONS]);

  const [station, setStation] = useState<string>('');

  useEffect(() => {
    if (STATIONS.length > 0 && (!station || !STATIONS.includes(station))) {
      setStation(STATIONS[0]);
    }
  }, [STATIONS, station]);
  const [amount, setAmount] = useState('');
  const [litres, setLitres] = useState('');
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
    return result.sort((a, b) => (b.createdAt || b.date) - (a.createdAt || a.date));
  }, [expenses, selectedCar, selectedStation, dateFrom, dateTo]);

  const fleetExpensesSummary = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      let car = acc.find(c => c.carRegistration === curr.carRegistration);
      if (!car) {
        car = { carRegistration: curr.carRegistration, Amount: 0 };
        acc.push(car);
      }
      car.Amount += curr.amount;
      return acc;
    }, [] as { carRegistration: string; Amount: number }[])
    .sort((a, b) => b.Amount - a.Amount);
  }, [filteredExpenses]);

  const TruckTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fill="#9ca3af" fontSize={10} onClick={() => onNavigateToTruck?.(payload.value)} className="cursor-pointer hover:fill-blue-500 dark:hover:fill-blue-400">
        {payload.value}
      </text>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    try {
      const data: any = {
        carRegistration: carReg, station, amount: Number(amount), date: new Date(date).getTime(), createdBy: user?.email || 'Unknown'
      };
      if (litres) data.litres = Number(litres);
      
      if (editingExpenseId) await updateFleetExpense(editingExpenseId, data);
      else await createFleetExpense(data);
      setIsAdding(false);
      setEditingExpenseId(null);
      setAmount(''); setLitres(''); setDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (e) {
      console.error(e);
      alert('Failed to save expense: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();

    let currentY = await setupPdfHeader({
      doc,
      title: 'FLEET FUELING REPORT',
      leftBoxLines: [
        'Loruk Energy Limited',
        selectedStation === 'all' ? 'T/A Fleet Operations' : `T/A ${selectedStation}`,
        'P.O BOX 342',
        `Car Reg: ${selectedCar === 'all' ? 'All Cars' : selectedCar}`
      ],
      rightBoxLines: [
        { label: 'From Date    :', value: dateFrom ? format(new Date(dateFrom), 'PPP') : 'All Dates' },
        { label: 'To Date        :', value: dateTo ? format(new Date(dateTo), 'PPP') : 'All Dates' }
      ]
    });

    const totalAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    const carTotals: Record<string, number> = {};
    const stationTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      carTotals[e.carRegistration] = (carTotals[e.carRegistration] || 0) + e.amount;
      if (e.station) {
        stationTotals[e.station] = (stationTotals[e.station] || 0) + e.amount;
      }
    });

    // Small elegant box for total
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(218, 223, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, currentY, 90, 14, 2, 2, 'FD');

    // Text inside box
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text('Total Amount Fueled:', 18, currentY + 9);
    
    // Value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(totalAmount), 62, currentY + 9);
    
    // Reset colors & font for layout
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    currentY += 21;

    // Summary block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('Summary by Car:', 14, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 6;
    
    Object.entries(carTotals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([car, amount]) => {
      doc.text(`${car}: ${formatCurrency(amount)}`, 14, currentY);
      currentY += 6;
    });

    if (selectedStation === 'all') {
      currentY += 2;
      doc.setFont("helvetica", "bold");
      doc.text('Summary by Station:', 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 6;
      
      Object.entries(stationTotals)
        .sort(([, a], [, b]) => b - a)
        .forEach(([station, amount]) => {
        const stationLabel = STATION_OPTIONS.find(opt => opt.value === station)?.label || station;
        doc.text(`${stationLabel}: ${formatCurrency(amount)}`, 14, currentY);
        currentY += 6;
      });
    }

    currentY += 2;

    // Table
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
      bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
      head: [['Date', 'Car Reg', 'Station', 'Litres', 'Amount']],
      body: [...filteredExpenses].sort((a,b) => (a.createdAt || a.date) - (b.createdAt || b.date)).map(e => [
        format(e.date, 'MMM d, yyyy'), 
        e.carRegistration, 
        e.station ? (STATION_OPTIONS.find(opt => opt.value === e.station)?.label || e.station) : '-', 
        e.litres ? `${e.litres} L` : '-',
        `${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`
      ]),
      foot: [['', '', 'Total Amount', '', `${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`]],
    });

    // Footer section
    // @ts-ignore
    addPdfFooter(
      doc, 
      (doc as any).lastAutoTable.finalY + 10, 
      selectedStation === 'all' ? 'All Stations' : `${STATION_OPTIONS.find(opt => opt.value === selectedStation)?.label || selectedStation} Station`,
      'P.O BOX 342'
    );

    doc.save(`fleet-fueling-${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">Fleet Fueling</h2>
          <p className="text-gray-500">Track fuel consumption logs</p>
        </div>
        <div className="flex gap-3">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('truckDashboard')}
              className="px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
               <Truck className="w-5 h-5" />
               Truck Dashboard
            </button>
          )}
          <button onClick={generatePDF} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer"><Download className="w-5 h-5" /> Export</button>
          <button 
            onClick={() => {
              if (editingExpenseId) {
                setEditingExpenseId(null);
                setAmount(''); 
                setLitres(''); 
                setDate(format(new Date(), 'yyyy-MM-dd'));
                setCarReg(CAR_REGISTRATIONS[0]);
                setStation(STATIONS[0]);
                setIsAdding(true);
              } else {
                setIsAdding(!isAdding);
              }
            }} 
            className="px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> Add Expense
          </button>
        </div>
      </div>
      {isAdding && (
        <div id="add-expense-form-container" className="glass-panel p-6 border border-theme-border rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-theme-text mb-4">{editingExpenseId ? 'Edit' : 'Add'} Expense</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            <select value={carReg} onChange={(e) => setCarReg(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">{CAR_REGISTRATIONS.map(r => <option key={r} value={r} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{r}</option>)}</select>
            <select value={station} onChange={(e) => setStation(e.target.value as Station)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">{STATION_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{s.label}</option>)}</select>
            <input type="number" min="0" step="0.1" value={litres} onChange={(e) => setLitres(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Litres (L)" />
            <input type="number" required min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Amount (KES)" />
            <div className="flex gap-2 w-full">
              <button 
                type="submit" 
                className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {editingExpenseId ? 'Update' : 'Save'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingExpenseId(null);
                  setAmount(''); 
                  setLitres(''); 
                  setDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-blue-900/50 text-gray-700 dark:text-gray-300 border border-theme-border rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Individual Trucks Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(() => {
          const stats = CAR_REGISTRATIONS.map(reg => {
            const totalConsumption = expenses.filter(e => e.carRegistration === reg).reduce((acc, e) => acc + e.amount, 0);
            const lastDate = lastActivity.get(reg) || 0;
            const isInactive = (Date.now() - lastDate) > 48 * 60 * 60 * 1000;
            return { reg, totalConsumption, isInactive };
          }).sort((a, b) => b.totalConsumption - a.totalConsumption);
          
          const textColors = [
            'text-cyan-500 dark:text-blue-400',
            'text-emerald-600 dark:text-emerald-400',
            'text-cyan-600 dark:text-cyan-400',
            'text-orange-600 dark:text-orange-400',
            'text-yellow-600 dark:text-yellow-400',
          ];

          return stats.map(({ reg, totalConsumption, isInactive }, index) => {
            const colorClass = textColors[index] || textColors[textColors.length - 1];
            return (
              <div 
                key={reg} 
                className="p-5 border rounded-xl shadow-sm relative bg-blue-50/50 dark:bg-white/5 border-theme-border"
              >
                <div className="flex items-center justify-between mb-2 text-gray-500 dark:text-gray-400">
                  <p className="text-xs font-bold uppercase tracking-widest">{reg}</p>
                  {isInactive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <h3 className={`text-2xl font-black font-mono ${colorClass}`}>
                  {formatCurrency(totalConsumption)}
                </h3>
              </div>
            );
          });
        })()}
      </div>


      {/* Mini Dashboard */}
      <div className="glass-panel p-6 border border-theme-border rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-6">
        {/* Left Column: Filters & Summary */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Car</label>
                <select value={selectedCar} onChange={e => setSelectedCar(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                  <option value="all" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">All Cars</option>
                  {CAR_REGISTRATIONS.map(r => <option key={r} value={r} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Station</label>
                <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                  <option value="all" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">All Stations</option>
                  {STATION_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
              </div>
          </div>
          {/* Consumption Summary */}
          <div className="w-full bg-blue-50 dark:bg-white/5 p-4 rounded-lg flex flex-col justify-center border border-theme-border">
             <p className="text-sm font-medium text-cyan-500 dark:text-blue-400 mb-1">Filtered Consumption</p>
             <h3 className="text-2xl font-bold text-blue-900 dark:text-theme-text">
               {formatCurrency(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}
             </h3>
             <p className="text-xs text-blue-500 mt-1">{filteredExpenses.length} logs</p>
          </div>
        </div>
        
        <div className="flex-1 min-w-[300px] glass-panel p-4 rounded-lg border border-theme-border flex flex-col transition-colors">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
             <Truck className="w-4 h-4" /> Fleet Fueling Comparison
          </h3>
          <div className="h-64 w-full text-xs relative overflow-hidden" >
             {fleetExpensesSummary.length === 0 ? (
               <div className="text-center text-sm text-gray-400 py-8">No fleet fueling logs yet.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%"  minWidth={1} minHeight={1}>
                 <BarChart data={fleetExpensesSummary} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={false} />
                   <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} hide />
                   <YAxis dataKey="carRegistration" type="category" tick={<TruckTick />} stroke="#9ca3af" tickLine={false} axisLine={false} width={80} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#1e3a8a', color: '#f3f4f6', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '12px' }} 
                     cursor={{fill: '#1e40af', opacity: 0.2}} 
                     formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                   />
                   <Bar dataKey="Amount" fill="#3b82f6" radius={0} barSize={12} />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded border border-theme-border shadow-[0_0_15px_rgba(59,130,246,0.3)] overflow-x-auto overflow-y-hidden">
        <table className="modern-table">
          <thead>
            <tr className="modern-tr">
              <th className="modern-th">Date</th>
              <th className="modern-th">Car</th>
              <th className="modern-th">Station</th>
              <th className="modern-th">Litres</th>
              <th className="modern-th">Amount</th>
              <th className="modern-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
            {filteredExpenses.map(e => (
              <tr key={e.id} className="hover:bg-white/5 dark:hover:bg-blue-900/50 transition-colors duration-300">
                <td className="modern-td">{format(e.date, 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 font-semibold text-cyan-500 dark:text-blue-400 cursor-pointer hover:underline glow-blue-text" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                <td className="modern-td">
                  {e.station && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      e.station === 'Gel - Bungoma' ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200' 
                      : e.station === 'Gel - Kapenguria' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                      : e.station === 'Kengas' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                      : ''
                    }`}>
                      {STATION_OPTIONS.find(opt => opt.value === e.station)?.label || e.station}
                    </span>
                  )}
                </td>
                <td className="modern-td">{e.litres ? `${e.litres.toLocaleString()} L` : '-'}</td>
                <td className="modern-td">{formatCurrency(e.amount)}</td>
                <td className="modern-td">
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => { 
                        setEditingExpenseId(e.id); 
                        setCarReg(e.carRegistration); 
                        setAmount(e.amount.toString()); 
                        if (e.station) {
                          setStation(e.station);
                        } else {
                          setStation(STATIONS[0]);
                        }
                        setLitres(e.litres != null ? e.litres.toString() : '');
                        
                        let dateObj = new Date();
                        if (e.date) {
                          const d = new Date(e.date);
                          if (!isNaN(d.getTime())) {
                            dateObj = d;
                          }
                        }
                        setDate(format(dateObj, 'yyyy-MM-dd'));
                        
                        setIsAdding(true); 
                        // Smoothly scroll the page to the top so the form is visible
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      className="p-1 text-cyan-500 hover:text-blue-800 transition-colors cursor-pointer" 
                      title="Edit Expense"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
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
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center p-4 z-[100] transition-opacity">
          <div className="glass-panel w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-150 border-theme-border transform transition-all">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this fleet fueling log?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isDeleting}
                onClick={() => setDeleteDialog({ isOpen: false, id: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-blue-900/50 rounded-lg transition-colors cursor-pointer"
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