import React from 'react';
import { Card, CardContent } from '../components';
import { Select, Input } from '../components';
import { STATIONS, Station } from '../context';
import { DollarSign, BarChart2, TrendingUp } from 'lucide-react';

interface MiniDashboardProps {
  date: string;
  station: Station;
  onFilterChange: (date: string, station: Station) => void;
  stats: { label: string, value: string | number, icon?: any }[];
}

export default function MiniDashboard({ date, station, onFilterChange, stats }: MiniDashboardProps) {
  return (
    <Card className="mb-6 glass-panel border-theme-border">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1">
              <label className="block text-xs text-theme-text-muted mb-1">Date</label>
              <Input type="date" value={date} onChange={e => onFilterChange(e.target.value, station)} className="h-9" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-theme-text-muted mb-1">Station</label>
              <Select value={station} onChange={e => onFilterChange(date, e.target.value as Station)} className="h-9">
                {['Combined Total', ...STATIONS].map(s => <option className="dark:bg-slate-900" key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="theme-bg-gradient/50 p-3 rounded-lg border border-theme-border flex items-center gap-3">
              {stat.icon && <div className="p-2 bg-[#122840] rounded-lg text-cyan-400"><stat.icon className="w-4 h-4" /></div>}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{stat.label}</p>
                <p className="text-sm font-bold text-theme-text">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
