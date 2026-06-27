import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const STATIONS = ['Loruk Energy Ltd', 'Ndalu Station', 'Junction Station'] as const;
export type Station = typeof STATIONS[number] | 'Combined Total';

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

function useFirebaseCollection<T extends {id?: string}>(collectionName: string, defaultValue: T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [items, setItems] = useState<T[]>(defaultValue);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
      
      if (data.length === 0 && defaultValue.length > 0 && collectionName === 'fuelsuite_products') {
         defaultValue.forEach(item => {
           if(item.id) setDoc(doc(db, collectionName, item.id), item);
         });
      } else {
         setItems(data);
      }
    }, (error) => {
      console.warn(`Error reading collection ${collectionName}`, error);
    });
    return unsub;
  }, [collectionName]);

  const setCollectionItems = useCallback((action: React.SetStateAction<T[]>) => {
    setItems(prevItems => {
      const newItems = typeof action === 'function' ? (action as any)(prevItems) : action;
      
      newItems.forEach((newItem: T) => {
         const oldItem = prevItems.find(i => i.id === newItem.id);
         if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            if (newItem.id) {
               setDoc(doc(db, collectionName, newItem.id), newItem);
            }
         }
      });
      
      prevItems.forEach((oldItem: T) => {
         if (oldItem.id && !newItems.find(i => i.id === oldItem.id)) {
            deleteDoc(doc(db, collectionName, oldItem.id));
         }
      });

      return newItems;
    });
  }, [collectionName]);

  return [items, setCollectionItems as React.Dispatch<React.SetStateAction<T[]>>];
}

export const FuelProvider = ({ children }: { children: ReactNode }) => {
  const [activeStation, setActiveStation] = useState<Station>('Combined Total');
  const [products, setProducts] = useFirebaseCollection<Product>('fuelsuite_products', [
    { id: '1', name: 'Super Petrol' },
    { id: '2', name: 'Diesel Fuel' },
    { id: '3', name: 'Engine oil' },
  ]);
  const [pumpReadings, setPumpReadings] = useFirebaseCollection<PumpReading>('fuelsuite_pumpReadings', []);
  const [lpgTransactions, setLpgTransactions] = useFirebaseCollection<LPGTransaction>('fuelsuite_lpgTransactions', []);
  const [inventoryItems, setInventoryItems] = useFirebaseCollection<InventoryItem>('fuelsuite_inventoryItems', []);
  const [expenses, setExpenses] = useFirebaseCollection<Expense>('fuelsuite_expenses', []);
  const [invoices, setInvoices] = useFirebaseCollection<Invoice>('fuelsuite_invoices', []);
  const [cashPositions, setCashPositions] = useFirebaseCollection<CashPosition>('fuelsuite_cashPositions', []);

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
