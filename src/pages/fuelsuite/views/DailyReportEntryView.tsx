import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DailyStationReport, 
  StationId, 
  STATIONS, 
  NozzleReading, 
  OtherSaleItem, 
  ReportPurchaseItem, 
  ReportInvoiceItem, 
  ReportExpenseItem, 
  calculateNozzle, 
  createEmptyReport, 
  saveDailyStationReport, 
  checkReportExists, 
  deleteDailyStationReport, 
  markReportReviewed 
} from '../stationReportsDb';
import { formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../lib/auth';
import { format } from 'date-fns';
import { 
  Fuel, 
  Flame, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Bot, 
  Eye, 
  X, 
  FileText, 
  DollarSign, 
  Calendar, 
  Building2, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  ZoomIn, 
  ZoomOut,
  Clock,
  Layers,
  HelpCircle,
  Pencil
} from 'lucide-react';

interface Props {
  initialStation?: StationId;
  initialDate?: string;
  onReportSaved?: (report: DailyStationReport) => void;
  onNavigateToArchive?: () => void;
}

export default function DailyReportEntryView({ 
  initialStation = 'ndalu', 
  initialDate, 
  onReportSaved,
  onNavigateToArchive 
}: Props) {
  const { user } = useAuth();

  // Static sticky date
  const [stationId, setStationId] = useState<StationId>(initialStation);
  const [reportDate, setReportDate] = useState<string>(() => {
    return initialDate || localStorage.getItem('last_static_date') || format(new Date(), 'yyyy-MM-dd');
  });

  const [report, setReport] = useState<DailyStationReport>(() => createEmptyReport(initialStation, reportDate));
  const [existingReport, setExistingReport] = useState<DailyStationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI Extraction state
  const [entryMode, setEntryMode] = useState<'manual' | 'ai'>('manual');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Row Delete Confirm Modal state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'purchase' | 'invoice' | 'expense' | 'other_sale' | 'report';
    id: string;
    label: string;
  } | null>(null);

  // Check if a report already exists whenever station or date changes
  useEffect(() => {
    let active = true;
    const verifyExisting = async () => {
      setLoading(true);
      const existing = await checkReportExists(stationId, reportDate);
      if (!active) return;
      setExistingReport(existing);
      if (existing) {
        setReport(existing);
      } else {
        setReport(createEmptyReport(stationId, reportDate));
      }
      setLoading(false);
    };
    verifyExisting();
    return () => { active = false; };
  }, [stationId, reportDate]);

  // Handle station change
  const handleStationChange = (newStationId: StationId) => {
    setStationId(newStationId);
    setReport(prev => ({
      ...prev,
      stationId: newStationId,
      stationName: STATIONS[newStationId]?.name || ''
    }));
  };

  // Handle date change and sync to static date storage
  const handleDateChange = (newDate: string) => {
    setReportDate(newDate);
    localStorage.setItem('last_static_date', newDate);
    setReport(prev => ({
      ...prev,
      reportDate: newDate,
      id: newDate
    }));
  };

  // ---------------- NOZZLE RECALCULATION ----------------
  const updateNozzle = (fuelType: 'diesel' | 'super', updates: Partial<NozzleReading>) => {
    setReport(prev => {
      const currentNozzle = prev.nozzles[fuelType];
      const recalculated = calculateNozzle({
        salesStart: updates.salesStart !== undefined ? updates.salesStart : currentNozzle.salesStart,
        salesStop: updates.salesStop !== undefined ? updates.salesStop : currentNozzle.salesStop,
        litresStart: updates.litresStart !== undefined ? updates.litresStart : currentNozzle.litresStart,
        litresStop: updates.litresStop !== undefined ? updates.litresStop : currentNozzle.litresStop,
        ratePerLitre: updates.ratePerLitre !== undefined ? updates.ratePerLitre : currentNozzle.ratePerLitre,
        manualSubtract: updates.manualSubtract !== undefined ? updates.manualSubtract : currentNozzle.manualSubtract
      });

      const nextNozzles = {
        ...prev.nozzles,
        [fuelType]: recalculated
      };

      // Recalculate total sales
      const calcTotal = Math.round((nextNozzles.diesel.finalAmount + nextNozzles.super.finalAmount + prev.otherSalesTotal) * 100) / 100;
      const salesVariance = Math.round((prev.reportedTotalSales - calcTotal) * 100) / 100;

      return {
        ...prev,
        nozzles: nextNozzles,
        calculatedTotalSales: calcTotal,
        salesVariance,
        hasSalesDiscrepancy: Math.abs(salesVariance) > 0.05
      };
    });
  };

  // ---------------- OTHER SALES HANDLERS ----------------
  const addOtherSaleRow = () => {
    const newItem: OtherSaleItem = {
      id: `os-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      item: '13KG LPG Refill',
      quantity: 1,
      unitPrice: 2800,
      reportedAmount: 2800,
      calculatedAmount: 2800
    };
    setReport(prev => {
      const nextList = [...prev.otherSales, newItem];
      const otherSalesTotal = nextList.reduce((sum, item) => sum + (item.reportedAmount || 0), 0);
      const calcTotal = Math.round((prev.nozzles.diesel.finalAmount + prev.nozzles.super.finalAmount + otherSalesTotal) * 100) / 100;
      return {
        ...prev,
        otherSales: nextList,
        otherSalesTotal,
        calculatedTotalSales: calcTotal,
        salesVariance: Math.round((prev.reportedTotalSales - calcTotal) * 100) / 100,
        hasSalesDiscrepancy: Math.abs(prev.reportedTotalSales - calcTotal) > 0.05
      };
    });
  };

  const updateOtherSaleRow = (id: string, field: keyof OtherSaleItem, value: any) => {
    setReport(prev => {
      const nextList = prev.otherSales.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const q = Number(field === 'quantity' ? value : item.quantity) || 0;
          const p = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
          updated.calculatedAmount = Math.round(q * p * 100) / 100;
          if (field === 'unitPrice' || field === 'quantity') {
            updated.reportedAmount = updated.calculatedAmount;
          }
        }
        return updated;
      });
      const otherSalesTotal = nextList.reduce((sum, item) => sum + (item.reportedAmount || 0), 0);
      const calcTotal = Math.round((prev.nozzles.diesel.finalAmount + prev.nozzles.super.finalAmount + otherSalesTotal) * 100) / 100;
      return {
        ...prev,
        otherSales: nextList,
        otherSalesTotal,
        calculatedTotalSales: calcTotal,
        salesVariance: Math.round((prev.reportedTotalSales - calcTotal) * 100) / 100,
        hasSalesDiscrepancy: Math.abs(prev.reportedTotalSales - calcTotal) > 0.05
      };
    });
  };

  const removeOtherSaleRow = (id: string) => {
    setReport(prev => {
      const nextList = prev.otherSales.filter(item => item.id !== id);
      const otherSalesTotal = nextList.reduce((sum, item) => sum + (item.reportedAmount || 0), 0);
      const calcTotal = Math.round((prev.nozzles.diesel.finalAmount + prev.nozzles.super.finalAmount + otherSalesTotal) * 100) / 100;
      return {
        ...prev,
        otherSales: nextList,
        otherSalesTotal,
        calculatedTotalSales: calcTotal,
        salesVariance: Math.round((prev.reportedTotalSales - calcTotal) * 100) / 100,
        hasSalesDiscrepancy: Math.abs(prev.reportedTotalSales - calcTotal) > 0.05
      };
    });
  };

  // ---------------- PURCHASES HANDLERS (LPG, BURNERS, GRILLS) ----------------
  const addPurchaseRow = () => {
    const newItem: ReportPurchaseItem = {
      id: `pch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      item: '13KG Empty Cylinders',
      quantity: 10,
      unit: 'Cylinders',
      unitCost: 1800,
      totalCost: 18000,
      supplier: 'National Oil',
      invoiceRef: '',
      paymentStatus: 'paid',
      amountPaid: 18000,
      amountOutstanding: 0
    };
    setReport(prev => {
      const nextList = [...prev.purchases, newItem];
      return recalculatePurchases(prev, nextList);
    });
  };

  const updatePurchaseRow = (id: string, field: keyof ReportPurchaseItem, value: any) => {
    setReport(prev => {
      const nextList = prev.purchases.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          const q = Number(field === 'quantity' ? value : item.quantity) || 0;
          const c = Number(field === 'unitCost' ? value : item.unitCost) || 0;
          updated.totalCost = Math.round(q * c * 100) / 100;
          if (updated.paymentStatus === 'paid') {
            updated.amountPaid = updated.totalCost;
            updated.amountOutstanding = 0;
          } else {
            updated.amountOutstanding = updated.totalCost;
            updated.amountPaid = 0;
          }
        }
        if (field === 'paymentStatus') {
          if (value === 'paid') {
            updated.amountPaid = updated.totalCost;
            updated.amountOutstanding = 0;
          } else {
            updated.amountOutstanding = updated.totalCost;
            updated.amountPaid = 0;
          }
        }
        if (field === 'amountPaid') {
          const paid = Number(value) || 0;
          updated.amountPaid = paid;
          updated.amountOutstanding = Math.max(0, Math.round((updated.totalCost - paid) * 100) / 100);
        }
        return updated;
      });
      return recalculatePurchases(prev, nextList);
    });
  };

  const removePurchaseRow = (id: string) => {
    setReport(prev => {
      const nextList = prev.purchases.filter(item => item.id !== id);
      return recalculatePurchases(prev, nextList);
    });
  };

  const recalculatePurchases = (prev: DailyStationReport, nextList: ReportPurchaseItem[]) => {
    const purchasesTotal = nextList.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const purchasesPaidTotal = nextList.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
    const purchasesDebtTotal = nextList.reduce((sum, item) => sum + (item.amountOutstanding || 0), 0);
    return {
      ...prev,
      purchases: nextList,
      purchasesTotal,
      purchasesPaidTotal,
      purchasesDebtTotal
    };
  };

  // ---------------- DEBTS & INVOICES HANDLERS ----------------
  const addInvoiceRow = () => {
    const newItem: ReportInvoiceItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerOrDescription: '',
      type: 'debt',
      amount: 0,
      reference: ''
    };
    setReport(prev => {
      const nextList = [...prev.invoices, newItem];
      return recalculateInvoices(prev, nextList);
    });
  };

  const updateInvoiceRow = (id: string, field: keyof ReportInvoiceItem, value: any) => {
    setReport(prev => {
      const nextList = prev.invoices.map(item => item.id === id ? { ...item, [field]: value } : item);
      return recalculateInvoices(prev, nextList);
    });
  };

  const removeInvoiceRow = (id: string) => {
    setReport(prev => {
      const nextList = prev.invoices.filter(item => item.id !== id);
      return recalculateInvoices(prev, nextList);
    });
  };

  const recalculateInvoices = (prev: DailyStationReport, nextList: ReportInvoiceItem[]) => {
    const totalDebts = nextList.filter(i => i.type === 'debt').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalPaidInvoices = nextList.filter(i => i.type === 'paid_invoice').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    return {
      ...prev,
      invoices: nextList,
      totalDebts,
      totalPaidInvoices
    };
  };

  // ---------------- EXPENSES HANDLERS ----------------
  const addExpenseRow = () => {
    const newItem: ReportExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: 'Lunch',
      description: 'Attendant lunch allowance',
      amount: 400
    };
    setReport(prev => {
      const nextList = [...prev.expenses, newItem];
      const totalExpenses = nextList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        ...prev,
        expenses: nextList,
        totalExpenses
      };
    });
  };

  const updateExpenseRow = (id: string, field: keyof ReportExpenseItem, value: any) => {
    setReport(prev => {
      const nextList = prev.expenses.map(e => e.id === id ? { ...e, [field]: value } : e);
      const totalExpenses = nextList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        ...prev,
        expenses: nextList,
        totalExpenses
      };
    });
  };

  const removeExpenseRow = (id: string) => {
    setReport(prev => {
      const nextList = prev.expenses.filter(e => e.id !== id);
      const totalExpenses = nextList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        ...prev,
        expenses: nextList,
        totalExpenses
      };
    });
  };

  // ---------------- MONEY LOCATION HANDLERS ----------------
  const updateMoneyLocation = (field: 'mpesaAmount' | 'cashAtHand', value: number) => {
    setReport(prev => {
      const mpesa = field === 'mpesaAmount' ? value : prev.moneyLocation.mpesaAmount;
      const cash = field === 'cashAtHand' ? value : prev.moneyLocation.cashAtHand;
      const totalMoney = Math.round((mpesa + cash) * 100) / 100;
      return {
        ...prev,
        moneyLocation: {
          mpesaAmount: mpesa,
          cashAtHand: cash,
          totalMoney
        }
      };
    });
  };

  // ---------------- REPORTED SALES & CLOSING STOCK ----------------
  const handleReportedTotalSalesChange = (val: number) => {
    setReport(prev => {
      const salesVariance = Math.round((val - prev.calculatedTotalSales) * 100) / 100;
      return {
        ...prev,
        reportedTotalSales: val,
        salesVariance,
        hasSalesDiscrepancy: Math.abs(salesVariance) > 0.05
      };
    });
  };

  // ---------------- AI REPORT EXTRACTION ----------------
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setExtractionError(null);
    }
  };

  const handleRunAiExtraction = async () => {
    if (!selectedImageFile) {
      setExtractionError('Please select or drop a paper shift report image first.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedImageFile);
      });

      const response = await fetch('/api/gemini/extract-daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inlineData: {
            data: base64Data,
            mimeType: selectedImageFile.type || 'image/jpeg'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Extraction service returned HTTP ${response.status}`);
      }

      const extracted = await response.json();

      // Carefully map extracted fields into draft form without losing user control
      const targetStation: StationId = extracted.stationId === 'junction' ? 'junction' : 'ndalu';
      const targetDate = extracted.reportDate || reportDate;

      const dieselNozzle = calculateNozzle({
        salesStart: extracted.nozzles?.diesel?.salesStart || 0,
        salesStop: extracted.nozzles?.diesel?.salesStop || 0,
        litresStart: extracted.nozzles?.diesel?.litresStart || 0,
        litresStop: extracted.nozzles?.diesel?.litresStop || 0,
        ratePerLitre: extracted.nozzles?.diesel?.ratePerLitre || 0,
        manualSubtract: extracted.nozzles?.diesel?.manualSubtract || 0
      });

      const superNozzle = calculateNozzle({
        salesStart: extracted.nozzles?.super?.salesStart || 0,
        salesStop: extracted.nozzles?.super?.salesStop || 0,
        litresStart: extracted.nozzles?.super?.litresStart || 0,
        litresStop: extracted.nozzles?.super?.litresStop || 0,
        ratePerLitre: extracted.nozzles?.super?.ratePerLitre || 0,
        manualSubtract: extracted.nozzles?.super?.manualSubtract || 0
      });

      const otherSales: OtherSaleItem[] = (extracted.otherSales || []).map((os: any, idx: number) => ({
        id: `os-ai-${idx}-${Date.now()}`,
        item: os.item || 'LPG Refill',
        quantity: Number(os.quantity) || 1,
        unitPrice: Number(os.unitPrice) || 0,
        reportedAmount: Number(os.reportedAmount) || 0,
        calculatedAmount: (Number(os.quantity) || 1) * (Number(os.unitPrice) || 0)
      }));

      const otherSalesTotal = otherSales.reduce((sum, item) => sum + item.reportedAmount, 0);

      const purchases: ReportPurchaseItem[] = (extracted.purchases || []).map((p: any, idx: number) => ({
        id: `pch-ai-${idx}-${Date.now()}`,
        item: p.item || 'LPG Purchase',
        quantity: Number(p.quantity) || 1,
        unit: p.unit || 'Pcs',
        unitCost: Number(p.unitCost) || 0,
        totalCost: Number(p.totalCost) || (Number(p.quantity) || 1) * (Number(p.unitCost) || 0),
        supplier: p.supplier || '',
        invoiceRef: p.invoiceRef || '',
        paymentStatus: p.paymentStatus === 'debt' ? 'debt' : 'paid',
        amountPaid: Number(p.amountPaid) || 0,
        amountOutstanding: Number(p.amountOutstanding) || 0
      }));

      const invoices: ReportInvoiceItem[] = (extracted.invoices || []).map((inv: any, idx: number) => ({
        id: `inv-ai-${idx}-${Date.now()}`,
        customerOrDescription: inv.customerOrDescription || '',
        type: inv.type === 'paid_invoice' ? 'paid_invoice' : 'debt',
        amount: Number(inv.amount) || 0,
        reference: inv.reference || ''
      }));

      const expenses: ReportExpenseItem[] = (extracted.expenses || []).map((e: any, idx: number) => ({
        id: `exp-ai-${idx}-${Date.now()}`,
        category: e.category || 'Other',
        description: e.description || '',
        amount: Number(e.amount) || 0
      }));

      const mpesa = Number(extracted.moneyLocation?.mpesaAmount) || 0;
      const cash = Number(extracted.moneyLocation?.cashAtHand) || 0;
      const calcTotalSales = Math.round((dieselNozzle.finalAmount + superNozzle.finalAmount + otherSalesTotal) * 100) / 100;
      const repTotal = Number(extracted.reportedTotalSales) || calcTotalSales;

      setStationId(targetStation);
      setReportDate(targetDate);

      setReport(prev => ({
        ...prev,
        stationId: targetStation,
        stationName: STATIONS[targetStation]?.name || '',
        reportDate: targetDate,
        attendantName: extracted.attendantName || prev.attendantName,
        imageUrl: imagePreviewUrl || prev.imageUrl,
        nozzles: {
          diesel: dieselNozzle,
          super: superNozzle
        },
        otherSales,
        otherSalesTotal,
        purchases,
        purchasesTotal: purchases.reduce((sum, item) => sum + item.totalCost, 0),
        purchasesPaidTotal: purchases.reduce((sum, item) => sum + item.amountPaid, 0),
        purchasesDebtTotal: purchases.reduce((sum, item) => sum + item.amountOutstanding, 0),
        invoices,
        totalDebts: invoices.filter(i => i.type === 'debt').reduce((sum, i) => sum + i.amount, 0),
        totalPaidInvoices: invoices.filter(i => i.type === 'paid_invoice').reduce((sum, i) => sum + i.amount, 0),
        expenses,
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        reportedTotalSales: repTotal,
        calculatedTotalSales: calcTotalSales,
        salesVariance: Math.round((repTotal - calcTotalSales) * 100) / 100,
        hasSalesDiscrepancy: Math.abs(repTotal - calcTotalSales) > 0.05,
        moneyLocation: {
          mpesaAmount: mpesa,
          cashAtHand: cash,
          totalMoney: Math.round((mpesa + cash) * 100) / 100
        },
        closingFuelBalance: {
          pmsLitres: Number(extracted.closingFuelBalance?.pmsLitres) || 0,
          agoLitres: Number(extracted.closingFuelBalance?.agoLitres) || 0
        },
        confidenceNotes: extracted.confidenceNotes || []
      }));

      setSaveSuccess('AI paper report extraction completed! Please review and verify all values before saving.');
      setTimeout(() => setSaveSuccess(null), 8000);
    } catch (err: any) {
      console.error(err);
      setExtractionError(err?.message || 'Failed to extract report. You can continue with manual entry.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ---------------- SAVE REPORT ----------------
  const handleSaveReport = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await saveDailyStationReport(report, user?.email || 'Manager');
      setSaveSuccess(`Daily Report for ${STATIONS[stationId].name} on ${reportDate} saved successfully!`);
      setExistingReport(report);
      onReportSaved?.(report);
      setTimeout(() => setSaveSuccess(null), 6000);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || 'Failed to save daily report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- DELETE ACTION CONFIRMATION ----------------
  const confirmDeleteTarget = async () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === 'report') {
      try {
        await deleteDailyStationReport(stationId, reportDate);
        setReport(createEmptyReport(stationId, reportDate));
        setExistingReport(null);
        setSaveSuccess('Daily report deleted. Related reports have been updated.');
        setDeleteConfirmTarget(null);
        setTimeout(() => setSaveSuccess(null), 5000);
      } catch (err: any) {
        setSaveError('Failed to delete report: ' + err?.message);
      }
      return;
    }

    if (deleteConfirmTarget.type === 'purchase') {
      removePurchaseRow(deleteConfirmTarget.id);
    } else if (deleteConfirmTarget.type === 'invoice') {
      removeInvoiceRow(deleteConfirmTarget.id);
    } else if (deleteConfirmTarget.type === 'expense') {
      removeExpenseRow(deleteConfirmTarget.id);
    } else if (deleteConfirmTarget.type === 'other_sale') {
      removeOtherSaleRow(deleteConfirmTarget.id);
    }

    setDeleteConfirmTarget(null);
  };

  // ---------------- AUDIT STATS / REVIEW ----------------
  const handleMarkAsReviewed = async () => {
    try {
      await markReportReviewed(stationId, reportDate, user?.email || 'Auditor');
      setReport(prev => ({
        ...prev,
        status: 'reviewed',
        reviewedBy: user?.email || 'Auditor',
        reviewedAt: Date.now()
      }));
      setSaveSuccess('Report marked as reviewed and audited.');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setSaveError('Failed to mark reviewed: ' + err?.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* TOP HEADER CONTROLS */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-mono tracking-widest text-[#7C3AED] font-bold">
                Fuel Suite Daily Audit
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-xs font-mono text-theme-text-muted">Single Daily Station Report</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-200 tracking-tight flex items-center gap-2">
              <Fuel className="w-6 h-6 text-[#7C3AED]" />
              <span>Daily Report Entry</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Mode Toggle */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  entryMode === 'manual'
                    ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-900/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('ai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  entryMode === 'ai'
                    ? 'bg-[#059669] text-white shadow-md shadow-emerald-900/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Photo Assistant</span>
              </button>
            </div>

            {onNavigateToArchive && (
              <button
                type="button"
                onClick={onNavigateToArchive}
                className="px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Reports Archive</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveReport}
              disabled={saving}
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Report...' : 'Save Daily Report'}</span>
            </button>
          </div>
        </div>

        {/* TOP PARAMETER BAR (Station, Date, Attendant) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-4 border-t border-white/10">
          {/* Station Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Station *</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStationChange('ndalu')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  stationId === 'ndalu'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                    : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span>Ndalu Station</span>
              </button>
              <button
                type="button"
                onClick={() => handleStationChange('junction')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  stationId === 'junction'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                    : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span>Junction Station</span>
              </button>
            </div>
          </div>

          {/* Report Date Selector (Static to previous date) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Report Date (Sticky Static) *</span>
            </label>
            <input
              type="date"
              required
              value={reportDate}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#000000] border border-white/10 rounded-xl text-xs font-mono font-bold text-slate-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Attendant Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Attendant / Shift Leader</span>
            </label>
            <input
              type="text"
              placeholder="e.g. John K. / Sarah N."
              value={report.attendantName}
              onChange={e => setReport(prev => ({ ...prev, attendantName: e.target.value }))}
              className="w-full px-3.5 py-2 bg-[#000000] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* EXISTING REPORT WARNING OR DRAFT STATUS BANNER */}
        {existingReport && (
          <div className="mt-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-slate-300">
                A saved report already exists for <strong>{STATIONS[stationId].name}</strong> on <strong>{reportDate}</strong>.
                {report.status === 'reviewed' && (
                  <span className="ml-2 text-emerald-400 font-bold">
                    ✓ Reviewed by {report.reviewedBy || 'Auditor'} on {format(report.reviewedAt || Date.now(), 'MMM d, HH:mm')}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {report.status !== 'reviewed' && (
                <button
                  type="button"
                  onClick={handleMarkAsReviewed}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[11px] cursor-pointer"
                >
                  Mark as Reviewed
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget({ type: 'report', id: reportDate, label: `Daily Report for ${STATIONS[stationId].name} on ${reportDate}` })}
                className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-[11px] cursor-pointer"
              >
                Delete Report
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK NOTIFICATIONS */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* AI EXTRACTION PANEL (SIDE-BY-SIDE OR SPLIT VIEW) */}
      {entryMode === 'ai' && (
        <div className="bg-[#000000] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">Image-Assisted Report Entry with Gemini AI</h3>
                <p className="text-[11px] text-gray-400">
                  Upload a photo or scan of the daily shift paper report. The app will extract all fields for your review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{selectedImageFile ? 'Change Image' : 'Select Photo / Scan'}</span>
              </button>
              {selectedImageFile && (
                <button
                  type="button"
                  onClick={handleRunAiExtraction}
                  disabled={isExtracting}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isExtracting ? 'Extracting Readings...' : 'Run AI Extraction'}</span>
                </button>
              )}
            </div>
          </div>

          {extractionError && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          {/* SIDE-BY-SIDE VIEWER: IMAGE ON LEFT, STATUS ON RIGHT */}
          {imagePreviewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950 relative flex flex-col">
                <div className="px-3 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Paper Report Scan Preview</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.2))}
                      className="p-1 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px]">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                      className="p-1 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-auto max-h-[420px] p-2 flex items-center justify-center bg-black/60">
                  <img
                    src={imagePreviewUrl}
                    alt="Paper Report Preview"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
                    className="max-w-full rounded shadow-md"
                  />
                </div>
              </div>

              {/* Confidence and Verification Checklist */}
              <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Human Audit Verification Protocol</span>
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    The extracted fields below are now populated in your draft form. You can verify each figure against the preview image, correct any field manually, and verify that the calculated sales match the paper shift sheet before committing to storage.
                  </p>

                  {report.confidenceNotes && report.confidenceNotes.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Items Flagged for Review:
                      </span>
                      {report.confidenceNotes.map((cn, i) => (
                        <div key={i} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                          <strong>{cn.field}:</strong> {cn.issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Image will be permanently linked to this report</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageFile(null);
                      setImagePreviewUrl(null);
                    }}
                    className="text-gray-400 hover:text-rose-400 text-xs font-bold"
                  >
                    Clear Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- 1. WHITE-OIL NOZZLE READINGS ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                1. White-Oil Nozzle Readings
              </h2>
              <p className="text-[11px] text-gray-400">
                Two nozzles per station: Diesel (AGO) and Premium (PMS). White-oil purchases are recorded separately and not mixed here.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg">
            Final = (Litres × Rate) − Manual Deduct
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Diesel (AGO) Nozzle */}
          <NozzleCard
            label="Diesel / AGO Nozzle"
            fuelCode="AGO"
            fuelName="Diesel"
            colorClass="text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.02]"
            nozzle={report.nozzles.diesel}
            onChange={(field, val) => updateNozzle('diesel', { [field]: val })}
          />

          {/* Premium (PMS) Nozzle */}
          <NozzleCard
            label="Premium / PMS Nozzle"
            fuelCode="PMS"
            fuelName="Super"
            colorClass="text-purple-400 border-purple-500/30 bg-purple-500/[0.02]"
            nozzle={report.nozzles.super}
            onChange={(field, val) => updateNozzle('super', { [field]: val })}
          />
        </div>
      </div>

      {/* ---------------- 2. OTHER SALES (LPG, BURNERS, GRILLS) ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                2. Other Sales (LPG, Burners, and Grills)
              </h2>
              <p className="text-[11px] text-gray-400">
                LPG cylinders, refilling, burners, grills, and accessories sales.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-amber-400">
              Total: {formatCurrency(report.otherSalesTotal)}
            </span>
            <button
              type="button"
              onClick={addOtherSaleRow}
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Other Sale</span>
            </button>
          </div>
        </div>

        {report.otherSales.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No LPG, burner, or grill sales recorded today. Click "Add Other Sale" if any were sold.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 px-2 font-semibold">Item / Description</th>
                  <th className="py-2 px-2 font-semibold text-right w-24">Quantity</th>
                  <th className="py-2 px-2 font-semibold text-right w-28">Unit Price</th>
                  <th className="py-2 px-2 font-semibold text-right w-32">Reported Amount</th>
                  <th className="py-2 px-2 font-semibold text-right w-32">Calculated</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.otherSales.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.item}
                        onChange={e => updateOtherSaleRow(item.id, 'item', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-semibold"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={e => updateOtherSaleRow(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e => updateOtherSaleRow(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.reportedAmount}
                        onChange={e => updateOtherSaleRow(item.id, 'reportedAmount', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-amber-300 font-mono font-bold text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">
                      {formatCurrency(item.calculatedAmount)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget({ type: 'other_sale', id: item.id, label: `Sale item: ${item.item}` })}
                        className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- 3. LPG, BURNERS, AND GRILLS PURCHASES ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                3. Purchases (LPG, Burners, and Grills Only)
              </h2>
              <p className="text-[11px] text-gray-400">
                Purchases of stock for the station. Visually and mathematically segregated from fuel and operating expenses.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-purple-300">
              Total Purchases: {formatCurrency(report.purchasesTotal)}
            </span>
            <button
              type="button"
              onClick={addPurchaseRow}
              className="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Purchase Line</span>
            </button>
          </div>
        </div>

        {report.purchases.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No stock purchases recorded for this shift. Click "Add Purchase Line" if gas/burners/grills were purchased.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 px-2 font-semibold">Item</th>
                  <th className="py-2 px-2 font-semibold w-20 text-right">Qty</th>
                  <th className="py-2 px-2 font-semibold w-24">Unit</th>
                  <th className="py-2 px-2 font-semibold w-24 text-right">Unit Cost</th>
                  <th className="py-2 px-2 font-semibold w-28 text-right">Total Cost</th>
                  <th className="py-2 px-2 font-semibold">Supplier</th>
                  <th className="py-2 px-2 font-semibold w-24">Invoice/Ref</th>
                  <th className="py-2 px-2 font-semibold w-24">Status</th>
                  <th className="py-2 px-2 font-semibold w-28 text-right">Paid</th>
                  <th className="py-2 px-2 font-semibold w-28 text-right">Debt</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.purchases.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.item}
                        onChange={e => updatePurchaseRow(item.id, 'item', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-semibold"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={e => updatePurchaseRow(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => updatePurchaseRow(item.id, 'unit', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200"
                        placeholder="Pcs/Cyl"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={e => updatePurchaseRow(item.id, 'unitCost', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-purple-300">
                      {formatCurrency(item.totalCost)}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.supplier}
                        onChange={e => updatePurchaseRow(item.id, 'supplier', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200"
                        placeholder="Supplier name"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.invoiceRef}
                        onChange={e => updatePurchaseRow(item.id, 'invoiceRef', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono"
                        placeholder="INV-..."
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={item.paymentStatus}
                        onChange={e => updatePurchaseRow(item.id, 'paymentStatus', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 text-xs"
                      >
                        <option value="paid">Paid</option>
                        <option value="debt">Debt</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amountPaid}
                        onChange={e => updatePurchaseRow(item.id, 'amountPaid', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-emerald-400 font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amountOutstanding}
                        onChange={e => updatePurchaseRow(item.id, 'amountOutstanding', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-[#6D28D9] font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget({ type: 'purchase', id: item.id, label: `Purchase line: ${item.item}` })}
                        className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- 4. TOTAL SALES VERIFICATION ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                4. Total Sales Verification
              </h2>
              <p className="text-[11px] text-gray-400">
                Cross-checks reported shift total sales against calculated nozzle + other sales.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Reported Total Sales (from Paper)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">KES</span>
              <input
                type="number"
                step="0.01"
                value={report.reportedTotalSales}
                onChange={e => handleReportedTotalSalesChange(Number(e.target.value) || 0)}
                className="w-full pl-12 pr-3 py-2 bg-[#000000] border border-white/10 rounded-lg text-base font-mono font-black text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Calculated Total Sales
            </span>
            <div className="text-base font-mono font-black text-purple-300 py-2">
              {formatCurrency(report.calculatedTotalSales)}
            </div>
            <div className="text-[10px] text-gray-500">
              AGO ({formatCurrency(report.nozzles.diesel.finalAmount)}) + PMS ({formatCurrency(report.nozzles.super.finalAmount)}) + Other ({formatCurrency(report.otherSalesTotal)})
            </div>
          </div>

          <div className={`p-3.5 border rounded-xl flex flex-col justify-between ${
            report.hasSalesDiscrepancy 
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
          }`}>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider mb-1">
                Discrepancy / Variance
              </span>
              <div className="text-base font-mono font-black">
                {report.salesVariance >= 0 ? '+' : ''}{formatCurrency(report.salesVariance)}
              </div>
            </div>
            <p className="text-[10px] mt-1 font-medium">
              {report.hasSalesDiscrepancy
                ? '⚠️ Discrepancy detected between reported and computed sales. Please verify meter readings.'
                : '✓ Reported total matches nozzle and other sales computation perfectly.'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- 5. DEBTS AND PAID INVOICES ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                5. Debts & Paid Invoices
              </h2>
              <p className="text-[11px] text-gray-400">
                Customer credit given today (Debts) and past customer credit settled today (Paid Invoices).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#8B5CF6] font-bold">
              Debts: {formatCurrency(report.totalDebts)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Paid Invoices: {formatCurrency(report.totalPaidInvoices)}
            </span>
            <button
              type="button"
              onClick={addInvoiceRow}
              className="px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Invoice / Debt</span>
            </button>
          </div>
        </div>

        {report.invoices.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No customer debts or invoice payments recorded for this shift. Click "Add Invoice / Debt" to enter lines.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 px-2 font-semibold">Customer / Description</th>
                  <th className="py-2 px-2 font-semibold w-40">Entry Type</th>
                  <th className="py-2 px-2 font-semibold w-32 text-right">Amount (KES)</th>
                  <th className="py-2 px-2 font-semibold w-32">Reference / Invoice #</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.invoices.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.customerOrDescription}
                        onChange={e => updateInvoiceRow(item.id, 'customerOrDescription', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-semibold"
                        placeholder="Customer name or vehicle reg"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={item.type}
                        onChange={e => updateInvoiceRow(item.id, 'type', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 text-xs"
                      >
                        <option value="debt">Debt (Customer Credit Given)</option>
                        <option value="paid_invoice">Paid Invoice (Collected Cash)</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={e => updateInvoiceRow(item.id, 'amount', Number(e.target.value) || 0)}
                        className={`w-full px-2 py-1 bg-[#000000] border border-white/10 rounded font-mono font-bold text-right ${
                          item.type === 'debt' ? 'text-[#8B5CF6]' : 'text-emerald-400'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.reference}
                        onChange={e => updateInvoiceRow(item.id, 'reference', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 font-mono"
                        placeholder="Ref/Slip #"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget({ type: 'invoice', id: item.id, label: `Invoice row: ${item.customerOrDescription || item.type}` })}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- 6. OPERATING EXPENSES ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#6D28D9]" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                6. Operating Expenses
              </h2>
              <p className="text-[11px] text-gray-400">
                Station operational cash outflows (Lunch, Generator Fuel, Electricity, Rent, Wi-Fi, etc.).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#6D28D9]">
              Total Expenses: {formatCurrency(report.totalExpenses)}
            </span>
            <button
              type="button"
              onClick={addExpenseRow}
              className="px-2.5 py-1.5 bg-[#6D28D9]/15 hover:bg-[#6D28D9]/25 text-slate-100 border border-[#6D28D9]/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {report.expenses.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No operating expenses logged for this shift. Click "Add Expense" if funds were disbursed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 px-2 font-semibold w-40">Category</th>
                  <th className="py-2 px-2 font-semibold">Description</th>
                  <th className="py-2 px-2 font-semibold w-32 text-right">Amount (KES)</th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.expenses.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-2">
                      <select
                        value={item.category}
                        onChange={e => updateExpenseRow(item.id, 'category', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200 text-xs"
                      >
                        <option value="Lunch">Lunch</option>
                        <option value="Generator Fuel">Generator Fuel</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Rent">Rent</option>
                        <option value="Wi-Fi">Wi-Fi</option>
                        <option value="Security">Security</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Airtime">Airtime</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateExpenseRow(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-slate-200"
                        placeholder="Detail memo"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={e => updateExpenseRow(item.id, 'amount', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-[#000000] border border-white/10 rounded text-[#6D28D9] font-mono font-bold text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget({ type: 'expense', id: item.id, label: `Expense: ${item.category} (${item.amount})` })}
                        className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- 7. WHERE THE MONEY IS ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                7. Where the Money Is
              </h2>
              <p className="text-[11px] text-gray-400">
                End-of-shift money locations. Treated as physical balance locations rather than expenses.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Total Accounted: {formatCurrency(report.moneyLocation.totalMoney)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              M-Pesa Amount (Till / Paybill)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">KES</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={report.moneyLocation.mpesaAmount}
                onChange={e => updateMoneyLocation('mpesaAmount', Number(e.target.value) || 0)}
                className="w-full pl-12 pr-3 py-2 bg-[#000000] border border-white/10 rounded-lg text-base font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Cash at Hand (Till Vault)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">KES</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={report.moneyLocation.cashAtHand}
                onChange={e => updateMoneyLocation('cashAtHand', Number(e.target.value) || 0)}
                className="w-full pl-12 pr-3 py-2 bg-[#000000] border border-white/10 rounded-lg text-base font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 8. CLOSING FUEL BALANCE ---------------- */}
      <div className="bg-[#000000] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                8. Closing Fuel Balance
              </h2>
              <p className="text-[11px] text-gray-400">
                End-of-day underground tank dip levels in litres for PMS (Super) and AGO (Diesel).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              PMS (Super) Closing Volume
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={report.closingFuelBalance.pmsLitres}
                onChange={e => setReport(prev => ({
                  ...prev,
                  closingFuelBalance: {
                    ...prev.closingFuelBalance,
                    pmsLitres: Number(e.target.value) || 0
                  }
                }))}
                className="w-full pr-12 pl-3 py-2 bg-[#000000] border border-white/10 rounded-lg text-base font-mono font-bold text-purple-300 outline-none focus:border-purple-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-mono">Litres</span>
            </div>
          </div>

          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              AGO (Diesel) Closing Volume
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={report.closingFuelBalance.agoLitres}
                onChange={e => setReport(prev => ({
                  ...prev,
                  closingFuelBalance: {
                    ...prev.closingFuelBalance,
                    agoLitres: Number(e.target.value) || 0
                  }
                }))}
                className="w-full pr-12 pl-3 py-2 bg-[#000000] border border-white/10 rounded-lg text-base font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-mono">Litres</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="p-4 bg-[#000000] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Status: <strong className="text-slate-200 capitalize">{report.status}</strong></span>
          <span>·</span>
          <span>Station: <strong>{STATIONS[stationId].name}</strong></span>
          <span>·</span>
          <span>Date: <strong>{reportDate}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReport(createEmptyReport(stationId, reportDate))}
            className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Reset Form
          </button>
          <button
            type="button"
            onClick={handleSaveReport}
            disabled={saving}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Complete Daily Report'}</span>
          </button>
        </div>
      </div>

      {/* ROW & REPORT DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#09090b] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-500/5 flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-200">Confirm Deletion</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <strong>{deleteConfirmTarget.label}</strong>?
              </p>
              <p className="text-[11px] text-gray-400">
                This deletion will immediately be reflected in related reports, sales totals, and station KPIs.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Cancel (Safe Default)
              </button>
              <button
                type="button"
                onClick={confirmDeleteTarget}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-md shadow-rose-900/30 cursor-pointer"
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

// ---------------- HELPER: NOZZLE CARD COMPONENT ----------------
function NozzleCard({
  label,
  fuelCode,
  fuelName,
  colorClass,
  nozzle,
  onChange
}: {
  label: string;
  fuelCode: string;
  fuelName: string;
  colorClass: string;
  nozzle: NozzleReading;
  onChange: (field: keyof NozzleReading, val: number) => void;
}) {
  return (
    <div className={`border rounded-xl p-4 space-y-3.5 transition-all ${colorClass}`}>
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
          {label} ({fuelCode})
        </span>
        <span className="text-[11px] font-mono text-gray-400">
          {fuelName} Rate: {formatCurrency(nozzle.ratePerLitre)}/L
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sales Meter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Sales Meter Start
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.salesStart}
            onChange={e => onChange('salesStart', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs font-mono font-bold text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Sales Meter Stop
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.salesStop}
            onChange={e => onChange('salesStop', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs font-mono font-bold text-slate-200"
          />
        </div>

        {/* Litres Meter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Litres Meter Start
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.litresStart}
            onChange={e => onChange('litresStart', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs font-mono font-bold text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Litres Meter Stop
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.litresStop}
            onChange={e => onChange('litresStop', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs font-mono font-bold text-slate-200"
          />
        </div>

        {/* Rate Per Litre */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Rate per Litre (KES)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.ratePerLitre}
            onChange={e => onChange('ratePerLitre', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-white/10 rounded-lg text-xs font-mono font-bold text-slate-200"
          />
        </div>

        {/* Manual Amount to Subtract (Reduces Amount) */}
        <div>
          <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
            Manual Subtract (Reduces)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={nozzle.manualSubtract}
            onChange={e => onChange('manualSubtract', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-[#000000] border border-amber-500/30 rounded-lg text-xs font-mono font-bold text-amber-300"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Computed Summary Block */}
      <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-gray-400">
          <span>Sales-meter diff (Stop − Start):</span>
          <span className="font-bold text-slate-200">{formatCurrency(nozzle.salesDiff)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Litres sold (Stop − Start):</span>
          <span className="font-bold text-slate-200">{nozzle.litresSold.toLocaleString()} L</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Calc before subtract (Litres × Rate):</span>
          <span className="font-bold text-slate-200">{formatCurrency(nozzle.calcBeforeSubtract)}</span>
        </div>
        <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-white/5">
          <span>Final Amount (after deduction):</span>
          <span className="text-purple-300 font-black">{formatCurrency(nozzle.finalAmount)}</span>
        </div>

        {/* Discrepancy Flag Banner */}
        {nozzle.hasDiscrepancy && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-300 font-sans mt-2">
            <strong>⚠️ Discrepancy Flag for Review:</strong> Final amount ({formatCurrency(nozzle.finalAmount)}) differs from Sales-meter difference ({formatCurrency(nozzle.salesDiff)}) by {formatCurrency(Math.abs(nozzle.variance))}.
          </div>
        )}
      </div>
    </div>
  );
}
