import React from 'react';
import { useFuel } from '../context';
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from '../components';
import { DollarSign, Droplets, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export default function DashboardView() {
  const { activeStation, pumpReadings, expenses, lpgTransactions, cashPositions } = useFuel();

  const filteredReadings = pumpReadings.filter(r => activeStation === 'Combined Total' || r.station === activeStation);
  const filteredExpenses = expenses.filter(e => activeStation === 'Combined Total' || true); // Simple default
  
  const totalFuelRevenue = filteredReadings.reduce((acc, r) => acc + ((r.stopReading - r.startReading) * r.ratePerLitre), 0);
  const totalFuelLitres = filteredReadings.reduce((acc, r) => acc + (r.stopReading - r.startReading), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalFuelRevenue - totalExpenses; // simplified

  const latestCash = cashPositions[0] || { mPesa: 0, cashOnHand: 0 };

  const barData = [
    { name: 'Mon', revenue: 40000, expense: 2400 },
    { name: 'Tue', revenue: 30000, expense: 1398 },
    { name: 'Wed', revenue: 20000, expense: 9800 },
    { name: 'Thu', revenue: 27800, expense: 3908 },
    { name: 'Fri', revenue: 18900, expense: 4800 },
    { name: 'Sat', revenue: 23900, expense: 3800 },
    { name: 'Sun', revenue: 34900, expense: 4300 },
  ];

  const lineData = [
    { name: 'Mon', litres: 400 },
    { name: 'Tue', litres: 300 },
    { name: 'Wed', litres: 200 },
    { name: 'Thu', litres: 278 },
    { name: 'Fri', litres: 189 },
    { name: 'Sat', litres: 239 },
    { name: 'Sun', litres: 349 },
  ];

  return (
    <div className="p-8 pb-32 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
        <p className="text-slate-400 mt-1">High-level energy performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={`KES ${totalFuelRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          trend="+12.5%" 
          colorClass="bg-emerald-500/10 text-emerald-400" 
        />
        <MetricCard 
          title="Total Expenses" 
          value={`KES ${totalExpenses.toLocaleString()}`} 
          icon={ArrowDownRight} 
          trend="-2.4%" 
          colorClass="bg-red-500/10 text-red-400" 
        />
        <MetricCard 
          title="Net Profit" 
          value={`KES ${netProfit.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+15.2%" 
          colorClass="bg-cyan-500/10 text-cyan-400" 
        />
        <MetricCard 
          title="Fuel Sold" 
          value={`${totalFuelLitres.toLocaleString()} L`} 
          icon={Droplets} 
          trend="+8.1%" 
          colorClass="bg-amber-500/10 text-amber-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d325a" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  cursor={{fill: '#2d325a', opacity: 0.4}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuel Volume Sales (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d325a" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d36', borderColor: '#2d325a', color: '#f1f5f9' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="litres" name="Litres Sold" stroke="#34d399" strokeWidth={3} dot={{r: 4, fill: '#1a1d36', strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
