import { LayoutDashboard, Users, Truck, DollarSign, FileText, Settings, LogOut, Fuel, BookOpen, CarFront, Sun, Moon, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'deliveries', label: 'Fuel Deliveries', icon: Truck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'fleet', label: 'Fleet Expenses', icon: CarFront },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];


  return (
    <aside className="w-64 border-r border-gray-200 dark:border-blue-900 flex flex-col bg-white dark:bg-blue-950 transition-colors">
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
          <Fuel className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-2xl tracking-tight dark:text-white transition-colors">Loruk Energy Ltd</span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base transition-colors",
                isActive 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" 
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-blue-900/50 dark:hover:text-gray-100"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-blue-900/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-blue-900 flex items-center justify-center font-medium text-sm text-gray-700 dark:text-gray-300">
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium truncate text-gray-900 dark:text-blue-100">{user?.displayName || 'Admin User'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || 'admin@fuelflow.io'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-blue-900/50 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light' : 'Theme'}
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
