/**
 * FuelSuite — Daily Fuel Records.
 * Machine stop readings for AGO/PMS per station, date and salesperson, with
 * auto-filled start readings, computed sales figures, validation flags,
 * a review step before saving, and authorized corrections with audit trail.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  ClipboardList, Plus, Pencil, AlertTriangle, Save, Eye,
  CalendarDays, Fuel, ChevronDown, ChevronUp, History, MapPin, UserRound,
  Calculator, Smartphone, Droplets, Banknote,
  ShoppingCart, ShoppingBag, Receipt, HandCoins, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useFuelStations, useFuelSalespeople, useFuelDailyRecords,
  useFuelProductSales, useFuelExpenses, useFuelCreditTxs, useFuelPayments,
  useFuelProducts, useFuelPurchases, useFuelCreditCustomers, useFuelExpenseCategories,
  createFuelDailyRecord, correctFuelDailyRecord,
  createFuelProductSale, deleteFuelProductSale,
  createFuelPurchase, deleteFuelPurchase,
  createFuelExpense, deleteFuelExpense,
  recordFuelCreditTx, deleteFuelCreditTx,
  FUEL_PAYMENT_METHODS,
  FuelStation, FuelSalesperson, FuelDailyRecord, FuelProductReading,
  FuelProduct, FuelProductSale, FuelPurchase, FuelExpense, FuelCreditTx, FuelCreditCustomer,
} from '../../lib/fuelDb';
import { parseDateToTimestamp, formatDateToInput } from '../../lib/utils';
import {
  FuelPageShell, FuelSection, FuelKpiGrid, FuelTable, FuelModal, FuelField,
  FuelSearch, FuelBadge, FuelStationBadge, FuelTone, ksh, fmtQty, fmtDate, todayKey, dateKeyOf, fuelInputClass,
} from './fuelShared';
import { useFuelStationScope } from './fuelStationContext';

interface FuelDailyRecordsProps {
  initialAction?: string;
  onNavigate?: (page: string) => void;
}

const emptyReading = (rate = 0): FuelProductReading => ({
  salesStart: 0, salesStop: 0, litresStart: 0, litresStop: 0, rate,
});

const num = (v: string) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Derived figures for one product reading
const compute = (r: FuelProductReading) => {
  const litresSold = (r.litresStop || 0) - (r.litresStart || 0);
  const machineSales = (r.salesStop || 0) - (r.salesStart || 0);
  const expected = litresSold * (r.rate || 0);
  const difference = machineSales - expected;
  return { litresSold, machineSales, expected, difference };
};

export default function FuelDailyRecords({ initialAction, onNavigate }: FuelDailyRecordsProps) {
  const { data: stations, loading: stationsLoading } = useFuelStations();
  const salespeople = useFuelSalespeople().data;
  const { data: records, loading } = useFuelDailyRecords();
  const { data: productSales } = useFuelProductSales();
  const { data: expenses } = useFuelExpenses();
  const { data: creditTxs } = useFuelCreditTxs();
  const { data: payments } = useFuelPayments();
  const { data: products } = useFuelProducts();
  const { data: purchases } = useFuelPurchases();
  const { data: creditCustomers } = useFuelCreditCustomers();
  const { data: expenseCategories } = useFuelExpenseCategories();
  const { scope, isAll, scopeName, inScope } = useFuelStationScope();

  const activeStations = stations.filter(s => s.active !== false);

  const [stationId, setStationId] = useState<string>('');
  const [dateKey, setDateKey] = useState(todayKey());
  const [salespersonId, setSalespersonId] = useState('');

  // Form state
  const [ago, setAgo] = useState<FuelProductReading>(emptyReading());
  const [pms, setPms] = useState<FuelProductReading>(emptyReading());
  const [note, setNote] = useState('');
  const [startSource, setStartSource] = useState<'auto' | 'manual'>('manual');

  // Daily cash & M-Pesa reconciliation + fuel dip balance (paper-sheet fields)
  const [mpesaStart, setMpesaStart] = useState('');
  const [mpesaStop, setMpesaStop] = useState('');
  const [mpesaReceived, setMpesaReceived] = useState('');
  const [cashBroughtForward, setCashBroughtForward] = useState('');
  const [cashAtHand, setCashAtHand] = useState('');
  const [deposited, setDeposited] = useState('');
  const [transactionFee, setTransactionFee] = useState('');
  const [fuelBalanceSuper, setFuelBalanceSuper] = useState('');
  const [fuelBalanceDiesel, setFuelBalanceDiesel] = useState('');

  // ---- Quick entries (each saves a real record into its ledger, for the
  // form's station & date). Sales & purchases cover LPG + Accessories. ----
  const [qsProductId, setQsProductId] = useState('');
  const [qsQty, setQsQty] = useState('');
  const [qsPrice, setQsPrice] = useState('');
  const [qsOnCredit, setQsOnCredit] = useState(false);
  const [qsCustomerId, setQsCustomerId] = useState('');
  const [qpProductId, setQpProductId] = useState('');
  const [qpSupplier, setQpSupplier] = useState('');
  const [qpQty, setQpQty] = useState('');
  const [qpPrice, setQpPrice] = useState('');
  const [qpMethod, setQpMethod] = useState('Cash');
  const [qeCategory, setQeCategory] = useState('');
  const [qeDescription, setQeDescription] = useState('');
  const [qeAmount, setQeAmount] = useState('');
  const [qeMethod, setQeMethod] = useState('Cash');
  const [qdCustomerId, setQdCustomerId] = useState('');
  const [qdAmount, setQdAmount] = useState('');
  const [qdNote, setQdNote] = useState('');
  const [qrCustomerId, setQrCustomerId] = useState('');
  const [qrAmount, setQrAmount] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // which quick action is saving
  const [quickError, setQuickError] = useState<string | null>(null);

  const [editingRecord, setEditingRecord] = useState<FuelDailyRecord | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Default station once stations load; follow the header station switcher
  // when it changes (the form picker can still be changed manually after).
  useEffect(() => {
    if (editingRecord) return;
    if (scope !== 'all') { setStationId(scope); return; }
    if (!stationId && activeStations.length > 0) setStationId(activeStations[0].id);
  }, [scope, activeStations.length, stationId, editingRecord]);

  const station = stations.find(s => s.id === stationId);
  const stationSalespeople = salespeople.filter(
    sp => sp.active !== false && (!stationId || sp.stationIds?.includes(stationId))
  );

  // Salesperson options for the selected station
  useEffect(() => {
    if (stationSalespeople.length > 0 && !stationSalespeople.some(sp => sp.id === salespersonId)) {
      setSalespersonId(stationSalespeople[0].id);
    }
    if (stationSalespeople.length === 0) setSalespersonId('');
  }, [stationId, salespeople.length]);

  // Auto-fill start readings from the previous recorded stop for this station
  const previousRecord = useMemo(() => {
    if (!stationId) return null;
    return records
      .filter(r => r.stationId === stationId && r.dateKey < dateKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] || null;
  }, [records, stationId, dateKey]);

  // Load auto start readings when station/date changes and not editing
  useEffect(() => {
    if (editingRecord) return;
    if (previousRecord) {
      setAgo({ ...emptyReading(ago.rate), salesStart: previousRecord.ago?.salesStop || 0, litresStart: previousRecord.ago?.litresStop || 0 });
      setPms({ ...emptyReading(pms.rate), salesStart: previousRecord.pms?.salesStop || 0, litresStart: previousRecord.pms?.litresStop || 0 });
      setStartSource('auto');
    } else {
      setStartSource('manual');
    }
  }, [previousRecord?.id, dateKey, stationId, editingRecord]);

  // Keep rates when previousRecord changes
  const setAgoField = (k: keyof FuelProductReading, v: string) => setAgo(prev => ({ ...prev, [k]: num(v) }));
  const setPmsField = (k: keyof FuelProductReading, v: string) => setPms(prev => ({ ...prev, [k]: num(v) }));

  const agoC = compute(ago);
  const pmsC = compute(pms);
  const totalExpected = agoC.expected + pmsC.expected;
  const totalDifference = agoC.difference + pmsC.difference;

  // ---- Day figures pulled from the other FuelSuite ledgers (for the cash check).
  // Restricted to the form's station so the reconciliation never mixes stations.
  // Quick entries below save into these same ledgers, so they are included here
  // automatically. ----
  const stationOf = (id?: string) => (!stationId ? true : id === stationId);
  const isCash = (m?: string) => (m || '').toLowerCase().startsWith('cash');
  const isMpesa = (m?: string) => (m || '').toLowerCase().includes('m-pesa');
  const dayFigures = useMemo(() => {
    const ps = productSales.filter(s => s.dateKey === dateKey && stationOf(s.stationId));
    const ex = expenses.filter(e => e.dateKey === dateKey && stationOf(e.stationId));
    const tx = creditTxs.filter(t => t.dateKey === dateKey && stationOf(t.stationId));
    const pm = payments.filter(p => p.dateKey === dateKey && stationOf(p.stationId));
    const pu = purchases.filter(p => p.dateKey === dateKey && stationOf(p.stationId));
    const catOf = new Map(products.map(p => [p.id, p.category]));
    const isLpgAcc = (pid: string) => catOf.get(pid) !== 'White Oils'; // deleted products count as LPG/Acc
    const lpgAcc = ps.filter(s => isLpgAcc(s.productId));
    const lpgAccPurchases = pu.filter(p => isLpgAcc(p.productId));
    return {
      ps, ex, tx, pm, pu,
      productCash: ps.filter(s => !s.onCredit).reduce((a, s) => a + s.total, 0),
      productCredit: ps.filter(s => s.onCredit).reduce((a, s) => a + s.total, 0),
      lpgAccSales: lpgAcc.reduce((a, s) => a + s.total, 0),
      lpgAccSalesCash: lpgAcc.filter(s => !s.onCredit).reduce((a, s) => a + s.total, 0),
      lpgAccPurchases: lpgAccPurchases.reduce((a, p) => a + p.totalCost, 0),
      purchasesCash: pu.filter(p => isCash(p.paymentMethod)).reduce((a, p) => a + p.totalCost, 0),
      purchasesTotal: pu.reduce((a, p) => a + p.totalCost, 0),
      expensesCash: ex.filter(e => isCash(e.paymentMethod)).reduce((a, e) => a + e.amount, 0),
      expensesMpesa: ex.filter(e => isMpesa(e.paymentMethod)).reduce((a, e) => a + e.amount, 0),
      expensesTotal: ex.reduce((a, e) => a + e.amount, 0),
      repaymentsAll: tx.filter(t => t.type === 'repayment').reduce((a, t) => a + t.amount, 0),
      paymentsAll: pm.reduce((a, p) => a + p.amount, 0),
      debtsGiven: tx.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0),
    };
  }, [productSales, expenses, creditTxs, payments, purchases, products, dateKey, stationId]);

  // ---- Products for the LPG/Accessories quick entries: this station's stock
  // plus unassigned (legacy) products, excluding the machine fuels (White Oils).
  const stationProducts = useMemo(
    () => products.filter(p => stationOf(p.stationId) && p.category !== 'White Oils'),
    [products, stationId]
  );
  const stationCustomers = useMemo(
    () => creditCustomers.filter(c => stationOf(c.stationId)),
    [creditCustomers, stationId]
  );

  // M-Pesa received today: from till balances (stop − start), like the notebook
  const mpesaReceivedToday = useMemo(() => {
    if (mpesaStart === '' && mpesaStop === '') return num(mpesaReceived);
    return num(mpesaStop) - num(mpesaStart);
  }, [mpesaStart, mpesaStop, mpesaReceived]);

  // ---- Money position: single daily M-Pesa figure model.
  // Money IN counts everything collected today (fuel machine sales, product
  // sales, repayments, other receipts) regardless of channel; the M-Pesa till
  // delta (stop − start) is what landed in M-Pesa (net of any M-Pesa-paid
  // outflows), so cash at hand = money in − M-Pesa received − cash paid out
  // (cash-method purchases & expenses) − deposited − fees (+ cash brought in).
  const cashCheck = useMemo(() => {
    const fuelSales = agoC.machineSales + pmsC.machineSales;
    const moneyIn = fuelSales + dayFigures.productCash + dayFigures.repaymentsAll + dayFigures.paymentsAll;
    const cashOut = dayFigures.purchasesCash + dayFigures.expensesCash;
    const expectedCash =
      num(cashBroughtForward) + moneyIn - mpesaReceivedToday - cashOut - num(deposited) - num(transactionFee);
    const counted = num(cashAtHand);
    return { fuelSales, moneyIn, cashOut, expectedCash, counted, difference: counted - expectedCash };
  }, [agoC.machineSales, pmsC.machineSales, dayFigures, cashBroughtForward, mpesaReceivedToday, deposited, transactionFee, cashAtHand]);

  // ---- Flags ----
  const duplicate = useMemo(() => {
    if (editingRecord) return null;
    return records.find(r => r.stationId === stationId && r.dateKey === dateKey && r.salespersonId === salespersonId) || null;
  }, [records, stationId, dateKey, salespersonId, editingRecord]);

  const duplicateAnySalesperson = useMemo(
    () => records.filter(r => r.stationId === stationId && r.dateKey === dateKey),
    [records, stationId, dateKey]
  );

  const missingReadings =
    ago.litresStop <= 0 || ago.salesStop <= 0 || pms.litresStop <= 0 || pms.salesStop <= 0;

  const negativeReading =
    agoC.litresSold < 0 || agoC.machineSales < 0 || pmsC.litresSold < 0 || pmsC.machineSales < 0;

  const unreliablePrevious = previousRecord
    ? (compute(previousRecord.ago).litresSold < 0 || compute(previousRecord.pms).litresSold < 0)
    : false;

  const unusualDifference =
    Math.abs(agoC.difference) > Math.max(1000, Math.abs(agoC.expected) * 0.02) ||
    Math.abs(pmsC.difference) > Math.max(1000, Math.abs(pmsC.expected) * 0.02);

  const flags: Array<{ tone: FuelTone; text: string }> = [];
  if (duplicate) flags.push({ tone: 'red', text: 'Duplicate: this station, date and salesperson already has a record' });
  else if (duplicateAnySalesperson.length > 0) flags.push({ tone: 'amber', text: `${duplicateAnySalesperson.length} record(s) already exist for this station & date (different salesperson)` });
  if (missingReadings) flags.push({ tone: 'amber', text: 'Some stop readings are missing or zero' });
  if (negativeReading) flags.push({ tone: 'red', text: 'Negative difference: a stop reading is below its start reading' });
  if (unreliablePrevious) flags.push({ tone: 'amber', text: 'Previous record has negative readings — auto start figures may be unreliable' });
  if (unusualDifference) flags.push({ tone: 'violet', text: 'Unusual difference between machine sales and expected sales (>2%)' });
  if (num(cashAtHand) > 0 && Math.abs(cashCheck.difference) > 0.99) {
    flags.push({
      tone: cashCheck.difference < 0 ? 'red' : 'violet',
      text: `Cash check: counted ${ksh(cashCheck.counted)} vs expected ${ksh(cashCheck.expectedCash)} — difference ${ksh(cashCheck.difference)}`,
    });
  }

  const blockingSave = !!duplicate || negativeReading || !stationId || !dateKey;

  // Load a record into the form for editing
  const startEdit = (rec: FuelDailyRecord) => {
    setEditingRecord(rec);
    setStationId(rec.stationId);
    setDateKey(rec.dateKey);
    setSalespersonId(rec.salespersonId || '');
    setAgo({ ...emptyReading(), ...rec.ago });
    setPms({ ...emptyReading(), ...rec.pms });
    setNote(rec.note || '');
    setStartSource(rec.startSource || 'manual');
    setMpesaStart(rec.mpesaStart != null ? String(rec.mpesaStart) : '');
    setMpesaStop(rec.mpesaStop != null ? String(rec.mpesaStop) : '');
    setMpesaReceived(rec.mpesaReceived != null ? String(rec.mpesaReceived) : '');
    setCashBroughtForward(rec.cashBroughtForward != null ? String(rec.cashBroughtForward) : '');
    setCashAtHand(rec.cashAtHand != null ? String(rec.cashAtHand) : '');
    setDeposited(rec.deposited != null ? String(rec.deposited) : '');
    setTransactionFee(rec.transactionFee != null ? String(rec.transactionFee) : '');
    setFuelBalanceSuper(rec.fuelBalanceSuper != null ? String(rec.fuelBalanceSuper) : '');
    setFuelBalanceDiesel(rec.fuelBalanceDiesel != null ? String(rec.fuelBalanceDiesel) : '');
    setCorrectionReason('');
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setCorrectionReason('');
    setNotice(null);
    if (previousRecord) {
      setAgo({ ...emptyReading(ago.rate), salesStart: previousRecord.ago?.salesStop || 0, litresStart: previousRecord.ago?.litresStop || 0 });
      setPms({ ...emptyReading(pms.rate), salesStart: previousRecord.pms?.salesStop || 0, litresStart: previousRecord.pms?.litresStop || 0 });
    } else {
      setAgo(emptyReading(ago.rate));
      setPms(emptyReading(pms.rate));
    }
    setMpesaStart(''); setMpesaStop(''); setMpesaReceived('');
    setCashBroughtForward(''); setCashAtHand(''); setDeposited(''); setTransactionFee('');
    setFuelBalanceSuper(''); setFuelBalanceDiesel('');
  };

  const openReview = () => {
    setError(null);
    if (blockingSave) {
      setError(duplicate ? 'A record already exists for this station, date and salesperson.' : 'Fix the flagged issues before continuing.');
      return;
    }
    setReviewOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const dateTs = parseDateToTimestamp(dateKey);
      const salesperson = salespeople.find(sp => sp.id === salespersonId);
      if (editingRecord) {
        if (!correctionReason.trim()) {
          setError('A reason is required for authorized corrections.');
          setSaving(false);
          return;
        }
        await correctFuelDailyRecord(
          editingRecord,
          {
            ago, pms, note, startSource,
            mpesaStart: num(mpesaStart),
            mpesaStop: num(mpesaStop),
            mpesaReceived: mpesaReceivedToday,
            cashBroughtForward: num(cashBroughtForward),
            cashAtHand: num(cashAtHand),
            cashExpected: cashCheck.expectedCash,
            cashDifference: cashCheck.difference,
            deposited: num(deposited),
            transactionFee: num(transactionFee),
            fuelBalanceSuper: num(fuelBalanceSuper),
            fuelBalanceDiesel: num(fuelBalanceDiesel),
            salespersonId: salespersonId || undefined,
            salespersonName: salesperson?.name || editingRecord.salespersonName,
          },
          correctionReason.trim()
        );
        setNotice('Correction saved and logged in the audit trail.');
      } else {
        await createFuelDailyRecord({
          stationId,
          stationName: station?.name || '',
          dateKey,
          date: dateTs,
          salespersonId: salespersonId || undefined,
          salespersonName: salesperson?.name,
          ago, pms, note, startSource,
          mpesaStart: num(mpesaStart),
          mpesaStop: num(mpesaStop),
          mpesaReceived: mpesaReceivedToday,
          cashBroughtForward: num(cashBroughtForward),
          cashAtHand: num(cashAtHand),
          cashExpected: cashCheck.expectedCash,
          cashDifference: cashCheck.difference,
          deposited: num(deposited),
          transactionFee: num(transactionFee),
          fuelBalanceSuper: num(fuelBalanceSuper),
          fuelBalanceDiesel: num(fuelBalanceDiesel),
        });
        setNotice('Daily record saved.');
      }
      setReviewOpen(false);
      setEditingRecord(null);
      setCorrectionReason('');
      setNote('');
      setAgo(emptyReading(ago.rate));
      setPms(emptyReading(pms.rate));
      setStartSource(previousRecord ? 'auto' : 'manual');
      setMpesaStart(''); setMpesaStop(''); setMpesaReceived('');
      setCashBroughtForward(''); setCashAtHand(''); setDeposited(''); setTransactionFee('');
      setFuelBalanceSuper(''); setFuelBalanceDiesel('');
    } catch (err) {
      console.error(err);
      setError('Failed to save the record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ================= QUICK ENTRIES =================
  // Each one saves a real record into its ledger, tagged with the form's
  // station & date, so the ledgers, stock and the day's cash math all update.

  const quickFail = (err: unknown, what: string) => {
    console.error(err);
    setQuickError(`Failed to save the ${what}.`);
  };

  /** LPG / Accessories sale — cash or on credit (creates the debt). */
  const saveQuickSale = async () => {
    const product = products.find(p => p.id === qsProductId);
    if (!product) { setQuickError('Choose a product.'); return; }
    const qty = num(qsQty);
    const price = num(qsPrice) || product.sellingPrice;
    if (qty <= 0) { setQuickError('Quantity must be greater than zero.'); return; }
    if (!product.sellable) { setQuickError('That product is a container — it cannot be sold.'); return; }
    const customer = qsOnCredit ? stationCustomers.find(c => c.id === qsCustomerId) : undefined;
    if (qsOnCredit && !customer) { setQuickError('Choose the credit customer.'); return; }
    const total = Math.round(qty * price * 100) / 100;
    setBusy('sale');
    setQuickError(null);
    try {
      if (customer) {
        const newBalance = Math.round(((customer.balance || 0) + total) * 100) / 100;
        await recordFuelCreditTx({
          customerId: customer.id, customerName: customer.name,
          stationId: customer.stationId, stationName: customer.stationName,
          date: parseDateToTimestamp(dateKey), dateKey,
          amount: total, type: 'credit',
          note: `Product sale: ${product.name} × ${qty}`,
        }, customer.balance || 0);
      }
      await createFuelProductSale({
        date: parseDateToTimestamp(dateKey), dateKey,
        stationId: stationId || undefined, stationName: station?.name || undefined,
        productId: product.id, productName: product.name,
        qty, unitPrice: price, total,
        paymentMethod: customer ? 'Credit' : 'Cash',
        onCredit: !!customer,
        creditCustomerId: customer?.id, creditCustomerName: customer?.name,
      }, product, customer ? Math.round(((customer.balance || 0) + total) * 100) / 100 : undefined);
      setQsQty(''); setQsOnCredit(false); setQsCustomerId('');
    } catch (err) { quickFail(err, 'sale'); } finally { setBusy(null); }
  };

  /** Remove a quick sale — restores stock, and reverses the credit debt if it was on credit. */
  const removeQuickSale = async (s: FuelProductSale) => {
    setBusy(`sale-${s.id}`);
    setQuickError(null);
    try {
      if (s.onCredit && s.creditCustomerId) {
        const linked = creditTxs.find(t =>
          t.type === 'credit' && t.customerId === s.creditCustomerId && t.dateKey === s.dateKey &&
          Math.abs(t.amount - s.total) < 0.01 && (t.note || '').startsWith('Product sale:'));
        if (linked) await deleteFuelCreditTx(linked, creditCustomers.find(c => c.id === linked.customerId));
      }
      await deleteFuelProductSale(s, products.find(p => p.id === s.productId));
    } catch (err) { quickFail(err, 'delete'); } finally { setBusy(null); }
  };

  /** LPG / Accessories purchase — adds stock at this station. */
  const saveQuickPurchase = async () => {
    const product = products.find(p => p.id === qpProductId);
    if (!product) { setQuickError('Choose a product.'); return; }
    const qty = num(qpQty);
    const price = num(qpPrice);
    if (qty <= 0) { setQuickError('Quantity must be greater than zero.'); return; }
    if (price <= 0) { setQuickError('Buying price must be greater than zero.'); return; }
    setBusy('purchase');
    setQuickError(null);
    try {
      await createFuelPurchase({
        date: parseDateToTimestamp(dateKey), dateKey,
        stationId: stationId || undefined, stationName: station?.name || undefined,
        supplier: qpSupplier.trim() || '—',
        productId: product.id, productName: product.name,
        qty, buyingPrice: price, totalCost: Math.round(qty * price * 100) / 100,
        paymentMethod: qpMethod,
      }, product, { updateBuyingPrice: true });
      setQpQty(''); setQpPrice(''); setQpSupplier('');
    } catch (err) { quickFail(err, 'purchase'); } finally { setBusy(null); }
  };

  const removeQuickPurchase = async (p: FuelPurchase) => {
    setBusy(`purchase-${p.id}`);
    setQuickError(null);
    try {
      await deleteFuelPurchase(p, products.find(x => x.id === p.productId));
    } catch (err) { quickFail(err, 'delete'); } finally { setBusy(null); }
  };

  /** Day expense. */
  const saveQuickExpense = async () => {
    const category = qeCategory || expenseCategories[0]?.name || '';
    const amount = num(qeAmount);
    if (!category) { setQuickError('Add an expense category first (Expenses page).'); return; }
    if (amount <= 0) { setQuickError('Amount must be greater than zero.'); return; }
    setBusy('expense');
    setQuickError(null);
    try {
      await createFuelExpense({
        date: parseDateToTimestamp(dateKey), dateKey,
        stationId: stationId || undefined, stationName: station?.name || undefined,
        category, description: qeDescription.trim(),
        amount, paymentMethod: qeMethod,
      });
      setQeAmount(''); setQeDescription('');
    } catch (err) { quickFail(err, 'expense'); } finally { setBusy(null); }
  };

  const removeQuickExpense = async (e: FuelExpense) => {
    setBusy(`expense-${e.id}`);
    setQuickError(null);
    try {
      await deleteFuelExpense(e);
    } catch (err) { quickFail(err, 'delete'); } finally { setBusy(null); }
  };

  /** Manual debt (credit given, no product sale attached). */
  const saveQuickDebt = async () => {
    const customer = stationCustomers.find(c => c.id === qdCustomerId);
    const amount = num(qdAmount);
    if (!customer) { setQuickError('Choose the customer being given credit.'); return; }
    if (amount <= 0) { setQuickError('Amount must be greater than zero.'); return; }
    setBusy('debt');
    setQuickError(null);
    try {
      await recordFuelCreditTx({
        customerId: customer.id, customerName: customer.name,
        stationId: customer.stationId, stationName: customer.stationName,
        date: parseDateToTimestamp(dateKey), dateKey,
        amount, type: 'credit', note: qdNote.trim() || 'Manual credit',
      }, customer.balance || 0);
      setQdAmount(''); setQdNote('');
    } catch (err) { quickFail(err, 'debt'); } finally { setBusy(null); }
  };

  /** Day repayment (paid debt). */
  const saveQuickRepayment = async () => {
    const customer = stationCustomers.find(c => c.id === qrCustomerId);
    const amount = num(qrAmount);
    if (!customer) { setQuickError('Choose the customer paying.'); return; }
    if (amount <= 0) { setQuickError('Amount must be greater than zero.'); return; }
    if (amount > (customer.balance || 0) + 0.009) { setQuickError(`That is more than ${customer.name} owes (${ksh(customer.balance || 0)}).`); return; }
    setBusy('repayment');
    setQuickError(null);
    try {
      await recordFuelCreditTx({
        customerId: customer.id, customerName: customer.name,
        stationId: customer.stationId, stationName: customer.stationName,
        date: parseDateToTimestamp(dateKey), dateKey,
        amount, type: 'repayment',
      }, customer.balance || 0);
      setQrAmount('');
    } catch (err) { quickFail(err, 'repayment'); } finally { setBusy(null); }
  };

  const removeQuickCreditTx = async (t: FuelCreditTx) => {
    setBusy(`tx-${t.id}`);
    setQuickError(null);
    try {
      await deleteFuelCreditTx(t, creditCustomers.find(c => c.id === t.customerId));
    } catch (err) { quickFail(err, 'delete'); } finally { setBusy(null); }
  };

  // ---- Records table for the selected station scope ----
  const stationRecords = useMemo(() => {
    const base = records.filter(r => inScope(r.stationId));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? base.filter(r =>
          r.dateKey.includes(q) ||
          (r.salespersonName || '').toLowerCase().includes(q) ||
          r.stationName.toLowerCase().includes(q))
      : base;
    return [...filtered].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [records, inScope, search]);

  const rangeKpis = useMemo(() => {
    const todays = records.filter(r => r.dateKey === todayKey() && inScope(r.stationId));
    const litres = todays.reduce((s, r) => s + compute(r.ago).litresSold + compute(r.pms).litresSold, 0);
    const expected = todays.reduce((s, r) => s + compute(r.ago).expected + compute(r.pms).expected, 0);
    const diff = todays.reduce((s, r) => s + compute(r.ago).difference + compute(r.pms).difference, 0);
    return { count: todays.length, litres, expected, diff };
  }, [records, inScope]);

  const diffTone = (d: number): FuelTone => (d < 0 ? 'red' : Math.abs(d) > 1000 ? 'violet' : 'green');

  const ReadingGrid = ({ reading, computed, setter, label, color }: {
    reading: FuelProductReading;
    computed: ReturnType<typeof compute>;
    setter: (k: keyof FuelProductReading, v: string) => void;
    label: string;
    color: string;
  }) => (
    <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
          <Fuel className={`w-3.5 h-3.5 ${color}`} /> {label}
        </h4>
        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">Machine readings</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <FuelField label="Litres Start"><input type="number" className={fuelInputClass} value={reading.litresStart || ''} onChange={e => setter('litresStart', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Litres Stop"><input type="number" className={fuelInputClass} value={reading.litresStop || ''} onChange={e => setter('litresStop', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Sales Start (KSh)"><input type="number" className={fuelInputClass} value={reading.salesStart || ''} onChange={e => setter('salesStart', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Sales Stop (KSh)"><input type="number" className={fuelInputClass} value={reading.salesStop || ''} onChange={e => setter('salesStop', e.target.value)} placeholder="0" /></FuelField>
        <FuelField label="Rate / L (KSh)"><input type="number" className={fuelInputClass} value={reading.rate || ''} onChange={e => setter('rate', e.target.value)} placeholder="0" /></FuelField>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
        {[
          { l: 'Litres Sold', v: `${fmtQty(computed.litresSold)} L`, tone: computed.litresSold < 0 ? 'red' : 'green' },
          { l: 'Machine Sales', v: ksh(computed.machineSales), tone: computed.machineSales < 0 ? 'red' : 'violet' },
          { l: 'Expected Sales', v: ksh(computed.expected), tone: 'slate' },
          { l: 'Difference', v: ksh(computed.difference), tone: diffTone(computed.difference) },
        ].map(x => {
          const tones: Record<string, string> = { red: 'text-red-400 border-red-500/25 bg-red-500/[0.06]', green: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]', violet: 'text-violet-400 border-violet-500/25 bg-violet-500/[0.06]', slate: 'text-slate-300 border-white/10 bg-white/[0.03]' };
          return (
            <div key={x.l} className={`rounded-lg border px-2.5 py-1.5 ${tones[x.tone]}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">{x.l}</p>
              <p className="text-xs font-black font-mono mt-0.5">{x.v}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <FuelPageShell
      icon={ClipboardList}
      title="Daily Fuel Records"
      subtitle="Machine stop readings per station, date and salesperson — recorded after collection"
    >
      {/* KPI strip */}
      <FuelKpiGrid
        kpis={[
          { label: 'Records Today', value: String(rangeKpis.count), icon: ClipboardList, tone: 'green' },
          { label: 'Litres Sold Today', value: `${fmtQty(rangeKpis.litres)} L`, icon: Fuel, tone: 'green' },
          { label: 'Expected Sales Today', value: ksh(rangeKpis.expected), icon: CalendarDays, tone: 'violet' },
          { label: 'Difference Today', value: ksh(rangeKpis.diff), icon: AlertTriangle, tone: diffTone(rangeKpis.diff) },
        ]}
      />

      {/* Entry form */}
      <FuelSection
        title={editingRecord ? `Editing record — ${editingRecord.stationName} · ${editingRecord.dateKey}` : 'New daily record'}
        icon={editingRecord ? Pencil : Plus}
      >
        {editingRecord && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1 bg-violet-500/[0.07] border border-violet-500/25 rounded-lg px-3 py-2">
            <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Authorized edit — a reason is required, and the change is kept in the audit trail.
            </span>
            <button type="button" onClick={cancelEdit} className="text-[10px] font-bold text-gray-400 hover:text-white cursor-pointer">Cancel edit</button>
          </div>
        )}

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FuelField label="Station" required>
            <select value={stationId} onChange={e => setStationId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
              {activeStations.length === 0 && <option value="">No active stations</option>}
              {activeStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FuelField>
          <FuelField label="Date" required>
            <input type="date" value={dateKey} onChange={e => setDateKey(e.target.value)} className={`${fuelInputClass} cursor-pointer`} />
          </FuelField>
          <FuelField label="Salesperson" required hint={stationSalespeople.length === 0 ? 'No salesperson assigned to this station — add one in Stations & Salespeople.' : undefined}>
            <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)} className={`${fuelInputClass} cursor-pointer`} disabled={stationSalespeople.length === 0}>
              {stationSalespeople.length === 0 && <option value="">—</option>}
              {stationSalespeople.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </FuelField>
        </div>

        {/* Start reading source */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {previousRecord ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Start readings auto-filled from {fmtDate(previousRecord.date)} ({previousRecord.salespersonName || 'record'}) — editable if authorized.
            </span>
          ) : (
            <span className="text-violet-400 font-bold flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              First record for this station — enter the start readings manually.
            </span>
          )}
        </div>

        {/* Live day-close summary (mirrors the paper sheet headline) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-500/30 bg-violet-500/[0.07] text-[10px] font-bold">
            <span className="text-violet-300 uppercase tracking-wider">Total sales</span>
            <span className="font-mono text-violet-400">{ksh(cashCheck.fuelSales + dayFigures.lpgAccSales)}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] text-[10px] font-bold">
            <span className="text-emerald-300 uppercase tracking-wider">Money in</span>
            <span className="font-mono text-emerald-400">{ksh(cashCheck.moneyIn)}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-500/30 bg-violet-500/[0.07] text-[10px] font-bold">
            <span className="text-violet-300 uppercase tracking-wider">M-Pesa</span>
            <span className="font-mono text-violet-400">{ksh(mpesaReceivedToday)}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-bold">
            <span className="text-slate-300 uppercase tracking-wider">Expected cash</span>
            <span className="font-mono text-slate-200">{ksh(cashCheck.expectedCash)}</span>
          </span>
          {cashCheck.counted > 0 && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
              Math.abs(cashCheck.difference) <= 0.99
                ? 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-400'
                : cashCheck.difference < 0 ? 'border-red-500/30 bg-red-500/[0.07] text-red-400'
                : 'border-amber-500/30 bg-amber-500/[0.07] text-amber-400'
            }`}>
              <span className="uppercase tracking-wider">Cash diff</span>
              <span className="font-mono">{cashCheck.difference > 0 ? '+' : ''}{ksh(cashCheck.difference)}</span>
            </span>
          )}
        </div>

        <ReadingGrid reading={ago} computed={agoC} setter={setAgoField} label="AGO (Diesel)" color="text-emerald-400" />
        <ReadingGrid reading={pms} computed={pmsC} setter={setPmsField} label="PMS (Petrol)" color="text-violet-400" />

        {quickError && (
          <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{quickError}</div>
        )}

        {/* ---- Quick entries: real ledger records for this station & date ---- */}
        <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center text-[9px] font-black">1</span>
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> LPG &amp; Accessories — sales
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">saves into Product Sales · stock reduces</span>
          </div>
          {stationProducts.filter(p => p.sellable).length === 0 ? (
            <p className="text-[11px] text-amber-400">No sellable LPG/Accessories products for this station yet — add them in Products &amp; Prices.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <FuelField label="Product">
                  <select value={qsProductId} onChange={e => {
                    setQsProductId(e.target.value);
                    const p = products.find(x => x.id === e.target.value);
                    setQsPrice(p ? String(p.sellingPrice || '') : '');
                  }} className={`${fuelInputClass} cursor-pointer`}>
                    <option value="">— choose —</option>
                    {stationProducts.map(p => (
                      <option key={p.id} value={p.id} disabled={!p.sellable}>
                        {p.name}{!p.sellable ? ' (container)' : ''}{(p.stock || 0) <= 0 ? ' · no stock' : ''}
                      </option>
                    ))}
                  </select>
                </FuelField>
                <FuelField label="Qty"><input type="number" className={fuelInputClass} value={qsQty} onChange={e => setQsQty(e.target.value)} placeholder="0" min="0" /></FuelField>
                <FuelField label="Unit price (KSh)"><input type="number" className={fuelInputClass} value={qsPrice} onChange={e => setQsPrice(e.target.value)} placeholder="0" /></FuelField>
                <FuelField label="Payment">
                  <select value={qsOnCredit ? 'credit' : 'cash'} onChange={e => { const v = e.target.value === 'credit'; setQsOnCredit(v); if (v && !qsCustomerId && stationCustomers.length > 0) setQsCustomerId(stationCustomers[0].id); }} className={`${fuelInputClass} cursor-pointer`}>
                    <option value="cash">Cash / M-Pesa</option>
                    <option value="credit">On credit (debt)</option>
                  </select>
                </FuelField>
                {qsOnCredit && (
                  <FuelField label="Credit customer">
                    <select value={qsCustomerId} onChange={e => setQsCustomerId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                      <option value="">— choose —</option>
                      {stationCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · owes {ksh(c.balance || 0)}</option>)}
                    </select>
                  </FuelField>
                )}
              </div>
              <button type="button" onClick={saveQuickSale} disabled={busy === 'sale'} className="mt-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> {busy === 'sale' ? 'Saving…' : 'Add sale'}
              </button>
              {dayFigures.ps.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] max-h-44 overflow-y-auto space-y-1">
                  {dayFigures.ps.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.03] border border-theme-border rounded-lg px-2.5 py-1.5">
                      <span className="text-theme-text font-semibold truncate">{s.productName} × {fmtQty(s.qty)}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-emerald-400">{ksh(s.total)}</span>
                        {s.onCredit
                          ? <FuelBadge tone="amber">credit{s.creditCustomerName ? ` · ${s.creditCustomerName}` : ''}</FuelBadge>
                          : <FuelBadge tone="slate">cash</FuelBadge>}
                        <button type="button" onClick={() => removeQuickSale(s)} disabled={busy === `sale-${s.id}`} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-40" title="Remove (stock restored, credit reversed)">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-400 grid place-items-center text-[9px] font-black">2</span>
              <ShoppingBag className="w-3.5 h-3.5 text-violet-400" /> LPG &amp; Accessories — purchases
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">saves into Purchases · stock increases</span>
          </div>
          {stationProducts.length === 0 ? (
            <p className="text-[11px] text-amber-400">No LPG/Accessories products for this station yet — add them in Products &amp; Prices.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <FuelField label="Product">
                  <select value={qpProductId} onChange={e => {
                    setQpProductId(e.target.value);
                    const p = products.find(x => x.id === e.target.value);
                    setQpPrice(p ? String(p.buyingPrice || '') : '');
                  }} className={`${fuelInputClass} cursor-pointer`}>
                    <option value="">— choose —</option>
                    {stationProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </FuelField>
                <FuelField label="Supplier (optional)"><input type="text" className={fuelInputClass} value={qpSupplier} onChange={e => setQpSupplier(e.target.value)} placeholder="e.g. Manata" /></FuelField>
                <FuelField label="Qty"><input type="number" className={fuelInputClass} value={qpQty} onChange={e => setQpQty(e.target.value)} placeholder="0" min="0" /></FuelField>
                <FuelField label="Buying price (KSh)"><input type="number" className={fuelInputClass} value={qpPrice} onChange={e => setQpPrice(e.target.value)} placeholder="0" /></FuelField>
                <FuelField label="Paid by">
                  <select value={qpMethod} onChange={e => setQpMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                    {FUEL_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FuelField>
              </div>
              <button type="button" onClick={saveQuickPurchase} disabled={busy === 'purchase'} className="mt-2 px-3 py-1.5 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> {busy === 'purchase' ? 'Saving…' : 'Add purchase'}
              </button>
              {dayFigures.pu.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] max-h-44 overflow-y-auto space-y-1">
                  {dayFigures.pu.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.03] border border-theme-border rounded-lg px-2.5 py-1.5">
                      <span className="text-theme-text font-semibold truncate">{p.productName} × {fmtQty(p.qty)}{p.supplier && p.supplier !== '—' ? ` · ${p.supplier}` : ''}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-violet-400">{ksh(p.totalCost)}</span>
                        <FuelBadge tone="slate">{p.paymentMethod}</FuelBadge>
                        <button type="button" onClick={() => removeQuickPurchase(p)} disabled={busy === `purchase-${p.id}`} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-40" title="Remove (stock reversed)">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 grid place-items-center text-[9px] font-black">3</span>
              <Receipt className="w-3.5 h-3.5 text-red-400" /> Expenses today
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">saves into Expenses</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FuelField label="Category">
              <select value={qeCategory} onChange={e => setQeCategory(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                <option value="">{expenseCategories[0]?.name || '— none —'}</option>
                {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FuelField>
            <FuelField label="Description (optional)"><input type="text" className={fuelInputClass} value={qeDescription} onChange={e => setQeDescription(e.target.value)} placeholder="e.g. cleaning" /></FuelField>
            <FuelField label="Amount (KSh)"><input type="number" className={fuelInputClass} value={qeAmount} onChange={e => setQeAmount(e.target.value)} placeholder="0" /></FuelField>
            <FuelField label="Paid by">
              <select value={qeMethod} onChange={e => setQeMethod(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                {FUEL_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FuelField>
          </div>
          <button type="button" onClick={saveQuickExpense} disabled={busy === 'expense'} className="mt-2 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> {busy === 'expense' ? 'Saving…' : 'Add expense'}
          </button>
          {dayFigures.ex.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] max-h-44 overflow-y-auto space-y-1">
              {dayFigures.ex.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.03] border border-theme-border rounded-lg px-2.5 py-1.5">
                  <span className="text-theme-text font-semibold truncate">{e.category}{e.description ? ` — ${e.description}` : ''}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-red-400">{ksh(e.amount)}</span>
                    <FuelBadge tone="slate">{e.paymentMethod}</FuelBadge>
                    <button type="button" onClick={() => removeQuickExpense(e)} disabled={busy === `expense-${e.id}`} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-40" title="Remove">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
              <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
                <span className="w-5 h-5 shrink-0 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 grid place-items-center text-[9px] font-black">4</span>
                <HandCoins className="w-3.5 h-3.5 text-amber-400" /> Debts given today
              </h4>
              <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">credit — no money in hand</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FuelField label="Customer">
                <select value={qdCustomerId} onChange={e => setQdCustomerId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                  <option value="">— choose —</option>
                  {stationCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · owes {ksh(c.balance || 0)}</option>)}
                </select>
              </FuelField>
              <FuelField label="Amount (KSh)"><input type="number" className={fuelInputClass} value={qdAmount} onChange={e => setQdAmount(e.target.value)} placeholder="0" /></FuelField>
              <FuelField label="Note (optional)"><input type="text" className={fuelInputClass} value={qdNote} onChange={e => setQdNote(e.target.value)} placeholder="e.g. fuel on account" /></FuelField>
            </div>
            <button type="button" onClick={saveQuickDebt} disabled={busy === 'debt'} className="mt-2 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> {busy === 'debt' ? 'Saving…' : 'Add debt'}
            </button>
            {dayFigures.tx.filter(t => t.type === 'credit').length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] max-h-36 overflow-y-auto space-y-1">
                {dayFigures.tx.filter(t => t.type === 'credit').map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.03] border border-theme-border rounded-lg px-2.5 py-1.5">
                    <span className="text-theme-text font-semibold truncate">{t.customerName}{t.note && !t.note.startsWith('Product sale') ? ` — ${t.note}` : t.note ? ' (product sale)' : ''}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-amber-400">{ksh(t.amount)}</span>
                      <button type="button" onClick={() => removeQuickCreditTx(t)} disabled={busy === `tx-${t.id}`} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-40" title="Remove (customer balance reversed)">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
              <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
                <span className="w-5 h-5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center text-[9px] font-black">5</span>
                <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Paid debts today
              </h4>
              <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">repayments — money coming in</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FuelField label="Customer">
                <select value={qrCustomerId} onChange={e => setQrCustomerId(e.target.value)} className={`${fuelInputClass} cursor-pointer`}>
                  <option value="">— choose —</option>
                  {stationCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · owes {ksh(c.balance || 0)}</option>)}
                </select>
              </FuelField>
              <FuelField label="Amount (KSh)"><input type="number" className={fuelInputClass} value={qrAmount} onChange={e => setQrAmount(e.target.value)} placeholder="0" /></FuelField>
            </div>
            <button type="button" onClick={saveQuickRepayment} disabled={busy === 'repayment'} className="mt-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> {busy === 'repayment' ? 'Saving…' : 'Add repayment'}
            </button>
            {dayFigures.tx.filter(t => t.type === 'repayment').length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] max-h-36 overflow-y-auto space-y-1">
                {dayFigures.tx.filter(t => t.type === 'repayment').map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.03] border border-theme-border rounded-lg px-2.5 py-1.5">
                    <span className="text-theme-text font-semibold truncate">{t.customerName}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-400">{ksh(t.amount)}</span>
                      <button type="button" onClick={() => removeQuickCreditTx(t)} disabled={busy === `tx-${t.id}`} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-40" title="Remove (customer balance reversed)">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Money position: M-Pesa & where the day's money is ---- */}
        <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-400 grid place-items-center text-[9px] font-black">6</span>
              <Smartphone className="w-3.5 h-3.5 text-violet-400" /> M-Pesa &amp; money position
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">where the money for today's sales is</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <FuelField label="M-Pesa Start"><input type="number" className={fuelInputClass} value={mpesaStart} onChange={e => setMpesaStart(e.target.value)} placeholder="till balance" /></FuelField>
            <FuelField label="M-Pesa Stop"><input type="number" className={fuelInputClass} value={mpesaStop} onChange={e => setMpesaStop(e.target.value)} placeholder="till balance" /></FuelField>
            <FuelField label="M-Pesa Received" hint={mpesaStart !== '' || mpesaStop !== '' ? 'stop − start' : 'entered directly'}>
              <input type="number" className={fuelInputClass} value={mpesaReceivedToday || ''} onChange={e => setMpesaReceived(e.target.value)} placeholder="0" />
            </FuelField>
            <FuelField label="Cash brought forward" hint="cash carried into today">
              <input type="number" className={fuelInputClass} value={cashBroughtForward} onChange={e => setCashBroughtForward(e.target.value)} placeholder="0" />
            </FuelField>
            <FuelField label="Deposited (Bank)"><input type="number" className={fuelInputClass} value={deposited} onChange={e => setDeposited(e.target.value)} placeholder="0" /></FuelField>
            <FuelField label="Transaction Fee"><input type="number" className={fuelInputClass} value={transactionFee} onChange={e => setTransactionFee(e.target.value)} placeholder="0" /></FuelField>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
            {[
              { l: 'Total Money In', v: ksh(cashCheck.moneyIn), tone: 'green', icon: Banknote },
              { l: 'Into M-Pesa', v: ksh(mpesaReceivedToday), tone: 'violet', icon: Smartphone },
              { l: 'Cash Paid Out', v: ksh(cashCheck.cashOut), tone: 'red', icon: Receipt },
              { l: 'Expected Cash at Hand', v: ksh(cashCheck.expectedCash), tone: 'slate', icon: Calculator },
            ].map(x => {
              const tones: Record<string, string> = {
                red: 'text-red-400 border-red-500/25 bg-red-500/[0.06]',
                green: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]',
                violet: 'text-violet-400 border-violet-500/25 bg-violet-500/[0.06]',
                slate: 'text-slate-300 border-white/10 bg-white/[0.03]',
              };
              const Icon = x.icon;
              return (
                <div key={x.l} className={`rounded-lg border px-2.5 py-1.5 ${tones[x.tone]}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted flex items-center gap-1"><Icon className="w-3 h-3" />{x.l}</p>
                  <p className="text-xs font-black font-mono mt-0.5">{x.v}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-theme-text-muted leading-relaxed space-y-0.5">
            <p>
              {num(cashBroughtForward) > 0 && (<><span className="font-bold text-theme-text">{ksh(num(cashBroughtForward))}</span> brought forward + </>)}
              <span className="font-bold text-theme-text">{ksh(cashCheck.fuelSales)}</span> fuel machine sales (AGO + PMS)
              {' + '}<span className="font-bold text-emerald-400">{ksh(dayFigures.productCash)}</span> LPG &amp; accessories sales (cash)
              {' + '}<span className="font-bold text-emerald-400">{ksh(dayFigures.repaymentsAll)}</span> paid debts
              {' + '}<span className="font-bold text-emerald-400">{ksh(dayFigures.paymentsAll)}</span> other money received
              {' − '}<span className="font-bold text-violet-400">{ksh(mpesaReceivedToday)}</span> into M-Pesa
              {' − '}<span className="font-bold text-red-400">{ksh(dayFigures.purchasesCash)}</span> purchases paid in cash
              {' − '}<span className="font-bold text-red-400">{ksh(dayFigures.expensesCash)}</span> expenses paid in cash
              {' − '}<span className="font-bold text-red-400">{ksh(num(deposited))}</span> deposited
              {' − '}<span className="font-bold text-red-400">{ksh(num(transactionFee))}</span> fees
              {' = '}<span className="font-bold text-theme-text">{ksh(cashCheck.expectedCash)}</span> expected cash at hand
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="text-amber-400">Credit sales / debts given: <span className="font-mono font-bold">{ksh(dayFigures.debtsGiven)}</span> (not cash)</span>
              <span className="text-amber-400">LPG &amp; accessories purchases today: <span className="font-mono font-bold">{ksh(dayFigures.lpgAccPurchases)}</span></span>
              <span className="text-violet-400">M-Pesa expenses: <span className="font-mono font-bold">{ksh(dayFigures.expensesMpesa)}</span> (out of the till)</span>
              <span className="text-violet-400">Bank / cheque purchases: <span className="font-mono font-bold">{ksh(Math.max(0, dayFigures.purchasesTotal - dayFigures.purchasesCash))}</span> (not cash)</span>
            </p>
            <p className="text-gray-500">
              The quick-entry sections above save into the Product Sales, Purchases, Expenses, Debts and Paid Debts ledgers for {fmtDate(dateKey)} — those figures flow into this math automatically.
            </p>
          </div>
        </div>

        {/* ---- Cash at hand: auto vs counted ---- */}
        <div className={`border rounded-xl p-3.5 ${
          cashCheck.counted > 0 && Math.abs(cashCheck.difference) > 0.99
            ? cashCheck.difference < 0 ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-violet-500/30 bg-violet-500/[0.04]'
            : 'border-theme-border bg-white/[0.02]'
        }`}>
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center text-[9px] font-black">7</span>
              <Calculator className="w-3.5 h-3.5 text-emerald-400" /> Cash at hand — count &amp; compare
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">spot loss or excess</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">Expected (auto)</p>
              <p className="text-sm font-black font-mono mt-0.5 text-slate-300">{ksh(cashCheck.expectedCash)}</p>
            </div>
            <FuelField label="Counted (manual)" hint="physical cash on hand now">
              <input type="number" className={fuelInputClass} value={cashAtHand} onChange={e => setCashAtHand(e.target.value)} placeholder="count the cash" />
            </FuelField>
            <div className={`rounded-lg border px-2.5 py-1.5 ${
              cashCheck.counted <= 0 ? 'border-white/10 bg-white/[0.03]'
              : Math.abs(cashCheck.difference) <= 0.99 ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
              : cashCheck.difference < 0 ? 'border-red-500/25 bg-red-500/[0.06]'
              : 'border-violet-500/25 bg-violet-500/[0.06]'
            }`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">Difference (loss / excess)</p>
              <p className={`text-sm font-black font-mono mt-0.5 ${
                cashCheck.counted <= 0 ? 'text-slate-300'
                : Math.abs(cashCheck.difference) <= 0.99 ? 'text-emerald-400'
                : cashCheck.difference < 0 ? 'text-red-400' : 'text-violet-400'
              }`}>
                {cashCheck.difference > 0 ? '+' : ''}{ksh(cashCheck.difference)}
              </p>
              {cashCheck.counted > 0 && (
                <p className="text-[9px] mt-0.5 font-semibold text-theme-text-muted">
                  {Math.abs(cashCheck.difference) <= 0.99 ? 'Balanced ✓'
                    : cashCheck.difference < 0 ? 'Short — money missing'
                    : 'Excess — extra money'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fuel balance (dip) */}
        <div className="border border-theme-border rounded-xl p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-black text-theme-text flex items-center gap-1.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center text-[9px] font-black">8</span>
              <Droplets className="w-3.5 h-3.5 text-emerald-400" /> Fuel balance (dip) — litres left in tank
            </h4>
            <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">end of day</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FuelField label="Super / PMS left (L)"><input type="number" className={fuelInputClass} value={fuelBalanceSuper} onChange={e => setFuelBalanceSuper(e.target.value)} placeholder="0" /></FuelField>
            <FuelField label="Diesel / AGO left (L)"><input type="number" className={fuelInputClass} value={fuelBalanceDiesel} onChange={e => setFuelBalanceDiesel(e.target.value)} placeholder="0" /></FuelField>
          </div>
        </div>

        <FuelField label="Note (optional)">
          <input type="text" className={fuelInputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. generator ran overnight" />
        </FuelField>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="space-y-1.5">
            {flags.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 text-[11px] font-semibold rounded-lg px-3 py-2 border ${
                f.tone === 'red' ? 'text-red-400 border-red-500/30 bg-red-500/[0.06]'
                : f.tone === 'amber' ? 'text-amber-400 border-amber-500/30 bg-amber-500/[0.06]'
                : 'text-violet-400 border-violet-500/30 bg-violet-500/[0.06]'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {f.text}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
        )}
        {notice && !editingRecord && (
          <div className="text-xs text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/30 rounded-lg px-3 py-2">{notice}</div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-theme-text-muted">
            Expected total: <span className="font-mono font-bold text-theme-text">{ksh(totalExpected)}</span>
            {' · '}Difference: <span className={`font-mono font-bold ${totalDifference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(totalDifference)}</span>
          </div>
          <button
            type="button"
            onClick={openReview}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Eye className="w-4 h-4" /> Review &amp; Save
          </button>
        </div>
      </FuelSection>

      {/* Records table */}
      <FuelSection title={`Recorded days — ${isAll ? 'all stations' : scopeName}`} icon={MapPin}
        right={<FuelSearch value={search} onChange={setSearch} placeholder="Search date or salesperson…" />}
      >
        <FuelTable
          headers={['Date', 'Station', 'Salesperson', 'AGO Litres', 'AGO Sales', 'AGO Diff', 'PMS Litres', 'PMS Sales', 'PMS Diff', 'Status', '']}
          empty={stationRecords.length === 0}
        >
          {stationRecords.map(rec => {
            const ra = compute(rec.ago);
            const rp = compute(rec.pms);
            const isExpanded = expandedRow === rec.id;
            return (
              <React.Fragment key={rec.id}>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-2.5 text-xs font-bold text-theme-text whitespace-nowrap">{fmtDate(rec.dateKey)}</td>
                  <td className="py-2 px-2.5"><FuelStationBadge stationName={rec.stationName} /></td>
                  <td className="py-2 px-2.5 text-xs text-theme-text-muted whitespace-nowrap">{rec.salespersonName || '—'}</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-emerald-400">{fmtQty(ra.litresSold)} L</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-theme-text">{ksh(ra.machineSales)}</td>
                  <td className={`py-2 px-2.5 text-xs font-mono ${ra.difference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(ra.difference)}</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-violet-400">{fmtQty(rp.litresSold)} L</td>
                  <td className="py-2 px-2.5 text-xs font-mono text-theme-text">{ksh(rp.machineSales)}</td>
                  <td className={`py-2 px-2.5 text-xs font-mono ${rp.difference < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{ksh(rp.difference)}</td>
                  <td className="py-2 px-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {(rec.corrections?.length || 0) > 0 && <FuelBadge tone="violet">corrected</FuelBadge>}
                      {ra.difference < 0 || rp.difference < 0 ? <FuelBadge tone="red">negative</FuelBadge>
                        : Math.abs(ra.difference) > 1000 || Math.abs(rp.difference) > 1000 ? <FuelBadge tone="violet">unusual</FuelBadge>
                        : <FuelBadge tone="green">ok</FuelBadge>}
                    </div>
                  </td>
                  <td className="py-2 px-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button type="button" onClick={() => setExpandedRow(isExpanded ? null : rec.id)} className="p-1.5 text-gray-500 hover:text-white rounded-md cursor-pointer" title="Details">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => startEdit(rec)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer" title="Correct this record">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={11} className="px-2.5 pb-3">
                      <div className="bg-white/[0.02] border border-theme-border rounded-lg p-3 text-[11px] space-y-1.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          {(['ago', 'pms'] as const).map(p => (
                            <div key={p} className="space-y-0.5">
                              <p className="font-bold text-theme-text uppercase text-[9px] tracking-wider">{p}</p>
                              <p className="text-gray-400">Start: L {fmtQty(rec[p].litresStart)} / KSh {fmtQty(rec[p].salesStart)}</p>
                              <p className="text-gray-400">Stop: L {fmtQty(rec[p].litresStop)} / KSh {fmtQty(rec[p].salesStop)}</p>
                              <p className="text-gray-400">Rate: {ksh(rec[p].rate)}/L</p>
                            </div>
                          ))}
                          <div className="space-y-0.5">
                            <p className="font-bold text-theme-text uppercase text-[9px] tracking-wider">Meta</p>
                            <p className="text-gray-400">Start source: {rec.startSource || 'manual'}</p>
                            <p className="text-gray-400">Recorded by: {rec.createdBy || '—'}</p>
                            <p className="text-gray-400">Saved: {format(rec.createdAt, 'dd MMM yyyy HH:mm')}</p>
                          </div>
                        </div>
                        {(rec.mpesaReceived != null || rec.cashAtHand != null || rec.cashExpected != null || rec.deposited != null || rec.fuelBalanceSuper != null || rec.fuelBalanceDiesel != null) && (
                          <div className="pt-1.5 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 font-mono text-gray-400">
                            <p>M-Pesa received: <span className="text-violet-400 font-bold">{ksh(rec.mpesaReceived || 0)}</span></p>
                            <p>Cash counted: <span className="text-emerald-400 font-bold">{ksh(rec.cashAtHand || 0)}</span></p>
                            <p>Expected cash: <span className="text-theme-text font-bold">{ksh(rec.cashExpected || 0)}</span></p>
                            <p>Cash difference: <span className={(rec.cashDifference || 0) < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{ksh(rec.cashDifference || 0)}</span></p>
                            <p>Deposited: <span className="text-theme-text font-bold">{ksh(rec.deposited || 0)}</span></p>
                            <p>Fees: <span className="text-theme-text font-bold">{ksh(rec.transactionFee || 0)}</span></p>
                            <p>Fuel balance Super: <span className="text-emerald-400 font-bold">{fmtQty(rec.fuelBalanceSuper || 0)} L</span></p>
                            <p>Fuel balance Diesel: <span className="text-emerald-400 font-bold">{fmtQty(rec.fuelBalanceDiesel || 0)} L</span></p>
                          </div>
                        )}
                        {rec.note && <p className="text-gray-400">Note: {rec.note}</p>}
                        {(rec.corrections?.length || 0) > 0 && (
                          <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                            <p className="font-bold text-violet-400 uppercase text-[9px] tracking-wider">Correction history</p>
                            {rec.corrections!.map((c, i) => (
                              <p key={i} className="text-gray-400">{format(c.at, 'dd MMM yyyy HH:mm')} — {c.by}: {c.reason} ({c.changes})</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </FuelTable>
        {loading && <p className="text-xs text-gray-500 mt-2">Loading records…</p>}
      </FuelSection>

      {/* Review step modal */}
      {reviewOpen && (
        <FuelModal
          title={editingRecord ? 'Review correction' : 'Review daily record'}
          icon={Eye}
          onClose={() => setReviewOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setReviewOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer">Go back</button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (editingRecord && !correctionReason.trim())}
                className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : editingRecord ? 'Save correction' : 'Confirm & save record'}
              </button>
            </>
          }
        >
          <div className="text-xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">Station &amp; date</p>
                <p className="font-bold text-theme-text">{station?.name}</p>
                <p className="text-gray-400">{fmtDate(dateKey)}</p>
              </div>
              <div className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">Salesperson</p>
                <p className="font-bold text-theme-text flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5 text-violet-400" /> {salespeople.find(sp => sp.id === salespersonId)?.name || '—'}</p>
                <p className="text-gray-400">Start source: {startSource}</p>
              </div>
            </div>
            {([['AGO (Diesel)', ago, agoC], ['PMS (Petrol)', pms, pmsC]] as [string, FuelProductReading, ReturnType<typeof compute>][]).map(([label, r, c]) => (
              <div key={label} className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1">{label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 font-mono">
                  <span className="text-gray-400">Litres sold: <span className="text-emerald-400 font-bold">{fmtQty(c.litresSold)} L</span></span>
                  <span className="text-gray-400">Machine: <span className="text-theme-text font-bold">{ksh(c.machineSales)}</span></span>
                  <span className="text-gray-400">Expected: <span className="text-violet-400 font-bold">{ksh(c.expected)}</span></span>
                  <span className="text-gray-400">Difference: <span className={`${c.difference < 0 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>{ksh(c.difference)}</span></span>
                </div>
              </div>
            ))}
            <div className="bg-white/[0.03] border border-theme-border rounded-lg p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-theme-text-muted font-bold mb-1 flex items-center gap-1.5">
                <Calculator className="w-3 h-3 text-violet-400" /> Money position &amp; cash check
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 font-mono">
                <span className="text-gray-400">Money in: <span className="text-emerald-400 font-bold">{ksh(cashCheck.moneyIn)}</span></span>
                <span className="text-gray-400">Into M-Pesa: <span className="text-violet-400 font-bold">{ksh(mpesaReceivedToday)}</span></span>
                <span className="text-gray-400">Cash paid out: <span className="text-red-400 font-bold">{ksh(cashCheck.cashOut)}</span></span>
                <span className="text-gray-400">Expected cash: <span className="text-theme-text font-bold">{ksh(cashCheck.expectedCash)}</span></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 font-mono mt-1">
                <span className="text-gray-400">Counted: <span className="text-emerald-400 font-bold">{ksh(cashCheck.counted)}</span></span>
                <span className="text-gray-400">Difference: <span className={`${cashCheck.difference < 0 ? 'text-red-400' : Math.abs(cashCheck.difference) <= 0.99 ? 'text-emerald-400' : 'text-violet-400'} font-bold`}>{ksh(cashCheck.difference)}</span></span>
                <span className="text-gray-400">Deposited: <span className="text-theme-text font-bold">{ksh(num(deposited))}</span></span>
                <span className="text-gray-400">Fees: <span className="text-theme-text font-bold">{ksh(num(transactionFee))}</span></span>
                <span className="text-gray-400">Debts given: <span className="text-amber-400 font-bold">{ksh(dayFigures.debtsGiven)}</span></span>
                <span className="text-gray-400">Fuel dip: <span className="text-emerald-400 font-bold">{fmtQty(num(fuelBalanceSuper))} / {fmtQty(num(fuelBalanceDiesel))} L</span></span>
              </div>
              {num(cashAtHand) > 0 && (
                <p className={`mt-1.5 text-[11px] font-bold ${Math.abs(cashCheck.difference) <= 0.99 ? 'text-emerald-400' : cashCheck.difference < 0 ? 'text-red-400' : 'text-violet-400'}`}>
                  {Math.abs(cashCheck.difference) <= 0.99
                    ? '✓ Cash check passes — counted matches expected.'
                    : `Cash check difference: ${ksh(cashCheck.difference)} — confirm against your paper sheet before saving.`}
                </p>
              )}
            </div>
            {editingRecord && (
              <FuelField label="Reason for correction" required>
                <input type="text" className={fuelInputClass} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="e.g. wrong stop figure keyed yesterday" />
              </FuelField>
            )}
            {flags.some(f => f.tone === 'red') && (
              <div className="text-red-400 bg-red-500/[0.06] border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Some flags are still active — double-check before saving.
              </div>
            )}
          </div>
        </FuelModal>
      )}
    </FuelPageShell>
  );
}
