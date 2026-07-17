import { LayoutDashboard, Users, Truck, DollarSign, FileText, Settings, LogOut, Fuel, BookOpen, CarFront, Sun, Moon, MapPin, ClipboardList, BotMessageSquare, Box } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import FireLEIcon from './FireLEIcon';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fuelsuite', label: 'FuelSuite Pro', icon: Settings },
    { id: 'deliveries', label: 'Fuel Deliveries', icon: Truck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'fleet', label: 'Fleet Fueling', icon: CarFront },
    { id: 'trucks', label: 'Trucks', icon: Truck },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'stations', label: 'Stations', icon: MapPin },
    { id: 'products', label: 'Products', icon: Box },
  ];

  return (
    <aside className="h-full w-64 border-r border-theme-border flex flex-col bg-[#0E0E11] transition-all duration-300 relative">
      <div className="px-5 py-6 flex items-center gap-3 border-b border-theme-border/30 mb-2">
        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(139,61,255,0.35)] transition-all duration-300 hover:scale-105">
          <FireLEIcon className="w-7 h-7 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-gradient transition-colors">Loruk Energy Ltd</span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-base sidebar-item",
                isActive 
                  ? item.id === 'payments'
                    ? "sidebar-item-active-green font-medium"
                    : "sidebar-item-active font-medium"
                  : item.id === 'fuelsuite'
                    ? "text-[#00D4FF] bg-[#00D4FF]/5 hover:bg-[#00D4FF]/10 "
                    : "text-theme-text-muted hover:bg-white/5 hover:text-theme-text"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-all duration-300", isActive ? item.id === 'payments' ? "text-emerald-400 stroke-emerald-400" : "" : item.id === 'fuelsuite' ? "" : "")} />
              {item.label}
              {item.id === 'fuelsuite' && (
                <span className="ml-auto bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">NEW</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-theme-border mt-auto">
        <div className="mb-4 space-y-2">
          <button
            onClick={() => onNavigate('assistant')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-base sidebar-item",
              currentPage === 'assistant' 
                ? "sidebar-item-active font-medium" 
                : "text-theme-text-muted hover:bg-white/5 hover:text-theme-text"
            )}
          >
            <BotMessageSquare className="w-5 h-5 transition-all duration-300" />
            AI Assistant
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-base sidebar-item",
              currentPage === 'settings' 
                ? "sidebar-item-active font-medium" 
                : "text-theme-text-muted hover:bg-white/5 hover:text-theme-text"
            )}
          >
            <Settings className="w-5 h-5 transition-all duration-300" />
            Settings
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-[#121216]/60 border border-theme-border/50 rounded-xl shadow-[0_0_15px_rgba(139,61,255,0.05)]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B3DFF] to-[#3B82F6] flex items-center justify-center font-bold text-sm text-white shadow-[0_0_15px_rgba(139,61,255,0.3)]">
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white">{user?.displayName || 'Admin User'}</p>
            <p className="text-xs text-[#A1A1AA] truncate">{user?.email || 'admin@fuelflow.io'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 border border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
