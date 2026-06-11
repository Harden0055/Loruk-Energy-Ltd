import React, { useState, useMemo } from 'react';
import { useStationReports, createStationReport, deleteStationReport } from '../lib/db';
import { formatCurrency, getStationColor } from '../lib/utils';
import { format } from 'date-fns';
import { Plus, Trash2, Bot, FileText, AlertTriangle } from 'lucide-react';
import AIInputModal from '../components/AIInputModal';
import { StationReport, PumpReading, StationExpense } from '../types';
import { useAuth } from '../lib/auth';

const STATIONS = ['Loruk - Ndalu', 'Loruk - Junction', 'Gel - Bungoma', 'Gel - Kapenguria'] as const;

export default function StationReports() {
  const { user } = useAuth();
  const { reports, loading } = useStationReports();
  const [isAdding, setIsAdding] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('all');

  const [initialForm, setInitialForm] = useState<Partial<StationReport> | null>(null);

  const filteredReports = useMemo(() => {
    let result = reports;
    if (selectedStation !== 'all') {
      result = result.filter(r => r.station === selectedStation);
    }
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter(r => r.date >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      result = result.filter(r => r.date <= toTime);
    }
    return result;
  }, [reports, selectedStation, dateFrom, dateTo]);

  const handleAIResult = (data: any) => {
    if (data.extractedFields) {
      setInitialForm(data.extractedFields);
      setIsAdding(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStationReport(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete report', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-blue-100">Station Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Track daily gas station shifts and reconciliations.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAIModal(true)}
            className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors border border-blue-200"
          >
            <Bot className="w-4 h-4" />
            AI Auto-Fill
          </button>
          <button 
            onClick={() => {
              setInitialForm(null);
              setIsAdding(true);
            }}
            className="w-full sm:w-auto bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 px-4 py-2 rounded-lg text-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Station</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-100 font-semibold cursor-pointer"
          >
            <option value="all" className="dark:bg-blue-950">All Stations</option>
            {STATIONS.map(s => (
              <option key={s} value={s} className="dark:bg-blue-950">{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-blue-100"
          />
        </div>
      </div>

      {isAdding && (
        <AddReportModal 
          onClose={() => setIsAdding(false)} 
          initialData={initialForm}
          userEmail={user?.email || 'Unknown'}
        />
      )}

      {showAIModal && <AIInputModal onClose={() => setShowAIModal(false)} onResult={handleAIResult} />}

      <div className="grid gap-6">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-blue-200/60 bg-white dark:bg-blue-950 rounded-xl shadow-sm border border-gray-200 dark:border-blue-900 flex flex-col items-center transition-colors">
            <FileText className="w-12 h-12 text-gray-300 dark:text-blue-800 mb-2" />
            <p>No station reports found.</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div key={report.id} className="bg-white dark:bg-blue-950 rounded border border-gray-200 dark:border-blue-900 shadow-sm overflow-hidden transition-colors">
               <div className="px-5 py-3 border-b border-gray-100 dark:border-blue-900 bg-gray-50 dark:bg-blue-900/50 flex justify-between items-center transition-colors">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-blue-100">{format(report.date, 'EEEE, MMM do, yyyy')}</h3>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStationColor(report.station)}`}>
                        {report.station}
                      </span>
                      {report.attendantName && <span className="text-sm text-gray-500 dark:text-gray-400">Attendant: {report.attendantName}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(report.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Pump Readings & Sales */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pump Sales</h4>
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-blue-950 border-b border-gray-200 dark:border-blue-900 transition-colors">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs">Type</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 text-xs">Start</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 text-xs">Stop</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 text-xs">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
                           {report.pumpReadings.map((pr, i) => (
                             <tr key={pr.fuelType + i} className="hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors">
                               <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300 font-medium">{pr.fuelType}</td>
                               <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">{pr.salesStart}</td>
                               <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">{pr.salesStop}</td>
                               <td className="px-3 py-2 text-sm text-right font-mono text-gray-900 dark:text-blue-100">{formatCurrency(pr.salesAmount)}</td>
                             </tr>
                           ))}
                        </tbody>
                      </table>
                    </div>

                    {report.otherSalesAmount > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-blue-900">
                         <span className="text-gray-600 dark:text-gray-400 text-sm">Other Sales: {report.otherSalesDetails}</span>
                         <span className="font-semibold text-gray-900 dark:text-blue-100 text-sm">{formatCurrency(report.otherSalesAmount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center py-2.5 bg-blue-50/50 dark:bg-blue-900/10 px-3 rounded border border-blue-100 dark:border-blue-900/30">
                      <span className="font-bold text-blue-900 dark:text-blue-400 text-sm">Total Sales</span>
                      <span className="font-bold text-blue-900 dark:text-blue-400 text-base">{formatCurrency(report.totalSales)}</span>
                    </div>
                  </div>

                  {/* Right Column: Reconcilliation */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Expenses & Deposits</h4>
                      <div className="space-y-1.5">
                        {report.expenses.map((e, i) => (
                          <div key={i} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600 dark:text-gray-400">{e.description}</span>
                            <span className="text-gray-900 dark:text-gray-300 font-medium">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                         <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-blue-900 mt-1">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Total Expenses</span>
                            <span className="text-gray-900 dark:text-blue-100 font-bold">{formatCurrency(report.totalExpenses)}</span>
                          </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-blue-900/50 p-3 rounded border border-gray-100 dark:border-blue-900">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">M-Pesa</div>
                        <div className="text-base font-bold text-gray-900 dark:text-blue-100">{formatCurrency(report.mpesaAmount)}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-blue-900/50 p-3 rounded border border-gray-100 dark:border-blue-900">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Deposited Bank</div>
                        <div className="text-base font-bold text-gray-900 dark:text-blue-100">{formatCurrency(report.depositedAmount)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 px-3 rounded border border-emerald-100 dark:border-emerald-900/30">
                      <span className="font-bold text-emerald-900 dark:text-emerald-400 text-sm">Cash at Hand</span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-400 text-base">{formatCurrency(report.cashAtHand)}</span>
                    </div>

                    <div className="flex justify-between text-xs py-1.5 px-1 text-gray-500 dark:text-gray-400">
                       <span>Fuel Balance (Diesel): {report.fuelBalanceDiesel || 0} L</span>
                       <span>Fuel Balance (Super): {report.fuelBalanceSuper || 0} L</span>
                    </div>

                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-blue-950 rounded-xl shadow-2xl border border-gray-200 dark:border-blue-900 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-6">
              <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-955/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                <AlertTriangle className="w-8 h-8 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-lg font-bold text-gray-950 dark:text-blue-50">Confirm Deletion</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This cannot be undone</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-base text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
                  Are you sure you want to permanently delete this daily station report? This will remove the recorded sales volume, reconciliations, and expense logs from the database.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-blue-950/20 border-t border-gray-100 dark:border-blue-900 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-200 dark:border-blue-900 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-blue-950 hover:bg-gray-50 dark:hover:bg-blue-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-red-900/10"
                style={{ backgroundColor: '#dc2626' }}
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddReportModal({ onClose, initialData, userEmail }: { onClose: () => void, initialData: any, userEmail: string }) {
  const [station, setStation] = useState<'Loruk - Ndalu' | 'Loruk - Junction'>(initialData?.station && STATIONS.includes(initialData.station) ? initialData.station : STATIONS[0]);
  const [date, setDate] = useState<string>(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [attendantName, setAttendantName] = useState<string>(initialData?.attendantName || '');

  const [pumpReadings, setPumpReadings] = useState<PumpReading[]>(initialData?.pumpReadings || [
    { fuelType: 'Diesel', salesStart: 0, salesStop: 0, salesAmount: 0, litresStart: 0, litresStop: 0, litresVolume: 0 },
    { fuelType: 'Super', salesStart: 0, salesStop: 0, salesAmount: 0, litresStart: 0, litresStop: 0, litresVolume: 0 }
  ]);

  const [otherSalesDetails, setOtherSalesDetails] = useState<string>(initialData?.otherSalesDetails || '');
  const [otherSalesAmount, setOtherSalesAmount] = useState<string>(initialData?.otherSalesAmount ? String(initialData.otherSalesAmount) : '');

  const [mpesaAmount, setMpesaAmount] = useState<string>(initialData?.mpesaAmount ? String(initialData.mpesaAmount) : '');
  const [depositedAmount, setDepositedAmount] = useState<string>(initialData?.depositedAmount ? String(initialData.depositedAmount) : '');
  const [cashAtHand, setCashAtHand] = useState<string>(initialData?.cashAtHand ? String(initialData.cashAtHand) : '');

  const [fuelBalanceDiesel, setFuelBalanceDiesel] = useState<string>(initialData?.fuelBalanceDiesel ? String(initialData.fuelBalanceDiesel) : '');
  const [fuelBalanceSuper, setFuelBalanceSuper] = useState<string>(initialData?.fuelBalanceSuper ? String(initialData.fuelBalanceSuper) : '');

  const [expenses, setExpenses] = useState<StationExpense[]>(initialData?.expenses || []);

  const [loading, setLoading] = useState(false);

  const totalSales = pumpReadings.reduce((sum, p) => sum + Number(p.salesAmount), 0) + Number(otherSalesAmount);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createStationReport({
        station,
        date: new Date(date).getTime(),
        attendantName,
        pumpReadings,
        otherSalesDetails,
        otherSalesAmount: Number(otherSalesAmount),
        totalSales,
        mpesaAmount: Number(mpesaAmount),
        expenses,
        totalExpenses,
        cashAtHand: Number(cashAtHand),
        depositedAmount: Number(depositedAmount),
        fuelBalanceDiesel: Number(fuelBalanceDiesel),
        fuelBalanceSuper: Number(fuelBalanceSuper),
        createdBy: userEmail
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handlePumpReadingChange = (index: number, field: keyof PumpReading, value: string) => {
    const newReadings = [...pumpReadings];
    newReadings[index] = { ...newReadings[index], [field]: Number(value) };
    if (field === 'salesStart' || field === 'salesStop') {
        newReadings[index].salesAmount = newReadings[index].salesStop - newReadings[index].salesStart;
    }
    if (field === 'litresStart' || field === 'litresStop') {
        newReadings[index].litresVolume = newReadings[index].litresStop - newReadings[index].litresStart;
    }
    setPumpReadings(newReadings);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-blue-950 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-colors border border-gray-200 dark:border-blue-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-blue-900 flex justify-between items-center bg-gray-50 dark:bg-blue-900/30">
          <h3 className="font-bold text-gray-900 dark:text-blue-100 text-lg">New Station Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:text-blue-100 text-2xl font-light cursor-pointer">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-blue-950">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Station</label>
              <select value={station} onChange={e => setStation(e.target.value as any)} className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {STATIONS.map(s => <option key={s} value={s} className="dark:bg-blue-950">{s}</option>)}
              </select>
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Attendant Name</label>
               <input type="text" value={attendantName} onChange={e => setAttendantName(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
            </div>
          </div>

          <div>
             <h4 className="font-bold text-gray-900 dark:text-blue-100 mb-4 border-b border-gray-200 dark:border-blue-900 pb-2">Pump Readings</h4>
             <div className="space-y-6">
               {pumpReadings.map((pr, index) => (
                 <div key={index} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end bg-gray-50 dark:bg-blue-900/10 p-4 rounded-lg border border-gray-200 dark:border-blue-900">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-blue-100 mb-2">{pr.fuelType}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Sales Start</label>
                      <input type="number" step="0.01" value={pr.salesStart} onChange={e => handlePumpReadingChange(index, 'salesStart', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded text-gray-900 dark:text-blue-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Sales Stop</label>
                      <input type="number" step="0.01" value={pr.salesStop} onChange={e => handlePumpReadingChange(index, 'salesStop', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded text-gray-900 dark:text-blue-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Sales Amount</label>
                      <input type="number" step="0.01" value={pr.salesAmount} onChange={e => handlePumpReadingChange(index, 'salesAmount', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded font-bold text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Litres Start</label>
                      <input type="number" step="0.01" value={pr.litresStart} onChange={e => handlePumpReadingChange(index, 'litresStart', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded text-gray-900 dark:text-blue-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Litres Stop</label>
                      <input type="number" step="0.01" value={pr.litresStop} onChange={e => handlePumpReadingChange(index, 'litresStop', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded text-gray-900 dark:text-blue-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Litres</label>
                      <input type="number" step="0.01" value={pr.litresVolume} onChange={e => handlePumpReadingChange(index, 'litresVolume', e.target.value)} className="w-full px-2 py-1 text-sm bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded text-gray-900 dark:text-blue-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-blue-100 border-b border-gray-200 dark:border-blue-900 pb-2">Other Sales</h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Details (e.g. Gases, Grills)</label>
                  <input type="text" value={otherSalesDetails} onChange={e => setOtherSalesDetails(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (KES)</label>
                  <input type="number" step="0.01" value={otherSalesAmount} onChange={e => setOtherSalesAmount(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
                </div>
             </div>

             <div className="space-y-4">
               <h4 className="font-bold text-gray-900 dark:text-blue-100 border-b border-gray-200 dark:border-blue-900 pb-2">Cash & Reconciliation</h4>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">M-Pesa Amount</label>
                  <input type="number" step="0.01" value={mpesaAmount} onChange={e => setMpesaAmount(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-lg font-semibold text-gray-900 dark:text-blue-100" />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deposited Amount</label>
                  <input type="number" step="0.01" value={depositedAmount} onChange={e => setDepositedAmount(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-lg font-semibold text-green-600 dark:text-green-400" />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 font-bold">Cash at Hand</label>
                  <input required type="number" step="0.01" value={cashAtHand} onChange={e => setCashAtHand(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-lg font-bold text-gray-900 dark:text-blue-100" />
               </div>
               
               <h4 className="font-bold text-gray-900 dark:text-blue-100 border-b border-gray-200 dark:border-blue-900 pb-2 mt-6">Fuel Balances</h4>
               <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Diesel Balance</label>
                    <input type="number" step="0.01" value={fuelBalanceDiesel} onChange={e => setFuelBalanceDiesel(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
                 </div>
                 <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Super Balance</label>
                    <input type="number" step="0.01" value={fuelBalanceSuper} onChange={e => setFuelBalanceSuper(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-gray-900 dark:text-blue-100" />
                 </div>
               </div>
             </div>
          </div>

          <div>
             <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-blue-900 pb-2">
                  <h4 className="font-bold text-gray-900 dark:text-blue-100">Expenses</h4>
                  <button type="button" onClick={() => setExpenses([...expenses, { description: '', amount: 0 }])} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer">
                    <Plus className="w-4 h-4"/> Add Expense
                  </button>
             </div>
             {expenses.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No expenses recorded.</p> : (
                <div className="space-y-3">
                  {expenses.map((e, index) => (
                    <div key={index} className="flex gap-4">
                      <input type="text" required placeholder="Description" value={e.description} onChange={ev => {
                         const newE = [...expenses];
                         newE[index].description = ev.target.value;
                         setExpenses(newE);
                      }} className="flex-1 px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-sm text-gray-900 dark:text-blue-100" />
                      <input type="number" required placeholder="Amount" value={e.amount || ''} onChange={ev => {
                         const newE = [...expenses];
                         newE[index].amount = Number(ev.target.value);
                         setExpenses(newE);
                      }} className="w-32 px-3 py-2 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-805 rounded-lg text-sm text-gray-900 dark:text-blue-100" />
                      <button type="button" onClick={() => setExpenses(expenses.filter((_, i) => i !== index))} className="p-2 text-red-500 hover:bg-red-55 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
             )}
          </div>

          {/* Summary Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex flex-wrap justify-between items-center gap-4">
             <div>
                <span className="block text-sm text-blue-600 dark:text-blue-400 font-semibold">Calculated Total Sales</span>
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatCurrency(totalSales)}</span>
             </div>
             <div>
                <span className="block text-sm text-orange-600 dark:text-orange-400 font-semibold">Total Expenses</span>
                <span className="text-2xl font-bold text-orange-900 dark:text-orange-200">{formatCurrency(totalExpenses)}</span>
             </div>
          </div>
          
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-blue-900 bg-gray-50 dark:bg-blue-900/20 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-blue-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-blue-900 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
