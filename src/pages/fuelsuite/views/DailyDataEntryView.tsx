import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  useFuel, 
  PumpReading, 
  LPGTransaction, 
  Expense, 
  Invoice, 
  CashPosition, 
  Product, 
  Station, 
  InventoryItem 
} from '../context';
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
  Check
} from 'lucide-react';
import { sortProductsList } from './ProductsView';

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
    customers,
    stations,
    expenseTemplates
  } = useFuel();

  const availableStations = useMemo(() => {
    return stations.length > 0 ? stations : [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
  }, [stations]);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [station, setStation] = useState<Station>(
    activeStation === 'Combined Total' ? (availableStations[0]?.name || 'Loruk Ndalu Filling Station') : activeStation
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize station if activeStation changes externally
  useEffect(() => {
    if (activeStation !== 'Combined Total' && activeStation) {
      setStation(activeStation);
    }
  }, [activeStation]);

  // Master product groupings
  const sortedCatalog = useMemo(() => sortProductsList(products || []), [products]);

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
  const [invoiceRows, setInvoiceRows] = useState<Partial<Invoice>[]>([]);
  // Cash Position state
  const [mPesa, setMPesa] = useState<number>(0);
  const [manualCashOnHand, setManualCashOnHand] = useState<number>(0);

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
      setInvoiceRows(existingInvoices.map(i => ({ id: i.id, customerName: i.customerName, totalAmount: i.totalAmount, paidAmount: i.paidAmount })));
    } else {
      setInvoiceRows([{ customerName: '', totalAmount: 0, paidAmount: 0 }]);
    }

    // 6. CASH POSITION
    const existingCashPos = cashPositions.find(cp => (!cp.station || cp.station === station) && cp.date === date);
    if (existingCashPos) {
      setMPesa(existingCashPos.mPesa || 0);
      setManualCashOnHand(existingCashPos.cashOnHand || 0);
    } else {
      setMPesa(0);
      setManualCashOnHand(0);
    }

    lastLoadedContext.current = contextKey;
  }, [date, station, fuelProducts, lpgProducts, accessoryProducts]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Computations
  const pumpSalesAmount = useMemo(() => {
    return pumps.reduce((sum, p) => {
      const sAmount = (Number(p.salesStop) || 0) - (Number(p.salesStart) || 0);
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

  const expectedTotalCash = totalSales - totalCOGS - expensesAmount - invoicesTotal + paidInvoicesAmount;
  const expectedCashOnHand = expectedTotalCash - (mPesa || 0);
  const variance = (manualCashOnHand || 0) - expectedCashOnHand;

  // MASTER SAVE FUNCTION - SYNC TO ALL 6 MODULES (Pump Readings, LPG, Inventory, Expenses, Invoices, Cash Position)
  const handleSaveAll = () => {
    let syncedModules: string[] = [];

    // 1. LINK & SAVE PUMP READINGS (Also automatically feeds Inventory Fuel Out)
    const validPumpReadings: PumpReading[] = pumps
      .filter(p => (p.litresStop || 0) > 0 || (p.salesStop || 0) > 0 || (p.litresStart || 0) > 0)
      .map(p => ({
        id: p.id || generateId(),
        date,
        station,
        product: p.product!,
        salesStart: Number(p.salesStart) || 0,
        salesStop: Number(p.salesStop) || 0,
        litresStart: Number(p.litresStart) || 0,
        litresStop: Number(p.litresStop) || 0,
        ratePerLitre: Number(p.ratePerLitre) || 0
      }));

    if (validPumpReadings.length > 0) {
      setPumpReadings(prev => {
        // Replace existing readings for this date & station & product, keep others
        const existingIds = new Set(validPumpReadings.map(v => `${v.date}_${v.station}_${v.product}`));
        const filtered = prev.filter(r => !existingIds.has(`${r.date}_${r.station}_${r.product}`));
        return [...filtered, ...validPumpReadings];
      });
      syncedModules.push(`Pump Readings (${validPumpReadings.length} fuel pumps)`);
    }

    // 2. LINK & SAVE LPG TRANSACTIONS (Feeds LPG page & Inventory stock/cylinders)
    const newLpgSales: LPGTransaction[] = lpgSales
      .filter(s => (Number(s.quantity) > 0 || Number(s.amount) > 0 || Number(s.completeQuantity) > 0) && s.item)
      .map(s => ({
        id: s.id || generateId(),
        date,
        station,
        type: 'sale',
        item: s.item!,
        quantity: Number(s.quantity) || 0,
        completeQuantity: Number(s.completeQuantity) || 0,
        amount: Number(s.amount) || 0
      }));

    const newLpgPurchases: LPGTransaction[] = lpgPurchases
      .filter(p => (Number(p.quantity) > 0 || Number(p.amount) > 0) && p.item)
      .map(p => ({
        id: p.id || generateId(),
        date,
        station,
        type: 'purchase',
        item: p.item!,
        quantity: Number(p.quantity) || 0,
        rate: Number(p.rate) || 0,
        amount: Number(p.amount) || 0
      }));

    const allNewLpg = [...newLpgSales, ...newLpgPurchases];
    setLpgTransactions(prev => {
      // Remove previous daily entry items for this date and station
      const filtered = prev.filter(l => !(l.date === date && l.station === station));
      return [...filtered, ...allNewLpg];
    });
    if (allNewLpg.length > 0) {
      syncedModules.push(`LPG Transactions (${newLpgSales.length} sales, ${newLpgPurchases.length} purchases)`);
    }

    // 3. LINK & SAVE ACCESSORIES / EQUIPMENT INVENTORY (Feeds Inventory Stock In / Out)
    const newEqSales: InventoryItem[] = equipmentSales
      .filter(s => (Number(s.quantity) > 0 || Number(s.amount) > 0) && s.item)
      .map(s => ({
        id: s.id || generateId(),
        date,
        station,
        type: 'out',
        item: s.item!,
        quantity: Number(s.quantity) || 0,
        amount: Number(s.amount) || 0
      }));

    const newEqPurchases: InventoryItem[] = equipmentPurchases
      .filter(p => (Number(p.quantity) > 0 || Number(p.amount) > 0) && p.item)
      .map(p => ({
        id: p.id || generateId(),
        date,
        station,
        type: 'in',
        item: p.item!,
        quantity: Number(p.quantity) || 0,
        rate: Number(p.rate) || 0,
        amount: Number(p.amount) || 0
      }));

    const allNewInventory = [...newEqSales, ...newEqPurchases];
    setInventoryItems(prev => {
      // Remove previous equipment daily entries for this date & station
      const filtered = prev.filter(item => 
        !(item.date === date && item.station === station && 
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
      .map(e => ({
        id: e.id || generateId(),
        date,
        station,
        expenseCode: e.expenseCode || 'EXP-MISC',
        category: (e.category || e.expenseCode || 'General Operations').trim(),
        amount: Number(e.amount) || 0,
        paymentMethod: e.paymentMethod || 'Cash',
        isRecurring: e.isRecurring ?? true,
        frequency: e.frequency || 'Monthly'
      }));

    setExpenses(prev => {
      const filtered = prev.filter(e => !(e.date === date && e.station === station));
      return [...filtered, ...newExpenses];
    });
    if (newExpenses.length > 0) {
      syncedModules.push(`Expenses (${newExpenses.length} items totaling KES ${expensesAmount.toLocaleString()})`);
    }

    // 5. LINK & SAVE INVOICES (Feeds Invoices page & customer balance)
    const newInvoices: Invoice[] = invoiceRows
      .filter(i => (i.customerName || '').trim().length > 0 && Number(i.totalAmount) > 0)
      .map(i => ({
        id: i.id || generateId(),
        date,
        station,
        customerName: i.customerName!.trim(),
        totalAmount: Number(i.totalAmount) || 0,
        paidAmount: Number(i.paidAmount) || 0
      }));

    setInvoices(prev => {
      const filtered = prev.filter(inv => !(inv.date === date && inv.station === station));
      return [...filtered, ...newInvoices];
    });
    if (newInvoices.length > 0) {
      syncedModules.push(`Invoices (${newInvoices.length} invoices totaling KES ${invoicesTotal.toLocaleString()})`);
    }

    // 6. LINK & SAVE CASH POSITION (Feeds Cash Position page)
    if (mPesa > 0 || manualCashOnHand > 0 || expectedTotalCash > 0) {
      const newCashPosition: CashPosition = {
        id: generateId(),
        date,
        station,
        mPesa: Number(mPesa) || 0,
        cashOnHand: Number(manualCashOnHand) || 0
      };

      setCashPositions(prev => {
        const filtered = prev.filter(cp => !(cp.date === date && (cp.station === station || !cp.station)));
        return [...filtered, newCashPosition];
      });
      syncedModules.push(`Cash Position (M-Pesa: KES ${mPesa.toLocaleString()}, Cash: KES ${manualCashOnHand.toLocaleString()})`);
    }

    const message = syncedModules.length > 0 
      ? `Data linked and synchronized across:\n• ${syncedModules.join('\n• ')}`
      : 'Daily Entry recorded successfully!';

    setSaveSuccessMsg(message);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 6000);
  };

  return (
    <div className="px-4 sm:px-8 py-6 pb-32 space-y-6 animate-in fade-in duration-500 max-w-[1500px] w-full mx-auto">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">Daily Data Entry</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Live Interlink Mode
            </span>
          </div>
          <p className="text-theme-text-muted mt-1 text-sm">
            Input all station data here. Everything links directly to Pump Readings, LPG, Inventory, Expenses, Invoices, and Cash Position.
          </p>
        </div>
        <Button 
          onClick={handleSaveAll} 
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-bold px-6 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all transform active:scale-95"
        >
          <Save className="w-4 h-4" /> Save & Sync All Data
        </Button>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-emerald-300">Daily Data Saved and Synchronized!</p>
            <pre className="text-xs text-emerald-200 mt-1 font-sans whitespace-pre-wrap">{saveSuccessMsg}</pre>
          </div>
        </div>
      )}

      {/* Date & Station Selection Control Panel */}
      <Card className="glass-panel border-theme-border shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
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
                        ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                        : 'bg-slate-900/60 border-theme-border/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Station Record
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800/60">
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
              <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider block mb-1.5">
                Entry Date
              </label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="bg-slate-900 border-theme-border text-slate-100"
              />
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
            </div>
          </div>

          {/* Station Data Isolation Notice Banner */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              <strong>Station Isolation Active:</strong> Currently editing & recording exclusively for <strong className="text-cyan-300 underline">{station}</strong> on <strong className="text-cyan-300">{date}</strong>. Other stations will not be overwritten or mixed.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 1. PUMP READINGS SECTION */}
      <Card className="glass-panel border-theme-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-lg text-cyan-400">Pump Readings</CardTitle>
          </div>
          <span className="text-xs font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            Auto-linked to Fuel Out & Inventory
          </span>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {pumps.map((pump, idx) => {
            const salesAmount = (pump.salesStop || 0) - (pump.salesStart || 0);
            const litresSold = (pump.litresStop || 0) - (pump.litresStart || 0);
            const calculatedSales = litresSold * (pump.ratePerLitre || 0);
            const variance = salesAmount - calculatedSales;

            return (
              <div key={idx} className="border border-theme-border/60 rounded-xl p-4 space-y-3 bg-slate-900/40">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    {pump.product}
                  </div>
                  {litresSold > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {litresSold.toFixed(2)} Litres Sold
                    </span>
                  )}
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
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Sales Stop</label>
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
                    <Input disabled value={Math.round(salesAmount).toLocaleString()} className="bg-slate-950 font-mono text-cyan-300 font-bold" />
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
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Litres Stop</label>
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
                    <Input disabled value={litresSold.toFixed(2)} className="bg-slate-950 font-mono text-cyan-300 font-bold" />
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
                    <Input disabled value={`KES ${Math.round(calculatedSales).toLocaleString()}`} className="bg-slate-950 text-cyan-300 font-semibold font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-theme-text-muted block mb-1">Variance (Sales Amount - Calculated)</label>
                    <Input 
                      disabled 
                      value={`${Math.round(variance) > 0 ? '+' : ''}${Math.round(variance).toLocaleString()}`} 
                      className={`bg-slate-950 font-semibold font-mono ${Math.round(variance) < 0 ? 'text-red-400' : Math.round(variance) > 0 ? 'text-cyan-400' : 'text-emerald-400'}`} 
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
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <div>
              <CardTitle className="text-lg text-red-400">Expenses & Recurring Costs</CardTitle>
              <p className="text-xs text-theme-text-muted mt-0.5">Recurring expenses default payment to Cash unless specified otherwise.</p>
            </div>
          </div>
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
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          {expenseRows.map((expense, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-theme-border/60 bg-slate-900/50 space-y-2 hover:border-theme-border transition-colors">
              <div className="flex gap-3 items-end flex-wrap xl:flex-nowrap">
                {/* Expense Code Parameter */}
                <div className="w-full sm:w-56 xl:w-64">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expense Code Parameter</label>
                  <Select 
                    value={expense.expenseCode || expenseTemplates[0]?.code || 'EXP-GEN'} 
                    onChange={(e) => {
                      const code = e.target.value;
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
                    className="text-xs bg-slate-950 font-mono font-bold text-cyan-300 w-full"
                  >
                    {expenseTemplates.map(t => (
                      <option className="bg-slate-950 text-slate-100" key={t.id} value={t.code}>
                        [{t.code}] {t.name}
                      </option>
                    ))}
                    <option className="bg-slate-950 text-slate-100" value="CUSTOM">Custom Code / Expense</option>
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

      {/* 5. INVOICES */}
      <div className="grid grid-cols-1 gap-6">
        {/* INVOICES */}
        <Card className="glass-panel border-theme-border">
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-lg text-amber-400">Invoices & Debts</CardTitle>
            </div>
            <Button 
              className="py-1 px-2.5 text-xs" 
              variant="secondary" 
              onClick={() => setInvoiceRows([...invoiceRows, { customerName: '', totalAmount: 0, paidAmount: 0 }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {invoiceRows.map((invoice, idx) => (
              <div key={idx} className="flex gap-3 items-end flex-wrap sm:flex-nowrap p-2.5 rounded-lg bg-slate-900/40 border border-theme-border/40">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer / Debtor</label>
                  <Select 
                    value={invoice.customerName || ''} 
                    onChange={(e) => {
                      const newRows = [...invoiceRows];
                      newRows[idx].customerName = e.target.value;
                      setInvoiceRows(newRows);
                    }}
                  >
                    <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="">Select Customer...</option>
                    {customers
                      .filter(c => !c.station || c.station === station)
                      .map(c => (
                        <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={c.id} value={c.name}>
                          {c.code ? `[${c.code}] ` : ''}{c.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="w-32 sm:w-44">
                  <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Invoice Total (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Total" 
                    value={invoice.totalAmount === 0 ? '' : invoice.totalAmount} 
                    onChange={(e) => {
                      const newRows = [...invoiceRows];
                      newRows[idx].totalAmount = parseFloat(e.target.value) || 0;
                      setInvoiceRows(newRows);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <div className="w-32 sm:w-44">
                  <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Paid / Deposit (KES)</label>
                  <Input 
                    type="number" 
                    placeholder="Paid" 
                    value={invoice.paidAmount === 0 ? '' : invoice.paidAmount} 
                    onChange={(e) => {
                      const newRows = [...invoiceRows];
                      newRows[idx].paidAmount = parseFloat(e.target.value) || 0;
                      setInvoiceRows(newRows);
                    }} 
                    className="font-mono font-bold text-slate-100"
                  />
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 mb-0.5" 
                  onClick={() => setInvoiceRows(invoiceRows.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 6. END OF DAY CASH POSITION SECTION */}
      <Card className="glass-panel border-theme-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-lg text-cyan-400">End of Day Cash Position</CardTitle>
          </div>
          <span className="text-xs font-mono text-emerald-400/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            Real-time Reconciliation
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
              <p className="text-xs text-theme-text-muted">Invoices Issued</p>
              <p className="text-lg font-bold text-amber-400 mt-1 font-mono">KES {Math.round(invoicesTotal).toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-theme-text-muted">Debt Paid Amount</p>
              <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">KES {Math.round(paidInvoicesAmount).toLocaleString()}</p>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-5 bg-slate-950/80 p-4 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">All Money Received (Expected Net Cash)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-0.5 font-mono">
                  KES {Math.round(expectedTotalCash).toLocaleString()}
                </p>
              </div>
              <div className="text-xs text-theme-text-muted">
                Formula: (Total Sales - COGS - Expenses - Uncollected Invoices + Paid Debts)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Amount Available in M-Pesa
              </label>
              <Input 
                type="number" 
                placeholder="KES" 
                value={mPesa === 0 ? '' : mPesa} 
                onChange={(e) => setMPesa(parseFloat(e.target.value) || 0)} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Auto-Calculated Expected Cash on Hand
              </label>
              <Input 
                type="text" 
                disabled 
                value={`KES ${Math.round(expectedCashOnHand).toLocaleString()}`} 
                className="bg-slate-950 text-cyan-300 font-bold font-mono" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Cash at Hand (Physical Count)
              </label>
              <Input 
                type="number" 
                placeholder="KES" 
                value={manualCashOnHand === 0 ? '' : manualCashOnHand} 
                onChange={(e) => setManualCashOnHand(parseFloat(e.target.value) || 0)} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-theme-text-muted block mb-1.5">
                Reconciliation Variance
              </label>
              <div className={`p-2.5 rounded-lg font-bold text-base border font-mono flex items-center justify-between ${
                Math.round(variance) > 0 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' : 
                Math.round(variance) < 0 ? 'bg-red-950/40 text-red-400 border-red-500/40' : 
                'bg-slate-900 text-slate-300 border-slate-700'
              }`}>
                <span>KES {Math.round(Math.abs(variance)).toLocaleString()}</span>
                <span className="text-xs px-2 py-0.5 rounded font-sans uppercase">
                  {Math.round(variance) > 0 && 'Excess'}
                  {Math.round(variance) < 0 && 'Shortfall / Less'}
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
          className="px-10 py-4 text-base font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all transform active:scale-95"
        >
          <Save className="w-5 h-5 mr-2" /> Save & Sync Daily Entry
        </Button>
      </div>
    </div>
  );
}
