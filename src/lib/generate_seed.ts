import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from './firebase';

/** Seeds a small set of demo deliveries/payments for visualizing features.
 *  (Cleaned version — the old FuelSuite Pro mock collections were removed.) */
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

  await batch.commit();
}
