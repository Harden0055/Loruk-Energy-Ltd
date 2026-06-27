import React, { useState } from 'react';
import { FuelProvider, useFuel, Station, STATIONS } from './context';
import { LayoutDashboard, Fuel, Flame, Box, ReceiptText, FileText, Wallet, BarChart3, Menu, X } from 'lucide-react';
import DashboardView from './views/DashboardView';
import PumpReadingsView from './views/PumpReadingsView';
import LPGView from './views/LPGView';
import InventoryView from './views/InventoryView';
import ExpensesView from './views/ExpensesView';
import InvoicesView from './views/InvoicesView';
import CashPositionView from './views/CashPositionView';
import ReportsView from './views/ReportsView';
import ProductsView from './views/ProductsView';

export type ViewType = 'Dashboard' | 'Pump Readings' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Reports' | 'Products';

const Sidebar = ({ currentView, setCurrentView, onBackToMain, isOpen, setIsOpen }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onBackToMain: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Pump Readings', icon: Fuel },
    { name: 'LPG', icon: Flame },
    { name: 'Inventory', icon: Box },
    { name: 'Products', icon: Box },
    { name: 'Expenses', icon: ReceiptText },
    { name: 'Invoices', icon: FileText },
    { name: 'Cash Position', icon: Wallet },
    { name: 'Reports', icon: BarChart3 },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform lg:transform-none transition-transform duration-300 ease-in-out w-64 bg-[#1a1d36] border-r border-[#2d325a] flex flex-col h-full text-slate-200 hide-scrollbar overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-[#2d325a] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">FuelSuite Pro</h2>
            <p className="text-xs text-slate-400 mt-1">Energy Management</p>
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { setCurrentView(item.name as ViewType); setIsOpen(false); }}
                className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1123]'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2d325a]">
          <button 
            onClick={onBackToMain}
            className="w-full flex items-center justify-center px-4 py-2 border border-[#2d325a] text-slate-400 rounded-lg hover:bg-[#0f1123] hover:text-slate-200 transition-colors text-sm"
          >
            Exit FuelSuite
          </button>
        </div>
      </div>
    </>
  );
};

const MainContent = ({ currentView, onOpenSidebar }: { currentView: ViewType, onOpenSidebar: () => void }) => {
  const { activeStation, setActiveStation } = useFuel();
  
  return (
    <div className="flex-1 bg-[#0f1123] overflow-hidden flex flex-col min-w-0">
      <header className="p-4 border-b border-[#2d325a] bg-[#1a1d36] flex flex-row items-center justify-between gap-4 z-10 shadow-sm relative">
         <div className="flex items-center gap-4">
           <button onClick={onOpenSidebar} className="lg:hidden p-2 text-slate-300 hover:bg-[#2d325a] rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
           </button>
           <h1 className="text-lg font-bold text-slate-200 hidden sm:block">{currentView}</h1>
         </div>
         
         <div className="flex items-center gap-3">
           <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">Current Station</label>
           <div className="relative">
             <select 
               className="appearance-none bg-cyan-500/10 border-2 border-cyan-500/50 text-cyan-400 rounded-lg pl-4 pr-10 py-2.5 text-sm font-bold focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:bg-cyan-500/20"
               value={activeStation}
               onChange={(e) => setActiveStation(e.target.value as Station)}
             >
               <option value="Combined Total" className="bg-[#1a1d36] text-slate-200 font-medium">Combined Total</option>
               {STATIONS.map(s => <option key={s} value={s} className="bg-[#1a1d36] text-slate-200 font-medium">{s}</option>)}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-cyan-400">
               <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
             </div>
           </div>
         </div>
      </header>
      <div className="flex-1 overflow-auto">
        {currentView === 'Dashboard' && <DashboardView />}
        {currentView === 'Pump Readings' && <PumpReadingsView />}
        {currentView === 'LPG' && <LPGView />}
        {currentView === 'Inventory' && <InventoryView />}
        {currentView === 'Products' && <ProductsView />}
        {currentView === 'Expenses' && <ExpensesView />}
        {currentView === 'Invoices' && <InvoicesView />}
        {currentView === 'Cash Position' && <CashPositionView />}
        {currentView === 'Reports' && <ReportsView />}
      </div>
    </div>
  );
};

export default function FuelSuiteApp({ onBackToMain }: { onBackToMain: () => void }) {
  const [currentView, setCurrentView] = useState<ViewType>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <FuelProvider>
      <div className="flex h-screen bg-[#0f1123] font-sans selection:bg-cyan-500/30 overflow-hidden relative">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} onBackToMain={onBackToMain} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <MainContent currentView={currentView} onOpenSidebar={() => setIsSidebarOpen(true)} />
      </div>
    </FuelProvider>
  );
}
