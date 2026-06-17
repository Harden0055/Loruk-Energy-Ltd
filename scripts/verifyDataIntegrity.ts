import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

const COLLECTIONS_TO_VERIFY = [
  'stations',
  'pump_readings',
  'lpg_inventory',
  'invoices'
];

interface MissingFieldsRecord {
  id: string;
  missing: string[];
  data: any;
}

export async function verifyDataIntegrity(fixErrors: boolean = false) {
  console.log(`Starting Data Integrity Check...\n---------------------------------`);
  
  let totalDocsScanned = 0;
  let totalDocsMissingFields = 0;

  for (const collectionName of COLLECTIONS_TO_VERIFY) {
    console.log(`\nVerifying collection: '${collectionName}'`);
    
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      
      const missingRecords: MissingFieldsRecord[] = [];

      snapshot.docs.forEach(docSnap => {
        totalDocsScanned++;
        const data = docSnap.data();
        const missing: string[] = [];
        
        if (!data.stationId) missing.push('stationId');
        if (!data.createdAt) missing.push('createdAt');
        if (!data.updatedAt) missing.push('updatedAt');
        
        // Sometimes stationId is stored under 'station' if there is no stationId.
        // Or sometimes 'createdAt' is just missing entirely.
        
        if (missing.length > 0) {
          missingRecords.push({
            id: docSnap.id,
            missing,
            data
          });
        }
      });
      
      if (missingRecords.length === 0) {
        console.log(`✅ [${collectionName}]: All ${snapshot.docs.length} documents are structurally intact.`);
      } else {
        totalDocsMissingFields += missingRecords.length;
        console.log(`⚠️ [${collectionName}]: Found ${missingRecords.length} / ${snapshot.docs.length} documents missing required fields.`);
        missingRecords.forEach((record, index) => {
          console.log(`  ${index + 1}. Doc ID: ${record.id} -> Missing: [${record.missing.join(', ')}]`);
        });
        
        if (fixErrors) {
          console.log(`\nAttempting to patch missing fields in '${collectionName}'...`);
          const now = Date.now();
          for (const record of missingRecords) {
            try {
              const docRef = doc(db, collectionName, record.id);
              const updates: any = {};
              
              if (record.missing.includes('createdAt')) updates.createdAt = now;
              if (record.missing.includes('updatedAt')) updates.updatedAt = now;
              if (record.missing.includes('stationId')) {
                // Heuristic mapping: guess stationId from 'station' if possible, or fallback to 'unknown'
                const stationName = record.data.location || record.data.station || '';
                updates.stationId = (stationName || 'unknown').toLowerCase().replace(/\s+/g, '-');
              }
              
              await updateDoc(docRef, updates);
              console.log(`    -> Patched Doc ID: ${record.id}`);
            } catch (patchErr: any) {
              console.error(`    -> Failed to patch Doc ID ${record.id}:`, patchErr.message);
            }
          }
          console.log(`Finished patching '${collectionName}'.`);
        }
      }
    } catch (err: any) {
      console.error(`❌ Error verifying collection '${collectionName}':`, err.message);
    }
  }

  console.log(`\n---------------------------------`);
  console.log(`Integrity Check Summary:`);
  console.log(`Total Documents Scanned: ${totalDocsScanned}`);
  console.log(`Documents with Issues: ${totalDocsMissingFields}`);
  console.log(`Health percentage: ${totalDocsScanned > 0 ? (((totalDocsScanned - totalDocsMissingFields) / totalDocsScanned) * 100).toFixed(2) : 0}%`);
  console.log(`---------------------------------\nDone.`);
}

// Execute if run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixArg = process.argv.includes('--fix');
  verifyDataIntegrity(fixArg).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
