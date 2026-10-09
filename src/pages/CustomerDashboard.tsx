import React, { useState, useMemo, useEffect } from 'react';
import { 
  useCustomers, 
  useDeliveries, 
  usePayments, 
  useAdjustments, 
  createDelivery, 
  createPayment, 
  createAdjustment,
  updateAdjustment, 
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
  Wallet,
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

// Precise date parser that avoids UTC midnight timezone rollback
const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr) return Date.now();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    // Midday (12:00:00) prevents any timezone boundary shifting across days
    return new Date(y, m, d, 12, 0, 0).getTime();
  }
  return new Date(dateStr).getTime() || Date.now();
};

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
  const [sortStrategy, setSortStrategy] = useState<'newest' | 'oldest'>('newest');
  const [showCharts, setShowCharts] = useState(false);

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
  const [activeModal, setActiveModal] = useState<'delivery' | 'payment' | 'adjustment' | 'edit_adjustment' | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<any>(null);
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

  useEffect(() => {
    if (activeModal === 'delivery' && customerId && deliveryProduct) {
      if (deliveryProduct !== 'Super/Diesel Split') {
        const savedRate = localStorage.getItem(`customer_rate_${customerId}_${deliveryProduct}`);
        if (savedRate) setDeliveryRate(savedRate);
      } else {
        const savedSuper = localStorage.getItem(`customer_super_rate_${customerId}`);
        if (savedSuper) setDeliverySuperRate(savedSuper);
        
        const savedDiesel = localStorage.getItem(`customer_diesel_rate_${customerId}`);
        if (savedDiesel) setDeliveryDieselRate(savedDiesel);
      }
    }
  }, [customerId, deliveryProduct, activeModal]);

  useEffect(() => {
    if (activeModal === 'delivery' && customerId && deliveryProduct && deliveryRate) {
      if (deliveryProduct !== 'Super/Diesel Split') {
        localStorage.setItem(`customer_rate_${customerId}_${deliveryProduct}`, deliveryRate);
      }
    }
  }, [customerId, deliveryProduct, deliveryRate, activeModal]);

  useEffect(() => {
    if (activeModal === 'delivery' && customerId && deliverySuperRate) {
      localStorage.setItem(`customer_super_rate_${customerId}`, deliverySuperRate);
    }
  }, [customerId, deliverySuperRate, activeModal]);

  useEffect(() => {
    if (activeModal === 'delivery' && customerId && deliveryDieselRate) {
      localStorage.setItem(`customer_diesel_rate_${customerId}`, deliveryDieselRate);
    }
  }, [customerId, deliveryDieselRate, activeModal]);

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
    const rawTransactions = [
      ...customerDeliveries.map(d => ({ 
        id: `del-${d.id}`, 
        date: d.date, 
        createdAt: d.createdAt,
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
        createdAt: p.createdAt,
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
        createdAt: a.createdAt,
        type: 'adjustment' as const, 
        title: a.type === 'credit' ? 'Balance Credit' : 'Balance Debit',
        description: a.description || 'Account Adjustment',
        amount: a.amount, 
        val: a.type === 'debit' ? a.amount : -a.amount,
        createdBy: a.createdBy || 'System',
        sortOrder: 3
      }))
    ];

    // Chronologically rearrange by calendar date, same-day transaction types (debits/deliveries first), then entry creation timestamp
    rawTransactions.sort((a, b) => {
      // 1. Primary: Compare calendar date (YYYY-MM-DD key)
      const dA = new Date(a.date);
      const dB = new Date(b.date);
      const keyA = dA.getFullYear() * 10000 + (dA.getMonth() + 1) * 100 + dA.getDate();
      const keyB = dB.getFullYear() * 10000 + (dB.getMonth() + 1) * 100 + dB.getDate();
      if (keyA !== keyB) return keyA - keyB;

      // 2. Secondary: Debits/deliveries first, then payments/credits, then adjustments
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

      // 3. Tertiary: Creation timestamp ascending (FIFO: first entered first)
      const cA = a.createdAt || a.date;
      const cB = b.createdAt || b.date;
      return cA - cB;
    });

    const openingBalanceVal = customer?.openingBalance 
      ? (customer.openingBalanceType === 'advance' ? -customer.openingBalance : customer.openingBalance) 
      : 0;

    let runningBalance = openingBalanceVal;

    const eventsWithBalance = rawTransactions.map(t => {
      runningBalance = Math.round((runningBalance + t.val) * 100) / 100;
      return { ...t, balanceAfter: runningBalance };
    });

    // If customer has an opening balance, include it at the start of the account statement
    const allEvents = customer && customer.openingBalance ? [
      {
        id: `opening-${customer.id}`,
        date: customer.createdAt ? Math.min(customer.createdAt, rawTransactions[0]?.date ? rawTransactions[0].date - 86400000 : customer.createdAt) : (rawTransactions[0]?.date ? rawTransactions[0].date - 86400000 : Date.now() - 30 * 86400000),
        createdAt: customer.createdAt || 0,
        type: 'opening' as const,
        title: 'Opening Balance',
        description: customer.openingBalanceType === 'advance' ? 'Opening Balance (Advance/Prepayment)' : 'Opening Balance (Brought Forward / Arrears)',
        amount: customer.openingBalance,
        val: openingBalanceVal,
        balanceAfter: openingBalanceVal,
        createdBy: customer.updatedBy || 'System',
        sortOrder: 0
      },
      ...eventsWithBalance
    ] : eventsWithBalance;

    const filtered = allEvents.filter(e => {
      if (filterType !== 'all') {
        if (e.type === 'opening') return true;
        if (e.type !== filterType) return false;
      }
      
      if (searchTerm.trim() !== '') {
        const matchTitle = textMatches(e.title, searchTerm);
        const matchDesc = textMatches(e.description, searchTerm);
        const matchUser = textMatches(e.createdBy, searchTerm);
        if (!matchTitle && !matchDesc && !matchUser) return false;
      }

      if (startDate) {
        const startMs = parseDateToTimestamp(startDate) - 43200000;
        if (e.date < startMs) return false;
      }

      if (endDate) {
        const endMs = parseDateToTimestamp(endDate) + 43200000;
        if (e.date > endMs) return false;
      }

      return true;
    });

    return sortStrategy === 'newest' ? [...filtered].reverse() : filtered;
  }, [customerDeliveries, customerPayments, customerAdjustments, filterType, searchTerm, startDate, endDate, customer, sortStrategy]);

  // Automated background synchronization so stored customer.balance matches calculated balance
  useEffect(() => {
    if (!customer) return;
    const trueBal = Math.round(calculatedBalance * 100) / 100;
    const storedBal = Math.round((customer.balance || 0) * 100) / 100;
    if (storedBal !== trueBal) {
      updateCustomer(customer.id, { balance: trueBal }, undefined, user?.email || 'System');
    }
  }, [customer, calculatedBalance, user]);

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
    const bal = calculatedBalance || 0;
    return Math.max(0, limit - bal);
  }, [customer, calculatedBalance]);

  // Chart data generation (Last 15 chronological transactions or chronological trends)
  const chartData = useMemo(() => {
    // Generate running balance history in chronological FIFO order
    const chronologicalEvents = [
      ...customerDeliveries.map(d => ({ date: d.date, createdAt: d.createdAt, sortOrder: 1, type: 'delivery', val: d.totalAmount })),
      ...customerPayments.map(p => ({ date: p.date, createdAt: p.createdAt, sortOrder: 2, type: 'payment', val: -(p.amount || 0) })),
      ...customerAdjustments.map(a => ({ date: a.date, createdAt: a.createdAt, sortOrder: 3, type: 'adjustment', val: a.type === 'debit' ? a.amount : -a.amount }))
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.sortOrder - b.sortOrder;
    });

    let runningBalance = customer?.openingBalance 
      ? (customer.openingBalanceType === 'advance' ? -customer.openingBalance : customer.openingBalance) 
      : 0;

    const data = chronologicalEvents.map((ev) => {
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
          { label: 'Outstanding Bal :', value: `KES ${calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: 'Total Purchases :', value: `KES ${totalSalesValue.toLocaleString()}` },
          { label: 'Total Payments :', value: `KES ${totalPaymentsValue.toLocaleString()}` },
          { label: 'Total Litres :', value: formatLitres(totalFuelLitres) }
        ]
      });

      // Line item table: strictly chronological order so closing balances rhyme with debit/credit sequentially
      const tableHeaders = [['Date', 'Transaction Type', 'Description', 'Amount (KES)', 'Closing Balance (KES)']];
      const eventsSorted = [...timelineEvents].sort((a, b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        const keyA = dA.getFullYear() * 10000 + (dA.getMonth() + 1) * 100 + dA.getDate();
        const keyB = dB.getFullYear() * 10000 + (dB.getMonth() + 1) * 100 + dB.getDate();
        if (keyA !== keyB) return keyA - keyB;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return (a.createdAt || a.date) - (b.createdAt || b.date);
      });
      const tableRows = eventsSorted.map(e => [
        format(e.date, 'yyyy-MM-dd'),
        e.title,
        e.description,
        e.type === 'opening'
          ? `${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit')) ? '+' : '-'}${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const e = eventsSorted[data.row.index];
            const isPurple = e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit'));
            
            // Amount Column (Index 3)
            if (data.column.index === 3) {
              if (isPurple) {
                data.cell.styles.textColor = [192, 38, 211]; // Fuchsia 600
                data.cell.styles.fillColor = [253, 244, 255]; // Fuchsia 50
              } else {
                data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
                data.cell.styles.fillColor = [236, 253, 244]; // Emerald 50
              }
            }
            // Balance Column (Index 4)
            if (data.column.index === 4) {
              if (e.balanceAfter > 0) {
                data.cell.styles.textColor = [192, 38, 211];
              } else if (e.balanceAfter < 0) {
                data.cell.styles.textColor = [5, 150, 105];
              }
            }
          }
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
      
      const balanceValText = calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        date: parseDateToTimestamp(deliveryDate),
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
          date: parseDateToTimestamp(paymentDate),
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

  
  const handleUpdateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !editingAdjustment) return;
    const amountVal = parseFloat(adjustAmount);
    if (!amountVal || amountVal <= 0 || !adjustReason.trim()) {
      alert('Please enter valid amount and adjustment explanation');
      return;
    }
    setModalLoading(true);
    try {
      const oldAmount = editingAdjustment.amount;
      const oldType = editingAdjustment.originalType; // credit or debit
      
      await updateAdjustment(editingAdjustment.id.replace('adj-', ''), {
        date: parseDateToTimestamp(adjustDate),
        type: adjustType,
        amount: amountVal,
        description: adjustReason.trim(),
      }, user?.email || 'Unknown');
      
      // Calculate delta to apply to customer balance
      let balanceChange = 0;
      // Revert old transaction effect
      if (oldType === 'credit') {
        balanceChange += oldAmount; // reverting a credit increases balance
      } else {
        balanceChange -= oldAmount; // reverting a debit decreases balance
      }
      
      // Apply new transaction effect
      if (adjustType === 'credit') {
        balanceChange -= amountVal; // new credit reduces balance
      } else {
        balanceChange += amountVal; // new debit increases balance
      }
      
      if (balanceChange !== 0) {
        await updateCustomer(customer.id, {}, { balance: balanceChange }, user?.email || 'Unknown');
      }
      
      setActiveModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      setEditingAdjustment(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update adjustment');
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
        date: parseDateToTimestamp(adjustDate),
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

  const isCreditRisk = customer.status === 'credit_risk' || calculatedBalance > customer.creditLimit;

  return (
    <div className="space-y-3">
      {/* Compressed Customer Profile Header & Quick Actions Bar */}
      <div className="glass-panel border border-white/[0.08] bg-[#000000] rounded-xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <button 
            onClick={onBack}
            className="px-2.5 py-1.5 glass-panel hover:bg-white/10 border border-theme-border text-theme-text-muted hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            id="btn-customer-dash-back"
            title="Return to customer list"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs uppercase tracking-wider bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-md font-bold border border-purple-500/30 shrink-0">
              {customer.customerId}
            </span>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
              {customer.name}
            </h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 ${
              customer.status === 'active' 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_#34D399]' : 'bg-rose-400'}`} />
              {customer.status === 'active' ? 'Active' : 'Credit Risk'}
            </span>
          </div>
        </div>

        {/* Action Triggers & PDF Export */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveModal('delivery')}
            className="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 hover:border-purple-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Log Delivery</span>
          </button>
          <button
            onClick={() => setActiveModal('payment')}
            className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setActiveModal('adjustment')}
            className="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 hover:border-purple-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
            <span>Adjust</span>
          </button>
          <button
            onClick={handleExportStatement}
            className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            id="btn-customer-dash-export-pdf"
            title="Download statement PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* Compressed Stats Row (4 compact columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Outstanding Balance */}
        <div className={`glass-panel rounded-xl px-3.5 py-2.5 shadow-sm border ${
          calculatedBalance < 0 
            ? 'border-emerald-500/40 bg-emerald-500/[0.04]' 
            : calculatedBalance > 0
              ? 'border-purple-500/40 bg-purple-500/[0.04]'
              : 'border-white/[0.08] bg-[#000000]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider">Outstanding Balance</span>
            <button
              onClick={verifyBalance}
              className="text-[9px] text-purple-300 hover:text-purple-200 font-bold px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 cursor-pointer"
              title="Verify Balance Calculation"
            >
              Verify
            </button>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-theme-text-muted">Ksh</span>
            <span className={`text-base sm:text-lg font-black font-mono tracking-tight leading-none ${
              calculatedBalance < 0 ? 'text-[#059669]' : isCreditRisk ? 'text-rose-400' : calculatedBalance > 0 ? 'text-[#7C3AED]' : 'text-slate-400'
            }`}>
              {Math.abs(calculatedBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[10px] truncate">
            {calculatedBalance < 0 ? (
              <span className="text-[#059669] font-bold">Advance Balance Credit</span>
            ) : isCreditRisk ? (
              <span className="text-rose-400 font-bold animate-pulse">Credit Limit Exceeded</span>
            ) : calculatedBalance > 0 ? (
              <span className="text-[#7C3AED] font-bold">Receivable Balance Owed</span>
            ) : (
              <span className="text-slate-400 font-bold">Settled (Nil Balance)</span>
            )}
          </div>
        </div>

        {/* Card 2: Credit Allocation - Neutral Grey */}
        <div className="glass-panel rounded-xl px-3.5 py-2.5 shadow-sm border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider">Credit Limit</span>
            <span className="text-[10px] font-mono text-gray-400 font-bold">
              Rem: Ksh {remainingCredit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-gray-400">Ksh</span>
            <span className="text-base sm:text-lg font-black font-mono text-gray-400 tracking-tight leading-none">
              {(customer.creditLimit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 bg-theme-panel rounded-full overflow-hidden border border-theme-border/60">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCreditRisk 
                  ? 'bg-rose-500' 
                  : remainingCredit > (customer.creditLimit || 1) * 0.5 
                    ? 'bg-gradient-to-r from-purple-500 to-emerald-400' 
                    : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (remainingCredit / (customer.creditLimit || 1)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Card 3: Total Deliveries - Purple */}
        <div className="glass-panel rounded-xl px-3.5 py-2.5 shadow-sm border border-purple-500/30 bg-purple-500/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider">Total Deliveries</span>
            <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/25">
              {totalFuelLitres.toLocaleString()} L
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-[#7C3AED]">Ksh</span>
            <span className="text-base sm:text-lg font-black font-mono text-[#7C3AED] tracking-tight leading-none">
              {totalSalesValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-theme-text-muted font-medium">
            {customerDeliveries.length} orders dispensed
          </div>
        </div>

        {/* Card 4: Total Payments Received - Deep Green */}
        <div className="glass-panel rounded-xl px-3.5 py-2.5 shadow-sm border border-emerald-500/30 bg-emerald-500/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider">Total Received</span>
            <span className="text-[10px] font-mono text-[#059669] font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/25">
              {customerPayments.length} receipts
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-[#059669]">Ksh</span>
            <span className="text-base sm:text-lg font-black font-mono text-[#059669] tracking-tight leading-none">
              {totalPaymentsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-[#059669]/90 font-medium">
            Settled via till & bank
          </div>
        </div>
      </div>

      {/* Collapsible Visual Analytics Segment (Expandable on click so it doesn't push the table down) */}
      <div className="flex items-center justify-between px-1">
        <button 
          type="button"
          onClick={() => setShowCharts(prev => !prev)}
          className="inline-flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-emerald-400 font-semibold transition-colors cursor-pointer py-0.5"
          title="Toggle chart visualization"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showCharts ? 'Hide Visual Charts' : 'View Visual Analytics & Trend Charts'}</span>
          <span className="text-[10px] text-theme-text-muted/70">({showCharts ? '▲ Click to collapse' : '▼ Click to expand'})</span>
        </button>
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Chart 1: Cumulative Running Balance Trend */}
          <div className="lg:col-span-2 glass-panel border border-theme-border rounded-xl p-4 shadow-sm transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-black text-theme-text tracking-tight">Statement Ledger Trend Line</h3>
                <p className="text-[11px] text-theme-text-muted">Time-series tracking of outstanding balance evolution</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Balance Scale</span>
              </div>
            </div>
            
            <div className="h-52 w-full relative overflow-hidden">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-theme-text-muted bg-white/[0.02] rounded-xl border border-dashed border-theme-border">
                  Not enough transactions to map chart data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00E676" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="name" fontSize={10} stroke="#94A3B8" tickLine={false} />
                    <YAxis fontSize={10} stroke="#94A3B8" tickFormatter={(v) => `K${Math.round(v/1000)}k`} tickLine={false} />
                    <Tooltip 
                      formatter={(val: any) => [`KES ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Ledger Balance']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.95)', 
                        borderColor: 'rgba(0, 230, 118, 0.4)',
                        borderRadius: '12px', 
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                        color: '#F8FAFC',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        zIndex: 100 
                      }}
                    />
                    <Area type="monotone" dataKey="Running Balance" stroke="#00E676" strokeWidth={2.5} fillOpacity={1} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Transaction Volume Distribution */}
          <div className="glass-panel border border-theme-border rounded-xl p-4 shadow-sm transition-colors flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-black text-theme-text tracking-tight">Recent Activity Distribution</h3>
                <p className="text-[11px] text-theme-text-muted">Magnitude comparing customer payments to fuel orders</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-2.5 glass-panel rounded-xl border border-theme-border bg-white/[0.02]">
                  <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">Opening Context</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                    customer.openingBalanceType === 'advance'
                      ? 'text-[#059669] bg-emerald-500/15 border-emerald-500/30'
                      : 'text-purple-300 bg-purple-500/15 border-purple-500/30'
                  }`}>
                    {customer.openingBalanceType === 'advance' ? '-' : '+'}Ksh {(customer.openingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-theme-text-muted">Avg Delivery</span>
                      <span className="font-mono font-bold text-purple-300">
                        {customerDeliveries.length ? `Ksh ${(totalSalesValue / customerDeliveries.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-theme-panel rounded-full overflow-hidden border border-theme-border/60">
                      <div className="h-full bg-gradient-to-r from-purple-800 via-purple-600 to-purple-400 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-theme-text-muted">Avg Payment</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {customerPayments.length ? `Ksh ${(totalPaymentsValue / customerPayments.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-theme-panel rounded-full overflow-hidden border border-theme-border/60">
                      <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-2.5 mt-2.5 border-t border-theme-border text-center">
              <button 
                type="button"
                className="text-xs text-[#7C3AED] hover:text-purple-300 font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 transition-all" 
                onClick={handleExportStatement}
              >
                <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Open statement PDF report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Options & Transaction Log Table - Compressed Header Toolbar */}
      <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="p-3 border-b border-theme-border bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-theme-text tracking-tight">Statement & Transaction Timeline</h3>
              <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
                {timelineEvents.length} items
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Strategy toggle */}
              <button
                type="button"
                onClick={() => setSortStrategy(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                  sortStrategy === 'newest'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-extrabold shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:bg-white/5'
                }`}
                title="Toggle chronological sorting. Currently showing latest transactions at the top."
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortStrategy === 'newest' ? 'Latest First' : 'Oldest First'}</span>
              </button>

              {/* Quick type filter */}
              <div className="flex flex-wrap gap-1 bg-theme-panel border border-theme-border p-0.5 rounded-lg">
                {(['all', 'delivery', 'payment', 'adjustment'] as const).map(f => {
                  const isActive = filterType === f;
                  let activeStyle = 'bg-white/10 text-white border-white/20 shadow-sm';
                  if (f === 'delivery') activeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]';
                  if (f === 'payment') activeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(0,230,118,0.2)]';
                  if (f === 'adjustment') activeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]';

                  return (
                    <button
                       key={f}
                       onClick={() => setFilterType(f)}
                       className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer border ${
                         isActive 
                           ? `${activeStyle} font-extrabold`
                           : 'border-transparent text-theme-text-muted hover:text-theme-text hover:bg-white/5'
                       }`}
                    >
                      {f === 'all' ? 'All Logs' : f}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Advanced filters: search, date range */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-theme-border/60">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
              <input 
                type="text"
                placeholder="Search description, author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-white/[0.04] border border-theme-border rounded-lg text-xs text-theme-text focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-theme-text-muted"
              />
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
              <span>Date:</span>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white/[0.04] border border-theme-border rounded-lg text-xs text-theme-text focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Start Date"
                title="Start Date"
              />
              <span>to</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white/[0.04] border border-theme-border rounded-lg text-xs text-theme-text focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="End Date"
                title="End Date"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="border-b border-theme-border">
              <tr className="modern-tr">
                <th className="modern-th">Date & Time</th>
                <th className="modern-th">Activity</th>
                <th className="modern-th">Description</th>
                <th className="modern-th text-right">Amount</th>
                <th className="modern-th text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {timelineEvents.length === 0 ? (
                <tr className="modern-tr">
                  <td colSpan={5} className="px-6 py-12 text-center text-theme-text-muted text-sm font-medium">
                    No matching activity logs registered for this filter set.
                  </td>
                </tr>
              ) : (
                timelineEvents.map(e => {
                  const isOpening = e.type === 'opening';
                  const isPurpleAmount = e.type === 'delivery' || (e.type === 'adjustment' && e.title.includes('Debit'));
                  return (
                    <tr key={e.id} className={`hover:bg-white/[0.04] transition-colors ${isOpening ? 'bg-white/[0.02] border-b-2 border-white/10' : ''}`}>
                      <td className="modern-td font-mono text-xs text-theme-text-muted">
                        {format(e.date, 'dd-MMM-yyyy')}
                      </td>
                      <td className="modern-td">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className={`p-1.5 rounded-lg transition-transform border ${
                              isOpening
                                ? (customer?.openingBalanceType === 'advance' 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)]' 
                                    : 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]')
                                : e.type === 'payment'
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                                  : e.type === 'delivery'
                                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                                    : e.title.includes('Credit')
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                                      : 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                            } ${e.type === 'adjustment' ? 'cursor-pointer hover:scale-110' : ''}`} 
                            onClick={() => {
                              if (e.type === 'adjustment') {
                                setEditingAdjustment({ ...e, originalType: e.title.includes('Credit') ? 'credit' : 'debit' });
                                setAdjustType(e.title.includes('Credit') ? 'credit' : 'debit');
                                setAdjustAmount(e.amount.toString());
                                setAdjustDate(format(e.date, 'yyyy-MM-dd'));
                                setAdjustReason(e.description);
                                setActiveModal('edit_adjustment');
                              }
                            }}
                            title={e.type === 'adjustment' ? "Click to edit override" : undefined}
                          >
                            {isOpening ? <Wallet className="w-4 h-4" /> : null}
                            {e.type === 'adjustment' ? <ArrowUpDown className="w-4 h-4" /> : null}
                            {e.type === 'delivery' ? <Truck className="w-4 h-4" /> : null}
                            {e.type === 'payment' ? <DollarSign className="w-4 h-4" /> : null}
                          </div>
                          <span className={`text-sm font-bold ${
                            isOpening 
                              ? (customer?.openingBalanceType === 'advance' ? 'text-[#059669]' : 'text-purple-300') 
                              : 'text-theme-text'
                          }`}>
                            {e.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-medium text-theme-text-muted truncate max-w-[150px] sm:max-w-[240px]" title={e.description}>
                        {e.description}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right font-mono font-bold text-sm whitespace-nowrap">
                        {isOpening ? (
                          <span className={customer?.openingBalanceType === 'advance' ? '!text-[#059669]' : '!text-[#9333EA]'}>
                            {customer?.openingBalanceType === 'advance' ? '-' : '+'}Ksh {e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : e.type === 'payment' ? (
                          <span className="!text-[#059669]">
                            -Ksh {e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className={isPurpleAmount ? '!text-[#9333EA]' : '!text-[#059669]'}>
                            {isPurpleAmount ? '+' : '-'}Ksh {e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right font-mono font-bold text-sm whitespace-nowrap">
                        {e.balanceAfter > 0 ? (
                          <span className="!text-[#9333EA]">
                            Ksh {e.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : e.balanceAfter < 0 ? (
                          <span className="!text-[#059669]">
                            -Ksh {Math.abs(e.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="!text-theme-text-muted font-bold">
                            Ksh 0.00
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="border-t-2 border-white/10 bg-white/[0.02]">
              <tr className="modern-tr">
                <td colSpan={3} className="px-4 sm:px-6 py-4 text-xs font-mono uppercase tracking-wider text-theme-text-muted">
                  Reconciliation Summary & Total Position
                </td>
                <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs text-theme-text-muted whitespace-nowrap">
                  <span className="block text-[10px] uppercase font-sans tracking-widest text-slate-400">Total Purchases</span>
                  <span className="!text-[#9333EA] font-mono font-bold">Ksh {totalSalesValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right font-mono font-black text-sm sm:text-base whitespace-nowrap">
                  <span className="block text-[10px] uppercase font-sans tracking-widest text-slate-400">Final Closing Balance</span>
                  <span className={calculatedBalance > 0 ? '!text-[#9333EA]' : calculatedBalance < 0 ? '!text-[#059669]' : '!text-white'}>
                    {calculatedBalance < 0 ? '-' : ''}Ksh {Math.abs(calculatedBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* QUICK MODALS MAP */}
      {activeModal === 'edit_adjustment' && editingAdjustment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#000000] rounded-2xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleUpdateAdjustment}>
              <div className="px-6 py-5 border-b border-white/10 bg-[#000000] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Ledger Override</h3>
                </div>
                <button type="button" onClick={() => { setActiveModal(null); setEditingAdjustment(null); }} className="p-1 px-2 text-[#A1A1AA] hover:text-white rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Adjustment Action *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAdjustType('credit')} className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${adjustType === 'credit' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.25)]' : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'}`}>
                       Credit (-)
                    </button>
                    <button type="button" onClick={() => setAdjustType('debit')} className={`px-4 py-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${adjustType === 'debit' ? 'bg-purple-500/15 border-purple-500 text-[#9333EA] shadow-[0_0_15px_rgba(147,51,234,0.25)]' : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'}`}>
                       Debit (+)
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 transition-colors ${adjustType === 'credit' ? 'text-emerald-400' : 'text-[#9333EA]'}`}>
                    Override Amount (KES) * {adjustType === 'credit' ? '(Credit - Deduct)' : '(Debit - Add)'}
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3.5 top-2.5 font-bold font-mono transition-colors ${adjustType === 'credit' ? 'text-emerald-400' : 'text-[#9333EA]'}`}>KSh</span>
                    <input 
                      type="number" 
                      required 
                      min="0" 
                      step="0.01" 
                      value={adjustAmount} 
                      onChange={e => setAdjustAmount(e.target.value)} 
                      className={`w-full pl-14 pr-3.5 py-2.5 bg-[#000000] rounded-lg text-lg font-mono font-bold outline-none shadow-sm transition-all border ${
                        adjustType === 'credit' 
                          ? 'text-emerald-400 border-emerald-500/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/50 shadow-[0_0_15px_rgba(0,230,118,0.15)]' 
                          : 'text-[#9333EA] border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                      }`} 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Date *</label>
                  <input type="date" required value={adjustDate} onChange={e => setAdjustDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white outline-none focus:border-emerald-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Reason for Override *</label>
                  <textarea required value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-emerald-500 shadow-sm resize-none" placeholder="Explain why this ledger override is necessary..."></textarea>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/10 bg-[#000000] flex justify-end gap-3">
                 <button type="button" onClick={() => { setActiveModal(null); setEditingAdjustment(null); }} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer">Cancel</button>
                 <button type="submit" disabled={modalLoading} className={`px-5 py-2 disabled:opacity-50 text-sm font-bold rounded-lg shadow-sm transition-all cursor-pointer ${
                   adjustType === 'credit'
                     ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                     : 'bg-purple-600 hover:bg-purple-500 text-white'
                 }`}>
                   {modalLoading ? 'Saving...' : 'Update'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'delivery' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#000000] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddDelivery}>
              <div className="px-6 py-5 border-b border-white/10 bg-[#000000] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Log Fuel Delivery</h3>
                  <p className="text-xs text-theme-text-muted font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-[#A1A1AA] hover:text-white rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
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
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-white font-semibold cursor-pointer outline-none hover:border-emerald-500 hover:text-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm transition-colors"
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
              <div className="px-6 py-4 bg-[#000000] border-t border-white/10 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-md shadow-purple-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Save Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'payment' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#000000] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddPayment}>
              <div className="px-6 py-5 border-b border-white/10 bg-[#000000] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Record Payment</h3>
                  <p className="text-xs text-theme-text-muted font-medium pb-1">For {customer.name}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-[#A1A1AA] hover:text-white rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Payment Amount (KES) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-[#000000] border-t border-white/10 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-sm font-bold shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'adjustment' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#000000] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleAddAdjustment}>
              <div className="px-6 py-5 border-b border-white/10 bg-[#000000] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Log Adjustment</h3>
                  <p className="text-xs text-theme-text-muted font-medium pb-1">Manual Ledger Adjustment overriding standard log flows</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="p-1 px-2 text-[#A1A1AA] hover:text-white rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all shadow-sm cursor-pointer ${
                        adjustType === 'credit'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.25)]'
                          : 'border-white/10 text-gray-400 bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      Credit (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all shadow-sm cursor-pointer ${
                        adjustType === 'debit'
                          ? 'border-purple-500 bg-purple-500/20 text-[#9333EA] shadow-[0_0_15px_rgba(147,51,234,0.25)]'
                          : 'border-white/10 text-gray-400 bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      Debit (+)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Date *</label>
                  <input 
                    type="date"
                    required
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-base text-white outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 transition-colors ${adjustType === 'credit' ? 'text-emerald-400' : 'text-[#9333EA]'}`}>
                    Override Amount (KES) * {adjustType === 'credit' ? '(Credit - Deduct)' : '(Debit - Add)'}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-[#000000] rounded-lg text-base font-mono font-bold outline-none shadow-sm transition-all border ${
                      adjustType === 'credit'
                        ? 'text-emerald-400 border-emerald-500/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/50 shadow-[0_0_15px_rgba(0,230,118,0.15)]'
                        : 'text-[#9333EA] border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Adjustment Reason Explanation *</label>
                  <textarea 
                    required
                    placeholder="Enter context, memo, or invoice reason..."
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500 shadow-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-[#000000] border-t border-white/10 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={`px-5 py-2 text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer ${
                    adjustType === 'credit'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
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
