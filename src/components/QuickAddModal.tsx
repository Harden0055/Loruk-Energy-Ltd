import React, { useState } from 'react';
import { X, Truck, Building2, UserPlus, Check, Plus } from 'lucide-react';
import { createTruck, createCustomer } from '../lib/db';
import { addStation } from '../lib/operationsDb';

interface QuickAddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (registration: string) => void;
}

export function QuickAddTruckModal({ isOpen, onClose, onSuccess }: QuickAddTruckModalProps) {
  const [registration, setRegistration] = useState('');
  const [driverName, setDriverName] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReg = registration.trim().toUpperCase();
    if (!cleanReg) {
      setError('Registration is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createTruck({
        registration: cleanReg,
        status: 'active'
      } as any);
      onSuccess(cleanReg);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create truck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#09090b] border border-purple-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Quick Add Truck</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Vehicle Registration <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. KDF 123Z"
              value={registration}
              onChange={e => setRegistration(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Driver Name (Optional)</label>
            <input
              type="text"
              placeholder="Driver's full name"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Model / Make</label>
              <input
                type="text"
                placeholder="e.g. Scania G460"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Capacity (L)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Adding...' : 'Save Truck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuickAddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stationName: string) => void;
}

export function QuickAddStationModal({ isOpen, onClose, onSuccess }: QuickAddStationModalProps) {
  const [stationName, setStationName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = stationName.trim();
    if (!cleanName) {
      setError('Station name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addStation({
        name: cleanName,
        code: code.trim() || `ST-${Date.now().toString().slice(-4)}`,
        location: location.trim() || cleanName,
        status: 'active',
        tradingAs: `T/A ${cleanName}`,
        createdAt: Date.now()
      });
      onSuccess(cleanName);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create station');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#09090b] border border-emerald-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-[#059669]">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Quick Add Station</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Station Name <span className="text-[#059669]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Loruk - Eldoret"
              value={stationName}
              onChange={e => setStationName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Code</label>
              <input
                type="text"
                placeholder="e.g. LRK-005"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Eldoret"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#059669] hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Adding...' : 'Save Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customerId: string, customerName: string) => void;
}

export function QuickAddCustomerModal({ isOpen, onClose, onSuccess }: QuickAddCustomerModalProps) {
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Customer name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const generatedCode = `CUST-${Date.now().toString().slice(-4)}`;
      const cLimit = creditLimit ? Number(creditLimit) : 0;
      const opBal = openingBalance ? Number(openingBalance) : 0;

      const newCust = await createCustomer({
        customerId: generatedCode,
        name: cleanName,
        creditLimit: cLimit,
        balance: opBal,
        totalPurchases: 0,
        status: 'active',
        openingBalance: opBal,
        updatedBy: 'system',
        actionType: 'create'
      } as any);

      const custId = (newCust as any)?.id || generatedCode;
      onSuccess(custId, cleanName);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#09090b] border border-purple-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Quick Add Customer</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Customer Name <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Al-Noor Logistics Ltd"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Credit Limit (KES)</label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Opening Balance (KES)</label>
              <input
                type="number"
                placeholder="0"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Adding...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
