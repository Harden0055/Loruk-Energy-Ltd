const isBrowser = typeof window !== 'undefined';

// Cache trigger: check if quota has been marked as exceeded
export function isQuotaExceeded(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem('loruk_quota_exceeded') === 'true';
}

export function markQuotaExceeded() {
  if (isBrowser) {
    localStorage.setItem('loruk_quota_exceeded', 'true');
    window.dispatchEvent(new Event('quota-exceeded'));
    console.warn('Google Firestore daily quota exceeded! Seamslessly falling back to Local Storage database module to ensure zero crashes and perfect user experience.');
  }
}

export function clearQuotaExceeded() {
  if (isBrowser) {
    localStorage.removeItem('loruk_quota_exceeded');
  }
}

function getInitialMockData(collectionName: string): any[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  switch (collectionName) {
    case 'customers':
      return [
        { id: 'cust_seed_1', customerId: 'CUST-001', name: 'Loruk Global', creditLimit: 2000000, balance: 4575900, totalPurchases: 4575900, status: 'credit_risk', openingBalance: 4575900, updatedBy: 'system', actionType: 'create', createdAt: now - 10 * DAY },
        { id: 'cust_seed_2', customerId: 'CUST-002', name: 'Loruk Chepareria', creditLimit: 500000, balance: 210200, totalPurchases: 210200, status: 'active', openingBalance: 210200, updatedBy: 'system', actionType: 'create', createdAt: now - 9 * DAY }
      ];
    case 'deliveries':
      return [];
    case 'payments':
      return [];
    case 'stations':
      return [
        { id: 'st_1', name: 'Ndalu Station', code: 'ST-001', location: 'Ndalu', status: 'active', stationId: 'Ndalu', createdAt: now, updatedAt: now },
        { id: 'st_2', name: 'Junction Station', code: 'ST-002', location: 'Junction', status: 'active', stationId: 'Junction', createdAt: now, updatedAt: now }
      ];
    case 'lpg_inventory':
      return [];
    case 'burner_inventory':
      return [];
    case 'daily_reports':
      return [];
    case 'invoice_payments':
      return [];
    case 'fuel_rates':
      return [];
    case 'pump_readings':
      return [];
    case 'lpg_sales':
      return [];
    case 'lpg_purchases':
      return [];
    case 'burner_sales':
      return [];
    case 'burner_purchases':
      return [];
    case 'grill_sales':
      return [];
    case 'grill_purchases':
      return [];
    case 'expenses':
      return [];
    case 'expense_categories':
      return [];
    case 'cash_positions':
      return [];
    case 'invoices':
      return [];
    case 'station_customers':
      return [];
    case 'opening_stocks':
      return [];
    default:
      return [];
  }
}

export function getLocalCollection(collectionName: string): any[] {
  if (!isBrowser) return [];
  const stored = localStorage.getItem('loruk_db_' + collectionName);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // invalid JSON, clear
    }
  }
  // Initialize with initial mock data
  const initial = getInitialMockData(collectionName);
  saveLocalCollection(collectionName, initial);
  return initial;
}

export function saveLocalCollection(collectionName: string, data: any[]) {
  if (!isBrowser) return;
  localStorage.setItem('loruk_db_' + collectionName, JSON.stringify(data));
  window.dispatchEvent(new Event('db-changed'));
}

export function addLocalDoc(collectionName: string, data: any) {
  const collectionList = getLocalCollection(collectionName);
  const newDocId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newItem = { id: newDocId, ...data, createdAt: Date.now(), updatedAt: Date.now() };
  collectionList.unshift(newItem);
  saveLocalCollection(collectionName, collectionList);
  return newItem;
}

export function updateLocalDoc(collectionName: string, id: string, data: any) {
  const collectionList = getLocalCollection(collectionName);
  const idx = collectionList.findIndex(item => item.id === id);
  if (idx !== -1) {
    collectionList[idx] = { ...collectionList[idx], ...data, updatedAt: Date.now() };
    saveLocalCollection(collectionName, collectionList);
  }
}

export function deleteLocalDoc(collectionName: string, id: string) {
  const collectionList = getLocalCollection(collectionName);
  const filtered = collectionList.filter(item => item.id !== id);
  saveLocalCollection(collectionName, filtered);
}
