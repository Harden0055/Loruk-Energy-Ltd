import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { SyncProvider, useSync } from './lib/sync';
import Sidebar from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Payments from './pages/Payments';
import Ledger from './pages/Ledger';
import Fleet from './pages/Fleet';
import TruckDashboard from './pages/TruckDashboard';
import Trucks from './pages/Trucks';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import CustomerDashboard from './pages/CustomerDashboard';
import Settings from './pages/Settings';
import Stations from './pages/Stations';
import Products from './pages/Products';
import AIAssistant from './pages/AIAssistant';
import FuelSuiteApp from './pages/fuelsuite/FuelSuiteApp';
import { FuelProvider } from './pages/fuelsuite/context';
import MiniDashboardProfile from './pages/fuelsuite/views/MiniDashboardProfile';
import FireLEIcon from './components/FireLEIcon';
import { Fuel, LogIn, RefreshCcw, Printer, Menu, AlertTriangle, User } from 'lucide-react';
import { format } from 'date-fns';
import { useProducts, addProduct } from './lib/operationsDb';

type Page = 'dashboard' | 'operations' | 'deliveries' | 'payments' | 'ledger' | 'fleet' | 'trucks' | 'customers' | 'reports' | 'customerDashboard' | 'truckDashboard' | 'settings' | 'stations' | 'products' | 'assistant' | 'fuelsuite';

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTruckReg, setSelectedTruckReg] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<'Ndalu' | 'Junction' | 'Combined'>('Combined');
  const { lastSync } = useSync();
  const [quotaExceeded, setQuotaExceeded] = useState(false); // Changed to avoid quota issues for now

  // Add state for print warning
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: products, loading: productsLoading } = useProducts();

  useEffect(() => {
    if (!productsLoading && products && products.length === 0) {
      const seed = async () => {
        try {
          await addProduct({ name: 'Diesel' });
          await addProduct({ name: 'Super (Premium)' });
        } catch (e) {
          console.error('Seed error:', e);
        }
      };
      seed();
    }
  }, [products?.length, productsLoading]);

  const navigateTo = (page: Page, params?: { customerId?: string | null, truckReg?: string | null }) => {
    const customerId = params?.customerId !== undefined ? params.customerId : (page === 'customerDashboard' ? selectedCustomerId : null);
    const truckReg = params?.truckReg !== undefined ? params.truckReg : (page === 'truckDashboard' ? selectedTruckReg : null);
    
    setCurrentPage(page);
    setSelectedCustomerId(customerId);
    setSelectedTruckReg(truckReg);
    
    window.history.pushState({ page, customerId, truckReg }, '');
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    window.history.replaceState({ page: 'dashboard', customerId: null, truckReg: null }, '');

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.page) {
        setCurrentPage(state.page);
        setSelectedCustomerId(state.customerId || null);
        setSelectedTruckReg(state.truckReg || null);
      } else {
        setCurrentPage('dashboard');
        setSelectedCustomerId(null);
        setSelectedTruckReg(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPage === 'fuelsuite') {
    return <FuelSuiteApp onBackToMain={() => navigateTo('dashboard')} />;
  }

  return (
    <div className="flex h-screen theme-bg-gradient text-theme-text font-sans overflow-hidden transition-colors relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 glass-panel backdrop-blur-sm z-40 lg:hidden print-hide"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Print Warning Modal */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print-hide">
          <div className="glass-panel p-6 rounded-xl shadow-2xl max-w-md w-full border border-theme-border">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-blue-900 dark:text-theme-text">
              <Printer className="w-5 h-5" />
              Printing Restricted
            </h3>
            <p className="text-theme-text-muted-muted mb-6">
              Printing is restricted in this preview environment. To print or save as PDF, please open the application in a <strong>new tab</strong> using the arrow icon at the top right of your preview window.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-blue-800 text-theme-text font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowPrintWarning(false);
                }}
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg transition-colors"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar currentPage={currentPage} onNavigate={(p) => {
          navigateTo(p as Page);
        }} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 md:px-8 py-4 md:py-6 bg-transparent border-b border-theme-border/30 transition-all gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className={`text-2xl md:text-3xl font-bold capitalize tracking-tight ${
                currentPage === 'payments'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-extrabold'
                  : currentPage === 'customers' || currentPage === 'customerDashboard'
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent font-extrabold'
                    : 'text-white text-gradient'
              }`}>
                {currentPage === 'customerDashboard' ? 'Customer Profile' : currentPage === 'truckDashboard' && selectedTruckReg ? `Dashboard: ${selectedTruckReg}` : currentPage.replace(/([A-Z])/g, ' $1').trim()}
              </h1>
            </div>
          </div>
          
          {/* Station Selection Filter */}
          {currentPage === 'operations' && (
            <div className="flex items-center gap-1.5 bg-[#121216]/80 p-1 rounded-xl border border-theme-border/50">
              <button 
                onClick={() => setSelectedStation('Combined')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${selectedStation === 'Combined' ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}
              >
                Combined Total
              </button>
              <button 
                onClick={() => setSelectedStation('Ndalu')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${selectedStation === 'Ndalu' ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}
              >
                Ndalu Station
              </button>
              <button 
                onClick={() => setSelectedStation('Junction')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${selectedStation === 'Junction' ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}
              >
                Junction Station
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0 print-hide">
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-[#8B3DFF]/10 text-[#B15DFF] hover:bg-[#8B3DFF]/20 transition-all duration-300 border border-[#8B3DFF]/30 shadow-[0_0_15px_rgba(139,61,255,0.15)] cursor-pointer"
              title="Profile & Summary Dashboard"
            >
              <User className="w-4 h-4 text-[#B15DFF]" />
            </button>
            {lastSync && (
              <div className="flex items-center gap-2 text-xs text-[#A1A1AA] bg-[#121216]/80 border border-theme-border/50 px-3 py-1.5 rounded-full shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#22C55E]" />
                Last Sync: {format(lastSync, 'HH:mm:ss')}
              </div>
            )}
            <button
              onClick={() => {
                if (window.self !== window.top) {
                  setShowPrintWarning(true);
                } else {
                  window.print();
                }
              }}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-theme-border transition-all duration-300 cursor-pointer shadow-md hover:scale-102"
              title="Print Page"
            >
              <Printer className="w-4 h-4 text-[#A1A1AA]" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8">
          <ErrorBoundary>
            {currentPage === 'dashboard' && (
              <Dashboard 
                selectedStation={selectedStation}
                onNavigateToCustomer={(id) => {
                  navigateTo('customerDashboard', { customerId: id });
                }}
                onNavigateToTruck={(reg) => {
                  navigateTo('truckDashboard', { truckReg: reg });
                }}
              />
            )}
            {currentPage === 'deliveries' && (
              <Deliveries 
                onViewCustomer={(id) => {
                  navigateTo('customerDashboard', { customerId: id });
                }}
              />
            )}
            {currentPage === 'payments' && (
              <Payments 
                onViewCustomer={(id) => {
                  navigateTo('customerDashboard', { customerId: id });
                }}
              />
            )}
            {currentPage === 'ledger' && (
              <Ledger 
                onViewCustomer={(id) => {
                  navigateTo('customerDashboard', { customerId: id });
                }}
              />
            )}
            {currentPage === 'fleet' && <Fleet onNavigate={(p) => navigateTo(p as Page)} onNavigateToTruck={(reg) => { navigateTo('truckDashboard', { truckReg: reg }); }} />}
            {currentPage === 'trucks' && <Trucks onNavigateToTruck={(reg) => { navigateTo('truckDashboard', { truckReg: reg }); }} />}
            {currentPage === 'truckDashboard' && <TruckDashboard truckReg={selectedTruckReg} onNavigateToTruck={(reg) => { navigateTo('truckDashboard', { truckReg: reg }); }} onBack={() => window.history.back()} />}
            {currentPage === 'customers' && (
              <Customers 
                onViewCustomer={(id) => {
                  navigateTo('customerDashboard', { customerId: id });
                }}
                onNavigate={(p) => navigateTo(p as Page)}
              />
            )}
            {currentPage === 'customerDashboard' && (
              <CustomerDashboard 
                customerId={selectedCustomerId || ''} 
                onBack={() => {
                  // Standard back behavior: if there's history, we go back, but we can just navigate to customers for explicit back button.
                  // For the browser back button, it's handled by popstate. For the UI back button, let's navigate to customers.
                  window.history.back();
                }} 
              />
            )}
            {currentPage === 'reports' && <Reports />}
            {currentPage === 'assistant' && <AIAssistant />}
            {currentPage === 'settings' && <Settings />}
            {currentPage === 'stations' && <Stations />}
            {currentPage === 'products' && <Products />}
          </ErrorBoundary>
        </main>
      </div>
      {isProfileOpen && <MiniDashboardProfile onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
}


function DefaultExport() {
  return (
    <SyncProvider>
      <ThemeProvider>
        <AuthProvider>
          <FuelProvider>
            <Main />
          </FuelProvider>
        </AuthProvider>
      </ThemeProvider>
    </SyncProvider>
  );
}

function Main() {
  const { user, login, loginWithEmail, signupWithEmail, resetPasswordWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setMessage('');
      setLoading(true);

      try {
        if (isForgotPassword) {
          await resetPasswordWithEmail(email);
          setMessage('Password reset link sent to your email.');
          setIsForgotPassword(false);
        } else if (isLogin) {
          await loginWithEmail(email, password);
        } else {
          if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
          }
          await signupWithEmail(email, password);
        }
      } catch (err: any) {
        let msg = err.message || 'An error occurred during authentication.';
        if (err.code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential')) {
          msg = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
          msg = 'This email is already registered. Please sign in instead.';
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="h-screen flex flex-col items-center justify-center theme-bg-gradient text-theme-text font-sans font-medium transition-colors">
        <div className="w-full max-w-sm p-8 glass-panel rounded-xl border border-theme-border flex flex-col items-center transition-colors">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 border border-theme-border rounded-xl flex items-center justify-center mb-6 shadow-sm">
            <FireLEIcon className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 text-center text-theme-text">Loruk Energy Ltd Pro</h2>
          <p className="text-gray-400 text-center mb-6 text-lg">
            {isForgotPassword ? 'Reset your password' : 'Sign in to manage fuel distribution'}
          </p>

          {isLogin && !isForgotPassword && (
            <div className="text-xs text-cyan-500 dark:text-blue-400 text-center mb-6 bg-blue-500/5 p-3 rounded-lg border border-theme-border leading-relaxed">
              💡 <strong>First Time?</strong> If you have not created an email/password account yet, click <strong>Sign up</strong> at the bottom to register your email <strong>enockloriso@gmail.com</strong>.
            </div>
          )}
          
          {error && (
            <div className="w-full p-4 mb-4 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50">
              {error.includes('unauthorized-domain') || error.includes('Authorized domains') ? (
                <div className="space-y-3 text-left">
                  <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    Google Domain Unauthorized
                  </p>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-red-300">
                    This preview is running on a secure domain which is not yet authorized in your Firebase Settings under Authentication.
                  </p>
                  <div className="space-y-1.5 bg-red-100/50 dark:bg-red-950/40 p-2.5 rounded border border-red-200/50 dark:border-red-900/30">
                    <p className="font-semibold text-xs text-gray-700 dark:text-red-300">Authorized Domain to add:</p>
                    <code className="block text-[10px] bg-white dark:theme-bg-gradient p-1.5 rounded border border-red-200/50 dark:border-red-900/40 font-mono select-all text-theme-text break-all font-semibold">
                      {window.location.hostname}
                    </code>
                  </div>
                  <ol className="list-decimal pl-4 text-[11px] space-y-1 text-gray-600 dark:text-red-350">
                    <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-blue-650 dark:text-blue-400 font-bold">Firebase Console</a></li>
                    <li>Click on <b>Authentication &gt; Settings &gt; Authorized domains</b></li>
                    <li>Add the domains listed above!</li>
                  </ol>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-2 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 leading-snug">
                    💡 <strong>Quick Fallback:</strong> Register with Email &amp; Password (click <strong>Sign up</strong> below), which works instantly and has no domain requirements!
                  </div>
                </div>
              ) : error.includes('Invalid email or password') || error.includes('invalid-credential') ? (
                <div className="space-y-2 text-left">
                  <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600 dark:text-red-400 shrink-0" />
                    Authentication Failed
                  </p>
                  <p className="text-xs leading-relaxed text-gray-700 dark:text-red-300">
                    Invalid email or password credentials.
                  </p>
                  <div className="bg-blue-50 dark:bg-white/5 border border-theme-border p-2.5 rounded-md mt-2 text-[11px] text-blue-800 dark:text-theme-text-muted leading-normal">
                    💡 <strong>Don't have an email login yet?</strong> If this is your first time using email sign-in, you must register your email address first. 
                    <button 
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError('');
                        setMessage('');
                      }}
                      className="block mt-1.5 font-bold underline hover:text-blue-900 dark:hover:text-white"
                    >
                      Click here to switch to Sign Up Form &rarr;
                    </button>
                  </div>
                </div>
              ) : error.includes('operation-not-allowed') ? (
                <div className="space-y-2 text-left">
                  <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-600 dark:text-red-400 shrink-0" />
                    Sign-in Method Disabled
                  </p>
                  <p className="text-xs leading-relaxed text-gray-700 dark:text-red-300">
                    This authentication method is not allowed by your Firebase project's configuration.
                  </p>
                  <div className="bg-blue-50 dark:bg-white/5 border border-theme-border p-2.5 rounded-md mt-2 text-[11px] text-blue-800 dark:text-theme-text-muted leading-normal">
                    💡 <strong>Did you just enable it?</strong> If you are testing this on Netlify, make sure you have deployed the latest version of the app so Netlify uses the correct Firebase Configuration. Currently, Netlify might be using an older configuration where these sign-in methods were not enabled.
                  </div>
                </div>
              ) : (
                error
              )}
            </div>
          )}
          {message && <div className="w-full p-3 mb-4 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800">{message}</div>}
          
          <form onSubmit={handleEmailAuth} className="w-full mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-theme-text-muted mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 glass-input rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all dark:text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              {!isForgotPassword && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-theme-text-muted">Password</label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }} 
                        className="text-sm text-cyan-500 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 glass-input rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all dark:text-white"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm font-semibold text-theme-text-muted mb-1">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 glass-input rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all dark:text-white"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg font-semibold transition-all shadow-md shadow-blue-900/20"
              >
                {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
              </button>
            </div>
          </form>
          
          <div className="w-full flex items-center justify-between mb-6">
            <hr className="w-full border-theme-border" />
            <span className="p-2 text-sm text-gray-400">OR</span>
            <hr className="w-full border-theme-border" />
          </div>

          <button
            onClick={async () => {
              setError('');
              setMessage('');
              try {
                await login();
              } catch (err: any) {
                let msg = err.message || 'Error signing in with Google';
                if (err.code === 'auth/popup-closed-by-user' || msg.includes('auth/popup-closed-by-user')) {
                  msg = 'Sign in was cancelled.';
                } else if (err.code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
                  msg = 'This domain is not authorized for Google Sign-In. Please add it to your Firebase Console under Authentication > Settings > Authorized domains.';
                }
                setError(msg);
              }
            }}
            className="w-full py-2.5 px-4 glass-input hover:bg-white/5 dark:hover:bg-cyan-900/30 text-gray-700 dark:text-cyan-400 glow-cyan-text rounded-lg flex items-center justify-center gap-2 font-semibold transition-all shadow-sm"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
          
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            {isForgotPassword ? (
              <button 
                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }} 
                className="text-cyan-500 dark:text-blue-400 font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setMessage('');
                  }} 
                  className="text-cyan-500 dark:text-blue-400 font-semibold hover:underline"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }
  return <AuthenticatedApp />;
}

export default DefaultExport;
