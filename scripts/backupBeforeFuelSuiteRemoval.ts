/**
 * FuelSuite Pro removal — STEP 1: BACKUP
 * ---------------------------------------
 * Exports the full FuelSuite removal scope (scripts/removeFuelSuiteData.ts) to
 * JSON under backups/fuelsuite-<timestamp>/, with a manifest of row counts.
 *
 * Scope mirrored exactly from removeFuelSuiteData.ts:
 *   A) fuelsuite_* collections
 *   B) shared station-operations collections (entered via FuelSuite flows)
 *   C) stations/{ndalu|junction}/daily_reports subcollections
 *   D) fuelsuite-tagged rows in the shared 'products' collection
 *   E) FuelSuite parent docs in shared 'stations' collection
 *
 * Usage:
 *   npx tsx scripts/backupBeforeFuelSuiteRemoval.ts
 */
import { collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/firebase';

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

const counts: Record<string, number> = {};

async function dumpSimple(name: string, colPath: string[]): Promise<void> {
  try {
    const snap = await getDocs(collection(db, ...(colPath as [string])));
    const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    const rel = colPath.join('_');
    fs.writeFileSync(path.join(outDir, `${rel}.json`), JSON.stringify(docs, null, 2), 'utf8');
    counts[rel] = docs.length;
    console.log(`  ${rel}: ${docs.length} docs`);
  } catch (e) {
    counts[colPath.join('_')] = -1;
    console.warn(`  ${colPath.join('/')}: read failed (${(e as Error).message})`);
  }
}

let outDir = '';

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  outDir = path.join('backups', `fuelsuite-${ts}`);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Backing up FuelSuite removal scope -> ${outDir}\n`);

  console.log('A) FuelSuite-only collections:');
  for (const c of FUELSUITE_COLLECTIONS) await dumpSimple(c, [c]);

  console.log('B) Shared station-operations collections:');
  for (const c of SHARED_STATION_OPS_COLLECTIONS) await dumpSimple(c, [c]);

  console.log('C) stations daily-report subcollections:');
  for (const { parent, sub } of STATION_SUBCOLLECTIONS) {
    await dumpSimple(`${parent}_${sub}`, ['stations', parent, sub]);
  }

  console.log("D) fuelsuite-tagged rows in 'products':");
  try {
    const snap = await getDocs(collection(db, 'products'));
    const tagged = snap.docs
      .filter(d => d.data()?.namespace === 'fuelsuite' || d.data()?.system === 'fuelsuite')
      .map(d => ({ id: d.id, data: d.data() }));
    fs.writeFileSync(path.join(outDir, 'products_fuelsuite_tagged.json'), JSON.stringify(tagged, null, 2), 'utf8');
    counts['products_fuelsuite_tagged'] = tagged.length;
    console.log(`  products_fuelsuite_tagged: ${tagged.length} docs`);
  } catch (e) {
    counts['products_fuelsuite_tagged'] = -1;
    console.warn(`  products: read failed (${(e as Error).message})`);
  }

  console.log("E) FuelSuite parent docs in 'stations':");
  try {
    const snap = await getDocs(collection(db, 'stations'));
    const parents = snap.docs
      .filter(d => FUELSUITE_STATION_DOC_IDS.includes(d.id))
      .map(d => ({ id: d.id, data: d.data() }));
    fs.writeFileSync(path.join(outDir, 'stations_fuelsuite_parents.json'), JSON.stringify(parents, null, 2), 'utf8');
    counts['stations_fuelsuite_parents'] = parents.length;
    console.log(`  stations_fuelsuite_parents: ${parents.length} docs`);
  } catch (e) {
    counts['stations_fuelsuite_parents'] = -1;
    console.warn(`  stations: read failed (${(e as Error).message})`);
  }

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), counts }, null, 2),
    'utf8'
  );
  console.log(`\nBackup complete. Manifest: ${path.join(outDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
