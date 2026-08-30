import React, { useState, useMemo, useEffect } from 'react';
import { FuelProvider, useFuel, Station } from './context';
import { 
  LayoutDashboard, 
  Fuel, 
  Flame, 
  Box, 
  ReceiptText, 
  FileText, 
  Wallet, 
  BarChart3, 
  Menu, 
  X, 
  User, 
  Settings, 
  Building2, 
  Printer, 
  Database,
  ChevronDown,
  LogOut,
  Sparkles,
  ClipboardEdit,
  Layers,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import DashboardView from './views/DashboardView';
import PumpReadingsView from './views/PumpReadingsView';
import LPGView from './views/LPGView';
import InventoryView from './views/InventoryView';
import ExpensesView from './views/ExpensesView';
import InvoicesView from './views/InvoicesView';
import CashPositionView from './views/CashPositionView';
import ReportsView from './views/ReportsView';
import ProductsView from './views/ProductsView';
import DailyDataEntryView from './views/DailyDataEntryView';
import MasterRecordsView from './views/MasterRecordsView';

import DailyReportView from './views/DailyReportView';
import MiniDashboardProfile from './views/MiniDashboardProfile';
import ThemeToggle from '../../components/ThemeToggle';

export type ViewType = 'Dashboard' | 'Daily Data Entry' | 'White Oils' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Master Records' | 'Reports' | 'Daily Report' | 'Settings';

const Sidebar = ({ 
  currentView, 
  setCurrentView, 
  onBackToMain, 
  isOpen, 
  setIsOpen,
  isCollapsed,
  setIsCollapsed
}: { 
  currentView: ViewType; 
  setCurrentView: (v: ViewType) => void; 
  onBackToMain: () => void; 
  isOpen: boolean; 
  setIsOpen: (o: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400', activeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    { name: 'Daily Data Entry', icon: ClipboardEdit, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    { name: 'White Oils', icon: Fuel, color: 'text-blue-400', activeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    { name: 'LPG', icon: Flame, color: 'text-orange-400', activeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.15)]' },
    { name: 'Inventory', icon: Box, color: 'text-sky-400', activeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.15)]' },
    { name: 'Expenses', icon: ReceiptText, color: 'text-rose-400', activeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
    { name: 'Invoices', icon: FileText, color: 'text-amber-400', activeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
    { name: 'Cash Position', icon: Wallet, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    { name: 'Master Records', icon: Database, color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]' },
    { name: 'Reports', icon: BarChart3, color: 'text-indigo-400', activeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]' },
    { name: 'Daily Report', icon: Layers, color: 'text-teal-400', activeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.15)]' },
    { name: 'Settings', icon: Settings, color: 'text-slate-400', activeBg: 'bg-slate-500/15 border-slate-500/30 text-slate-200 shadow-[0_0_20px_rgba(148,163,184,0.15)]' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out flex flex-col h-full bg-[var(--theme-sidebar-bg,#070914)] border-r border-theme-border text-theme-text hide-scrollbar overflow-y-auto ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${
        isCollapsed ? "lg:w-0 lg:p-0 lg:border-r-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden" : "w-64"
      }`}>
        <div className="p-4 sm:p-5 border-b border-theme-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-gradient tracking-tight truncate">FuelSuite Pro</h2>
              <p className="text-[9px] text-theme-text-muted font-mono uppercase tracking-widest truncate">Energy Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Desktop hide button */}
            <button 
              className="hidden lg:flex p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => setIsCollapsed(true)}
              title="Hide Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
            {/* Mobile close button */}
            <button 
              className="lg:hidden p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { setCurrentView(item.name as ViewType); setIsOpen(false); }}
                className={`w-full flex items-center px-3.5 py-2.5 text-xs font-bold transition-all duration-200 rounded-xl cursor-pointer border ${
                  isActive 
                    ? `${item.activeBg} font-extrabold` 
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:bg-white/[0.05]'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 transition-colors shrink-0 ${isActive ? 'bg-white/10' : 'bg-white/[0.03]'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-theme-text-muted'}`} />
                </div>
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#22D3EE] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-theme-border mt-auto shrink-0">
          <button 
            onClick={onBackToMain}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-theme-border text-theme-text-muted bg-white/[0.03] rounded-xl hover:bg-white/[0.08] hover:text-white transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit FuelSuite
          </button>
        </div>
      </aside>
    </>
  );
};

const MainContent = ({ 
  currentView, 
  setCurrentView, 
  onOpenSidebar, 
  isSidebarCollapsed,
  onToggleSidebar,
  isProfileOpen, 
  setIsProfileOpen, 
  onPrint,
  onNavigateToStation
}: { 
  currentView: ViewType; 
  setCurrentView: (v: ViewType) => void; 
  onOpenSidebar: () => void; 
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isProfileOpen: boolean; 
  setIsProfileOpen: (b: boolean) => void; 
  onPrint: () => void;
  onNavigateToStation?: (id: string, name: string) => void;
}) => {
  const { activeStation, setActiveStation, stations } = useFuel();
  
  const stationsList = useMemo(() => {
    return stations.length > 0 ? stations : [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
  }, [stations]);

  return (
    <div className="flex-1 theme-bg-gradient overflow-hidden flex flex-col min-w-0">
      <header className="px-4 sm:px-6 py-3.5 border-b border-theme-border bg-[var(--theme-header-bg,rgba(7,9,20,0.85))] backdrop-blur-md flex flex-row items-center justify-between gap-4 z-10 relative transition-colors duration-300">
         <div className="flex items-center gap-3 sm:gap-4 min-w-0">
           {/* Mobile menu open */}
           <button 
             onClick={onOpenSidebar} 
             className="lg:hidden p-2 text-theme-text-muted hover:text-theme-text hover:bg-white/5 rounded-xl transition-all cursor-pointer"
             title="Open Menu"
           >
              <Menu className="w-5 h-5" />
           </button>

           {/* Desktop Sidebar Toggle / Hide button */}
           <button
             onClick={onToggleSidebar}
             className={`hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-semibold ${
               isSidebarCollapsed 
                 ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-blue-500/25' 
                 : 'bg-white/[0.04] border-theme-border text-theme-text-muted hover:text-white hover:bg-white/[0.08]'
             }`}
             title={isSidebarCollapsed ? "Show Sidebar (Ctrl+B)" : "Hide Sidebar (Ctrl+B)"}
           >
             <PanelLeft className="w-4 h-4 text-blue-400" />
             <span className="hidden xl:inline">{isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}</span>
           </button>

           <div className="flex items-center gap-2.5 min-w-0">
             <h1 className="text-base sm:text-lg font-extrabold text-theme-text tracking-tight truncate">{currentView}</h1>
             <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/25 shrink-0">Live</span>
           </div>
         </div>
         
         <div className="flex items-center gap-2 sm:gap-3 shrink-0">
           <ThemeToggle variant="button" />

           <button
             onClick={onPrint}
             className="flex items-center gap-2 text-xs font-bold text-theme-text-muted hover:text-theme-text bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 rounded-xl border border-theme-border transition-all cursor-pointer shadow-sm"
             title="Print Page"
           >
             <Printer className="w-3.5 h-3.5 text-blue-400" />
             <span className="hidden sm:inline">Print</span>
           </button>

           <button 
             onClick={() => setIsProfileOpen(true)}
             className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
             title="Profile & Station Performance"
           >
             <User className="w-4 h-4 text-blue-400" />
           </button>

           <div className="flex items-center gap-2 bg-theme-panel border border-theme-border rounded-xl px-3 py-1.5 shadow-sm hover:border-blue-500/40 transition-colors">
             <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
               <Building2 className="w-3.5 h-3.5" />
             </div>
             <div className="flex flex-col">
               <label className="text-[8px] font-extrabold text-blue-400 uppercase tracking-widest leading-none mb-0.5">Active Station</label>
               <select 
                 className="appearance-none bg-transparent text-theme-text text-xs font-bold focus:outline-none cursor-pointer pr-4 hover:text-blue-300 transition-colors"
                 value={activeStation}
                 onChange={(e) => setActiveStation(e.target.value as Station)}
               >
                 <option value="Combined Total" className="bg-[var(--theme-sidebar-bg,#070914)] text-theme-text font-bold">Combined Total (All Stations)</option>
                 {stationsList.map(s => (
                   <option key={s.id || s.name} value={s.name} className="bg-[var(--theme-sidebar-bg,#070914)] text-theme-text font-bold">
                     {s.name}
                   </option>
                 ))}
               </select>
             </div>
             <ChevronDown className="w-3.5 h-3.5 text-theme-text-muted pointer-events-none" />
           </div>
         </div>
      </header>
      <div className="flex-1 overflow-auto">
        {currentView === 'Dashboard' && <DashboardView onNavigateToStation={onNavigateToStation} />}
        {currentView === 'Daily Data Entry' && <DailyDataEntryView />}
        {currentView === 'White Oils' && <PumpReadingsView />}
        {currentView === 'LPG' && <LPGView />}
        {currentView === 'Inventory' && <InventoryView />}
        {currentView === 'Settings' && <ProductsView onNavigateToStation={onNavigateToStation} />}
        {currentView === 'Expenses' && <ExpensesView />}
        {currentView === 'Invoices' && <InvoicesView />}
        {currentView === 'Cash Position' && <CashPositionView />}
        {currentView === 'Master Records' && <MasterRecordsView />}
        {currentView === 'Reports' && <ReportsView />}
        {currentView === 'Daily Report' && <DailyReportView />}
      </div>
      {isProfileOpen && <MiniDashboardProfile 
        onClose={() => setIsProfileOpen(false)} 
        onNavigate={(view) => {
          if (view === 'WhiteOilsProfit') {
            setCurrentView('White Oils');
          }
          setIsProfileOpen(false);
        }} 
        onNavigateToStation={onNavigateToStation}
      />}

    </div>
  );
};

export default function FuelSuiteApp({ 
  onBackToMain,
  onNavigateToStation 
}: { 
  onBackToMain: () => void;
  onNavigateToStation?: (id: string, name: string) => void;
}) {
  const [currentView, setCurrentView] = useState<ViewType>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fuelsuite_sidebar_hidden') === 'true';
    } catch {
      return false;
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fuelsuite_sidebar_hidden', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrint = () => {
    try {
      if (window.self !== window.top) {
        setShowPrintWarning(true);
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  return (
    <div className="flex h-screen theme-bg-gradient font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {showPrintWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print-hide">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border border-theme-border">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
              <Printer className="w-5 h-5 text-blue-400" />
              Print / Save as PDF
            </h3>
            <p className="text-theme-text-muted text-xs mb-6 leading-relaxed">
              To print or save this report as PDF in the preview environment, please open the applet in a new tab or use your browser's direct print shortcut (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">Ctrl+P</code> / <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">Cmd+P</code>).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-theme-text-muted font-bold rounded-xl transition-colors text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  try {
                    window.print();
                  } catch {
                    window.open(window.location.href, '_blank');
                  }
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl transition-colors text-xs font-bold cursor-pointer"
              >
                Print Now
              </button>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold rounded-xl transition-colors text-xs cursor-pointer shadow-lg shadow-blue-500/20"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onBackToMain={onBackToMain} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <MainContent 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onOpenSidebar={() => setIsSidebarOpen(true)} 
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebarCollapsed}
        isProfileOpen={isProfileOpen} 
        setIsProfileOpen={setIsProfileOpen} 
        onPrint={handlePrint} 
        onNavigateToStation={onNavigateToStation}
      />
    </div>
  );
}
