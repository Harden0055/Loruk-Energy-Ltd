import { PumpReading, LPGTransaction, InventoryItem, Expense, Invoice, CashPosition, Customer } from './context';

/**
 * Maps known station name variations to their official canonical station name.
 */
export function canonicalStation(stationStr?: string): string {
  if (!stationStr || typeof stationStr !== 'string') return 'Loruk Ndalu Filling Station';
  const clean = stationStr.trim().toLowerCase();
  if (clean.includes('junction')) {
    return 'Loruk Junction Filling Station';
  }
  if (clean.includes('ndalu')) {
    return 'Loruk Ndalu Filling Station';
  }
  return stationStr.trim();
}

/**
 * Normalizes different date representations (e.g., '2026-08-05', '05 August 2026', '5 Aug 2026', '2026/08/05')
 * into standard YYYY-MM-DD format.
 */
export function normalizeDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  
  // Standard ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Format like YYYY-M-D or YYYY/M/D
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parse natural date strings like "05 August 2026" or "August 5, 2026"
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}

export function cleanStr(str?: string): string {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface DuplicateDetectionResult {
  totalDuplicates: number;
  breakdown: {
    pumpReadings: number;
    lpgTransactions: number;
    inventoryItems: number;
    expenses: number;
    invoices: number;
    cashPositions: number;
    customers: number;
  };
  duplicateDetails: Array<{
    id: string;
    type: 'Pump Reading' | 'LPG Transaction' | 'Inventory' | 'Expense' | 'Invoice' | 'Cash Position' | 'Customer';
    date: string;
    station: string;
    description: string;
  }>;
}

export interface DeduplicateOutput {
  cleanedPumpReadings: PumpReading[];
  cleanedLpgTransactions: LPGTransaction[];
  cleanedInventoryItems: InventoryItem[];
  cleanedExpenses: Expense[];
  cleanedInvoices: Invoice[];
  cleanedCashPositions: CashPosition[];
  cleanedCustomers: Customer[];
  removedCount: number;
  breakdown: {
    pumpReadings: number;
    lpgTransactions: number;
    inventoryItems: number;
    expenses: number;
    invoices: number;
    cashPositions: number;
    customers: number;
  };
  summary: string[];
}

/**
 * Merges duplicate customers into unified, canonical records.
 * Re-maps invoices to canonical customer names and canonical stations.
 */
export function mergeCustomers(
  customers: Customer[],
  invoices: Invoice[]
): {
  mergedCustomers: Customer[];
  updatedInvoices: Invoice[];
  mergedCount: number;
  details: string[];
} {
  const customerGroups = new Map<string, Customer[]>();

  // Group customers by normalized name
  customers.forEach(c => {
    const key = cleanStr(c.name);
    if (!customerGroups.has(key)) {
      customerGroups.set(key, []);
    }
    customerGroups.get(key)!.push(c);
  });

  const mergedCustomers: Customer[] = [];
  const nameMapping = new Map<string, string>(); // oldName (clean) -> canonicalName
  let mergedCount = 0;
  const details: string[] = [];

  customerGroups.forEach((group, key) => {
    if (group.length === 1) {
      const single = group[0];
      // Normalize station name
      mergedCustomers.push({
        ...single,
        station: canonicalStation(single.station)
      });
      nameMapping.set(cleanStr(single.name), single.name);
      return;
    }

    // Multiple records for the same customer name!
    // Pick the most standard / highest quality attributes
    mergedCount += (group.length - 1);
    
    // Choose primary record (prefer one with CST/CUST formatted code or Loruk Ndalu station)
    const primary = group.find(c => c.station?.includes('Loruk')) || group[0];
    const canonicalName = primary.name;
    const canonicalSt = canonicalStation(primary.station);

    // Pick best code (e.g. CUST-xxx or CST-xxx)
    const bestCode = group.map(c => c.code).find(code => code && (code.startsWith('CUST-') || code.startsWith('CST-') || code.startsWith('CUT-'))) || primary.code;
    
    // Max credit limit
    const maxCreditLimit = Math.max(...group.map(c => Number(c.creditLimit) || 0));
    
    // Opening balance (prefer positive non-zero or largest)
    const nonZeroOpening = group.find(c => (Number(c.openingBalance) || 0) > 0)?.openingBalance ?? primary.openingBalance;

    // Contact info & remarks
    const phone = group.map(c => c.phone).find(p => !!p && p.trim().length > 0) || primary.phone || '';
    const email = group.map(c => c.email).find(e => !!e && e.trim().length > 0) || primary.email || '';
    const customerType = group.map(c => c.customerType).find(t => !!t && t !== 'Retail') || primary.customerType || 'Retail';
    const remarks = group.map(c => c.remarks).filter(r => !!r && r.trim().length > 0).join('; ') || primary.remarks || '';

    const consolidatedCustomer: Customer = {
      id: primary.id,
      station: canonicalSt,
      code: bestCode,
      name: canonicalName,
      creditLimit: maxCreditLimit,
      openingBalance: nonZeroOpening,
      phone,
      email,
      customerType,
      remarks,
    };

    mergedCustomers.push(consolidatedCustomer);
    nameMapping.set(key, canonicalName);

    details.push(`Merged ${group.length} records for "${canonicalName}" (${group.map(g => `${g.code} @ ${g.station || 'No Station'}`).join(', ')}) into ${bestCode} @ ${canonicalSt}`);
  });

  // Re-map invoices to canonical customer name and canonical station
  const updatedInvoices = invoices.map(inv => {
    const key = cleanStr(inv.customerName);
    const targetName = nameMapping.get(key) || inv.customerName;
    const targetStation = canonicalStation(inv.station);
    if (inv.customerName !== targetName || inv.station !== targetStation) {
      return {
        ...inv,
        customerName: targetName,
        station: targetStation
      };
    }
    return inv;
  });

  return {
    mergedCustomers,
    updatedInvoices,
    mergedCount,
    details
  };
}

/**
 * Detects duplicate entries across all data collections.
 * Optionally limits inspection to a specific date, date range, or station.
 */
export function detectDuplicates(
  data: {
    pumpReadings: PumpReading[];
    lpgTransactions: LPGTransaction[];
    inventoryItems: InventoryItem[];
    expenses: Expense[];
    invoices: Invoice[];
    cashPositions: CashPosition[];
    customers?: Customer[];
  },
  filterDate?: string,
  filterStation?: string,
  endDate?: string
): DuplicateDetectionResult {
  const normFilterDate = filterDate ? normalizeDate(filterDate) : null;
  const normEndDate = endDate ? normalizeDate(endDate) : null;

  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const nd = normalizeDate(dateStr);
    if (normFilterDate && normEndDate) {
      return nd >= normFilterDate && nd <= normEndDate;
    }
    if (normFilterDate) {
      return nd === normFilterDate;
    }
    return true;
  };

  const breakdown = {
    pumpReadings: 0,
    lpgTransactions: 0,
    inventoryItems: 0,
    expenses: 0,
    invoices: 0,
    cashPositions: 0,
    customers: 0
  };
  const duplicateDetails: DuplicateDetectionResult['duplicateDetails'] = [];

  // 1. Customers
  if (data.customers && data.customers.length > 0) {
    const customerSeen = new Set<string>();
    data.customers.forEach(c => {
      const key = cleanStr(c.name);
      if (filterStation && filterStation !== 'Combined Total' && canonicalStation(c.station) !== canonicalStation(filterStation)) return;

      if (customerSeen.has(key)) {
        breakdown.customers++;
        duplicateDetails.push({
          id: c.id,
          type: 'Customer',
          date: 'Master Record',
          station: canonicalStation(c.station),
          description: `Duplicate Customer: "${c.name}" [${c.code}] (${c.station})`
        });
      } else {
        customerSeen.add(key);
      }
    });
  }

  // 2. Invoices (with canonical station and clean customer name)
  const invoiceSeen = new Set<string>();
  data.invoices.forEach(inv => {
    const nd = normalizeDate(inv.date || '');
    if (!isDateInRange(inv.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(inv.station) !== canonicalStation(filterStation)) return;

    const key = `${nd}|${canonicalStation(inv.station)}|${cleanStr(inv.customerName)}|${Number(inv.totalAmount) || 0}|${Number(inv.paidAmount) || 0}`;
    if (invoiceSeen.has(key)) {
      breakdown.invoices++;
      duplicateDetails.push({
        id: inv.id,
        type: 'Invoice',
        date: inv.date || '',
        station: inv.station,
        description: `Duplicate Invoice: ${inv.customerName} on ${inv.date} (Total: KES ${inv.totalAmount}, Paid: KES ${inv.paidAmount})`
      });
    } else {
      invoiceSeen.add(key);
    }
  });

  // 3. Pump Readings
  const pumpSeen = new Set<string>();
  data.pumpReadings.forEach(r => {
    const nd = normalizeDate(r.date);
    if (!isDateInRange(r.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(r.station) !== canonicalStation(filterStation)) return;
    
    const key = `${nd}|${canonicalStation(r.station)}|${cleanStr(r.product)}`;
    if (pumpSeen.has(key)) {
      breakdown.pumpReadings++;
      duplicateDetails.push({
        id: r.id,
        type: 'Pump Reading',
        date: r.date,
        station: r.station,
        description: `Duplicate Pump Reading: ${r.product} on ${r.date} (${r.station})`
      });
    } else {
      pumpSeen.add(key);
    }
  });

  // 4. LPG Transactions
  const lpgSeen = new Set<string>();
  data.lpgTransactions.forEach(t => {
    const nd = normalizeDate(t.date);
    if (!isDateInRange(t.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(t.station) !== canonicalStation(filterStation)) return;

    const key = `${nd}|${canonicalStation(t.station)}|${t.type}|${cleanStr(t.item)}|${t.quantity}|${t.amount}|${t.completeQuantity || 0}`;
    if (lpgSeen.has(key)) {
      breakdown.lpgTransactions++;
      duplicateDetails.push({
        id: t.id,
        type: 'LPG Transaction',
        date: t.date,
        station: t.station,
        description: `Duplicate LPG ${t.type.toUpperCase()}: ${t.item} Qty ${t.quantity} on ${t.date}`
      });
    } else {
      lpgSeen.add(key);
    }
  });

  // 5. Inventory Items
  const invSeen = new Set<string>();
  data.inventoryItems.forEach(i => {
    const nd = normalizeDate(i.date);
    if (!isDateInRange(i.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(i.station) !== canonicalStation(filterStation)) return;

    const key = `${nd}|${canonicalStation(i.station)}|${i.type}|${cleanStr(i.item)}|${i.quantity}|${i.amount}`;
    if (invSeen.has(key)) {
      breakdown.inventoryItems++;
      duplicateDetails.push({
        id: i.id,
        type: 'Inventory',
        date: i.date,
        station: i.station,
        description: `Duplicate Inventory ${i.type.toUpperCase()}: ${i.item} Qty ${i.quantity} on ${i.date}`
      });
    } else {
      invSeen.add(key);
    }
  });

  // 6. Expenses
  const expSeen = new Set<string>();
  data.expenses.forEach(e => {
    const nd = normalizeDate(e.date);
    if (!isDateInRange(e.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(e.station) !== canonicalStation(filterStation)) return;

    const key = `${nd}|${canonicalStation(e.station)}|${cleanStr(e.expenseCode)}|${cleanStr(e.category)}|${e.amount}|${e.paymentMethod || 'Cash'}`;
    if (expSeen.has(key)) {
      breakdown.expenses++;
      duplicateDetails.push({
        id: e.id,
        type: 'Expense',
        date: e.date,
        station: e.station,
        description: `Duplicate Expense: ${e.category} (KES ${e.amount}) on ${e.date}`
      });
    } else {
      expSeen.add(key);
    }
  });

  // 7. Cash Positions
  const cashSeen = new Set<string>();
  data.cashPositions.forEach(cp => {
    const nd = normalizeDate(cp.date);
    if (!isDateInRange(cp.date)) return;
    if (filterStation && filterStation !== 'Combined Total' && canonicalStation(cp.station) !== canonicalStation(filterStation)) return;

    const key = `${nd}|${canonicalStation(cp.station || '')}`;
    if (cashSeen.has(key)) {
      breakdown.cashPositions++;
      duplicateDetails.push({
        id: cp.id,
        type: 'Cash Position',
        date: cp.date,
        station: cp.station || '',
        description: `Duplicate Cash Position on ${cp.date} (M-Pesa: ${cp.mPesa}, Cash: ${cp.cashOnHand})`
      });
    } else {
      cashSeen.add(key);
    }
  });

  const totalDuplicates = breakdown.pumpReadings + breakdown.lpgTransactions + breakdown.inventoryItems + breakdown.expenses + breakdown.invoices + breakdown.cashPositions + breakdown.customers;

  return {
    totalDuplicates,
    breakdown,
    duplicateDetails
  };
}

/**
 * Deduplicates all records, keeping the most complete or first occurrence and removing duplicates.
 * Also deduplicates customers and re-links invoices.
 */
export function deduplicateCollections(
  data: {
    pumpReadings: PumpReading[];
    lpgTransactions: LPGTransaction[];
    inventoryItems: InventoryItem[];
    expenses: Expense[];
    invoices: Invoice[];
    cashPositions: CashPosition[];
    customers?: Customer[];
  },
  filterDate?: string,
  filterStation?: string,
  endDate?: string
): DeduplicateOutput {
  const normFilterDate = filterDate ? normalizeDate(filterDate) : null;
  const normEndDate = endDate ? normalizeDate(endDate) : null;

  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const nd = normalizeDate(dateStr);
    if (normFilterDate && normEndDate) {
      return nd >= normFilterDate && nd <= normEndDate;
    }
    if (normFilterDate) {
      return nd === normFilterDate;
    }
    return true;
  };

  const breakdown = {
    pumpReadings: 0,
    lpgTransactions: 0,
    inventoryItems: 0,
    expenses: 0,
    invoices: 0,
    cashPositions: 0,
    customers: 0
  };
  const summary: string[] = [];

  // 1. Merge & Deduplicate Customers
  let cleanedCustomers: Customer[] = data.customers || [];
  let workingInvoices = data.invoices;

  if (data.customers && data.customers.length > 0) {
    const mergeRes = mergeCustomers(data.customers, data.invoices);
    cleanedCustomers = mergeRes.mergedCustomers;
    workingInvoices = mergeRes.updatedInvoices;
    breakdown.customers = mergeRes.mergedCount;
    if (mergeRes.mergedCount > 0) {
      summary.push(`${mergeRes.mergedCount} duplicate customer profile(s) merged`);
    }
  }

  // 2. Clean Invoices
  const invoiceSeen = new Set<string>();
  const cleanedInvoices: Invoice[] = [];
  workingInvoices.forEach(inv => {
    const isTarget = isDateInRange(inv.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(inv.station) === canonicalStation(filterStation));
    
    if (!isTarget) {
      cleanedInvoices.push(inv);
      return;
    }

    const nd = normalizeDate(inv.date || '');
    const key = `${nd}|${canonicalStation(inv.station)}|${cleanStr(inv.customerName)}|${Number(inv.totalAmount) || 0}|${Number(inv.paidAmount) || 0}`;
    if (!invoiceSeen.has(key)) {
      invoiceSeen.add(key);
      cleanedInvoices.push({
        ...inv,
        station: canonicalStation(inv.station)
      });
    } else {
      breakdown.invoices++;
    }
  });
  if (breakdown.invoices > 0) {
    summary.push(`${breakdown.invoices} duplicate invoice record(s) removed`);
  }

  // 3. Clean Pump Readings
  const pumpSeen = new Set<string>();
  const cleanedPumpReadings: PumpReading[] = [];
  data.pumpReadings.forEach(r => {
    const isTarget = isDateInRange(r.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(r.station) === canonicalStation(filterStation));

    if (!isTarget) {
      cleanedPumpReadings.push(r);
      return;
    }

    const nd = normalizeDate(r.date);
    const key = `${nd}|${canonicalStation(r.station)}|${cleanStr(r.product)}`;
    if (!pumpSeen.has(key)) {
      pumpSeen.add(key);
      cleanedPumpReadings.push({
        ...r,
        station: canonicalStation(r.station)
      });
    } else {
      breakdown.pumpReadings++;
    }
  });
  if (breakdown.pumpReadings > 0) {
    summary.push(`${breakdown.pumpReadings} duplicate pump reading(s) removed`);
  }

  // 4. Clean LPG Transactions
  const lpgSeen = new Set<string>();
  const cleanedLpgTransactions: LPGTransaction[] = [];
  data.lpgTransactions.forEach(t => {
    const isTarget = isDateInRange(t.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(t.station) === canonicalStation(filterStation));

    if (!isTarget) {
      cleanedLpgTransactions.push(t);
      return;
    }

    const nd = normalizeDate(t.date);
    const key = `${nd}|${canonicalStation(t.station)}|${t.type}|${cleanStr(t.item)}|${t.quantity}|${t.amount}|${t.completeQuantity || 0}`;
    if (!lpgSeen.has(key)) {
      lpgSeen.add(key);
      cleanedLpgTransactions.push({
        ...t,
        station: canonicalStation(t.station)
      });
    } else {
      breakdown.lpgTransactions++;
    }
  });
  if (breakdown.lpgTransactions > 0) {
    summary.push(`${breakdown.lpgTransactions} duplicate LPG transaction(s) removed`);
  }

  // 5. Clean Inventory Items
  const invSeen = new Set<string>();
  const cleanedInventoryItems: InventoryItem[] = [];
  data.inventoryItems.forEach(i => {
    const isTarget = isDateInRange(i.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(i.station) === canonicalStation(filterStation));

    if (!isTarget) {
      cleanedInventoryItems.push(i);
      return;
    }

    const nd = normalizeDate(i.date);
    const key = `${nd}|${canonicalStation(i.station)}|${i.type}|${cleanStr(i.item)}|${i.quantity}|${i.amount}`;
    if (!invSeen.has(key)) {
      invSeen.add(key);
      cleanedInventoryItems.push({
        ...i,
        station: canonicalStation(i.station)
      });
    } else {
      breakdown.inventoryItems++;
    }
  });
  if (breakdown.inventoryItems > 0) {
    summary.push(`${breakdown.inventoryItems} duplicate inventory item(s) removed`);
  }

  // 6. Clean Expenses
  const expSeen = new Set<string>();
  const cleanedExpenses: Expense[] = [];
  data.expenses.forEach(e => {
    const isTarget = isDateInRange(e.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(e.station) === canonicalStation(filterStation));

    if (!isTarget) {
      cleanedExpenses.push(e);
      return;
    }

    const nd = normalizeDate(e.date);
    const key = `${nd}|${canonicalStation(e.station)}|${cleanStr(e.expenseCode)}|${cleanStr(e.category)}|${e.amount}|${e.paymentMethod || 'Cash'}`;
    if (!expSeen.has(key)) {
      expSeen.add(key);
      cleanedExpenses.push({
        ...e,
        station: canonicalStation(e.station)
      });
    } else {
      breakdown.expenses++;
    }
  });
  if (breakdown.expenses > 0) {
    summary.push(`${breakdown.expenses} duplicate expense(s) removed`);
  }

  // 7. Clean Cash Positions
  const cashSeen = new Set<string>();
  const cleanedCashPositions: CashPosition[] = [];
  data.cashPositions.forEach(cp => {
    const isTarget = isDateInRange(cp.date) && (!filterStation || filterStation === 'Combined Total' || canonicalStation(cp.station) === canonicalStation(filterStation));

    if (!isTarget) {
      cleanedCashPositions.push(cp);
      return;
    }

    const nd = normalizeDate(cp.date);
    const key = `${nd}|${canonicalStation(cp.station || '')}`;
    if (!cashSeen.has(key)) {
      cashSeen.add(key);
      cleanedCashPositions.push({
        ...cp,
        station: canonicalStation(cp.station)
      });
    } else {
      breakdown.cashPositions++;
    }
  });
  if (breakdown.cashPositions > 0) {
    summary.push(`${breakdown.cashPositions} duplicate cash position(s) removed`);
  }

  const removedCount = breakdown.invoices + breakdown.pumpReadings + breakdown.lpgTransactions + breakdown.inventoryItems + breakdown.expenses + breakdown.cashPositions + breakdown.customers;

  return {
    cleanedPumpReadings,
    cleanedLpgTransactions,
    cleanedInventoryItems,
    cleanedExpenses,
    cleanedInvoices,
    cleanedCashPositions,
    cleanedCustomers,
    removedCount,
    breakdown,
    summary
  };
}

/**
 * Creates deterministic document IDs to guarantee idempotency on save.
 */
export function generateDeterministicId(prefix: string, date: string, station: string, extra: string, index?: number): string {
  const normDate = normalizeDate(date).replace(/-/g, '');
  const cleanSt = cleanStr(station).replace(/[^a-z0-9]/g, '_').substring(0, 15);
  const cleanEx = cleanStr(extra).replace(/[^a-z0-9]/g, '_').substring(0, 20);
  const idxStr = index !== undefined ? `_${index}` : '';
  return `${prefix}_${normDate}_${cleanSt}_${cleanEx}${idxStr}`;
}

