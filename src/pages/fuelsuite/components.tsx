import React from 'react';

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
    primary: "bg-gradient-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] border-none",
    secondary: "glass-button border border-theme-border/50 text-[#A1A1AA] hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    purple: "bg-gradient-to-r from-[#8B3DFF] to-[#B15DFF] text-white shadow-[0_0_20px_rgba(139,61,255,0.3)] hover:shadow-[0_0_30px_rgba(139,61,255,0.5)] border-none"
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


