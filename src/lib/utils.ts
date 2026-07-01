import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

export function formatLitres(litres: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 1,
  }).format(litres) + ' L';
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
