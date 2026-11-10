import { Customer } from '../types';

export interface ParsedReceiptData {
  rawText: string;
  matchedCustomer: Customer | null;
  confidenceScore: number;
  amount: number | null;
  dateStr: string; // Formatted as YYYY-MM-DD for input[type="date"]
  referenceCode: string | null;
  senderName: string | null;
}

/**
 * Normalizes text for clean token searching
 */
function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts numeric payment amount from any custom receipt text or SMS
 */
export function extractAmount(text: string): number | null {
  if (!text) return null;

  // Pattern 1: Ksh/KES with digits e.g. "Ksh 50,660", "Ksh.50660.00", "KES 50,660"
  const kshRegex = /(?:ksh\.?|kes|shs\.?|amount(?:\s*:)?)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
  const kshMatch = text.match(kshRegex);
  if (kshMatch && kshMatch[1]) {
    const num = parseFloat(kshMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern 2: Digits followed by Ksh e.g. "50,660 Ksh", "50660 KES"
  const suffixRegex = /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:ksh|kes|shs)/i;
  const suffixMatch = text.match(suffixRegex);
  if (suffixMatch && suffixMatch[1]) {
    const num = parseFloat(suffixMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern 3: Look for currency pattern e.g. "50,660.00"
  const commaNumberRegex = /(?:\s|^)([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)(?:\s|$|\.)/;
  const commaMatch = text.match(commaNumberRegex);
  if (commaMatch && commaMatch[1]) {
    const num = parseFloat(commaMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern 4: Action verbs like "payment of 50660", "sent 50660", "deposit of 50660"
  const plainNumRegex = /(?:sent|received|paid|deposit|amount|payment|cash|sum)(?:\s+(?:of|is|:))?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
  const plainMatch = text.match(plainNumRegex);
  if (plainMatch && plainMatch[1]) {
    const num = parseFloat(plainMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }

  // Pattern 5: Any standalone 3-8 digit number that isn't a 4-digit year (e.g. 50660)
  const standaloneNums = text.match(/\b([1-9][0-9]{2,7}(?:\.[0-9]{1,2})?)\b/g);
  if (standaloneNums && standaloneNums.length > 0) {
    for (const rawNum of standaloneNums) {
      const num = parseFloat(rawNum);
      // Skip obvious 4-digit years between 2020 and 2035
      if (num >= 2020 && num <= 2035) continue;
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return null;
}

/**
 * Extracts date from receipt text and formats as YYYY-MM-DD
 */
export function extractDate(text: string): string {
  const today = new Date();
  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (!text) return formatIso(today);

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashDateRegex = /\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.](20[2-3][0-9]|[2-3][0-9])\b/;
  const match1 = text.match(slashDateRegex);
  if (match1) {
    let day = parseInt(match1[1], 10);
    let month = parseInt(match1[2], 10);
    let year = parseInt(match1[3], 10);
    if (year < 100) year += 2000;
    // Swap if month > 12 (i.e. was MM/DD/YYYY)
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 2: DD Month YYYY (e.g., 5 Nov 2026, 05 November 2026)
  const monthNameRegex = /\b([0-3]?[0-9])\s*(?:th|st|nd|rd)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:,\s*)?(20[2-3][0-9])?\b/i;
  const match2 = text.match(monthNameRegex);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const monthStr = match2[2].toLowerCase();
    const year = match2[3] ? parseInt(match2[3], 10) : today.getFullYear();
    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const month = monthMap[monthStr] || (today.getMonth() + 1);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return formatIso(today);
}

/**
 * Extracts M-Pesa / Bank transaction reference code
 */
export function extractReferenceCode(text: string): string | null {
  if (!text) return null;

  // Typical Safaricom M-Pesa 10-char alphanumeric transaction ID (starts with Q, T, R, S, etc.)
  const mpesaMatch = text.match(/\b([A-Z0-9]{10})\b/);
  if (mpesaMatch && !/^[0-9]+$/.test(mpesaMatch[1])) {
    return mpesaMatch[1];
  }

  // Reference patterns e.g. "Ref: QDH728JS9K" or "Txn: 8912389"
  const refMatch = text.match(/(?:ref|reference|txn|receipt|code|voucher)(?:\s*(?:no|num|#)?:?)\s*([A-Za-z0-9_-]+)/i);
  if (refMatch && refMatch[1]) {
    return refMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Matches customer by name or keywords against the registered customers list
 */
export function matchCustomerFromText(text: string, customers: Customer[]): { customer: Customer | null; confidence: number } {
  if (!text || !customers.length) return { customer: null, confidence: 0 };

  const cleanInput = cleanString(text);
  const inputWords = cleanInput.split(/\s+/).filter(w => w.length > 2);

  let bestMatch: Customer | null = null;
  let highestScore = 0;

  for (const cust of customers) {
    let score = 0;
    const cleanCustName = cleanString(cust.name);
    const cleanCustId = cleanString(cust.customerId);

    // Exact ID match e.g. "CUST-001" or "CUST 017"
    if (cust.customerId && cleanInput.includes(cleanCustId)) {
      score += 100;
    }

    // Exact full name match
    if (cleanCustName && cleanInput.includes(cleanCustName)) {
      score += 80;
    } else {
      // Token overlap matching
      const nameParts = cleanCustName.split(/\s+/).filter(w => w.length > 2 && w !== 'station' && w !== 'filling' && w !== 'limited' && w !== 'ltd');
      for (const part of nameParts) {
        if (cleanInput.includes(part)) {
          score += 30; // Strong match for distinct name word like "birachi", "sopowo", "chepareria"
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = cust;
    }
  }

  return {
    customer: highestScore >= 30 ? bestMatch : null,
    confidence: Math.min(100, highestScore)
  };
}

/**
 * Master parser: Takes any custom text note or SMS and extracts all payment parameters
 */
export function parseReceiptMessage(text: string, customers: Customer[]): ParsedReceiptData {
  const clean = text ? text.trim() : '';
  const amount = extractAmount(clean);
  const dateStr = extractDate(clean);
  const referenceCode = extractReferenceCode(clean);
  const { customer, confidence } = matchCustomerFromText(clean, customers);

  // Try to find sender name in text (e.g. "from Birachi Filling Station" or "from John Doe")
  let senderName: string | null = null;
  const fromMatch = clean.match(/(?:from|by|customer|paid by)\s+([A-Za-z0-9\s&'-]{3,35})(?:\s+(?:on|via|at|ref|\.|\,)|$)/i);
  if (fromMatch && fromMatch[1]) {
    senderName = fromMatch[1].trim();
  }

  return {
    rawText: clean,
    matchedCustomer: customer,
    confidenceScore: confidence,
    amount,
    dateStr,
    referenceCode,
    senderName
  };
}
