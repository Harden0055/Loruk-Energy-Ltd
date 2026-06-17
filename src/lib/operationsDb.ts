import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy, setDoc, getDocs, where } from 'firebase/firestore';
import { db } from './firebase';
import { useState, useEffect } from 'react';
import { 
  DailyPumpReading, LPGSale, LPGPurchase, BurnerPurchase, BurnerSale, 
  GrillPurchase, GrillSale, DailyExpense, ExpenseCategory, CashPosition, DailyInvoice, Station, FuelRate,
  StationInfo, LPGInventory, BurnerInventory, InvoicePayment, DailyReportRecord, OpeningStock, StationCustomer
} from '../types';
import { 
  isQuotaExceeded, markQuotaExceeded, getLocalCollection, saveLocalCollection, 
  addLocalDoc, updateLocalDoc, deleteLocalDoc 
} from './localDbFallback';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// ---------------- GENERIC SELF-HEALING HOOK ----------------

function useGenericCollection<T>(
  collectionName: string,
  sortField?: string,
  direction: 'asc' | 'desc' = 'desc'
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isQuotaExceeded()) {
      let localData = getLocalCollection(collectionName);
      if (sortField) {
        localData = [...localData].sort((a: any, b: any) => {
          const valA = a[sortField];
          const valB = b[sortField];
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          return direction === 'desc' 
            ? (valB > valA ? 1 : -1)
            : (valA > valB ? 1 : -1);
        });
      }
      setData(localData);
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(colRef, (snapshot) => {
        let loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        if (sortField) {
          loaded = [...loaded].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            return direction === 'desc' 
              ? (valB > valA ? 1 : -1)
              : (valA > valB ? 1 : -1);
          });
        }
        saveLocalCollection(collectionName, loaded);
        setData(loaded);
        setLoading(false);
      }, (error) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted')) {
          markQuotaExceeded();
          let localData = getLocalCollection(collectionName);
          if (sortField) {
            localData = [...localData].sort((a: any, b: any) => {
              const valA = a[sortField];
              const valB = b[sortField];
              if (valA === undefined) return 1;
              if (valB === undefined) return -1;
              return direction === 'desc' 
                ? (valB > valA ? 1 : -1)
                : (valA > valB ? 1 : -1);
            });
          }
          setData(localData);
          setLoading(false);
        } else {
          handleFirestoreError(error, OperationType.GET, collectionName);
          setLoading(false);
        }
      });
      return unsub;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted')) {
        markQuotaExceeded();
        let localData = getLocalCollection(collectionName);
        if (sortField) {
          localData = [...localData].sort((a: any, b: any) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            return direction === 'desc' 
              ? (valB > valA ? 1 : -1)
              : (valA > valB ? 1 : -1);
          });
        }
        setData(localData);
        setLoading(false);
      } else {
        handleFirestoreError(error, OperationType.GET, collectionName);
        setLoading(false);
      }
    }
  }, []);

  return { data, loading };
}

// ---------------- MUTATIONS WRAPPER ----------------

async function executeMutation(
  collectionName: string,
  firebaseOp: () => Promise<any>,
  localOp: () => any,
  operationType: OperationType,
  errorPath: string,
  onFirebaseSuccess?: (resId: string) => void
) {
  if (isQuotaExceeded()) {
    return localOp();
  }
  try {
    const result = await firebaseOp();
    const resId = result?.id || '';
    if (onFirebaseSuccess) {
      onFirebaseSuccess(resId);
    }
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted')) {
      markQuotaExceeded();
      return localOp();
    } else {
      handleFirestoreError(error, operationType, errorPath);
      // Fallback in case of any unhandled permissions error to keep the app highly resilient
      return localOp();
    }
  }
}

// ---------------- EXPORTED CUSTOM COMPREHENSIVE HOOKS ----------------

export function useFuelRates() {
  const { data, loading } = useGenericCollection<FuelRate>('fuel_rates', 'date', 'desc');
  return { rates: data, loading };
}

export function useDailyPumpReadings() {
  const { data, loading } = useGenericCollection<DailyPumpReading>('pump_readings', 'date', 'desc');
  return { readings: data, loading };
}

export function useLpgSales() {
  const { data, loading } = useGenericCollection<LPGSale>('lpg_sales', 'date', 'desc');
  return { sales: data, loading };
}

export function useLpgPurchases() {
  const { data, loading } = useGenericCollection<LPGPurchase>('lpg_purchases', 'date', 'desc');
  return { purchases: data, loading };
}

export function useBurnerSales() {
  const { data, loading } = useGenericCollection<BurnerSale>('burner_sales', 'date', 'desc');
  return { sales: data, loading };
}

export function useBurnerPurchases() {
  const { data, loading } = useGenericCollection<BurnerPurchase>('burner_purchases', 'date', 'desc');
  return { purchases: data, loading };
}

export function useGrillSales() {
  const { data, loading } = useGenericCollection<GrillSale>('grill_sales', 'date', 'desc');
  return { sales: data, loading };
}

export function useGrillPurchases() {
  const { data, loading } = useGenericCollection<GrillPurchase>('grill_purchases', 'date', 'desc');
  return { purchases: data, loading };
}

export function useDailyExpenses() {
  const { data, loading } = useGenericCollection<DailyExpense>('expenses', 'date', 'desc');
  return { expenses: data, loading };
}

export function useExpenseCategories() {
  const { data, loading } = useGenericCollection<ExpenseCategory>('expense_categories', 'name', 'asc');
  return { categories: data, loading };
}

export function useCashPositions() {
  const { data, loading } = useGenericCollection<CashPosition>('cash_positions', 'date', 'desc');
  return { positions: data, loading };
}

export function useDailyInvoices() {
  const { data, loading } = useGenericCollection<DailyInvoice>('invoices', 'invoiceDate', 'desc');
  return { invoices: data, loading };
}

// ---------------- ADDED FOR MISSING COLLECTIONS ----------------

export function useStations() {
  const { data, loading } = useGenericCollection<StationInfo>('stations', 'createdAt', 'desc');
  return { stations: data, loading };
}

export function useLpgInventory() {
  const { data, loading } = useGenericCollection<LPGInventory>('lpg_inventory');
  return { inventory: data, loading };
}

export function useBurnerInventory() {
  const { data, loading } = useGenericCollection<BurnerInventory>('burner_inventory');
  return { inventory: data, loading };
}

export function useInvoicePayments() {
  const { data, loading } = useGenericCollection<InvoicePayment>('invoice_payments', 'paymentDate', 'desc');
  return { payments: data, loading };
}

export function useDailyReports() {
  const { data, loading } = useGenericCollection<DailyReportRecord>('daily_reports', 'date', 'desc');
  return { reports: data, loading };
}

export function useStationCustomers() {
  const { data, loading } = useGenericCollection<StationCustomer>('station_customers', 'createdAt', 'desc');
  return { customers: data, loading };
}

export function useOpeningStocks() {
  const { data, loading } = useGenericCollection<OpeningStock>('opening_stocks');
  return { openingStocks: data, loading };
}

// ---------------- MUTATIONS ----------------

export async function addFuelRate(data: Omit<FuelRate, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'fuel_rates',
    () => addDoc(collection(db, 'fuel_rates'), payload),
    () => addLocalDoc('fuel_rates', payload),
    OperationType.CREATE,
    'fuel_rates',
    (id) => {
      const list = getLocalCollection('fuel_rates');
      list.unshift({ id, ...payload });
      saveLocalCollection('fuel_rates', list);
    }
  );
}

export async function addDailyPumpReading(data: Omit<DailyPumpReading, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'pump_readings',
    () => addDoc(collection(db, 'pump_readings'), payload),
    () => addLocalDoc('pump_readings', payload),
    OperationType.CREATE,
    'pump_readings',
    (id) => {
      const list = getLocalCollection('pump_readings');
      list.unshift({ id, ...payload });
      saveLocalCollection('pump_readings', list);
    }
  );
}

export async function addLpgSale(data: Omit<LPGSale, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'lpg_sales',
    () => addDoc(collection(db, 'lpg_sales'), payload),
    () => addLocalDoc('lpg_sales', payload),
    OperationType.CREATE,
    'lpg_sales',
    (id) => {
      const list = getLocalCollection('lpg_sales');
      list.unshift({ id, ...payload });
      saveLocalCollection('lpg_sales', list);
    }
  );
}

export async function addLpgPurchase(data: Omit<LPGPurchase, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'lpg_purchases',
    () => addDoc(collection(db, 'lpg_purchases'), payload),
    () => addLocalDoc('lpg_purchases', payload),
    OperationType.CREATE,
    'lpg_purchases',
    (id) => {
      const list = getLocalCollection('lpg_purchases');
      list.unshift({ id, ...payload });
      saveLocalCollection('lpg_purchases', list);
    }
  );
}

export async function addBurnerSale(data: Omit<BurnerSale, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'burner_sales',
    () => addDoc(collection(db, 'burner_sales'), payload),
    () => addLocalDoc('burner_sales', payload),
    OperationType.CREATE,
    'burner_sales',
    (id) => {
      const list = getLocalCollection('burner_sales');
      list.unshift({ id, ...payload });
      saveLocalCollection('burner_sales', list);
    }
  );
}

export async function addBurnerPurchase(data: Omit<BurnerPurchase, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'burner_purchases',
    () => addDoc(collection(db, 'burner_purchases'), payload),
    () => addLocalDoc('burner_purchases', payload),
    OperationType.CREATE,
    'burner_purchases',
    (id) => {
      const list = getLocalCollection('burner_purchases');
      list.unshift({ id, ...payload });
      saveLocalCollection('burner_purchases', list);
    }
  );
}

export async function addGrillSale(data: Omit<GrillSale, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'grill_sales',
    () => addDoc(collection(db, 'grill_sales'), payload),
    () => addLocalDoc('grill_sales', payload),
    OperationType.CREATE,
    'grill_sales',
    (id) => {
      const list = getLocalCollection('grill_sales');
      list.unshift({ id, ...payload });
      saveLocalCollection('grill_sales', list);
    }
  );
}

export async function addGrillPurchase(data: Omit<GrillPurchase, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'grill_purchases',
    () => addDoc(collection(db, 'grill_purchases'), payload),
    () => addLocalDoc('grill_purchases', payload),
    OperationType.CREATE,
    'grill_purchases',
    (id) => {
      const list = getLocalCollection('grill_purchases');
      list.unshift({ id, ...payload });
      saveLocalCollection('grill_purchases', list);
    }
  );
}

export async function addDailyExpense(data: Omit<DailyExpense, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.stationId || data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'expenses',
    () => addDoc(collection(db, 'expenses'), payload),
    () => addLocalDoc('expenses', payload),
    OperationType.CREATE,
    'expenses',
    (id) => {
      const list = getLocalCollection('expenses');
      list.unshift({ id, ...payload });
      saveLocalCollection('expenses', list);
    }
  );
}

export async function addExpenseCategory(data: string | Omit<ExpenseCategory, 'id'>) {
  const parsedData = typeof data === 'string' ? { name: data } : data;
  const payload = {
    ...parsedData,
    stationId: parsedData.stationId || 'Ndalu',
    createdAt: Date.now()
  };
  return executeMutation(
    'expense_categories',
    () => addDoc(collection(db, 'expense_categories'), payload),
    () => addLocalDoc('expense_categories', payload),
    OperationType.CREATE,
    'expense_categories',
    (id) => {
      const list = getLocalCollection('expense_categories');
      list.push({ id, ...payload });
      saveLocalCollection('expense_categories', list);
    }
  );
}

export async function addCashPosition(data: Omit<CashPosition, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'cash_positions',
    () => addDoc(collection(db, 'cash_positions'), payload),
    () => addLocalDoc('cash_positions', payload),
    OperationType.CREATE,
    'cash_positions',
    (id) => {
      const list = getLocalCollection('cash_positions');
      list.unshift({ id, ...payload });
      saveLocalCollection('cash_positions', list);
    }
  );
}

export async function addDailyInvoice(data: Omit<DailyInvoice, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'invoices',
    () => addDoc(collection(db, 'invoices'), payload),
    () => addLocalDoc('invoices', payload),
    OperationType.CREATE,
    'invoices',
    (id) => {
      const list = getLocalCollection('invoices');
      list.unshift({ id, ...payload });
      saveLocalCollection('invoices', list);
    }
  );
}

export async function updateDailyInvoice(id: string, data: Partial<DailyInvoice>) {
  return executeMutation(
    'invoices',
    () => updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: Date.now() }),
    () => updateLocalDoc('invoices', id, data),
    OperationType.UPDATE,
    `invoices/${id}`
  );
}

export async function deleteDailyPumpReading(id: string) {
  return executeMutation(
    'pump_readings',
    () => deleteDoc(doc(db, 'pump_readings', id)),
    () => deleteLocalDoc('pump_readings', id),
    OperationType.DELETE,
    `pump_readings/${id}`
  );
}

export async function deleteLpgSale(id: string) {
  return executeMutation(
    'lpg_sales',
    () => deleteDoc(doc(db, 'lpg_sales', id)),
    () => deleteLocalDoc('lpg_sales', id),
    OperationType.DELETE,
    `lpg_sales/${id}`
  );
}

export async function deleteLpgPurchase(id: string) {
  return executeMutation(
    'lpg_purchases',
    () => deleteDoc(doc(db, 'lpg_purchases', id)),
    () => deleteLocalDoc('lpg_purchases', id),
    OperationType.DELETE,
    `lpg_purchases/${id}`
  );
}

export async function deleteBurnerSale(id: string) {
  return executeMutation(
    'burner_sales',
    () => deleteDoc(doc(db, 'burner_sales', id)),
    () => deleteLocalDoc('burner_sales', id),
    OperationType.DELETE,
    `burner_sales/${id}`
  );
}

export async function deleteBurnerPurchase(id: string) {
  return executeMutation(
    'burner_purchases',
    () => deleteDoc(doc(db, 'burner_purchases', id)),
    () => deleteLocalDoc('burner_purchases', id),
    OperationType.DELETE,
    `burner_purchases/${id}`
  );
}

export async function deleteGrillSale(id: string) {
  return executeMutation(
    'grill_sales',
    () => deleteDoc(doc(db, 'grill_sales', id)),
    () => deleteLocalDoc('grill_sales', id),
    OperationType.DELETE,
    `grill_sales/${id}`
  );
}

export async function deleteGrillPurchase(id: string) {
  return executeMutation(
    'grill_purchases',
    () => deleteDoc(doc(db, 'grill_purchases', id)),
    () => deleteLocalDoc('grill_purchases', id),
    OperationType.DELETE,
    `grill_purchases/${id}`
  );
}

export async function deleteDailyExpense(id: string) {
  return executeMutation(
    'expenses',
    () => deleteDoc(doc(db, 'expenses', id)),
    () => deleteLocalDoc('expenses', id),
    OperationType.DELETE,
    `expenses/${id}`
  );
}

export async function deleteCashPosition(id: string) {
  return executeMutation(
    'cash_positions',
    () => deleteDoc(doc(db, 'cash_positions', id)),
    () => deleteLocalDoc('cash_positions', id),
    OperationType.DELETE,
    `cash_positions/${id}`
  );
}

export async function deleteDailyInvoice(id: string) {
  return executeMutation(
    'invoices',
    () => deleteDoc(doc(db, 'invoices', id)),
    () => deleteLocalDoc('invoices', id),
    OperationType.DELETE,
    `invoices/${id}`
  );
}

// Stations & Reports

export async function addStation(data: Omit<StationInfo, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.name || 'Ndalu',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  return executeMutation(
    'stations',
    () => addDoc(collection(db, 'stations'), payload),
    () => addLocalDoc('stations', payload),
    OperationType.CREATE,
    'stations',
    (id) => {
      const list = getLocalCollection('stations');
      list.unshift({ id, ...payload });
      saveLocalCollection('stations', list);
    }
  );
}

export async function addLpgInventory(data: Omit<LPGInventory, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  return executeMutation(
    'lpg_inventory',
    () => addDoc(collection(db, 'lpg_inventory'), payload),
    () => addLocalDoc('lpg_inventory', payload),
    OperationType.CREATE,
    'lpg_inventory',
    (id) => {
      const list = getLocalCollection('lpg_inventory');
      list.push({ id, ...payload });
      saveLocalCollection('lpg_inventory', list);
    }
  );
}

export async function addBurnerInventory(data: Omit<BurnerInventory, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  return executeMutation(
    'burner_inventory',
    () => addDoc(collection(db, 'burner_inventory'), payload),
    () => addLocalDoc('burner_inventory', payload),
    OperationType.CREATE,
    'burner_inventory',
    (id) => {
      const list = getLocalCollection('burner_inventory');
      list.push({ id, ...payload });
      saveLocalCollection('burner_inventory', list);
    }
  );
}

export async function addInvoicePayment(data: Omit<InvoicePayment, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  return executeMutation(
    'invoice_payments',
    () => addDoc(collection(db, 'invoice_payments'), payload),
    () => addLocalDoc('invoice_payments', payload),
    OperationType.CREATE,
    'invoice_payments',
    (id) => {
      const list = getLocalCollection('invoice_payments');
      list.unshift({ id, ...payload });
      saveLocalCollection('invoice_payments', list);
    }
  );
}

export async function addDailyReportRecord(data: Omit<DailyReportRecord, 'id'>) {
  const now = Date.now();
  const payload = {
    ...data,
    stationId: data.station || 'Ndalu',
    createdAt: data.createdAt || now,
    updatedAt: now
  };
  return executeMutation(
    'daily_reports',
    () => addDoc(collection(db, 'daily_reports'), payload),
    () => addLocalDoc('daily_reports', payload),
    OperationType.CREATE,
    'daily_reports',
    (id) => {
      const list = getLocalCollection('daily_reports');
      list.unshift({ id, ...payload });
      saveLocalCollection('daily_reports', list);
    }
  );
}

export async function addStationCustomer(data: Omit<StationCustomer, 'id' | 'createdAt'>) {
  const now = Date.now();
  const payload = {
    ...data,
    createdAt: now,
    updatedAt: now
  };
  return executeMutation(
    'station_customers',
    () => addDoc(collection(db, 'station_customers'), payload),
    () => addLocalDoc('station_customers', payload),
    OperationType.CREATE,
    'station_customers',
    (id) => {
      const list = getLocalCollection('station_customers');
      list.unshift({ id, ...payload });
      saveLocalCollection('station_customers', list);
    }
  );
}

export async function updateStationCustomer(id: string, data: Partial<StationCustomer>) {
  return executeMutation(
    'station_customers',
    () => updateDoc(doc(db, 'station_customers', id), { ...data, updatedAt: Date.now() }),
    () => updateLocalDoc('station_customers', id, data),
    OperationType.UPDATE,
    `station_customers/${id}`
  );
}

export async function deleteStationCustomer(id: string) {
  return executeMutation(
    'station_customers',
    () => deleteDoc(doc(db, 'station_customers', id)),
    () => deleteLocalDoc('station_customers', id),
    OperationType.DELETE,
    `station_customers/${id}`
  );
}

export function saveOpeningStock(station: Station, data: { super: number; diesel: number; lpg6kg: number; lpg13kg: number; emptyCylinders6kg: number; emptyCylinders13kg: number; burner: number; grill: number }) {
  const payload = {
    ...data,
    updatedAt: Date.now()
  };
  return executeMutation(
    'opening_stocks',
    () => setDoc(doc(db, 'opening_stocks', station), payload),
    () => {
      const list = getLocalCollection('opening_stocks');
      const idx = list.findIndex(item => item.id === station);
      if (idx !== -1) {
        list[idx] = { id: station, station, values: { Super: data.super, Diesel: data.diesel }, ...payload };
      } else {
        list.push({ id: station, station, values: { Super: data.super, Diesel: data.diesel }, ...payload });
      }
      saveLocalCollection('opening_stocks', list);
    },
    OperationType.WRITE,
    `opening_stocks/${station}`
  );
}

export async function getPreviousStopReading(station: string, product: string, dateLimitMs: number): Promise<number> {
  const readings = isQuotaExceeded()
    ? getLocalCollection('pump_readings')
    : await (async () => {
        try {
          const q = query(
            collection(db, 'pump_readings'), 
            where('station', '==', station),
            where('product', '==', product),
            orderBy('date', 'desc')
          );
          const snap = await getDocs(q);
          return snap.docs.map(doc => doc.data() as DailyPumpReading);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted')) {
            markQuotaExceeded();
            return getLocalCollection('pump_readings');
          }
          console.error("Failed to fetch previous readings: ", error);
          return getLocalCollection('pump_readings');
        }
      })();

  const priorReadings = readings.filter(r => 
    r.station === station && 
    r.product === product && 
    r.date < dateLimitMs
  );

  if (priorReadings.length === 0) {
    return 0;
  }

  // Sort descending by date
  priorReadings.sort((a, b) => b.date - a.date);
  return priorReadings[0].litresStop || 0;
}

export { deleteLpgSale as deleteLPGSale };
export { deleteLpgPurchase as deleteLPGPurchase };

