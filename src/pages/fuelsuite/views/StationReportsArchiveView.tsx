import React, { useState, useMemo } from 'react';
import { 
  DailyStationReport, 
  StationId, 
  STATIONS, 
  useStationDailyReports, 
  deleteDailyStationReport, 
  markReportReviewed 
} from '../stationReportsDb';
import { formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../lib/auth';
import { format } from 'date-fns';
import { 
  Building2, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Pencil, 
  Eye, 
  FileText, 
  Layers, 
  Check, 
  Clock, 
  Download,
  Fuel,
  Flame,
  DollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  onEditReport: (stationId: StationId, reportDate: string) => void;
  onNavigateToNewReport: () => void;
}

export default function StationReportsArchiveView({ onEditReport, onNavigateToNewReport }: Props) {
  const { user } = useAuth();
  const [stationFilter, setStationFilter] = useState<'all' | StationId>('all');
  const [searchDate, setSearchDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Load reports based on station filter
  const { reports, loading } = useStationDailyReports(stationFilter);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DailyStationReport | null>(null);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (searchDate && r.reportDate !== searchDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesAttendant = (r.attendantName || '').toLowerCase().includes(term);
        const matchesStation = (r.stationName || '').toLowerCase().includes(term);
        const matchesDate = r.reportDate.includes(term);
        if (!matchesAttendant && !matchesStation && !matchesDate) return false;
      }
      return true;
    });
  }, [reports, searchDate, searchTerm]);

  // Aggregate KPI metrics for active view
  const aggregatedStats = useMemo(() => {
    return filteredReports.reduce((acc, r) => {
      const dieselL = r.nozzles?.diesel?.litresSold || 0;
      const superL = r.nozzles?.super?.litresSold || 0;
      const totalFuelL = dieselL + superL;
      const totalSales = r.reportedTotalSales || r.calculatedTotalSales || 0;
      const totalExp = r.totalExpenses || 0;
      const totalPurch = r.purchasesTotal || 0;
      const money = r.moneyLocation?.totalMoney || 0;

      return {
        reportsCount: acc.reportsCount + 1,
        totalFuelLitres: acc.totalFuelLitres + totalFuelL,
        totalSales: acc.totalSales + totalSales,
        totalExpenses: acc.totalExpenses + totalExp,
        totalPurchases: acc.totalPurchases + totalPurch,
        totalMoney: acc.totalMoney + money
      };
    }, {
      reportsCount: 0,
      totalFuelLitres: 0,
      totalSales: 0,
      totalExpenses: 0,
      totalPurchases: 0,
      totalMoney: 0
    });
  }, [filteredReports]);

  // Bulk mark reviewed
  const handleBulkMarkReviewed = async () => {
    for (const reportKey of selectedReportIds) {
      const report = reports.find(r => `${r.stationId}_${r.id}` === reportKey || r.id === reportKey);
      if (report) {
        await markReportReviewed(report.stationId, report.id, user?.email || 'Auditor');
      }
    }
    setSelectedReportIds([]);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDailyStationReport(deleteTarget.stationId, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete report.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* TOP HEADER */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-mono tracking-widest text-[#7C3AED] font-bold">
                Daily Source Records
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-xs font-mono text-theme-text-muted">Audited Station Reports Archive</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-200 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#7C3AED]" />
              <span>Station Reports Archive</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={onNavigateToNewReport}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            <span>Enter Daily Report</span>
          </button>
        </div>

        {/* STATION FILTER TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stationFilter === 'all'
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-900/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Stations (Combined)</span>
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('ndalu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stationFilter === 'ndalu'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Ndalu Station</span>
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('junction')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                stationFilter === 'junction'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Junction Station</span>
            </button>
          </div>

          {/* Search Inputs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              className="px-3 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs text-slate-200 font-mono"
            />
            {searchDate && (
              <button
                type="button"
                onClick={() => setSearchDate('')}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search attendant..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs text-slate-200 placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI STATS ROW FOR CURRENT VIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#000000] border border-white/10 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reports Logged</span>
          <span className="text-xl font-black font-mono text-purple-300 mt-1 block">
            {aggregatedStats.reportsCount}
          </span>
          <span className="text-[10px] text-gray-500">{stationFilter === 'all' ? 'Across both stations' : STATIONS[stationFilter]?.name}</span>
        </div>

        <div className="bg-[#000000] border border-purple-500/30 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fuel Litres Dispensed</span>
          <span className="text-xl font-black font-mono text-[#6D28D9] mt-1 block">
            {aggregatedStats.totalFuelLitres.toLocaleString()} L
          </span>
          <span className="text-[10px] text-purple-400/80 font-mono">AGO & PMS combined</span>
        </div>

        <div className="bg-[#000000] border border-emerald-500/30 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Sales Value</span>
          <span className="text-xl font-black font-mono text-[#059669] mt-1 block">
            {formatCurrency(aggregatedStats.totalSales)}
          </span>
          <span className="text-[10px] text-emerald-400/80 font-mono">Reported shift revenue</span>
        </div>

        <div className="bg-[#000000] border border-purple-500/30 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Operating Expenses</span>
          <span className="text-xl font-black font-mono text-[#6D28D9] mt-1 block">
            {formatCurrency(aggregatedStats.totalExpenses)}
          </span>
          <span className="text-[10px] text-[#6D28D9]/80 font-mono">Station cash outflows</span>
        </div>

        <div className="bg-[#000000] border border-white/10 rounded-xl p-3.5 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Money Accounted</span>
          <span className="text-xl font-black font-mono text-slate-200 mt-1 block">
            {formatCurrency(aggregatedStats.totalMoney)}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">M-Pesa + Cash at hand</span>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedReportIds.length > 0 && (
        <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-between text-xs animate-fade-in">
          <span className="text-slate-200 font-semibold">
            {selectedReportIds.length} reports selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkReviewed}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold cursor-pointer"
            >
              Mark Selected as Reviewed
            </button>
            <button
              type="button"
              onClick={() => setSelectedReportIds([])}
              className="text-gray-400 hover:text-white px-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* MASTER REPORTS TABLE */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredReports.length > 0 && selectedReportIds.length === filteredReports.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedReportIds(filteredReports.map(r => `${r.stationId}_${r.id}`));
                      } else {
                        setSelectedReportIds([]);
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Attendant</th>
                <th className="py-3 px-3 text-right">Diesel Sold</th>
                <th className="py-3 px-3 text-right">Super Sold</th>
                <th className="py-3 px-3 text-right">Other Sales</th>
                <th className="py-3 px-3 text-right">Purchases</th>
                <th className="py-3 px-3 text-right">Expenses</th>
                <th className="py-3 px-3 text-right">Reported Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    Loading daily reports from station database...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    No daily station reports found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReports.map(r => {
                  const uniqueKey = `${r.stationId}_${r.id}`;
                  const isSelected = selectedReportIds.includes(uniqueKey) || selectedReportIds.includes(r.id);
                  const isExpanded = expandedReportId === uniqueKey;

                  return (
                    <React.Fragment key={uniqueKey}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedReportIds(prev => [...prev, uniqueKey]);
                              } else {
                                setSelectedReportIds(prev => prev.filter(k => k !== uniqueKey && k !== r.id));
                              }
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                          {r.reportDate}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                            r.stationId === 'ndalu'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {STATIONS[r.stationId]?.name || r.stationName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-300 font-medium">
                          {r.attendantName || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">
                          {(r.nozzles?.diesel?.litresSold || 0).toLocaleString()} L
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-300">
                          {(r.nozzles?.super?.litresSold || 0).toLocaleString()} L
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-300">
                          {formatCurrency(r.otherSalesTotal || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-400">
                          {formatCurrency(r.purchasesTotal || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#6D28D9]">
                          {formatCurrency(r.totalExpenses || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={r.hasSalesDiscrepancy ? 'text-amber-400' : 'text-slate-100'}>
                            {formatCurrency(r.reportedTotalSales || r.calculatedTotalSales || 0)}
                          </span>
                          {r.hasSalesDiscrepancy && (
                            <span className="block text-[9px] text-amber-400 font-sans">
                              (Var: {formatCurrency(r.salesVariance)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'reviewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : r.status === 'saved'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedReportId(isExpanded ? null : uniqueKey)}
                              className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                              title="Expand Report Details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditReport(r.stationId, r.reportDate)}
                              className="p-1.5 text-purple-400 hover:text-purple-300 rounded hover:bg-purple-500/10 transition-colors"
                              title="Edit Report"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {r.status !== 'reviewed' && (
                              <button
                                type="button"
                                onClick={() => markReportReviewed(r.stationId, r.id, user?.email || 'Auditor')}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/10 transition-colors"
                                title="Mark Reviewed"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 text-gray-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                              title="Delete Report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SECTION DETAILS */}
                      {isExpanded && (
                        <tr className="bg-white/[0.01]">
                          <td colSpan={12} className="p-4 border-y border-white/10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* 1. White-Oil Summary */}
                              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                                <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <Fuel className="w-3.5 h-3.5 text-purple-400" />
                                  <span>White-Oil Nozzle Auditing</span>
                                </h4>
                                <div className="space-y-1 font-mono text-[11px]">
                                  <div className="flex justify-between text-gray-400">
                                    <span>AGO Litres ({r.nozzles?.diesel?.litresSold}L @ {r.nozzles?.diesel?.ratePerLitre}):</span>
                                    <span className="text-emerald-400 font-bold">{formatCurrency(r.nozzles?.diesel?.finalAmount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>PMS Litres ({r.nozzles?.super?.litresSold}L @ {r.nozzles?.super?.ratePerLitre}):</span>
                                    <span className="text-purple-300 font-bold">{formatCurrency(r.nozzles?.super?.finalAmount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400 pt-1 border-t border-white/5">
                                    <span>Closing PMS Balance:</span>
                                    <span className="text-slate-200">{r.closingFuelBalance?.pmsLitres?.toLocaleString() || 0} L</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Closing AGO Balance:</span>
                                    <span className="text-slate-200">{r.closingFuelBalance?.agoLitres?.toLocaleString() || 0} L</span>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Other Sales & Purchases */}
                              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                                <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                                  <span>LPG, Burners & Grills</span>
                                </h4>
                                <div className="space-y-1 font-mono text-[11px]">
                                  <div className="flex justify-between text-gray-400">
                                    <span>Other Sales ({r.otherSales?.length || 0} items):</span>
                                    <span className="text-amber-300 font-bold">{formatCurrency(r.otherSalesTotal || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Stock Purchases ({r.purchases?.length || 0} lines):</span>
                                    <span className="text-purple-400 font-bold">{formatCurrency(r.purchasesTotal || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Purchases Paid Cash:</span>
                                    <span className="text-emerald-400">{formatCurrency(r.purchasesPaidTotal || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Purchases Outstanding Debt:</span>
                                    <span className="text-rose-400">{formatCurrency(r.purchasesDebtTotal || 0)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Debts, Invoices & Money Location */}
                              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                                <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Debts & Money Location</span>
                                </h4>
                                <div className="space-y-1 font-mono text-[11px]">
                                  <div className="flex justify-between text-gray-400">
                                    <span>Customer Debts Given:</span>
                                    <span className="text-[#8B5CF6] font-bold">{formatCurrency(r.totalDebts || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Paid Invoices Collected:</span>
                                    <span className="text-emerald-400 font-bold">{formatCurrency(r.totalPaidInvoices || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>M-Pesa Accounted:</span>
                                    <span className="text-emerald-400">{formatCurrency(r.moneyLocation?.mpesaAmount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-400">
                                    <span>Cash at Hand:</span>
                                    <span className="text-emerald-400">{formatCurrency(r.moneyLocation?.cashAtHand || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#09090b] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-500/5 flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-200">Confirm Daily Report Deletion</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete the daily report for{' '}
                <strong>{STATIONS[deleteTarget.stationId]?.name || deleteTarget.stationName}</strong> on{' '}
                <strong>{deleteTarget.reportDate}</strong>?
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                This deletion will remove this shift from the station store, and will immediately be reflected in related reports, aggregated KPIs, and financial totals.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Cancel (Safe Default)
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-md shadow-rose-900/30 cursor-pointer"
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
