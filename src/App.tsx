import React, { useState } from 'react';
import { useAuth, AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { SyncProvider, useSync } from './lib/sync';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Fleet from './pages/Fleet';
import TruckDashboard from './pages/TruckDashboard';
import Customers from './pages/Customers';
import Deliveries from './pages/Deliveries';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import CustomerDashboard from './pages/CustomerDashboard';
import { Fuel, LogIn, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

type Page = 'dashboard' | 'ledger' | 'fleet' | 'customers' | 'deliveries' | 'payments' | 'reports' | 'customerDashboard' | 'truckDashboard';

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
          {currentPage === 'fleet' && <Fleet onNavigate={(p) => setCurrentPage(p as Page)} onNavigateToTruck={(reg) => { setSelectedTruckReg(reg); setCurrentPage('truckDashboard'); }} />}
          {currentPage === 'truckDashboard' && <TruckDashboard truckReg={selectedTruckReg} onNavigateToTruck={(reg) => { setSelectedTruckReg(reg); }}/>}
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
        setError(err.message || 'An error occurred during authentication.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-blue-950 text-gray-900 dark:text-blue-100 font-sans font-medium transition-colors">
        <div className="w-full max-w-sm p-8 bg-white dark:bg-blue-950 rounded-xl border border-gray-200 dark:border-blue-900 flex flex-col items-center transition-colors">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-2 text-center text-gray-900 dark:text-blue-100">Loruk Energy Ltd Pro</h2>
          <p className="text-gray-400 text-center mb-6 text-lg">
            {isForgotPassword ? 'Reset your password' : 'Sign in to manage fuel distribution'}
          </p>
          
          {error && <div className="w-full p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}
          {message && <div className="w-full p-3 mb-4 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800">{message}</div>}
          
          <form onSubmit={handleEmailAuth} className="w-full mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-blue-900/40 border border-gray-300 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all dark:text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              {!isForgotPassword && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300">Password</label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }} 
                        className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-blue-900/40 border border-gray-300 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all dark:text-white"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-blue-900/40 border border-gray-300 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all dark:text-white"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-md shadow-blue-900/20"
              >
                {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
              </button>
            </div>
          </form>
          
          <div className="w-full flex items-center justify-between mb-6">
            <hr className="w-full border-gray-200 dark:border-blue-800" />
            <span className="p-2 text-sm text-gray-400">OR</span>
            <hr className="w-full border-gray-200 dark:border-blue-800" />
          </div>

          <button
            onClick={async () => {
              setError('');
              setMessage('');
              try {
                await login();
              } catch (err: any) {
                setError(err.message || 'Error signing in with Google');
              }
            }}
            className="w-full py-2.5 px-4 bg-white dark:bg-blue-900 border border-gray-300 dark:border-blue-700 hover:bg-gray-50 dark:hover:bg-blue-800 text-gray-700 dark:text-blue-50 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all shadow-sm"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
          
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            {isForgotPassword ? (
              <button 
                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }} 
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
