import React, { useState, useMemo } from 'react';
import { FuelProvider, useFuel, Station } from './context';
import { LayoutDashboard, Fuel, Flame, Box, ReceiptText, FileText, Wallet, BarChart3, Menu, X, User, Settings, Building2, Printer, Database } from 'lucide-react';
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

export type ViewType = 'Dashboard' | 'Daily Data Entry' | 'Pump Readings' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Master Records' | 'Reports' | 'Daily Report' | 'Settings';

const Sidebar = ({ currentView, setCurrentView, onBackToMain, isOpen, setIsOpen }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onBackToMain: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Daily Data Entry', icon: FileText },
    { name: 'Pump Readings', icon: Fuel },
    { name: 'LPG', icon: Flame },
    { name: 'Inventory', icon: Box },
    { name: 'Expenses', icon: ReceiptText },
    { name: 'Invoices', icon: FileText },
    { name: 'Cash Position', icon: Wallet },
    { name: 'Master Records', icon: Database },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Daily Report', icon: FileText },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-[#00000080]  z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform lg:transform-none transition-transform duration-300 ease-in-out w-64 bg-[#0E0E11] border-r border-theme-border flex flex-col h-full text-theme-text hide-scrollbar overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-theme-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gradient">FuelSuite Pro</h2>
            <p className="text-[10px] text-[#A1A1AA] mt-1 font-mono uppercase tracking-widest">Energy Management</p>
          </div>
          <button className="lg:hidden p-1 text-[#A1A1AA] hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.name;
            const isNegativeTheme = ['Daily Data Entry', 'Daily Report', 'Expenses', 'Settings'].includes(item.name);
            const activeClass = isNegativeTheme ? 'sidebar-item-active-purple' : 'sidebar-item-active-blue';
            const iconActiveColor = isNegativeTheme ? 'text-[#B15DFF]' : 'text-[#00D4FF]';
            return (
              <button
                key={item.name}
                onClick={() => { setCurrentView(item.name as ViewType); setIsOpen(false); }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl cursor-pointer ${
                  isActive 
                    ? `${activeClass} text-white` 
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? iconActiveColor : 'text-[#71717A]'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-theme-border/30">
          <button 
            onClick={onBackToMain}
            className="w-full flex items-center justify-center px-4 py-2 border border-[#3B82F6]/30 text-[#00D4FF] bg-[#3B82F6]/5 rounded-xl hover:bg-[#3B82F6]/10 transition-all text-xs font-semibold tracking-wider uppercase cursor-pointer hover:scale-102 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            Exit FuelSuite
          </button>
        </div>
      </div>
    </>
  );
};

const MainContent = ({ currentView, onOpenSidebar, isProfileOpen, setIsProfileOpen, onPrint }: { currentView: ViewType, onOpenSidebar: () => void, isProfileOpen: boolean, setIsProfileOpen: (b: boolean) => void, onPrint: () => void }) => {
  const { activeStation, setActiveStation, stations } = useFuel();
  
  const stationsList = useMemo(() => {
    return stations.length > 0 ? stations : [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
  }, [stations]);

  return (
    <div className="flex-1 theme-bg-gradient overflow-hidden flex flex-col min-w-0">
      <header className="p-4 border-b border-theme-border/30 bg-[#0E0E11]/80 backdrop-blur-md flex flex-row items-center justify-between gap-4 z-10 relative">
         <div className="flex items-center gap-4">
           <button onClick={onOpenSidebar} className="lg:hidden p-2 text-[#A1A1AA] hover:bg-white/5 rounded-lg transition-all cursor-pointer">
              <Menu className="w-5 h-5" />
           </button>
           <h1 className="text-xl font-bold text-white tracking-tight text-gradient hidden sm:block">{currentView}</h1>
         </div>
         
         <div className="flex items-center gap-3">
           <button
             onClick={onPrint}
             className="flex items-center gap-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-theme-border transition-all duration-300 cursor-pointer shadow-md hover:scale-102"
             title="Print Page"
           >
             <Printer className="w-4 h-4 text-cyan-400" />
             <span className="hidden sm:inline">Print</span>
           </button>

           <button 
             onClick={() => setIsProfileOpen(true)}
             className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-[#3B82F6]/10 text-[#00D4FF] hover:bg-[#3B82F6]/20 transition-all duration-300 border border-[#3B82F6]/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] cursor-pointer"
             title="Profile & Summary Dashboard"
           >
             <User className="w-4 h-4 text-[#00D4FF]" />
           </button>

           <div className="flex items-center gap-2 bg-slate-900/90 border border-theme-border rounded-xl px-3 py-1.5 shadow-sm">
             <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
             <div className="flex flex-col">
               <label className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest leading-tight">Station Filter</label>
               <select 
                 className="appearance-none bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-4 hover:text-cyan-300 transition-colors"
                 value={activeStation}
                 onChange={(e) => setActiveStation(e.target.value as Station)}
               >
                 <option value="Combined Total" className="bg-slate-900 text-slate-100 font-semibold">Combined Total (All Stations)</option>
                 {stationsList.map(s => (
                   <option key={s.id || s.name} value={s.name} className="bg-slate-900 text-slate-100 font-semibold">
                     {s.name}
                   </option>
                 ))}
               </select>
             </div>
             <div className="pointer-events-none text-[#A1A1AA]">
               <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
             </div>
           </div>
         </div>
      </header>
      <div className="flex-1 overflow-auto">
        {currentView === 'Dashboard' && <DashboardView />}
        {currentView === 'Daily Data Entry' && <DailyDataEntryView />}
        {currentView === 'Pump Readings' && <PumpReadingsView />}
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
      {isProfileOpen && <MiniDashboardProfile onClose={() => setIsProfileOpen(false)} />}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print-hide">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border border-theme-border">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
              <Printer className="w-5 h-5 text-cyan-400" />
              Print / Save as PDF
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              To print or save this report as PDF in the preview environment, please open the applet in a new tab or use your browser's direct print shortcut (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">Ctrl+P</code> / <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">Cmd+P</code>).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors text-sm cursor-pointer"
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
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-xl transition-colors text-sm font-semibold cursor-pointer"
              >
                Print Now
              </button>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar currentView={currentView} setCurrentView={setCurrentView} onBackToMain={onBackToMain} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <MainContent currentView={currentView} onOpenSidebar={() => setIsSidebarOpen(true)} isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} onPrint={handlePrint} />
    </div>
  );
}
