import { PumpReading, LPGTransaction, InventoryItem, Expense, Invoice, CashPosition } from './context';
import { normalizeDate } from './deduplication';

/**
 * Safely adds/subtracts days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number = 1): string {
  const norm = normalizeDate(dateStr);
  if (!norm || !/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
  const [yearStr, monthStr, dayStr] = norm.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const dateObj = new Date(year, month, day);
  dateObj.setDate(dateObj.getDate() + days);

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface CollectionSet {
  pumpReadings?: PumpReading[];
  lpgTransactions?: LPGTransaction[];
  inventoryItems?: InventoryItem[];
  expenses?: Expense[];
  invoices?: Invoice[];
  cashPositions?: CashPosition[];
}

/**
 * Finds the latest recorded date across all operational collections.
 * Optionally filtered by station.
 */
export function getLatestRecordedDate(data: CollectionSet, station?: string): string | null {
  const dates: string[] = [];

  const filterMatch = (itemStation?: string) => {
    if (!station || station === 'Combined Total') return true;
    if (!itemStation) return true;
    return itemStation === station;
  };

  data.pumpReadings?.forEach(r => {
    if (r.date && filterMatch(r.station)) {
      const d = normalizeDate(r.date);
      if (d) dates.push(d);
    }
  });

  data.lpgTransactions?.forEach(t => {
    if (t.date && filterMatch(t.station)) {
      const d = normalizeDate(t.date);
      if (d) dates.push(d);
    }
  });

  data.inventoryItems?.forEach(i => {
    if (i.date && filterMatch(i.station)) {
      const d = normalizeDate(i.date);
      if (d) dates.push(d);
    }
  });

  data.expenses?.forEach(e => {
    if (e.date && filterMatch(e.station)) {
      const d = normalizeDate(e.date);
      if (d) dates.push(d);
    }
  });

  data.invoices?.forEach(inv => {
    if (inv.date && filterMatch(inv.station)) {
      const d = normalizeDate(inv.date);
      if (d) dates.push(d);
    }
  });

  data.cashPositions?.forEach(cp => {
    if (cp.date && filterMatch(cp.station)) {
      const d = normalizeDate(cp.date);
      if (d) dates.push(d);
    }
  });

  if (dates.length === 0) return null;

  // Sort descending
  dates.sort((a, b) => b.localeCompare(a));
  return dates[0];
}

/**
 * Automatically calculates the next sequential date (the following day after the latest recorded entry).
 * If no entries exist yet, defaults to today's date (or a provided fallback).
 */
export function getNextSequentialDate(
  data: CollectionSet, 
  station?: string, 
  fallbackDate?: string
): string {
  const latest = getLatestRecordedDate(data, station);
  if (latest) {
    return addDays(latest, 1);
  }
  return fallbackDate || new Date().toISOString().split('T')[0];
}

/**
 * Pretty formats YYYY-MM-DD for human UI badges.
 */
export function formatFriendlyDate(dateStr?: string): string {
  const norm = normalizeDate(dateStr);
  if (!norm || !/^\d{4}-\d{2}-\d{2}$/.test(norm)) return dateStr || '';
  const [y, m, d] = norm.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(m, 10) - 1] || m;
  return `${d} ${monthName} ${y}`;
}
