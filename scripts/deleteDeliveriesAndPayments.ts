import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function performCleanup() {
  console.log("=== STARTING FUEL DELIVERIES AND PAYMENTS CLEANUP ===");

  try {
    // 1. Delete all deliveries
    console.log("\n1. Deleting all fuel deliveries...");
    const deliveriesRef = collection(db, 'deliveries');
    const deliveriesSnap = await getDocs(deliveriesRef);
    console.log(`Found ${deliveriesSnap.size} deliveries.`);
    
    let deletedDeliveriesCount = 0;
    for (const dDoc of deliveriesSnap.docs) {
      await deleteDoc(doc(db, 'deliveries', dDoc.id));
      deletedDeliveriesCount++;
    }
    console.log(`Successfully deleted ${deletedDeliveriesCount} deliveries.`);

    // 2. Delete all payments
    console.log("\n2. Deleting all customer payments...");
    const paymentsRef = collection(db, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    console.log(`Found ${paymentsSnap.size} payments.`);

    let deletedPaymentsCount = 0;
    for (const pDoc of paymentsSnap.docs) {
      await deleteDoc(doc(db, 'payments', pDoc.id));
      deletedPaymentsCount++;
    }
    console.log(`Successfully deleted ${deletedPaymentsCount} payments.`);

    // 3. Reset customer balances and total purchases to their opening balances
    console.log("\n3. Resetting customer balances and total purchases to opening balances...");
    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);
    console.log(`Found ${customersSnap.size} customers.`);

    for (const cDoc of customersSnap.docs) {
      const data = cDoc.data();
      const openingBalance = typeof data.openingBalance === 'number' ? data.openingBalance : 0;
      
      console.log(`Resetting Customer: "${data.name || cDoc.id}" (ID: ${data.customerId || 'N/A'})`);
      console.log(` -> Current Bal: ${data.balance}, New Bal: ${openingBalance}`);
      console.log(` -> Current Purchases: ${data.totalPurchases}, New Purchases: ${openingBalance}`);
      
      await updateDoc(doc(db, 'customers', cDoc.id), {
        balance: openingBalance,
        totalPurchases: openingBalance,
        updatedAt: Date.now()
      });
    }

    console.log("\n=== CLEANUP COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Cleanup failed with error:", error);
    process.exit(1);
  }
}

performCleanup();
