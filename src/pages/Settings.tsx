import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { exportDataToJson } from '../lib/export';
import { Lock, Shield, Eye, EyeOff, Save, Key, AlertTriangle, CheckCircle, Moon, Sun, UserCheck, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { useCustomers, deleteSeedData, restoreLostCustomers, clearDeliveriesAndPayments } from '../lib/db';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { customers } = useCustomers();
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isClearingLedger, setIsClearingLedger] = useState(false);
  const [showClearLedgerConfirm, setShowClearLedgerConfirm] = useState(false);
  const [ledgerClearMessage, setLedgerClearMessage] = useState('');

  const hasDemoData = React.useMemo(() => {
    return customers.some(c => c.customerId === 'CUST-001' || c.customerId === 'CUST-002');
  }, [customers]);

  const handleClearDemoData = async () => {
    setIsWiping(true);
    try {
      await deleteSeedData();
      localStorage.setItem('loruk_demo_data_purged', 'true');
    } catch (err: any) {
      console.error('Failed to clear seed data: ', err);
    } finally {
      setIsWiping(false);
      setShowClearConfirm(false);
    }
  };

  const handleRestoreLostData = async () => {
    setIsRestoring(true);
    try {
      localStorage.removeItem('loruk_demo_data_purged');
      await restoreLostCustomers();
    } catch (err: any) {
      console.error('Failed to restore lost data: ', err);
    } finally {
      setIsRestoring(false);
      setShowRestoreConfirm(false);
    }
  };

  const handleClearLedger = async () => {
    setIsClearingLedger(true);
    setLedgerClearMessage('');
    try {
      await clearDeliveriesAndPayments();
      setLedgerClearMessage('Successfully deleted all fuel deliveries & payments data, and reset customer balances!');
      setTimeout(() => setLedgerClearMessage(''), 6000);
    } catch (err: any) {
      console.error('Failed to clear ledger:', err);
    } finally {
      setIsClearingLedger(false);
      setShowClearLedgerConfirm(false);
    }
  };


  // Profile states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if provider is email/password
  const isEmailUser = user?.providerData.some(p => p.providerId === 'password');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileMessage('');
    setProfileError('');
    setProfileLoading(true);

    try {
      await updateProfile(user, {
        displayName: displayName,
      });
      setProfileMessage('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPasswordMessage('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);

    try {
      // Create credential to reauthenticate user securely
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      
      // Reauthenticate before sensitive password change
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);

      setPasswordMessage('Password updated securely and successfully!');
      
      // Reset inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update failure:', err);
      let errorFriendlyMsg = err.message || 'Failed to update password.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errorFriendlyMsg = 'Incorrect current password.';
      }
      setPasswordError(errorFriendlyMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
      id="settings-page-container"
    >
      {/* Intro Header */}
      <div className="bg-white dark:bg-blue-900/20 border border-gray-200 dark:border-blue-900 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Security & Account Preferences
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your credentials, update your secure credentials, and toggle system interfaces.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-blue-900/40">
          <span className="text-xs text-gray-400">Secure connection via Firestore & Firebase Auth</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Settings Navigation Details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-blue-900/10 border border-gray-100 dark:border-blue-900/30 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-blue-100 text-sm uppercase tracking-wider">Account Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">Registered Email</span>
                <span className="text-sm font-medium text-gray-800 dark:text-blue-200 break-all">{user?.email}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">Account UID</span>
                <span className="text-xs font-mono text-gray-600 dark:text-blue-300 select-all">{user?.uid}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">Authentication Method</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {isEmailUser ? 'Email & Password' : 'Google Auth Account'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-blue-900/10 border border-gray-100 dark:border-blue-900/30 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-blue-100 text-sm uppercase tracking-wider">Interface Preferences</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-blue-200 block">Theme mode</span>
                <span className="text-xs text-gray-400">Switch current visual appearance</span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg border border-gray-200 dark:border-blue-800 bg-gray-50 dark:bg-blue-950 hover:bg-gray-100 dark:hover:bg-blue-900/40 text-gray-700 dark:text-blue-100 transition-colors flex items-center justify-center"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-700" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Profile & Secure Password Forms */}
        <div className="col-span-1 md:col-span-2 space-y-8">
          {/* Section 1: Name Profile Update */}
          <section className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6" id="profile-settings-section">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2 border-b border-gray-100 dark:border-blue-900/40 pb-3 mb-4">
              <UserCheck className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              General Profile Settings
            </h3>

            {profileMessage && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start gap-2.5 text-sm text-red-800 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1.5" htmlFor="display-name-input">
                  Your Full Name / Alias
                </label>
                <input
                  id="display-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-blue-950/40 border border-gray-200 dark:border-blue-800/70 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="Enter full name"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          {/* Section 2: Secure Password Update (or Google notice) */}
          <section className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6" id="password-settings-section">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2 border-b border-gray-100 dark:border-blue-900/40 pb-3 mb-4">
              <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              Secure Password Update
            </h3>

            {isEmailUser ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  To securely update your account credential, please verify your current password then input your new complex password.
                </p>

                {passwordMessage && (
                  <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{passwordMessage}</span>
                  </div>
                )}
                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start gap-2.5 text-sm text-red-800 dark:text-red-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1.5" htmlFor="current-password-input">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="current-password-input"
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-gray-50 dark:bg-blue-950/40 border border-gray-200 dark:border-blue-800/70 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Enter current password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1.5" htmlFor="new-password-input">
                      New Password (Minimum 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="new-password-input"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-gray-50 dark:bg-blue-950/40 border border-gray-200 dark:border-blue-800/70 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Create strong password"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1.5" htmlFor="confirm-password-input">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password-input"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-gray-50 dark:bg-blue-950/40 border border-gray-200 dark:border-blue-800/70 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Re-enter new password"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      {passwordLoading ? 'Updating...' : 'Update Password securely'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="p-5 bg-gray-50 dark:bg-blue-900/10 border border-gray-200 dark:border-blue-900/40 rounded-xl space-y-3">
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-blue-100 text-sm">Managed by Third Party</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      You signed in through your Google Workspace account. Your credentials and security protocols are securely managed directly by Google.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium pl-10">
                  No static password reset/update is needed inside the Loruk Energy distribution platform.
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Demo/Seed Data Management */}
          <section className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6" id="demo-data-settings-section">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2 border-b border-gray-155 dark:border-blue-900/40 pb-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              Demo Data Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
               Loruk Energy ships with pre-populated dummy records (Acme Logistics, seed LPG counts, fuel sales, mock invoices) for features visualization. If you are ready to configure yours, you can drop default seed collections and leave your custom entries untouched.
            </p>
            
            {hasDemoData ? (
              <div className="flex justify-between items-center bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Seed Records Loaded</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">Ready to be removed safely.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isWiping}
                  className="px-4 py-2 font-semibold text-xs tracking-wide uppercase bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isWiping ? 'Purging...' : 'Purge Demo Data'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-lg h-fit">
                  <CheckCircle className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-901 dark:text-blue-100">Clean Database Workspace</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All pre-populated mock demonstration records have been purged. The database is live and holds only your custom inputs.</p>
                  
                  <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/30">
                    <button
                      type="button"
                      onClick={() => setShowRestoreConfirm(true)}
                      className="px-4 py-2 font-semibold text-xs tracking-wide uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Emergency Restore 
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section: Fuel Deliveries & Payments Ledger Reset */}
          <section className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6" id="ledger-reset-settings-section">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2 border-b border-gray-155 dark:border-blue-900/40 pb-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Wipe Deliveries & Payments Ledger
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This will permanently delete all records inside your Fuel Deliveries and Customer Payments registers. It also resets current Customer accounts back to their custom opening balance references so you can start entering your own transactions cleanly from scratch.
            </p>
            
            {ledgerClearMessage && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{ledgerClearMessage}</span>
              </div>
            )}

            <div className="flex gap-3 p-4 bg-red-500/5 border border-red-200 dark:border-red-900/40 rounded-xl justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-400">Clear All Transaction Registers</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deletes all deliveries and payments. Preserves your customers and stations.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearLedgerConfirm(true)}
                disabled={isClearingLedger}
                className="px-4 py-2 font-semibold text-xs tracking-wide uppercase bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isClearingLedger ? 'Processing...' : 'Wipe Data Logs'}
              </button>
            </div>
          </section>

          {/* Section 4: Data Management */}
          <section className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6" id="data-management-settings-section">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2 border-b border-gray-155 dark:border-blue-900/40 pb-3 mb-4">
              <Download className="w-5 h-5 text-blue-500" />
              Data Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Export your financial and customer data as a JSON backup file for manual record keeping.
            </p>
            <button
              onClick={async () => {
                await exportDataToJson();
              }}
              className="px-4 py-2 font-semibold text-xs tracking-wide uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Backup Data (JSON)
            </button>
          </section>
        </div>
      </div>


      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-amber-200 dark:border-amber-900/40">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to remove all seeded demonstration records? This will safely wipe the mock customers, deliveries, payments, and other mock data.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isWiping}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isWiping}
                onClick={handleClearDemoData}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer flex items-center gap-2"
              >
                {isWiping ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-blue-200 dark:border-blue-900/40">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Restore Custom Data</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              If your custom profile data specifically mapped under IDs CUST-001, CUST-002, or CUST-004 were inadvertently purged, this will add those custom profiles back so that you can repopulate your financial totals.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isRestoring}
                onClick={() => setShowRestoreConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isRestoring}
                onClick={handleRestoreLostData}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center gap-2"
              >
                {isRestoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearLedgerConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-blue-950 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-red-200 dark:border-red-900/45">
            <h3 className="text-lg font-bold text-gray-900 dark:text-blue-50 mb-2">Confirm Account Wipe</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you absolutely sure you want to delete all deliveries and customer payments? This action is irreversible and resets current outstanding balances.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={isClearingLedger}
                onClick={() => setShowClearLedgerConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isClearingLedger}
                onClick={handleClearLedger}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer flex items-center gap-2"
              >
                {isClearingLedger ? 'Clearing...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
