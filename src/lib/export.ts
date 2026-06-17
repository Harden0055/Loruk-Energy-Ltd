import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { isQuotaExceeded, getLocalCollection } from './localDbFallback';

export async function exportDataToJson() {
  const collections = ['customers', 'deliveries', 'payments'];
  const backup: any = {};

  if (isQuotaExceeded()) {
    for (const colName of collections) {
      backup[colName] = getLocalCollection(colName);
    }
  } else {
    try {
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        backup[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (error) {
      console.warn("Firestore error during export, falling back to local database copy: ", error);
      for (const colName of collections) {
        backup[colName] = getLocalCollection(colName);
      }
    }
  }

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `loruk_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
