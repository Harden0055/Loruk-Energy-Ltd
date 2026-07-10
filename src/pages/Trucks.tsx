import React, { useState, useEffect } from 'react';
import { useTrucks, createTruck, updateTruck, deleteTruck } from '../lib/db';
import { Truck as TruckIcon, Search, Plus, Trash2, Pencil, AlertTriangle, X, CheckCircle2, ShieldAlert, LineChart } from 'lucide-react';
import { Truck as TruckType } from '../types';

interface TrucksProps {
  onNavigateToTruck: (reg: string) => void;
}

export default function Trucks({ onNavigateToTruck }: TrucksProps) {
  const { trucks, loading } = useTrucks();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Seed default trucks if database is empty on load
  useEffect(() => {
    if (loading) return;
    if (trucks.length === 0) {
      const defaultTrucks = [
        { registration: 'KDE 179Y', status: 'active' },
        { registration: 'KDL 019S', status: 'active' },
        { registration: 'KCY 842Y', status: 'active' },
        { registration: 'KCF 119R', status: 'active' },
        { registration: 'KDW 028Y', status: 'active' },
      ];

      defaultTrucks.forEach((t) => {
        createTruck(t as any).catch(console.error);
      });
    }
  }, [trucks.length, loading]);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<TruckType | null>(null);

  // Form fields
  const [registration, setRegistration] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Opens form for adding
  const handleAddClick = () => {
    setEditingTruck(null);
    setRegistration('');
    setStatus('active');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Opens form for editing
  const handleEditClick = (truck: TruckType) => {
    setEditingTruck(truck);
    setRegistration(truck.registration || '');
    setStatus(truck.status || 'active');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handles submitting add/edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.trim()) {
      setFormError('Truck Registration Number is required.');
      return;
    }

    // Clean registration format to uppercase
    const cleanReg = registration.trim().toUpperCase();

    // Prevent duplicate registrations
    const isDuplicate = trucks.some(t => 
      t.registration.toUpperCase().replace(/\s+/g, '') === cleanReg.replace(/\s+/g, '') &&
      (!editingTruck || t.id !== editingTruck.id)
    );

    if (isDuplicate) {
      setFormError(`Truck with registration "${cleanReg}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Partial<TruckType> = {
        registration: cleanReg,
        status,
      };

      if (editingTruck) {
        await updateTruck(editingTruck.id!, payload);
      } else {
        await createTruck(payload as Omit<TruckType, 'id' | 'createdAt'>);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'An error occurred while saving the truck.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles delete
  const handleDeleteConfirm = async () => {
    if (!deletingTruck) return;
    setIsDeleting(true);
    try {
      await deleteTruck(deletingTruck.id!);
      setDeletingTruck(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete truck.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter trucks list
  const filteredTrucks = trucks.filter(t => {
    const term = search.toLowerCase();
    const regMatch = (t.registration || '').toLowerCase().includes(term);
    const statusMatch = statusFilter === 'all' || t.status === statusFilter;
    return regMatch && statusMatch;
  });

  const totalTrucks = trucks.length;
  const activeTrucks = trucks.filter(t => t.status === 'active').length;
  const inactiveTrucks = trucks.filter(t => t.status === 'inactive').length;

  return (
    <div className="space-y-6" id="trucks-page-container">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="trucks-overview-cards">
        <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-white/5 rounded-lg flex items-center justify-center text-cyan-400">
            <TruckIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Total Trucks</span>
            <span className="text-2xl font-bold dark:text-white">{loading ? '...' : totalTrucks}</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Active Fleet</span>
            <span className="text-2xl font-bold text-emerald-500">{loading ? '...' : activeTrucks}</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-theme-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-center justify-center text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Inactive Fleet</span>
            <span className="text-2xl font-bold text-amber-500">{loading ? '...' : inactiveTrucks}</span>
          </div>
        </div>
      </div>

      {/* Control Tools */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center glass-panel p-4 rounded-xl border border-theme-border" id="trucks-controls">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 glass-panel border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 glass-panel border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px] text-white"
          >
            <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="all">All Statuses</option>
            <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="active">Active Only</option>
            <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Truck
        </button>
      </div>

      {/* Trucks Table */}
      <div className="glass-panel border border-theme-border rounded-xl overflow-hidden shadow-xs" id="trucks-table-container">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-border"></div>
            <p className="text-sm font-medium">Loading trucks fleet...</p>
          </div>
        ) : filteredTrucks.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-3 dark:text-gray-400">
            <TruckIcon className="w-12 h-12 text-gray-300 dark:text-blue-900/40 mx-auto" />
            <h3 className="text-lg font-bold">No Trucks Registered</h3>
            <p className="text-xs max-w-md mx-auto text-gray-400">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filter options.'
                : 'Get started by clicking "Add Truck" to add a new truck to the fleet list.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr className="modern-tr">
                  <th className="modern-th text-left">Registration Plate</th>
                  <th className="modern-th text-left">Status</th>
                  <th className="modern-th text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-blue-900/30 text-sm font-medium">
                {filteredTrucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-white/5 transition-colors">
                    <td className="modern-td">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-yellow-400/90 text-slate-900 rounded-md font-mono text-base font-extrabold border-2 border-slate-900 shadow-sm inline-block select-all">
                          {truck.registration}
                        </div>
                      </div>
                    </td>
                    <td className="modern-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        truck.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-500/20'
                          : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border border-theme-border/55'
                      }`}>
                        {truck.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="modern-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigateToTruck(truck.registration)}
                          className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          title="View Dashboard"
                        >
                          <LineChart className="w-4 h-4" />
                          <span className="text-xs font-semibold hidden md:inline">Dashboard</span>
                        </button>
                        <button
                          onClick={() => handleEditClick(truck)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Truck"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTruck(truck)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Truck"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="truck-form-modal">
          <div className="glass-panel rounded-xl overflow-hidden border border-theme-border shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-theme-border bg-white/5">
              <h3 className="font-bold text-lg text-white">
                {editingTruck ? 'Edit Truck Details' : 'Register New Truck'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/20 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-900/30">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KDE 179Y"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="w-full px-3 py-2 glass-panel border border-theme-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Fleet Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 glass-panel border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="active">Active</option>
                  <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-theme-border text-gray-300 text-sm font-semibold rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center min-w-[80px] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="delete-truck-confirm">
          <div className="glass-panel rounded-xl overflow-hidden border border-theme-border shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-950/50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-white">Delete Truck?</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Are you absolutely sure you want to delete <strong className="text-yellow-400">{deletingTruck.registration}</strong>? This will remove it from the fleet list.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeletingTruck(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2 border border-theme-border text-gray-300 text-sm font-semibold rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
