import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy, getDocs, increment, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Customer, Delivery, Payment, FleetExpense, StationReport, Adjustment, Truck } from '../types';
import { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { 
  isQuotaExceeded, markQuotaExceeded, getLocalCollection, addLocalDoc, updateLocalDoc, deleteLocalDoc
} from './localDbFallback';
import { addToSyncQueue } from './sync';

function isQuotaError(error: any) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('quota') || message.toLowerCase().includes('resource-exhausted');
}

// ---------------- SELF-HEALING HOOKS ----------------
// ... (rest of file remains)

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(isQuotaExceeded());
  const [dataVersion, setDataVersion] = useState(0);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    const handleDbChange = () => setDataVersion(v => v + 1);
    window.addEventListener('quota-exceeded', handleQuota);
    window.addEventListener('db-changed', handleDbChange);
    return () => {
        window.removeEventListener('quota-exceeded', handleQuota);
        window.removeEventListener('db-changed', handleDbChange);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    
    if (quotaExceeded) {
       let loaded = getLocalCollection('customers');
       loaded.sort((a, b) => {
        const idA = (a.customerId || '').toUpperCase().trim();
        const idB = (b.customerId || '').toUpperCase().trim();
        if (idA === 'CUST-001') return -1;
        if (idB === 'CUST-001') return 1;
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCustomers(loaded);
      setLoading(false);
      return;
    }

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
      console.error('Firebase snapshot error:', error);
      if (isQuotaError(error)) {
          markQuotaExceeded();
          setQuotaExceeded(true);
      }
      setLoading(false);
    });
    return unsub;
  }, [user, authLoading, quotaExceeded, dataVersion]);

  return { customers, loading };
}

function useGenericDbCollection<T>(collectionName: string, sortField: string = 'date') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(isQuotaExceeded());
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    const handleDbChange = () => setDataVersion(v => v + 1);
    window.addEventListener('quota-exceeded', handleQuota);
    window.addEventListener('db-changed', handleDbChange);
    return () => {
        window.removeEventListener('quota-exceeded', handleQuota);
        window.removeEventListener('db-changed', handleDbChange);
    };
  }, []);

  useEffect(() => {
    if (quotaExceeded) {
      let localData = getLocalCollection(collectionName);
      localData = [...localData].sort((a: any, b: any) => (b[sortField] || 0) - (a[sortField] || 0));
      setData(localData);
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, collectionName), orderBy(sortField, 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setData(loaded);
        setLoading(false);
      }, (error) => {
        console.error('Firebase snapshot error:', error);
        if (isQuotaError(error)) {
            markQuotaExceeded();
            setQuotaExceeded(true);
        }
        setLoading(false);
      });
      return unsub;
    } catch (error) {
      console.error('Firebase query error:', error);
      setLoading(false);
    }
  }, [quotaExceeded, dataVersion]);

  return { data, loading };
}

export function useDeliveries() {
  const { data, loading } = useGenericDbCollection<Delivery>('deliveries');
  return { deliveries: data, loading };
}

export function usePayments() {
  const { data, loading } = useGenericDbCollection<Payment>('payments');
  return { payments: data, loading };
}

export function useAdjustments() {
  const { data, loading } = useGenericDbCollection<Adjustment>('adjustments');
  return { adjustments: data, loading };
}

export function useFleetExpenses() {
  const { data, loading } = useGenericDbCollection<FleetExpense>('fleetExpenses');
  return { expenses: data, loading };
}

export function useTrucks() {
  const { data, loading } = useGenericDbCollection<Truck>('trucks', 'createdAt');
  return { trucks: data, loading };
}

export function useStationReports() {
  const { data, loading } = useGenericDbCollection<StationReport>('stationReports');
  return { reports: data, loading };
}

// ---------------- MUTATIONS WRAPPER ----------------

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function executeDbMutation(
  collectionName: string,
  firebaseOp: () => Promise<any>,
  localOp?: () => any,
  action?: 'create' | 'update' | 'delete',
  docId?: string,
  dataPayload?: any
) {
  if (isQuotaExceeded() && localOp) {
    return localOp();
  }

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    if (localOp) {
      const localResult = localOp();
      const finalDocId = docId || localResult?.id || `local_${Date.now()}`;
      const finalData = dataPayload || localResult || {};
      
      addToSyncQueue(collectionName, action || 'create', finalDocId, finalData);
      return localResult;
    }
    throw new Error('Offline mode active, and no local fallback operation is configured.');
  }

  try {
    const result = await firebaseOp();
    return result;
  } catch (error: any) {
    const isNetworkError = error?.code === 'unavailable' || 
                           error?.code === 'deadline-exceeded' ||
                           error?.message?.toLowerCase().includes('network') ||
                           error?.message?.toLowerCase().includes('offline');

    if (isNetworkError && localOp) {
      console.warn('Network issue detected. Saving update locally and queueing for background sync...');
      const localResult = localOp();
      const finalDocId = docId || localResult?.id || `local_${Date.now()}`;
      const finalData = dataPayload || localResult || {};
      
      addToSyncQueue(collectionName, action || 'create', finalDocId, finalData);
      return localResult;
    }

    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

// ---------------- MUTATIONS ----------------

export const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
  const payload = {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  return executeDbMutation(
    'customers',
    () => addDoc(collection(db, 'customers'), payload),
    () => addLocalDoc('customers', payload),
    'create',
    undefined,
    payload
  );
};

export const createDelivery = async (data: Omit<Delivery, 'id' | 'updatedBy' | 'actionType'>, userEmail: string) => {
  const payload = {
    ...data,
    createdAt: Date.now(),
    updatedBy: userEmail,
    actionType: 'create' as const
  };
  return executeDbMutation(
    'deliveries',
    () => addDoc(collection(db, 'deliveries'), payload),
    () => addLocalDoc('deliveries', payload),
    'create',
    undefined,
    payload
  );
};

export const createPayment = async (data: Omit<Payment, 'id' | 'updatedBy' | 'actionType'>, userEmail: string) => {
  const payload = {
    ...data,
    createdAt: Date.now(),
    updatedBy: userEmail,
    actionType: 'create' as const
  };
  return executeDbMutation(
    'payments',
    () => addDoc(collection(db, 'payments'), payload),
    () => addLocalDoc('payments', payload),
    'create',
    undefined,
    payload
  );
};

export const createAdjustment = async (data: Omit<Adjustment, 'id' | 'updatedBy' | 'actionType'>, userEmail: string) => {
  const payload = {
    ...data,
    createdAt: Date.now(),
    updatedBy: userEmail,
    actionType: 'create' as const
  };
  return executeDbMutation(
    'adjustments',
    () => addDoc(collection(db, 'adjustments'), payload),
    () => addLocalDoc('adjustments', payload),
    'create',
    undefined,
    payload
  );
};

export const createFleetExpense = async (data: Omit<FleetExpense, 'id'>) => {
  return executeDbMutation(
    'fleetExpenses',
    () => addDoc(collection(db, 'fleetExpenses'), data),
    () => addLocalDoc('fleetExpenses', data),
    'create',
    undefined,
    data
  );
};

export const createTruck = async (data: Omit<Truck, 'id' | 'createdAt'>) => {
  const payload = {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  return executeDbMutation(
    'trucks',
    () => addDoc(collection(db, 'trucks'), payload),
    () => addLocalDoc('trucks', payload),
    'create',
    undefined,
    payload
  );
};

export const createStationReport = async (data: Omit<StationReport, 'id'>) => {
  return executeDbMutation(
    'stationReports',
    () => addDoc(collection(db, 'stationReports'), data),
    () => addLocalDoc('stationReports', data),
    'create',
    undefined,
    data
  );
};

export const deleteFleetExpense = async (id: string) => {
  return executeDbMutation(
    'fleetExpenses',
    () => deleteDoc(doc(db, 'fleetExpenses', id)),
    () => deleteLocalDoc('fleetExpenses', id),
    'delete',
    id
  );
};

export const updateTruck = async (id: string, data: Partial<Truck>) => {
  const payload = {
    ...data,
    updatedAt: Date.now()
  };
  return executeDbMutation(
    'trucks',
    () => updateDoc(doc(db, 'trucks', id), payload),
    () => updateLocalDoc('trucks', id, payload),
    'update',
    id,
    payload
  );
};

export const deleteTruck = async (id: string) => {
  return executeDbMutation(
    'trucks',
    () => deleteDoc(doc(db, 'trucks', id)),
    () => deleteLocalDoc('trucks', id),
    'delete',
    id
  );
};

export const deleteStationReport = async (id: string) => {
  return executeDbMutation(
    'stationReports',
    () => deleteDoc(doc(db, 'stationReports', id)),
    () => deleteLocalDoc('stationReports', id),
    'delete',
    id
  );
};

export const deleteCustomer = async (id: string) => {
  return executeDbMutation(
    'customers',
    () => deleteDoc(doc(db, 'customers', id)),
    () => deleteLocalDoc('customers', id),
    'delete',
    id
  );
};

export const deleteDelivery = async (id: string) => {
  return executeDbMutation(
    'deliveries',
    () => deleteDoc(doc(db, 'deliveries', id)),
    () => deleteLocalDoc('deliveries', id),
    'delete',
    id
  );
};

export const updateDelivery = async (id: string, data: Partial<Delivery>) => {
  const payload = { ...data, updatedAt: Date.now() };
  return executeDbMutation(
    'deliveries',
    () => updateDoc(doc(db, 'deliveries', id), payload),
    () => updateLocalDoc('deliveries', id, payload),
    'update',
    id,
    payload
  );
};

export const deletePayment = async (id: string) => {
  return executeDbMutation(
    'payments',
    () => deleteDoc(doc(db, 'payments', id)),
    () => deleteLocalDoc('payments', id),
    'delete',
    id
  );
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  const payload = { ...data, updatedAt: Date.now() };
  return executeDbMutation(
    'payments',
    () => updateDoc(doc(db, 'payments', id), payload),
    () => updateLocalDoc('payments', id, payload),
    'update',
    id,
    payload
  );
};

export const updateFleetExpense = async (id: string, data: Partial<FleetExpense>) => {
  const payload = { ...data };
  return executeDbMutation(
    'fleetExpenses',
    () => updateDoc(doc(db, 'fleetExpenses', id), payload),
    () => updateLocalDoc('fleetExpenses', id, payload),
    'update',
    id,
    payload
  );
};

export const deleteAdjustment = async (id: string) => {
  return executeDbMutation(
    'adjustments',
    () => deleteDoc(doc(db, 'adjustments', id)),
    () => deleteLocalDoc('adjustments', id),
    'delete',
    id
  );
};

export async function recalculateCustomerBalance(
  customerId: string,
  deliveries: Delivery[],
  payments: Payment[],
  adjustments: Adjustment[],
  openingBalance: number,
  openingBalanceType: 'arrears' | 'advance'
) {
  let balance = openingBalanceType === 'advance' ? -openingBalance : openingBalance;
  deliveries.forEach(d => { balance += (d.totalAmount || 0); });
  payments.forEach(p => { balance -= (p.amount || 0); });
  adjustments.forEach(a => {
      balance += (a.type === 'debit' ? (a.amount || 0) : -(a.amount || 0));
  });
  
  await updateCustomer(customerId, { balance });
  return balance;
}

export const updateCustomer = async (id: string, data: Partial<Customer>, increments?: Record<string, number>, userEmail?: string) => {
  const payload: any = {
    ...data,
    updatedAt: Date.now(),
    updatedBy: userEmail || 'Unknown',
    actionType: 'update' as const
  };

  const updateData: any = { ...payload };
  if (increments) {
    for (const [key, val] of Object.entries(increments)) {
      updateData[key] = increment(val);
    }
  }

  return executeDbMutation(
    'customers',
    () => updateDoc(doc(db, 'customers', id), updateData),
    () => {
      const localData = getLocalCollection('customers').find((c: any) => c.id === id);
      const localPayload = { ...payload };
      if (localData && increments) {
        for (const [key, val] of Object.entries(increments)) {
           // Provide a fallback value of 0 in case the field is undefined
           localPayload[key] = (localData[key] || 0) + val;
        }
      }
      updateLocalDoc('customers', id, localPayload);
    },
    'update',
    id,
    updateData
  );
};


// ---------------- SEED & RESTORATION FALLBACK ----------------

export async function fetchSeedData() {
  try {
    const snapshot = await getDocs(collection(db, 'customers'));
    if (!snapshot.empty) return; 

    await createCustomer({ customerId: 'CUST-001', name: 'Loruk Global', creditLimit: 2000000, balance: 4575900, totalPurchases: 4575900, status: 'credit_risk', openingBalance: 4575900, updatedBy: 'system', actionType: 'create' });
    await createCustomer({ customerId: 'CUST-002', name: 'Loruk Chepareria', creditLimit: 500000, balance: 210200, totalPurchases: 210200, status: 'active', openingBalance: 210200, updatedBy: 'system', actionType: 'create' });
    
    const now = Date.now();

    const stationsSnap = await getDocs(collection(db, 'stations'));
    if (stationsSnap.empty) {
      await addDoc(collection(db, 'stations'), { name: 'Ndalu Station', code: 'ST-001', location: 'Ndalu', status: 'active', stationId: 'Ndalu', createdAt: now, updatedAt: now });
      await addDoc(collection(db, 'stations'), { name: 'Junction Station', code: 'ST-002', location: 'Junction', status: 'active', stationId: 'Junction', createdAt: now, updatedAt: now });
    }
  } catch (error) {
    console.error("Seeding failed: ", error);
  }
}

export async function clearDeliveriesAndPayments() {
  try {
    const deliveriesRef = collection(db, 'deliveries');
    const deliveriesSnap = await getDocs(deliveriesRef);
    for (const dDoc of deliveriesSnap.docs) {
      await deleteDoc(doc(db, 'deliveries', dDoc.id));
    }

    const paymentsRef = collection(db, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    for (const pDoc of paymentsSnap.docs) {
      await deleteDoc(doc(db, 'payments', pDoc.id));
    }

    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);
    for (const cDoc of customersSnap.docs) {
      const data = cDoc.data();
      const openingBalance = typeof data.openingBalance === 'number' ? data.openingBalance : 0;
      await updateDoc(doc(db, 'customers', cDoc.id), {
        balance: openingBalance,
        totalPurchases: openingBalance,
        updatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error("Failed to clear deliveries and payments:", error);
  }
}

export async function deleteSeedData() {
  const collectionsToClean = [
    'customers', 'deliveries', 'payments', 'stations', 'lpg_inventory',
    'burner_inventory', 'daily_reports', 'invoice_payments', 'fuel_rates',
    'pump_readings', 'lpg_sales', 'lpg_purchases', 'burner_sales',
    'burner_purchases', 'grill_sales', 'grill_purchases', 'expenses',
    'cash_positions', 'invoices'
  ];

  try {
    for (const colName of collectionsToClean) {
      const snap = await getDocs(collection(db, colName));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        // Identifiers for mock/seed data
        const isSystemUpdated = data.updatedBy === 'system';
        const isSeedId = docId.includes('seed') || docId.startsWith('cust_seed') || docId.startsWith('st_');
        const isCreditRiskMock = data.status === 'credit_risk' && data.openingBalance === 4575900;
        const isCombinedMock = data.customerId === 'CUST-001' || data.customerId === 'CUST-002' || data.customerId === 'CUST-004' || data.code === 'ST-001' || data.code === 'ST-002';
        
        if (isSystemUpdated || isSeedId || isCreditRiskMock || isCombinedMock) {
          console.log(`Deleting mock data in ${colName}: ${docId}`);
          await deleteDoc(doc(db, colName, docId));
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function restoreLostCustomers() {
  console.log("[Restore] Starting restoreLostCustomers self-healing routine... (Forced)");

  let snapshot;
  try {
    snapshot = await getDocs(collection(db, 'customers'));
  } catch (err: any) {
    console.error("[Restore] Failed to fetch 'customers' collection:", err);
    throw err;
  }
  
  const existingCustomers = snapshot.docs.map(docSnap => ({
    docId: docSnap.id,
    ...(docSnap.data() as Customer)
  }));

  const now = Date.now();

  const existingCust1 = existingCustomers.find(c => c.customerId === 'CUST-001');
  const existingCust2 = existingCustomers.find(c => c.customerId === 'CUST-002');
  const existingCust4 = existingCustomers.find(c => c.customerId === 'CUST-004');

  const id1 = existingCust1?.docId || 'cust_loruk_global';
  const id2 = existingCust2?.docId || 'cust_loruk_chepareria';

  try {
      await setDoc(doc(db, 'customers', id1), {
        customerId: 'CUST-001',
        name: 'Loruk Global',
        creditLimit: 2000000,
        balance: 4575900,
        totalPurchases: 4575900,
        status: 'credit_risk',
        openingBalance: 4575900,
        updatedBy: 'system',
        actionType: 'update',
        createdAt: now,
        updatedAt: now
      }, { merge: true });
  } catch (err: any) {
      console.error("[Restore] Failed to set/update customer CUST-001:", id1, err);
  }

  try {
      await setDoc(doc(db, 'customers', id2), {
        customerId: 'CUST-002',
        name: 'Loruk Chepareria',
        creditLimit: 500000,
        balance: 210200,
        totalPurchases: 210200,
        status: 'active',
        openingBalance: 210200,
        updatedBy: 'system',
        actionType: 'update',
        createdAt: now,
        updatedAt: now
      }, { merge: true });
  } catch (err: any) {
      console.error("[Restore] Failed to set/update customer CUST-002:", id2, err);
  }

  if (existingCust4) {
    try {
      await deleteDoc(doc(db, 'customers', existingCust4.docId));
      console.log("[Restore] Obsolete mock customer CUST-004 (Kapeways) deleted successfully.");
    } catch (err: any) {
      console.error("[Restore] Failed to delete customer CUST-004:", err);
    }
  }
}

export { updateLpgStock, updateFuelVolume } from './inventoryUpdate';

