import React, { useState, useMemo, useEffect } from 'react';
import { BulkEntry } from '../components/BulkEntry';
import { useAuth } from '../lib/auth';
import { 
  useDailyPumpReadings, useLpgSales, useLpgPurchases, useBurnerSales, useBurnerPurchases,
  useGrillSales, useGrillPurchases, useDailyExpenses, useExpenseCategories, useCashPositions, 
  useDailyInvoices, useFuelRates, addFuelRate, addDailyPumpReading, addLpgSale, addLpgPurchase, 
  addBurnerSale, addBurnerPurchase, addGrillSale, addGrillPurchase, addDailyExpense, 
  addExpenseCategory, addCashPosition, addDailyInvoice, updateDailyInvoice, getPreviousStopReading,
  deleteDailyPumpReading, deleteLPGSale, deleteLPGPurchase, deleteBurnerSale, deleteBurnerPurchase,
  deleteGrillSale, deleteGrillPurchase, deleteDailyExpense, deleteCashPosition, deleteDailyInvoice,
  useOpeningStocks, saveOpeningStock, useStationCustomers, addStationCustomer, updateStationCustomer, deleteStationCustomer,
  addInvoicePayment, useInvoicePayments
} from '../lib/operationsDb';
import { isQuotaExceeded } from '../lib/localDbFallback';
import { formatCurrency, formatLitres } from '../lib/utils';
import { 
  Plus, Calendar, PlusCircle, Trash2, Fuel, RefreshCw, AlertTriangle, 
  CheckCircle, TrendingUp, DollarSign, ArrowDownLeft, Sliders, ChevronDown, 
  FileText, ShoppingBag, Eye, Percent, Edit2, ShieldAlert, FileDown, Users, Upload
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OperationsProps {
  selectedStation: 'Ndalu' | 'Junction' | 'Combined';
  setSelectedStation: (station: 'Ndalu' | 'Junction' | 'Combined') => void;
}

export default function Operations({ selectedStation, setSelectedStation }: OperationsProps) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin' || user?.email?.includes('admin');

  // Active tab inside operations page
  const [activeTab, setActiveTab] = useState<'pumps' | 'inventory' | 'expenses' | 'cash' | 'invoices' | 'reports' | 'pl' | 'customers' | 'bulk-entry'>('pumps');

  // Operational state observers
  const { readings, loading: pbLoad } = useDailyPumpReadings();
  const { rates, loading: ratesLoad } = useFuelRates();
  const { sales: lpgSales, loading: lpgSLoad } = useLpgSales();
  const { purchases: lpgPurchases, loading: lpgPLoad } = useLpgPurchases();
  const { sales: burnerSales, loading: bSLoad } = useBurnerSales();
  const { purchases: burnerPurchases, loading: bPLoad } = useBurnerPurchases();
  const { sales: grillSales, loading: gSLoad } = useGrillSales();
  const { purchases: grillPurchases, loading: gPLoad } = useGrillPurchases();
  const { expenses, loading: expLoad } = useDailyExpenses();
  const { categories, loading: catLoad } = useExpenseCategories();
  const { positions, loading: posLoad } = useCashPositions();
  const { invoices, loading: invLoad } = useDailyInvoices();
  const { customers: stationCustomers, loading: custLoad } = useStationCustomers();
  const { payments: invoicePayments, loading: paymentsLoad } = useInvoicePayments();
  const { openingStocks, loading: stocksLoad } = useOpeningStocks();

  // MODULE: STATION CUSTOMER FORM STATES
  const [scName, setScName] = useState('');
  const [scCategory, setScCategory] = useState<'Credit Account' | 'Cash Customer' | 'Contractor'>('Cash Customer');
  const [scOpeningBalance, setScOpeningBalance] = useState('');
  const [scFormError, setScFormError] = useState('');
  const [isScSubmitting, setIsScSubmitting] = useState(false);

  // Dialog / form models
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [station, setStation] = useState<'Ndalu' | 'Junction'>(selectedStation === 'Combined' ? 'Ndalu' : selectedStation);

  // Sync station form selection with top-level station switcher if it's specific
  useEffect(() => {
    if (selectedStation !== 'Combined') {
      setStation(selectedStation);
    }
  }, [selectedStation]);

  // MODULE 1: PUMPS FORM STATES
  const [pumpProduct, setPumpProduct] = useState<'Super' | 'Diesel' | 'Petrol' | 'Kerosene' | 'Engine oil'>('Super');
  const [litresStart, setLitresStart] = useState<string>('');
  
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, title: string, message: string, action: () => Promise<void>}>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {} 
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [litresStop, setLitresStop] = useState<string>('');
  const [ratePerLitre, setRatePerLitre] = useState<string>('');
  const [manualRevenue, setManualRevenue] = useState<string>('');
  const [rateSetupProduct, setRateSetupProduct] = useState<'Super' | 'Diesel' | 'Petrol' | 'Kerosene' | 'Engine oil'>('Super');
  const [newRateValue, setNewRateValue] = useState<string>('');
  const [rateError, setRateError] = useState<string>('');
  const [pumpError, setPumpError] = useState<string>('');

  // Auto-save/restore for pumps form
  useEffect(() => {
    const saved = localStorage.getItem('pumpsForm');
    if (saved) {
      try {
        const { product, stop, rate, rev } = JSON.parse(saved);
        if (product) setPumpProduct(product);
        if (stop) setLitresStop(stop);
        if (rate) setRatePerLitre(rate);
        if (rev) setManualRevenue(rev);
      } catch (e) {
        console.error('Failed to parse saved pumps form', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pumpsForm', JSON.stringify({
      product: pumpProduct,
      stop: litresStop,
      rate: ratePerLitre,
      rev: manualRevenue
    }));
  }, [pumpProduct, litresStop, ratePerLitre, manualRevenue]);

  // Auto-set tomorrow's start reading from yesterday's stop reading
  const handleFetchAutoReadings = async () => {
    const epoch = new Date(date).getTime();
    const prevStop = await getPreviousStopReading(station, pumpProduct, epoch);
    setLitresStart(prevStop > 0 ? prevStop.toString() : '0');

    // Also pre-fill the latest rate for this product and station
    const rateMatch = rates.find(r => r.station === station && r.product === pumpProduct);
    if (rateMatch) {
      setRatePerLitre(rateMatch.rate.toString());
    } else {
      setRatePerLitre('');
    }
  };

  useEffect(() => {
    handleFetchAutoReadings();
  }, [date, station, pumpProduct, rates]);

  // LPG FORM STATES (MODULE 2 & 3)
  const [lpg6kg, setLpg6kg] = useState<string>('');
  const [lpg13kg, setLpg13kg] = useState<string>('');
  const [lpgCompleteGas, setLpgCompleteGas] = useState<string>('');
  const [lpgEmpty6kg, setLpgEmpty6kg] = useState<string>('');
  const [lpgEmpty13kg, setLpgEmpty13kg] = useState<string>('');
  const [lpgAmt, setLpgAmt] = useState<string>('');
  const [lpgIsBought, setLpgIsBought] = useState<boolean>(false);
  const [lpgError, setLpgError] = useState<string>('');

  // BURNERS & GRILLS (MODULE 4 & 5)
  const [applianceType, setApplianceType] = useState<'burner' | 'grill'>('burner');
  const [applianceIsBought, setApplianceIsBought] = useState<boolean>(false);
  const [applianceQty, setApplianceQty] = useState<string>('');
  const [applianceCostAmt, setApplianceCostAmt] = useState<string>('');
  const [applianceError, setApplianceError] = useState<string>('');

  // EXPENSES (MODULE 6)
  const [expenseCategory, setExpenseCategory] = useState<string>('Lunch');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseAmt, setExpenseAmt] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [expenseError, setExpenseError] = useState<string>('');

  // OPENING STOCK MASTER MANAGEMENT (STATIONS ONLY)
  const [configStation, setConfigStation] = useState<'Ndalu' | 'Junction'>('Ndalu');
  const [configSuper, setConfigSuper] = useState<string>('');
  const [configDiesel, setConfigDiesel] = useState<string>('');
  const [configLpg6kg, setConfigLpg6kg] = useState<string>('');
  const [configLpg13kg, setConfigLpg13kg] = useState<string>('');
  const [configEmpty6kg, setConfigEmpty6kg] = useState<string>('');
  const [configEmpty13kg, setConfigEmpty13kg] = useState<string>('');
  const [configBurner, setConfigBurner] = useState<string>('');
  const [configGrill, setConfigGrill] = useState<string>('');
  const [configSaving, setConfigSaving] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string>('');
  const [configSuccess, setConfigSuccess] = useState<string>('');

  useEffect(() => {
    const activeStock = openingStocks.find(s => s.id === configStation || s.station === configStation);
    if (activeStock) {
      setConfigSuper(activeStock.super.toString());
      setConfigDiesel(activeStock.diesel.toString());
      setConfigLpg6kg((activeStock.lpg6kg || 0).toString());
      setConfigLpg13kg((activeStock.lpg13kg || 0).toString());
      setConfigEmpty6kg((activeStock.emptyCylinders6kg || 0).toString());
      setConfigEmpty13kg((activeStock.emptyCylinders13kg || 0).toString());
      setConfigBurner(activeStock.burner.toString());
      setConfigGrill(activeStock.grill.toString());
    } else {
      // Standard safe baselines for rapid ERP bootstrapping
      setConfigSuper('25000');
      setConfigDiesel('25000');
      setConfigLpg6kg('60');
      setConfigLpg13kg('65');
      setConfigEmpty6kg('50');
      setConfigEmpty13kg('50');
      setConfigBurner('50');
      setConfigGrill('40');
    }
    setConfigSuccess('');
    setConfigError('');
  }, [configStation, openingStocks]);

  const handleSaveOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigError('');
    setConfigSuccess('');
    try {
      await saveOpeningStock(configStation, {
        super: Number(configSuper) || 0,
        diesel: Number(configDiesel) || 0,
        lpg6kg: Number(configLpg6kg) || 0,
        lpg13kg: Number(configLpg13kg) || 0,
        emptyCylinders6kg: Number(configEmpty6kg) || 0,
        emptyCylinders13kg: Number(configEmpty13kg) || 0,
        burner: Number(configBurner) || 0,
        grill: Number(configGrill) || 0
      });
      setConfigSuccess(`Initial opening stock for Loruk - ${configStation} saved successfully to Firestore!`);
    } catch (err: any) {
      setConfigError(err.message || 'Failed to persist opening stock setup.');
    } finally {
      setConfigSaving(false);
    }
  };

  // CASH POSITIONS (MODULE 7)
  const [cashMpesa, setCashMpesa] = useState<string>('');
  const [cashOfHand, setCashOfHand] = useState<string>('');
  const [cashError, setCashError] = useState<string>('');

  // INVOICES (MODULE 8)
  const [invNumber, setInvNumber] = useState<string>('');
  const [invCustomer, setInvCustomer] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('');
  const [invPaid, setInvPaid] = useState<string>('');
  const [invOpeningBalance, setInvOpeningBalance] = useState<string>('');
  const [invError, setInvError] = useState<string>('');

  // Auto-generate invoice number
  const nextInvoiceNumber = useMemo(() => {
    if (invoices.length === 0) return 'INV-0001';
    
    const numericParts = invoices
      .map(inv => {
        const match = inv.invoiceNumber.match(/^INV-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    if (numericParts.length === 0) return 'INV-0001';
    const max = Math.max(...numericParts);
    return `INV-${(max + 1).toString().padStart(4, '0')}`;
  }, [invoices]);

  // Sync auto-generated number to state
  useEffect(() => {
    if (!invNumber || invNumber.startsWith('INV-')) {
      setInvNumber(nextInvoiceNumber);
    }
  }, [nextInvoiceNumber]);

  // Loading Indicator
  const globalLoading = pbLoad || ratesLoad || lpgSLoad || lpgPLoad || bSLoad || bPLoad || gSLoad || gPLoad || expLoad || catLoad || posLoad || invLoad || stocksLoad || paymentsLoad;

  // Inventory logic helper (Module 9)
  const getInventoryForStation = (targetStation: 'Ndalu' | 'Junction' | 'Combined') => {
    const filterByStat = (item: { station: string }) => targetStation === 'Combined' || item.station === targetStation;

    const filteredReadings = readings.filter(filterByStat);
    const filteredLpgSales = lpgSales.filter(filterByStat);
    const filteredLpgPurchases = lpgPurchases.filter(filterByStat);
    const filteredBurnerSales = burnerSales.filter(filterByStat);
    const filteredBurnerPurchases = burnerPurchases.filter(filterByStat);
    const filteredGrillSales = grillSales.filter(filterByStat);
    const filteredGrillPurchases = grillPurchases.filter(filterByStat);

    const ndaluStock = openingStocks.find(s => s.id === 'Ndalu' || s.station === 'Ndalu');
    const junctionStock = openingStocks.find(s => s.id === 'Junction' || s.station === 'Junction');

    const getS = (stock: any, key: string, fallback: number) => {
      if (!stock) return fallback;
      const val = stock[key];
      return typeof val === 'number' ? val : fallback;
    };

    const nSup = getS(ndaluStock, 'super', 25000);
    const nDie = getS(ndaluStock, 'diesel', 25000);
    const nL6 = getS(ndaluStock, 'lpg6kg', 60);
    const nL13 = getS(ndaluStock, 'lpg13kg', 65);
    const nE6 = getS(ndaluStock, 'emptyCylinders6kg', 50);
    const nE13 = getS(ndaluStock, 'emptyCylinders13kg', 50);
    const nBur = getS(ndaluStock, 'burner', 50);
    const nGri = getS(ndaluStock, 'grill', 40);

    const jSup = getS(junctionStock, 'super', 25000);
    const jDie = getS(junctionStock, 'diesel', 25000);
    const jL6 = getS(junctionStock, 'lpg6kg', 60);
    const jL13 = getS(junctionStock, 'lpg13kg', 65);
    const jE6 = getS(junctionStock, 'emptyCylinders6kg', 50);
    const jE13 = getS(junctionStock, 'emptyCylinders13kg', 50);
    const jBur = getS(junctionStock, 'burner', 50);
    const jGri = getS(junctionStock, 'grill', 40);

    let initSup, initDie, initL6, initL13, initE6, initE13, initBur, initGri;

    if (targetStation === 'Ndalu') {
      initSup = nSup; initDie = nDie; initL6 = nL6; initL13 = nL13; initE6 = nE6; initE13 = nE13; initBur = nBur; initGri = nGri;
    } else if (targetStation === 'Junction') {
      initSup = jSup; initDie = jDie; initL6 = jL6; initL13 = jL13; initE6 = jE6; initE13 = jE13; initBur = jBur; initGri = jGri;
    } else {
      initSup = nSup + jSup;
      initDie = nDie + jDie;
      initL6 = nL6 + jL6;
      initL13 = nL13 + jL13;
      initE6 = nE6 + jE6;
      initE13 = nE13 + jE13;
      initBur = nBur + jBur;
      initGri = nGri + jGri;
    }

    const dieselSold = filteredReadings.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.litresSold, 0);
    const superSold = filteredReadings.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.litresSold, 0);

    const sold6kg = filteredLpgSales.reduce((sum, s) => sum + (s.sold6kg || 0), 0);
    const sold13kg = filteredLpgSales.reduce((sum, s) => sum + (s.sold13kg || 0), 0);
    const bought6kg = filteredLpgPurchases.reduce((sum, p) => sum + (p.bought6kg || 0), 0);
    const bought13kg = filteredLpgPurchases.reduce((sum, p) => sum + (p.bought13kg || 0), 0);

    const completeGasSoldCount = filteredLpgSales.reduce((sum, s) => sum + (s.completeGasSold || 0), 0);
    
    const empty6kgSoldCount = filteredLpgSales.reduce((sum, s) => sum + (s.emptyCylindersSold6kg || 0), 0);
    const empty13kgSoldCount = filteredLpgSales.reduce((sum, s) => sum + (s.emptyCylindersSold13kg || 0), 0);
    const empty6kgBoughtCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.emptyCylindersBought6kg || 0), 0);
    const empty13kgBoughtCount = filteredLpgPurchases.reduce((sum, p) => sum + (p.emptyCylindersBought13kg || 0), 0);

    const burnersBoughtCount = filteredBurnerPurchases.reduce((sum, p) => sum + p.quantity, 0);
    const burnersSoldCount = filteredBurnerSales.reduce((sum, s) => sum + s.quantity, 0) + completeGasSoldCount;
    const grillsBoughtCount = filteredGrillPurchases.reduce((sum, p) => sum + p.quantity, 0);
    const grillsSoldCount = filteredGrillSales.reduce((sum, s) => sum + s.quantity, 0) + completeGasSoldCount;

    return {
      super: { opening: initSup, purchased: 0, sold: superSold, closing: initSup - superSold },
      diesel: { opening: initDie, purchased: 0, sold: dieselSold, closing: initDie - dieselSold },
      lpg6kg: { opening: initL6, purchased: bought6kg, sold: sold6kg + completeGasSoldCount, closing: initL6 + bought6kg - (sold6kg + completeGasSoldCount) },
      lpg13kg: { opening: initL13, purchased: bought13kg, sold: sold13kg, closing: initL13 + bought13kg - sold13kg },
      empty6kg: { 
        opening: initE6, 
        purchased: empty6kgBoughtCount + sold6kg, 
        sold: empty6kgSoldCount + bought6kg, 
        closing: initE6 + empty6kgBoughtCount + sold6kg - (empty6kgSoldCount + bought6kg)
      },
      empty13kg: {
        opening: initE13,
        purchased: empty13kgBoughtCount + sold13kg,
        sold: empty13kgSoldCount + bought13kg,
        closing: initE13 + empty13kgBoughtCount + sold13kg - (empty13kgSoldCount + bought13kg)
      },
      burner: { opening: initBur, purchased: burnersBoughtCount, sold: burnersSoldCount, closing: initBur + burnersBoughtCount - burnersSoldCount },
      grill: { opening: initGri, purchased: grillsBoughtCount, sold: grillsSoldCount, closing: initGri + grillsBoughtCount - grillsSoldCount }
    };
  };

  const inventorySummary = useMemo(() => getInventoryForStation(selectedStation), [readings, lpgSales, lpgPurchases, burnerSales, burnerPurchases, grillSales, grillPurchases, selectedStation, openingStocks]);
  const configInventorySummary = useMemo(() => getInventoryForStation(configStation as any), [readings, lpgSales, lpgPurchases, burnerSales, burnerPurchases, grillSales, grillPurchases, configStation, openingStocks]);


  // Profit & Loss Data (Module 11)
  const plCalculation = useMemo(() => {
    const filterByStat = (item: { date: number, station: string }) => selectedStation === 'Combined' || item.station === selectedStation;

    const filteredReadings = readings.filter(r => filterByStat(r));
    const filteredLpgSales = lpgSales.filter(s => filterByStat(s));
    const filteredLpgPurchases = lpgPurchases.filter(p => filterByStat(p));
    const filteredBurnerSales = burnerSales.filter(s => filterByStat(s));
    const filteredBurnerPurchases = burnerPurchases.filter(p => filterByStat(p));
    const filteredGrillSales = grillSales.filter(s => filterByStat(s));
    const filteredGrillPurchases = grillPurchases.filter(p => filterByStat(p));
    const filteredExpenses = expenses.filter(e => filterByStat(e));

    // Revenues
    const fuelRev = filteredReadings.reduce((sum, r) => sum + r.manualRevenue, 0);
    const lpgSalesRev = filteredLpgSales.reduce((sum, s) => sum + s.totalSalesAmount, 0);
    const burnerSalesRev = filteredBurnerSales.reduce((sum, s) => sum + s.salesAmount, 0);
    const grillSalesRev = filteredGrillSales.reduce((sum, s) => sum + s.salesAmount, 0);
    const totalRevenue = fuelRev + lpgSalesRev + burnerSalesRev + grillSalesRev;

    // Purchases (treated as COGS or direct cost per prompt guidelines)
    const lpgPurchaseCost = filteredLpgPurchases.reduce((sum, p) => sum + p.purchaseCost, 0);
    const burnerPurchaseCost = filteredBurnerPurchases.reduce((sum, p) => sum + p.purchaseCost, 0);
    const grillPurchaseCost = filteredGrillPurchases.reduce((sum, p) => sum + p.purchaseCost, 0);
    const totalCogs = lpgPurchaseCost + burnerPurchaseCost + grillPurchaseCost;

    // Expenses
    const directExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    // Combine purchases and expenses
    const totalExpenses = totalCogs + directExpenses;
    const netProfit = totalRevenue - totalExpenses;

    return {
      revenue: { fuel: fuelRev, lpg: lpgSalesRev, burner: burnerSalesRev, grill: grillSalesRev, total: totalRevenue },
      purchases: { lpg: lpgPurchaseCost, burner: burnerPurchaseCost, grill: grillPurchaseCost, total: totalCogs },
      expenses: { direct: directExpenses, total: totalExpenses },
      netProfit
    };
  }, [readings, lpgSales, lpgPurchases, burnerSales, burnerPurchases, grillSales, grillPurchases, expenses, selectedStation]);


  // Helper definitions for filtering list view data
  const filteredReadingsList = useMemo(() => readings.filter(r => selectedStation === 'Combined' || r.station === selectedStation), [readings, selectedStation]);
  const filteredExpensesList = useMemo(() => expenses.filter(e => selectedStation === 'Combined' || e.station === selectedStation), [expenses, selectedStation]);
  const filteredInvoicesList = useMemo(() => invoices.filter(i => selectedStation === 'Combined' || i.station === selectedStation), [invoices, selectedStation]);
  const filteredLpgSalesList = useMemo(() => lpgSales.filter(s => selectedStation === 'Combined' || s.station === selectedStation), [lpgSales, selectedStation]);
  const filteredLpgPurchasesList = useMemo(() => lpgPurchases.filter(p => selectedStation === 'Combined' || p.station === selectedStation), [lpgPurchases, selectedStation]);
  const filteredBurnerSalesList = useMemo(() => burnerSales.filter(s => selectedStation === 'Combined' || s.station === selectedStation), [burnerSales, selectedStation]);
  const filteredBurnerPurchasesList = useMemo(() => burnerPurchases.filter(p => selectedStation === 'Combined' || p.station === selectedStation), [burnerPurchases, selectedStation]);
  const filteredGrillSalesList = useMemo(() => grillSales.filter(s => selectedStation === 'Combined' || s.station === selectedStation), [grillSales, selectedStation]);
  const filteredGrillPurchasesList = useMemo(() => grillPurchases.filter(p => selectedStation === 'Combined' || p.station === selectedStation), [grillPurchases, selectedStation]);
  const filteredPositionsList = useMemo(() => positions.filter(p => selectedStation === 'Combined' || p.station === selectedStation), [positions, selectedStation]);

  const combinedInventoryLogs = useMemo(() => {
    return [
      ...filteredLpgSalesList.map(item => {
        const details = [];
        if (item.sold6kg) details.push(`${item.sold6kg}x6kg`);
        if (item.sold13kg) details.push(`${item.sold13kg}x13kg`);
        if (item.completeGasSold) details.push(`${item.completeGasSold}xComplete`);
        if (item.emptyCylindersSold6kg) details.push(`${item.emptyCylindersSold6kg}xEmpty6`);
        if (item.emptyCylindersSold13kg) details.push(`${item.emptyCylindersSold13kg}xEmpty13`);
        return { ...item, type: 'LPG', action: 'Sale', qty: details.join(', ') || '0', cost: item.totalSalesAmount, deleteFn: deleteLPGSale };
      }),
      ...filteredLpgPurchasesList.map(item => {
        const details = [];
        if (item.bought6kg) details.push(`${item.bought6kg}x6kg`);
        if (item.bought13kg) details.push(`${item.bought13kg}x13kg`);
        if (item.emptyCylindersBought6kg) details.push(`${item.emptyCylindersBought6kg}xEmpty6`);
        if (item.emptyCylindersBought13kg) details.push(`${item.emptyCylindersBought13kg}xEmpty13`);
        return { ...item, type: 'LPG', action: 'Purchase', qty: details.join(', ') || '0', cost: item.purchaseCost, deleteFn: deleteLPGPurchase };
      }),
      ...filteredBurnerSalesList.map(item => ({ ...item, type: 'Burner', action: 'Sale', qty: item.quantity.toString(), cost: item.salesAmount, deleteFn: deleteBurnerSale })),
      ...filteredBurnerPurchasesList.map(item => ({ ...item, type: 'Burner', action: 'Purchase', qty: item.quantity.toString(), cost: item.purchaseCost, deleteFn: deleteBurnerPurchase })),
      ...filteredGrillSalesList.map(item => ({ ...item, type: 'Grill', action: 'Sale', qty: item.quantity.toString(), cost: item.salesAmount, deleteFn: deleteGrillSale })),
      ...filteredGrillPurchasesList.map(item => ({ ...item, type: 'Grill', action: 'Purchase', qty: item.quantity.toString(), cost: item.purchaseCost, deleteFn: deleteGrillPurchase })),
    ].sort((a, b) => b.date - a.date);
  }, [filteredLpgSalesList, filteredLpgPurchasesList, filteredBurnerSalesList, filteredBurnerPurchasesList, filteredGrillSalesList, filteredGrillPurchasesList]);

  // MODULE 12: PDF REPORTS GENERATION
  const handleDownloadPDF = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    try {
      const doc = new jsPDF();
      const { setupPdfHeader, addPdfFooter } = await import('../lib/pdfTemplate');
      const timestamp = format(Date.now(), 'yyyy-MM-dd_HH-mm');
      const docHeader = `Loruk Energy - Advanced Operations (${reportType.toUpperCase()})`;
      const chosenStation = selectedStation === 'Combined' ? 'All Stations (Combined)' : `${selectedStation} Station`;

      let currentY = await setupPdfHeader({
        doc,
        title: 'OPERATIONS REPORT',
        leftBoxLines: [
          'Loruk Energy Limited',
          `T/A ${chosenStation}`,
          'P.O BOX 342',
          `Station: ${chosenStation}`
        ],
        rightBoxLines: [
          { label: 'Report Type :', value: reportType.toUpperCase() },
          { label: 'Generated :', value: format(new Date(), 'MMM d, yyyy') }
        ]
      });

      // Fuel Sales table 
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text('1. Daily Fuel Pump Readings & Diagnostics', 14, currentY);

      const sortedReadings = [...filteredReadingsList].sort((a, b) => a.date - b.date);
      const fuelRows = sortedReadings.map(r => [
        format(r.date, 'MM/dd/yyyy'),
        r.station,
        r.product,
        formatLitres(r.litresStart),
        formatLitres(r.litresStop),
        formatLitres(r.litresSold),
        formatCurrency(r.ratePerLitre),
        formatCurrency(r.calculatedRevenue),
        formatCurrency(r.manualRevenue),
        `${r.difference >= 0 ? '+' : ''}${formatCurrency(r.difference)}`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Date', 'Station', 'Product', 'Start L', 'Stop L', 'Litres Sold', 'Rate', 'Calc Rev', 'Collected', 'Difference']],
        body: fuelRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
        styles: { fontSize: 8 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 14;

      // Expenses Table
      doc.setFontSize(14);
      doc.text('2. Expenditure Summary', 14, currentY);

      const sortedExpenses = [...filteredExpensesList].sort((a, b) => a.date - b.date);
      const expenseRows = sortedExpenses.map(e => [
        format(e.date, 'MM/dd/yyyy'),
        e.station,
        e.category,
        e.description,
        formatCurrency(e.amount)
      ]);

      const totalExpSum = sortedExpenses.reduce((sum, e) => sum + e.amount, 0);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Date', 'Station', 'Category', 'Description', 'Amount']],
        body: [...expenseRows, ['', '', '', 'TOTAL EXPENSES', formatCurrency(totalExpSum)]],
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] } // red-500
      });

      currentY = (doc as any).lastAutoTable.finalY + 14;

      doc.addPage();
      currentY = 20;

      // Inventory Tracking Table
      doc.setFontSize(14);
      doc.text('3. Real-time Inventory Diagnostics', 14, currentY);

      const invRows = [
        ['Super Petrol (L)', formatLitres(inventorySummary.super.opening), '0', formatLitres(inventorySummary.super.sold), formatLitres(inventorySummary.super.closing)],
        ['Diesel Fuel (L)', formatLitres(inventorySummary.diesel.opening), '0', formatLitres(inventorySummary.diesel.sold), formatLitres(inventorySummary.diesel.closing)],
        ['LPG 6kg Gas', inventorySummary.lpg6kg.opening.toString(), inventorySummary.lpg6kg.purchased.toString(), inventorySummary.lpg6kg.sold.toString(), inventorySummary.lpg6kg.closing.toString()],
        ['LPG 13kg Gas', inventorySummary.lpg13kg.opening.toString(), inventorySummary.lpg13kg.purchased.toString(), inventorySummary.lpg13kg.sold.toString(), inventorySummary.lpg13kg.closing.toString()],
        ['Empty 6kg Cyl', inventorySummary.empty6kg.opening.toString(), inventorySummary.empty6kg.purchased.toString(), inventorySummary.empty6kg.sold.toString(), inventorySummary.empty6kg.closing.toString()],
        ['Empty 13kg Cyl', inventorySummary.empty13kg.opening.toString(), inventorySummary.empty13kg.purchased.toString(), inventorySummary.empty13kg.sold.toString(), inventorySummary.empty13kg.closing.toString()],
        ['Eco Burner Units', inventorySummary.burner.opening.toString(), inventorySummary.burner.purchased.toString(), inventorySummary.burner.sold.toString(), inventorySummary.burner.closing.toString()],
        ['Charcoal Grill Units', inventorySummary.grill.opening.toString(), inventorySummary.grill.purchased.toString(), inventorySummary.grill.sold.toString(), inventorySummary.grill.closing.toString()],
      ];

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Product Asset', 'Opening Balance', 'Purchased / Refilled', 'Sold / Consumed', 'Closing Balance']],
        body: invRows,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 14;

      // Invoices Table
      doc.setFontSize(14);
      doc.text('4. Account Receivables (Invoices)', 14, currentY);

      const sortedInvoices = [...filteredInvoicesList].sort((a, b) => a.invoiceDate - b.invoiceDate);
      const invoiceRows = sortedInvoices.map(i => [
        i.invoiceNumber,
        i.customerName,
        i.customerCategory || 'N/A',
        i.station,
        format(i.invoiceDate, 'MM/dd/yyyy'),
        formatCurrency(i.invoiceAmount),
        formatCurrency(i.paidAmount),
        formatCurrency(i.balance),
        i.status
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Reg #', 'Customer Name', 'Type', 'Station', 'Date', 'Amt Due', 'Amt Paid', 'Balance', 'Status']],
        body: invoiceRows,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 14;

      // Customer Category breakdown
      doc.setFontSize(14);
      doc.text('5. Ledger Breakdown by Customer Type', 14, currentY);

      const categoryInvStats = filteredInvoicesList.reduce((acc, inv) => {
        const cat = inv.customerCategory || 'Uncategorized';
        if (!acc[cat]) acc[cat] = { total: 0, paid: 0, balance: 0 };
        acc[cat].total += inv.invoiceAmount;
        acc[cat].paid += inv.paidAmount;
        acc[cat].balance += inv.balance;
        return acc;
      }, {} as Record<string, { total: number, paid: number, balance: number }>);

      const catRows = Object.entries(categoryInvStats).map(([cat, s]: [string, any]) => [
        cat,
        formatCurrency(s.total),
        formatCurrency(s.paid),
        formatCurrency(s.balance)
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Customer Category', 'Total Invoiced', 'Total Paid', 'Outstanding']],
        body: catRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
        styles: { fontSize: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 14;

      // P&L Overview
      doc.setFontSize(14);
      doc.text('6. Periodic Profit & Loss Summary', 14, currentY);

      const plRows = [
        ['Total Fuel Revenues Collected', formatCurrency(plCalculation.revenue.fuel)],
        ['Total LPG Sales Revenues', formatCurrency(plCalculation.revenue.lpg)],
        ['Total Burner Sales Revenues', formatCurrency(plCalculation.revenue.burner)],
        ['Total Grill Sales Revenues', formatCurrency(plCalculation.revenue.grill)],
        ['GROSS SALES REVENUE', formatCurrency(plCalculation.revenue.total)],
        ['LPG Cylinders Purchases Cost', `(${formatCurrency(plCalculation.purchases.lpg)})`],
        ['Burner Inventory Cost of Goods', `(${formatCurrency(plCalculation.purchases.burner)})`],
        ['Grills Inventory Cost of Goods', `(${formatCurrency(plCalculation.purchases.grill)})`],
        ['Direct Operational Overhead Expenses', `(${formatCurrency(plCalculation.expenses.direct)})`],
        ['TOTAL EXPENDITURE & COGS', `(${formatCurrency(plCalculation.expenses.total)})`],
        ['NET NET OPERATION PROFIT', formatCurrency(plCalculation.netProfit)]
      ];

      autoTable(doc, {
        startY: currentY + 4,
        body: plRows,
        theme: 'grid',
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 60, halign: 'right' }
        }
      });

      // @ts-ignore
      addPdfFooter(doc, doc.lastAutoTable.finalY + 10, chosenStation, 'P.O BOX 342');

      doc.save(`Loruk_Energy_${selectedStation}_${reportType}_Report_${timestamp}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate high fidelity PDF. Please check data lists.');
    }
  };

  // Submit operations handlers represent Module 13 database requirements
  const handleAddPumpReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setPumpError('');
    const sLit = parseFloat(litresStart);
    const eLit = parseFloat(litresStop);
    const rate = parseFloat(ratePerLitre);
    const collected = parseFloat(manualRevenue);

    if (isNaN(sLit) || isNaN(eLit) || isNaN(rate) || isNaN(collected)) {
      setPumpError('All reading cells require numeric entries.');
      return;
    }

    if (eLit < sLit) {
      setPumpError('Litres STOP reading must exceed or equal START reading.');
      return;
    }

    const litersSold = eLit - sLit;
    const calculatedRevenue = litersSold * rate;
    const difference = collected - calculatedRevenue;

    try {
      await addDailyPumpReading({
        date: new Date(date).getTime(),
        station,
        product: pumpProduct,
        litresStart: sLit,
        litresStop: eLit,
        ratePerLitre: rate,
        manualRevenue: collected,
        litresSold: litersSold,
        calculatedRevenue,
        difference
      });

      // Clear input fields (except start reading which gets auto-filled next turn)
      setLitresStop('');
      setManualRevenue('');
      localStorage.removeItem('pumpsForm');
      alert('Pump diagnostics logged successfully.');
    } catch (err: any) {
      setPumpError(err.message || 'Error occurred while saving reading.');
    }
  };

  const handleCreateFuelRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateError('');
    const newRate = parseFloat(newRateValue);
    if (isNaN(newRate) || newRate <= 0) {
      setRateError('Rate per litre must be a positive number.');
      return;
    }

    try {
      await addFuelRate({
        date: new Date(date).getTime(),
        station,
        product: rateSetupProduct,
        rate: newRate,
        updatedAt: Date.now()
      });
      setNewRateValue('');
      alert('Fuel selling rate adjusted.');
    } catch (err: any) {
      setRateError(err.message || 'Failed to update selling rate.');
    }
  };

  const handleAddLpgOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLpgError('');
    const refills6kg = parseInt(lpg6kg) || 0;
    const refills13kg = parseInt(lpg13kg) || 0;
    const completeCount = parseInt(lpgCompleteGas) || 0;
    const emptyCount6kg = parseInt(lpgEmpty6kg) || 0;
    const emptyCount13kg = parseInt(lpgEmpty13kg) || 0;
    const amount = parseFloat(lpgAmt);

    if (isNaN(amount) || amount <= 0) {
      setLpgError('Please enter a valid total cash value (KES).');
      return;
    }

    if (refills6kg < 0 || refills13kg < 0 || completeCount < 0 || emptyCount6kg < 0 || emptyCount13kg < 0) {
      setLpgError('Quantities must be non-negative.');
      return;
    }

    if (refills6kg === 0 && refills13kg === 0 && completeCount === 0 && emptyCount6kg === 0 && emptyCount13kg === 0) {
      setLpgError('Please enter a quantity for at least one cylinder/gas product.');
      return;
    }

    try {
      if (lpgIsBought) {
        await addLpgPurchase({
          date: new Date(date).getTime(),
          station,
          cylindersBought: refills6kg + refills13kg,
          bought6kg: refills6kg,
          bought13kg: refills13kg,
          emptyCylindersBought6kg: emptyCount6kg,
          emptyCylindersBought13kg: emptyCount13kg,
          purchaseCost: amount
        });
      } else {
        await addLpgSale({
          date: new Date(date).getTime(),
          station,
          cylindersSold: refills6kg + refills13kg,
          sold6kg: refills6kg,
          sold13kg: refills13kg,
          completeGasSold: completeCount,
          emptyCylindersSold6kg: emptyCount6kg,
          emptyCylindersSold13kg: emptyCount13kg,
          totalSalesAmount: amount
        });
      }
      setLpg6kg('');
      setLpg13kg('');
      setLpgCompleteGas('');
      setLpgEmpty6kg('');
      setLpgEmpty13kg('');
      setLpgAmt('');
      alert(lpgIsBought ? 'LPG Purchase transaction tracked.' : 'LPG Gas Cylinder Sale recorded.');
    } catch (err: any) {
      setLpgError(err.message || 'Operation failed.');
    }
  };

  const handleAddApplianceReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplianceError('');
    const q = parseInt(applianceQty);
    const amount = parseFloat(applianceCostAmt);

    if (isNaN(q) || isNaN(amount) || q <= 0 || amount <= 0) {
      setApplianceError('All fields require positive numeric credentials.');
      return;
    }

    try {
      if (applianceType === 'burner') {
        if (applianceIsBought) {
          await addBurnerPurchase({
            date: new Date(date).getTime(),
            station,
            quantity: q,
            purchaseCost: amount
          });
        } else {
          await addBurnerSale({
            date: new Date(date).getTime(),
            station,
            quantity: q,
            salesAmount: amount
          });
        }
      } else {
        if (applianceIsBought) {
          await addGrillPurchase({
            date: new Date(date).getTime(),
            station,
            quantity: q,
            purchaseCost: amount
          });
        } else {
          await addGrillSale({
            date: new Date(date).getTime(),
            station,
            quantity: q,
            salesAmount: amount
          });
        }
      }
      setApplianceQty('');
      setApplianceCostAmt('');
      alert(`${applianceType === 'burner' ? 'Burner' : 'Grill'} inventory transaction logged.`);
    } catch (err: any) {
      setApplianceError(err.message || 'Error updating product counts.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');
    const amt = parseFloat(expenseAmt);
    if (!expenseDesc.trim()) {
      setExpenseError('Please input a short descriptor.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setExpenseError('Expense amount must be a positive number.');
      return;
    }

    try {
      await addDailyExpense({
        date: new Date(date).getTime(),
        station,
        category: expenseCategory,
        description: expenseDesc.trim(),
        amount: amt
      });
      setExpenseDesc('');
      setExpenseAmt('');
      alert('Expense transaction authenticated.');
    } catch (err: any) {
      setExpenseError(err.message || 'Failed to submit expense entry.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addExpenseCategory(newCategoryName.trim());
      setNewCategoryName('');
      alert('Expanded custom expense categories.');
    } catch (err: any) {
      alert(err.message || 'Failed to build category.');
    }
  };

  const handleAddCashPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashError('');
    const mpesa = parseFloat(cashMpesa);
    const hand = parseFloat(cashOfHand);

    if (isNaN(mpesa) || isNaN(hand) || mpesa < 0 || hand < 0) {
      setCashError('Balance cards must possess numerical value parameters (0+).');
      return;
    }

    try {
      await addCashPosition({
        date: new Date(date).getTime(),
        station,
        mpesaBalance: mpesa,
        cashAtHand: hand
      });
      setCashMpesa('');
      setCashOfHand('');
      alert('Station ending cash verified.');
    } catch (err: any) {
      setCashError(err.message || 'Failed to verify daily balance.');
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError('');
    const reqAmount = parseFloat(invAmount);
    const payAmount = parseFloat(invPaid) || 0;
    const openingBalance = parseFloat(invOpeningBalance) || 0;

    if (!invNumber.trim() || !invCustomer.trim()) {
      setInvError('Invoice number and Customer names are mandatory headers.');
      return;
    }

    if (isNaN(reqAmount) || reqAmount <= 0 || payAmount < 0) {
      setInvError('Invoice dues and collected revenues must hold non-negative floats.');
      return;
    }

    if (payAmount > reqAmount) {
      setInvError('Paid amount cannot exceed the grand invoice amount.');
      return;
    }

    const bal = reqAmount - payAmount;
    const stat: 'PAID' | 'PARTIAL' | 'UNPAID' = payAmount === reqAmount ? 'PAID' : payAmount === 0 ? 'UNPAID' : 'PARTIAL';

    try {
      // 1. Check if customer exists in station_customers, if not create them
      const existingCustomer = stationCustomers.find(c => c.name.toLowerCase() === invCustomer.trim().toLowerCase() && c.station === station);
      
      let customerCat: 'Credit Account' | 'Cash Customer' | 'Contractor' = 'Cash Customer';
      if (existingCustomer) {
        customerCat = existingCustomer.category;
      }

      if (!existingCustomer) {
        // Create new station customer
        await addStationCustomer({
          name: invCustomer.trim(),
          station: station,
          category: customerCat,
          balance: openingBalance + bal,
          totalPurchases: reqAmount,
          status: 'active',
          openingBalance: openingBalance
        });
      } else {
        // Update existing station customer
        await updateStationCustomer(existingCustomer.id!, {
          balance: (existingCustomer.balance || 0) + bal,
          totalPurchases: (existingCustomer.totalPurchases || 0) + reqAmount
        });
      }

      // 2. Add the invoice record
      await addDailyInvoice({
        invoiceNumber: invNumber.trim().toUpperCase(),
        customerName: invCustomer.trim(),
        customerCategory: customerCat,
        station,
        invoiceDate: new Date(date).getTime(),
        invoiceAmount: reqAmount,
        paidAmount: payAmount,
        balance: bal,
        status: stat
      });

      setInvNumber(nextInvoiceNumber);
      setInvCustomer('');
      setInvAmount('');
      setInvPaid('');
      setInvOpeningBalance('');
      alert('Accounts receivable tracking record logged.');
    } catch (err: any) {
      setInvError(err.message || 'Invoice record submission aborted.');
    }
  };

  const handleAddStationCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setScFormError('');
    setIsScSubmitting(true);
    try {
      if (!scName.trim()) throw new Error('Customer name is required');
      
      const existing = stationCustomers.find(c => c.name.toLowerCase() === scName.trim().toLowerCase() && c.station === station);
      if (existing) throw new Error('A customer with this name already exists at this station.');

      const opening = parseFloat(scOpeningBalance) || 0;
      await addStationCustomer({
        name: scName.trim(),
        station: station,
        category: scCategory,
        balance: opening,
        totalPurchases: 0,
        status: 'active',
        openingBalance: opening
      });

      setScName('');
      setScCategory('Cash Customer');
      setScOpeningBalance('');
      alert(`Customer ${scName} added to ${station} list.`);
    } catch (err: any) {
      setScFormError(err.message);
    } finally {
      setIsScSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Upper Management bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-blue-900/10 border border-gray-200 dark:border-blue-900/40 p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-transparent border border-gray-200 dark:border-blue-900 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Entering transaction for:</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value as 'Ndalu' | 'Junction')}
              className="px-3 py-1.5 bg-gray-50 dark:bg-blue-950 border border-gray-250 dark:border-blue-900 rounded-lg text-sm font-bold text-blue-800 dark:text-blue-300 cursor-pointer"
            >
              <option value="Ndalu">Ndalu Station</option>
              <option value="Junction">Junction Station</option>
            </select>
          </div>
        </div>

        {/* Global state updater notifier */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold font-mono flex items-center gap-1.5">
            {isQuotaExceeded() ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Local Offline Cache Active
              </span>
            ) : (
              <span className="text-gray-400 font-medium">
                {globalLoading ? 'Connecting live stream...' : 'Synced Cloud Firestore'}
              </span>
            )}
          </span>
          <button 
            onClick={() => handleFetchAutoReadings()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
            title="Refresh Sequence Parameters"
          >
            <RefreshCw className={`w-4 h-4 ${globalLoading ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 dark:border-blue-900 pb-2">
        <TabButton id="pumps" active={activeTab === 'pumps'} onClick={() => setActiveTab('pumps')} icon={Fuel} label="Pumps Readings" />
        <TabButton id="inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={ShoppingBag} label="Gas & Appliances" />
        <TabButton id="expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={DollarSign} label="Expenditures" />
        <TabButton id="cash" active={activeTab === 'cash'} onClick={() => setActiveTab('cash')} icon={ArrowDownLeft} label="Cash Positions" />
        <TabButton id="invoices" active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} icon={FileText} label="Customer Invoices" />
        <TabButton id="customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={Users} label="Operation Customers" />
        <TabButton id="reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={TrendingUp} label="Daily Auditing" />
        <TabButton id="pl" active={activeTab === 'pl'} onClick={() => setActiveTab('pl')} icon={Percent} label="Profit & Loss" />
        <TabButton id="bulk-entry" active={activeTab === 'bulk-entry'} onClick={() => setActiveTab('bulk-entry')} icon={Upload} label="Bulk Entry" />
      </div>

      {/* TAB 1: PUMPS */}
      {activeTab === 'pumps' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form left */}
          <div className="col-span-1 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-500" />
              Add Daily Pump Log
            </h3>
            
            {pumpError && (
              <div className="p-3 bg-red-100/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{pumpError}</span>
              </div>
            )}

            <form onSubmit={handleAddPumpReading} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Product Type</label>
                <div className="grid grid-cols-1 gap-2">
                  <select 
                    value={pumpProduct}
                    onChange={(e) => setPumpProduct(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="Super">Super Petrol</option>
                    <option value="Diesel">Diesel Fuel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Kerosene">Kerosene</option>
                    <option value="Engine oil">Engine oil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Litres Start Reading</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={litresStart}
                    onChange={(e) => setLitresStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-blue-900/50 rounded-lg text-sm font-semibold bg-white dark:bg-blue-950"
                    placeholder="Enter starting litres"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Required for first entry; automatically pre-filled thereafter.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Litres Stop Reading</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={litresStop}
                    onChange={(e) => setLitresStop(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-blue-900/50 rounded-lg text-sm font-semibold"
                    placeholder="Enter final litres"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Rate Per Litre (KES)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={ratePerLitre}
                    onChange={(e) => setRatePerLitre(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900/20 border border-gray-250 dark:border-blue-900/50 rounded-lg text-sm font-semibold"
                    placeholder="Rate KES"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Actual Manual Cash (KES)</label>
                  <input 
                    type="number"
                    value={manualRevenue}
                    onChange={(e) => setManualRevenue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 dark:border-blue-900/50 rounded-lg text-sm font-semibold"
                    placeholder="Collected sales"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setLitresStart('');
                    setLitresStop('');
                    setRatePerLitre('');
                    setManualRevenue('');
                    setPumpError('');
                  }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-gray-700 dark:text-blue-300 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                >
                  Clear Inputs
                </button>
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-transform cursor-pointer"
                >
                  Log Pump Record
                </button>
              </div>
            </form>

            {/* Rates Adjustment (Admin only) */}
            <div className="border-t border-gray-200 dark:border-blue-900/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Fuel Unit Pricing Management
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {isAdmin ? 'Admin Edit' : 'Read Only'}
                </span>
              </div>

              {isAdmin ? (
                <form onSubmit={handleCreateFuelRate} className="space-y-3">
                  {rateError && <p className="text-red-500 text-[11px]">{rateError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={rateSetupProduct}
                      onChange={(e) => setRateSetupProduct(e.target.value as any)}
                      className="px-2 py-1.5 bg-gray-50 dark:bg-blue-950 border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="Super">Super Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Kerosene">Kerosene</option>
                      <option value="Engine oil">Engine oil</option>
                    </select>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="KES Rate/L"
                      value={newRateValue}
                      onChange={(e) => setNewRateValue(e.target.value)}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <button type="submit" className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg cursor-pointer">
                    Adjust Pricing Threshold
                  </button>
                </form>
              ) : (
                <span className="text-xs text-gray-400 block">Pricing parameters can only be altered by authorized system administrators. Contact office.</span>
              )}
            </div>
          </div>

          {/* Table list right */}
          <div className="col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 rounded-xl p-5 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-blue-100">Historical Readings Log</h3>
              <span className="text-xs text-brand-500 uppercase tracking-widest font-bold">
                {selectedStation === 'Combined' ? 'NDALU & JUNCTION' : `${selectedStation} STATION`}
              </span>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[420px]">
              <table className="w-full text-left text-xs text-gray-500 dark:text-gray-300">
                <thead className="text-[10px] uppercase bg-gray-100 dark:bg-blue-900/30 text-gray-500 dark:text-blue-200 font-bold border-b border-gray-250 dark:border-blue-900/50">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Start (L)</th>
                    <th className="px-3 py-2 text-right">Stop (L)</th>
                    <th className="px-3 py-2 text-right">Sold (L)</th>
                    <th className="px-3 py-2 text-right">Calculated</th>
                    <th className="px-3 py-2 text-right">Collected</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-blue-900/20 font-medium">
                  {filteredReadingsList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400 text-sm">No readings registered yet for this selected scope.</td>
                    </tr>
                  ) : (
                    filteredReadingsList.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/10">
                        <td className="px-3 py-2.5 whitespace-nowrap">{format(r.date, 'MM/dd/yyyy')}</td>
                        <td className="px-3 py-2.5">{r.station}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${r.product === 'Super' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-yellow-950 text-amber-600 dark:text-yellow-400'}`}>
                            {r.product}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{formatLitres(r.litresStart)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatLitres(r.litresStop)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-blue-100">{formatLitres(r.litresSold)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(r.calculatedRevenue)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900 dark:text-blue-100">{formatCurrency(r.manualRevenue)}</td>
                        <td className={`px-3 py-2 text-right font-mono font-bold ${r.difference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.difference >= 0 ? '+' : ''}{formatCurrency(r.difference)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: 'Delete Pump Reading',
                                message: 'Are you sure you want to permanently delete this pump reading? This action cannot be undone and will affect inventory reports.',
                                action: async () => {
                                  await deleteDailyPumpReading(r.id!);
                                }
                              });
                            }}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & APPLIANCES */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Dynamic Stock Cards (Module 9) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <InventoryStockCard label="Super Petrol" data={inventorySummary.super} unit="L" />
            <InventoryStockCard label="Diesel Fuel" data={inventorySummary.diesel} unit="L" />
            <InventoryStockCard label="LPG 6kg Gas" data={inventorySummary.lpg6kg} unit="Cyls" />
            <InventoryStockCard label="LPG 13kg Gas" data={inventorySummary.lpg13kg} unit="Cyls" />
            <InventoryStockCard label="Empty 6kg" data={inventorySummary.empty6kg} unit="Cyls" />
            <InventoryStockCard label="Empty 13kg" data={inventorySummary.empty13kg} unit="Cyls" />
            <InventoryStockCard label="Eco Burners" data={inventorySummary.burner} unit="Units" />
            <InventoryStockCard label="Charcoal Grills" data={inventorySummary.grill} unit="Units" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LPG Transaction Form */}
            <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center justify-between">
                <span>Refill or Sale: LPG Systems</span>
                <span className="text-[10px] text-gray-400">Automatic Stock Adjust</span>
              </h3>
              {lpgError && <p className="text-red-500 text-xs">{lpgError}</p>}
              
              <form onSubmit={handleAddLpgOperation} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setLpgIsBought(false)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${!lpgIsBought ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-500'}`}
                  >
                    Log Sales (Outputs)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLpgIsBought(true)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${lpgIsBought ? 'bg-amber-600 text-white' : 'bg-transparent text-gray-500'}`}
                  >
                    Log Purchases (Refills)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">6kg</label>
                    <input 
                      type="number"
                      placeholder="e.g. 10"
                      value={lpg6kg}
                      onChange={(e) => setLpg6kg(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">13kg</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5"
                      value={lpg13kg}
                      onChange={(e) => setLpg13kg(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">6kg Empty</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5"
                      value={lpgEmpty6kg}
                      onChange={(e) => setLpgEmpty6kg(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">13kg Empty</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5"
                      value={lpgEmpty13kg}
                      onChange={(e) => setLpgEmpty13kg(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                </div>

                {!lpgIsBought && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Complete Gas Sold (Cyl + Burner + Grill)</label>
                    <input 
                      type="number"
                      placeholder="Units sold"
                      value={lpgCompleteGas}
                      onChange={(e) => setLpgCompleteGas(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Automatically decrements filled LPG, empty cylinders, burners, and grills by this sold quantity.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {lpgIsBought ? 'Total Purchase Cost (KES)' : 'Total Sales (KES)'}
                  </label>
                  <input 
                    type="number"
                    required
                    placeholder="Total Currency KES"
                    value={lpgAmt}
                    onChange={(e) => setLpgAmt(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                  />
                </div>

                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">
                  Submit LPG Log
                </button>
              </form>
            </div>

            {/* Appliances Form */}
            <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center justify-between">
                <span>Appliance Management</span>
                <span className="text-[10px] text-gray-400">Burners & Grills</span>
              </h3>
              {applianceError && <p className="text-red-500 text-xs">{applianceError}</p>}

              <form onSubmit={handleAddApplianceReceipt} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={applianceType}
                    onChange={(e) => setApplianceType(e.target.value as 'burner' | 'grill')}
                    className="px-3 py-2 border border-blue-900/20 rounded-lg text-xs font-bold bg-transparent"
                  >
                    <option value="burner">Eco Burners</option>
                    <option value="grill">Charcoal Grills</option>
                  </select>

                  <div className="grid grid-cols-2 gap-1 bg-gray-150 dark:bg-blue-950 p-1 rounded-lg border border-blue-900/15">
                    <button 
                      type="button" onClick={() => setApplianceIsBought(false)}
                      className={`text-[10px] font-bold py-1 rounded transition-colors cursor-pointer ${!applianceIsBought ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
                    >
                      Sale
                    </button>
                    <button 
                      type="button" onClick={() => setApplianceIsBought(true)}
                      className={`text-[10px] font-bold py-1 rounded transition-colors cursor-pointer ${applianceIsBought ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}
                    >
                      Purchase
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Item Quantity</label>
                    <input 
                      type="number"
                      required
                      placeholder="Qty"
                      value={applianceQty}
                      onChange={(e) => setApplianceQty(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      {applianceIsBought ? 'Purchase Cost (COGS - KES)' : 'Total Sales Amount (KES)'}
                    </label>
                    <input 
                      type="number"
                      required
                      placeholder="KES"
                      value={applianceCostAmt}
                      onChange={(e) => setApplianceCostAmt(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">
                  Submit Appliance Flow
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 mb-4">Inventory Logs History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-auto">
                <thead className="bg-gray-150 dark:bg-blue-900/20 text-gray-500 dark:text-blue-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Item Type</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Value (KES)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-blue-900/10 text-gray-600 dark:text-gray-300 font-medium">
                  {combinedInventoryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">No inventory transactions cataloged.</td>
                    </tr>
                  ) : (
                    combinedInventoryLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/5">
                        <td className="px-3 py-2">{format(log.date, 'MM/dd/yyyy')}</td>
                        <td className="px-3 py-2">{log.station}</td>
                        <td className="px-3 py-2 font-bold">{log.type}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.action === 'Purchase' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{log.qty}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-blue-100 font-bold">{formatCurrency(log.cost)}</td>
                        <td className="px-3 py-2 text-right">
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: `Delete ${log.type} ${log.action}`,
                                message: `Are you sure you want to permanently delete this ${log.type} ${log.action.toLowerCase()}? This will update the cash positions and inventory tables.`,
                                action: async () => {
                                  await log.deleteFn(log.id!);
                                }
                              });
                            }}
                            className="text-red-500 cursor-pointer hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-blue-950 border border-blue-200/60 dark:border-blue-900/40 p-6 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 dark:border-blue-900/30 pb-3">
              <div>
                <h3 className="font-bold text-gray-901 dark:text-blue-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-500 animate-pulse" />
                  Live Asset Inventory & Station Configurator
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Monitor real-time inventory levels and adjust physical opening stock capacities for Loruk stations.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-blue-900/30">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Active Station:</span>
                <select
                  value={configStation}
                  onChange={(e) => setConfigStation(e.target.value as 'Ndalu' | 'Junction')}
                  className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-transparent border-0 ring-0 focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="Ndalu">Loruk - Ndalu</option>
                  <option value="Junction">Loruk - Junction</option>
                </select>
              </div>
            </div>

            {configError && <p className="text-red-500 text-xs font-bold bg-red-100/10 p-2.5 rounded-lg border border-red-500/10">{configError}</p>}
            {configSuccess && <p className="text-emerald-600 text-xs font-bold bg-emerald-100/10 p-2.5 rounded-lg border border-emerald-500/10">{configSuccess}</p>}

            <form onSubmit={handleSaveOpeningStock} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                <InventoryConfigField 
                  label="Super Petrol (L)" 
                  value={configSuper} 
                  onChange={setConfigSuper} 
                  current={configInventorySummary.super.closing} 
                />
                <InventoryConfigField 
                  label="Diesel Fuel (L)" 
                  value={configDiesel} 
                  onChange={setConfigDiesel} 
                  current={configInventorySummary.diesel.closing} 
                />
                <InventoryConfigField 
                  label="LPG 6kg Gas" 
                  value={configLpg6kg} 
                  onChange={setConfigLpg6kg} 
                  current={configInventorySummary.lpg6kg.closing} 
                />
                <InventoryConfigField 
                  label="LPG 13kg Gas" 
                  value={configLpg13kg} 
                  onChange={setConfigLpg13kg} 
                  current={configInventorySummary.lpg13kg.closing} 
                />
                <InventoryConfigField 
                  label="Empty 6kg" 
                  value={configEmpty6kg} 
                  onChange={setConfigEmpty6kg} 
                  current={configInventorySummary.empty6kg.closing} 
                />
                <InventoryConfigField 
                  label="Empty 13kg" 
                  value={configEmpty13kg} 
                  onChange={setConfigEmpty13kg} 
                  current={configInventorySummary.empty13kg.closing} 
                />
                <InventoryConfigField 
                  label="Eco Burners" 
                  value={configBurner} 
                  onChange={setConfigBurner} 
                  current={configInventorySummary.burner.closing} 
                />
                <InventoryConfigField 
                  label="Charcoal Grills" 
                  value={configGrill} 
                  onChange={setConfigGrill} 
                  current={configInventorySummary.grill.closing} 
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-all flex items-center gap-2"
                >
                  {configSaving ? 'Persisting Stock Parameters...' : 'Apply Opening Stock Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-6">
            {/* Form */}
            <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-500" />
                Submit Expense Claim
              </h3>
              {expenseError && <p className="text-red-500 text-xs">{expenseError}</p>}

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Expense Category</label>
                  <select 
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-xs font-bold bg-transparent"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Claim Description</label>
                  <input 
                    type="text"
                    required
                    placeholder="Describe dispatch purpose"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Amount Settled (KES)</label>
                  <input 
                    type="number"
                    required
                    placeholder="KES paid out"
                    value={expenseAmt}
                    onChange={(e) => setExpenseAmt(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                  />
                </div>

                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer">
                  Authenticate Disbursement
                </button>
              </form>
            </div>

            {/* Sub: Plus Category */}
            <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider">Expand Expense Categories</h4>
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input 
                  type="text"
                  required
                  placeholder="New Category Name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-blue-900/20 rounded-lg font-semibold"
                />
                <button type="submit" className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Create
                </button>
              </form>
            </div>
          </div>

          {/* List display */}
          <div className="col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 mb-4">Expenditure Register</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-auto">
                <thead className="bg-gray-150 dark:bg-blue-900/20 text-gray-500 dark:text-blue-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-blue-900/10 text-gray-600 dark:text-gray-300 font-medium">
                  {filteredExpensesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400">No expenses cataloged.</td>
                    </tr>
                  ) : (
                    filteredExpensesList.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/5">
                        <td className="px-3 py-2">{format(e.date, 'MM/dd/yyyy')}</td>
                        <td className="px-3 py-2">{e.station}</td>
                        <td className="px-3 py-2 font-bold">{e.category}</td>
                        <td className="px-3 py-2">{e.description}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-blue-100 font-bold">{formatCurrency(e.amount)}</td>
                        <td className="px-3 py-2 text-right">
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: 'Delete Expense',
                                message: 'Are you sure you want to permanently delete this expenditure entry? The amount will no longer be visible on the balance sheet.',
                                action: async () => {
                                  await deleteDailyExpense(e.id!);
                                }
                              });
                            }}
                            className="text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CASH POSITIONS */}
      {activeTab === 'cash' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-blue-100">Audit Cash Balances</h3>
            {cashError && <p className="text-red-500 text-xs">{cashError}</p>}

            <form onSubmit={handleAddCashPosition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Closing M-Pesa Balance (KES)</label>
                <input 
                  type="number"
                  required
                  placeholder="M-Pesa Ledger Account KES"
                  value={cashMpesa}
                  onChange={(e) => setCashMpesa(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Cash At Hand (Safe Hold / Register)</label>
                <input 
                  type="number"
                  required
                  placeholder="KES actual paper cash in drawer"
                  value={cashOfHand}
                  onChange={(e) => setCashOfHand(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-semibold"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">
                Save Reconciliation Parameters
              </button>
            </form>
          </div>

          <div className="col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 mb-4">Historic Cash Balances</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-blue-900/20 text-gray-500 dark:text-blue-200 uppercase text-[10px] font-bold border-b border-gray-250">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2 text-right">M-Pesa Balance</th>
                    <th className="px-3 py-2 text-right">Cash At Hand</th>
                    <th className="px-3 py-2 text-right">Combined Liquidity</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-600 dark:text-gray-300 font-medium">
                  {filteredPositionsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400">No balance accounts tracked.</td>
                    </tr>
                  ) : (
                    filteredPositionsList.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/5">
                        <td className="px-3 py-2.5">{format(p.date, 'MM/dd/yyyy')}</td>
                        <td className="px-3 py-2.5 font-bold">{p.station}</td>
                        <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(p.mpesaBalance)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(p.cashAtHand)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-blue-100 font-bold">
                          {formatCurrency(p.mpesaBalance + p.cashAtHand)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: 'Delete Cash Position',
                                message: 'Are you sure you want to permanently delete this cash position item? Handover calculations will be updated relative to the change.',
                                action: async () => {
                                  await deleteCashPosition(p.id!);
                                }
                              });
                            }}
                            className="text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Issue New Customer Invoice
            </h3>
            {invError && <p className="text-red-500 text-xs">{invError}</p>}

            <form onSubmit={handleAddInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Invoice Number (Reg ID)</label>
                <input 
                  type="text"
                  required
                  placeholder="EX: INV-0001"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900/20 border border-blue-900/20 rounded-lg text-sm font-mono font-bold"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Customer Name / Corporate</label>
                <input 
                  type="text"
                  required
                  list="customer-list"
                  placeholder="Select or enter name"
                  value={invCustomer}
                  onChange={(e) => setInvCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-blue-900/20 border border-blue-900/20 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="customer-list">
                  {stationCustomers.filter(c => selectedStation === 'Combined' || c.station === selectedStation).map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Opening Balance (New Customers)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="Existing Debt"
                  value={invOpeningBalance}
                  onChange={(e) => setInvOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-blue-900/20 border border-blue-900/20 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Invoice Total (KES)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    placeholder="0.00"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-blue-900/20 border border-blue-900/20 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Initial Deposit (KES)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="Cash Down"
                    value={invPaid}
                    onChange={(e) => setInvPaid(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-blue-900/20 border border-blue-900/20 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer">
                Issue Invoice Book Entry
              </button>
            </form>
          </div>

          <div className="col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 mb-4">Accounts Receivables Ledger</h3>
            
            <div className="mb-4">
               <datalist id="customer-list">
                  {stationCustomers.filter(c => selectedStation === 'Combined' || c.station === selectedStation).map(c => <option key={c.id} value={c.name} />)}
                </datalist>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-blue-900/20 text-gray-500 dark:text-blue-200 uppercase text-[10px] font-bold border-b border-gray-250">
                  <tr>
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-600 dark:text-gray-300 font-medium">
                  {filteredInvoicesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-gray-400">No invoices issued.</td>
                    </tr>
                  ) : (
                    filteredInvoicesList.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/5">
                        <td className="px-3 py-2.5 font-bold font-mono text-gray-900 dark:text-blue-100">{invoice.invoiceNumber}</td>
                        <td className="px-3 py-2.5">{invoice.customerName}</td>
                        <td className="px-3 py-2.5 text-[10px] font-bold text-gray-500">{invoice.customerCategory || 'N/A'}</td>
                        <td className="px-3 py-2.5 font-bold">{invoice.station}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(invoice.invoiceAmount)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-500 font-bold">{formatCurrency(invoice.balance)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            invoice.status === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                            invoice.status === 'PARTIAL' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600' : 'bg-red-55 text-red-520'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right flex gap-1.5 justify-end">
                          {invoice.status !== 'PAID' && (
                            <button
                              onClick={async () => {
                                // Full settlement since prompt is disabled in iframe
                                const addAmount = invoice.balance.toString();
                                const amt = parseFloat(addAmount);
                                if(isNaN(amt) || amt <= 0 || amt > invoice.balance) {
                                  console.error('Input numeric parameters are invalid.');
                                  return;
                                }
                                const newPaid = invoice.paidAmount + amt;
                                const newBal = invoice.invoiceAmount - newPaid;
                                const newStat = newBal === 0 ? 'PAID' : 'PARTIAL';
                                await updateDailyInvoice(invoice.id!, {
                                  paidAmount: newPaid,
                                  balance: newBal,
                                  status: newStat
                                });
                                // Track payment record
                                await addInvoicePayment({
                                  invoiceId: invoice.id!,
                                  invoiceNumber: invoice.invoiceNumber,
                                  customerName: invoice.customerName,
                                  customerCategory: invoice.customerCategory,
                                  station: invoice.station,
                                  amountPaid: amt,
                                  paymentDate: Date.now(),
                                  paymentMethod: 'CASH',
                                  createdAt: Date.now()
                                });
                              }}
                              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold border border-blue-500/20 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Clear outstanding offset accounts"
                            >
                              Settle Full
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: 'Nullify Customer Invoice',
                                message: 'Are you sure you want to remove this ledger entry? This action reverts the invoice permanently.',
                                action: async () => {
                                  await deleteDailyInvoice(invoice.id!);
                                }
                              });
                            }}
                            className="text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: OPERATION CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-500" />
              Add {station} Customer
            </h3>
            {scFormError && <p className="text-red-500 text-xs font-semibold">{scFormError}</p>}

            <form onSubmit={handleAddStationCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Customer / Entity Name</label>
                <input 
                  type="text"
                  required
                  placeholder="EX: Apex Logistics"
                  value={scName}
                  onChange={(e) => setScName(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Customer Category</label>
                <select
                  value={scCategory}
                  onChange={(e) => setScCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Cash Customer">Cash Customer</option>
                  <option value="Credit Account">Credit Account</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Opening Balance (KES)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={scOpeningBalance}
                  onChange={(e) => setScOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-900/20 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={isScSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isScSubmitting ? 'Registering...' : 'Add Station Customer'}
              </button>
            </form>
          </div>

          <div className="col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-blue-100 mb-4">Direct Station Customer List ({station})</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-blue-900/20 text-gray-500 dark:text-blue-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3 py-2">Customer Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Opening Bal</th>
                    <th className="px-3 py-2 text-right">Current Balance</th>
                    <th className="px-3 py-2 text-right">Total Purchases</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-600 dark:text-gray-300 font-medium">
                  {stationCustomers.filter(c => selectedStation === 'Combined' || c.station === selectedStation).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">No station customers listed.</td>
                    </tr>
                  ) : (
                    stationCustomers.filter(c => selectedStation === 'Combined' || c.station === selectedStation).map(customer => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/5">
                        <td className="px-3 py-3 font-bold text-gray-900 dark:text-blue-100">{customer.name}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            customer.category === 'Credit Account' ? 'bg-purple-50 text-purple-600' :
                            customer.category === 'Contractor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                          }`}>
                            {customer.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-500">{formatCurrency(customer.openingBalance || 0)}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-red-500">{formatCurrency(customer.balance)}</td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-600">{formatCurrency(customer.totalPurchases)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {customer.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button 
                            onClick={() => {
                              setDeleteDialog({
                                isOpen: true,
                                title: 'Remove Customer',
                                message: `Are you sure you want to remove ${customer.name} from the ${customer.station} customer list?`,
                                action: async () => {
                                  await deleteStationCustomer(customer.id!);
                                }
                              });
                            }}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REPORTS & SECTIONS SELECTOR (Module 10 & 12) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-blue-100 text-lg">On-Demand PDF Reports Exporter</h3>
              <p className="text-xs text-gray-400">Download pristine ledger tables, cash projections and asset states for Ndalu or Junction.</p>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" onClick={() => handleDownloadPDF('daily')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-transform"
              >
                <FileDown className="w-4 h-4" /> Daily PDF
              </button>
              <button 
                type="button" onClick={() => handleDownloadPDF('weekly')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-transform"
              >
                <FileDown className="w-4 h-4" /> Weekly PDF
              </button>
              <button 
                type="button" onClick={() => handleDownloadPDF('monthly')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-transform"
              >
                <FileDown className="w-4 h-4" /> Monthly PDF
              </button>
            </div>
          </div>

          {/* Module 10: Live Daily Audit Summary */}
          <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900/40 p-5 rounded-xl shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-blue-100 border-b border-gray-150 pb-2">
              Live Auditing Sheet (Combined operations diagnostics)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Pumps detail */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-blue-500">Super Petrol (PMS) Activity</h4>
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Litres Sold</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatLitres(filteredReadingsList.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.litresSold, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Calc Revenue</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.calculatedRevenue, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Collected Cash</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.manualRevenue, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Variance</span>
                    <span className={`font-bold font-mono ${
                      filteredReadingsList.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.difference, 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Super').reduce((sum, r) => sum + r.difference, 0))}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-xs uppercase text-amber-500">Diesel Fuel (AGO) Activity</h4>
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Litres Sold</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatLitres(filteredReadingsList.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.litresSold, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Calc Revenue</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.calculatedRevenue, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Collected Cash</span>
                    <span className="font-bold text-gray-900 dark:text-blue-100 font-mono">
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.manualRevenue, 0))}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-blue-900/10 p-2 rounded">
                    <span className="block text-[10px] text-gray-400">Variance</span>
                    <span className={`font-bold font-mono ${
                      filteredReadingsList.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.difference, 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatCurrency(filteredReadingsList.filter(r => r.product === 'Diesel').reduce((sum, r) => sum + r.difference, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: LPG, Burners, Grills */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-emerald-500">Asset Stock Diagnostics</h4>
                <div className="divide-y divide-gray-100 dark:divide-blue-900/20 text-xs py-1">
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">LPG 6kg Gas Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.lpg6kg.closing} Cyls</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">LPG 13kg Gas Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.lpg13kg.closing} Cyls</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">Empty 6kg Cylinders Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.empty6kg.closing} Cyls</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">Empty 13kg Cylinders Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.empty13kg.closing} Cyls</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">Eco Burners Stock Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.burner.closing} Units</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">Charcoal Grills Stock Remaining</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-blue-100">{inventorySummary.grill.closing} Units</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-500">Active Receivable Invoices</span>
                    <span className="font-bold font-mono text-emerald-600">{filteredInvoicesList.filter(i => i.status !== 'PAID').length} Outstandings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PROFIT & LOSS (Module 11) */}
      {activeTab === 'pl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PLCard title="REVENUE MATRIX" amount={plCalculation.revenue.total} breakdown={[
              { label: 'Fuel Operations collected', value: plCalculation.revenue.fuel },
              { label: 'LPG Sales Revenues', value: plCalculation.revenue.lpg },
              { label: 'Cooker Burners Sales', value: plCalculation.revenue.burner },
              { label: 'Charcoal Grills Sales', value: plCalculation.revenue.grill }
            ]} color="text-emerald-600 dark:text-emerald-400 text-emerald-50 bg-emerald-900/5 border-emerald-500/20" />

            <PLCard title="INVENTORY COSTS (COGS)" amount={plCalculation.purchases.total} breakdown={[
              { label: 'LPG Gas purchase cost', value: plCalculation.purchases.lpg },
              { label: 'Burners stock acquisition', value: plCalculation.purchases.burner },
              { label: 'Grills stock acquisition', value: plCalculation.purchases.grill }
            ]} color="text-amber-600 bg-amber-900/5 border-amber-500/20" />

            <PLCard title="EXPENDITURE & UNDERHEADS" amount={plCalculation.expenses.direct} breakdown={
              // Dynamic category totals
              categories.map(cat => {
                const sum = filteredExpensesList.filter(e => e.category === cat.name).reduce((total, e) => total + e.amount, 0);
                return { label: `${cat.name} claims payouts`, value: sum };
              }).filter(c => c.value > 0)
            } color="text-red-600 bg-red-900/5 border-red-500/20" />
          </div>

          {/* NET NET NET CALC CARD */}
          <div className="bg-white dark:bg-blue-950 border-2 border-dashed border-gray-200 dark:border-blue-900/50 p-6 rounded-xl text-center space-y-2">
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs">Net Operating P&L</h3>
            <span className={`text-4xl font-extrabold tracking-tight block ${plCalculation.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(plCalculation.netProfit)}
            </span>
            <span className="text-xs text-gray-400">
              Computed Revenue ({formatCurrency(plCalculation.revenue.total)}) minus expenses ({formatCurrency(plCalculation.expenses.total)}).
            </span>
          </div>
        </div>
      )}

      {/* TAB 9: BULK ENTRY */}
      {activeTab === 'bulk-entry' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="bulk">
           <BulkEntry />
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity">
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-150 dark:border-blue-900/40 transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50">{deleteDialog.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {deleteDialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isDeleting}
                onClick={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteDialog.action();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsDeleting(false);
                    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- LOCAL SUB-COMPONENTS ----------------

interface TabButtonProps {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function TabButton({ id, active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
        active 
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-extrabold shadow-sm' 
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-blue-950'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

interface InventoryConfigFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  current: number;
}

function InventoryConfigField({ label, value, onChange, current }: InventoryConfigFieldProps) {
  return (
    <div className="space-y-1.5 p-3 bg-gray-50 dark:bg-blue-900/10 rounded-xl border border-gray-150 dark:border-blue-900/30 relative">
      <div className="flex justify-between items-start mb-1">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">Live</span>
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-blue-100 font-mono mb-2">
        {current.toLocaleString()}
      </div>
      <div className="pt-2 border-t border-gray-200 dark:border-blue-900/20">
        <span className="text-[9px] text-gray-500 font-medium block mb-1">Adjust Opening Opt.</span>
        <input
          type="number"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 dark:border-blue-900/40 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-blue-950"
        />
      </div>
    </div>
  );
}

interface InventoryStockCardProps {
  label: string;
  data: { opening: number, purchased: number, sold: number, closing: number };
  unit: string;
}

function InventoryStockCard({ label, data, unit }: InventoryStockCardProps) {
  const isFuel = label.toLowerCase().includes('petrol') || label.toLowerCase().includes('fuel');
  const threshold = isFuel ? 5000 : 10;
  const isLow = data.closing < threshold;

  return (
    <div className={`bg-white dark:bg-blue-950 border p-4 rounded-xl shadow-xs space-y-2 transition-all duration-300 ${isLow ? 'border-red-500/50 bg-red-500/5 dark:bg-red-950/10' : 'border-gray-200 dark:border-blue-900/40'}`}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">{label}</span>
        {isLow ? (
          <span className="text-[8px] font-bold text-red-500 bg-red-100 dark:bg-red-910/40 px-1.5 py-0.5 rounded border border-red-200/50 uppercase tracking-widest animate-pulse">Low</span>
        ) : (
          <span className="text-[8px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-910/40 px-1.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-widest">Normal</span>
        )}
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-xl font-bold font-mono tracking-tight text-gray-900 dark:text-blue-100">
          {data.closing.toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-400">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[9px] text-gray-400 font-mono">
        <div>
          <span>Open:</span>
          <span className="block font-bold text-gray-500">{data.opening}</span>
        </div>
        <div>
          <span>In:</span>
          <span className="block font-bold text-emerald-500">+{data.purchased}</span>
        </div>
        <div>
          <span>Out:</span>
          <span className="block font-bold text-red-500">-{data.sold}</span>
        </div>
      </div>
    </div>
  );
}

interface PLCardProps {
  title: string;
  amount: number;
  breakdown: { label: string, value: number }[];
  color: string;
}

function PLCard({ title, amount, breakdown, color }: PLCardProps) {
  return (
    <div className={`border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 ${color}`}>
      <div>
        <h4 className="text-[10px] uppercase font-extrabold tracking-widest">{title}</h4>
        <span className="text-3xl font-extrabold font-mono block tracking-tight my-2">
          {formatCurrency(amount)}
        </span>
      </div>
      <div className="divide-y divide-gray-150 text-[11px] font-medium space-y-2.5 pt-2">
        {breakdown.length === 0 ? (
          <span className="text-gray-400 block pb-1">No transaction log parsed.</span>
        ) : (
          breakdown.map((row, i) => (
            <div key={i} className="flex justify-between pt-1 font-mono text-gray-500">
              <span>{row.label}</span>
              <span className="font-bold">{formatCurrency(row.value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
