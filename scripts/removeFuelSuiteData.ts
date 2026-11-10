/**
 * FuelSuite Pro removal — STEP 3: DATA CLEANUP (destructive!)
 * ------------------------------------------------------------
 * Deletes ONLY the approved FuelSuite removal scope. Main-app core data
 * (customers, deliveries, payments, adjustments, fleetExpenses, trucks,
 * stationReports, products minus fuelsuite-tagged rows, stations except
 * 'ndalu'/'junction') is never touched.
 *
 * SAFETY:
 *   - DRY-RUN by default: prints the deletion scope and row counts.
 *   - Only performs deletion when run with the --execute flag.
 *   - Refuses to run without a completed backup folder (backups/fuelsuite-*)
 *     unless you pass --force.
 *
 * Usage:
 *   npx tsx scripts/removeFuelSuiteData.ts            (dry run, prints scope/counts)
 *   npx tsx scripts/removeFuelSuiteData.ts --execute  (actually delete)
 */
import { collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/firebase';

const EXECUTE = process.argv.includes('--execute');
const FORCE = process.argv.includes('--force');

const FUELSUITE_COLLECTIONS = [
  'fuelsuite_products',
  'fuelsuite_pumpReadings',
  'fuelsuite_lpgTransactions',
  'fuelsuite_inventoryItems',
  'fuelsuite_expenses',
  'fuelsuite_invoices',
  'fuelsuite_cashPositions',
  'fuelsuite_customers',
  'fuelsuite_stations',
  'fuelsuite_expenseTemplates',
];

const SHARED_STATION_OPS_COLLECTIONS = [
  'pump_readings',
  'lpg_sales',
  'lpg_purchases',
  'burner_sales',
  'burner_purchases',
  'grill_sales',
  'grill_purchases',
  'expenses',
  'expense_categories',
  'cash_positions',
  'invoices',
  'invoice_payments',
  'daily_reports',
  'lpg_inventory',
  'burner_inventory',
  'opening_stocks',
  'station_customers',
  'fuel_rates',
];

const STATION_SUBCOLLECTIONS: Array<{ parent: string; sub: string }> = [
  { parent: 'ndalu', sub: 'daily_reports' },
  { parent: 'junction', sub: 'daily_reports' },
];

const FUELSUITE_STATION_DOC_IDS = ['ndalu', 'junction'];
const BATCH_LIMIT = 400;

/** MUST run last: parents of the daily_reports subcollections (Part A). */
const STATION_PARENT_DELETE = 'stations';

async function deleteDocsFlat(colPath: string[]): Promise<number> {
  const snap = await getDocs(collection(db, ...(colPath as [string])));
  const ref = rel(colPath);
  console.log(`  ${ref}: ${snap.size} docs ${EXECUTE ? 'DELETING' : '(dry run — would delete)'}`);
  if (!EXECUTE) return snap.size;

  let batch = writeBatch(db);
  let ops = 0;
  let total = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops++;
    total++;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
      console.log(`    ...${total} deleted (${ref})`);
    }
  }
  if (ops > 0) await batch.commit();
  return total;
}

function rel(colPath: string[]): string {
  return colPath.join('/');
}

async function deleteFuelSuiteTaggedProducts(): Promise<number> {
  const snap = await getDocs(collection(db, 'products'));
  const targets = snap.docs.filter(d => d.data()?.namespace === 'fuelsuite' || d.data()?.system === 'fuelsuite');
  console.log(`  products (fuelsuite-tagged only): ${targets.length} docs ${EXECUTE ? 'DELETING' : '(dry run — would delete)'}`);
  console.log("    (preserved: all other rows in 'products' — main-app products untouched)");
  if (!EXECUTE) return targets.length;
  for (const d of targets) await deleteDoc(doc(db, 'products', d.id));
  return targets.length;
}

async function deleteStationParents(): Promise<number> {
  console.log(`  stations parent docs (id in [${FUELSUITE_STATION_DOC_IDS.join(', ')}] ONLY) ${EXECUTE ? 'DELETING' : '(dry run — would delete)'}`);
  console.log("    (preserved: every other doc in 'stations' — main-app stations untouched)");
  if (!EXECUTE) return FUELSUITE_STATION_DOC_IDS.length;
  let deleted = 0;
  for (const id of FUELSUITE_STATION_DOC_IDS) {
    try {
      await deleteDoc(doc(db, STATION_PARENT_DELETE, id));
      deleted++;
    } catch (e) {
      console.warn(`    stations/${id}: delete failed (${(e as Error).message})`);
    }
  }
  return deleted;
}

async function main() {
  let total = 0;
  const scope: Record<string, number> = {};

  const backupRoot = path.join('backups');
  const hasBackup = fs.existsSync(backupRoot) && fs.readdirSync(backupRoot).some(d => d.startsWith('fuelsuite-'));
  if (!EXECUTE) {
    console.log('=== DRY RUN — nothing will be deleted. Add --execute to delete. ===\n');
  } else {
    if (!FORCE && !hasBackup) {
      console.error('ABORT: no backups/fuelsuite-* folder found. Run scripts/backupBeforeFuelSuiteRemoval.ts first (or pass --force to override).');
      process.exit(1);
    }
    console.log('=== EXECUTE MODE — deleting approved scope. ===\n');
  }

  console.log('A) FuelSuite-only collections:');
  for (const c of FUELSUITE_COLLECTIONS) scope[c] = await deleteDocsFlat([c]);

  console.log('B) Shared station-operations collections (per approved plan):');
  for (const c of SHARED_STATION_OPS_COLLECTIONS) scope[c] = await deleteDocsFlat([c]);

  console.log('C) stations daily-report subcollections (before their parent docs):');
  for (const { parent, sub } of STATION_SUBCOLLECTIONS) {
    scope[`stations/${parent}/${sub}`] = await deleteDocsFlat(['stations', parent, sub]);
  }

  console.log("D) fuelsuite-tagged rows in shared 'products':");
  scope['products::fuelsuite_tagged'] = await deleteFuelSuiteTaggedProducts();

  console.log("E) FuelSuite parent docs in 'stations' (MUST run after C):");
  scope['stations::fuelsuite_parents'] = await deleteStationParents();

  for (const k of Object.keys(scope)) total += scope[k];

  console.log('\n=== SUMMARY ===');
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (deleted)' : 'DRY RUN (nothing deleted)'}`);
  console.log(`Total docs in scope: ${total}`);
  for (const [k, v] of Object.entries(scope)) console.log(`  ${k}: ${v}`);

  if (EXECUTE) {
    fs.mkdirSync('reports', { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join('reports', `fuelsuite_removal_${ts}.json`), JSON.stringify({ deletedAt: new Date().toISOString(), scope, total }, null, 2), 'utf8');
    console.log('Removal log written to reports/. Verify against your backup manifest.');
  }
}

main().catch(err => {
  console.error('Removal failed:', err);
  process.exit(1);
});
