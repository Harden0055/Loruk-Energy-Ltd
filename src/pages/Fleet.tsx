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
const FALLBACK_STATIONS = ['Loruk - Ndalu', 'Loruk - Junction', 'Gel - Bungoma', 'Bendera', 'Gel - Kapenguria', 'Kengas', 'Luqman'];
type Station = string;

export default function Fleet({ 
  onNavigateToTruck, 
  onNavigate,
  onNavigateToStation 
}: { 
  onNavigateToTruck?: (reg: string) => void;
  onNavigate?: (page: string) => void;
  onNavigateToStation?: (id: string, name: string) => void;
}) {
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
    
    const formatLabel = (label: string) => {
      let l = label.replace(/^T\/A\s+/i, '');
      if (l.toLowerCase() === 'gel kapenguria') return 'Gel - Kapenguria';
      if (l.toLowerCase() === 'gel bungoma') return 'Gel - Bungoma';
      if (l.toLowerCase() === 'loruk ndalu') return 'Loruk - Ndalu';
      if (l.toLowerCase() === 'loruk junction') return 'Loruk - Junction';
      return l;
    };

    let options = activeStations.length > 0 
      ? activeStations.map(s => {
          const name = formatLabel(s.tradingAs || s.name);
          return { value: name, label: name };
        })
      : FALLBACK_STATIONS.map(s => {
          const name = formatLabel(s);
          return { value: name, label: name };
        });

    const existingValues = new Set(options.map(o => o.value));
    expenses.forEach(e => {
      if (e.station && !existingValues.has(e.station)) {
        options.push({ value: e.station, label: formatLabel(e.station) });
        existingValues.add(e.station);
      }
    });

    return options;
  }, [stations, expenses]);

  const STATIONS = useMemo(() => STATION_OPTIONS.map(o => o.value), [STATION_OPTIONS]);

  const [station, setStation] = useState<string>('');

  useEffect(() => {
    if (STATIONS.length > 0 && (!station || !STATIONS.includes(station))) {
      setStation(STATIONS[0]);
    }
  }, [STATIONS, station]);
  const [amount, setAmount] = useState('');
  const [litres, setLitres] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (isAdding && carReg && station) {
      const savedRate = localStorage.getItem(`fleet_rate_${carReg}_${station}`);
      if (savedRate) {
        setRate(savedRate);
      }
    }
  }, [carReg, station, isAdding]);

  useEffect(() => {
    if (carReg && station && rate && isAdding) {
      localStorage.setItem(`fleet_rate_${carReg}_${station}`, rate);
    }
  }, [carReg, station, rate, isAdding]);

  const roundVal = (num: number) => {
    if (isNaN(num) || !isFinite(num)) return '';
    return (Math.round(num * 100) / 100).toString();
  };

  const handleLitresChange = (val: string) => {
    setLitres(val);
    const l = parseFloat(val);
    const r = parseFloat(rate);
    const a = parseFloat(amount);

    if (!isNaN(l) && l > 0) {
      if (!isNaN(r) && r > 0) {
        setAmount(roundVal(l * r));
      } else if (!isNaN(a) && a > 0) {
        setRate(roundVal(a / l));
      }
    }
  };

  const handleRateChange = (val: string) => {
    setRate(val);
    const r = parseFloat(val);
    const l = parseFloat(litres);
    const a = parseFloat(amount);

    if (!isNaN(r) && r > 0) {
      if (!isNaN(l) && l > 0) {
        setAmount(roundVal(l * r));
      } else if (!isNaN(a) && a > 0) {
        setLitres(roundVal(a / r));
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const a = parseFloat(val);
    const l = parseFloat(litres);
    const r = parseFloat(rate);

    if (!isNaN(a) && a > 0) {
      if (!isNaN(l) && l > 0) {
        setRate(roundVal(a / l));
      } else if (!isNaN(r) && r > 0) {
        setLitres(roundVal(a / r));
      }
    }
  };
  
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

  // Calculate truck fueling counts per station for dynamic green intensity
  const stationTruckCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {
      'ndalu': new Set(),
      'junction': new Set()
    };
    expenses.forEach(e => {
      const s = (e.station || '').toLowerCase();
      if (s.includes('ndalu') && e.carRegistration) {
        counts.ndalu.add(e.carRegistration);
      } else if (s.includes('junction') && e.carRegistration) {
        counts.junction.add(e.carRegistration);
      }
    });
    return {
      ndaluCount: counts.ndalu.size,
      junctionCount: counts.junction.size,
    };
  }, [expenses]);

  const getStationBadgeStyle = (stationName: string) => {
    const s = (stationName || '').toLowerCase();
    // Gel-Bungoma and Bendera: deep purple
    if (s.includes('bungoma') || s.includes('bendera')) {
      return 'bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/40 shadow-[0_0_10px_rgba(124,58,237,0.25)]';
    }
    // Ndalu and Junction: slightly purple after Gel-Bungoma and Bendera
    if (s.includes('ndalu') || s.includes('junction')) {
      return 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
    }
    // The rest: slightly green
    return 'bg-emerald-500/15 text-[#059669] border border-emerald-500/30';
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCar !== 'all') result = result.filter(e => e.carRegistration === selectedCar);
    if (selectedStation !== 'all') result = result.filter(e => e.station === selectedStation);
    if (dateFrom) result = result.filter(e => e.date >= new Date(dateFrom).getTime());
    if (dateTo) result = result.filter(e => e.date <= new Date(dateTo).getTime() + 86399999);
    return result.sort((a, b) => b.date - a.date);
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
      <text x={x} y={y} dy={4} textAnchor="end" fill="#9ca3af" fontSize={10} onClick={() => onNavigateToTruck?.(payload.value)} className="cursor-pointer hover:fill-purple-400">
        {payload.value}
      </text>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    try {
      const data: any = {
        carRegistration: carReg, 
        station, 
        amount: Number(amount), 
        date: new Date(date).getTime(), 
        createdBy: user?.email || 'Unknown'
      };
      if (litres && !isNaN(Number(litres))) data.litres = Number(litres);
      if (rate && !isNaN(Number(rate))) {
        data.rate = Number(rate);
      } else if (litres && Number(litres) > 0 && amount && Number(amount) > 0) {
        data.rate = Number((Number(amount) / Number(litres)).toFixed(2));
      }
      
      if (editingExpenseId) await updateFleetExpense(editingExpenseId, data);
      else await createFleetExpense(data);
      setIsAdding(false);
      setEditingExpenseId(null);
      setAmount(''); 
      setLitres(''); 
      setRate('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
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
    const totalLitres = filteredExpenses.reduce((acc, e) => acc + (e.litres || 0), 0);

    const carTotals: Record<string, number> = {};
    const carLitres: Record<string, number> = {};
    const stationTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      carTotals[e.carRegistration] = (carTotals[e.carRegistration] || 0) + e.amount;
      carLitres[e.carRegistration] = (carLitres[e.carRegistration] || 0) + (e.litres || 0);
      if (e.station) {
        stationTotals[e.station] = (stationTotals[e.station] || 0) + e.amount;
      }
    });

    // Small elegant box for total
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(218, 223, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, currentY, 130, 14, 2, 2, 'FD');

    // Text inside box
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text('Total Amount Fueled:', 18, currentY + 9);
    
    // Value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(totalAmount), 58, currentY + 9);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text('Total Litres:', 96, currentY + 9);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`${totalLitres.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`, 118, currentY + 9);
    
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
      const litresForCar = carLitres[car] || 0;
      doc.text(`${car}: ${formatCurrency(amount)} (${litresForCar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L)`, 14, currentY);
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
      body: [...filteredExpenses].sort((a,b) => a.date - b.date).map(e => [
        format(e.date, 'MMM d, yyyy'), 
        e.carRegistration, 
        e.station ? (STATION_OPTIONS.find(opt => opt.value === e.station)?.label || e.station) : '-', 
        e.litres ? `${e.litres} L` : '-',
        `${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`
      ]),
      foot: [['', '', 'Total', `${totalLitres.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`, `${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`]],
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
    <div className="space-y-3 font-sans">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-theme-text">Fleet Fueling</h2>
          <p className="text-xs text-gray-500">Track fuel consumption logs</p>
        </div>
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('truckDashboard')}
              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
               <Truck className="w-4 h-4 text-purple-400" />
               Truck Dashboard
            </button>
          )}
          <button onClick={generatePDF} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
            <Download className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={() => {
              if (editingExpenseId) {
                setEditingExpenseId(null);
                setAmount(''); 
                setLitres(''); 
                setRate('');
                setDate(format(new Date(), 'yyyy-MM-dd'));
                setCarReg(CAR_REGISTRATIONS[0]);
                setStation(STATIONS[0]);
                setIsAdding(true);
              } else {
                setIsAdding(!isAdding);
              }
            }} 
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>
      {isAdding && (
        <div id="add-expense-form-container" className="glass-panel p-3.5 border border-theme-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-theme-text">{editingExpenseId ? 'Edit' : 'Add'} Expense</h3>
            <span className="text-[10px] text-purple-300 font-medium bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded">
              ⚡ Rate × Litres = Amount auto-calculation
            </span>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2.5 py-1.5 glass-panel border border-theme-border rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Vehicle</label>
              <select value={carReg} onChange={(e) => setCarReg(e.target.value)} className="w-full px-2.5 py-1.5 glass-panel border border-theme-border rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs">{CAR_REGISTRATIONS.map(r => <option key={r} value={r} className="bg-black text-white">{r}</option>)}</select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Station</label>
              <select value={station} onChange={(e) => setStation(e.target.value as Station)} className="w-full px-2.5 py-1.5 glass-panel border border-theme-border rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs">{STATION_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>)}</select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Litres (L)</label>
              <input type="number" min="0" step="0.01" value={litres} onChange={(e) => handleLitresChange(e.target.value)} className="w-full px-2.5 py-1.5 glass-panel border border-theme-border rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-mono" placeholder="Litres" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-purple-400 mb-0.5 flex items-center justify-between">
                <span>Rate (KES/L)</span>
                <span className="text-[9px] text-gray-400 font-normal">Auto</span>
              </label>
              <input type="number" min="0" step="0.01" value={rate} onChange={(e) => handleRateChange(e.target.value)} className="w-full px-2.5 py-1.5 glass-panel border border-purple-500/40 rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-mono placeholder:text-gray-500" placeholder="Rate" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Amount (KES)</label>
              <input type="number" required min="0" step="0.01" value={amount} onChange={(e) => handleAmountChange(e.target.value)} className="w-full px-2.5 py-1.5 glass-panel border border-theme-border rounded-md text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs font-mono" placeholder="Amount" />
            </div>
            <div className="flex gap-1.5 w-full col-span-2 sm:col-span-1">
              <button 
                type="submit" 
                className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer text-xs"
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
                  setRate('');
                  setDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-theme-border rounded-md font-semibold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Individual Trucks Summary - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {(() => {
          const stats = CAR_REGISTRATIONS.map(reg => {
            const totalConsumption = expenses.filter(e => e.carRegistration === reg).reduce((acc, e) => acc + e.amount, 0);
            const lastDate = lastActivity.get(reg) || 0;
            const isInactive = (Date.now() - lastDate) > 48 * 60 * 60 * 1000;
            return { reg, totalConsumption, isInactive };
          }).sort((a, b) => b.totalConsumption - a.totalConsumption);
          
          return stats.map(({ reg, totalConsumption, isInactive }, index) => {
            // Strict deepcharts theme: only purple or green alternating
            const isPurple = index % 2 === 0;
            const colorClass = isPurple ? 'text-[#7C3AED]' : 'text-[#059669]';
            const bgClass = isPurple ? 'bg-purple-500/[0.04] border-purple-500/25' : 'bg-emerald-500/[0.04] border-emerald-500/25';
            return (
              <div 
                key={reg} 
                className={`px-3 py-2 border rounded-lg shadow-sm relative ${bgClass} cursor-pointer hover:scale-[1.02] transition-transform`}
                onClick={() => onNavigateToTruck?.(reg)}
              >
                <div className="flex items-center justify-between mb-1 text-gray-400">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C3AED] hover:underline truncate">{reg}</p>
                  {isInactive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                    </span>
                  )}
                </div>
                <h3 className={`text-sm sm:text-base font-black font-mono ${colorClass} truncate`}>
                  {formatCurrency(totalConsumption)}
                </h3>
              </div>
            );
          });
        })()}
      </div>

      {/* Mini Dashboard & KPI Graph - Compact */}
      <div className="glass-panel p-3 sm:p-3.5 border border-theme-border rounded-xl shadow-sm mb-3 flex flex-col lg:flex-row gap-3">
        {/* Left Column: Filters & Summary */}
        <div className="flex-1 flex flex-col justify-between gap-2.5">
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Car</label>
                <select value={selectedCar} onChange={e => setSelectedCar(e.target.value)} className="w-full px-2 py-1 glass-panel border border-theme-border rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm">
                  <option value="all" className="bg-black text-white">All Cars</option>
                  {CAR_REGISTRATIONS.map(r => <option key={r} value={r} className="bg-black text-white">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Station</label>
                <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} className="w-full px-2 py-1 glass-panel border border-theme-border rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm">
                  <option value="all" className="bg-black text-white">All Stations</option>
                  {STATION_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-1 glass-panel border border-theme-border rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-0.5">To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-1 glass-panel border border-theme-border rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm" />
              </div>
          </div>
          {/* Consumption Summary */}
          <div className="w-full bg-purple-500/[0.04] px-3 py-2 rounded-lg flex items-center justify-between border border-purple-500/25">
             <div>
               <p className="text-xs font-semibold text-purple-300">Filtered Total</p>
               <p className="text-[10px] text-emerald-400 font-semibold">{filteredExpenses.length} logs</p>
             </div>
             <h3 className="text-base sm:text-lg font-black font-mono text-[#7C3AED]">
               {formatCurrency(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}
             </h3>
          </div>
        </div>
        
        {/* Right Column: KPI Comparison Graph (Retained & Compact) */}
        <div className="lg:w-[380px] xl:w-[420px] glass-panel p-2.5 rounded-lg border border-theme-border flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
             <Truck className="w-3.5 h-3.5 text-purple-400" /> Fleet Fueling Comparison
          </h3>
          <div className="h-32 sm:h-36 w-full text-xs relative overflow-hidden">
             {fleetExpensesSummary.length === 0 ? (
               <div className="text-center text-xs text-gray-400 py-6">No fleet fueling logs yet.</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                 <BarChart data={fleetExpensesSummary} layout="vertical" margin={{ left: 5, right: 10, top: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.15} horizontal={false} />
                   <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} hide />
                   <YAxis dataKey="carRegistration" type="category" tick={<TruckTick />} stroke="#9ca3af" tickLine={false} axisLine={false} width={75} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#09090b', color: '#f3f4f6', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '8px', fontSize: '11px', padding: '4px 8px' }} 
                     cursor={{fill: 'rgba(124,58,237,0.15)'}} 
                     formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                   />
                   <Bar dataKey="Amount" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={10} />
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded border border-theme-border shadow-[0_0_15px_rgba(124,58,237,0.15)] overflow-x-auto overflow-y-hidden">
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
          <tbody className="divide-y divide-white/5">
            {filteredExpenses.map(e => (
              <tr key={e.id} className="hover:bg-white/5 transition-colors duration-300">
                <td className="modern-td">{format(e.date, 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 font-semibold text-[#7C3AED] hover:text-purple-300 cursor-pointer hover:underline font-bold transition-colors" onClick={() => onNavigateToTruck?.(e.carRegistration)}>{e.carRegistration}</td>
                <td className="modern-td">
                  {e.station && (
                    <button
                      type="button"
                      onClick={() => onNavigateToStation?.(e.station, e.station)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${getStationBadgeStyle(e.station)}`}
                      title={`Open ${e.station} Dashboard`}
                    >
                      <span>{STATION_OPTIONS.find(opt => opt.value === e.station)?.label || e.station}</span>
                    </button>
                  )}
                </td>
                <td className="modern-td">{e.litres ? `${e.litres.toLocaleString()} L` : '-'}</td>
                <td className="modern-td !text-[#7C3AED] font-mono font-bold text-base">{formatCurrency(e.amount)}</td>
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
                        setRate(e.rate != null ? e.rate.toString() : (e.litres && e.amount && e.litres > 0 ? (e.amount / e.litres).toFixed(2) : ''));
                        
                        let dateObj = new Date();
                        if (e.date) {
                          const d = new Date(e.date);
                          if (!isNaN(d.getTime())) {
                            dateObj = d;
                          }
                        }
                        setDate(format(dateObj, 'yyyy-MM-dd'));
                        
                        setIsAdding(true); 
                        // Smoothly scroll the page to the form
                        setTimeout(() => {
                          document.getElementById('add-expense-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }} 
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer" 
                      title="Edit Expense"
                    >
                      <Pencil className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button 
                      onClick={() => setDeleteDialog({ isOpen: true, id: e.id! })} 
                      className="p-1 text-pink-400 hover:text-pink-300 transition-colors cursor-pointer" 
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4 text-pink-400" />
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