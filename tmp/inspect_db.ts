import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8LRKRxmgVQaV2bTNDzOK_ajS1GAXCKTg",
  authDomain: "loruk-energy-ltd.firebaseapp.com",
  projectId: "loruk-energy-ltd",
  storageBucket: "loruk-energy-ltd.firebasestorage.app",
  messagingSenderId: "318142535444",
  appId: "1:318142535444:web:823f491fdf19407a7f1401",
  measurementId: "G-B8Y3X8JS7Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  console.log("=== STATIONS ===");
  const stationsSnap = await getDocs(collection(db, 'fuelsuite_stations'));
  stationsSnap.docs.forEach(d => console.log(d.id, d.data()));

  console.log("\n=== CUSTOMERS ===");
  const custSnap = await getDocs(collection(db, 'fuelsuite_customers'));
  custSnap.docs.forEach(d => console.log(d.id, d.data()));

  console.log("\n=== INVOICES ===");
  const invSnap = await getDocs(collection(db, 'fuelsuite_invoices'));
  invSnap.docs.forEach(d => console.log(d.id, d.data()));

  process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
