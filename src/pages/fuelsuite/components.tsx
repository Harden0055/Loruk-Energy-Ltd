import React from 'react';
import { Fuel, Flame, Box, Droplet, Wrench, Package, ReceiptText, FileText, Wallet, Smartphone, Banknote, Building2, User } from 'lucide-react';

export type BadgeCategory = 'Fuel' | 'LPG' | 'Accessories' | 'Lubricants' | 'Equipment' | 'Other' | 'Expense' | 'Invoice' | 'Cash' | 'Station';

export const getProductIconMeta = (name?: string, category?: string) => {
  const n = (name || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();

  if (c === 'fuel' || n.includes('super') || n.includes('petrol') || n.includes('diesel') || n.includes('ago') || n.includes('pms') || n.includes('premium') || n.includes('kerosene')) {
    return {
      icon: Fuel,
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      shadow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]',
      category: 'Fuel'
    };
  }

  if (c === 'lpg' || n.includes('lpg') || n.includes('gas') || n.includes('cylinder') || n.includes('propane') || n.includes('butane')) {
    return {
      icon: Flame,
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      shadow: 'shadow-[0_0_12px_rgba(249,115,22,0.2)]',
      category: 'LPG'
    };
  }

  if (c === 'accessories' || n.includes('burner') || n.includes('grill') || n.includes('regulator') || n.includes('hose') || n.includes('pipe') || n.includes('valve')) {
    return {
      icon: Box,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      shadow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
      category: 'Accessories'
    };
  }

  if (c === 'lubricants' || n.includes('oil') || n.includes('lube') || n.includes('grease') || n.includes('coolant') || n.includes('atf') || n.includes('fluid')) {
    return {
      icon: Droplet,
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
      category: 'Lubricants'
    };
  }

  if (c === 'equipment' || n.includes('pump') || n.includes('nozzle') || n.includes('meter') || n.includes('filter') || n.includes('wrench')) {
    return {
      icon: Wrench,
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      shadow: 'shadow-[0_0_12px_rgba(168,85,247,0.2)]',
      category: 'Equipment'
    };
  }

  return {
    icon: Package,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    shadow: 'shadow-[0_0_12px_rgba(100,116,139,0.2)]',
    category: 'Other'
  };
};

export const ProductIconBadge = ({ 
  name, 
  category, 
  size = 'md',
  showName = true,
  nameClassName = 'font-semibold text-slate-100 text-sm'
}: { 
  name: string; 
  category?: string; 
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  nameClassName?: string;
}) => {
  const meta = getProductIconMeta(name, category);
  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'w-6 h-6 rounded-lg p-1',
    md: 'w-8 h-8 rounded-xl p-1.5',
    lg: 'w-10 h-10 rounded-xl p-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="inline-flex items-center gap-2.5">
      <div className={`flex items-center justify-center shrink-0 border ${meta.bg} ${meta.text} ${meta.border} ${meta.shadow} ${sizeClasses[size]}`}>
        <Icon className={iconSizes[size]} />
      </div>
      {showName && <span className={nameClassName}>{name}</span>}
    </div>
  );
};

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`glass-panel rounded-2xl ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-4 border-b border-theme-border/30 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-base font-bold text-white tracking-tight ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const MetricCard = ({ title, value, icon: Icon, trend, colorClass }: { title: string, value: string | number, icon: any, trend?: string, colorClass?: string }) => {
  return (
    <div className="glass-panel p-5 rounded-2xl transition-all duration-300 hover:translate-y-[-2px] hover:border-blue-500/30 flex flex-col justify-between h-36 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${colorClass || 'bg-blue-500/10 border border-blue-500/25 text-blue-400'}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div>
        <p className="text-xl xl:text-2xl font-bold text-white tracking-tight leading-none mb-2">{value}</p>
        {trend ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
            {trend} vs last month
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
            Active
          </div>
        )}
      </div>
    </div>
  );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const value = typeof props.value === 'number' && Number.isNaN(props.value) ? '' : props.value;
  return (
    <input
      {...props}
      value={value}
      className={`w-full glass-input text-white rounded-xl px-4 py-2.5 placeholder-slate-500 text-sm focus:outline-none ${props.className || ''}`}
    />
  );
};

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full glass-input text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none ${props.className || ''}`}
  >
    {props.children}
  </select>
);

export const Button = ({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'purple' | 'emerald' }) => {
  const baseClasses = "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]";
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold shadow-lg shadow-blue-500/20",
    secondary: "glass-button border border-white/10 text-slate-300 hover:text-white hover:bg-white/10",
    danger: "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    purple: "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]",
    emerald: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
  };
  return (
    <button {...props} className={`${baseClasses} ${variants[variant]} ${props.className || ''}`}>
      {children}
    </button>
  );
};

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-x-auto rounded-2xl modern-table-container">
    <table className="modern-table">
      {children}
    </table>
  </div>
);

export const Th = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <th {...props} className={`modern-th ${className}`}>
    {children}
  </th>
);

export const Td = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...props} className={`modern-td ${className}`}>
    {children}
  </td>
);
