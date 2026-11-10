import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  const clean = isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(clean);
}

export function formatLitres(litres: number) {
  const clean = isNaN(litres) ? 0 : litres;
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 1,
  }).format(clean);
}

export function getStationColor(station: string) {
  switch (station) {
    case 'Loruk - Junction': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400';
    case 'Loruk - Ndalu': return 'bg-blue-100 dark:bg-white/5 text-blue-800 dark:text-blue-400';
    case 'Gel - Bungoma': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400';
    case 'Gel - Kapenguria': return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400';
    case 'Kengas': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
    default: return 'glass-panel text-gray-800 dark:text-blue-400';
  }
}

/**
 * Universal Date Parser: Safely parses ISO (YYYY-MM-DD), Slash (DD/MM/YYYY or MM/DD/YYYY),
 * and string formats without timezone shifts or returning NaN.
 */
export function parseDateToTimestamp(dateStr: string | number | undefined | null): number {
  if (!dateStr) return Date.now();
  if (typeof dateStr === 'number') {
    return isNaN(dateStr) ? Date.now() : dateStr;
  }
  const clean = String(dateStr).trim();
  if (!clean) return Date.now();

  // Handle ISO format YYYY-MM-DD
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const ts = new Date(y, m, d, 12, 0, 0).getTime();
        if (!isNaN(ts)) return ts;
      }
    }
  }

  // Handle Slash format (DD/MM/YYYY or MM/DD/YYYY as seen on mobile browsers)
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);
      if (p3 < 100) p3 += 2000;

      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        let day = p1;
        let month = p2 - 1;
        let year = p3;
        // Swap if p2 > 12 (i.e. was MM/DD/YYYY)
        if (p2 > 12 && p1 <= 12) {
          day = p2;
          month = p1 - 1;
        }
        const ts = new Date(year, month, day, 12, 0, 0).getTime();
        if (!isNaN(ts)) return ts;
      }
    }
  }

  const parsed = new Date(clean).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Formats any date into a clean YYYY-MM-DD string for HTML <input type="date">
 */
export function formatDateToInput(dateInput: number | string | Date | undefined | null): string {
  if (!dateInput) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const d = typeof dateInput === 'object' && dateInput instanceof Date 
    ? dateInput 
    : new Date(typeof dateInput === 'string' ? parseDateToTimestamp(dateInput) : dateInput);
  
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parses user or raw strings into safe positive floats, removing commas, currency codes, etc.
 */
export function parseCleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}
