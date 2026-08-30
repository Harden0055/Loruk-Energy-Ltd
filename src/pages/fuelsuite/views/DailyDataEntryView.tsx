import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  useFuel, 
  PumpReading, 
  LPGTransaction, 
  Expense, 
  Invoice, 
  CashPosition, 
  Product, 
  Station, 
  InventoryItem,
  Customer,
  ExpenseTemplate,
  ExpenseFrequency,
  ExpensePaymentMethod,
  calculatePumpMeterDelta,
  isMeterRollover
} from '../context';
import { generateDeterministicId, normalizeDate } from '../deduplication';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button } from '../components';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Layers, 
  Fuel, 
  Flame, 
  Box, 
  Receipt, 
  FileText, 
  Wallet,
  Sparkles,
  ArrowRight,
  Building2,
  ShieldCheck,
  Check,
  User,
  X,
  Tag,
  ReceiptText,
  Clock,
  Coins,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkle,
  Eye,
  AlertCircle,
  TrendingDown,
  CreditCard,
  Printer
} from 'lucide-react';
import { sortProductsList } from './ProductsView';
import { getLatestRecordedDate, getNextSequentialDate, addDays, formatFriendlyDate } from '../dateUtils';

interface DailyInvoiceRow extends Partial<Invoice> {
  type?: 'debt' | 'paid' | 'paid_full' | 'partial';
}

export default function DailyDataEntryView() {
  const { 
    activeStation, setActiveStation,
    products, 
    pumpReadings, setPumpReadings,
    lpgTransactions, setLpgTransactions,
    inventoryItems, setInventoryItems,
    expenses, setExpenses,
    invoices, setInvoices,
    cashPositions, setCashPositions,
    customers, setCustomers,
    stations,
    expenseTemplates,
    setExpenseTemplates,
    deduplicateData,
    checkDuplicates
  } = useFuel();

  const availableStations = useMemo(() => {
    return stations.length > 0 ? stations : [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
  }, [stations]);

  const [station, setStation] = useState<Station>(
    activeStation === 'Combined Total' ? (availableStations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation
  );

  // Compute latest recorded date and auto-sequential date for the active station
  const latestRecordedDate = useMemo(() => {
    return getLatestRecordedDate({
      pumpReadings,
      lpgTransactions,
      inventoryItems,
      expenses,
      invoices,
      cashPositions
    }, station);
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions, station]);

  const autoSequentialDate = useMemo(() => {
    return getNextSequentialDate({
      pumpReadings,
      lpgTransactions,
      inventoryItems,
      expenses,
      invoices,
      cashPositions
    }, station);
  }, [pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions, station]);

  const [date, setDate] = useState<string>(() => autoSequentialDate);
  const [userHasOverriddenDate, setUserHasOverriddenDate] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dedupeSuccessMsg, setDedupeSuccessMsg] = useState<string | null>(null);

  // Automatically synchronize date with sequential following day unless manually edited by user
  useEffect(() => {
    if (!userHasOverriddenDate && autoSequentialDate) {
      setDate(autoSequentialDate);
    }
  }, [autoSequentialDate, userHasOverriddenDate]);

  // Check for duplicates on the active date & station
  const dateDuplicates = useMemo(() => {
    return checkDuplicates(date, station);
  }, [checkDuplicates, date, station, pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions]);

  // Check for all duplicates across entire system
  const allSystemDuplicates = useMemo(() => {
    return checkDuplicates();
  }, [checkDuplicates, pumpReadings, lpgTransactions, inventoryItems, expenses, invoices, cashPositions]);

  // Deduplicate current date & station
  const handleCleanCurrentDateDuplicates = useCallback(() => {
    const res = deduplicateData(date, station);
    if (res.removedCount > 0) {
      setDedupeSuccessMsg(`Successfully cleaned ${res.removedCount} duplicate record(s) for ${date} (${station}):\n• ${res.summary.join('\n• ')}`);
    } else {
      setDedupeSuccessMsg(`No duplicate records found for ${date}. All entries are unique.`);
    }
    setTimeout(() => setDedupeSuccessMsg(null), 6000);
  }, [deduplicateData, date, station]);

  // Deduplicate all records across the whole system
  const handleCleanAllSystemDuplicates = useCallback(() => {
    const res = deduplicateData();
    if (res.removedCount > 0) {
      setDedupeSuccessMsg(`System-wide cleanup complete: Removed ${res.removedCount} duplicate record(s) across all dates:\n• ${res.summary.join('\n• ')}`);
    } else {
      setDedupeSuccessMsg(`No duplicates found anywhere in the system. Database is clean.`);
    }
    setTimeout(() => setDedupeSuccessMsg(null), 6000);
  }, [deduplicateData]);

  // Synchronize station if activeStation changes externally
  useEffect(() => {
    if (activeStation !== 'Combined Total' && activeStation) {
      setStation(activeStation);
    }
  }, [activeStation]);

  // Master product groupings
  const sortedCatalog = useMemo(() => sortProductsList(products || []), [products]);

  // Unified, deduplicated customer list from both `customers` database and historical `invoices`
  const allCustomerOptions = useMemo(() => {
    const customerMap = new Map<string, { id: string; name: string; code?: string; station?: string }>();

    // 1. Add all registered customers from the Customers database (Invoices -> Customers ledger)
    (customers || []).forEach(c => {
      if (c && c.name && c.name.trim()) {
        const trimmedName = c.name.trim();
        const key = trimmedName.toLowerCase();
        const existing = customerMap.get(key);
        if (!existing) {
          customerMap.set(key, {
            id: c.id || trimmedName,
            name: trimmedName,
            code: c.code,
            station: c.station,
          });
        } else {
          if (!existing.code && c.code) existing.code = c.code;
          if (!existing.station && c.station) existing.station = c.station;
        }
      }
    });

    // 2. Add any customer names found in recorded invoices so no customer is ever missed
    (invoices || []).forEach(inv => {
      if (inv && inv.customerName && inv.customerName.trim()) {
        const trimmedName = inv.customerName.trim();
        const key = trimmedName.toLowerCase();
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: inv.id || trimmedName,
            name: trimmedName,
            station: inv.station,
          });
        }
      }
    });

    // Sort alphabetically by name (or code if both have codes)
    return Array.from(customerMap.values()).sort((a, b) => {
      const codeA = a.code || '';
      const codeB = b.code || '';
      if (codeA && codeB) {
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [customers, invoices]);

  const fuelProducts = useMemo(() => {
    const list = sortedCatalog.filter(p => {
      if (p.category === 'Fuel') return true;
      const n = p.name.toLowerCase();
      return n.includes('super') || n.includes('petrol') || n.includes('diesel') || n.includes('ago') || n.includes('pms') || n.includes('fuel');
    });
    if (list.length > 0) return list;
    return [
      { id: '1', name: 'Super ( Premium )', itemCode: 'PMS-001', category: 'Fuel', uom: 'Litre' },
      { id: '2', name: 'Diesel Fuel', itemCode: 'AGO-002', category: 'Fuel', uom: 'Litre' },
    ];
  }, [sortedCatalog]);

  const lpgProducts = useMemo(() => {
    const list = sortedCatalog.filter(p => {
      if (p.category === 'LPG') return true;
      const n = p.name.toLowerCase();
      return n.includes('lpg') || n.includes('cylinder') || n.includes('gas');
    });
    if (list.length > 0) return list;
    return [
      { id: '3', name: '6Kg LPG', itemCode: 'LPG-003', category: 'LPG', uom: 'Cylinder' },
      { id: '4', name: '13Kg LPG', itemCode: 'LPG-004', category: 'LPG', uom: 'Cylinder' },
    ];
  }, [sortedCatalog]);

  const accessoryProducts = useMemo(() => {
    const list = sortedCatalog.filter(p => {
      if (p.category && p.category !== 'Fuel' && p.category !== 'LPG') return true;
      const n = p.name.toLowerCase();
      return !n.includes('super') && !n.includes('diesel') && !n.includes('petrol') && !n.includes('ago') && !n.includes('pms') && !n.includes('lpg') && !n.includes('cylinder');
    });
    if (list.length > 0) return list;
    return [
      { id: '5', name: 'Burner', itemCode: 'ACC-005', category: 'Accessories', uom: 'Piece' },
      { id: '6', name: 'Grill', itemCode: 'ACC-006', category: 'Accessories', uom: 'Piece' },
    ];
  }, [sortedCatalog]);

  // Pump readings state
  const [pumps, setPumps] = useState<Partial<PumpReading>[]>([]);
  // LPG sales state
  const [lpgSales, setLpgSales] = useState<Partial<LPGTransaction>[]>([]);
  // LPG purchases state
  const [lpgPurchases, setLpgPurchases] = useState<Partial<LPGTransaction>[]>([]);
  // Equipment/Accessories sales state
  const [equipmentSales, setEquipmentSales] = useState<Partial<InventoryItem>[]>([]);
  // Equipment/Accessories purchases state
  const [equipmentPurchases, setEquipmentPurchases] = useState<Partial<InventoryItem>[]>([]);
  // Expenses state
  const [expenseRows, setExpenseRows] = useState<Partial<Expense>[]>([]);
  // Invoices state
  const [invoiceRows, setInvoiceRows] = useState<DailyInvoiceRow[]>([]);
  // Quick Add Customer modal state
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCode, setNewCustomerCode] = useState('');
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState('');
  const [newCustomerOpeningBalance, setNewCustomerOpeningBalance] = useState('');

  // Quick Add Expense Parameter modal state
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [newExpenseCode, setNewExpenseCode] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Operations & Fuel');
  const [newExpenseDefaultAmount, setNewExpenseDefaultAmount] = useState('');
  const [newExpenseFrequency, setNewExpenseFrequency] = useState<ExpenseFrequency>('Monthly');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<ExpensePaymentMethod>('Cash');
  const [newExpenseIsRecurring, setNewExpenseIsRecurring] = useState(true);
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  // Cash Position & Losses state
  const [mPesa, setMPesa] = useState<number>(0);
  const [manualCashOnHand, setManualCashOnHand] = useState<number>(0);
  const [lossesAmount, setLossesAmount] = useState<number>(0);
  const [lossesNote, setLossesNote] = useState<string>('');

  // Selected customer preview modal state
  const [previewCustomerName, setPreviewCustomerName] = useState<string | null>(null);

  // Helper to compute live status and financial audit for any selected customer
  const getCustomerStatus = useCallback((customerName?: string) => {
    if (!customerName || !customerName.trim()) return null;
    const cleanName = customerName.trim().toLowerCase();

    // Match in customer database
    const customerObj = customers.find(c => c.name?.trim().toLowerCase() === cleanName);
    
    // Match in all invoices
    const custInvoices = invoices.filter(i => (i.customerName || '').trim().toLowerCase() === cleanName)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const openingBalance = Number(customerObj?.openingBalance) || 0;
    const creditLimit = Number(customerObj?.creditLimit) || 0;
    
    const totalInvoiced = custInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
    const totalPaid = custInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const netBalance = openingBalance + totalInvoiced - totalPaid;
    
    const availableCredit = creditLimit > 0 ? (creditLimit - netBalance) : null;
    const isOverLimit = creditLimit > 0 && netBalance > creditLimit;
    const utilizationPct = creditLimit > 0 ? Math.min(100, Math.max(0, Math.round((netBalance / creditLimit) * 100))) : 0;

    let statusLabel = 'Cleared / Zero Debt';
    let statusColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';

    if (isOverLimit) {
      statusLabel = 'Credit Limit Exceeded';
      statusColor = 'text-red-400 bg-red-950/60 border-red-800/60';
    } else if (netBalance > 0) {
      statusLabel = 'Outstanding Debt';
      statusColor = 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    } else if (netBalance < 0) {
      statusLabel = 'Credit / Overpaid';
      statusColor = 'text-blue-400 bg-blue-950/60 border-blue-800/60';
    }

    return {
      customerObj,
      customerName: customerObj?.name || customerName,
      customerCode: customerObj?.code || 'N/A',
      station: customerObj?.station || station,
      openingBalance,
      creditLimit,
      availableCredit,
      isOverLimit,
      utilizationPct,
      totalInvoiced,
      totalPaid,
      netBalance,
      statusLabel,
      statusColor,
      invoiceCount: custInvoices.length,
      recentInvoices: custInvoices.slice(0, 15),
    };
  }, [customers, invoices, station]);

  // Track currently loaded context to avoid infinite reloading
  const lastLoadedContext = useRef<string>('');

  // LOAD EXISTING DATA FOR SELECTED DATE & STATION OR INITIALIZE FROM PREVIOUS CLOSING METERS
  useEffect(() => {
    const contextKey = `${date}_${station}_${fuelProducts.map(p => p.name).join(',')}`;
    
    // 1. PUMP READINGS
    const existingReadings = pumpReadings.filter(pr => pr.station === station && pr.date === date);
    const previousReadings = pumpReadings
      .filter(pr => pr.station === station && pr.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));

    const initialPumps = fuelProducts.map(fp => {
      const existing = existingReadings.find(r => r.product.toLowerCase().trim() === fp.name.toLowerCase().trim());
      if (existing) {
        return {
          id: existing.id,
          product: fp.name,
          salesStart: existing.salesStart || 0,
          salesStop: existing.salesStop || 0,
          litresStart: existing.litresStart || 0,
          litresStop: existing.litresStop || 0,
          ratePerLitre: existing.ratePerLitre || 0,
          manualCash: existing.manualCash || 0,
        };
      }

      // If no reading for today, find last closing meter for this station/product
      const last = previousReadings.find(r => r.product.toLowerCase().trim() === fp.name.toLowerCase().trim());
      const storedRate = parseFloat(localStorage.getItem(`rate_${station}_${fp.name}`) || '0');
      return {
        product: fp.name,
        salesStart: last ? last.salesStop : 0,
        salesStop: 0,
        litresStart: last ? last.litresStop : 0,
        litresStop: 0,
        ratePerLitre: storedRate > 0 ? storedRate : (last ? last.ratePerLitre : 0),
        manualCash: 0,
      };
    });
    setPumps(initialPumps);

    // 2. LPG TRANSACTIONS (Sales & Purchases)
    const existingLpgSales = lpgTransactions.filter(l => l.station === station && l.date === date && l.type === 'sale');
    if (existingLpgSales.length > 0) {
      setLpgSales(existingLpgSales.map(s => ({ id: s.id, item: s.item, quantity: s.quantity, amount: s.amount })));
    } else {
      setLpgSales([{ item: lpgProducts[0]?.name || '6Kg LPG', quantity: 0, amount: 0 }]);
    }

    const existingLpgPurchases = lpgTransactions.filter(l => l.station === station && l.date === date && l.type === 'purchase');
    if (existingLpgPurchases.length > 0) {
      setLpgPurchases(existingLpgPurchases.map(p => ({ 
        id: p.id, 
        item: p.item, 
        quantity: p.quantity, 
        rate: p.rate || (p.quantity && p.amount ? Math.round(p.amount / p.quantity) : 0),
        amount: p.amount 
      })));
    } else {
      setLpgPurchases([{ item: lpgProducts[0]?.name || '6Kg LPG', quantity: 0, rate: 0, amount: 0 }]);
    }

    // 3. ACCESSORIES / INVENTORY ITEMS (Sales & Purchases)
    const existingEqSales = inventoryItems.filter(i => 
      i.station === station && 
      i.date === date && 
      i.type === 'out' &&
      !i.item.toLowerCase().includes('super') && 
      !i.item.toLowerCase().includes('diesel') && 
      !i.item.toLowerCase().includes('lpg')
    );
    if (existingEqSales.length > 0) {
      setEquipmentSales(existingEqSales.map(s => ({ id: s.id, item: s.item, quantity: s.quantity, amount: s.amount })));
    } else {
      setEquipmentSales([{ item: accessoryProducts[0]?.name || 'Burner', quantity: 0, amount: 0 }]);
    }

    const existingEqPurchases = inventoryItems.filter(i => 
      i.station === station && 
      i.date === date && 
      i.type === 'in' &&
      !i.item.toLowerCase().includes('super') && 
      !i.item.toLowerCase().includes('diesel') && 
      !i.item.toLowerCase().includes('lpg')
    );
    if (existingEqPurchases.length > 0) {
      setEquipmentPurchases(existingEqPurchases.map(p => ({ 
        id: p.id, 
        item: p.item, 
        quantity: p.quantity, 
        rate: p.rate || (p.quantity && p.amount ? Math.round(p.amount / p.quantity) : 0),
        amount: p.amount 
      })));
    } else {
      setEquipmentPurchases([{ item: accessoryProducts[0]?.name || 'Burner', quantity: 0, rate: 0, amount: 0 }]);
    }

    // 4. EXPENSES
    const existingExpenses = expenses.filter(e => e.station === station && e.date === date);
    if (existingExpenses.length > 0) {
      setExpenseRows(existingExpenses.map(e => ({ 
        id: e.id, 
        expenseCode: e.expenseCode || (expenseTemplates[0]?.code || 'EXP-GEN'),
        category: e.category, 
        amount: e.amount,
        paymentMethod: e.paymentMethod || 'Cash',
        isRecurring: e.isRecurring,
        frequency: e.frequency,
      })));
    } else {
      setExpenseRows([{ 
        expenseCode: expenseTemplates[0]?.code || 'EXP-GEN',
        category: expenseTemplates[0]?.name || 'Generator (Fuel & Service)', 
        amount: 0,
        paymentMethod: 'Cash',
        isRecurring: true,
        frequency: 'Weekly'
      }]);
    }

    // 5. INVOICES
    const existingInvoices = invoices.filter(i => i.station === station && i.date === date);
    if (existingInvoices.length > 0) {
      setInvoiceRows(existingInvoices.map(i => {
        let type: 'debt' | 'paid' | 'paid_full' | 'partial' = 'debt';
        if ((i.totalAmount || 0) === 0 && (i.paidAmount || 0) > 0) {
          type = 'paid';
        } else if ((i.totalAmount || 0) > 0 && (i.paidAmount || 0) === (i.totalAmount || 0)) {
          type = 'paid_full';
        } else if ((i.totalAmount || 0) > 0 && (i.paidAmount || 0) > 0) {
          type = 'partial';
        }
        return { 
          id: i.id, 
          customerName: i.customerName, 
          type, 
          totalAmount: i.totalAmount, 
          paidAmount: i.paidAmount 
        };
      }));
    } else {
      setInvoiceRows([{ customerName: '', type: 'debt', totalAmount: 0, paidAmount: 0 }]);
    }

    // 6. CASH POSITION & LOSSES
    const existingCashPos = cashPositions.find(cp => (!cp.station || cp.station === station) && cp.date === date);
    if (existingCashPos) {
      setMPesa(existingCashPos.mPesa || 0);
      setManualCashOnHand(existingCashPos.cashOnHand || 0);
      setLossesAmount(existingCashPos.losses || 0);
      setLossesNote(existingCashPos.lossesNote || '');
    } else {
      setMPesa(0);
      setManualCashOnHand(0);
      setLossesAmount(0);
      setLossesNote('');
    }

    lastLoadedContext.current = contextKey;
  }, [date, station, fuelProducts, lpgProducts, accessoryProducts]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Quick add customer handler
  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const assignedCode = newCustomerCode.trim() || `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const newCust: Customer = {
      id: generateId(),
      station: station,
      code: assignedCode,
      name: newCustomerName.trim(),
      creditLimit: parseFloat(newCustomerCreditLimit) || 0,
      openingBalance: parseFloat(newCustomerOpeningBalance) || 0,
    };

    setCustomers(prev => [...prev, newCust]);

    // Automatically set this newly created customer in the empty invoice row or append a new row
    setInvoiceRows(prev => {
      const emptyIdx = prev.findIndex(r => !r.customerName);
      if (emptyIdx >= 0) {
        const updated = [...prev];
        updated[emptyIdx] = { ...updated[emptyIdx], customerName: newCust.name };
        return updated;
      }
      return [...prev, { customerName: newCust.name, type: 'debt', totalAmount: 0, paidAmount: 0 }];
    });

    setIsQuickCustomerModalOpen(false);
    setNewCustomerName('');
    setNewCustomerCode('');
    setNewCustomerCreditLimit('');
    setNewCustomerOpeningBalance('');
  };

  // Quick add expense parameter modal opener & submit handlers
  const handleOpenQuickExpenseModal = () => {
    const nextCode = `EXP-${String(expenseTemplates.length + 1).padStart(3, '0')}`;
    setNewExpenseCode(nextCode);
    setNewExpenseName('');
    setNewExpenseCategory('Operations & Fuel');
    setNewExpenseDefaultAmount('');
    setNewExpenseFrequency('Monthly');
    setNewExpensePaymentMethod('Cash');
    setNewExpenseIsRecurring(true);
    setNewExpenseNotes('');
    setIsQuickExpenseModalOpen(true);
  };

  const handleQuickAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim()) return;

    const formattedCode = (newExpenseCode.trim() || `EXP-${String(expenseTemplates.length + 1).padStart(3, '0')}`).toUpperCase();
    const defaultAmt = parseFloat(newExpenseDefaultAmount) || 0;

    const newTemplate: ExpenseTemplate = {
      id: generateId(),
      code: formattedCode,
      name: newExpenseName.trim(),
      category: newExpenseCategory || 'Operations & Fuel',
      defaultAmount: defaultAmt,
      frequency: newExpenseFrequency,
      isRecurring: newExpenseIsRecurring,
      defaultPaymentMethod: newExpensePaymentMethod,
      notes: newExpenseNotes.trim(),
    };

    // 1. Add to master expense templates (this makes it appear in Expenses banner/master catalog & dropdowns)
    setExpenseTemplates(prev => {
      // Check if code already exists to avoid duplication
      const existing = prev.find(t => t.code === formattedCode);
      if (existing) {
        return prev.map(t => t.code === formattedCode ? { ...t, ...newTemplate } : t);
      }
      return [...prev, newTemplate];
    });

    // 2. Automatically populate this new expense into the daily entry rows
    setExpenseRows(prev => {
      const emptyIdx = prev.findIndex(r => !r.category && !r.amount);
      const newRowData: Partial<Expense> = {
        expenseCode: formattedCode,
        category: newExpenseName.trim(),
        amount: defaultAmt,
        paymentMethod: newExpensePaymentMethod,
        isRecurring: newExpenseIsRecurring,
        frequency: newExpenseFrequency,
      };

      if (emptyIdx >= 0) {
        const updated = [...prev];
        updated[emptyIdx] = { ...updated[emptyIdx], ...newRowData };
        return updated;
      }
      return [...prev, newRowData];
    });

    setIsQuickExpenseModalOpen(false);
  };

  // Computations
  const pumpSalesAmount = useMemo(() => {
    return pumps.reduce((sum, p) => {
      const sAmount = calculatePumpMeterDelta(p.salesStart, p.salesStop);
      return sum + sAmount;
    }, 0);
  }, [pumps]);

  const lpgSalesAmount = useMemo(() => {
    return lpgSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [lpgSales]);

  const equipmentSalesAmount = useMemo(() => {
    return equipmentSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [equipmentSales]);

  const totalSales = pumpSalesAmount + lpgSalesAmount + equipmentSalesAmount;

  const lpgPurchasesAmount = useMemo(() => {
    return lpgPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [lpgPurchases]);

  const equipmentPurchasesAmount = useMemo(() => {
    return equipmentPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [equipmentPurchases]);

  const totalCOGS = lpgPurchasesAmount + equipmentPurchasesAmount;

  const expensesAmount = useMemo(() => {
    return expenseRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenseRows]);

  const invoicesTotal = useMemo(() => {
    return invoiceRows.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  }, [invoiceRows]);

  const paidInvoicesAmount = useMemo(() => {
    return invoiceRows.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  }, [invoiceRows]);

  // Uncollected credit sales issued today (reduces expected cash because fuel/goods were sold on credit)
  const uncollectedCreditSalesToday = useMemo(() => {
    return invoiceRows.reduce((sum, i) => {
      const total = Number(i.totalAmount) || 0;
      const paid = Number(i.paidAmount) || 0;
      return sum + (total > paid ? (total - paid) : 0);
    }, 0);
  }, [invoiceRows]);

  // Past debt payments received today in cash (increases expected cash because cash came in from an old debt)
  const pastDebtPaymentsCollectedToday = useMemo(() => {
    return invoiceRows.reduce((sum, i) => {
      const total = Number(i.totalAmount) || 0;
      const paid = Number(i.paidAmount) || 0;
      if (i.type === 'paid' || total === 0) {
        return sum + paid;
      }
      return sum;
    }, 0);
  }, [invoiceRows]);

  const expectedTotalCash = totalSales - totalCOGS - expensesAmount - uncollectedCreditSalesToday + pastDebtPaymentsCollectedToday;
  const expectedCashOnHand = expectedTotalCash - (mPesa || 0);
  const losses = Number(lossesAmount) || 0;
  // Exact Net Cash at Hand = Physical Cash Count minus Recorded Operational/Discrepancy Losses
  const exactCashAtHand = (manualCashOnHand || 0) - losses;
  // Reconciliation Variance compares Exact Net Physical Cash against Expected Cash on Hand
  const variance = exactCashAtHand - expectedCashOnHand;

  // MASTER SAVE FUNCTION - SYNC TO ALL 6 MODULES (Pump Readings, LPG, Inventory, Expenses, Invoices, Cash Position)
  const handleSaveAll = () => {
    if (isSaving) return;
    setIsSaving(true);

    const normDate = normalizeDate(date);
    let syncedModules: string[] = [];

    // 1. LINK & SAVE PUMP READINGS (Also automatically feeds Inventory Fuel Out)
    const validPumpReadings: PumpReading[] = pumps
      .filter(p => (p.litresStop || 0) > 0 || (p.salesStop || 0) > 0 || (p.litresStart || 0) > 0)
      .map(p => {
        const safeProduct = (p.product || 'fuel').trim();
        const detId = generateDeterministicId('pump', date, station, safeProduct);
        return {
          id: detId,
          date,
          station,
          product: p.product!,
          salesStart: Number(p.salesStart) || 0,
          salesStop: Number(p.salesStop) || 0,
          litresStart: Number(p.litresStart) || 0,
          litresStop: Number(p.litresStop) || 0,
          ratePerLitre: Number(p.ratePerLitre) || 0
        };
      });

    if (validPumpReadings.length > 0) {
      setPumpReadings(prev => {
        // Remove previous readings for this date & station, then append clean set
        const filtered = prev.filter(r => !(normalizeDate(r.date) === normDate && r.station === station));
        return [...filtered, ...validPumpReadings];
      });
      syncedModules.push(`Pump Readings (${validPumpReadings.length} fuel pumps)`);
    }

    // 2. LINK & SAVE LPG TRANSACTIONS (Feeds LPG page & Inventory stock/cylinders)
    const newLpgSales: LPGTransaction[] = lpgSales
      .filter(s => (Number(s.quantity) > 0 || Number(s.amount) > 0 || Number(s.completeQuantity) > 0) && s.item)
      .map((s, idx) => {
        const safeItem = (s.item || 'lpg').trim();
        const detId = generateDeterministicId('lpg_sale', date, station, safeItem, idx);
        return {
          id: detId,
          date,
          station,
          type: 'sale',
          item: s.item!,
          quantity: Number(s.quantity) || 0,
          completeQuantity: Number(s.completeQuantity) || 0,
          amount: Number(s.amount) || 0
        };
      });

    const newLpgPurchases: LPGTransaction[] = lpgPurchases
      .filter(p => (Number(p.quantity) > 0 || Number(p.amount) > 0) && p.item)
      .map((p, idx) => {
        const safeItem = (p.item || 'lpg').trim();
        const detId = generateDeterministicId('lpg_purch', date, station, safeItem, idx);
        return {
          id: detId,
          date,
          station,
          type: 'purchase',
          item: p.item!,
          quantity: Number(p.quantity) || 0,
          rate: Number(p.rate) || 0,
          amount: Number(p.amount) || 0
        };
      });

    const allNewLpg = [...newLpgSales, ...newLpgPurchases];
    setLpgTransactions(prev => {
      // Remove previous daily entry items for this date and station
      const filtered = prev.filter(l => !(normalizeDate(l.date) === normDate && l.station === station));
      return [...filtered, ...allNewLpg];
    });
    if (allNewLpg.length > 0) {
      syncedModules.push(`LPG Transactions (${newLpgSales.length} sales, ${newLpgPurchases.length} purchases)`);
    }

    // 3. LINK & SAVE ACCESSORIES / EQUIPMENT INVENTORY (Feeds Inventory Stock In / Out)
    const newEqSales: InventoryItem[] = equipmentSales
      .filter(s => (Number(s.quantity) > 0 || Number(s.amount) > 0) && s.item)
      .map((s, idx) => {
        const safeItem = (s.item || 'acc').trim();
        const detId = generateDeterministicId('eq_sale', date, station, safeItem, idx);
        return {
          id: detId,
          date,
          station,
          type: 'out',
          item: s.item!,
          quantity: Number(s.quantity) || 0,
          amount: Number(s.amount) || 0
        };
      });

    const newEqPurchases: InventoryItem[] = equipmentPurchases
      .filter(p => (Number(p.quantity) > 0 || Number(p.amount) > 0) && p.item)
      .map((p, idx) => {
        const safeItem = (p.item || 'acc').trim();
        const detId = generateDeterministicId('eq_purch', date, station, safeItem, idx);
        return {
          id: detId,
          date,
          station,
          type: 'in',
          item: p.item!,
          quantity: Number(p.quantity) || 0,
          rate: Number(p.rate) || 0,
          amount: Number(p.amount) || 0
        };
      });

    const allNewInventory = [...newEqSales, ...newEqPurchases];
    setInventoryItems(prev => {
      // Remove previous equipment daily entries for this date & station
      const filtered = prev.filter(item => 
        !(normalizeDate(item.date) === normDate && item.station === station && 
          !item.item.toLowerCase().includes('super') && 
          !item.item.toLowerCase().includes('diesel') && 
          !item.item.toLowerCase().includes('lpg'))
      );
      return [...filtered, ...allNewInventory];
    });
    if (allNewInventory.length > 0) {
      syncedModules.push(`Inventory Stock (${newEqSales.length} sales out, ${newEqPurchases.length} purchases in)`);
    }

    // 4. LINK & SAVE EXPENSES (Feeds Expenses page)
    const newExpenses: Expense[] = expenseRows
      .filter(e => ((e.category || '').trim().length > 0 || (e.expenseCode || '').trim().length > 0) && Number(e.amount) > 0)
      .map((e, idx) => {
        const safeExpCode = (e.expenseCode || e.category || 'misc').trim();
        const detId = generateDeterministicId('exp', date, station, safeExpCode, idx);
        return {
          id: detId,
          date,
          station,
          expenseCode: e.expenseCode || 'EXP-MISC',
          category: (e.category || e.expenseCode || 'General Operations').trim(),
          amount: Number(e.amount) || 0,
          paymentMethod: e.paymentMethod || 'Cash',
          isRecurring: e.isRecurring ?? true,
          frequency: e.frequency || 'Monthly'
        };
      });

    setExpenses(prev => {
      const filtered = prev.filter(e => !(normalizeDate(e.date) === normDate && e.station === station));
      return [...filtered, ...newExpenses];
    });
    if (newExpenses.length > 0) {
      syncedModules.push(`Expenses (${newExpenses.length} items totaling KES ${expensesAmount.toLocaleString()})`);
    }

    // 5. LINK & SAVE INVOICES (Feeds Invoices page & customer balance)
    const newInvoices: Invoice[] = invoiceRows
      .filter(i => (i.customerName || '').trim().length > 0 && (Number(i.totalAmount) > 0 || Number(i.paidAmount) > 0))
      .map((i, idx) => {
        const safeCust = (i.customerName || 'customer').trim();
        const detId = generateDeterministicId('inv', date, station, safeCust, idx);
        return {
          id: detId,
          date,
          station,
          customerName: i.customerName!.trim(),
          totalAmount: Number(i.totalAmount) || 0,
          paidAmount: Number(i.paidAmount) || 0
        };
      });

    setInvoices(prev => {
      const filtered = prev.filter(inv => !(normalizeDate(inv.date || '') === normDate && inv.station === station));
      return [...filtered, ...newInvoices];
    });
    if (newInvoices.length > 0) {
      syncedModules.push(`Invoices & Debt Payments (${newInvoices.length} records: KES ${invoicesTotal.toLocaleString()} invoiced, KES ${paidInvoicesAmount.toLocaleString()} paid)`);
    }

    // 6. LINK & SAVE CASH POSITION & LOSSES (Feeds Cash Position page & reconciliation)
    if (mPesa > 0 || manualCashOnHand > 0 || lossesAmount > 0 || expectedTotalCash > 0) {
      const detId = generateDeterministicId('cash', date, station, 'pos');
      const newCashPosition: CashPosition = {
        id: detId,
        date,
        station,
        mPesa: Number(mPesa) || 0,
        cashOnHand: Number(manualCashOnHand) || 0,
        losses: Number(lossesAmount) || 0,
        lossesNote: (lossesNote || '').trim()
      };

      setCashPositions(prev => {
        const filtered = prev.filter(cp => !(normalizeDate(cp.date) === normDate && (cp.station === station || !cp.station)));
        return [...filtered, newCashPosition];
      });
      syncedModules.push(`Cash Position (M-Pesa: KES ${mPesa.toLocaleString()}, Cash: KES ${manualCashOnHand.toLocaleString()}${lossesAmount > 0 ? `, Losses: KES ${lossesAmount.toLocaleString()}` : ''})`);
    }

    const message = syncedModules.length > 0 
      ? `Data linked and synchronized across:\n• ${syncedModules.join('\n• ')}`
      : 'Daily Entry recorded successfully!';

    setSaveSuccessMsg(message);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 6000);

    // Release save lock after cooldown
    setTimeout(() => {
      setIsSaving(false);
    }, 1200);
  };

  return (
    <div className="px-4 sm:px-8 py-6 pb-32 space-y-6 animate-in fade-in duration-500 max-w-[1500px] w-full mx-auto">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">Daily Data Entry</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Live Interlink Mode
            </span>
          </div>
          <p className="text-theme-text-muted mt-1 text-sm">
            Input all station data here. Everything links directly to Pump Readings, LPG, Inventory, Expenses, Invoices, and Cash Position.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {allSystemDuplicates.totalDuplicates > 0 && (
            <Button
              onClick={handleCleanAllSystemDuplicates}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold px-3 py-2"
              title="Remove all duplicate records across all dates"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Purge All Duplicates ({allSystemDuplicates.totalDuplicates})
            </Button>
          )}

          <Button 
            onClick={handleSaveAll} 
            disabled={isSaving}
            className={`flex items-center gap-2 font-bold px-6 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all transform active:scale-95 ${
              isSaving 
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-90' 
                : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-slate-950'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Saving & Syncing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save & Sync All Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Duplicate Warning Alert for Selected Date */}
      {dateDuplicates.totalDuplicates > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                Duplicate Records Detected for {date} ({station})
              </h3>
              <p className="text-xs text-amber-200/90 mt-1">
                Found {dateDuplicates.totalDuplicates} duplicate entry/entries (
                {dateDuplicates.breakdown.invoices > 0 && `${dateDuplicates.breakdown.invoices} Invoices, `}
                {dateDuplicates.breakdown.pumpReadings > 0 && `${dateDuplicates.breakdown.pumpReadings} Pump Readings, `}
                {dateDuplicates.breakdown.expenses > 0 && `${dateDuplicates.breakdown.expenses} Expenses, `}
                {dateDuplicates.breakdown.lpgTransactions > 0 && `${dateDuplicates.breakdown.lpgTransactions} LPG, `}
                {dateDuplicates.breakdown.inventoryItems > 0 && `${dateDuplicates.breakdown.inventoryItems} Inventory`}
                ) caused by multiple saves. Clean them with one click below:
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleCleanCurrentDateDuplicates}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-4 py-2 text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] whitespace-nowrap flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clean Duplicates for This Date ({dateDuplicates.totalDuplicates})
          </Button>
        </div>
      )}

      {/* Deduplication Success Message */}
      {dedupeSuccessMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-emerald-300">Deduplication Complete</p>
            <pre className="text-xs text-emerald-200 mt-1 font-sans whitespace-pre-wrap">{dedupeSuccessMsg}</pre>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-emerald-300">Daily Data Saved and Synchronized!</p>
              <pre className="text-xs text-emerald-200 mt-1 font-sans whitespace-pre-wrap">{saveSuccessMsg}</pre>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              const nextDay = addDays(date, 1);
              setDate(nextDay);
              setUserHasOverriddenDate(false);
              setSaveSuccessMsg(null);
            }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap flex-shrink-0"
          >
            Advance to Next Day ({formatFriendlyDate(addDays(date, 1))}) <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Date & Station Selection Control Panel */}
      <Card className="glass-panel border-theme-border shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              1. Choose Station To Allocate Data
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableStations.map(s => {
                const isSelected = station === s.name;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStation(s.name)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-950/80 to-blue-950/80 border-blue-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-blue-400'
                        : 'bg-slate-900/60 border-theme-border/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Station Record
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-800/60">
                        <Check className="w-3.5 h-3.5" /> Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-theme-border/50">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Entry Date
                </label>
                {userHasOverriddenDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUserHasOverriddenDate(false);
                      setDate(autoSequentialDate);
                    }}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30"
                    title="Reset to sequential following day"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset to Sequential ({formatFriendlyDate(autoSequentialDate)})
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 flex items-center gap-1">
                    <Sparkle className="w-3 h-3 text-blue-300" /> Auto-Sequential Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  onClick={() => {
                    setDate(prev => addDays(prev, -1));
                    setUserHasOverriddenDate(true);
                  }}
                  className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-theme-border text-slate-300 text-xs font-bold"
                  title="Previous Day (-1 Day)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => {
                    setDate(e.target.value);
                    setUserHasOverriddenDate(true);
                  }} 
                  className="bg-slate-900 border-theme-border text-slate-100 font-mono text-sm flex-1"
                />

                <Button
                  type="button"
                  onClick={() => {
                    setDate(prev => addDays(prev, 1));
                    setUserHasOverriddenDate(true);
                  }}
                  className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-theme-border text-slate-300 text-xs font-bold"
                  title="Next Day (+1 Day)"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {latestRecordedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setDate(latestRecordedDate);
                      setUserHasOverriddenDate(true);
                    }}
                    className={`text-[11px] px-2 py-1 rounded transition-colors border cursor-pointer ${
                      date === latestRecordedDate
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                    title="View/Edit previous recorded shift"
                  >
                    📄 Last Shift: {formatFriendlyDate(latestRecordedDate)}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDate(autoSequentialDate);
                    setUserHasOverriddenDate(false);
                  }}
                  className={`text-[11px] px-2 py-1 rounded transition-colors border cursor-pointer ${
                    !userHasOverriddenDate && date === autoSequentialDate
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300 border-slate-800'
                  }`}
                  title="Auto Sequential Date (+1 Day after last entry)"
                >
                  ⚡ Next Sequential: {formatFriendlyDate(autoSequentialDate)}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDate(today);
                    setUserHasOverriddenDate(true);
                  }}
                  className={`text-[11px] px-2 py-1 rounded transition-colors border cursor-pointer ${
                    date === new Date().toISOString().split('T')[0]
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-blue-300 border-slate-800'
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider block mb-1.5">
                Selected Station Dropdown
              </label>
              <Select 
                value={station} 
                onChange={(e) => setStation(e.target.value as Station)}
                className="bg-slate-900 border-theme-border text-slate-100"
              >
                {availableStations.map(s => (
                  <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Selecting a station automatically calculates its last recorded closing meters & sequential date.
              </p>
            </div>
          </div>

          {/* Station Data Isolation Notice Banner */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>
              <strong>Station Isolation Active:</strong> Currently editing & recording exclusively for <strong className="text-blue-300 underline">{station}</strong> on <strong className="text-blue-300">{date}</strong>. Other stations will not be overwritten or mixed.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 1. PUMP READINGS SECTION */}
      <Card className="glass-panel border-theme-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg text-blue-400">Pump Readings</CardTitle>
          </div>
          <span className="text-xs font-mono text-blue-400/80 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
            Auto-linked to Fuel Out & Inventory
          </span>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {pumps.map((pump, idx) => {
            const salesAmount = calculatePumpMeterDelta(pump.salesStart, pump.salesStop);
            const litresSold = calculatePumpMeterDelta(pump.litresStart, pump.litresStop);
            const calculatedSales = litresSold * (pump.ratePerLitre || 0);
            const hasStopEntered = (Number(pump.salesStop) > 0 || Number(pump.litresStop) > 0);
            const variance = hasStopEntered ? (salesAmount - calculatedSales) : 0;
            const salesRolledOver = isMeterRollover(pump.salesStart, pump.salesStop);
            const litresRolledOver = isMeterRollover(pump.litresStart, pump.litresStop);

            return (
              <div key={idx} className="border border-theme-border/60 rounded-xl p-4 space-y-3 bg-slate-900/40">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="font-bold text-blue-300 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    {pump.product}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(salesRolledOver || litresRolledOver) && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                        <span>🔄 1M Rollover</span>
                        <span className="text-[10px] text-amber-400/80">((1,000,000 - Start) + Stop)</span>
                      </span>
                    )}
                    {litresSold > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {litresSold.toFixed(2)} Litres Sold
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Start</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={pump.salesStart === 0 ? '' : pump.salesStart} 
                      onChange={(e) => {
                        const newPumps = [...pumps];
                        newPumps[idx].salesStart = parseFloat(e.target.value) || 0;
                        setPumps(newPumps);
                      }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">
                      Sales Stop {salesRolledOver && <span className="text-[10px] text-amber-400">(Rolled over)</span>}
                    </label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={pump.salesStop === 0 ? '' : pump.salesStop} 
                      onChange={(e) => {
                        const newPumps = [...pumps];
                        newPumps[idx].salesStop = parseFloat(e.target.value) || 0;
                        setPumps(newPumps);
                      }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Amount</label>
                    <Input disabled value={Math.round(salesAmount).toLocaleString()} className="bg-slate-950 font-mono text-blue-300 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Start</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={pump.litresStart === 0 ? '' : pump.litresStart} 
                      onChange={(e) => {
                        const newPumps = [...pumps];
                        newPumps[idx].litresStart = parseFloat(e.target.value) || 0;
                        setPumps(newPumps);
                      }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">
                      Litres Stop {litresRolledOver && <span className="text-[10px] text-amber-400">(Rolled over)</span>}
                    </label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={pump.litresStop === 0 ? '' : pump.litresStop} 
                      onChange={(e) => {
                        const newPumps = [...pumps];
                        newPumps[idx].litresStop = parseFloat(e.target.value) || 0;
                        setPumps(newPumps);
                      }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Sold</label>
                    <Input disabled value={litresSold.toFixed(2)} className="bg-slate-950 font-mono text-blue-300 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Rate (Ksh/L)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={pump.ratePerLitre === 0 ? '' : pump.ratePerLitre} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newPumps = [...pumps];
                        newPumps[idx].ratePerLitre = val;
                        setPumps(newPumps);
                        if (!isNaN(val) && val > 0) {
                          localStorage.setItem(`rate_${station}_${pump.product}`, val.toString());
                        }
                      }} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Calculated Sales</label>
                    <Input disabled value={`KES ${Math.round(calculatedSales).toLocaleString()}`} className="bg-slate-950 text-blue-300 font-semibold font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Variance (Sales Amount - Calculated)</label>
                    <Input 
                      disabled 
                      value={!hasStopEntered ? 'KES 0' : `${Math.round(variance) > 0 ? '+' : ''}${Math.round(variance).toLocaleString()}`} 
                      className={`bg-slate-950 font-semibold font-mono ${!hasStopEntered ? 'text-slate-400' : Math.round(variance) < 0 ? 'text-red-400' : Math.round(variance) > 0 ? 'text-blue-400' : 'text-emerald-400'}`} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 2. LPG SECTION (Sold & Bought) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LPG SOLD */}
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-lg text-purple-400">LPG Sold</CardTitle>
            </div>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => setLpgSales([...lpgSales, { item: lpgProducts[0]?.name || '6Kg LPG', quantity: 0, amount: 0 }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {lpgSales.map((sale, idx) => (
              <div key={idx} className="flex gap-3 items-end flex-wrap sm:flex-nowrap p-2.5 rounded-lg bg-slate-900/40 border border-theme-border/40">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cylinder / Item</label>
                  <Select 
                    value={sale.item || lpgProducts[0]?.name || '6Kg LPG'} 
                    onChange={(e) => {
                      const newSales = [...lpgSales];
                      newSales[idx].item = e.target.value;
                      setLpgSales(newSales);
                    }}
                  >
                    {lpgProducts.map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>
                        {p.itemCode ? `[${p.itemCode}] ` : ''}{p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24 sm:w-28">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty (Refill)</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={sale.quantity === 0 ? '' : sale.quantity} 
                    onChange={(e) => {
                      const newSales = [...lpgSales];
                      newSales[idx].quantity = parseFloat(e.target.value) || 0;
                      setLpgSales(newSales);
                    }} 
                  />
                </div>
                <div className="w-24 sm:w-28">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty (Complete)</label>
                  <Input 
                    type="number" 
                    placeholder="Complete" 
                    value={sale.completeQuantity === 0 ? '' : sale.completeQuantity || ''} 
                    onChange={(e) => {
                      const newSales = [...lpgSales];
                      newSales[idx].completeQuantity = parseFloat(e.target.value) || 0;
                      setLpgSales(newSales);
                    }} 
                  />
                </div>
                <div className="w-32 sm:w-40">
                  <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Total Amount (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Amount" 
                    value={sale.amount === 0 ? '' : sale.amount} 
                    onChange={(e) => {
                      const newSales = [...lpgSales];
                      newSales[idx].amount = parseFloat(e.target.value) || 0;
                      setLpgSales(newSales);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setLpgSales(lpgSales.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* LPG BOUGHT (COGS) */}
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg text-emerald-400">LPG Bought (COGS / Refills)</CardTitle>
            </div>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => setLpgPurchases([...lpgPurchases, { item: lpgProducts[0]?.name || '6Kg LPG', quantity: 0, rate: 0, amount: 0 }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {lpgPurchases.map((purchase, idx) => (
              <div key={idx} className="flex gap-2.5 items-end flex-wrap sm:flex-nowrap p-2.5 rounded-lg bg-slate-900/40 border border-theme-border/40">
                <div className="flex-1 min-w-[130px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Item / Cylinder</label>
                  <Select 
                    value={purchase.item || lpgProducts[0]?.name || '6Kg LPG'} 
                    onChange={(e) => {
                      const newPurchases = [...lpgPurchases];
                      newPurchases[idx].item = e.target.value;
                      setLpgPurchases(newPurchases);
                    }}
                  >
                    {lpgProducts.map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>
                        {p.itemCode ? `[${p.itemCode}] ` : ''}{p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-20 sm:w-24">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={purchase.quantity === 0 ? '' : purchase.quantity} 
                    onChange={(e) => {
                      const newPurchases = [...lpgPurchases];
                      const qty = parseFloat(e.target.value) || 0;
                      newPurchases[idx].quantity = qty;
                      if (newPurchases[idx].rate) {
                        newPurchases[idx].amount = qty * (newPurchases[idx].rate || 0);
                      }
                      setLpgPurchases(newPurchases);
                    }} 
                  />
                </div>
                <div className="w-24 sm:w-28">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rate (Ksh)</label>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="Rate" 
                    value={purchase.rate === 0 || !purchase.rate ? '' : purchase.rate} 
                    onChange={(e) => {
                      const newPurchases = [...lpgPurchases];
                      const r = parseFloat(e.target.value) || 0;
                      newPurchases[idx].rate = r;
                      newPurchases[idx].amount = (newPurchases[idx].quantity || 0) * r;
                      setLpgPurchases(newPurchases);
                    }} 
                  />
                </div>
                <div className="w-32 sm:w-36">
                  <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Amount (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Amount" 
                    value={purchase.amount === 0 ? '' : purchase.amount} 
                    onChange={(e) => {
                      const newPurchases = [...lpgPurchases];
                      newPurchases[idx].amount = parseFloat(e.target.value) || 0;
                      setLpgPurchases(newPurchases);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setLpgPurchases(lpgPurchases.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 3. ACCESSORIES / INVENTORY SECTION (Burner, Grill, Oil, etc.) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACCESSORIES SOLD */}
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-lg text-purple-400">Burner, Grill & Catalog Sold</CardTitle>
            </div>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => setEquipmentSales([...equipmentSales, { item: accessoryProducts[0]?.name || 'Burner', quantity: 0, amount: 0 }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {equipmentSales.map((sale, idx) => (
              <div key={idx} className="flex gap-3 items-end flex-wrap sm:flex-nowrap p-2.5 rounded-lg bg-slate-900/40 border border-theme-border/40">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Catalog Item</label>
                  <Select 
                    value={sale.item || accessoryProducts[0]?.name || 'Burner'} 
                    onChange={(e) => {
                      const newSales = [...equipmentSales];
                      newSales[idx].item = e.target.value;
                      setEquipmentSales(newSales);
                    }}
                  >
                    {accessoryProducts.map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>
                        {p.itemCode ? `[${p.itemCode}] ` : ''}{p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24 sm:w-28">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty Sold</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={sale.quantity === 0 ? '' : sale.quantity} 
                    onChange={(e) => {
                      const newSales = [...equipmentSales];
                      newSales[idx].quantity = parseFloat(e.target.value) || 0;
                      setEquipmentSales(newSales);
                    }} 
                  />
                </div>
                <div className="w-32 sm:w-40">
                  <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Total Amount (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Amount" 
                    value={sale.amount === 0 ? '' : sale.amount} 
                    onChange={(e) => {
                      const newSales = [...equipmentSales];
                      newSales[idx].amount = parseFloat(e.target.value) || 0;
                      setEquipmentSales(newSales);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setEquipmentSales(equipmentSales.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ACCESSORIES BOUGHT (COGS) */}
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg text-emerald-400">Burner, Grill & Catalog Bought (COGS)</CardTitle>
            </div>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => setEquipmentPurchases([...equipmentPurchases, { item: accessoryProducts[0]?.name || 'Burner', quantity: 0, rate: 0, amount: 0 }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {equipmentPurchases.map((purchase, idx) => (
              <div key={idx} className="flex gap-2.5 items-end flex-wrap sm:flex-nowrap p-2.5 rounded-lg bg-slate-900/40 border border-theme-border/40">
                <div className="flex-1 min-w-[130px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Catalog Item</label>
                  <Select 
                    value={purchase.item || accessoryProducts[0]?.name || 'Burner'} 
                    onChange={(e) => {
                      const newPurchases = [...equipmentPurchases];
                      newPurchases[idx].item = e.target.value;
                      setEquipmentPurchases(newPurchases);
                    }}
                  >
                    {accessoryProducts.map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>
                        {p.itemCode ? `[${p.itemCode}] ` : ''}{p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-20 sm:w-24">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={purchase.quantity === 0 ? '' : purchase.quantity} 
                    onChange={(e) => {
                      const newPurchases = [...equipmentPurchases];
                      const qty = parseFloat(e.target.value) || 0;
                      newPurchases[idx].quantity = qty;
                      if (newPurchases[idx].rate) {
                        newPurchases[idx].amount = qty * (newPurchases[idx].rate || 0);
                      }
                      setEquipmentPurchases(newPurchases);
                    }} 
                  />
                </div>
                <div className="w-24 sm:w-28">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rate (Ksh)</label>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="Rate" 
                    value={purchase.rate === 0 || !purchase.rate ? '' : purchase.rate} 
                    onChange={(e) => {
                      const newPurchases = [...equipmentPurchases];
                      const r = parseFloat(e.target.value) || 0;
                      newPurchases[idx].rate = r;
                      newPurchases[idx].amount = (newPurchases[idx].quantity || 0) * r;
                      setEquipmentPurchases(newPurchases);
                    }} 
                  />
                </div>
                <div className="w-32 sm:w-36">
                  <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Amount (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Amount" 
                    value={purchase.amount === 0 ? '' : purchase.amount} 
                    onChange={(e) => {
                      const newPurchases = [...equipmentPurchases];
                      newPurchases[idx].amount = parseFloat(e.target.value) || 0;
                      setEquipmentPurchases(newPurchases);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setEquipmentPurchases(equipmentPurchases.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 4. EXPENSES (Full Width for comfortable viewing and wide amount inputs) */}
      <Card className="glass-panel border-theme-border">
        <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <div>
              <CardTitle className="text-lg text-red-400">Expenses & Recurring Costs</CardTitle>
              <p className="text-xs text-theme-text-muted mt-0.5">Recurring expenses default payment to Cash unless specified otherwise.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              className="py-1 px-3 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all" 
              variant="secondary" 
              onClick={handleOpenQuickExpenseModal}
              title="Create a new expense category/parameter captured under Expense banner page"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" /> Add New Expense Type
            </Button>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => {
                const defaultTpl = expenseTemplates[0];
                setExpenseRows([...expenseRows, { 
                  expenseCode: defaultTpl?.code || 'EXP-GEN', 
                  category: defaultTpl?.name || 'Generator (Fuel & Service)', 
                  amount: 0,
                  paymentMethod: 'Cash',
                  isRecurring: true,
                  frequency: defaultTpl?.frequency || 'Monthly'
                }]);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Expense Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          {expenseRows.map((expense, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-theme-border/60 bg-slate-900/50 space-y-2 hover:border-theme-border transition-colors">
              <div className="flex gap-3 items-end flex-wrap xl:flex-nowrap">
                {/* Expense Code Parameter */}
                <div className="w-full sm:w-56 xl:w-64">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Expense Code Parameter</label>
                    <button
                      type="button"
                      onClick={handleOpenQuickExpenseModal}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold hover:underline flex items-center gap-0.5"
                      title="Add a new expense category"
                    >
                      + New
                    </button>
                  </div>
                  <Select 
                    value={expense.expenseCode || expenseTemplates[0]?.code || 'EXP-GEN'} 
                    onChange={(e) => {
                      const code = e.target.value;
                      if (code === '__NEW_EXPENSE__') {
                        handleOpenQuickExpenseModal();
                        return;
                      }
                      const tpl = expenseTemplates.find(t => t.code === code);
                      const newRows = [...expenseRows];
                      newRows[idx].expenseCode = code;
                      if (tpl) {
                        newRows[idx].category = tpl.name;
                        if (!newRows[idx].amount && tpl.defaultAmount) {
                          newRows[idx].amount = tpl.defaultAmount;
                        }
                        newRows[idx].paymentMethod = tpl.defaultPaymentMethod || 'Cash';
                        newRows[idx].isRecurring = tpl.isRecurring;
                        newRows[idx].frequency = tpl.frequency;
                      }
                      setExpenseRows(newRows);
                    }}
                    className="text-xs bg-slate-950 font-mono font-bold text-blue-300 w-full"
                  >
                    {expenseTemplates.map(t => (
                      <option className="bg-slate-950 text-slate-100" key={t.id} value={t.code}>
                        [{t.code}] {t.name}
                      </option>
                    ))}
                    <option className="bg-slate-950 text-slate-100" value="CUSTOM">Custom Code / Expense</option>
                    <option className="bg-red-950/80 text-red-300 font-bold" value="__NEW_EXPENSE__">➕ Define New Expense Type...</option>
                  </Select>
                </div>

                {/* Category / Description */}
                <div className="flex-1 min-w-[180px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category / Description</label>
                  <Input 
                    placeholder="e.g. Generator diesel, Lunch, Electricity" 
                    value={expense.category || ''} 
                    onChange={(e) => {
                      const newRows = [...expenseRows];
                      newRows[idx].category = e.target.value;
                      setExpenseRows(newRows);
                    }} 
                    className="text-xs bg-slate-950 text-slate-100"
                  />
                </div>

                {/* Payment Method */}
                <div className="w-full sm:w-36">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Method</label>
                  <Select 
                    value={expense.paymentMethod || 'Cash'} 
                    onChange={(e) => {
                      const newRows = [...expenseRows];
                      newRows[idx].paymentMethod = e.target.value as any;
                      setExpenseRows(newRows);
                    }}
                    className="text-xs bg-slate-950 text-slate-200 w-full"
                  >
                    <option className="bg-slate-950 text-slate-100" value="Cash">Cash (Default)</option>
                    <option className="bg-slate-950 text-slate-100" value="M-Pesa">M-Pesa</option>
                    <option className="bg-slate-950 text-slate-100" value="Bank Transfer">Bank Transfer</option>
                  </Select>
                </div>

                {/* WIDENED Amount Box with clear currency prefix and spacious input */}
                <div className="w-full sm:w-48 xl:w-56">
                  <label className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Amount (KES)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400/80 pointer-events-none">KES</span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={expense.amount === 0 ? '' : expense.amount} 
                      onChange={(e) => {
                        const newRows = [...expenseRows];
                        newRows[idx].amount = parseFloat(e.target.value) || 0;
                        setExpenseRows(newRows);
                      }} 
                      className="text-sm font-mono font-bold text-slate-100 bg-slate-950 pl-12 pr-3 py-2 w-full border-rose-500/30 focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Delete button */}
                <Button 
                  variant="danger" 
                  className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setExpenseRows(expenseRows.filter((_, i) => i !== idx))}
                  title="Delete Expense Row"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. INVOICES & DEBTS */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <div>
                <CardTitle className="text-lg text-amber-400">Invoices & Debts</CardTitle>
                <p className="text-xs text-theme-text-muted mt-0.5">Record customer credit/debt invoices and received debt payments.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                className="py-1 px-3 text-xs bg-blue-600/25 hover:bg-blue-600/35 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)] flex items-center gap-1.5 font-bold transition-all" 
                variant="secondary" 
                title="Quick Add Customer"
                onClick={() => {
                  setNewCustomerName('');
                  setNewCustomerCode(`CUST-${String(customers.length + 1).padStart(3, '0')}`);
                  setNewCustomerCreditLimit('');
                  setNewCustomerOpeningBalance('');
                  setIsQuickCustomerModalOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 text-blue-400 font-bold" />
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Add Customer</span>
              </Button>
              <Button 
                className="py-1 px-2.5 text-xs" 
                variant="secondary" 
                onClick={() => setInvoiceRows([...invoiceRows, { customerName: '', type: 'debt', totalAmount: 0, paidAmount: 0 }])}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {invoiceRows.map((invoice, idx) => {
              const currentType = invoice.type || (
                (invoice.totalAmount || 0) > 0 && (invoice.paidAmount || 0) === 0 ? 'debt' :
                (invoice.totalAmount || 0) === 0 && (invoice.paidAmount || 0) > 0 ? 'paid' :
                (invoice.totalAmount || 0) > 0 && (invoice.paidAmount || 0) === (invoice.totalAmount || 0) ? 'paid_full' :
                (invoice.totalAmount || 0) > 0 && (invoice.paidAmount || 0) > 0 ? 'partial' : 'debt'
              );

              const custStatus = invoice.customerName ? getCustomerStatus(invoice.customerName) : null;

              return (
                <div key={idx} className="p-3.5 rounded-xl border border-theme-border/60 bg-slate-900/50 space-y-2.5 hover:border-theme-border transition-colors">
                  <div className="flex gap-3 items-end flex-wrap xl:flex-nowrap">
                    {/* Customer Select */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Customer / Debtor</label>
                          {invoice.customerName && (
                            <button
                              type="button"
                              onClick={() => setPreviewCustomerName(invoice.customerName!)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 ml-1 transition-colors"
                              title="Open Customer 360° Financial Status Preview"
                            >
                              <Eye className="w-2.5 h-2.5" /> Preview Status
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCustomerName('');
                            setNewCustomerCode(`CUST-${String(customers.length + 1).padStart(3, '0')}`);
                            setNewCustomerCreditLimit('');
                            setNewCustomerOpeningBalance('');
                            setIsQuickCustomerModalOpen(true);
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-semibold"
                          title="Quick Register New Customer"
                        >
                          <Plus className="w-3 h-3" /> New Customer
                        </button>
                      </div>
                      <Select 
                        value={invoice.customerName || ''} 
                        onChange={(e) => {
                          const newRows = [...invoiceRows];
                          newRows[idx].customerName = e.target.value;
                          setInvoiceRows(newRows);
                        }}
                        className="text-xs bg-slate-950 text-slate-100 w-full"
                      >
                        <option className="bg-slate-950 text-slate-100" value="">Select Customer ({allCustomerOptions.length} available)...</option>
                        {allCustomerOptions.map(c => (
                          <option className="bg-slate-950 text-slate-100" key={c.id || c.name} value={c.name}>
                            {c.code ? `[${c.code}] ` : ''}{c.name}{c.station && c.station !== station ? ` (${c.station})` : ''}
                          </option>
                        ))}
                        {/* Fallback to preserve custom name if already selected but missing from options */}
                        {invoice.customerName && !allCustomerOptions.some(c => c.name.toLowerCase() === invoice.customerName?.toLowerCase()) && (
                          <option className="bg-slate-950 text-slate-100" value={invoice.customerName}>
                            {invoice.customerName}
                          </option>
                        )}
                      </Select>
                    </div>

                    {/* Entry Type / Mode Dropdown */}
                    <div className="w-full sm:w-56">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Invoice / Debt Type</label>
                      <Select 
                        value={currentType} 
                        onChange={(e) => {
                          const val = e.target.value as 'debt' | 'paid' | 'paid_full' | 'partial';
                          const newRows = [...invoiceRows];
                          newRows[idx].type = val;
                          if (val === 'debt') {
                            newRows[idx].paidAmount = 0;
                          } else if (val === 'paid') {
                            // Pure Paid Invoice / Debt settlement
                            newRows[idx].totalAmount = 0;
                          } else if (val === 'paid_full') {
                            newRows[idx].paidAmount = newRows[idx].totalAmount || 0;
                          }
                          setInvoiceRows(newRows);
                        }}
                        className="text-xs bg-slate-950 font-bold text-amber-300 w-full"
                      >
                        <option className="bg-slate-950 text-slate-100" value="debt">📄 Invoice (Debt / Credit)</option>
                        <option className="bg-slate-950 text-slate-100" value="paid">💵 Paid Invoice (Debt Payment)</option>
                        <option className="bg-slate-950 text-slate-100" value="paid_full">✅ Invoice Paid in Full</option>
                        <option className="bg-slate-950 text-slate-100" value="partial">⏳ Invoice + Partial Deposit</option>
                      </Select>
                    </div>

                    {/* Invoice Total (KES) */}
                    <div className="w-full sm:w-44">
                      <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Invoice Total (KES)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400/80 pointer-events-none">KES</span>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={invoice.totalAmount === 0 ? '' : invoice.totalAmount} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newRows = [...invoiceRows];
                            newRows[idx].totalAmount = val;
                            if (newRows[idx].type === 'paid_full') {
                              newRows[idx].paidAmount = val;
                            }
                            setInvoiceRows(newRows);
                          }} 
                          disabled={currentType === 'paid'}
                          className={`text-sm font-mono font-bold text-slate-100 bg-slate-950 pl-12 pr-3 py-2 w-full border-amber-500/30 focus:border-amber-500 ${currentType === 'paid' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Paid / Deposit (KES) */}
                    <div className="w-full sm:w-44">
                      <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Paid / Deposit (KES)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400/80 pointer-events-none">KES</span>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={invoice.paidAmount === 0 ? '' : invoice.paidAmount} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newRows = [...invoiceRows];
                            newRows[idx].paidAmount = val;
                            setInvoiceRows(newRows);
                          }} 
                          disabled={currentType === 'debt'}
                          className={`text-sm font-mono font-bold text-slate-100 bg-slate-950 pl-12 pr-3 py-2 w-full border-emerald-500/30 focus:border-emerald-500 ${currentType === 'debt' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Delete button */}
                    <Button 
                      variant="danger" 
                      className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                      onClick={() => setInvoiceRows(invoiceRows.filter((_, i) => i !== idx))}
                      title="Delete Invoice Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Customer Status Mini-Preview Bar */}
                  {custStatus && (
                    <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-mono">
                            {custStatus.customerCode !== 'N/A' ? (custStatus.customerCode.split('-')[1] || 'C') : 'C'}
                          </div>
                          <span>{custStatus.customerName}</span>
                          {custStatus.customerCode !== 'N/A' && (
                            <span className="text-[10px] font-mono text-slate-400 font-normal">[{custStatus.customerCode}]</span>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${custStatus.statusColor}`}>
                          {custStatus.statusLabel}: {custStatus.netBalance < 0 ? `(Overpaid KES ${Math.abs(Math.round(custStatus.netBalance)).toLocaleString()})` : `KES ${Math.round(custStatus.netBalance).toLocaleString()}`}
                        </span>

                        {custStatus.creditLimit > 0 && (
                          <span className="hidden sm:inline text-[11px] text-slate-400">
                            Limit: <strong className="text-slate-200 font-mono">KES {Math.round(custStatus.creditLimit).toLocaleString()}</strong>
                            {custStatus.availableCredit !== null && (
                              <span className={` ml-1 ${custStatus.availableCredit <= 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                                ({Math.round(custStatus.availableCredit).toLocaleString()} avail)
                              </span>
                            )}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 hidden md:inline">
                          • {custStatus.invoiceCount} previous record{custStatus.invoiceCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewCustomerName(custStatus.customerName)}
                        className="px-2.5 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/30 hover:border-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ml-auto"
                        title="Click to view complete customer profile, status, credit balance & all past transactions"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Preview Full Status & Statement</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 6. END OF DAY CASH POSITION & LOSSES SECTION */}
      <Card className="glass-panel border-theme-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg text-blue-400">End of Day Cash Position & Reconciliation</CardTitle>
          </div>
          <span className="text-xs font-mono text-emerald-400/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            Real-time Cash Audit
          </span>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pb-6 border-b border-theme-border">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Total Sales (Pump+LPG+Other)</p>
              <p className="text-lg font-bold text-slate-100 mt-1 font-mono">KES {Math.round(totalSales).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Cost of Goods (COGS / Refills)</p>
              <p className="text-lg font-bold text-orange-400 mt-1 font-mono">KES {Math.round(totalCOGS).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Total Expenses</p>
              <p className="text-lg font-bold text-red-400 mt-1 font-mono">KES {Math.round(expensesAmount).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Uncollected Credit (Debt)</p>
              <p className="text-lg font-bold text-amber-400 mt-1 font-mono">KES {Math.round(uncollectedCreditSalesToday).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Debt Paid Collected</p>
              <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">KES {Math.round(pastDebtPaymentsCollectedToday).toLocaleString()}</p>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-5 bg-slate-950/80 p-4 rounded-xl border border-blue-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">All Money Received (Expected Net Cash)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-0.5 font-mono">
                  KES {Math.round(expectedTotalCash).toLocaleString()}
                </p>
              </div>
              <div className="text-xs text-theme-text-muted">
                Formula: Total Sales - COGS - Expenses - Uncollected Invoices + Debt Collected
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* M-Pesa Input */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Amount Available in M-Pesa
              </label>
              <Input 
                type="number" 
                placeholder="KES 0.00" 
                value={mPesa === 0 ? '' : mPesa} 
                onChange={(e) => setMPesa(parseFloat(e.target.value) || 0)} 
                className="bg-slate-950 font-mono font-bold"
              />
            </div>

            {/* Expected Cash on Hand */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Auto-Calculated Expected Cash on Hand
              </label>
              <Input 
                type="text" 
                disabled 
                value={`KES ${Math.round(expectedCashOnHand).toLocaleString()}`} 
                className="bg-slate-950 text-blue-300 font-bold font-mono" 
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Expected Net Cash minus M-Pesa</span>
            </div>

            {/* Gross Physical Cash Count */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Cash at Hand (Physical Count)
              </label>
              <Input 
                type="number" 
                placeholder="KES 0.00" 
                value={manualCashOnHand === 0 ? '' : manualCashOnHand} 
                onChange={(e) => setManualCashOnHand(parseFloat(e.target.value) || 0)} 
                className="bg-slate-950 font-mono font-bold text-slate-100"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Physical notes & coins in register</span>
            </div>

            {/* Operating / Fuel Losses Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  <span>Amount of Losses (KES)</span>
                </label>
                <span className="text-[10px] text-red-400/80 font-mono">Subtracted from Cash</span>
              </div>
              <Input 
                type="number" 
                placeholder="KES 0.00" 
                value={lossesAmount === 0 ? '' : lossesAmount} 
                onChange={(e) => setLossesAmount(parseFloat(e.target.value) || 0)} 
                className="bg-slate-950 font-mono font-bold text-red-300 border-red-500/30 focus:border-red-500"
              />
              <input
                type="text"
                placeholder="Losses explanation (e.g. calibration variance, cashier deficit, transit loss)"
                value={lossesNote}
                onChange={(e) => setLossesNote(e.target.value)}
                className="w-full mt-1.5 text-xs px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
              />
            </div>

            {/* Exact Cash at Hand (Physical Count - Losses) */}
            <div className="bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase text-emerald-400 block tracking-wider">
                  Exact Cash at Hand (Net)
                </span>
                <p className="text-2xl font-bold text-emerald-300 mt-1 font-mono">
                  KES {Math.round(exactCashAtHand).toLocaleString()}
                </p>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono flex items-center justify-between">
                <span>{Math.round(manualCashOnHand || 0).toLocaleString()} (Gross)</span>
                <span className="text-red-400">- {Math.round(losses).toLocaleString()} (Loss)</span>
                <span className="text-emerald-400 font-bold">= {Math.round(exactCashAtHand).toLocaleString()}</span>
              </div>
            </div>

            {/* Reconciliation Variance */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Reconciliation Variance
              </label>
              <div className={`p-3 rounded-xl font-bold text-base border font-mono flex items-center justify-between ${
                Math.round(variance) > 0 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' : 
                Math.round(variance) < 0 ? 'bg-red-950/40 text-red-400 border-red-500/40' : 
                'bg-slate-900 text-slate-300 border-slate-700'
              }`}>
                <div>
                  <span className="block text-lg">KES {Math.round(Math.abs(variance)).toLocaleString()}</span>
                  <span className="text-[10px] font-sans font-normal opacity-80">
                    (Exact Net Cash vs Expected)
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-md font-sans uppercase font-bold ${
                  Math.round(variance) > 0 ? 'bg-emerald-900/60 text-emerald-300' :
                  Math.round(variance) < 0 ? 'bg-red-900/60 text-red-300' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {Math.round(variance) > 0 && 'Excess (+)'}
                  {Math.round(variance) < 0 && 'Shortfall (-)'}
                  {Math.round(variance) === 0 && 'Balanced (0)'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Submit Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSaveAll} 
          className="px-10 py-4 text-base font-bold bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all transform active:scale-95"
        >
          <Save className="w-5 h-5 mr-2" /> Save & Sync Daily Entry
        </Button>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Quick Add Customer</h3>
                  <p className="text-xs text-theme-text-muted">Register customer for {station}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuickCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Customer / Debtor Name <span className="text-red-400">*</span>
                </label>
                <Input 
                  type="text" 
                  placeholder="e.g. Safari Express, John Mwangi, Loruk Transporters"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  autoFocus
                  required
                  className="bg-slate-950 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Customer Code
                  </label>
                  <Input 
                    type="text" 
                    placeholder="e.g. CUST-001"
                    value={newCustomerCode}
                    onChange={(e) => setNewCustomerCode(e.target.value)}
                    className="bg-slate-950 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Credit Limit (KES)
                  </label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={newCustomerCreditLimit}
                    onChange={(e) => setNewCustomerCreditLimit(e.target.value)}
                    className="bg-slate-950 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Opening Balance / Prior Debt (KES)
                </label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={newCustomerOpeningBalance}
                  onChange={(e) => setNewCustomerOpeningBalance(e.target.value)}
                  className="bg-slate-950 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 font-bold"
                >
                  <Plus className="w-4 h-4" /> Save & Use Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD EXPENSE PARAMETER / CATEGORY MODAL */}
      {isQuickExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">New Expense Parameter</h3>
                  <p className="text-xs text-theme-text-muted">Captured under Expense Page & available across all entries</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuickExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddExpenseSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Expense Name / Description <span className="text-red-400">*</span>
                </label>
                <Input 
                  type="text" 
                  placeholder="e.g. Station Water Bill, Generator Fuel, Casual Labour"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  autoFocus
                  required
                  className="bg-slate-950 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Expense Code <span className="text-slate-400 font-normal">(e.g. EXP-010)</span>
                  </label>
                  <Input 
                    type="text" 
                    placeholder="e.g. EXP-010"
                    value={newExpenseCode}
                    onChange={(e) => setNewExpenseCode(e.target.value.toUpperCase())}
                    required
                    className="bg-slate-950 text-blue-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Department / Category
                  </label>
                  <Select 
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="bg-slate-950 text-white w-full text-xs"
                  >
                    <option value="Operations & Fuel">Operations & Fuel</option>
                    <option value="Station Maintenance">Station Maintenance & Repairs</option>
                    <option value="Staff Welfare & Meals">Staff Welfare & Meals</option>
                    <option value="Salaries & Wages">Salaries & Casual Wages</option>
                    <option value="Ground Rent & Lease">Ground Rent & Lease</option>
                    <option value="Power & Utilities">Power & Utilities (KPLC/Water)</option>
                    <option value="Licensing & County">Licensing & Regulatory (EPRA/County)</option>
                    <option value="Transport & Logistics">Transport & Logistics</option>
                    <option value="Security Services">Security & Guards</option>
                    <option value="Communications & IT">Communications & Internet</option>
                    <option value="General & Admin">General & Administrative</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Default / Target (KES)
                  </label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={newExpenseDefaultAmount}
                    onChange={(e) => setNewExpenseDefaultAmount(e.target.value)}
                    className="bg-slate-950 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Frequency
                  </label>
                  <Select 
                    value={newExpenseFrequency}
                    onChange={(e) => setNewExpenseFrequency(e.target.value as ExpenseFrequency)}
                    className="bg-slate-950 text-white w-full text-xs"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="As Needed">As Needed</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Payment Method
                  </label>
                  <Select 
                    value={newExpensePaymentMethod}
                    onChange={(e) => setNewExpensePaymentMethod(e.target.value as ExpensePaymentMethod)}
                    className="bg-slate-950 text-white w-full text-xs"
                  >
                    <option value="Cash">Cash (Default)</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-theme-border/60 flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  id="newExpenseRecurring"
                  checked={newExpenseIsRecurring}
                  onChange={(e) => setNewExpenseIsRecurring(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-red-500 focus:ring-red-500 bg-slate-900"
                />
                <label htmlFor="newExpenseRecurring" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-semibold text-white block">Recurring Operational Cost</span>
                  <span className="text-[11px] text-theme-text-muted">Display as active cost parameter in Expense Banner page and master budget tracking.</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Notes / Reference <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <Input 
                  type="text" 
                  placeholder="e.g. Account number, payment cycle or vendor details"
                  value={newExpenseNotes}
                  onChange={(e) => setNewExpenseNotes(e.target.value)}
                  className="bg-slate-950 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setIsQuickExpenseModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 font-bold shadow-lg shadow-red-600/20"
                >
                  <Plus className="w-4 h-4" /> Save & Use Expense Parameter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER 360° FINANCIAL STATUS & LEDGER PREVIEW MODAL */}
      {previewCustomerName && (() => {
        const custData = getCustomerStatus(previewCustomerName);
        if (!custData) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-theme-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-theme-border bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-base shadow-inner">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">{custData.customerName}</h3>
                      {custData.customerCode !== 'N/A' && (
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-blue-300 border border-slate-700">
                          {custData.customerCode}
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${custData.statusColor}`}>
                        {custData.statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-theme-text-muted mt-0.5">
                      Station: <strong className="text-slate-300">{custData.station}</strong> • Full Financial Status & Transaction History
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
                    title="Print Customer Statement"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">Print Statement</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPreviewCustomerName(null)}
                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close Preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* 4-Grid Financial Status KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Outstanding Balance / Net Debt */}
                  <div className={`p-4 rounded-xl border ${
                    custData.netBalance > 0 ? 'bg-amber-950/20 border-amber-500/30' :
                    custData.netBalance < 0 ? 'bg-blue-950/20 border-blue-500/30' :
                    'bg-emerald-950/20 border-emerald-500/30'
                  }`}>
                    <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
                      Current Net Debt / Balance
                    </p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      custData.netBalance > 0 ? 'text-amber-400' :
                      custData.netBalance < 0 ? 'text-blue-400' :
                      'text-emerald-400'
                    }`}>
                      KES {Math.abs(Math.round(custData.netBalance)).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {custData.netBalance > 0 ? '⚠️ Total Outstanding Debt to be Paid' :
                       custData.netBalance < 0 ? '💰 Account in Credit (Overpaid)' :
                       '✅ Account Fully Settled (Zero Debt)'}
                    </span>
                  </div>

                  {/* Credit Limit & Available Credit */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                    <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
                      Assigned Credit Limit
                    </p>
                    <p className="text-2xl font-bold font-mono mt-1 text-slate-100">
                      {custData.creditLimit > 0 ? `KES ${Math.round(custData.creditLimit).toLocaleString()}` : 'No Limit Set'}
                    </p>
                    {custData.creditLimit > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Available:</span>
                          <span className={custData.availableCredit !== null && custData.availableCredit <= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            KES {Math.round(custData.availableCredit || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              custData.isOverLimit ? 'bg-red-500' :
                              custData.utilizationPct > 80 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${custData.utilizationPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lifetime Invoiced */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                    <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
                      Lifetime Invoiced Total
                    </p>
                    <p className="text-2xl font-bold font-mono mt-1 text-blue-400">
                      KES {Math.round(custData.totalInvoiced).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Across {custData.invoiceCount} recorded transaction{custData.invoiceCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Lifetime Paid / Collected */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                    <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
                      Total Debt Paid to Date
                    </p>
                    <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                      KES {Math.round(custData.totalPaid).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Opening Balance: KES {custData.openingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Details Info Bar */}
                {custData.customerObj && (
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Station Branch:</span>
                      <strong className="text-slate-200">{custData.customerObj.station || 'All Stations'}</strong>
                    </div>
                    {custData.customerObj.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Phone:</span>
                        <strong className="text-slate-200 font-mono">{custData.customerObj.phone}</strong>
                      </div>
                    )}
                    {custData.customerObj.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Email:</span>
                        <strong className="text-slate-200">{custData.customerObj.email}</strong>
                      </div>
                    )}
                    {custData.customerObj.customerType && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Type:</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold text-[11px]">
                          {custData.customerObj.customerType}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Ledger & Statement Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Previous Invoices & Payments Ledger</span>
                    </h4>
                    <span className="text-xs text-theme-text-muted">
                      {custData.recentInvoices.length} historical record{custData.recentInvoices.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {custData.recentInvoices.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                      <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-semibold">No previous invoices or payments recorded</p>
                      <p className="text-xs text-slate-500 mt-1">Transactions recorded today will appear here and in the Invoices ledger.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-theme-border/70">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-theme-text-muted font-bold uppercase tracking-wider border-b border-theme-border text-[10px]">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Station</th>
                            <th className="p-3">Invoice # / Ref</th>
                            <th className="p-3 text-right">Invoiced (KES)</th>
                            <th className="p-3 text-right">Paid (KES)</th>
                            <th className="p-3 text-right">Invoice Debt (KES)</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {custData.recentInvoices.map((inv, iIdx) => {
                            const invTotal = Number(inv.totalAmount) || 0;
                            const invPaid = Number(inv.paidAmount) || 0;
                            const remainingDebt = Math.max(0, invTotal - invPaid);
                            const isPaidInFull = invTotal > 0 && invPaid >= invTotal;
                            const isPurePayment = invTotal === 0 && invPaid > 0;
                            const isPartial = invTotal > 0 && invPaid > 0 && invPaid < invTotal;
                            const invoiceDisplayNumber = `INV-${String(inv.id || iIdx + 1).slice(0, 8).toUpperCase()}`;

                            return (
                              <tr key={inv.id || iIdx} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 font-sans font-medium text-slate-300 whitespace-nowrap">
                                  {inv.date ? formatFriendlyDate(inv.date) : 'N/A'}
                                </td>
                                <td className="p-3 font-sans text-slate-400 whitespace-nowrap">
                                  {inv.station || 'Main'}
                                </td>
                                <td className="p-3 text-blue-400 font-bold">
                                  {invoiceDisplayNumber}
                                </td>
                                <td className="p-3 text-right text-slate-200 font-bold">
                                  {invTotal > 0 ? `KES ${invTotal.toLocaleString()}` : '-'}
                                </td>
                                <td className="p-3 text-right text-emerald-400 font-bold">
                                  {invPaid > 0 ? `KES ${invPaid.toLocaleString()}` : '-'}
                                </td>
                                <td className={`p-3 text-right font-bold ${remainingDebt > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {remainingDebt > 0 ? `KES ${remainingDebt.toLocaleString()}` : 'KES 0'}
                                </td>
                                <td className="p-3 text-center font-sans">
                                  {isPaidInFull ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                                      Paid in Full
                                    </span>
                                  ) : isPurePayment ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                                      Debt Paid
                                    </span>
                                  ) : isPartial ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                      Partial Deposit
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800/60">
                                      Unpaid Debt
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-theme-border bg-slate-950/80 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Total Customer Ledger Balance: <strong className={custData.netBalance > 0 ? 'text-amber-400 font-mono text-sm' : 'text-emerald-400 font-mono text-sm'}>KES {Math.round(custData.netBalance).toLocaleString()}</strong>
                </div>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setPreviewCustomerName(null)}
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
