import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface LocationReportProps {
  location: 'Gel-Bungoma' | 'Gel-Kapenguria';
}

export default function LocationReport({ location }: LocationReportProps) {
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'day',
    dips: { AGO: '', PMS: '' },
    meterBalance: { AGO: '', PMS: '' },
    sales: { AGO: '', PMS: '', LPG: '', Lubes: '', Labour: '', Greasing: '' },
    payments: { Mpesa: '', Visa: '', GenFuel: '', GelCard: '' },
    expenses: '',
    invoices: '',
    cylinders: {
      '50kgFull': '', '50kgEmpty': '', '50kgRefill': '',
      '13kgFull': '', '13kgEmpty': '', '13kgRefill': '',
      '6kgFull': '', '6kgEmpty': '', '6kgRefill': ''
    },
    bankable: ''
  });

  const [pastedReport, setPastedReport] = useState('');

  const parseReport = (text: string) => {
    const newData = { ...data };
    
    // Very simplified parser
    const totalSalesMatch = text.match(/TOTAL SALES OF THE DAY =([\d,]+)/);
    if(totalSalesMatch) newData.bankable = totalSalesMatch[1].replace(/,/g, '');
    
    setData(newData);
  };

  const updateNested = (category: string, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [category]: { ...prev[category as keyof typeof prev] as object, [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'reports'), {
        date: new Date(data.date).getTime(),
        location,
        bankable: parseFloat(data.bankable) || 0,
        data
      });
      alert('Report submitted successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to submit report');
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
         <h3 className="font-semibold text-lg text-gray-800 dark:text-blue-200 mb-4">Paste Report</h3>
         <textarea 
           value={pastedReport} 
           onChange={(e) => { setPastedReport(e.target.value); parseReport(e.target.value); }} 
           className="w-full px-4 py-2 border rounded-lg h-32" 
           placeholder="Paste the daily report text here..." 
         />
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-blue-100">{location} Daily Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} className="w-full px-4 py-2 bg-transparent border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select value={data.shift} onChange={e => setData({...data, shift: e.target.value})} className="w-full px-4 py-2 bg-blue-50/50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-100 font-semibold cursor-pointer">
              <option value="day" className="dark:bg-blue-950">Day Shift</option>
              <option value="evening" className="dark:bg-blue-950">Evening Shift</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bankable Amount</label>
            <input type="number" value={data.bankable} onChange={e => setData({...data, bankable: e.target.value})} className="w-full px-4 py-2 bg-transparent border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
          </div>
        </div>
        
        <button type="submit" className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all">Submit Report</button>
      </form>
    </div>
  );
}
