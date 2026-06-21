import React, { useState } from 'react';
import { useStations, addStation, updateStation, deleteStation } from '../lib/operationsDb';
import { Search, Plus, Trash2, Pencil, MapPin, AlertTriangle, X, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { StationInfo } from '../types';

export default function Stations() {
  const { stations, loading } = useStations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationInfo | null>(null);
  const [deletingStation, setDeletingStation] = useState<StationInfo | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [tradingAs, setTradingAs] = useState('');
  const [poBox, setPoBox] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Opens form for adding
  const handleAddClick = () => {
    setEditingStation(null);
    setName('');
    setCode('');
    setLocation('');
    setStatus('active');
    setTradingAs('T/A ');
    setPoBox('P.O BOX 342');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Opens form for editing
  const handleEditClick = (station: StationInfo) => {
    setEditingStation(station);
    setName(station.name || '');
    setCode(station.code || '');
    setLocation(station.location || '');
    setStatus(station.status || 'active');
    setTradingAs(station.tradingAs || '');
    setPoBox(station.poBox || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handles submitting add/edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Station Name is required.');
      return;
    }
    if (!code.trim()) {
      setFormError('Station Code is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Omit<StationInfo, 'id'> = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        location: location.trim(),
        status,
        tradingAs: tradingAs.trim(),
        poBox: poBox.trim(),
        createdAt: editingStation ? (editingStation.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      if (editingStation) {
        await updateStation(editingStation.id!, payload);
      } else {
        await addStation(payload);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'An error occurred while saving the station.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles delete
  const handleDeleteConfirm = async () => {
    if (!deletingStation) return;
    setIsDeleting(true);
    try {
      await deleteStation(deletingStation.id!);
      setDeletingStation(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete station.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter stations list
  const filteredStations = stations.filter(s => {
    const term = search.toLowerCase();
    const nameMatch = (s.name || '').toLowerCase().includes(term);
    const codeMatch = (s.code || '').toLowerCase().includes(term);
    const locationMatch = (s.location || '').toLowerCase().includes(term);
    const statusMatch = statusFilter === 'all' || s.status === statusFilter;
    return (nameMatch || codeMatch || locationMatch) && statusMatch;
  });

  const totalStations = stations.length;
  const activeStations = stations.filter(s => s.status === 'active').length;
  const inactiveStations = stations.filter(s => s.status === 'inactive').length;

  return (
    <div className="space-y-6" id="stations-page-container">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stations-overview-cards">
        <div className="bg-white dark:bg-blue-900/10 p-5 rounded-xl border border-gray-150 dark:border-blue-900/30 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Total Stations</span>
            <span className="text-2xl font-bold dark:text-white">{loading ? '...' : totalStations}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-blue-900/10 p-5 rounded-xl border border-gray-150 dark:border-blue-900/30 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Active</span>
            <span className="text-2xl font-bold text-emerald-600">{loading ? '...' : activeStations}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-blue-900/10 p-5 rounded-xl border border-gray-150 dark:border-blue-900/30 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Inactive</span>
            <span className="text-2xl font-bold text-amber-500">{loading ? '...' : inactiveStations}</span>
          </div>
        </div>
      </div>

      {/* Control Tools */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white dark:bg-blue-950 p-4 rounded-xl border border-gray-150 dark:border-blue-900" id="stations-controls">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search station name, code, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-blue-900/50 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 dark:bg-blue-900/50 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Station
        </button>
      </div>

      {/* Stations Table */}
      <div className="bg-white dark:bg-blue-950 border border-gray-150 dark:border-blue-900 rounded-xl overflow-hidden shadow-xs" id="stations-table-container">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm font-medium">Loading stations...</p>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-3 dark:text-gray-400">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-blue-900/40 mx-auto" />
            <h3 className="text-lg font-bold">No Stations Found</h3>
            <p className="text-xs max-w-md mx-auto text-gray-400">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria or status filter.' 
                : 'Get started by clicking "Add Station" to create a new station and assign its labels.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-blue-900/10 border-b border-gray-150 dark:border-blue-900 text-gray-500 dark:text-gray-400 text-2xs font-extrabold uppercase tracking-wider">
                  <th className="px-6 py-4">Station Name & Code</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Trading As (T/A)</th>
                  <th className="px-6 py-4">P.O. Box Address</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-blue-900/30 text-sm font-medium">
                {filteredStations.map((station) => (
                  <tr key={station.id} className="hover:bg-gray-50/50 dark:hover:bg-blue-900/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-blue-100 text-base">{station.name}</div>
                      <div className="font-mono text-2xs text-gray-400 mt-0.5 uppercase tracking-wider">{station.code}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-blue-200">
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-blue-900/30 px-2 py-1 rounded-md text-xs text-gray-700 dark:text-blue-300">
                        <MapPin className="w-3.5 h-3.5" />
                        {station.location || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-blue-100 font-semibold italic">
                      {station.tradingAs || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-blue-200 font-mono text-xs">
                      {station.poBox || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        station.status === 'active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/55' 
                          : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border border-gray-200/55'
                      }`}>
                        {station.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(station)}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Station"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingStation(station)}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Station"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="station-form-modal">
          <div className="bg-white dark:bg-blue-950 rounded-xl overflow-hidden border border-gray-200 dark:border-blue-900 shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 dark:border-blue-950 bg-gray-50/50 dark:bg-blue-900/10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingStation ? 'Edit Station Details' : 'Add New Station'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-200/50">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Station Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gel - Bungoma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Station Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ST-003"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bungoma"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Trading As (T/A) Labels</label>
                <input
                  type="text"
                  placeholder="e.g. T/A Fleet Operations"
                  value={tradingAs}
                  onChange={(e) => setTradingAs(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-4xs text-gray-400 dark:text-gray-500 mt-1">This label will dynamically print as the T/A section of PDF reports.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">P.O. Box Address</label>
                <input
                  type="text"
                  placeholder="e.g. P.O BOX 342"
                  value={poBox}
                  onChange={(e) => setPoBox(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Operational Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-blue-900 border border-gray-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-blue-900/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center min-w-[80px] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="delete-station-confirm">
          <div className="bg-white dark:bg-blue-950 rounded-xl overflow-hidden border border-gray-200 dark:border-blue-900 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Delete Station?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  Are you absolutely sure you want to delete <strong className="text-gray-800 dark:text-gray-200">{deletingStation.name}</strong> ({deletingStation.code})? This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeletingStation(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2 border border-gray-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
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
