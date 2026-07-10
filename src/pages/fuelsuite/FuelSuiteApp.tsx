import React, { useState } from 'react';
import { FuelProvider, useFuel, Station, STATIONS } from './context';
import { LayoutDashboard, Fuel, Flame, Box, ReceiptText, FileText, Wallet, BarChart3, Menu, X, User } from 'lucide-react';
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

import DailyReportView from './views/DailyReportView';
import MiniDashboardProfile from './views/MiniDashboardProfile';

export type ViewType = 'Dashboard' | 'Daily Data Entry' | 'Pump Readings' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Reports' | 'Daily Report' | 'Products';

const Sidebar = ({ currentView, setCurrentView, onBackToMain, isOpen, setIsOpen }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onBackToMain: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Daily Data Entry', icon: FileText },
    { name: 'Pump Readings', icon: Fuel },
    { name: 'LPG', icon: Flame },
    { name: 'Inventory', icon: Box },
    { name: 'Products', icon: Box },
    { name: 'Expenses', icon: ReceiptText },
    { name: 'Invoices', icon: FileText },
    { name: 'Cash Position', icon: Wallet },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Daily Report', icon: FileText },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
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
            const isNegativeTheme = ['Daily Data Entry', 'Daily Report', 'Expenses', 'Products'].includes(item.name);
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

const MainContent = ({ currentView, onOpenSidebar, isProfileOpen, setIsProfileOpen }: { currentView: ViewType, onOpenSidebar: () => void, isProfileOpen: boolean, setIsProfileOpen: (b: boolean) => void }) => {
  const { activeStation, setActiveStation } = useFuel();
  
  return (
    <div className="flex-1 theme-bg-gradient overflow-hidden flex flex-col min-w-0">
      <header className="p-4 border-b border-theme-border/30 bg-transparent flex flex-row items-center justify-between gap-4 z-10 relative">
         <div className="flex items-center gap-4">
           <button onClick={onOpenSidebar} className="lg:hidden p-2 text-[#A1A1AA] hover:bg-white/5 rounded-lg transition-all cursor-pointer">
              <Menu className="w-5 h-5" />
           </button>
           <h1 className="text-xl font-bold text-white tracking-tight text-gradient hidden sm:block">{currentView}</h1>
         </div>
         
         <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsProfileOpen(true)}
             className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-[#3B82F6]/10 text-[#00D4FF] hover:bg-[#3B82F6]/20 transition-all duration-300 border border-[#3B82F6]/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] cursor-pointer"
             title="Profile & Summary Dashboard"
           >
             <User className="w-4 h-4 text-[#00D4FF]" />
           </button>
           <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider hidden sm:block">Current Station</label>
           <div className="relative">
             <select 
               className="appearance-none bg-[#121216]/80 border border-theme-border/50 text-white rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all cursor-pointer hover:bg-[#18181C]"
               value={activeStation}
               onChange={(e) => setActiveStation(e.target.value as Station)}
             >
               <option value="Combined Total" className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900 font-medium">Combined Total</option>
               {STATIONS.map(s => <option key={s} value={s} className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900 font-medium">{s}</option>)}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#A1A1AA]">
               <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
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
        {currentView === 'Products' && <ProductsView />}
        {currentView === 'Expenses' && <ExpensesView />}
        {currentView === 'Invoices' && <InvoicesView />}
        {currentView === 'Cash Position' && <CashPositionView />}
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

  return (
    <div className="flex h-screen theme-bg-gradient font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} onBackToMain={onBackToMain} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <MainContent currentView={currentView} onOpenSidebar={() => setIsSidebarOpen(true)} isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} />
    </div>
  );
}
