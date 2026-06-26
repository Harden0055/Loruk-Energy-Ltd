import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  type: 'sale' | 'purchase' | 'opening';
  item: string;
  quantity: number;
  amount: number;
}

export interface InventoryItem {
  id: string;
  date: string;
  type: 'in' | 'out' | 'opening';
  item: string;
  quantity: number;
  amount: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
}

export interface Invoice {
  id: string;
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

export const FuelProvider = ({ children }: { children: ReactNode }) => {
  const [activeStation, setActiveStation] = useState<Station>('Combined Total');
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Super Petrol' },
    { id: '2', name: 'Diesel Fuel' },
    { id: '3', name: 'Engine oil' },
  ]);
  const [pumpReadings, setPumpReadings] = useState<PumpReading[]>([
    { id: '1', date: '2023-10-01', station: 'Ndalu Station', product: 'Diesel Fuel', startReading: 1000, stopReading: 1200, ratePerLitre: 200, manualCash: 40000 },
    { id: '2', date: '2023-10-01', station: 'Junction Station', product: 'Super Petrol', startReading: 500, stopReading: 800, ratePerLitre: 210, manualCash: 63000 },
  ]);
  const [lpgTransactions, setLpgTransactions] = useState<LPGTransaction[]>([
    { id: '1', date: '2023-10-01', type: 'sale', item: '6kg Cylinder', quantity: 5, amount: 6000 },
    { id: '2', date: '2023-10-02', type: 'purchase', item: '13kg Cylinder', quantity: 10, amount: 25000 },
  ]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    { id: '1', date: '2023-10-01', type: 'in', item: 'Burner', quantity: 20, amount: 10000 },
    { id: '2', date: '2023-10-03', type: 'out', item: 'Burner', quantity: 5, amount: 3000 },
  ]);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', date: '2023-10-01', category: 'Electricity', amount: 5000 },
    { id: '2', date: '2023-10-02', category: 'Water', amount: 1500 },
  ]);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: '1', customerName: 'Acme Corp', totalAmount: 50000, paidAmount: 20000 },
    { id: '2', customerName: 'Zetta Trans', totalAmount: 30000, paidAmount: 30000 },
  ]);
  const [cashPositions, setCashPositions] = useState<CashPosition[]>([
    { id: '1', date: '2023-10-01', mPesa: 150000, cashOnHand: 45000 },
  ]);

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
