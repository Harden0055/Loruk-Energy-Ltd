import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  deduplicateCollections, 
  detectDuplicates, 
  DeduplicateOutput, 
  DuplicateDetectionResult,
  normalizeDate 
} from './deduplication';

export type Station = string;
export interface StationData { id: string; name: string; }

export interface PumpReading {
  id: string;
  date: string;
  station: Station;
  product: string;
  salesStart: number;
  salesStop: number;
  litresStart: number;
  litresStop: number;
  ratePerLitre: number;
  manualCash?: number;
}

export interface LPGTransaction {
  id: string;
  date: string;
  station: Station;
  type: 'sale' | 'purchase' | 'opening';
  item: string;
  quantity: number;
  completeQuantity?: number;
  rate?: number;
  amount: number;
}

export interface InventoryItem {
  id: string;
  date: string;
  station: Station;
  type: 'in' | 'out' | 'opening';
  item: string;
  quantity: number;
  rate?: number;
  amount: number;
}

export type ExpenseFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'As Needed';
export type ExpensePaymentMethod = 'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Other';

export interface ExpenseTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultAmount?: number;
  frequency: ExpenseFrequency;
  isRecurring: boolean;
  defaultPaymentMethod?: ExpensePaymentMethod;
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  station: Station;
  expenseCode?: string;
  category: string;
  description?: string;
  amount: number;
  paymentMethod?: ExpensePaymentMethod;
  isRecurring?: boolean;
  frequency?: ExpenseFrequency;
}

export interface Invoice {
  id: string;
  date?: string;
  station: Station;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
}

export interface CashPosition {
  id: string;
  date: string;
  station?: Station;
  mPesa: number;
  cashOnHand: number;
}

export type ProductCategory = 'Fuel' | 'LPG' | 'Accessories' | 'Lubricants' | 'Equipment' | 'Other' | string;
export type ProductUOM = 'Litre' | 'Kg' | 'Piece' | 'Cylinder' | 'Pack' | 'Drum' | 'Bottle' | string;

export interface Product {
  id: string;
  name: string;
  itemCode?: string;
  category?: ProductCategory;
  uom?: ProductUOM;
}

export interface Customer {
  id: string;
  station: Station;
  code: string;
  name: string;
  creditLimit: number;
  openingBalance: number;
  phone?: string;
  email?: string;
  customerType?: string;
  remarks?: string;
}

interface FuelContextType {
  activeStation: Station;
  setActiveStation: (station: Station) => void;
  pumpReadings: PumpReading[];
  setPumpReadings: React.Dispatch<React.SetStateAction<PumpReading[]>>;
  lpgTransactions: LPGTransaction[];
  setLpgTransactions: React.Dispatch<React.SetStateAction<LPGTransaction[]>>;
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  cashPositions: CashPosition[];
  setCashPositions: React.Dispatch<React.SetStateAction<CashPosition[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  stations: StationData[];
  setStations: React.Dispatch<React.SetStateAction<StationData[]>>;
  expenseTemplates: ExpenseTemplate[];
  setExpenseTemplates: React.Dispatch<React.SetStateAction<ExpenseTemplate[]>>;
  deduplicateData: (targetDate?: string, targetStation?: string) => DeduplicateOutput;
  checkDuplicates: (targetDate?: string, targetStation?: string) => DuplicateDetectionResult;
}

const FuelContext = createContext<FuelContextType | undefined>(undefined);

function useFirebaseCollection<T extends {id?: string}>(collectionName: string, defaultValue: T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [items, setItems] = useState<T[]>(defaultValue);
  const itemsRef = useRef<T[]>(defaultValue);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      
      if (data.length === 0 && defaultValue.length > 0 && (collectionName === 'fuelsuite_products' || collectionName === 'fuelsuite_stations' || collectionName === 'fuelsuite_expenseTemplates')) {
         defaultValue.forEach(item => {
           if(item.id) setDoc(doc(db, collectionName, item.id), item);
         });
         setItems(defaultValue);
         itemsRef.current = defaultValue;
      } else {
         setItems(data);
         itemsRef.current = data;
      }
    }, (error) => {
      console.warn(`Error reading collection ${collectionName}`, error);
    });
    return unsub;
  }, [collectionName]);

  const setCollectionItems = useCallback((action: React.SetStateAction<T[]>) => {
    const prevItems = itemsRef.current;
    const newItems = typeof action === 'function' ? (action as any)(prevItems) : action;
    
    // Optimistically update local state
    setItems(newItems);
    itemsRef.current = newItems;

    // Apply database updates asynchronously outside state updater context
    const syncFirestore = async () => {
      try {
        // Handle additions and updates
        for (const newItem of newItems) {
          const oldItem = prevItems.find(i => i.id === newItem.id);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            if (newItem.id) {
              await setDoc(doc(db, collectionName, newItem.id), newItem);
            }
          }
        }
        
        // Handle deletions
        for (const oldItem of prevItems) {
          if (oldItem.id && !newItems.find(i => i.id === oldItem.id)) {
            await deleteDoc(doc(db, collectionName, oldItem.id));
          }
        }
      } catch (error) {
        console.error(`Error syncing collection ${collectionName} with Firestore:`, error);
        // Rollback on failure
        setItems(prevItems);
        itemsRef.current = prevItems;
      }
    };

    syncFirestore();
  }, [collectionName]);

  return [items, setCollectionItems as React.Dispatch<React.SetStateAction<T[]>>];
}

export const FuelProvider = ({ children }: { children: ReactNode }) => {
  const [activeStation, setActiveStation] = useState<Station>('Combined Total');
  const [products, setProducts] = useFirebaseCollection<Product>('fuelsuite_products', [
    { id: '1', name: 'Super ( Premium )', itemCode: 'PMS-001', category: 'Fuel', uom: 'Litre' },
    { id: '2', name: 'Diesel Fuel', itemCode: 'AGO-002', category: 'Fuel', uom: 'Litre' },
    { id: '3', name: '6Kg LPG', itemCode: 'LPG-003', category: 'LPG', uom: 'Cylinder' },
    { id: '4', name: '13Kg LPG', itemCode: 'LPG-004', category: 'LPG', uom: 'Cylinder' },
    { id: '5', name: 'Burner', itemCode: 'ACC-005', category: 'Accessories', uom: 'Piece' },
    { id: '6', name: 'Grill', itemCode: 'ACC-006', category: 'Accessories', uom: 'Piece' },
  ]);
  const [pumpReadings, setPumpReadings] = useFirebaseCollection<PumpReading>('fuelsuite_pumpReadings', []);
  const [lpgTransactions, setLpgTransactions] = useFirebaseCollection<LPGTransaction>('fuelsuite_lpgTransactions', []);
  const [inventoryItems, setInventoryItems] = useFirebaseCollection<InventoryItem>('fuelsuite_inventoryItems', []);
  const [expenses, setExpenses] = useFirebaseCollection<Expense>('fuelsuite_expenses', []);
  const [invoices, setInvoices] = useFirebaseCollection<Invoice>('fuelsuite_invoices', []);
  const [cashPositions, setCashPositions] = useFirebaseCollection<CashPosition>('fuelsuite_cashPositions', []);
  const [customers, setCustomers] = useFirebaseCollection<Customer>('fuelsuite_customers', []);
  const [stations, setStations] = useFirebaseCollection<StationData>('fuelsuite_stations', [{id: '1', name: 'Loruk Ndalu Filling Station'}, {id: '2', name: 'Loruk Junction Filling Station'}]);
  const [expenseTemplates, setExpenseTemplates] = useFirebaseCollection<ExpenseTemplate>('fuelsuite_expenseTemplates', [
    { id: '1', code: 'EXP-GEN', name: 'Generator (Fuel & Service)', category: 'Operations & Fuel', defaultAmount: 2500, frequency: 'Weekly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Diesel & engine servicing for backup power generator' },
    { id: '2', code: 'EXP-LUNCH', name: 'Staff Lunch & Meals', category: 'Staff & Welfare', defaultAmount: 600, frequency: 'Daily', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Daily food & lunch allowance for station attendants' },
    { id: '3', code: 'EXP-ELEC', name: 'Electricity / KPLC Tokens', category: 'Utilities', defaultAmount: 12000, frequency: 'Monthly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Prepaid meter electricity tokens for forecourt and offices' },
    { id: '4', code: 'EXP-RENT', name: 'Station Rent & Lease', category: 'Rent & Facilities', defaultAmount: 45000, frequency: 'Monthly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Monthly land ground rent and premises lease' },
    { id: '5', code: 'EXP-WAGE', name: 'Casual Wages / Labour', category: 'Staff & Welfare', defaultAmount: 3500, frequency: 'Weekly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Temporary casual shifts and extra forecourt hands' },
    { id: '6', code: 'EXP-WATER', name: 'Water Supply & Sanitation', category: 'Utilities', defaultAmount: 3000, frequency: 'Monthly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Clean water bowser delivery / county water utility' },
    { id: '7', code: 'EXP-SEC', name: 'Security & Night Guard', category: 'Facilities & Security', defaultAmount: 18000, frequency: 'Monthly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Station night patrol and premises security guard' },
    { id: '8', code: 'EXP-LIC', name: 'Licenses, EPRA & County Permits', category: 'Compliance & Legal', defaultAmount: 25000, frequency: 'Quarterly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Regulatory permits, fire safety inspection and county stickers' },
    { id: '9', code: 'EXP-MAINT', name: 'Pump & Equipment Maintenance', category: 'Operations & Maintenance', defaultAmount: 8000, frequency: 'As Needed', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Nozzle calibration, hose replacement, filter changes' },
    { id: '10', code: 'EXP-WIFI', name: 'Internet / Airtime / Pos Data', category: 'Office & Admin', defaultAmount: 2500, frequency: 'Monthly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Router data bundles and forecourt communications' },
    { id: '11', code: 'EXP-CLEAN', name: 'Cleaning & Forecourt Consumables', category: 'Operations & Maintenance', defaultAmount: 1500, frequency: 'Weekly', isRecurring: true, defaultPaymentMethod: 'Cash', notes: 'Detergents, absorbent sand, brooms, forecourt bins' },
    { id: '12', code: 'EXP-MISC', name: 'Petty Cash / Miscellaneous', category: 'General & Admin', defaultAmount: 1000, frequency: 'As Needed', isRecurring: false, defaultPaymentMethod: 'Cash', notes: 'Stationery, minor emergency supplies and refreshments' },
  ]);

  const checkDuplicates = useCallback((targetDate?: string, targetStation?: string): DuplicateDetectionResult => {
    return detectDuplicates({
      pumpReadings,
      lpgTransactions,
      inventoryItems,
      expenses,
      invoices,
      cashPositions
    }, targetDate, targetStation);
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions]);

  const deduplicateData = useCallback((targetDate?: string, targetStation?: string): DeduplicateOutput => {
    const result = deduplicateCollections({
      pumpReadings,
      lpgTransactions,
      inventoryItems,
      expenses,
      invoices,
      cashPositions
    }, targetDate, targetStation);

    if (result.removedCount > 0) {
      if (result.breakdown.pumpReadings > 0) setPumpReadings(result.cleanedPumpReadings);
      if (result.breakdown.lpgTransactions > 0) setLpgTransactions(result.cleanedLpgTransactions);
      if (result.breakdown.inventoryItems > 0) setInventoryItems(result.cleanedInventoryItems);
      if (result.breakdown.expenses > 0) setExpenses(result.cleanedExpenses);
      if (result.breakdown.invoices > 0) setInvoices(result.cleanedInvoices);
      if (result.breakdown.cashPositions > 0) setCashPositions(result.cleanedCashPositions);
    }

    return result;
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions, setPumpReadings, setLpgTransactions, setInventoryItems, setExpenses, setInvoices, setCashPositions]);

  return (
    <FuelContext.Provider value={{
      activeStation, setActiveStation,
      pumpReadings, setPumpReadings,
      lpgTransactions, setLpgTransactions,
      inventoryItems, setInventoryItems,
      expenses, setExpenses,
      invoices, setInvoices,
      cashPositions, setCashPositions,
      products, setProducts,
      customers, setCustomers, stations, setStations,
      expenseTemplates, setExpenseTemplates,
      deduplicateData,
      checkDuplicates,
    }}>
      {children}
    </FuelContext.Provider>
  );
};

export const useFuel = () => {
  const context = useContext(FuelContext);
  if (context === undefined) {
    throw new Error('useFuel must be used within a FuelProvider');
  }
  return context;
};

/**
 * Calculates dispenser meter differences, accounting for 1,000,000 meter rollover.
 * When the dispenser meter reaches 1,000,000 it rolls over back to 0.
 * - If stop is 0 / not entered yet, returns 0.
 * - If stop >= start, returns stop - start.
 * - If stop < start (and stop > 0), calculates (1,000,000 - start) + stop.
 */
export function calculatePumpMeterDelta(start?: number, stop?: number, maxMeter = 1000000): number {
  const sStart = Number(start) || 0;
  const sStop = Number(stop) || 0;
  
  if (sStop <= 0) return 0;
  if (sStart <= 0) return sStop;
  
  if (sStop >= sStart) {
    return sStop - sStart;
  }
  
  // Meter rollover past 1,000,000
  const startMod = sStart % maxMeter;
  const stopMod = sStop % maxMeter;
  const beforeMillion = maxMeter - startMod;
  const afterZero = stopMod;
  return beforeMillion + afterZero;
}

export function isMeterRollover(start?: number, stop?: number): boolean {
  const sStart = Number(start) || 0;
  const sStop = Number(stop) || 0;
  return sStart > 0 && sStop > 0 && sStop < sStart;
}
