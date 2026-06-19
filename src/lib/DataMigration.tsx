import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db as targetDb, auth } from './firebase';
import { Loader2, Database, AlertTriangle } from 'lucide-react';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export function DataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyToMigrate, setReadyToMigrate] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('loruk_data_recovery_from_vial_v4_done')) {
      setIsDone(true);
      return;
    }
    // Only show if user is authenticated in the new DB
    if (auth.currentUser) {
      setReadyToMigrate(true);
    }
  }, [auth.currentUser]);

  const runMigration = async () => {
    if (!auth.currentUser) return;
    
    setIsMigrating(true);
    setError(null);
    try {
      const sourceApp = initializeApp(firebaseAppletConfig, "sourceApp_" + Date.now());
      const sourceAuth = getAuth(sourceApp);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(sourceAuth, provider);
      
      const sourceDb = getFirestore(sourceApp, (firebaseAppletConfig as any).firestoreDatabaseId);

      const collectionsToMigrate = [
        'customers', 'deliveries', 'payments', 'stations', 'lpg_inventory',
        'burner_inventory', 'daily_reports', 'invoice_payments', 'fuel_rates',
        'pump_readings', 'lpg_sales', 'lpg_purchases', 'burner_sales',
        'burner_purchases', 'grill_sales', 'grill_purchases', 'expenses',
        'cash_positions', 'invoices', 'station_customers', 'expense_categories',
        'fleetExpenses'
      ];

      // Step 1: Wipe current collections to prevent any duplicates from seed or previous attempts
      for (const colName of collectionsToMigrate) {
        console.log(`Clearing existing ${colName}...`);
        const existingDocs = await getDocs(collection(targetDb, colName));
        for (const existingDoc of existingDocs.docs) {
          await deleteDoc(doc(targetDb, colName, existingDoc.id));
        }
      }

      let totalRecords = 0;

      // Step 2: Migrate filtered data
      for (const colName of collectionsToMigrate) {
        console.log(`Migrating ${colName}...`);
        let snap;
        try {
          snap = await getDocs(collection(sourceDb, colName));
        } catch (e: any) {
           throw new Error(`Failed to READ from sourceDb (${colName}): ` + e.message);
        }
        
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const docId = docSnap.id;
          
          // --- Custom Filters based on User Request ---
          
          // Ignore known seed documents and anything marked as actionType 'delete' 
          if (['cust_seed_1', 'cust_seed_2', 'st_1', 'st_2'].includes(docId) || docId.includes('seed')) {
            continue;
          }
          if (data.actionType === 'delete' || data.isDeleted === true) {
            continue;
          }

          const dateField = data.date || data.createdAt;
          
          // "payments and fuel deliveries from the beginning of June to date"
          if (colName === 'payments' || colName === 'deliveries') {
            if (dateField && new Date(dateField) < new Date('2026-06-01')) {
              continue;
            }
          }

          try {
            await setDoc(doc(targetDb, colName, docId), data);
            totalRecords++;
          } catch (e: any) {
            throw new Error(`Failed to WRITE to targetDb (${colName}/${docId}): ` + e.message);
          }
        }
      }

      console.log(`Successfully recovered ${totalRecords} records.`);
      localStorage.setItem('loruk_data_recovery_from_vial_v4_done', 'true');
      setIsDone(true);
      window.location.reload(); // Reload to flush any local state/cache after wiping and writing
    } catch (err: any) {
      console.error("Migration failed:", err);
      setError(err.message || "Failed to recover data");
    } finally {
      setIsMigrating(false);
    }
  };

  if (isDone) return null;

  if (isMigrating) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-900 border border-blue-700 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50">
        <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
        <div>
          <h4 className="font-semibold text-sm">Transferring your data...</h4>
          <p className="text-xs text-blue-200">Cleaning old data and restoring selected records from previous database...</p>
        </div>
      </div>
    );
  }

  if (readyToMigrate) {
     return (
       <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-[400px] bg-blue-950 border border-blue-800 text-white p-5 rounded-xl shadow-2xl z-50">
         <div className="flex items-start gap-3 mb-3">
           <div className="p-2 bg-blue-900 rounded-lg">
             <AlertTriangle className="w-6 h-6 text-yellow-400" />
           </div>
           <div>
             <h4 className="font-semibold text-base text-yellow-50">Final Fleet Sync</h4>
             <p className="text-sm text-blue-200 mt-2 leading-relaxed">
               I have added <b>Fleet Expenses</b> to the recovery process. This will:
               <br/><br/>
               1. <b>Wipe</b> the current view (to undo duplicates/incomplete pulls).<br/>
               2. <b>Import Customers</b> CUST-001 to CUST-011.<br/>
               3. <b>Import Deliveries/Payments</b> only from <b>June 1st</b>.<br/>
               4. <b>Import ALL Fleet Records</b> (ignoring anything marked as deleted/seed).<br/><br/>
               Click to authorize the old database and migrate.
             </p>
           </div>
         </div>
         {error && <p className="text-xs text-red-300 mb-3 bg-red-950 p-2 rounded">{error}</p>}
         <button onClick={runMigration} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg text-sm transition-colors mt-2">
           Run Final Sync
         </button>
       </div>
     );
  }

  return null;
}
