import React, { useState } from 'react';
import { FuelProvider, useFuel, Station } from './context';
import { LayoutDashboard, Fuel, Flame, Box, ReceiptText, FileText, Wallet, BarChart3, Menu, X } from 'lucide-react';
import DashboardView from './views/DashboardView';
import PumpReadingsView from './views/PumpReadingsView';
import LPGView from './views/LPGView';
import InventoryView from './views/InventoryView';
import ExpensesView from './views/ExpensesView';
import InvoicesView from './views/InvoicesView';
import CashPositionView from './views/CashPositionView';
import ReportsView from './views/ReportsView';

export type ViewType = 'Dashboard' | 'Pump Readings' | 'LPG' | 'Inventory' | 'Expenses' | 'Invoices' | 'Cash Position' | 'Reports';

const Sidebar = ({ currentView, setCurrentView, onBackToMain, isOpen, setIsOpen }: { currentView: ViewType, setCurrentView: (v: ViewType) => void, onBackToMain: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const { activeStation, setActiveStation } = useFuel();
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Pump Readings', icon: Fuel },
    { name: 'LPG', icon: Flame },
    { name: 'Inventory', icon: Box },
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

        <div className="p-4 border-b border-[#2d325a]">
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Station Filter</label>
          <select 
            className="w-full bg-[#13162b] border border-[#2d325a] text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            value={activeStation}
            onChange={(e) => setActiveStation(e.target.value as Station)}
          >
            <option value="Combined Total">Combined Total</option>
            <option value="Ndalu Station">Ndalu Station</option>
            <option value="Junction Station">Junction Station</option>
          </select>
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
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#13162b]'
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
            className="w-full flex items-center justify-center px-4 py-2 border border-[#2d325a] text-slate-400 rounded-lg hover:bg-[#13162b] hover:text-slate-200 transition-colors text-sm"
          >
            Exit FuelSuite
          </button>
        </div>
      </div>
    </>
  );
};

const MainContent = ({ currentView, onOpenSidebar }: { currentView: ViewType, onOpenSidebar: () => void }) => {
  return (
    <div className="flex-1 bg-[#13162b] overflow-hidden flex flex-col min-w-0">
      <header className="lg:hidden p-4 border-b border-[#2d325a] bg-[#1a1d36] flex flex-row items-center gap-4">
         <button onClick={onOpenSidebar} className="p-2 text-slate-300 hover:bg-[#2d325a] rounded-lg">
            <Menu className="w-5 h-5" />
         </button>
         <h1 className="text-lg font-bold text-slate-200">{currentView}</h1>
      </header>
      <div className="flex-1 overflow-auto">
        {currentView === 'Dashboard' && <DashboardView />}
        {currentView === 'Pump Readings' && <PumpReadingsView />}
        {currentView === 'LPG' && <LPGView />}
        {currentView === 'Inventory' && <InventoryView />}
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
      <div className="flex h-screen bg-[#13162b] font-sans selection:bg-cyan-500/30 overflow-hidden relative">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} onBackToMain={onBackToMain} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <MainContent currentView={currentView} onOpenSidebar={() => setIsSidebarOpen(true)} />
      </div>
    </FuelProvider>
  );
}
