import React, { useState, useMemo, useEffect } from 'react';
import { FuelProvider, useFuel, Station } from './context';
import { StationId, STATIONS } from './stationReportsDb';
import { 
  LayoutDashboard, 
  Fuel, 
  Flame, 
  ReceiptText, 
  FileText, 
  Wallet, 
  BarChart3, 
  Menu, 
  X, 
  Building2, 
  Printer, 
  ChevronDown, 
  LogOut, 
  ClipboardEdit, 
  Layers, 
  PanelLeftClose, 
  PanelLeft,
  Clock,
  Pencil
} from 'lucide-react';
import DailyReportEntryView from './views/DailyReportEntryView';
import StationReportsArchiveView from './views/StationReportsArchiveView';
import DashboardView from './views/DashboardView';
import PumpReadingsView from './views/PumpReadingsView';
import LPGView from './views/LPGView';
import ExpensesView from './views/ExpensesView';
import InvoicesView from './views/InvoicesView';
import CashPositionView from './views/CashPositionView';
import MiniDashboardProfile from './views/MiniDashboardProfile';
import ThemeToggle from '../../components/ThemeToggle';

export type ViewType = 
  | 'Daily Report Entry' 
  | 'Station Reports Archive'
  | 'Dashboard' 
  | 'White Oils' 
  | 'LPG & Purchases' 
  | 'Expenses' 
  | 'Invoices & Debts' 
  | 'Where the Money Is';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
  onBackToMain: () => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}

const Sidebar = ({ 
  currentView, 
  setCurrentView, 
  onBackToMain, 
  isOpen, 
  setIsOpen,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) => {
  const menuItems = [
    { name: 'Daily Report Entry', icon: ClipboardEdit, color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]', badge: 'DAILY' },
    { name: 'Station Reports Archive', icon: Clock, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]', badge: 'AUDIT' },
    { name: 'Dashboard', icon: LayoutDashboard, color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]' },
    { name: 'White Oils', icon: Fuel, color: 'text-purple-400', activeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]' },
    { name: 'LPG & Purchases', icon: Flame, color: 'text-amber-400', activeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
    { name: 'Expenses', icon: ReceiptText, color: 'text-rose-400', activeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
    { name: 'Invoices & Debts', icon: FileText, color: 'text-blue-400', activeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
    { name: 'Where the Money Is', icon: Wallet, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out flex flex-col h-full bg-[#000000] border-r border-white/10 text-theme-text hide-scrollbar overflow-y-auto ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${
        isCollapsed ? "lg:w-0 lg:p-0 lg:border-r-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden" : "w-64"
      }`}>
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.2)] shrink-0">
              <Fuel className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-200 tracking-tight truncate">Fuel Suite</h2>
              <p className="text-[9px] text-[#8B9BB4] font-mono uppercase tracking-widest truncate">Daily Shift Audit</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsCollapsed(true)} 
              className="hidden lg:flex p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-white/[0.05] transition-colors"
              title="Collapse Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto hide-scrollbar">
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
                {item.badge && (
                  <span className="ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                    {item.badge}
                  </span>
                )}
                {isActive && !item.badge && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#A855F7] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto shrink-0">
          <button 
            onClick={onBackToMain}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-theme-text-muted bg-white/[0.03] rounded-xl hover:bg-white/[0.08] hover:text-white transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Fuel Suite
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
  editTarget,
  setEditTarget
}: { 
  currentView: ViewType; 
  setCurrentView: (v: ViewType) => void; 
  onOpenSidebar: () => void; 
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isProfileOpen: boolean; 
  setIsProfileOpen: (b: boolean) => void; 
  onPrint: () => void;
  editTarget: { stationId: StationId; reportDate: string } | null;
  setEditTarget: (target: { stationId: StationId; reportDate: string } | null) => void;
}) => {
  const { activeStation, setActiveStation } = useFuel();

  return (
    <div className="flex-1 bg-[#000000] overflow-hidden flex flex-col min-w-0">
      <header className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#000000] flex flex-row items-center justify-between gap-4 z-10 relative transition-colors duration-300">
         <div className="flex items-center gap-3 sm:gap-4 min-w-0">
           {/* Mobile menu open */}
           <button 
             onClick={onOpenSidebar}
             className="p-2 -ml-2 text-theme-text-muted hover:text-theme-text lg:hidden transition-colors rounded-xl hover:bg-white/[0.05]"
           >
             <Menu className="w-5 h-5" />
           </button>
           
           {/* Desktop collapse expand button */}
           {isSidebarCollapsed && (
             <button
               onClick={onToggleSidebar}
               className="hidden lg:flex p-2 -ml-2 text-theme-text-muted hover:text-theme-text transition-colors rounded-xl hover:bg-white/[0.05]"
               title="Expand Sidebar (Ctrl+B)"
             >
               <PanelLeft className="w-5 h-5" />
             </button>
           )}

           <div className="min-w-0">
             <div className="flex items-center gap-2">
               <h1 className="text-base sm:text-lg font-black text-slate-200 tracking-tight truncate">
                 {currentView}
               </h1>
               <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/25">
                 REPORT-BASED AUDIT
               </span>
             </div>
           </div>
         </div>

         {/* Right Controls */}
         <div className="flex items-center gap-2.5 shrink-0">
           <ThemeToggle variant="button" />

           {/* Active Station Selector */}
           <div className="flex items-center gap-2 bg-[#000000] border border-white/10 px-3 py-1.5 rounded-xl shadow-inner">
             <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
               <Building2 className="w-3.5 h-3.5" />
             </div>
             <div className="flex flex-col">
               <label className="text-[8px] font-extrabold text-purple-400 uppercase tracking-widest leading-none mb-0.5">Station View</label>
               <select 
                 className="appearance-none bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-4 hover:text-purple-300 transition-colors"
                 value={activeStation}
                 onChange={(e) => setActiveStation(e.target.value as Station)}
               >
                 <option value="Combined Total" className="bg-[#000000] text-slate-200 font-bold">All Stations (Combined)</option>
                 <option value="Loruk Ndalu Filling Station" className="bg-[#000000] text-slate-200 font-bold">Loruk Ndalu Filling Station</option>
                 <option value="Loruk Junction Filling Station" className="bg-[#000000] text-slate-200 font-bold">Loruk Junction Filling Station</option>
               </select>
             </div>
             <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none" />
           </div>

           <button
             type="button"
             onClick={onPrint}
             className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
             title="Print Page"
           >
             <Printer className="w-3.5 h-3.5" />
             <span>Print</span>
           </button>
         </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#000000]">
        {currentView === 'Daily Report Entry' && (
          <DailyReportEntryView 
            initialStation={editTarget?.stationId || (activeStation.includes('Junction') ? 'junction' : 'ndalu')}
            initialDate={editTarget?.reportDate}
            onReportSaved={() => {
              // Stay or navigate
            }}
            onNavigateToArchive={() => setCurrentView('Station Reports Archive')}
          />
        )}

        {currentView === 'Station Reports Archive' && (
          <StationReportsArchiveView 
            onEditReport={(stId, date) => {
              setEditTarget({ stationId: stId, reportDate: date });
              setCurrentView('Daily Report Entry');
            }}
            onNavigateToNewReport={() => {
              setEditTarget(null);
              setCurrentView('Daily Report Entry');
            }}
          />
        )}

        {currentView === 'Dashboard' && <DashboardView />}
        {currentView === 'White Oils' && <PumpReadingsView />}
        {currentView === 'LPG & Purchases' && <LPGView />}
        {currentView === 'Expenses' && <ExpensesView />}
        {currentView === 'Invoices & Debts' && <InvoicesView />}
        {currentView === 'Where the Money Is' && <CashPositionView />}
      </div>

      {isProfileOpen && (
        <MiniDashboardProfile 
          onClose={() => setIsProfileOpen(false)} 
          onNavigate={(view) => {
            if (view === 'WhiteOilsProfit') {
              setCurrentView('White Oils');
            }
            setIsProfileOpen(false);
          }} 
        />
      )}
    </div>
  );
};

export default function FuelSuiteApp({ 
  onBackToMain,
  initialView = 'Daily Report Entry',
}: { 
  onBackToMain: () => void;
  initialView?: ViewType;
}) {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [editTarget, setEditTarget] = useState<{ stationId: StationId; reportDate: string } | null>(null);

  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

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
    <div className="flex h-screen bg-[#000000] font-sans selection:bg-purple-500/20 overflow-hidden relative">
      {showPrintWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print-hide">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border border-theme-border">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
              <Printer className="w-5 h-5 text-purple-400" />
              Print / Save as PDF
            </h3>
            <p className="text-theme-text-muted text-xs mb-6 leading-relaxed">
              To print or save this report as PDF in the preview environment, please open the applet in a new tab or use your browser's direct print shortcut (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs">Ctrl+P</code> / <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs">Cmd+P</code>).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
        editTarget={editTarget}
        setEditTarget={setEditTarget}
      />
    </div>
  );
}
