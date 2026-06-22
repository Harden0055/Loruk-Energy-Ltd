import React, { useState, useMemo } from 'react';
import { 
  useCustomers, 
  useDeliveries, 
  usePayments, 
  useAdjustments, 
  createDelivery, 
  createPayment, 
  createAdjustment, 
  updateCustomer 
} from '../lib/db';
import { 
  useDailyInvoices,
  updateDailyInvoice,
  useInvoicePayments
} from '../lib/operationsDb';
import { formatCurrency, formatLitres } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  Truck, 
  DollarSign, 
  ArrowUpDown, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle, 
  HelpCircle, 
  Plus, 
  Calendar, 
  Search, 
  FileText,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CustomerDashboardProps {
  customerId: string;
  onBack: () => void;
}

export default function CustomerDashboard({ customerId, onBack }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { deliveries } = useDeliveries();
  const { payments } = usePayments();
  const { adjustments } = useAdjustments();
  const { invoices } = useDailyInvoices();
  const { payments: invoicePaymentsList } = useInvoicePayments();

  // Selected state
  const [filterType, setFilterType] = useState<'all' | 'delivery' | 'payment' | 'adjustment'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Verify balance utility
  const verifyBalance = () => {
    if (!customer) return;
    // Re-aggregate: Invoices total - Invoices paid
    const customerInvoices = invoices.filter(i => i.customerName === customer.name);
    const customerInvoicePayments = invoicePaymentsList.filter(p => p.customerName === customer.name);
    
    const invoiceTotal = customerInvoices.reduce((sum, i) => sum + (i.invoiceAmount || 0), 0);
    const paymentsTotal = customerInvoicePayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const adjustmentsTotal = customerAdjustments.reduce((sum, a) => sum + (a.type === 'debit' ? (a.amount || 0) : -(a.amount || 0)), 0);
    
    // This is a simplified logic based on the user request.
    const trueBalance = invoiceTotal - paymentsTotal + adjustmentsTotal;
    
    alert(`Verified Balance based on invoices: ${formatCurrency(trueBalance)}`);
  };

  // Quick action modals
  const [activeModal, setActiveModal] = useState<'delivery' | 'payment' | 'adjustment' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Modal input states
  const [deliveryProduct, setDeliveryProduct] = useState<'Diesel' | 'Super'>('Diesel');
  const [deliveryLitres, setDeliveryLitres] = useState('');
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDate, setAdjustDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjustReason, setAdjustReason] = useState('');

  // Retrieve current customer
  const customer = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customers, customerId]);

  // Aggregate Customer Data
  const customerDeliveries = useMemo(() => {
    return deliveries.filter(d => d.customerId === customerId);
  }, [deliveries, customerId]);

  const customerPayments = useMemo(() => {
    return payments.filter(p => p.customerId === customerId);
  }, [payments, customerId]);

  const customerAdjustments = useMemo(() => {
    return adjustments.filter(a => a.customerId === customerId);
  }, [adjustments, customerId]);

  // Unified unified transaction log
  const textMatches = (text: string, search: string) => {
    return text.toLowerCase().includes(search.toLowerCase());
  };

  const calculatedBalance = useMemo(() => {
    if (!customer) return 0;
    let balance = customer.openingBalance 
      ? (customer.openingBalanceType === 'advance' ? -customer.openingBalance : customer.openingBalance) 
      : 0;
    
    // Add all deliveries
    customerDeliveries.forEach(d => { balance += (d.totalAmount || 0); });
    
    // Subtract all payments
    customerPayments.forEach(p => { balance -= (p.amount || 0); });
    
    // Adjust for adjustments
    customerAdjustments.forEach(a => {
        balance += (a.type === 'debit' ? (a.amount || 0) : -(a.amount || 0));
    });

    return balance;
  }, [customer, customerDeliveries, customerPayments, customerAdjustments]);

  const timelineEvents = useMemo(() => {
    const allEvents: Array<{
      id: string;
      date: number;
      type: 'delivery' | 'payment' | 'adjustment';
      title: string;
      description: string;
      amount: number;
      createdBy: string;
      val: number;
      balanceAfter: number;
      sortOrder: number;
    }> = [];

    const transactions = [
      ...customerDeliveries.map(d => ({ 
        id: `del-${d.id}`, 
        date: d.date, 
        type: 'delivery' as const, 
        title: 'Fuel Delivery',
        description: `Delivered ${d.litres.toLocaleString()}L of ${d.productType}`,
        amount: d.totalAmount, 
        val: d.totalAmount,
        createdBy: d.createdBy || 'System',
        sortOrder: 1
      })),
      ...customerPayments.map(p => ({ 
        id: `pay-${p.id}`, 
        date: p.date, 
        type: 'payment' as const, 
        title: 'Payment Received',
        description: 'Payment processed successfully',
        amount: p.amount, 
        val: -p.amount,
        createdBy: p.createdBy || 'System',
        sortOrder: 2
      })),
      ...customerAdjustments.map(a => ({ 
        id: `adj-${a.id}`, 
        date: a.date, 
        type: 'adjustment' as const, 
        title: a.type === 'credit' ? 'Balance Credit' : 'Balance Debit',
        description: a.description || 'Account Adjustment',
        amount: a.amount, 
        val: a.type === 'debit' ? a.amount : -a.amount,
        createdBy: a.createdBy || 'System',
        sortOrder: 3
      }))
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      return a.sortOrder - b.sortOrder;
    }); 

    let runningBalance = customer?.openingBalance 
      ? (customer.openingBalanceType === 'advance' ? -customer.openingBalance : customer.openingBalance) 
      : 0;

    const eventsWithBalance = transactions.map(t => {
      runningBalance += t.val;
      return { ...t, balanceAfter: runningBalance };
    });

    return eventsWithBalance
      .filter(e => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        
        if (searchTerm.trim() !== '') {
          const matchTitle = textMatches(e.title, searchTerm);
          const matchDesc = textMatches(e.description, searchTerm);
          const matchUser = textMatches(e.createdBy, searchTerm);
          if (!matchTitle && !matchDesc && !matchUser) return false;
        }

        if (startDate) {
          const startMs = new Date(startDate).getTime();
          if (e.date < startMs) return false;
        }

        if (endDate) {
          const endMs = new Date(endDate).getTime() + 86400000; // end of day
          if (e.date > endMs) return false;
        }

        return true;
      })
      .reverse();
  }, [customerDeliveries, customerPayments, customerAdjustments, filterType, searchTerm, startDate, endDate, customer]);

  // Compute stats for charts and display
  const totalFuelLitres = useMemo(() => {
    return customerDeliveries.reduce((sum, d) => sum + d.litres, 0);
  }, [customerDeliveries]);

  const totalSalesValue = useMemo(() => {
    return customerDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
  }, [customerDeliveries]);

  const totalPaymentsValue = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [customerPayments]);

  const remainingCredit = useMemo(() => {
    if (!customer) return 0;
    const limit = customer.creditLimit || 0;
    const bal = customer.balance || 0;
    return Math.max(0, limit - bal);
  }, [customer]);

  // Chart data generation (Last 15 chronological transactions or chronological trends)
  const chartData = useMemo(() => {
    // Generate running balance history in chronological order
    const chronologicalEvents = [
      ...customerDeliveries.map(d => ({ date: d.date, type: 'delivery', val: d.totalAmount })),
      ...customerPayments.map(p => ({ date: p.date, type: 'payment', val: -(p.amount || 0) })),
      ...customerAdjustments.map(a => ({ date: a.date, type: 'adjustment', val: a.type === 'debit' ? a.amount : -a.amount }))
    ].sort((a, b) => a.date - b.date);

    let runningBalance = customer?.openingBalance 
      ? (customer.openingBalanceType === 'advance' ? -customer.openingBalance : customer.openingBalance) 
      : 0;

    const data = chronologicalEvents.map((ev, index) => {
      runningBalance += ev.val;
      return {
        name: format(ev.date, 'MMM dd'),
        Timestamp: ev.date,
        'Running Balance': runningBalance,
        'Transaction Value': Math.abs(ev.val),
        type: ev.type,
      };
    });

    return data.slice(-12); // Limit to last 12 history points for readability
  }, [customerDeliveries, customerPayments, customerAdjustments, customer]);

  // PDF Export statement
  const handleExportStatement = async () => {
    if (!customer) return;
    try {
      const doc = new jsPDF();
      const { setupPdfHeader, addPdfFooter } = await import('../lib/pdfTemplate');

      let currentY = await setupPdfHeader({
        doc,
        title: 'CUSTOMER STATEMENT',
        leftBoxLines: [
          'Loruk Energy Limited',
          'T/A Sales & Distribution',
          'P.O BOX 342',
          `Customer ID: ${customer.customerId}`,
          `Customer Name: ${customer.name}`
        ],
        rightBoxLines: [
          { label: 'Outstanding Bal :', value: `KES ${customer.balance.toLocaleString()}` },
          { label: 'Total Purchases :', value: `KES ${totalSalesValue.toLocaleString()}` },
          { label: 'Total Payments :', value: `KES ${totalPaymentsValue.toLocaleString()}` },
          { label: 'Total Litres :', value: formatLitres(totalFuelLitres) }
        ]
      });

      // Line item table
      const tableHeaders = [['Date', 'Transaction Type', 'Description', 'Amount (KES)', 'Closing Balance (KES)']];
      const tableRows = [...timelineEvents].sort((a,b) => a.date - b.date).map(e => [
        format(e.date, 'yyyy-MM-dd'),
        e.title,
        e.description,
        `${e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit')) ? '+' : '-'}${e.amount.toLocaleString()}`,
        e.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        styles: { fontSize: 9 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });

      // Add summary section (Total Balance)
      let summaryY = (doc as any).lastAutoTable.finalY + 10;
      if (summaryY + 20 > 270) {
        doc.addPage();
        summaryY = 20;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(14, summaryY, 182, 14, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      
      const balanceValText = customer.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      doc.text(`Total Balance (KES) :   ${balanceValText}`, 192, summaryY + 9, { align: 'right' });

      // @ts-ignore
      addPdfFooter(doc, summaryY + 14 + 10);

      doc.save(`Statement_${customer.customerId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Could not download statement: ' + err);
    }
  };

  // Submit handers for quick operations
  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const litresVal = parseFloat(deliveryLitres);
    const amountVal = parseFloat(deliveryAmount);
    if (!litresVal || !amountVal) {
      alert('Please fill in Litres and Amount');
      return;
    }

    setModalLoading(true);
    try {
      await createDelivery({
        customerId: customer.id,
        date: new Date(deliveryDate).getTime(),
        productType: deliveryProduct,
        litres: litresVal,
        totalAmount: amountVal,
        createdBy: user?.email || 'Unknown'
      }, user?.email || 'Unknown');

      // Update customer balance & purchases volume
      await updateCustomer(customer.id, {}, { balance: amountVal, totalPurchases: amountVal }, user?.email || 'Unknown');

      setActiveModal(null);
      setDeliveryLitres('');
      setDeliveryAmount('');
    } catch (err) {
      console.error(err);
      alert('Error recording delivery');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const amountVal = parseFloat(paymentAmount);
    if (!amountVal || amountVal <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setModalLoading(true);
    try {
      // 1. Find the first unpaid invoice for this customer
      const invoice = invoices.find(i => i.customerName === customer.name && i.balance > 0);
      
      const paymentPromises = [
        createPayment({
          customerId: customer.id,
          date: new Date(paymentDate).getTime(),
          amount: amountVal,
          createdBy: user?.email || 'Unknown'
        }, user?.email || 'Unknown'),
        updateCustomer(customer.id, {}, { balance: -amountVal }, user?.email || 'Unknown')
      ];

      // 2. If invoice found, update it
      if (invoice) {
        const newPaidAmount = Math.min(invoice.invoiceAmount, (invoice.paidAmount || 0) + amountVal);
        const newBalance = invoice.invoiceAmount - newPaidAmount;
        
        paymentPromises.push(
            updateDailyInvoice(invoice.id!, {
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newBalance <= 0 ? 'PAID' : 'PARTIAL'
            })
        );
      }

      setActiveModal(null);
      setPaymentAmount('');

      await Promise.all(paymentPromises);
    } catch (err) {
      console.error(err);
      alert('Error recording payment');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const amountVal = parseFloat(adjustAmount);
    if (!amountVal || amountVal <= 0 || !adjustReason.trim()) {
      alert('Please enter progress amount and adjustment explanation');
      return;
    }

    setModalLoading(true);
    try {
      await createAdjustment({
        customerId: customer.id,
        date: new Date(adjustDate).getTime(),
        type: adjustType,
        amount: amountVal,
        description: adjustReason.trim(),
        createdBy: user?.uid ? 'Admin App' : (user?.email || 'Unknown')
      }, user?.email || 'Unknown');

      // Adjust customer balance
      const balChange = adjustType === 'debit' ? amountVal : -amountVal;
      const purchChange = adjustType === 'debit' ? amountVal : 0;
      await updateCustomer(customer.id, {}, { balance: balChange, totalPurchases: purchChange }, user?.email || 'Unknown');

      setActiveModal(null);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err) {
      console.error(err);
      alert('Error recording adjustment');
    } finally {
      setModalLoading(false);
    }
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-blue-950/40 rounded-xl border border-gray-200 dark:border-blue-900 shadow-sm transition-colors">
        <ShieldAlert className="w-16 h-16 text-amber-500 animate-pulse mb-4" />
        <p className="text-lg font-semibold text-gray-800 dark:text-blue-100">Customer account record not found</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 border border-gray-300 dark:border-blue-800 text-sm font-medium rounded-lg text-gray-700 dark:text-blue-200 hover:bg-gray-55 transition-colors cursor-pointer"
        >
          Return to Customer List
        </button>
      </div>
    );
  }

  const isCreditRisk = customer.status === 'credit_risk' || customer.balance > customer.creditLimit;

  return (
    <div className="space-y-6">
      {/* Back & Export Statement navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white dark:bg-blue-950/80 hover:bg-gray-50 dark:hover:bg-blue-900 border border-gray-200 dark:border-blue-900 text-gray-700 dark:text-blue-200 text-base font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          id="btn-customer-dash-back"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportStatement}
            className="px-4 py-2.5 bg-blue-100/75 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-lg text-base font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            id="btn-customer-dash-export-pdf"
          >
            <Download className="w-5 h-5" />
            Export Statement
          </button>
        </div>
      </div>

      {/* Customer Header Section */}
      <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded-md font-bold border border-blue-200/50 dark:border-blue-800">
              {customer.customerId}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              customer.status === 'active' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' 
                : 'bg-red-100 text-red-800 dark:bg-red-950/45 dark:text-red-400 border border-red-200 dark:border-red-900'
            }`}>
              {customer.status === 'active' ? 'Active Account' : 'Credit Risk'}
            </span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-blue-50 tracking-tight">{customer.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Account activated: <span className="text-gray-700 dark:text-gray-300">{format(customer.createdAt || Date.now(), 'PPP')}</span>
          </p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveModal('delivery')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-blue-600/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Delivery
          </button>
          <button
            onClick={() => setActiveModal('payment')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-emerald-600/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={() => setActiveModal('adjustment')}
            className="px-4 py-2.5 bg-slate-100 dark:bg-blue-900/60 hover:bg-slate-200 dark:hover:bg-blue-800 text-gray-800 dark:text-blue-200 font-semibold text-sm rounded-lg border border-gray-200 dark:border-blue-800 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
            Adjust Balance
          </button>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Balance */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
            <button
               onClick={verifyBalance}
               className="text-xs text-blue-600 font-bold hover:underline"
            >
              Verify
            </button>
            <div className={`p-2 rounded-lg ${calculatedBalance < 0 ? 'bg-emerald-100/70 dark:bg-emerald-950/45' : 'bg-blue-50 dark:bg-blue-900/35'}`}>
              <DollarSign className={`w-5 h-5 ${calculatedBalance < 0 ? 'text-emerald-600' : 'text-blue-600'}`} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black font-mono tracking-tight leading-none ${
              calculatedBalance > 0 
                ? 'text-red-600 dark:text-red-400' 
                : calculatedBalance < 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-gray-900 dark:text-blue-100'
            }`}>
              {formatCurrency(calculatedBalance)}
            </h3>
            {calculatedBalance < 0 ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle className="w-3.5 h-3.5" /> Advance Balance Credit
              </p>
            ) : isCreditRisk ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert className="w-3.5 h-3.5 animate-bounce" /> Credit Limit Alert!
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">
                Active customer outstanding balance.
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Credit Limit & remaining space */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Allocation</p>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/35 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black font-mono text-gray-900 dark:text-blue-50 tracking-tight leading-none">
              {formatCurrency(customer.creditLimit)}
            </h3>
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Remaining credit power</span>
                <span className="font-mono text-gray-800 dark:text-blue-250">{formatCurrency(remainingCredit)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isCreditRisk ? 'bg-red-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(100, Math.max(0, (remainingCredit / (customer.creditLimit || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Purchases */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Deliveries</p>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 border border-blue-200/40 dark:border-blue-800/40">
              <Truck className="w-5 h-5 hover:scale-100 transition-transform" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-tight leading-none">
              {formatCurrency(totalSalesValue)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Dispensed total <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{totalFuelLitres.toLocaleString()} Litres</span>.
            </p>
          </div>
        </div>

        {/* Card 4: Total Payments Received */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Received Payments</p>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
              {formatCurrency(totalPaymentsValue)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Combined statements with <span className="font-bold text-gray-700 dark:text-blue-300">{customerPayments.length} receipts</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Cumulative Running Balance Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-6 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Statement Ledger Trend Line</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Time-series tracking of outstanding balance evolution</p>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/40 px-3 py-1.5 rounded-lg border border-blue-200/50 dark:border-blue-800">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-800 dark:text-blue-350 uppercase">Balance Scale</span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-gray-50/50 dark:bg-blue-900/10 rounded-lg border border-dashed border-gray-200 dark:border-blue-900/50">
                Not enough transactions to map chart data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="name" fontSize={11} stroke="#9CA3AF" tickLine={false} />
                  <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={(v) => `K${v/1000}k`} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, 'Ledger Balance']}
                    contentStyle={{ borderRadius: '8px', zIndex: 100 }}
                  />
                  <Area type="monotone" dataKey="Running Balance" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#balanceGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Transaction Volume Distribution */}
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl p-6 shadow-sm transition-colors">
          <div className="mb-6">
            <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Recent Activity Distribution</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Magnitude comparing customer payments to fuel orders</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-blue-900/20 rounded-xl border border-gray-100 dark:border-blue-900/50">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Opening Balance Context</span>
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-blue-100">
                {customer.openingBalanceType === 'advance' ? '-' : ''}{formatCurrency(customer.openingBalance || 0)}
              </span>
            </div>
            
            <div className="pt-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-3 tracking-wider">Summary Indicators</p>
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Average Delivery Size</span>
                    <span className="font-mono">
                      {customerDeliveries.length ? formatCurrency(totalSalesValue / customerDeliveries.length) : 'N/A'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-blue-900/30 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Average Payment Size</span>
                    <span className="font-mono">
                      {customerPayments.length ? formatCurrency(totalPaymentsValue / customerPayments.length) : 'N/A'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-blue-900/30 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Total Activity Index</span>
                    <span className="font-semibold text-gray-800 dark:text-blue-200">
                      {timelineEvents.length} items logged
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-blue-900 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex justify-center items-center gap-1" onClick={handleExportStatement}>
                <Calendar className="w-3.5 h-3.5" /> Open printable timeline report
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Options & Transaction Log */}
      <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-blue-900 bg-gray-50/50 dark:bg-blue-900/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Audit Statement & Transaction Timeline</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Detailed list of every payment, fuel delivery, and ledger override</p>
            </div>

            {/* Quick type filter */}
            <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-blue-900/30 p-1 rounded-lg">
              {(['all', 'delivery', 'payment', 'adjustment'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1 text-xs font-bold rounded-md uppercase transition-colors cursor-pointer ${
                    filterType === f 
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-blue-200'
                  }`}
                >
                  {f === 'all' ? 'All Logs' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced filters: search, date range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 py-2 border-t border-gray-202/60 dark:border-blue-900/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 dark:text-blue-400" />
              <input 
                type="text"
                placeholder="Search description, author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-blue-400/75"
              />
            </div>
            
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none placeholder:text-blue-400/75"
                placeholder="Start Date"
                title="Start Date"
              />
              <span className="absolute right-3 top-2.5 text-[9px] uppercase font-mono tracking-widest text-blue-500 dark:text-blue-400 pointer-events-none font-bold">Start</span>
            </div>

            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none placeholder:text-blue-400/75"
                placeholder="End Date"
                title="End Date"
              />
              <span className="absolute right-3 top-2.5 text-[9px] uppercase font-mono tracking-widest text-blue-500 dark:text-blue-400 pointer-events-none font-bold">End</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-50 dark:bg-blue-900 border-b border-gray-200 dark:border-blue-900 transition-colors">
              <tr>
                <th className="border border-gray-200 dark:border-blue-900 px-6 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                <th className="border border-gray-200 dark:border-blue-900 px-6 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider whitespace-nowrap w-48">Activity</th>
                <th className="border border-gray-200 dark:border-blue-900 px-6 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider w-64">Description</th>
                <th className="border border-gray-200 dark:border-blue-900 px-6 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-right w-48 animate-fade-in">Amount</th>
                <th className="border border-gray-200 dark:border-blue-900 px-6 py-3 font-semibold text-blue-900 dark:text-blue-100/90 text-xs uppercase tracking-wider text-right w-48 animate-fade-in">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {timelineEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-200 dark:border-blue-900 px-6 py-12 text-center text-gray-500 dark:text-gray-405 text-base font-medium">
                    No matching activity logs registered for this filter set.
                  </td>
                </tr>
              ) : (
                timelineEvents.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/40 transition-colors">
                    <td className="border border-gray-200 dark:border-blue-900 px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono font-medium whitespace-nowrap">
                      {format(e.date, 'dd-MMM-yyyy HH:mm')}
                    </td>
                    <td className="border border-gray-200 dark:border-blue-900 px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${
                          e.type === 'delivery' 
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' 
                            : e.type === 'payment' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                              : 'bg-blue-50 dark:bg-blue-900/35 text-blue-600'
                        }`}>
                          {e.type === 'delivery' && <Truck className="w-4 h-4" />}
                          {e.type === 'payment' && <DollarSign className="w-4 h-4" />}
                          {e.type === 'adjustment' && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                        <span className="text-base font-bold text-gray-900 dark:text-blue-100">
                          {e.title}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-200 dark:border-blue-900 px-6 py-4 text-base font-medium text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={e.description}>
                      {e.description}
                    </td>
                    <td className={`border border-gray-200 dark:border-blue-900 px-6 py-4 text-right font-mono font-bold text-base whitespace-nowrap ${
                      e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit'))
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400 font-medium'
                    }`}>
                      {e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit')) ? '+' : '-'}
                      {formatCurrency(e.amount)}
                    </td>
                    <td className={`border border-gray-200 dark:border-blue-900 px-6 py-4 text-right font-mono font-bold text-base whitespace-nowrap ${
                      e.balanceAfter > 0
                        ? 'text-red-600 dark:text-red-400'
                        : e.balanceAfter < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {formatCurrency(e.balanceAfter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK MODALS MAP */}
      {activeModal === 'delivery' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddDelivery}>
              <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Log Fuel Delivery</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Fuel Product</label>
                  <select 
                    value={deliveryProduct}
                    onChange={e => setDeliveryProduct(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-900 dark:text-blue-50 font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Super">Super (Premium)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Litres Volume *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={deliveryLitres}
                    onChange={e => setDeliveryLitres(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Total Amount Cost (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={deliveryAmount}
                    onChange={e => setDeliveryAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors"
                >
                  Save Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'payment' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddPayment}>
              <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Record Payment</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Payment Amount (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'adjustment' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-blue-200 dark:border-blue-800 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddAdjustment}>
              <div className="px-6 py-5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Log Adjustment</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium pb-1">Manual Ledger Adjustment overriding standard log flows</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all shadow-sm ${
                        adjustType === 'credit'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                          : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 bg-white dark:bg-blue-950 hover:bg-blue-50 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      Credit (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all shadow-sm ${
                        adjustType === 'debit'
                          ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 ring-2 ring-red-500/10'
                          : 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 bg-white dark:bg-blue-950 hover:bg-blue-50 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      Debit (+)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Override Amount (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">Adjustment Reason Explanation *</label>
                  <textarea 
                    required
                    placeholder="Enter context, memo, or invoice reason..."
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-bold shadow-md shadow-slate-500/20 disabled:opacity-50 transition-colors"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
