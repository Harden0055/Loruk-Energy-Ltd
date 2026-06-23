import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#1a1d36] border border-[#2d325a] rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-4 border-b border-[#2d325a] ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold text-slate-200 ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const MetricCard = ({ title, value, icon: Icon, trend, colorClass }: { title: string, value: string | number, icon: any, trend?: string, colorClass: string }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-200">{value}</h4>
          {trend && (
            <p className="text-xs mt-2 text-slate-500">
              <span className={trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>{trend}</span> vs last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full bg-[#13162b] border border-[#2d325a] text-slate-200 rounded-lg px-4 py-2 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors ${props.className || ''}`}
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full bg-[#13162b] border border-[#2d325a] text-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${props.className || ''}`}
  >
    {props.children}
  </select>
);

export const Button = ({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20",
    secondary: "bg-[#2d325a] hover:bg-[#383e6b] text-slate-200",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20"
  };
  return (
    <button {...props} className={`${baseClasses} ${variants[variant]} ${props.className || ''}`}>
      {children}
    </button>
  );
};

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-left text-sm text-slate-400">
      {children}
    </table>
  </div>
);

export const Th = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <th {...props} className={`px-6 py-4 font-medium text-slate-300 bg-[#13162b] border-b border-[#2d325a] ${className}`}>
    {children}
  </th>
);

export const Td = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...props} className={`px-6 py-4 border-b border-[#2d325a] ${className}`}>
    {children}
  </td>
);
