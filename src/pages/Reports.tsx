import { useState } from 'react';
import { useCustomers, useDeliveries, usePayments } from '../lib/db';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatCurrency, formatLitres } from '../lib/utils';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { setupPdfHeader, addPdfFooter } from '../lib/pdfTemplate';

export default function Reports() {
  const { customers, loading: cl } = useCustomers();
  const { deliveries, loading: dl } = useDeliveries();
  const { payments, loading: pl } = usePayments();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loading = cl || dl || pl;

  const handleGenerateAndDownload = async () => {
    if (!selectedCustomerId) return;
    setIsGenerating(true);
    
    try {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;

      const customerDeliveries = deliveries.filter(d => d.customerId === selectedCustomerId).sort((a,b) => a.date - b.date);
      const customerPayments = payments.filter(p => p.customerId === selectedCustomerId).sort((a,b) => a.date - b.date);
      const totalLitres = customerDeliveries.reduce((sum, d) => sum + d.litres, 0);

      const doc = new jsPDF();

      let currentY = await setupPdfHeader({
        doc,
        title: 'CUSTOMER REPORT',
        leftBoxLines: [
          'Loruk Energy Limited',
          'T/A Sales & Distribution',
          'P.O BOX 342',
          `Customer Name: ${customer.name}`
        ],
        rightBoxLines: [
          { label: 'Generated :', value: format(Date.now(), 'MMM d, yyyy') },
          { label: 'Outst. Bal :', value: `${formatCurrency(customer.balance)}` },
          { label: 'Purchases :', value: `${formatCurrency(customer.totalPurchases)}` },
          { label: 'Total Litres :', value: formatLitres(totalLitres) }
        ]
      });

      // Deliveries Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Fuel Deliveries History', 14, currentY);
      
      const deliveryRows = customerDeliveries.map(d => [
        format(d.date, 'MM/dd/yyyy'),
        d.productType,
        formatLitres(d.litres),
        formatCurrency(d.totalAmount)
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Product', 'Litres', 'Total Amount']],
        body: deliveryRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] }
      });

      let nextY = (doc as any).lastAutoTable.finalY + 15;

      // Payments Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Payments History', 14, nextY);

      const paymentRows = customerPayments.map(p => [
        format(p.date, 'MM/dd/yyyy'),
        formatCurrency(p.amount)
      ]);

      autoTable(doc, {
        startY: nextY + 5,
        head: [['Date', 'Amount Paid']],
        body: paymentRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] }
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

      const pdfBlob = doc.output('blob');
      const filename = `${customer.name.replace(/\s+/g, '_')}_Report_${Date.now()}.pdf`;

      // Download locally
      doc.save(filename);
    } catch (e) {
      console.error('Failed to generate report', e);
      alert('Failed to generate report: ' + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDailySummary = async () => {
    setIsGenerating(true);
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const tomorrowTime = todayTime + 24 * 60 * 60 * 1000;

        const dailyDeliveries = deliveries.filter(d => d.date >= todayTime && d.date < tomorrowTime).sort((a, b) => a.date - b.date);
        const dailyPayments = payments.filter(p => p.date >= todayTime && p.date < tomorrowTime).sort((a, b) => a.date - b.date);

        const doc = new jsPDF();

        let currentY = await setupPdfHeader({
          doc,
          title: 'DAILY SUMMARY REPORT',
          leftBoxLines: [
            'Loruk Energy Limited',
            'T/A Management',
            'P.O BOX 342',
            `Date: ${format(today, 'MMM d, yyyy')}`
          ],
          rightBoxLines: [
            { label: 'Generated :', value: format(Date.now(), 'MMM d, yyyy') },
            { label: 'Deliveries :', value: `${dailyDeliveries.length}` },
            { label: 'Payments :', value: `${dailyPayments.length}` }
          ]
        });

        // Deliveries Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Deliveries Today', 14, currentY);
        
        const deliveryRows = dailyDeliveries.map(d => [
          customers.find(c => c.id === d.customerId)?.name || 'Unknown',
          d.productType,
          formatLitres(d.litres),
          formatCurrency(d.totalAmount)
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Customer', 'Product', 'Litres', 'Total Amount']],
          body: deliveryRows,
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
          bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] }
        });

        let nextY = (doc as any).lastAutoTable.finalY + 15;

        // Payments Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Payments Today', 14, nextY);

        const paymentRows = dailyPayments.map(p => [
          customers.find(c => c.id === p.customerId)?.name || 'Unknown',
          formatCurrency(p.amount)
        ]);

        autoTable(doc, {
          startY: nextY + 5,
          head: [['Customer', 'Amount Paid']],
          body: paymentRows,
          theme: 'grid',
          headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
          bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] }
        });

        // @ts-ignore
        addPdfFooter(doc, doc.lastAutoTable.finalY + 10);

        const filename = `Daily_Summary_${format(today, 'yyyy-MM-dd')}.pdf`;
        doc.save(filename);
    } catch (e) {
        console.error('Failed to generate daily report', e);
        alert('Failed to generate daily report: ' + (e as Error).message);
    } finally {
        setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white dark:bg-blue-950 rounded-xl shadow-xl border border-gray-200 dark:border-blue-900 p-8 transition-all duration-300">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-blue-900">
          <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-xl text-blue-600 dark:text-blue-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-blue-100">Report Generator</h2>
            <p className="text-gray-500 dark:text-blue-200/70 text-lg">Generate comprehensive PDF statements for customers.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-lg font-semibold text-gray-700 dark:text-blue-200 mb-2">Select Customer</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              disabled={loading}
              className="w-full max-w-md px-4 py-2.5 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-100 font-semibold disabled:opacity-50 text-lg cursor-pointer"
            >
              <option value="" disabled className="dark:bg-blue-950">Choose a customer to generate report</option>
              {customers.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-blue-950">{c.name} - {formatCurrency(c.balance)} Bal</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-blue-900 flex gap-4">
            <button
              onClick={handleGenerateAndDownload}
              disabled={!selectedCustomerId || loading || isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-blue-900/20 dark:disabled:text-blue-850 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed text-lg shadow-sm"
            >
              <Download className="w-5 h-5" />
              {isGenerating ? 'Generating...' : 'Generate PDF Statement'}
            </button>
            <button
              onClick={generateDailySummary}
              disabled={loading || isGenerating}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 dark:border-blue-700/50 px-6 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed text-lg"
            >
              <Download className="w-5 h-5" />
              {isGenerating ? 'Generating...' : 'Generate Daily Summary PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
