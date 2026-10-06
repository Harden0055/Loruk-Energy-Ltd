import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  DollarSign, 
  FileText, 
  Settings, 
  LogOut, 
  Fuel, 
  BookOpen, 
  CarFront, 
  MapPin, 
  ClipboardList, 
  BotMessageSquare, 
  Box, 
  PanelLeftClose, 
  X,
  ChevronDown,
  Sparkles,
  Flame,
  PlusCircle,
  Receipt,
  CheckCircle2,
  CreditCard,
  History,
  ShieldCheck,
  Building2,
  Tag,
  BarChart3,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import FireLEIcon from './FireLEIcon';
import ThemeToggle from './ThemeToggle';

export interface SubPageItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  page: string;
  params?: any;
  badge?: string;
  badgeColor?: string;
}

export interface NavParentItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subPages: SubPageItem[];
}

interface SidebarProps {
  currentPage: string;
  currentStation?: 'Ndalu' | 'Junction' | 'Combined';
  currentStationName?: string | null;
  onNavigate: (page: any, params?: any) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  currentPage, 
  currentStation = 'Combined',
  currentStationName,
  onNavigate, 
  onClose, 
  isCollapsed, 
  onToggleCollapse 
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  // Hover and Pin expansion state
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navItems: NavParentItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      subPages: [
        { id: 'dash-all', label: 'All Stations Overview', icon: Layers, page: 'dashboard', params: { station: 'Combined' } },
        { id: 'dash-ndalu', label: 'Ndalu Station KPI', icon: MapPin, page: 'dashboard', params: { station: 'Ndalu' } },
        { id: 'dash-junction', label: 'Junction Station KPI', icon: MapPin, page: 'dashboard', params: { station: 'Junction' } },
        { id: 'dash-activity', label: 'Recent Activity Feed', icon: History, page: 'dashboard' },
      ]
    },
    { 
      id: 'fuelsuite', 
      label: 'FuelSuite Pro', 
      icon: Settings,
      badge: 'NEW',
      subPages: [
        { id: 'fs-dash', label: 'Operations Dashboard', icon: LayoutDashboard, page: 'fuelsuite', params: { fuelsuiteView: 'Dashboard' } },
        { id: 'fs-daily', label: 'Daily Data Entry', icon: ClipboardList, page: 'fuelsuite', params: { fuelsuiteView: 'Daily Data Entry' }, badge: 'DAILY' },
        { id: 'fs-whiteoils', label: 'White Oils & Pumps', icon: Fuel, page: 'fuelsuite', params: { fuelsuiteView: 'White Oils' } },
        { id: 'fs-lpg', label: 'LPG Gas Dispense', icon: Flame, page: 'fuelsuite', params: { fuelsuiteView: 'LPG' } },
        { id: 'fs-inv', label: 'Tanks & Inventory Dip', icon: Box, page: 'fuelsuite', params: { fuelsuiteView: 'Inventory' } },
        { id: 'fs-exp', label: 'Station Expenses', icon: Receipt, page: 'fuelsuite', params: { fuelsuiteView: 'Expenses' } },
        { id: 'fs-invs', label: 'Invoices & Billing', icon: FileText, page: 'fuelsuite', params: { fuelsuiteView: 'Invoices' } },
        { id: 'fs-cash', label: 'Cash Position & Till', icon: DollarSign, page: 'fuelsuite', params: { fuelsuiteView: 'Cash Position' } },
        { id: 'fs-report', label: 'Daily Shift Report', icon: Layers, page: 'fuelsuite', params: { fuelsuiteView: 'Daily Report' } },
        { id: 'fs-master', label: 'Master Records', icon: Database, page: 'fuelsuite', params: { fuelsuiteView: 'Master Records' } },
      ]
    },
    { 
      id: 'deliveries', 
      label: 'Fuel Deliveries', 
      icon: Truck,
      subPages: [
        { id: 'del-all', label: 'All Fuel Deliveries', icon: Truck, page: 'deliveries' },
        { id: 'del-new', label: 'Record New Delivery', icon: PlusCircle, page: 'deliveries', params: { action: 'add' }, badge: 'ACTION' },
        { id: 'del-splits', label: 'Diesel & Super Splits', icon: Fuel, page: 'deliveries', params: { filter: 'split' } },
        { id: 'del-audit', label: 'Reconciliation Logs', icon: CheckCircle2, page: 'deliveries' },
      ]
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      icon: DollarSign,
      subPages: [
        { id: 'pay-all', label: 'Customer Payments List', icon: DollarSign, page: 'payments' },
        { id: 'pay-new', label: 'Record New Payment', icon: PlusCircle, page: 'payments', params: { action: 'add' }, badge: 'RECEIPT' },
        { id: 'pay-reconcile', label: 'Payment Reconciliation', icon: CreditCard, page: 'payments' },
        { id: 'pay-history', label: 'Receipts & Audit Trail', icon: History, page: 'payments' },
      ]
    },
    { 
      id: 'customers', 
      label: 'Customers', 
      icon: Users,
      subPages: [
        { id: 'cust-all', label: 'Customer Directory', icon: Users, page: 'customers' },
        { id: 'cust-new', label: 'Add New Customer', icon: PlusCircle, page: 'customers', params: { action: 'add' } },
        { id: 'cust-debtors', label: 'Debtors & Balances', icon: DollarSign, page: 'customers', params: { filter: 'debtors' }, badge: 'DEBTS' },
        { id: 'cust-statements', label: 'Customer Statements', icon: FileText, page: 'customers' },
      ]
    },
    { 
      id: 'ledger', 
      label: 'Ledger', 
      icon: BookOpen,
      subPages: [
        { id: 'led-all', label: 'General Ledger View', icon: BookOpen, page: 'ledger' },
        { id: 'led-fifo', label: 'FIFO Balance Audit', icon: ShieldCheck, page: 'ledger', badge: 'FIFO' },
        { id: 'led-debit', label: 'Debit Entries (Deliveries)', icon: ArrowRight, page: 'ledger' },
        { id: 'led-credit', label: 'Credit Entries (Payments)', icon: CheckCircle2, page: 'ledger' },
      ]
    },
    { 
      id: 'fleet', 
      label: 'Fleet Fueling', 
      icon: CarFront,
      subPages: [
        { id: 'fleet-all', label: 'Fleet Dispense Matrix', icon: CarFront, page: 'fleet' },
        { id: 'fleet-direct', label: 'Direct Vehicle Fueling', icon: Fuel, page: 'fleet', params: { action: 'dispense' } },
        { id: 'fleet-logs', label: 'Fleet Consumption Logs', icon: History, page: 'fleet' },
      ]
    },
    { 
      id: 'trucks', 
      label: 'Trucks', 
      icon: Truck,
      subPages: [
        { id: 'truck-all', label: 'Fleet Truck Directory', icon: Truck, page: 'trucks' },
        { id: 'truck-new', label: 'Add New Fleet Truck', icon: PlusCircle, page: 'trucks', params: { action: 'add' } },
        { id: 'truck-analytics', label: 'Tanker Analytics & Trips', icon: BarChart3, page: 'trucks' },
      ]
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText,
      subPages: [
        { id: 'rep-summary', label: 'Executive Summary', icon: BarChart3, page: 'reports' },
        { id: 'rep-sales', label: 'Sales & Volume Analysis', icon: Layers, page: 'reports' },
        { id: 'rep-aging', label: 'Customer Aging / Debts', icon: DollarSign, page: 'reports' },
        { id: 'rep-products', label: 'Product Stock Performance', icon: Box, page: 'reports' },
      ]
    },
    { 
      id: 'stations', 
      label: 'Stations', 
      icon: MapPin,
      subPages: [
        { id: 'st-all', label: 'All Stations Directory', icon: Building2, page: 'stations' },
        { id: 'st-ndalu', label: 'Ndalu Station Hub', icon: MapPin, page: 'stationDashboard', params: { stationId: 'ndalu', stationName: 'Ndalu' }, badge: 'NDALU' },
        { id: 'st-junction', label: 'Junction Station Hub', icon: MapPin, page: 'stationDashboard', params: { stationId: 'junction', stationName: 'Junction' }, badge: 'JUNCTION' },
      ]
    },
    { 
      id: 'products', 
      label: 'Products', 
      icon: Box,
      subPages: [
        { id: 'prod-all', label: 'Product Catalog', icon: Box, page: 'products' },
        { id: 'prod-diesel', label: 'Diesel (AGO) Inventory', icon: Fuel, page: 'products' },
        { id: 'prod-super', label: 'Super Petrol (PMS) Stock', icon: Flame, page: 'products' },
        { id: 'prod-pricing', label: 'Pricing & Margins', icon: Tag, page: 'products' },
      ]
    },
  ];

  const bottomItems: NavParentItem[] = [
    {
      id: 'assistant',
      label: 'AI Assistant',
      icon: BotMessageSquare,
      subPages: [
        { id: 'ai-chat', label: 'Fuel AI Smart Chat', icon: BotMessageSquare, page: 'assistant' },
        { id: 'ai-ocr', label: 'Invoice & Document OCR', icon: Sparkles, page: 'assistant', badge: 'AI' },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      subPages: [
        { id: 'set-system', label: 'System Preferences', icon: Settings, page: 'settings' },
        { id: 'set-users', label: 'User Roles & Access', icon: Users, page: 'settings' },
        { id: 'set-stations', label: 'Station Profiles', icon: MapPin, page: 'settings' },
      ]
    }
  ];

  // Helper to determine active parent
  const isParentActive = (parentId: string) => {
    if (currentPage === parentId) return true;
    if (currentPage === 'customerDashboard' && parentId === 'customers') return true;
    if (currentPage === 'truckDashboard' && parentId === 'trucks') return true;
    if (currentPage === 'stationDashboard' && parentId === 'stations') return true;
    return false;
  };

  // Check if a parent item is expanded
  const isExpanded = (parentId: string) => {
    if (hoveredItemId !== null) {
      return hoveredItemId === parentId;
    }
    if (pinnedItemId !== null) {
      return pinnedItemId === parentId;
    }
    return isParentActive(parentId);
  };

  // Hover handlers with slight debounce for smooth navigation
  const handleMouseEnter = (id: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredItemId(id);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItemId(null);
    }, 180);
  };

  // Toggle manual pin
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedItemId(prev => prev === id ? null : id);
  };

  // Helper to check active sub-page
  const isSubActive = (sub: SubPageItem, parentId: string) => {
    if (parentId === 'dashboard') {
      if (sub.params?.station) {
        return currentPage === 'dashboard' && currentStation === sub.params.station;
      }
      return currentPage === 'dashboard' && (!currentStation || currentStation === 'Combined');
    }
    if (parentId === 'stations') {
      if (sub.params?.stationName) {
        return currentPage === 'stationDashboard' && currentStationName === sub.params.stationName;
      }
      return currentPage === 'stations';
    }
    if (parentId === 'customers' && sub.id === 'cust-statements') {
      return currentPage === 'customerDashboard';
    }
    if (parentId === 'trucks' && sub.id === 'truck-analytics') {
      return currentPage === 'truckDashboard';
    }
    return currentPage === sub.page && !sub.params;
  };

  const renderNavParent = (item: NavParentItem) => {
    const Icon = item.icon;
    const isActive = isParentActive(item.id);
    const expanded = isExpanded(item.id);

    return (
      <div 
        key={item.id} 
        className="relative group/parent transition-all"
        onMouseEnter={() => handleMouseEnter(item.id)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center">
          <button
            onClick={() => {
              onNavigate(item.id);
              if (onClose) onClose();
            }}
            className={cn(
              "flex-1 flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl sidebar-item cursor-pointer text-left transition-all duration-200",
              isActive 
                ? item.id === 'payments'
                  ? "sidebar-item-active-green font-bold shadow-lg"
                  : "sidebar-item-active font-bold shadow-lg"
                : item.id === 'fuelsuite'
                  ? "text-[#00E676] bg-[#00E676]/10 hover:bg-[#00E676]/15 border border-[#00E676]/30 shadow-[0_0_12px_rgba(0,230,118,0.15)]"
                  : "text-theme-text-muted hover:bg-white/[0.06] hover:text-white"
            )}
            title={`Go to ${item.label}`}
          >
            <Icon className={cn(
              "w-5 h-5 shrink-0 transition-transform duration-200 group-hover/parent:scale-110", 
              isActive 
                ? item.id === 'payments' ? "text-emerald-400 stroke-emerald-400" : "" 
                : item.id === 'fuelsuite' ? "text-[#00E676]" : ""
            )} />
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm shrink-0">
                {item.badge}
              </span>
            )}
          </button>

          {/* Subpages expansion trigger button */}
          {item.subPages && item.subPages.length > 0 && (
            <button
              type="button"
              onClick={(e) => handleTogglePin(item.id, e)}
              className={cn(
                "p-1.5 rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1",
                expanded ? "text-theme-primary bg-white/[0.04]" : ""
              )}
              title={expanded ? "Collapse sub-pages" : "Expand sub-pages"}
            >
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-250 ease-out",
                expanded ? "transform rotate-180 text-theme-primary" : "transform rotate-0"
              )} />
            </button>
          )}
        </div>

        {/* Hover-expandable Sub Pages Accordion Container */}
        {item.subPages && item.subPages.length > 0 && (
          <div 
            className="sidebar-subnav-grid"
            data-expanded={expanded ? "true" : "false"}
          >
            <div className="overflow-hidden">
              <div className="ml-3.5 pl-2.5 border-l-2 border-theme-border/40 space-y-1 py-1.5 my-0.5">
                {item.subPages.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubItemActive = isSubActive(sub, item.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        onNavigate(sub.page, sub.params);
                        if (onClose) onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer text-left group/sub",
                        isSubItemActive
                          ? "bg-theme-primary/15 text-theme-primary font-bold border border-theme-primary/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                          : "text-theme-text-muted hover:text-white hover:bg-white/[0.06] hover:translate-x-1"
                      )}
                    >
                      {SubIcon ? (
                        <SubIcon className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-colors",
                          isSubItemActive ? "text-theme-primary" : "text-theme-text-muted group-hover/sub:text-theme-primary"
                        )} />
                      ) : (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                          isSubItemActive ? "bg-theme-primary shadow-[0_0_8px_var(--color-theme-primary)] scale-125" : "bg-theme-text-muted/50 group-hover/sub:bg-theme-primary"
                        )} />
                      )}
                      <span className="truncate">{sub.label}</span>
                      {sub.badge && (
                        <span className="ml-auto text-[8px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-theme-text-muted uppercase tracking-wider shrink-0">
                          {sub.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="h-full w-64 border-r border-theme-border flex flex-col bg-[var(--theme-sidebar-bg,#000000)] text-theme-text transition-all duration-300 relative select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-theme-border/50 mb-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#00E676] rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all duration-300 hover:scale-105 shrink-0">
            <FireLEIcon className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gradient transition-colors truncate">Loruk Energy</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Desktop collapse button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Hide Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}

          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Main Nav Items with Hover Expansion */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto hide-scrollbar">
        {navItems.map(renderNavParent)}
      </nav>

      {/* Footer Nav with Expandable Sub Pages & User Profile */}
      <div className="p-4 border-t border-theme-border mt-auto shrink-0 bg-black/20">
        <div className="mb-3 space-y-1.5">
          {bottomItems.map(renderNavParent)}
        </div>

        <div className="mb-3">
          <ThemeToggle variant="pill" className="w-full justify-between" />
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 mb-3 bg-theme-panel border border-theme-border rounded-xl shadow-[0_0_15px_rgba(139,61,255,0.05)]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#00E676] flex items-center justify-center font-bold text-sm text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] shrink-0">
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-theme-text">{user?.displayName || 'Admin User'}</p>
            <p className="text-[11px] text-theme-text-muted truncate">{user?.email || 'admin@fuelflow.io'}</p>
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
