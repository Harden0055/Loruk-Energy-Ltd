import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function seedAllMockData() {
  const batch = writeBatch(db);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  // Create deliveries
  const d1 = { id: 'd1', date: now - 1 * day, carRegistration: 'KDA 123G', litres: 200, totalAmount: 42000, ratePerLitre: 210, customerId: 'CUST-001', station: 'Ndalu Station', createdAt: now, updatedBy: 'system' };
  batch.set(doc(collection(db, 'deliveries'), d1.id), d1);
  const d2 = { id: 'd2', date: now - 2 * day, carRegistration: 'KCD 456T', litres: 100, totalAmount: 21000, ratePerLitre: 210, customerId: 'CUST-002', station: 'Junction Station', createdAt: now, updatedBy: 'system' };
  batch.set(doc(collection(db, 'deliveries'), d2.id), d2);

  // Create payments
  const p1 = { id: 'p1', date: now - 1 * day, amount: 20000, customerId: 'CUST-001', paymentMethod: 'Cash', reference: 'Cash', createdAt: now, updatedBy: 'system' };
  batch.set(doc(collection(db, 'payments'), p1.id), p1);

  // FuelSuite Pro Expenses
  const exp1 = { id: 'exp1', date: new Date(now).toISOString().split('T')[0], carRegistration: 'KDE 999R', amount: 5000, category: 'Fuel', paymentMethod: 'Cash', station: 'Ndalu Station', createdBy: 'Admin', createdAt: now };
  batch.set(doc(collection(db, 'fuelsuite_expenses'), exp1.id), exp1);
  const exp2 = { id: 'exp2', date: new Date(now).toISOString().split('T')[0], carRegistration: 'KZZ 000X', amount: 3500, category: 'Maintenance', paymentMethod: 'M-Pesa', station: 'Junction Station', createdBy: 'Admin', createdAt: now };
  batch.set(doc(collection(db, 'fuelsuite_expenses'), exp2.id), exp2);

  // FuelSuite Pro Invoices
  const inv1 = { id: 'inv1', date: now, invoiceNumber: 'INV-001', customerName: 'Loruk Global', station: 'Ndalu Station', items: [{product: 'Super ( Premium )', quantity: 100, rate: 210, amount: 21000}], invoiceAmount: 21000, paidAmount: 0, balance: 21000, status: 'UNPAID', createdAt: now };
  batch.set(doc(collection(db, 'fuelsuite_invoices'), inv1.id), inv1);

  // FuelSuite Pro Pump Readings
  const pr1 = { id: 'pr1', date: new Date(now).toISOString().split('T')[0], station: 'Ndalu Station', product: 'Super ( Premium )', salesStart: 10000, salesStop: 12000, litresStart: 1000, litresStop: 1050, ratePerLitre: 210 };
  batch.set(doc(collection(db, 'fuelsuite_pumpReadings'), pr1.id), pr1);

  await batch.commit();
}
