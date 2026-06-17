import React, { useState, useRef } from 'react';
import { Upload, AlertTriangle, CheckCircle, FileUp } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '../lib/auth';
import { createDelivery, createCustomer } from '../lib/db';
import { addDailyPumpReading } from '../lib/operationsDb';
import { useCustomers } from '../lib/db';

export function BulkEntry() {
  const { user } = useAuth();
  const { customers } = useCustomers();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [type, setType] = useState<'deliveries' | 'pump_readings' | 'customers'>('deliveries');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          return;
        }
        setData(JSON.stringify(results.data));
      }
    });
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      let items: any[] = [];
      if (data.startsWith('[')) {
        items = JSON.parse(data);
      } else {
        items = data.split('\n').filter(r => r.trim()).map(row => row.split('\t').map(p => p.trim()));
      }

      if (items.length === 0) throw new Error('No data found');
      
      let count = 0;
      
      for (const item of items) {
        if (type === 'deliveries') {
            const row = Array.isArray(item) ? item : [item.customerId, item.date, item.productType, item.litres, item.totalAmount];
            if (row.length < 5) throw new Error(`Invalid row format: ${row}`);
            const [customerName, dateStr, product, litresStr, amountStr] = row;
            
            let customer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase() || c.id === customerName);
            if (!customer) throw new Error(`Customer not found: ${customerName}`);
            
            const date = new Date(dateStr).getTime();
            if (isNaN(date)) throw new Error(`Invalid date format: ${dateStr}`);
            
            await createDelivery({
              customerId: customer.id,
              date,
              productType: product === 'Diesel' ? 'Diesel' : 'Super',
              litres: Number(litresStr),
              totalAmount: Number(amountStr),
              createdBy: user?.email || 'Unknown',
            }, user?.email || 'Unknown');
            count++;
        } else if (type === 'customers') {
            const row = Array.isArray(item) ? item : [item.customerId, item.name, item.creditLimit, item.balance, item.status];
            if (row.length < 5) throw new Error(`Invalid row format: ${row}`);
            const [customerId, name, creditLimit, balance, status] = row;
            
            await createCustomer({
                customerId,
                name,
                creditLimit: Number(creditLimit),
                balance: Number(balance),
                totalPurchases: Number(balance),
                status: status as 'active' | 'credit_risk',
                updatedBy: user?.email || 'Unknown',
                actionType: 'create'
            });
            count++;
        } else if (type === 'pump_readings') {
          // Format expected: Station(Ndalu/Junction), Date(YYYY-MM-DD), Product, Start, Stop, Rate, ManualRev
          const row = Array.isArray(item) ? item : [item.station, item.date, item.product, item.start, item.stop, item.rate, item.manualRev];
          if (row.length < 7) throw new Error(`Invalid row format: ${row}`);
          const [station, dateStr, product, startStr, stopStr, rateStr, revStr] = row;
          
          const date = new Date(dateStr).getTime();
          if (isNaN(date)) throw new Error(`Invalid date format: ${dateStr}`);
          
          const start = Number(startStr);
          const stop = Number(stopStr);
          const rate = Number(rateStr);
          const manual = Number(revStr);
          
          await addDailyPumpReading({
            station: station as 'Ndalu' | 'Junction',
            date,
            product: product === 'Diesel' ? 'Diesel' : 'Super',
            litresStart: start,
            litresStop: stop,
            litresSold: stop - start,
            ratePerLitre: rate,
            calculatedRevenue: (stop - start) * rate,
            manualRevenue: manual,
            difference: manual - ((stop - start) * rate)
          });
          
          count++;
        }
      }
      
      setSuccess(`Successfully imported ${count} records!`);
      setData('');
    } catch (e: any) {
      setError(e.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-blue-950 p-6 rounded-xl border border-gray-200 dark:border-blue-900 shadow-sm animate-fade-in">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Upload className="w-6 h-6 text-blue-500" />
        Bulk Transaction Entry
      </h2>
      
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV file or paste data from a spreadsheet.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Import Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as any)}
            className="w-full md:w-1/3 p-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded dark:text-white"
          >
            <option value="deliveries">Customer Fuel Deliveries</option>
            <option value="pump_readings">Pump Readings (Sales)</option>
            <option value="customers">Customers</option>
          </select>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:text-white dark:border-blue-700"
        >
            <FileUp className="w-4 h-4" /> Upload CSV
        </button>

        <textarea
             value={data}
             onChange={e => setData(e.target.value)}
             className="w-full h-64 p-3 bg-gray-50 dark:bg-blue-900/50 border border-gray-200 dark:border-blue-800 rounded font-mono text-sm dark:text-white"
             placeholder="Paste your spreadsheet rows here (tab separated) or upload a CSV..."
        />
        
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded flex gap-2 items-center">
             <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex gap-2 items-center">
             <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
          </div>
        )}

        <button 
          onClick={handleImport}
          disabled={loading || !data.trim()}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Importing...' : 'Run Import'}
        </button>
      </div>
    </div>
  );
}
