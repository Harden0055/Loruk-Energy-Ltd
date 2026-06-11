import { useState } from 'react';
import { useAuth, AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { SyncProvider, useSync } from './lib/sync';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Fleet from './pages/Fleet';
import TruckDashboard from './pages/TruckDashboard';
import StationReports from './pages/StationReports';
import Customers from './pages/Customers';
import Deliveries from './pages/Deliveries';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import CustomerDashboard from './pages/CustomerDashboard';
import { Fuel, LogIn, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

type Page = 'dashboard' | 'ledger' | 'fleet' | 'customers' | 'deliveries' | 'payments' | 'reports' | 'customerDashboard' | 'stationReports' | 'truckDashboard';

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTruckReg, setSelectedTruckReg] = useState<string | null>(null);
  const { lastSync } = useSync();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-blue-950 text-gray-900 dark:text-blue-100 font-sans overflow-hidden transition-colors">
      <Sidebar currentPage={currentPage} onNavigate={(p) => {
        setCurrentPage(p);
        if (p !== 'customerDashboard') {
          setSelectedCustomerId(null);
        }
        if (p !== 'truckDashboard') {
            setSelectedTruckReg(null);
        }
      }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center px-8 py-6 bg-white dark:bg-blue-950 border-b border-gray-200 dark:border-blue-900 transition-colors">
          <div>
            <h1 className="text-3xl font-bold capitalize dark:text-blue-100 tracking-tight">
              {currentPage === 'customerDashboard' ? 'Customer Profile' : currentPage === 'truckDashboard' && selectedTruckReg ? `Dashboard: ${selectedTruckReg}` : currentPage.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
          </div>
          {lastSync && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-900 px-3 py-1 rounded-full">
              <RefreshCcw className="w-3 h-3" />
              Last Sync: {format(lastSync, 'HH:mm:ss')}
            </div>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {currentPage === 'dashboard' && (
            <Dashboard 
              onNavigateToCustomer={(id) => {
                setSelectedCustomerId(id);
                setCurrentPage('customerDashboard');
              }}
              onNavigateToTruck={(reg) => {
                setSelectedTruckReg(reg);
                setCurrentPage('truckDashboard');
              }}
            />
          )}
          {currentPage === 'ledger' && (
            <Ledger 
              onViewCustomer={(id) => {
                setSelectedCustomerId(id);
                setCurrentPage('customerDashboard');
              }}
            />
          )}
          {currentPage === 'fleet' && <Fleet onNavigateToTruck={(reg) => { setSelectedTruckReg(reg); setCurrentPage('truckDashboard'); }} />}
          {currentPage === 'truckDashboard' && <TruckDashboard truckReg={selectedTruckReg} onNavigateToTruck={(reg) => { setSelectedTruckReg(reg); }}/>}
          {currentPage === 'stationReports' && <StationReports />}
          {currentPage === 'customers' && (
            <Customers 
              onViewCustomer={(id) => {
                setSelectedCustomerId(id);
                setCurrentPage('customerDashboard');
              }}
              onNavigate={(p) => setCurrentPage(p as Page)}
            />
          )}
          {currentPage === 'customerDashboard' && (
            <CustomerDashboard 
              customerId={selectedCustomerId || ''} 
              onBack={() => {
                setCurrentPage('customers');
                setSelectedCustomerId(null);
              }} 
            />
          )}
          {currentPage === 'deliveries' && (
            <Deliveries 
              onViewCustomer={(id) => {
                setSelectedCustomerId(id);
                setCurrentPage('customerDashboard');
              }}
            />
          )}
          {currentPage === 'payments' && (
            <Payments 
              onViewCustomer={(id) => {
                setSelectedCustomerId(id);
                setCurrentPage('customerDashboard');
              }}
            />
          )}
          {currentPage === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  );
}

function DefaultExport() {
  return (
    <SyncProvider>
      <ThemeProvider>
        <AuthProvider>
          <Main />
        </AuthProvider>
      </ThemeProvider>
    </SyncProvider>
  );
}

function Main() {
  const { user, login } = useAuth();
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-blue-950 text-gray-900 dark:text-blue-100 font-sans font-medium transition-colors">
        <div className="w-full max-w-sm p-8 bg-white dark:bg-blue-950 rounded-xl border border-gray-200 dark:border-blue-900 flex flex-col items-center transition-colors">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 text-center text-gray-900 dark:text-blue-100">FuelFlow Pro</h2>
          <p className="text-gray-400 text-center mb-8 text-lg">Sign in to manage fuel distribution</p>
          <button
            onClick={login}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center justify-center gap-2 font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }
  return <AuthenticatedApp />;
}

export default DefaultExport;
