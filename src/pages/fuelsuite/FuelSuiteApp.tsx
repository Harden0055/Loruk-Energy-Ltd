import React, { useState, useMemo } from 'react';
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
  Layers
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

export type ViewType = 'Dashboard' | 'Daily Data Entry' | 'White Oils' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Master Records' | 'Reports' | 'Daily Report' | 'Settings';

const Sidebar = ({ currentView, setCurrentView, onBackToMain, isOpen, setIsOpen }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onBackToMain: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-400', activeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    { name: 'Daily Data Entry', icon: ClipboardEdit, color: 'text-emerald-400', activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    { name: 'White Oils', icon: Fuel, color: 'text-cyan-400', activeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
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
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform lg:transform-none transition-transform duration-300 ease-in-out w-64 bg-[#0B0D14] border-r border-white/[0.08] flex flex-col h-full text-slate-100 hide-scrollbar overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gradient tracking-tight">FuelSuite Pro</h2>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Energy Operations</p>
            </div>
          </div>
          <button className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
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
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 transition-colors ${isActive ? 'bg-white/10' : 'bg-white/[0.03]'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
                </div>
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08]">
          <button 
            onClick={onBackToMain}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-slate-300 bg-white/[0.03] rounded-xl hover:bg-white/[0.08] hover:text-white transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit FuelSuite
          </button>
        </div>
      </div>
    </>
  );
};

const MainContent = ({ currentView, setCurrentView, onOpenSidebar, isProfileOpen, setIsProfileOpen, onPrint }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onOpenSidebar: () => void, isProfileOpen: boolean, setIsProfileOpen: (b: boolean) => void, onPrint: () => void }) => {
  const { activeStation, setActiveStation, stations } = useFuel();
  
  const stationsList = useMemo(() => {
    return stations.length > 0 ? stations : [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
  }, [stations]);

  return (
    <div className="flex-1 theme-bg-gradient overflow-hidden flex flex-col min-w-0">
      <header className="px-6 py-3.5 border-b border-white/[0.08] bg-[#0B0D14]/90 backdrop-blur-md flex flex-row items-center justify-between gap-4 z-10 relative">
         <div className="flex items-center gap-4">
           <button onClick={onOpenSidebar} className="lg:hidden p-2 text-slate-400 hover:bg-white/5 rounded-xl transition-all cursor-pointer">
              <Menu className="w-5 h-5" />
           </button>
           <div className="hidden sm:flex items-center gap-2.5">
             <h1 className="text-lg font-extrabold text-white tracking-tight">{currentView}</h1>
             <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">Live</span>
           </div>
         </div>
         
         <div className="flex items-center gap-3">
           <button
             onClick={onPrint}
             className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 rounded-xl border border-white/10 transition-all cursor-pointer shadow-sm"
             title="Print Page"
           >
             <Printer className="w-3.5 h-3.5 text-cyan-400" />
             <span className="hidden sm:inline">Print</span>
           </button>

           <button 
             onClick={() => setIsProfileOpen(true)}
             className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
             title="Profile & Station Performance"
           >
             <User className="w-4 h-4 text-cyan-400" />
           </button>

           <div className="flex items-center gap-2 bg-[#121520] border border-white/[0.12] rounded-xl px-3 py-1.5 shadow-sm hover:border-cyan-500/40 transition-colors">
             <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
               <Building2 className="w-3.5 h-3.5" />
             </div>
             <div className="flex flex-col">
               <label className="text-[8px] font-extrabold text-cyan-400 uppercase tracking-widest leading-none mb-0.5">Active Station</label>
               <select 
                 className="appearance-none bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-4 hover:text-cyan-300 transition-colors"
                 value={activeStation}
                 onChange={(e) => setActiveStation(e.target.value as Station)}
               >
                 <option value="Combined Total" className="bg-[#0F111A] text-slate-100 font-bold">Combined Total (All Stations)</option>
                 {stationsList.map(s => (
                   <option key={s.id || s.name} value={s.name} className="bg-[#0F111A] text-slate-100 font-bold">
                     {s.name}
                   </option>
                 ))}
               </select>
             </div>
             <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
           </div>
         </div>
      </header>
      <div className="flex-1 overflow-auto">
        {currentView === 'Dashboard' && <DashboardView />}
        {currentView === 'Daily Data Entry' && <DailyDataEntryView />}
        {currentView === 'White Oils' && <PumpReadingsView />}
        {currentView === 'LPG' && <LPGView />}
        {currentView === 'Inventory' && <InventoryView />}
        {currentView === 'Settings' && <ProductsView />}
        {currentView === 'Expenses' && <ExpensesView />}
        {currentView === 'Invoices' && <InvoicesView />}
        {currentView === 'Cash Position' && <CashPositionView />}
        {currentView === 'Master Records' && <MasterRecordsView />}
        {currentView === 'Reports' && <ReportsView />}
        {currentView === 'Daily Report' && <DailyReportView />}
      </div>
      {isProfileOpen && <MiniDashboardProfile onClose={() => setIsProfileOpen(false)} onNavigate={(view) => {
        if (view === 'WhiteOilsProfit') {
          setCurrentView('White Oils');
        }
        setIsProfileOpen(false);
      }} />}

    </div>
  );
};

export default function FuelSuiteApp({ onBackToMain }: { onBackToMain: () => void }) {
  const [currentView, setCurrentView] = useState<ViewType>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPrintWarning, setShowPrintWarning] = useState(false);

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
    <div className="flex h-screen theme-bg-gradient font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {showPrintWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print-hide">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
              <Printer className="w-5 h-5 text-cyan-400" />
              Print / Save as PDF
            </h3>
            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
              To print or save this report as PDF in the preview environment, please open the applet in a new tab or use your browser's direct print shortcut (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">Ctrl+P</code> / <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">Cmd+P</code>).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors text-xs cursor-pointer"
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
                className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl transition-colors text-xs font-bold cursor-pointer"
              >
                Print Now
              </button>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl transition-colors text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar currentView={currentView} setCurrentView={setCurrentView} onBackToMain={onBackToMain} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <MainContent currentView={currentView} setCurrentView={setCurrentView} onOpenSidebar={() => setIsSidebarOpen(true)} isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} onPrint={handlePrint} />
    </div>
  );
}
