import React from 'react';
import { Fuel, Flame, Box, Droplet, Wrench, Package, ReceiptText, FileText, Wallet, Smartphone, Banknote, Building2, User } from 'lucide-react';

export type BadgeCategory = 'Fuel' | 'LPG' | 'Accessories' | 'Lubricants' | 'Equipment' | 'Other' | 'Expense' | 'Invoice' | 'Cash' | 'Station';

export const getProductIconMeta = (name?: string, category?: string) => {
  const n = (name || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();

  if (c === 'fuel' || n.includes('super') || n.includes('petrol') || n.includes('diesel') || n.includes('ago') || n.includes('pms') || n.includes('premium') || n.includes('kerosene')) {
    return {
      icon: Fuel,
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
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
  <div className={`glass-panel rounded-[20px] ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-5 border-b border-theme-border/30 ${className}`}>
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
  const isPositive = trend && !trend.startsWith('-');
  return (
    <div className="glass-panel p-5 rounded-[20px] transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_0_50px_rgba(59,130,246,0.18)] hover:border-[#3B82F6]/30 flex flex-col justify-between h-36">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold tracking-wider text-[#A1A1AA] uppercase">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/25 shadow-[0_0_15px_rgba(59,130,246,0.25)] shrink-0">
          <Icon className="w-4 h-4 text-[#00D4FF]" />
        </div>
      </div>
      <div>
        <p className="text-xl xl:text-2xl font-bold text-white tracking-tight leading-none mb-2">{value}</p>
        {trend ? (
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#22C55E]" />
            {trend} vs last month
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#22C55E]" />
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
      className={`w-full glass-input text-white rounded-xl px-4 py-2.5 placeholder-zinc-500 text-sm focus:outline-none ${props.className || ''}`}
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

export const Button = ({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'purple' }) => {
  const baseClasses = "px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-102";
  const variants = {
    primary: "bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    secondary: "glass-button border border-theme-border/50 text-[#A1A1AA] hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    purple: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
  };
  return (
    <button {...props} className={`${baseClasses} ${variants[variant]} ${props.className || ''}`}>
      {children}
    </button>
  );
};

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-x-auto rounded-[20px] glass-panel border-none p-0">
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


