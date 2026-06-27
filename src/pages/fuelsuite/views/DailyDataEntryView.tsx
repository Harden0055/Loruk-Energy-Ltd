import React, { useState } from 'react';
import { useFuel, STATIONS, PumpReading, LPGTransaction, Expense, Invoice, CashPosition, Product, Station } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button } from '../components';
import { Plus, Trash2, Save } from 'lucide-react';

export default function DailyDataEntryView() {
  const { 
    activeStation, 
    products, 
    pumpReadings, setPumpReadings,
    lpgTransactions, setLpgTransactions,
    expenses, setExpenses,
    invoices, setInvoices,
    cashPositions, setCashPositions
  } = useFuel();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [station, setStation] = useState<Station>(activeStation === 'Combined Total' ? STATIONS[0] : activeStation);

  // Pump Readings State
  const [pumps, setPumps] = useState<Partial<PumpReading>[]>(
    products.filter(p => !p.name.toLowerCase().includes('oil')).map(p => ({
      product: p.name,
      startReading: 0,
      stopReading: 0,
      ratePerLitre: 0,
      manualCash: 0
    }))
  );

  React.useEffect(() => {
    const previousReadings = pumpReadings
      .filter(pr => pr.station === station && pr.date < date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    setPumps(products.filter(p => !p.name.toLowerCase().includes('oil')).map(p => {
      const lastReading = previousReadings.find(pr => pr.product === p.name);
      return {
        product: p.name,
        startReading: lastReading ? lastReading.stopReading : 0,
        stopReading: 0,
        ratePerLitre: 0,
        manualCash: 0
      };
    }));
  }, [date, station, products]); // Intentionally omitting pumpReadings to prevent form reset when another entry is saved


  // LPG Sales
  const [lpgSales, setLpgSales] = useState<Partial<LPGTransaction>[]>([
    { item: '6kg Cylinder', quantity: 0, amount: 0 }
  ]);

  // LPG Purchases (COGS)
  const [lpgPurchases, setLpgPurchases] = useState<Partial<LPGTransaction>[]>([
    { item: '6kg Cylinder', quantity: 0, amount: 0 }
  ]);

  // Expenses
  const [expenseRows, setExpenseRows] = useState<Partial<Expense>[]>([
    { category: '', amount: 0 }
  ]);

  // Invoices
  const [invoiceRows, setInvoiceRows] = useState<Partial<Invoice>[]>([
    { customerName: '', totalAmount: 0, paidAmount: 0 }
  ]);

  // Cash Position
  const [mPesa, setMPesa] = useState<number>(0);
  const [cashOnHand, setCashOnHand] = useState<number>(0);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSaveAll = () => {
    // Save Pump Readings
    const newPumpReadings: PumpReading[] = pumps.filter(p => p.stopReading! > 0 || p.startReading! > 0).map(p => ({
      id: generateId(),
      date,
      station,
      product: p.product!,
      startReading: p.startReading || 0,
      stopReading: p.stopReading || 0,
      ratePerLitre: p.ratePerLitre || 0,
      manualCash: p.manualCash || 0
    }));
    if (newPumpReadings.length > 0) {
      setPumpReadings(prev => [...prev, ...newPumpReadings]);
    }

    // Save LPG Sales
    const newLpgSales: LPGTransaction[] = lpgSales.filter(s => s.quantity! > 0 || s.amount! > 0).map(s => ({
      id: generateId(),
      date,
      station,
      type: 'sale',
      item: s.item || 'LPG',
      quantity: s.quantity || 0,
      amount: s.amount || 0
    }));

    // Save LPG Purchases
    const newLpgPurchases: LPGTransaction[] = lpgPurchases.filter(p => p.quantity! > 0 || p.amount! > 0).map(p => ({
      id: generateId(),
      date,
      station,
      type: 'purchase',
      item: p.item || 'LPG',
      quantity: p.quantity || 0,
      amount: p.amount || 0
    }));

    if (newLpgSales.length > 0 || newLpgPurchases.length > 0) {
      setLpgTransactions(prev => [...prev, ...newLpgSales, ...newLpgPurchases]);
    }

    // Save Expenses
    const newExpenses: Expense[] = expenseRows.filter(e => e.category && e.amount! > 0).map(e => ({
      id: generateId(),
      date,
      station,
      category: e.category!,
      amount: e.amount || 0
    }));
    if (newExpenses.length > 0) {
      setExpenses(prev => [...prev, ...newExpenses]);
    }

    // Save Invoices
    const newInvoices: Invoice[] = invoiceRows.filter(i => i.customerName && i.totalAmount! > 0).map(i => ({
      id: generateId(),
      date, // We added this to interface
      station,
      customerName: i.customerName!,
      totalAmount: i.totalAmount || 0,
      paidAmount: i.paidAmount || 0
    }));
    if (newInvoices.length > 0) {
      setInvoices(prev => [...prev, ...newInvoices]);
    }

    // Save Cash Position
    if (mPesa > 0 || cashOnHand > 0) {
      const newCashPosition: CashPosition = {
        id: generateId(),
        date,
        mPesa,
        cashOnHand
      };
      setCashPositions(prev => [...prev, newCashPosition]);
    }

    alert('Daily Data Saved Successfully!');
    // Reset Form
    setPumps(products.filter(p => !p.name.toLowerCase().includes('oil')).map(p => ({ product: p.name, startReading: 0, stopReading: 0, ratePerLitre: 0, manualCash: 0 })));
    setLpgSales([{ item: '6kg Cylinder', quantity: 0, amount: 0 }]);
    setLpgPurchases([{ item: '6kg Cylinder', quantity: 0, amount: 0 }]);
    setExpenseRows([{ category: '', amount: 0 }]);
    setInvoiceRows([{ customerName: '', totalAmount: 0, paidAmount: 0 }]);
    setMPesa(0);
    setCashOnHand(0);
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Daily Data Entry</h1>
          <p className="text-slate-400 mt-1">Input all daily station data in one place.</p>
        </div>
        <Button onClick={handleSaveAll} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Save className="w-4 h-4" /> Save All Data
        </Button>
      </div>

      <Card className="bg-[#1a1d36] border-[#2d325a]">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-1">Station</label>
              <Select value={station} onChange={(e) => setStation(e.target.value as Station)}>
                {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PUMP READINGS */}
      <Card className="bg-[#1a1d36] border-[#2d325a]">
        <CardHeader>
          <CardTitle className="text-lg text-cyan-400">Pump Readings</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {pumps.map((pump, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end border-b border-[#2d325a]/50 pb-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Product</label>
                <Input value={pump.product || ''} disabled className="bg-[#0f1123]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Start Reading</label>
                <Input type="number" step="0.01" value={pump.startReading || ''} onChange={(e) => {
                  const newPumps = [...pumps];
                  newPumps[idx].startReading = parseFloat(e.target.value);
                  setPumps(newPumps);
                }} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Stop Reading</label>
                <Input type="number" step="0.01" value={pump.stopReading || ''} onChange={(e) => {
                  const newPumps = [...pumps];
                  newPumps[idx].stopReading = parseFloat(e.target.value);
                  setPumps(newPumps);
                }} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Rate (Ksh/L)</label>
                <Input type="number" step="0.01" value={pump.ratePerLitre || ''} onChange={(e) => {
                  const newPumps = [...pumps];
                  newPumps[idx].ratePerLitre = parseFloat(e.target.value);
                  setPumps(newPumps);
                }} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Manual Cash (Optional)</label>
                <Input type="number" step="0.01" value={pump.manualCash || ''} onChange={(e) => {
                  const newPumps = [...pumps];
                  newPumps[idx].manualCash = parseFloat(e.target.value);
                  setPumps(newPumps);
                }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LPG SALES */}
        <Card className="bg-[#1a1d36] border-[#2d325a]">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-cyan-400">LPG Sold</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setLpgSales([...lpgSales, { item: '6kg Cylinder', quantity: 0, amount: 0 }])}>
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {lpgSales.map((sale, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input placeholder="Item (e.g. 6kg Cylinder)" value={sale.item || ''} onChange={(e) => {
                    const newSales = [...lpgSales];
                    newSales[idx].item = e.target.value;
                    setLpgSales(newSales);
                  }} />
                </div>
                <div className="w-20">
                  <Input type="number" placeholder="Qty" value={sale.quantity || ''} onChange={(e) => {
                    const newSales = [...lpgSales];
                    newSales[idx].quantity = parseFloat(e.target.value);
                    setLpgSales(newSales);
                  }} />
                </div>
                <div className="w-28">
                  <Input type="number" placeholder="Amount" value={sale.amount || ''} onChange={(e) => {
                    const newSales = [...lpgSales];
                    newSales[idx].amount = parseFloat(e.target.value);
                    setLpgSales(newSales);
                  }} />
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                  setLpgSales(lpgSales.filter((_, i) => i !== idx));
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* LPG PURCHASES */}
        <Card className="bg-[#1a1d36] border-[#2d325a]">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-cyan-400">LPG Bought (COGS)</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setLpgPurchases([...lpgPurchases, { item: '6kg Cylinder', quantity: 0, amount: 0 }])}>
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {lpgPurchases.map((purchase, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input placeholder="Item (e.g. 6kg Cylinder)" value={purchase.item || ''} onChange={(e) => {
                    const newPurchases = [...lpgPurchases];
                    newPurchases[idx].item = e.target.value;
                    setLpgPurchases(newPurchases);
                  }} />
                </div>
                <div className="w-20">
                  <Input type="number" placeholder="Qty" value={purchase.quantity || ''} onChange={(e) => {
                    const newPurchases = [...lpgPurchases];
                    newPurchases[idx].quantity = parseFloat(e.target.value);
                    setLpgPurchases(newPurchases);
                  }} />
                </div>
                <div className="w-28">
                  <Input type="number" placeholder="Amount" value={purchase.amount || ''} onChange={(e) => {
                    const newPurchases = [...lpgPurchases];
                    newPurchases[idx].amount = parseFloat(e.target.value);
                    setLpgPurchases(newPurchases);
                  }} />
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                  setLpgPurchases(lpgPurchases.filter((_, i) => i !== idx));
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EXPENSES */}
        <Card className="bg-[#1a1d36] border-[#2d325a]">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-cyan-400">Expenses</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setExpenseRows([...expenseRows, { category: '', amount: 0 }])}>
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {expenseRows.map((expense, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input placeholder="Category (e.g. M-Pesa transfer)" value={expense.category || ''} onChange={(e) => {
                    const newRows = [...expenseRows];
                    newRows[idx].category = e.target.value;
                    setExpenseRows(newRows);
                  }} />
                </div>
                <div className="w-28">
                  <Input type="number" placeholder="Amount" value={expense.amount || ''} onChange={(e) => {
                    const newRows = [...expenseRows];
                    newRows[idx].amount = parseFloat(e.target.value);
                    setExpenseRows(newRows);
                  }} />
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                  setExpenseRows(expenseRows.filter((_, i) => i !== idx));
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* INVOICES */}
        <Card className="bg-[#1a1d36] border-[#2d325a]">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-cyan-400">Invoices & Debts</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setInvoiceRows([...invoiceRows, { customerName: '', totalAmount: 0, paidAmount: 0 }])}>
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {invoiceRows.map((invoice, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input placeholder="Customer Name" value={invoice.customerName || ''} onChange={(e) => {
                    const newRows = [...invoiceRows];
                    newRows[idx].customerName = e.target.value;
                    setInvoiceRows(newRows);
                  }} />
                </div>
                <div className="w-24">
                  <Input type="number" placeholder="Total" value={invoice.totalAmount || ''} onChange={(e) => {
                    const newRows = [...invoiceRows];
                    newRows[idx].totalAmount = parseFloat(e.target.value);
                    setInvoiceRows(newRows);
                  }} />
                </div>
                <div className="w-24">
                  <Input type="number" placeholder="Paid" value={invoice.paidAmount || ''} onChange={(e) => {
                    const newRows = [...invoiceRows];
                    newRows[idx].paidAmount = parseFloat(e.target.value);
                    setInvoiceRows(newRows);
                  }} />
                </div>
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                  setInvoiceRows(invoiceRows.filter((_, i) => i !== idx));
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* CASH POSITION */}
      <Card className="bg-[#1a1d36] border-[#2d325a]">
        <CardHeader>
          <CardTitle className="text-lg text-cyan-400">End of Day Cash Position</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-1">M-Pesa Balance</label>
              <Input type="number" placeholder="Ksh" value={mPesa || ''} onChange={(e) => setMPesa(parseFloat(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 block mb-1">Cash at Hand</label>
              <Input type="number" placeholder="Ksh" value={cashOnHand || ''} onChange={(e) => setCashOnHand(parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSaveAll} className="px-8 py-6 text-lg font-bold bg-emerald-600 hover:bg-emerald-700">
          <Save className="w-5 h-5 mr-2" /> Submit Daily Entry
        </Button>
      </div>
    </div>
  );
}
