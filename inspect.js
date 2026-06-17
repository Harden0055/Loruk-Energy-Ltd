import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== CUSTOMERS ===");
  const custSnap = await getDocs(collection(db, 'customers'));
  custSnap.forEach(d => console.log(d.id, "=>", JSON.stringify(d.data())));

  console.log("\n=== DELIVERIES ===");
  const delSnap = await getDocs(collection(db, 'deliveries'));
  delSnap.forEach(d => console.log(d.id, "=>", JSON.stringify(d.data())));

  console.log("\n=== PAYMENTS ===");
  const paySnap = await getDocs(collection(db, 'payments'));
  paySnap.forEach(d => console.log(d.id, "=>", JSON.stringify(d.data())));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
