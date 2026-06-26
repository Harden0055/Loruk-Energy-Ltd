import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Station = 'Ndalu Station' | 'Junction Station' | 'Combined Total';

export interface PumpReading {
  id: string;
  date: string;
  station: Station;
  product: string;
  startReading: number;
  stopReading: number;
  ratePerLitre: number;
  manualCash: number;
}

export interface LPGTransaction {
  id: string;
  date: string;
  station: Station;
  type: 'sale' | 'purchase' | 'opening';
  item: string;
  quantity: number;
  amount: number;
}

export interface InventoryItem {
  id: string;
  date: string;
  station: Station;
  type: 'in' | 'out' | 'opening';
  item: string;
  quantity: number;
  amount: number;
}

export interface Expense {
  id: string;
  date: string;
  station: Station;
  category: string;
  amount: number;
}

export interface Invoice {
  id: string;
  station: Station;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
}

export interface CashPosition {
  id: string;
  date: string;
  mPesa: number;
  cashOnHand: number;
}

export interface Product {
  id: string;
  name: string;
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
}

const FuelContext = createContext<FuelContextType | undefined>(undefined);

function usePersistedState<T extends {id?: string}[]>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Erase old demo data with id '1' and '2' that was hardcoded, unless it's products
          if (key !== 'fuelsuite_products') {
            return parsed.filter((item: any) => item.id !== '1' && item.id !== '2') as unknown as T;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn(`Error reading localStorage for key ${key}`, e);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Error setting localStorage for key ${key}`, e);
    }
  }, [key, state]);

  return [state, setState];
}

export const FuelProvider = ({ children }: { children: ReactNode }) => {
  const [activeStation, setActiveStation] = useState<Station>('Combined Total');
  const [products, setProducts] = usePersistedState<Product[]>('fuelsuite_products', [
    { id: '1', name: 'Super Petrol' },
    { id: '2', name: 'Diesel Fuel' },
    { id: '3', name: 'Engine oil' },
  ]);
  const [pumpReadings, setPumpReadings] = usePersistedState<PumpReading[]>('fuelsuite_pumpReadings', []);
  const [lpgTransactions, setLpgTransactions] = usePersistedState<LPGTransaction[]>('fuelsuite_lpgTransactions', []);
  const [inventoryItems, setInventoryItems] = usePersistedState<InventoryItem[]>('fuelsuite_inventoryItems', []);
  const [expenses, setExpenses] = usePersistedState<Expense[]>('fuelsuite_expenses', []);
  const [invoices, setInvoices] = usePersistedState<Invoice[]>('fuelsuite_invoices', []);
  const [cashPositions, setCashPositions] = usePersistedState<CashPosition[]>('fuelsuite_cashPositions', []);

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
