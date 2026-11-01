import { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export type StationId = 'ndalu' | 'junction';

export interface StationConfig {
  id: StationId;
  name: string;
  code: string;
  location: string;
  nozzles: {
    diesel: string;
    super: string;
  };
}

export const STATIONS: Record<StationId, StationConfig> = {
  ndalu: {
    id: 'ndalu',
    name: 'Loruk Ndalu Filling Station',
    code: 'STN-NDL',
    location: 'Ndalu Market, Trans Nzoia / Bungoma',
    nozzles: {
      diesel: 'AGO Nozzle 1 (Diesel)',
      super: 'PMS Nozzle 1 (Premium)'
    }
  },
  junction: {
    id: 'junction',
    name: 'Loruk Junction Filling Station',
    code: 'STN-JNC',
    location: 'Loruk Junction, Kitale Highway',
    nozzles: {
      diesel: 'AGO Nozzle 1 (Diesel)',
      super: 'PMS Nozzle 1 (Premium)'
    }
  }
};

export interface NozzleReading {
  salesStart: number;
  salesStop: number;
  litresStart: number;
  litresStop: number;
  ratePerLitre: number;
  manualSubtract: number;
  // Computed values:
  salesDiff: number; // salesStop - salesStart
  litresSold: number; // litresStop - litresStart
  calcBeforeSubtract: number; // litresSold * ratePerLitre
  finalAmount: number; // calcBeforeSubtract - manualSubtract
  variance: number; // finalAmount - salesDiff
  hasDiscrepancy: boolean; // Math.abs(finalAmount - salesDiff) > 0.05
}

export interface OtherSaleItem {
  id: string;
  item: string;
  quantity: number;
  unitPrice: number;
  reportedAmount: number;
  calculatedAmount: number;
}

export interface ReportPurchaseItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier: string;
  invoiceRef: string;
  paymentStatus: 'paid' | 'debt';
  amountPaid: number;
  amountOutstanding: number;
}

export interface ReportInvoiceItem {
  id: string;
  customerOrDescription: string;
  type: 'debt' | 'paid_invoice';
  amount: number;
  reference: string;
}

export interface ReportExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
}

export interface DailyStationReport {
  id: string; // e.g. "2026-10-31"
  stationId: StationId;
  stationName: string;
  reportDate: string; // "YYYY-MM-DD"
  attendantName: string;
  status: 'draft' | 'saved' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
  imageUrl?: string;

  // 1. White-Oil Nozzle Readings
  nozzles: {
    diesel: NozzleReading;
    super: NozzleReading;
  };

  // 2. Other Sales (LPG, Burners, Grills)
  otherSales: OtherSaleItem[];
  otherSalesTotal: number;

  // 3. LPG, Burners & Grills Purchases
  purchases: ReportPurchaseItem[];
  purchasesTotal: number;
  purchasesPaidTotal: number;
  purchasesDebtTotal: number;

  // 4. Sales Verification
  reportedTotalSales: number;
  calculatedTotalSales: number;
  salesVariance: number;
  hasSalesDiscrepancy: boolean;

  // 5. Debts & Paid Invoices
  invoices: ReportInvoiceItem[];
  totalDebts: number;
  totalPaidInvoices: number;

  // 6. Operating Expenses
  expenses: ReportExpenseItem[];
  totalExpenses: number;

  // 7. Where the Money Is
  moneyLocation: {
    mpesaAmount: number;
    cashAtHand: number;
    totalMoney: number;
  };

  // 8. Closing Fuel Stock
  closingFuelBalance: {
    pmsLitres: number;
    agoLitres: number;
  };

  confidenceNotes?: Array<{ field: string; issue: string }>;
}

// ---------------- LOCAL STORAGE FALLBACK HELPERS ----------------
const getLocalStationReports = (stationId: StationId): DailyStationReport[] => {
  try {
    const raw = localStorage.getItem(`fs_station_${stationId}_reports`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalStationReports = (stationId: StationId, reports: DailyStationReport[]) => {
  try {
    localStorage.setItem(`fs_station_${stationId}_reports`, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save to localStorage fallback:', err);
  }
};

// ---------------- CALCULATION UTILITY ----------------
export const calculateNozzle = (raw: {
  salesStart: number;
  salesStop: number;
  litresStart: number;
  litresStop: number;
  ratePerLitre: number;
  manualSubtract?: number;
}): NozzleReading => {
  const salesStart = Number(raw.salesStart) || 0;
  const salesStop = Number(raw.salesStop) || 0;
  const litresStart = Number(raw.litresStart) || 0;
  const litresStop = Number(raw.litresStop) || 0;
  const ratePerLitre = Number(raw.ratePerLitre) || 0;
  const manualSubtract = Number(raw.manualSubtract) || 0;

  const salesDiff = Math.round((salesStop - salesStart) * 100) / 100;
  const litresSold = Math.round((litresStop - litresStart) * 100) / 100;
  const calcBeforeSubtract = Math.round(litresSold * ratePerLitre * 100) / 100;
  const finalAmount = Math.round((calcBeforeSubtract - manualSubtract) * 100) / 100;
  const variance = Math.round((finalAmount - salesDiff) * 100) / 100;
  const hasDiscrepancy = Math.abs(variance) > 0.05;

  return {
    salesStart,
    salesStop,
    litresStart,
    litresStop,
    ratePerLitre,
    manualSubtract,
    salesDiff,
    litresSold,
    calcBeforeSubtract,
    finalAmount,
    variance,
    hasDiscrepancy
  };
};

export const createEmptyReport = (stationId: StationId, reportDate: string): DailyStationReport => {
  const station = STATIONS[stationId] || STATIONS.ndalu;
  const defaultNozzle = calculateNozzle({
    salesStart: 0,
    salesStop: 0,
    litresStart: 0,
    litresStop: 0,
    ratePerLitre: 0,
    manualSubtract: 0
  });

  return {
    id: reportDate,
    stationId,
    stationName: station.name,
    reportDate,
    attendantName: '',
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nozzles: {
      diesel: defaultNozzle,
      super: defaultNozzle
    },
    otherSales: [],
    otherSalesTotal: 0,
    purchases: [],
    purchasesTotal: 0,
    purchasesPaidTotal: 0,
    purchasesDebtTotal: 0,
    reportedTotalSales: 0,
    calculatedTotalSales: 0,
    salesVariance: 0,
    hasSalesDiscrepancy: false,
    invoices: [],
    totalDebts: 0,
    totalPaidInvoices: 0,
    expenses: [],
    totalExpenses: 0,
    moneyLocation: {
      mpesaAmount: 0,
      cashAtHand: 0,
      totalMoney: 0
    },
    closingFuelBalance: {
      pmsLitres: 0,
      agoLitres: 0
    }
  };
};

// ---------------- DATABASE OPERATIONS ----------------

/**
 * Save or update a daily station report in that station's isolated subcollection:
 * Firestore Path: /stations/{stationId}/daily_reports/{reportDate}
 */
export async function saveDailyStationReport(report: DailyStationReport, userEmail: string = 'Staff'): Promise<void> {
  const stationId = report.stationId;
  const reportDate = report.reportDate;
  const now = Date.now();

  const preparedReport: DailyStationReport = {
    ...report,
    id: reportDate,
    stationName: STATIONS[stationId]?.name || report.stationName,
    updatedAt: now,
    status: report.status === 'draft' ? 'saved' : report.status
  };

  // 1. Update isolated local backup
  const localList = getLocalStationReports(stationId);
  const existingIdx = localList.findIndex(r => r.id === reportDate || r.reportDate === reportDate);
  if (existingIdx !== -1) {
    localList[existingIdx] = preparedReport;
  } else {
    localList.unshift(preparedReport);
  }
  saveLocalStationReports(stationId, localList);

  // 2. Persist to isolated Firestore subcollection
  try {
    const docRef = doc(db, 'stations', stationId, 'daily_reports', reportDate);
    await setDoc(docRef, preparedReport, { merge: true });
  } catch (err) {
    console.warn(`Firestore save to stations/${stationId}/daily_reports failed, local backup retained:`, err);
  }
}

/**
 * Check if a report exists for the given station and date
 */
export async function checkReportExists(stationId: StationId, reportDate: string): Promise<DailyStationReport | null> {
  // Check local backup first
  const localList = getLocalStationReports(stationId);
  const foundLocal = localList.find(r => r.id === reportDate || r.reportDate === reportDate);

  try {
    const docRef = doc(db, 'stations', stationId, 'daily_reports', reportDate);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as DailyStationReport;
    }
  } catch (err) {
    console.warn(`Error reading from stations/${stationId}/daily_reports:`, err);
  }

  return foundLocal || null;
}

/**
 * Delete a report from that station's subcollection
 */
export async function deleteDailyStationReport(stationId: StationId, reportId: string): Promise<void> {
  // 1. Remove from local store
  const localList = getLocalStationReports(stationId).filter(r => r.id !== reportId && r.reportDate !== reportId);
  saveLocalStationReports(stationId, localList);

  // 2. Remove from Firestore
  try {
    const docRef = doc(db, 'stations', stationId, 'daily_reports', reportId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Error deleting from stations/${stationId}/daily_reports/${reportId}:`, err);
  }
}

/**
 * Mark a report as reviewed
 */
export async function markReportReviewed(stationId: StationId, reportId: string, userEmail: string = 'Auditor'): Promise<void> {
  const localList = getLocalStationReports(stationId);
  const item = localList.find(r => r.id === reportId || r.reportDate === reportId);
  if (item) {
    item.status = 'reviewed';
    item.reviewedBy = userEmail;
    item.reviewedAt = Date.now();
    saveLocalStationReports(stationId, localList);
  }

  try {
    const docRef = doc(db, 'stations', stationId, 'daily_reports', reportId);
    await setDoc(docRef, {
      status: 'reviewed',
      reviewedBy: userEmail,
      reviewedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn(`Error marking report reviewed in Firestore:`, err);
  }
}

// ---------------- REACT HOOK ----------------

/**
 * Hook to subscribe to daily station reports.
 * If stationId is 'ndalu' or 'junction', subscribes ONLY to that station's subcollection.
 * If stationId is 'all', subscribes to both stations and aggregates without mixing records.
 */
export function useStationDailyReports(stationId: 'ndalu' | 'junction' | 'all') {
  const [reports, setReports] = useState<DailyStationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubNdalu: (() => void) | null = null;
    let unsubJunction: (() => void) | null = null;
    let isMounted = true;

    // Load initial from local fallback
    if (stationId === 'ndalu') {
      setReports(getLocalStationReports('ndalu'));
    } else if (stationId === 'junction') {
      setReports(getLocalStationReports('junction'));
    } else {
      const merged = [
        ...getLocalStationReports('ndalu'),
        ...getLocalStationReports('junction')
      ].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
      setReports(merged);
    }

    if (stationId === 'ndalu' || stationId === 'all') {
      try {
        const colNdalu = collection(db, 'stations', 'ndalu', 'daily_reports');
        unsubNdalu = onSnapshot(colNdalu, (snap) => {
          if (!isMounted) return;
          const ndaluList: DailyStationReport[] = snap.docs.map(d => ({
            ...d.data(),
            id: d.id,
            stationId: 'ndalu' as StationId,
            stationName: STATIONS.ndalu.name
          } as DailyStationReport));
          
          saveLocalStationReports('ndalu', ndaluList);

          if (stationId === 'ndalu') {
            setReports(ndaluList.sort((a, b) => b.reportDate.localeCompare(a.reportDate)));
            setLoading(false);
          } else {
            // All stations view: aggregate dynamically without mutating individual records
            const junctionCurrent = getLocalStationReports('junction');
            const combined = [...ndaluList, ...junctionCurrent].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
            setReports(combined);
            setLoading(false);
          }
        }, (err) => {
          console.warn('Ndalu Firestore listener warning:', err);
          setLoading(false);
        });
      } catch (err) {
        console.warn('Ndalu listener setup error:', err);
        setLoading(false);
      }
    }

    if (stationId === 'junction' || stationId === 'all') {
      try {
        const colJnc = collection(db, 'stations', 'junction', 'daily_reports');
        unsubJunction = onSnapshot(colJnc, (snap) => {
          if (!isMounted) return;
          const junctionList: DailyStationReport[] = snap.docs.map(d => ({
            ...d.data(),
            id: d.id,
            stationId: 'junction' as StationId,
            stationName: STATIONS.junction.name
          } as DailyStationReport));

          saveLocalStationReports('junction', junctionList);

          if (stationId === 'junction') {
            setReports(junctionList.sort((a, b) => b.reportDate.localeCompare(a.reportDate)));
            setLoading(false);
          } else {
            const ndaluCurrent = getLocalStationReports('ndalu');
            const combined = [...ndaluCurrent, ...junctionList].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
            setReports(combined);
            setLoading(false);
          }
        }, (err) => {
          console.warn('Junction Firestore listener warning:', err);
          setLoading(false);
        });
      } catch (err) {
        console.warn('Junction listener setup error:', err);
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (unsubNdalu) unsubNdalu();
      if (unsubJunction) unsubJunction();
    };
  }, [stationId]);

  return { reports, loading };
}
