import React, { useState, useMemo } from 'react';
import { useFuel, calculatePumpMeterDelta } from '../context';
import { X, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components';

interface WhiteOilsProfitViewProps {
  onBack: () => void;
}

export default function WhiteOilsProfitView({ onBack }: WhiteOilsProfitViewProps) {
  const { pumpReadings, stations } = useFuel();

  const data = useMemo(() => {
    const totalVolume = pumpReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.litresStart, r.litresStop), 0);
    const totalSales = pumpReadings.reduce((sum, r) => sum + calculatePumpMeterDelta(r.salesStart, r.salesStop), 0);
    
    const products: Record<string, { volume: number, sales: number }> = {};
    pumpReadings.forEach(r => {
        if(!products[r.product]) products[r.product] = { volume: 0, sales: 0 };
        products[r.product].volume += calculatePumpMeterDelta(r.litresStart, r.litresStop);
        products[r.product].sales += calculatePumpMeterDelta(r.salesStart, r.salesStop);
    });

    return { totalVolume, totalSales, productBreakdown: Object.entries(products) };
  }, [pumpReadings]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">White Oils Profit Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl bg-slate-900/50">
            <h3 className="text-sm text-slate-400 font-medium uppercase">Total Combined Volume</h3>
            <p className="text-3xl font-bold text-white mt-2">{data.totalVolume.toLocaleString()} L</p>
        </div>
        <div className="glass-panel p-6 rounded-xl bg-slate-900/50">
            <h3 className="text-sm text-slate-400 font-medium uppercase">Total Combined Sales</h3>
            <p className="text-3xl font-bold text-cyan-400 mt-2">KES {data.totalSales.toLocaleString()}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Product Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-slate-400 uppercase text-xs">
                    <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Volume (L)</th>
                        <th className="p-3 text-right">Sales (KES)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {data.productBreakdown.map(([name, stats]) => (
                        <tr key={name}>
                            <td className="p-3 font-medium text-white">{name}</td>
                            <td className="p-3 text-right font-mono">{stats.volume.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-cyan-400">KES {stats.sales.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CardContent>
      </Card>
    </div>
  );
}
