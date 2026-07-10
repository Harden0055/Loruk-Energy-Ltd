import React, { useState, useMemo, useEffect } from 'react';
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
  useInvoicePayments,
  useProducts
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
import { setupPdfHeader, addPdfFooter } from '../lib/pdfTemplate';

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
  const { data: products } = useProducts();

  const uniqueProducts = useMemo(() => {
    return Object.values(
      (products || []).reduce((acc, p) => {
        const key = p.name.trim().toLowerCase();
        if (!acc[key]) acc[key] = p;
        return acc;
      }, {} as Record<string, any>)
    );
  }, [products]);

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
  const [deliveryProduct, setDeliveryProduct] = useState<string>('Diesel');
  const [deliveryLitres, setDeliveryLitres] = useState('');
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [deliverySuperAmount, setDeliverySuperAmount] = useState('');
  const [deliveryDieselAmount, setDeliveryDieselAmount] = useState('');
  const [deliveryRate, setDeliveryRate] = useState('');
  const [deliverySuperRate, setDeliverySuperRate] = useState('');
  const [deliveryDieselRate, setDeliveryDieselRate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDate, setAdjustDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjustReason, setAdjustReason] = useState('');

  const { data: productDefs } = useProducts();

  // Bidirectional calculations for CustomerDashboard:
  const handleProductTypeChange = (newProduct: string) => {
    setDeliveryRate('');
    setDeliverySuperRate('');
    setDeliveryDieselRate('');
    setDeliveryProduct(newProduct);
    setDeliveryLitres('');
    setDeliverySuperAmount('');
    setDeliveryDieselAmount('');
    setDeliveryAmount('');
  };

  const handleLitresChange = (newLitresStr: string) => {
    setDeliveryLitres(newLitresStr);
    const isSplit = deliveryProduct === 'Super/Diesel Split';
    if (isSplit) {
      const parts = newLitresStr.split('/');
      if (parts.length === 2) {
        const superL = (parseFloat(parts[0]) || 0) * 1000;
        const dieselL = (parseFloat(parts[1]) || 0) * 1000;
        
        let calculatedSuperAmount = deliverySuperAmount;
        let calculatedDieselAmount = deliveryDieselAmount;
        
        const sRate = parseFloat(deliverySuperRate) || 0;
        if (sRate > 0) {
          calculatedSuperAmount = String(Math.round(superL * sRate));
        } else if (parseFloat(deliverySuperAmount) > 0 && superL > 0) {
          setDeliverySuperRate((parseFloat(deliverySuperAmount) / superL).toFixed(2));
        }
        
        const dRate = parseFloat(deliveryDieselRate) || 0;
        if (dRate > 0) {
          calculatedDieselAmount = String(Math.round(dieselL * dRate));
        } else if (parseFloat(deliveryDieselAmount) > 0 && dieselL > 0) {
          setDeliveryDieselRate((parseFloat(deliveryDieselAmount) / dieselL).toFixed(2));
        }
        
        const sum = (parseFloat(calculatedSuperAmount) || 0) + (parseFloat(calculatedDieselAmount) || 0);
        setDeliverySuperAmount(calculatedSuperAmount);
        setDeliveryDieselAmount(calculatedDieselAmount);
        setDeliveryAmount(String(sum));
      }
    } else {
      const l = parseFloat(newLitresStr) || 0;
      const r = parseFloat(deliveryRate) || 0;
      if (l > 0 && r > 0) {
        setDeliveryAmount(String(Math.round(l * r)));
      } else if (l > 0 && parseFloat(deliveryAmount) > 0) {
        setDeliveryRate((parseFloat(deliveryAmount) / l).toFixed(2));
      }
    }
  };

  const handleRateChange = (newRateStr: string) => {
    setDeliveryRate(newRateStr);
    const l = parseFloat(deliveryLitres) || 0;
    const r = parseFloat(newRateStr) || 0;
    if (l > 0 && r > 0) {
      setDeliveryAmount(String(Math.round(l * r)));
    }
  };

  const handleTotalAmountChange = (newAmountStr: string) => {
    setDeliveryAmount(newAmountStr);
    const l = parseFloat(deliveryLitres) || 0;
    const amt = parseFloat(newAmountStr) || 0;
    if (l > 0 && amt > 0) {
      setDeliveryRate((amt / l).toFixed(2));
    }
  };

  const handleSuperRateChange = (newRateStr: string) => {
    setDeliverySuperRate(newRateStr);
    const parts = String(deliveryLitres).split('/');
    if (parts.length === 2) {
      const superL = (parseFloat(parts[0]) || 0) * 1000;
      const r = parseFloat(newRateStr) || 0;
      if (superL > 0 && r > 0) {
        const calculatedSuperAmount = String(Math.round(superL * r));
        setDeliverySuperAmount(calculatedSuperAmount);
        setDeliveryAmount(String((parseFloat(calculatedSuperAmount) || 0) + (parseFloat(deliveryDieselAmount) || 0)));
      }
    }
  };

  const handleDieselRateChange = (newRateStr: string) => {
    setDeliveryDieselRate(newRateStr);
    const parts = String(deliveryLitres).split('/');
    if (parts.length === 2) {
      const dieselL = (parseFloat(parts[1]) || 0) * 1000;
      const r = parseFloat(newRateStr) || 0;
      if (dieselL > 0 && r > 0) {
        const calculatedDieselAmount = String(Math.round(dieselL * r));
        setDeliveryDieselAmount(calculatedDieselAmount);
        setDeliveryAmount(String((parseFloat(deliverySuperAmount) || 0) + (parseFloat(calculatedDieselAmount) || 0)));
      }
    }
  };

  const handleSuperAmountChange = (newAmountStr: string) => {
    setDeliverySuperAmount(newAmountStr);
    const parts = String(deliveryLitres).split('/');
    if (parts.length === 2) {
      const superL = (parseFloat(parts[0]) || 0) * 1000;
      const amt = parseFloat(newAmountStr) || 0;
      if (superL > 0 && amt > 0) {
        setDeliverySuperRate((amt / superL).toFixed(2));
      }
    }
    setDeliveryAmount(String((parseFloat(newAmountStr) || 0) + (parseFloat(deliveryDieselAmount) || 0)));
  };

  const handleDieselAmountChange = (newAmountStr: string) => {
    setDeliveryDieselAmount(newAmountStr);
    const parts = String(deliveryLitres).split('/');
    if (parts.length === 2) {
      const dieselL = (parseFloat(parts[1]) || 0) * 1000;
      const amt = parseFloat(newAmountStr) || 0;
      if (dieselL > 0 && amt > 0) {
        setDeliveryDieselRate((amt / dieselL).toFixed(2));
      }
    }
    setDeliveryAmount(String((parseFloat(deliverySuperAmount) || 0) + (parseFloat(newAmountStr) || 0)));
  };

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
        description: d.productType === 'Super/Diesel Split' ? `Delivered ${(d.superLitres || 0)/1000}/${(d.dieselLitres || 0)/1000}L split` : ['lpg', 'lubricant'].some(str => d.productType.toLowerCase().includes(str)) ? `Delivered ${d.productType}` : `Delivered ${d.litres.toLocaleString()}L of ${d.productType}`,
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
      const tableRows = [...timelineEvents].sort((a,b) => b.date - a.date).map(e => [
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
    
    const isNonLiquid = deliveryProduct.toLowerCase().includes('lpg') || deliveryProduct.toLowerCase().includes('lubricant');
    const isSplit = deliveryProduct === 'Super/Diesel Split';
    
    if (!isSplit && ((!isNonLiquid && !deliveryLitres) || !deliveryAmount)) {
      alert('Please fill in required fields');
      return;
    }
    if (isSplit && (!deliveryLitres || !deliverySuperAmount || !deliveryDieselAmount)) {
      alert('Please fill in required split fields');
      return;
    }
    
    setModalLoading(true);
    try {
      let amt = parseFloat(deliveryAmount) || 0;
      let finalLitres = isNonLiquid ? 0 : parseFloat(deliveryLitres);
      let superL = 0;
      let dieselL = 0;
      let superA = 0;
      let dieselA = 0;
      
      if (isSplit) {
        const parts = String(deliveryLitres).split('/');
        if (parts.length === 2) {
          superL = parseFloat(parts[0]) * 1000;
          dieselL = parseFloat(parts[1]) * 1000;
          finalLitres = superL + dieselL;
        }
        superA = parseFloat(deliverySuperAmount) || 0;
        dieselA = parseFloat(deliveryDieselAmount) || 0;
        amt = superA + dieselA;
      }
      
      await createDelivery({
        customerId: customer.id,
        date: new Date(deliveryDate).getTime(),
        productType: deliveryProduct,
        litres: finalLitres,
        totalAmount: amt,
        ...(isSplit ? {
          superLitres: superL,
          dieselLitres: dieselL,
          superAmount: superA,
          dieselAmount: dieselA
        } : {}),
        createdBy: user?.email || 'Unknown'
      }, user?.email || 'Unknown');

      // Update customer balance & purchases volume
      await updateCustomer(customer.id, {}, { balance: amt, totalPurchases: amt }, user?.email || 'Unknown');

      setActiveModal(null);
      setDeliveryLitres('');
      setDeliveryAmount('');
      setDeliverySuperAmount('');
      setDeliveryDieselAmount('');
      setDeliveryRate('');
      setDeliverySuperRate('');
      setDeliveryDieselRate('');
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
      <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-xl border border-theme-border shadow-sm transition-colors">
        <ShieldAlert className="w-16 h-16 text-amber-500 animate-pulse mb-4" />
        <p className="text-lg font-semibold text-theme-text">Customer account record not found</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 border border-theme-border text-sm font-medium rounded-lg text-theme-text-muted hover:bg-gray-55 transition-colors cursor-pointer"
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
          className="px-4 py-2 glass-panel hover:bg-white/5 dark:hover:bg-blue-900 border border-theme-border text-theme-text-muted text-base font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          id="btn-customer-dash-back"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportStatement}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-base font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            id="btn-customer-dash-export-pdf"
          >
            <Download className="w-5 h-5" />
            Export Statement
          </button>
        </div>
      </div>

      {/* Customer Header Section */}
      <div className="glass-panel border border-theme-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-white/5 dark:text-theme-text-muted px-2.5 py-1 rounded-md font-bold border border-theme-border">
              {customer.customerId}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              customer.status === 'active' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shadow-[inset_0_0_8px_rgba(16,185,129,0.6)]' 
                : 'bg-red-100 text-red-800 dark:bg-red-950/45 dark:text-red-400 border border-red-200 dark:border-red-900'
            }`}>
              {customer.status === 'active' ? 'Active Account' : 'Credit Risk'}
            </span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{customer.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Account activated: <span className="text-gray-700 dark:text-gray-300">{format(customer.createdAt || Date.now(), 'PPP')}</span>
          </p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto p-2 bg-gradient-to-r from-blue-900/20 to-cyan-900/10 border border-blue-800/30 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveModal('delivery')}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Delivery
          </button>
          <button
            onClick={() => setActiveModal('payment')}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={() => setActiveModal('adjustment')}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
            Adjust Balance
          </button>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Balance */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
            <button
               onClick={verifyBalance}
               className="text-xs text-pink-500 font-bold hover:underline"
            >
              Verify
            </button>
            <div className="p-2 rounded-lg glow-blue-wrapper">
              <DollarSign className="w-5 h-5 glow-blue-icon" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black font-mono tracking-tight leading-none ${calculatedBalance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-pink-600 dark:text-pink-400'}`}>
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
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Allocation</p>
            <div className="p-2 rounded-lg glow-blue-wrapper">
              <FileText className="w-5 h-5 glow-blue-icon" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black font-mono text-gray-900 dark:text-white tracking-tight leading-none">
              {formatCurrency(customer.creditLimit)}
            </h3>
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Remaining credit power</span>
                <span className="font-mono text-gray-800 dark:text-white">{formatCurrency(remainingCredit)}</span>
              </div>
              <div className="h-1.5 glass-panel rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isCreditRisk ? 'bg-red-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(100, Math.max(0, (remainingCredit / (customer.creditLimit || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Purchases */}
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Deliveries</p>
            <div className="p-2 rounded-lg glow-blue-wrapper">
              <Truck className="w-5 h-5 glow-blue-icon" />
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
        <div className="glass-panel border border-theme-border rounded-xl p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Received Payments</p>
            <div className="p-2 rounded-lg glow-blue-wrapper">
              <CheckCircle className="w-5 h-5 glow-blue-icon" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
              {formatCurrency(totalPaymentsValue)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Combined statements with <span className="font-bold text-theme-text-muted">{customerPayments.length} receipts</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Cumulative Running Balance Trend */}
        <div className="lg:col-span-2 glass-panel border border-theme-border rounded-xl p-6 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Statement Ledger Trend Line</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Time-series tracking of outstanding balance evolution</p>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-theme-border">
              <TrendingUp className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span className="text-xs font-bold text-blue-800 dark:text-cyan-300 uppercase">Balance Scale</span>
            </div>
          </div>
          
          <div className="h-72 w-full relative overflow-hidden">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-dashed border-theme-border">
                Not enough transactions to map chart data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
        <div className="glass-panel border border-theme-border rounded-xl p-6 shadow-sm transition-colors">
          <div className="mb-6">
            <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Recent Activity Distribution</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Magnitude comparing customer payments to fuel orders</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 glass-panel rounded-xl border border-theme-border">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Opening Balance Context</span>
              <span className="text-sm font-mono font-bold text-theme-text">
                {customer.openingBalanceType === 'advance' ? '-' : ''}{formatCurrency(customer.openingBalance || 0)}
              </span>
            </div>
            
            <div className="pt-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-3 tracking-wider">Summary Indicators</p>
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Average Delivery Size</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {customerDeliveries.length ? formatCurrency(totalSalesValue / customerDeliveries.length) : 'N/A'}
                    </span>
                  </div>
                  <div className="h-1.5 glass-panel rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Average Payment Size</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {customerPayments.length ? formatCurrency(totalPaymentsValue / customerPayments.length) : 'N/A'}
                    </span>
                  </div>
                  <div className="h-1.5 glass-panel rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    <span>Total Activity Index</span>
                    <span className="font-semibold text-theme-text-muted">
                      {timelineEvents.length} items logged
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-theme-border text-center">
              <p className="text-xs text-cyan-500 dark:text-blue-400 font-bold hover:underline cursor-pointer flex justify-center items-center gap-1" onClick={handleExportStatement}>
                <Calendar className="w-3.5 h-3.5" /> Open printable timeline report
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Options & Transaction Log */}
      <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="p-6 border-b border-theme-border dark:bg-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-950 dark:text-blue-50 tracking-tight">Audit Statement & Transaction Timeline</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Detailed list of every payment, fuel delivery, and ledger override</p>
            </div>

            {/* Quick type filter */}
            <div className="flex flex-wrap gap-1 bg-black/5 dark:bg-white/5 border border-theme-border p-1 rounded-lg">
              {(['all', 'delivery', 'payment', 'adjustment'] as const).map(f => (
                <button
                   key={f}
                   onClick={() => setFilterType(f)}
                   className={`px-3 py-1 text-xs font-bold rounded-md uppercase transition-colors cursor-pointer ${
                     filterType === f 
                       ? 'bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] shadow-sm'
                       : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-blue-200'
                   }`}
                >
                  {f === 'all' ? 'All Logs' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced filters: search, date range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 py-2 border-t border-gray-202/60 border-theme-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 dark:text-blue-400" />
              <input 
                type="text"
                placeholder="Search description, author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border focus:border-theme-border dark:focus:border-theme-border rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-blue-400/75"
              />
            </div>
            
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border focus:border-theme-border dark:focus:border-theme-border rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none placeholder:text-blue-400/75"
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
                className="w-full px-3 py-2 bg-blue-50/50 dark:bg-white/5 border border-theme-border focus:border-theme-border dark:focus:border-theme-border rounded-lg text-sm text-gray-950 dark:text-blue-50 focus:outline-none placeholder:text-blue-400/75"
                placeholder="End Date"
                title="End Date"
              />
              <span className="absolute right-3 top-2.5 text-[9px] uppercase font-mono tracking-widest text-blue-500 dark:text-blue-400 pointer-events-none font-bold">End</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="dark:bg-transparent border-b border-theme-border transition-colors">
              <tr className="modern-tr">
                <th className="modern-th">Date & Time</th>
                <th className="modern-th">Activity</th>
                <th className="modern-th">Description</th>
                <th className="modern-th">Amount</th>
                <th className="modern-th">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-blue-900">
              {timelineEvents.length === 0 ? (
                <tr className="modern-tr">
                  <td colSpan={5} className="border border-theme-border px-6 py-12 text-center text-gray-500 dark:text-gray-405 text-base font-medium">
                    No matching activity logs registered for this filter set.
                  </td>
                </tr>
              ) : (
                timelineEvents.map(e => (
                  <tr key={e.id} className="hover:bg-white/5 dark:hover:bg-blue-900/40 transition-colors">
                    <td className="modern-td">
                      {format(e.date, 'dd-MMM-yyyy HH:mm')}
                    </td>
                    <td className="modern-td">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${
                          e.type === 'payment' 
                            ? "bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                            : "glow-blue-wrapper"
                        }`}>
                          {e.type === 'delivery' && <Truck className="w-4 h-4 glow-blue-icon" />}
                          {e.type === 'payment' && <DollarSign className="w-4 h-4 text-emerald-400 stroke-emerald-400 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />}
                          {e.type === 'adjustment' && <ArrowUpDown className="w-4 h-4 glow-blue-icon" />}
                        </div>
                        <span className="text-base font-bold text-theme-text">
                          {e.title}
                        </span>
                      </div>
                    </td>
                    <td className="border border-theme-border px-4 sm:px-6 py-4 text-base font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-[200px]" title={e.description}>
                      {e.description}
                    </td>
                    <td className={`border border-theme-border px-4 sm:px-6 py-4 text-right font-mono font-bold text-base whitespace-nowrap ${
                      e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit'))
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-emerald-600 dark:text-emerald-400 font-medium'
                    }`}>
                      {e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit')) ? '+' : '-'}
                      {formatCurrency(e.amount)}
                    </td>
                    <td className={`border border-theme-border px-4 sm:px-6 py-4 text-right font-mono font-bold text-base whitespace-nowrap ${
                      e.balanceAfter > 0
                        ? 'text-pink-600 dark:text-pink-400'
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddDelivery}>
              <div className="px-6 py-5 border-b border-theme-border bg-blue-100/50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Log Fuel Delivery</h3>
                  <p className="text-xs text-cyan-400 dark:text-theme-text-muted font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Fuel Product</label>
                  <select 
                    value={deliveryProduct}
                    onChange={e => handleProductTypeChange(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-blue-900 dark:text-blue-50 font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    {uniqueProducts.map(p => (
                      <option key={p.id} value={p.name} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">{p.name}</option>
                    ))}
                    {uniqueProducts.length === 0 && (
                      <>
                        <option value="Diesel" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Diesel</option>
                        <option value="Super (Premium)" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Super (Premium)</option>
                        <option value="Brake fluid" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Brake fluid</option>
                        <option value="Engine oil" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Engine oil</option>
                      </>
                    )}
                    <option value="Super/Diesel Split" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900">Super/Diesel Split</option>
                  </select>
                </div>
                
                {deliveryProduct === 'Super/Diesel Split' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Litres Split (Super/Diesel e.g. 7/3)</label>
                      <input 
                        type="text" required placeholder="e.g. 7/3"
                        value={deliveryLitres} onChange={e => handleLitresChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Multiplies digit by 1000 (e.g. 7/3 = 7000L Super, 3000L Diesel)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Super Rate (KES/L)</label>
                        <input 
                          type="number" step="0.01" placeholder="e.g. 200.00"
                          value={deliverySuperRate} onChange={e => handleSuperRateChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Diesel Rate (KES/L)</label>
                        <input 
                          type="number" step="0.01" placeholder="e.g. 180.00"
                          value={deliveryDieselRate} onChange={e => handleDieselRateChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Super Amount (KES)</label>
                        <input 
                          type="number" step="0.01" required placeholder="0.00"
                          value={deliverySuperAmount} onChange={e => handleSuperAmountChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Diesel Amount (KES)</label>
                        <input 
                          type="number" step="0.01" required placeholder="0.00"
                          value={deliveryDieselAmount} onChange={e => handleDieselAmountChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Total Amount (KES)</label>
                      <input 
                        type="number" step="1" required
                        value={deliveryAmount} onChange={e => handleTotalAmountChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {!['lpg', 'lubricant'].some(str => deliveryProduct.toLowerCase().includes(str)) ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Litres / Quantity *</label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={deliveryLitres}
                            onChange={e => handleLitresChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Rate (KES/L)</label>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="e.g. 195.50"
                            value={deliveryRate}
                            onChange={e => handleRateChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          />
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Total Amount Cost (KES) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={deliveryAmount}
                        onChange={e => handleTotalAmountChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-white/5 border-t border-theme-border flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-cyan-400 dark:text-theme-text-muted hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors"
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddPayment}>
              <div className="px-6 py-5 border-b border-theme-border bg-blue-100/50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Record Payment</h3>
                  <p className="text-xs text-cyan-400 dark:text-theme-text-muted font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Payment Amount (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-white/5 border-t border-theme-border flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-cyan-400 dark:text-theme-text-muted hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddAdjustment}>
              <div className="px-6 py-5 border-b border-theme-border bg-blue-100/50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Log Adjustment</h3>
                  <p className="text-xs text-cyan-400 dark:text-theme-text-muted font-medium pb-1">Manual Ledger Adjustment overriding standard log flows</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all shadow-sm ${
                        adjustType === 'credit'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                          : 'border-theme-border dark:border-theme-border text-blue-500 dark:text-blue-400 glass-panel hover:bg-blue-50 dark:hover:bg-blue-900/50'
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
                          : 'border-theme-border dark:border-theme-border text-blue-500 dark:text-blue-400 glass-panel hover:bg-blue-50 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      Debit (+)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Override Amount (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Adjustment Reason Explanation *</label>
                  <textarea 
                    required
                    placeholder="Enter context, memo, or invoice reason..."
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-100/50 dark:bg-white/5 border-t border-theme-border flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-cyan-400 dark:text-theme-text-muted hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
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
