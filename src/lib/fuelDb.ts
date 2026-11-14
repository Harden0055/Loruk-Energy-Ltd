/**
 * FuelSuite data layer — fuel-station sales & daily-recording system.
 *
 * Completely isolated from the main application's data: every FuelSuite
 * collection is prefixed `fs_` and nothing here reads or writes the main
 * app's collections (customers, deliveries, payments, products, ...).
 *
 * Conventions follow src/lib/operationsDb.ts: onSnapshot hooks with an
 * offline/quota localStorage fallback, and mutation wrappers that sanitize
 * payloads for Firestore.
 */
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useState, useEffect } from 'react';
import {
  isQuotaExceeded, markQuotaExceeded, getLocalCollection, saveLocalCollection,
  addLocalDoc, updateLocalDoc, deleteLocalDoc
} from './localDbFallback';
import { sanitizePayload } from './db';

// ---------------- TYPES ----------------

export interface FuelStation {
  id: string;
  name: string;
  location?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface FuelSalesperson {
  id: string;
  name: string;
  phone?: string;
  stationIds: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FuelProductReading {
  salesStart: number;
  salesStop: number;
  litresStart: number;
  litresStop: number;
  rate: number;
}

export interface FuelDailyRecord {
  id: string;
  stationId: string;
  stationName: string;
  dateKey: string;   // YYYY-MM-DD (dedup + grouping)
  date: number;      // timestamp (noon UTC-safe via parseDateToTimestamp)
  salespersonId?: string;
  salespersonName?: string;
  ago: FuelProductReading;
  pms: FuelProductReading;
  startSource: 'auto' | 'manual';
  note?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
  corrections?: Array<{ at: number; by: string; reason: string; changes: string }>;
}

export interface FuelProduct {
  id: string;
  name: string;
  category: string;          // LPG Cylinder | Burner | Grill | Other
  unit: string;              // pcs | kg
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  sellable: boolean;         // false = empty cylinders / containers (not sold)
  createdAt: number;
  updatedAt: number;
}

export interface FuelPurchase {
  id: string;
  date: number;
  dateKey: string;
  supplier: string;
  productId: string;
  productName: string;
  qty: number;
  buyingPrice: number;
  totalCost: number;
  paymentMethod: string;     // Cash | M-Pesa | Bank | Cheque | Other
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FuelProductSale {
  id: string;
  date: number;
  dateKey: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  total: number;
  paymentMethod: string;     // Cash | M-Pesa | Bank | Cheque | Other | Credit
  onCredit: boolean;
  creditCustomerId?: string;
  creditCustomerName?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FuelExpense {
  id: string;
  date: number;
  dateKey: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FuelExpenseCategory { id: string; name: string; }

export interface FuelCreditCustomer {
  id: string;
  name: string;
  phone?: string;
  creditLimit: number;
  balance: number;           // positive = owed to us
  createdAt: number;
  updatedAt: number;
}

export interface FuelCreditTx {
  id: string;
  customerId: string;
  customerName: string;
  date: number;
  dateKey: string;
  amount: number;
  type: 'credit' | 'repayment';
  method?: string;           // repayment method (Cash | M-Pesa | ...)
  reference?: string;
  note?: string;
  balanceAfter: number;
  createdBy?: string;
  createdAt: number;
}

export interface FuelPayment {
  id: string;
  date: number;
  dateKey: string;
  amount: number;
  method: string;            // M-Pesa | Cash at Hand | Bank | Other
  reference?: string;
  note?: string;
  createdBy?: string;
  createdAt: number;
}

export interface FuelAuditEntry {
  id: string;
  area: string;              // Daily Records | Prices | Purchases | Expenses | Debts | ...
  action: string;            // create | edit | correction | price-change | ...
  entityLabel: string;
  details?: string;
  reason?: string;
  by?: string;
  at: number;
}

// ---------------- CONSTANTS ----------------

export const FUEL_PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank', 'Cheque', 'Other'];
export const FUEL_PRODUCT_CATEGORIES = ['LPG Cylinder', 'Burner', 'Grill', 'White Oils', 'Other'];
export const DEFAULT_FUEL_PRODUCTS = [
  { name: 'Premium', category: 'White Oils', unit: 'L' },
  { name: 'Diesel', category: 'White Oils', unit: 'L' },
];
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Fuel & Energy', 'Staff Wages', 'Transport', 'Rent', 'Repairs & Maintenance',
  'Utilities', 'Licences & Permits', 'Bank Charges', 'Miscellaneous'
];

export const COLLECTIONS = {
  stations: 'fs_stations',
  salespeople: 'fs_salespeople',
  dailyRecords: 'fs_daily_records',
  products: 'fs_products',
  purchases: 'fs_purchases',
  productSales: 'fs_product_sales',
  expenses: 'fs_expenses',
  expenseCategories: 'fs_expense_categories',
  creditCustomers: 'fs_credit_customers',
  creditTxs: 'fs_credit_transactions',
  payments: 'fs_payments',
  audit: 'fs_audit_log',
} as const;

// ---------------- GENERIC HOOK (offline/quota safe) ----------------

function useFuelCollection<T>(name: string, sortField?: string, direction: 'asc' | 'desc' = 'desc') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sortLocally = (rows: any[]) => {
      if (!sortField) return rows;
      return [...rows].sort((a: any, b: any) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return direction === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
      });
    };

    if (isQuotaExceeded()) {
      setData(sortLocally(getLocalCollection(name)) as T[]);
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, name);
      const unsub = onSnapshot(colRef, (snapshot) => {
        let loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        loaded = sortLocally(loaded);
        saveLocalCollection(name, loaded);
        setData(loaded as T[]);
        setLoading(false);
      }, (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
          markQuotaExceeded();
          setData(sortLocally(getLocalCollection(name)) as T[]);
        } else {
          console.error(`FuelSuite snapshot error on ${name}:`, error);
        }
        setLoading(false);
      });
      return unsub;
    } catch (error) {
      console.error(`FuelSuite hook error on ${name}:`, error);
      setData(sortLocally(getLocalCollection(name)) as T[]);
      setLoading(false);
    }
  }, [name, sortField, direction]);

  return { data, loading };
}

// ---------------- HOOKS ----------------

export const useFuelStations = () => useFuelCollection<FuelStation>(COLLECTIONS.stations, 'name', 'asc');
export const useFuelSalespeople = () => useFuelCollection<FuelSalesperson>(COLLECTIONS.salespeople, 'name', 'asc');
export const useFuelDailyRecords = () => useFuelCollection<FuelDailyRecord>(COLLECTIONS.dailyRecords, 'date', 'desc');
export const useFuelProducts = () => useFuelCollection<FuelProduct>(COLLECTIONS.products, 'name', 'asc');
export const useFuelPurchases = () => useFuelCollection<FuelPurchase>(COLLECTIONS.purchases, 'date', 'desc');
export const useFuelProductSales = () => useFuelCollection<FuelProductSale>(COLLECTIONS.productSales, 'date', 'desc');
export const useFuelExpenses = () => useFuelCollection<FuelExpense>(COLLECTIONS.expenses, 'date', 'desc');
export const useFuelExpenseCategories = () => useFuelCollection<FuelExpenseCategory>(COLLECTIONS.expenseCategories, 'name', 'asc');
export const useFuelCreditCustomers = () => useFuelCollection<FuelCreditCustomer>(COLLECTIONS.creditCustomers, 'name', 'asc');
export const useFuelCreditTxs = () => useFuelCollection<FuelCreditTx>(COLLECTIONS.creditTxs, 'date', 'desc');
export const useFuelPayments = () => useFuelCollection<FuelPayment>(COLLECTIONS.payments, 'date', 'desc');
export const useFuelAudit = () => useFuelCollection<FuelAuditEntry>(COLLECTIONS.audit, 'at', 'desc');

// ---------------- MUTATION HELPERS ----------------

async function fuelAdd<T extends object>(name: string, payload: T): Promise<string> {
  const clean = sanitizePayload(payload as any);
  if (isQuotaExceeded()) {
    return addLocalDoc(name, clean as any)?.id || `local_${Date.now()}`;
  }
  try {
    const ref = await addDoc(collection(db, name), clean);
    return ref.id;
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
      markQuotaExceeded();
      return addLocalDoc(name, clean as any)?.id || `local_${Date.now()}`;
    }
    console.error(`FuelSuite add error on ${name}:`, error);
    throw error;
  }
}

async function fuelUpdate(name: string, id: string, updates: object) {
  const clean = sanitizePayload(updates as any);
  if (isQuotaExceeded()) {
    updateLocalDoc(name, id, clean);
    return;
  }
  try {
    await updateDoc(doc(db, name, id), clean);
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
      markQuotaExceeded();
      updateLocalDoc(name, id, clean);
      return;
    }
    console.error(`FuelSuite update error on ${name}/${id}:`, error);
    throw error;
  }
}

async function fuelDelete(name: string, id: string) {
  if (isQuotaExceeded()) {
    deleteLocalDoc(name, id);
    return;
  }
  try {
    await deleteDoc(doc(db, name, id));
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
      markQuotaExceeded();
      deleteLocalDoc(name, id);
      return;
    }
    console.error(`FuelSuite delete error on ${name}/${id}:`, error);
    throw error;
  }
}

export async function logFuelAudit(entry: {
  area: string;
  action: string;
  entityLabel: string;
  details?: string;
  reason?: string;
}) {
  const payload: Omit<FuelAuditEntry, 'id'> = {
    ...entry,
    by: auth.currentUser?.email || 'unknown',
    at: Date.now(),
  };
  try {
    await fuelAdd(COLLECTIONS.audit, payload);
  } catch (err) {
    console.error('FuelSuite audit log failed (non-blocking):', err);
  }
}

const nowStamp = () => ({ createdAt: Date.now(), updatedAt: Date.now() });
export const currentUserEmail = () => auth.currentUser?.email || 'unknown';

// ---------------- STATIONS & SALESPEOPLE ----------------

export async function createFuelStation(data: { name: string; location?: string; active?: boolean }) {
  const payload = { ...data, active: data.active !== false, ...nowStamp(), updatedBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.stations, payload);
  await logFuelAudit({ area: 'Stations', action: 'create', entityLabel: data.name });
  return id;
}

export async function updateFuelStation(id: string, updates: Partial<FuelStation>) {
  await fuelUpdate(COLLECTIONS.stations, id, { ...updates, updatedAt: Date.now(), updatedBy: currentUserEmail() });
  await logFuelAudit({ area: 'Stations', action: 'edit', entityLabel: updates.name || id, details: JSON.stringify(updates) });
}

export async function createFuelSalesperson(data: { name: string; phone?: string; stationIds: string[]; active?: boolean }) {
  const payload = { ...data, active: data.active !== false, ...nowStamp() };
  const id = await fuelAdd(COLLECTIONS.salespeople, payload);
  await logFuelAudit({ area: 'Salespeople', action: 'create', entityLabel: data.name });
  return id;
}

export async function updateFuelSalesperson(id: string, updates: Partial<FuelSalesperson>) {
  await fuelUpdate(COLLECTIONS.salespeople, id, { ...updates, updatedAt: Date.now() });
  await logFuelAudit({ area: 'Salespeople', action: 'edit', entityLabel: updates.name || id, details: JSON.stringify(updates) });
}

// ---------------- DAILY FUEL RECORDS ----------------

export async function createFuelDailyRecord(
  data: Omit<FuelDailyRecord, 'id' | 'createdAt' | 'updatedAt'>,
  auditDetails?: string
) {
  const payload = { ...data, ...nowStamp(), createdBy: currentUserEmail(), updatedBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.dailyRecords, payload);
  await logFuelAudit({
    area: 'Daily Records',
    action: 'create',
    entityLabel: `${data.stationName} · ${data.dateKey}${data.salespersonName ? ' · ' + data.salespersonName : ''}`,
    details: auditDetails,
  });
  return id;
}

/** Authorized correction: keeps the original values snapshot + reason in corrections[]. */
export async function correctFuelDailyRecord(
  record: FuelDailyRecord,
  updates: Partial<FuelDailyRecord>,
  reason: string
) {
  const original = { ago: record.ago, pms: record.pms, note: record.note || '' };
  const next = { ...record, ...updates } as FuelDailyRecord;
  const changes: string[] = [];
  (['ago', 'pms'] as const).forEach(p => {
    const o = original[p] as FuelProductReading;
    const n = next[p] as FuelProductReading;
    (['salesStart', 'salesStop', 'litresStart', 'litresStop', 'rate'] as const).forEach(k => {
      if ((o?.[k] || 0) !== (n?.[k] || 0)) {
        changes.push(`${p.toUpperCase()}.${k}: ${o?.[k] ?? '—'} → ${n?.[k] ?? '—'}`);
      }
    });
  });
  const correction = { at: Date.now(), by: currentUserEmail(), reason, changes: changes.join('; ') || 'metadata only' };
  await fuelUpdate(COLLECTIONS.dailyRecords, record.id, {
    ...updates,
    corrections: [...(record.corrections || []), correction],
    updatedAt: Date.now(),
    updatedBy: currentUserEmail(),
  });
  await logFuelAudit({
    area: 'Daily Records',
    action: 'correction',
    entityLabel: `${record.stationName} · ${record.dateKey}`,
    details: correction.changes,
    reason,
  });
}

// ---------------- PRODUCTS ----------------

export async function createFuelProduct(data: {
  name: string; category: string; unit: string;
  buyingPrice: number; sellingPrice: number; stock: number; sellable: boolean;
}) {
  const payload = { ...data, ...nowStamp() };
  const id = await fuelAdd(COLLECTIONS.products, payload);
  await logFuelAudit({ area: 'Products', action: 'create', entityLabel: data.name, details: `Buying ${data.buyingPrice} · Selling ${data.sellingPrice}` });
  return id;
}

export async function updateFuelProduct(id: string, current: FuelProduct, updates: Partial<FuelProduct>) {
  await fuelUpdate(COLLECTIONS.products, id, { ...updates, updatedAt: Date.now() });
  const priceBits: string[] = [];
  if (updates.buyingPrice != null && updates.buyingPrice !== current.buyingPrice) priceBits.push(`buying ${current.buyingPrice} → ${updates.buyingPrice}`);
  if (updates.sellingPrice != null && updates.sellingPrice !== current.sellingPrice) priceBits.push(`selling ${current.sellingPrice} → ${updates.sellingPrice}`);
  if (updates.stock != null && updates.stock !== current.stock) priceBits.push(`stock ${current.stock} → ${updates.stock}`);
  await logFuelAudit({
    area: 'Products',
    action: priceBits.length ? 'price-change' : 'edit',
    entityLabel: updates.name || current.name,
    details: priceBits.join('; ') || JSON.stringify(updates),
  });
}

export async function deleteFuelProduct(id: string, name: string) {
  await fuelDelete(COLLECTIONS.products, id);
  await logFuelAudit({ area: 'Products', action: 'delete', entityLabel: name });
}

/** Stock delta applied by purchases (+) and product sales (−). */
export async function adjustFuelProductStock(productId: string, product: FuelProduct, delta: number, reason: string) {
  const nextStock = Math.round(((product.stock || 0) + delta) * 1000) / 1000;
  await fuelUpdate(COLLECTIONS.products, productId, { stock: nextStock, updatedAt: Date.now() });
  await logFuelAudit({ area: 'Stock', action: delta > 0 ? 'stock-in' : 'stock-out', entityLabel: product.name, details: `${delta > 0 ? '+' : ''}${delta} → ${nextStock} (${reason})` });
}

// ---------------- PURCHASES ----------------

export async function createFuelPurchase(
  data: Omit<FuelPurchase, 'id' | 'createdAt' | 'updatedAt'>,
  product: FuelProduct | undefined,
  opts: { updateBuyingPrice?: boolean } = {}
) {
  const payload = { ...data, ...nowStamp(), createdBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.purchases, payload);
  if (product) {
    await adjustFuelProductStock(product.id, product, data.qty, 'purchase');
    if (opts.updateBuyingPrice && data.buyingPrice > 0 && data.buyingPrice !== product.buyingPrice) {
      await fuelUpdate(COLLECTIONS.products, product.id, { buyingPrice: data.buyingPrice, updatedAt: Date.now() });
      await logFuelAudit({ area: 'Products', action: 'price-change', entityLabel: product.name, details: `buying ${product.buyingPrice} → ${data.buyingPrice} (from purchase)` });
    }
  }
  await logFuelAudit({
    area: 'Purchases', action: 'create',
    entityLabel: `${data.supplier || 'Supplier'} · ${data.productName} × ${data.qty}`,
    details: `Total Ksh ${data.totalCost.toLocaleString()} · ${data.paymentMethod}`,
  });
  return id;
}

export async function deleteFuelPurchase(purchase: FuelPurchase, product: FuelProduct | undefined) {
  await fuelDelete(COLLECTIONS.purchases, purchase.id);
  if (product) {
    await adjustFuelProductStock(product.id, product, -purchase.qty, 'purchase deleted');
  }
  await logFuelAudit({ area: 'Purchases', action: 'delete', entityLabel: `${purchase.supplier || 'Supplier'} · ${purchase.productName} × ${purchase.qty}` });
}

// ---------------- PRODUCT SALES ----------------

export async function createFuelProductSale(
  data: Omit<FuelProductSale, 'id' | 'createdAt' | 'updatedAt'>,
  product: FuelProduct | undefined,
  creditBalanceAfter?: number
) {
  const payload = { ...data, ...nowStamp(), createdBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.productSales, payload);
  if (product) {
    await adjustFuelProductStock(product.id, product, -data.qty, 'product sale');
  }
  if (data.onCredit && data.creditCustomerId && creditBalanceAfter != null) {
    await logFuelAudit({
      area: 'Debts', action: 'credit-sale',
      entityLabel: data.creditCustomerName || data.creditCustomerId,
      details: `+Ksh ${data.total.toLocaleString()} (sale of ${data.productName} × ${data.qty})`,
    });
  }
  await logFuelAudit({
    area: 'Sales', action: 'create',
    entityLabel: `${data.productName} × ${data.qty}`,
    details: `Ksh ${data.total.toLocaleString()} · ${data.paymentMethod}`,
  });
  return id;
}

/** Deletes a cash product sale and restores the stock it consumed. */
export async function deleteFuelProductSale(sale: FuelProductSale, product: FuelProduct | undefined) {
  await fuelDelete(COLLECTIONS.productSales, sale.id);
  if (product) {
    await adjustFuelProductStock(product.id, product, sale.qty, 'sale deleted');
  }
  await logFuelAudit({
    area: 'Sales', action: 'delete',
    entityLabel: `${sale.productName} × ${sale.qty}`,
    details: `Ksh ${sale.total.toLocaleString()} · ${sale.paymentMethod}`,
  });
}

// ---------------- EXPENSES ----------------

export async function createFuelExpense(data: Omit<FuelExpense, 'id' | 'createdAt' | 'updatedAt'>) {
  const payload = { ...data, ...nowStamp(), createdBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.expenses, payload);
  await logFuelAudit({ area: 'Expenses', action: 'create', entityLabel: `${data.category}: ${data.description || '—'}`, details: `Ksh ${data.amount.toLocaleString()} · ${data.paymentMethod}` });
  return id;
}

export async function updateFuelExpense(id: string, current: FuelExpense, updates: Partial<FuelExpense>) {
  await fuelUpdate(COLLECTIONS.expenses, id, { ...updates, updatedAt: Date.now() });
  await logFuelAudit({
    area: 'Expenses', action: 'edit',
    entityLabel: `${(updates.category || current.category)}: ${(updates.description || current.description) || '—'}`,
    details: `Ksh ${(updates.amount ?? current.amount).toLocaleString()}`,
  });
}

export async function deleteFuelExpense(expense: FuelExpense) {
  await fuelDelete(COLLECTIONS.expenses, expense.id);
  await logFuelAudit({ area: 'Expenses', action: 'delete', entityLabel: `${expense.category}: ${expense.description || '—'}`, details: `Ksh ${expense.amount.toLocaleString()}` });
}

export async function createFuelExpenseCategory(name: string) {
  const id = await fuelAdd(COLLECTIONS.expenseCategories, { name });
  await logFuelAudit({ area: 'Expenses', action: 'category-create', entityLabel: name });
  return id;
}

export async function deleteFuelExpenseCategory(id: string, name: string) {
  await fuelDelete(COLLECTIONS.expenseCategories, id);
  await logFuelAudit({ area: 'Expenses', action: 'category-delete', entityLabel: name });
}

/** Seeds the default categories once (safe to call repeatedly). */
export async function ensureFuelExpenseCategories(existing: FuelExpenseCategory[]) {
  if (existing.length > 0) return;
  const names = getLocalCollection(COLLECTIONS.expenseCategories);
  if (names.length > 0) return;
  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    await fuelAdd(COLLECTIONS.expenseCategories, { name });
  }
}

/** Seeds Premium & Diesel under White Oils once, when no products exist yet. */
export async function ensureFuelDefaultProducts(existing: FuelProduct[]) {
  if (existing.length > 0) return;
  const local = getLocalCollection(COLLECTIONS.products);
  if (local.length > 0) return;
  for (const def of DEFAULT_FUEL_PRODUCTS) {
    await createFuelProduct({
      name: def.name,
      category: def.category,
      unit: def.unit,
      buyingPrice: 0,
      sellingPrice: 0,
      stock: 0,
      sellable: true,
    });
  }
}

// ---------------- DEBTS (CREDIT CUSTOMERS & TRANSACTIONS) ----------------

export async function createFuelCreditCustomer(data: { name: string; phone?: string; creditLimit: number; openingBalance?: number }) {
  const balance = data.openingBalance || 0;
  const payload = { name: data.name, phone: data.phone, creditLimit: data.creditLimit, balance, ...nowStamp() };
  const id = await fuelAdd(COLLECTIONS.creditCustomers, payload);
  await logFuelAudit({
    area: 'Debts', action: 'customer-create', entityLabel: data.name,
    details: `Limit Ksh ${data.creditLimit.toLocaleString()} · Opening balance Ksh ${balance.toLocaleString()}`,
  });
  if (balance !== 0) {
    await fuelAdd(COLLECTIONS.creditTxs, sanitizePayload({
      customerId: id, customerName: data.name, date: Date.now(), dateKey: new Date().toISOString().slice(0, 10),
      amount: balance, type: 'credit', note: 'Opening balance', balanceAfter: balance,
      createdBy: currentUserEmail(), createdAt: Date.now(),
    }) as any);
  }
  return id;
}

export async function updateFuelCreditCustomer(id: string, current: FuelCreditCustomer, updates: Partial<FuelCreditCustomer>) {
  await fuelUpdate(COLLECTIONS.creditCustomers, id, { ...updates, updatedAt: Date.now() });
  const bits: string[] = [];
  if (updates.creditLimit != null && updates.creditLimit !== current.creditLimit) bits.push(`limit ${current.creditLimit} → ${updates.creditLimit}`);
  if (updates.name != null && updates.name !== current.name) bits.push(`name "${current.name}" → "${updates.name}"`);
  await logFuelAudit({ area: 'Debts', action: 'customer-edit', entityLabel: updates.name || current.name, details: bits.join('; ') });
}

/** Records a credit or repayment transaction and moves the customer balance. */
export async function recordFuelCreditTx(data: {
  customerId: string; customerName: string; date: number; dateKey: string;
  amount: number; type: 'credit' | 'repayment'; method?: string; reference?: string; note?: string;
}, currentBalance: number) {
  const signed = data.type === 'credit' ? data.amount : -data.amount;
  const balanceAfter = Math.round((currentBalance + signed) * 100) / 100;
  const payload = { ...data, balanceAfter, createdBy: currentUserEmail(), createdAt: Date.now() };
  const id = await fuelAdd(COLLECTIONS.creditTxs, payload);
  await fuelUpdate(COLLECTIONS.creditCustomers, data.customerId, { balance: balanceAfter, updatedAt: Date.now() });
  await logFuelAudit({
    area: data.type === 'credit' ? 'Debts' : 'Paid Debts',
    action: data.type,
    entityLabel: data.customerName,
    details: `Ksh ${data.amount.toLocaleString()}${data.method ? ' · ' + data.method : ''} · balance → Ksh ${balanceAfter.toLocaleString()}`,
  });
  return id;
}

export async function deleteFuelCreditCustomer(id: string, name: string) {
  await fuelDelete(COLLECTIONS.creditCustomers, id);
  await logFuelAudit({ area: 'Debts', action: 'customer-delete', entityLabel: name });
}

// ---------------- PAYMENTS RECEIVED ----------------

export async function createFuelPayment(data: Omit<FuelPayment, 'id' | 'createdAt'>) {
  const payload = { ...data, createdAt: Date.now(), createdBy: currentUserEmail() };
  const id = await fuelAdd(COLLECTIONS.payments, payload);
  await logFuelAudit({ area: 'Payments', action: 'create', entityLabel: `${data.method}: Ksh ${data.amount.toLocaleString()}`, details: data.reference || data.note });
  return id;
}

export async function deleteFuelPayment(payment: FuelPayment) {
  await fuelDelete(COLLECTIONS.payments, payment.id);
  await logFuelAudit({ area: 'Payments', action: 'delete', entityLabel: `${payment.method}: Ksh ${payment.amount.toLocaleString()}` });
}

// ---------------- BULK READ (for one-off totals, e.g. funding panel) ----------------

export async function fetchFuelCollection<T>(name: string): Promise<T[]> {
  if (isQuotaExceeded()) return getLocalCollection(name) as T[];
  try {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as any)) as T[];
  } catch (error) {
    console.error(`FuelSuite fetch error on ${name}:`, error);
    return getLocalCollection(name) as T[];
  }
}
