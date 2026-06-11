import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Customer, Delivery, Payment, FleetExpense, StationReport, Adjustment } from '../types';
import { useState, useEffect } from 'react';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      loaded.sort((a, b) => {
        const idA = (a.customerId || '').toUpperCase().trim();
        const idB = (b.customerId || '').toUpperCase().trim();
        if (idA === 'CUST-001') return -1;
        if (idB === 'CUST-001') return 1;
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCustomers(loaded);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { customers, loading };
}

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'deliveries'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { deliveries, loading };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { payments, loading };
}

export function useAdjustments() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'adjustments'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Adjustment)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { adjustments, loading };
}

export function useFleetExpenses() {
  const [expenses, setExpenses] = useState<FleetExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'fleetExpenses'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FleetExpense)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { expenses, loading };
}

export function useStationReports() {
  const [reports, setReports] = useState<StationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'stationReports'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StationReport)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { reports, loading };
}

export const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, 'customers'), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

export const createDelivery = async (data: Omit<Delivery, 'id'>) => {
  return addDoc(collection(db, 'deliveries'), data);
};

export const createPayment = async (data: Omit<Payment, 'id'>) => {
  return addDoc(collection(db, 'payments'), data);
};

export const createAdjustment = async (data: Omit<Adjustment, 'id'>) => {
  return addDoc(collection(db, 'adjustments'), data);
};

export const createFleetExpense = async (data: Omit<FleetExpense, 'id'>) => {
  return addDoc(collection(db, 'fleetExpenses'), data);
};

export const createStationReport = async (data: Omit<StationReport, 'id'>) => {
  return addDoc(collection(db, 'stationReports'), data);
};

export const deleteFleetExpense = async (id: string) => {
  return deleteDoc(doc(db, 'fleetExpenses', id));
};

export const deleteStationReport = async (id: string) => {
  return deleteDoc(doc(db, 'stationReports', id));
};

export const deleteCustomer = async (id: string) => {
  return deleteDoc(doc(db, 'customers', id));
};

export const deleteDelivery = async (id: string) => {
  return deleteDoc(doc(db, 'deliveries', id));
};

export const updateDelivery = async (id: string, data: Partial<Delivery>) => {
  return updateDoc(doc(db, 'deliveries', id), data);
};

export const deletePayment = async (id: string) => {
  return deleteDoc(doc(db, 'payments', id));
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  return updateDoc(doc(db, 'payments', id), data);
};

export const updateFleetExpense = async (id: string, data: Partial<FleetExpense>) => {
  return updateDoc(doc(db, 'fleetExpenses', id), data);
};

export const deleteAdjustment = async (id: string) => {
  return deleteDoc(doc(db, 'adjustments', id));
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  return updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: Date.now()
  });
};

export async function fetchSeedData() {
  // Check if we already seeded by seeing if we have customers
  const snapshot = await getDocs(collection(db, 'customers'));
  if (!snapshot.empty) return; // already seeded

  const cust1 = await createCustomer({ customerId: 'CUST-001', name: 'Acme Logistics', creditLimit: 20000, balance: 5000, totalPurchases: 15000, status: 'credit_risk', openingBalance: 5000 });
  const cust2 = await createCustomer({ customerId: 'CUST-002', name: 'Express Freight', creditLimit: 50000, balance: 0, totalPurchases: 25000, status: 'active', openingBalance: 0 });
  
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Add deliveries
  await createDelivery({ customerId: cust1.id, date: now - 3 * DAY, productType: 'Diesel', litres: 5000, totalAmount: 7500, createdBy: 'admin' });
  await createDelivery({ customerId: cust2.id, date: now - 2 * DAY, productType: 'Super', litres: 2000, totalAmount: 3200, createdBy: 'admin' });

  // Add payments
  await createPayment({ customerId: cust1.id, date: now - 1 * DAY, amount: 2500, createdBy: 'admin' });
}
