import { PumpReading, LPGTransaction, InventoryItem, Expense, Invoice, CashPosition } from './context';

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
  };
  duplicateDetails: Array<{
    id: string;
    type: 'Pump Reading' | 'LPG Transaction' | 'Inventory' | 'Expense' | 'Invoice' | 'Cash Position';
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
  removedCount: number;
  breakdown: {
    pumpReadings: number;
    lpgTransactions: number;
    inventoryItems: number;
    expenses: number;
    invoices: number;
    cashPositions: number;
  };
  summary: string[];
}

/**
 * Detects duplicate entries across all data collections.
 * Optionally limits inspection to a specific date or station.
 */
export function detectDuplicates(
  data: {
    pumpReadings: PumpReading[];
    lpgTransactions: LPGTransaction[];
    inventoryItems: InventoryItem[];
    expenses: Expense[];
    invoices: Invoice[];
    cashPositions: CashPosition[];
  },
  filterDate?: string,
  filterStation?: string
): DuplicateDetectionResult {
  const normFilterDate = filterDate ? normalizeDate(filterDate) : null;
  const breakdown = {
    pumpReadings: 0,
    lpgTransactions: 0,
    inventoryItems: 0,
    expenses: 0,
    invoices: 0,
    cashPositions: 0
  };
  const duplicateDetails: DuplicateDetectionResult['duplicateDetails'] = [];

  // 1. Pump Readings
  const pumpSeen = new Set<string>();
  data.pumpReadings.forEach(r => {
    const nd = normalizeDate(r.date);
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && r.station !== filterStation) return;
    
    // Key by date + station + product
    const key = `${nd}|${cleanStr(r.station)}|${cleanStr(r.product)}`;
    if (pumpSeen.has(key)) {
      breakdown.pumpReadings++;
      duplicateDetails.push({
        id: r.id,
        type: 'Pump Reading',
        date: r.date,
        station: r.station,
        description: `Duplicate Pump: ${r.product} on ${r.date} (${r.station})`
      });
    } else {
      pumpSeen.add(key);
    }
  });

  // 2. LPG Transactions
  const lpgSeen = new Set<string>();
  data.lpgTransactions.forEach(t => {
    const nd = normalizeDate(t.date);
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && t.station !== filterStation) return;

    const key = `${nd}|${cleanStr(t.station)}|${t.type}|${cleanStr(t.item)}|${t.quantity}|${t.amount}|${t.completeQuantity || 0}`;
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

  // 3. Inventory Items
  const invSeen = new Set<string>();
  data.inventoryItems.forEach(i => {
    const nd = normalizeDate(i.date);
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && i.station !== filterStation) return;

    const key = `${nd}|${cleanStr(i.station)}|${i.type}|${cleanStr(i.item)}|${i.quantity}|${i.amount}`;
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

  // 4. Expenses
  const expSeen = new Set<string>();
  data.expenses.forEach(e => {
    const nd = normalizeDate(e.date);
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && e.station !== filterStation) return;

    const key = `${nd}|${cleanStr(e.station)}|${cleanStr(e.expenseCode)}|${cleanStr(e.category)}|${e.amount}|${e.paymentMethod || 'Cash'}`;
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

  // 5. Invoices
  const invoiceSeen = new Set<string>();
  data.invoices.forEach(inv => {
    const nd = normalizeDate(inv.date || '');
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && inv.station !== filterStation) return;

    const key = `${nd}|${cleanStr(inv.station)}|${cleanStr(inv.customerName)}|${inv.totalAmount}|${inv.paidAmount}`;
    if (invoiceSeen.has(key)) {
      breakdown.invoices++;
      duplicateDetails.push({
        id: inv.id,
        type: 'Invoice',
        date: inv.date || '',
        station: inv.station,
        description: `Duplicate Invoice: ${inv.customerName} Total KES ${inv.totalAmount}, Paid KES ${inv.paidAmount} on ${inv.date}`
      });
    } else {
      invoiceSeen.add(key);
    }
  });

  // 6. Cash Positions
  const cashSeen = new Set<string>();
  data.cashPositions.forEach(cp => {
    const nd = normalizeDate(cp.date);
    if (normFilterDate && nd !== normFilterDate) return;
    if (filterStation && filterStation !== 'Combined Total' && cp.station && cp.station !== filterStation) return;

    const key = `${nd}|${cleanStr(cp.station || '')}|${cp.mPesa}|${cp.cashOnHand}`;
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

  const totalDuplicates = breakdown.pumpReadings + breakdown.lpgTransactions + breakdown.inventoryItems + breakdown.expenses + breakdown.invoices + breakdown.cashPositions;

  return {
    totalDuplicates,
    breakdown,
    duplicateDetails
  };
}

/**
 * Deduplicates all records, keeping the most complete or first occurrence and removing duplicates.
 */
export function deduplicateCollections(
  data: {
    pumpReadings: PumpReading[];
    lpgTransactions: LPGTransaction[];
    inventoryItems: InventoryItem[];
    expenses: Expense[];
    invoices: Invoice[];
    cashPositions: CashPosition[];
  },
  filterDate?: string,
  filterStation?: string
): DeduplicateOutput {
  const normFilterDate = filterDate ? normalizeDate(filterDate) : null;
  const breakdown = {
    pumpReadings: 0,
    lpgTransactions: 0,
    inventoryItems: 0,
    expenses: 0,
    invoices: 0,
    cashPositions: 0
  };
  const summary: string[] = [];

  // 1. Clean Invoices
  const invoiceSeen = new Set<string>();
  const cleanedInvoices: Invoice[] = [];
  data.invoices.forEach(inv => {
    const nd = normalizeDate(inv.date || '');
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || inv.station === filterStation);
    
    if (!isTarget) {
      cleanedInvoices.push(inv);
      return;
    }

    const key = `${nd}|${cleanStr(inv.station)}|${cleanStr(inv.customerName)}|${inv.totalAmount}|${inv.paidAmount}`;
    if (!invoiceSeen.has(key)) {
      invoiceSeen.add(key);
      cleanedInvoices.push(inv);
    } else {
      breakdown.invoices++;
    }
  });
  if (breakdown.invoices > 0) {
    summary.push(`${breakdown.invoices} duplicate invoice(s) removed`);
  }

  // 2. Clean Pump Readings
  const pumpSeen = new Set<string>();
  const cleanedPumpReadings: PumpReading[] = [];
  data.pumpReadings.forEach(r => {
    const nd = normalizeDate(r.date);
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || r.station === filterStation);

    if (!isTarget) {
      cleanedPumpReadings.push(r);
      return;
    }

    const key = `${nd}|${cleanStr(r.station)}|${cleanStr(r.product)}`;
    if (!pumpSeen.has(key)) {
      pumpSeen.add(key);
      cleanedPumpReadings.push(r);
    } else {
      breakdown.pumpReadings++;
    }
  });
  if (breakdown.pumpReadings > 0) {
    summary.push(`${breakdown.pumpReadings} duplicate pump reading(s) removed`);
  }

  // 3. Clean LPG Transactions
  const lpgSeen = new Set<string>();
  const cleanedLpgTransactions: LPGTransaction[] = [];
  data.lpgTransactions.forEach(t => {
    const nd = normalizeDate(t.date);
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || t.station === filterStation);

    if (!isTarget) {
      cleanedLpgTransactions.push(t);
      return;
    }

    const key = `${nd}|${cleanStr(t.station)}|${t.type}|${cleanStr(t.item)}|${t.quantity}|${t.amount}|${t.completeQuantity || 0}`;
    if (!lpgSeen.has(key)) {
      lpgSeen.add(key);
      cleanedLpgTransactions.push(t);
    } else {
      breakdown.lpgTransactions++;
    }
  });
  if (breakdown.lpgTransactions > 0) {
    summary.push(`${breakdown.lpgTransactions} duplicate LPG transaction(s) removed`);
  }

  // 4. Clean Inventory Items
  const invSeen = new Set<string>();
  const cleanedInventoryItems: InventoryItem[] = [];
  data.inventoryItems.forEach(i => {
    const nd = normalizeDate(i.date);
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || i.station === filterStation);

    if (!isTarget) {
      cleanedInventoryItems.push(i);
      return;
    }

    const key = `${nd}|${cleanStr(i.station)}|${i.type}|${cleanStr(i.item)}|${i.quantity}|${i.amount}`;
    if (!invSeen.has(key)) {
      invSeen.add(key);
      cleanedInventoryItems.push(i);
    } else {
      breakdown.inventoryItems++;
    }
  });
  if (breakdown.inventoryItems > 0) {
    summary.push(`${breakdown.inventoryItems} duplicate inventory item(s) removed`);
  }

  // 5. Clean Expenses
  const expSeen = new Set<string>();
  const cleanedExpenses: Expense[] = [];
  data.expenses.forEach(e => {
    const nd = normalizeDate(e.date);
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || e.station === filterStation);

    if (!isTarget) {
      cleanedExpenses.push(e);
      return;
    }

    const key = `${nd}|${cleanStr(e.station)}|${cleanStr(e.expenseCode)}|${cleanStr(e.category)}|${e.amount}|${e.paymentMethod || 'Cash'}`;
    if (!expSeen.has(key)) {
      expSeen.add(key);
      cleanedExpenses.push(e);
    } else {
      breakdown.expenses++;
    }
  });
  if (breakdown.expenses > 0) {
    summary.push(`${breakdown.expenses} duplicate expense(s) removed`);
  }

  // 6. Clean Cash Positions
  const cashSeen = new Set<string>();
  const cleanedCashPositions: CashPosition[] = [];
  data.cashPositions.forEach(cp => {
    const nd = normalizeDate(cp.date);
    const isTarget = (!normFilterDate || nd === normFilterDate) && (!filterStation || filterStation === 'Combined Total' || (cp.station && cp.station === filterStation));

    if (!isTarget) {
      cleanedCashPositions.push(cp);
      return;
    }

    const key = `${nd}|${cleanStr(cp.station || '')}`;
    if (!cashSeen.has(key)) {
      cashSeen.add(key);
      cleanedCashPositions.push(cp);
    } else {
      breakdown.cashPositions++;
    }
  });
  if (breakdown.cashPositions > 0) {
    summary.push(`${breakdown.cashPositions} duplicate cash position(s) removed`);
  }

  const removedCount = breakdown.invoices + breakdown.pumpReadings + breakdown.lpgTransactions + breakdown.inventoryItems + breakdown.expenses + breakdown.cashPositions;

  return {
    cleanedPumpReadings,
    cleanedLpgTransactions,
    cleanedInventoryItems,
    cleanedExpenses,
    cleanedInvoices,
    cleanedCashPositions,
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
