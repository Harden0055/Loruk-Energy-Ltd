import React, { useState, useEffect, useMemo } from 'react';
import { useProducts, addProduct, updateProduct, deleteProduct } from '../lib/operationsDb';
import { ProductDef } from '../types';
import { Plus, Pencil, Trash2, X, Box, Copy } from 'lucide-react';
import { useConfirm } from '../components/useConfirm';
import { motion, AnimatePresence } from 'motion/react';

// Standard product categories the app recognises; custom ones can be added inline.
const STANDARD_CATEGORIES = ['White Oils', 'Lubricants', 'Services'];

export default function Products() {
  const { data: products, loading } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    if (!loading && products) {
      const standardList = [
        { name: 'Diesel', category: 'White Oils', sortOrder: 1, namespace: 'fleet' as const, system: 'main' as const },
        { name: 'Super (Premium)', category: 'White Oils', sortOrder: 2, namespace: 'fleet' as const, system: 'main' as const },
        { name: 'Engine Oil', category: 'Lubricants', sortOrder: 3, namespace: 'fleet' as const, system: 'main' as const },
        { name: 'Brake Fluid', category: 'Lubricants', sortOrder: 4, namespace: 'fleet' as const, system: 'main' as const },
        { name: 'Greasing', category: 'Services', sortOrder: 5, namespace: 'fleet' as const, system: 'main' as const }
      ];

      const existingLower = products.map(p => (p.name || '').toLowerCase().trim());
      standardList.forEach(async (sp) => {
        const found = existingLower.some(el => 
          el === sp.name.toLowerCase() || 
          (sp.name.includes('Premium') && (el.includes('premium') || el.includes('super')))
        );
        if (!found) {
          try {
            await addProduct({ 
              name: sp.name, 
              category: sp.category, 
              sortOrder: sp.sortOrder,
              namespace: sp.namespace,
              system: sp.system 
            } as any);
          } catch (e) {
            console.error('Seed error:', e);
          }
        }
      });
    }
  }, [products?.length, loading]);

  const [form, setForm] = useState<Partial<ProductDef>>({
    name: '',
    category: STANDARD_CATEGORIES[0],
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [cleaningUp, setCleaningUp] = useState(false);

  // One row per product name (case-insensitive) — duplicates are hidden from
  // the list and can be cleaned up with one click.
  const uniqueProducts = useMemo(() => {
    const acc: Record<string, ProductDef> = {};
    (products || []).forEach(p => {
      const key = (p.name || '').trim().toLowerCase();
      if (!acc[key]) acc[key] = p;
      else {
        // Keep the oldest record as the canonical product.
        const cur = acc[key];
        if ((p.createdAt || 0) < (cur.createdAt || 0)) acc[key] = p;
      }
    });
    return Object.values(acc).sort((a, b) =>
      (a.sortOrder || 999) - (b.sortOrder || 999) || a.name.localeCompare(b.name));
  }, [products]);

  // The extra copies behind each duplicated name — these are what the
  // "Remove duplicates" button deletes (the oldest copy of each is kept).
  const duplicateExtras = useMemo(() => {
    const groups = new Map<string, ProductDef[]>();
    (products || []).forEach(p => {
      const key = (p.name || '').trim().toLowerCase();
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);
    });
    const extras: ProductDef[] = [];
    groups.forEach(list => {
      if (list.length > 1) {
        const sorted = [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        extras.push(...sorted.slice(1));
      }
    });
    return extras;
  }, [products]);

  // Categories shown in the add-product dropdown: standard ones plus any
  // already in use.
  const categoryOptions = useMemo(() => {
    const used = new Set<string>(STANDARD_CATEGORIES);
    (products || []).forEach(p => { if (p.category) used.add(p.category); });
    return [...used];
  }, [products]);

  const resetForm = () => {
    setForm({
      name: '',
      category: STANDARD_CATEGORIES[0],
    });
    setAddingCategory(false);
    setNewCategory('');
    setEditingId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleEdit = (product: ProductDef) => {
    setError(null);
    // Destructure to omit id or other internal fields from the input form
    const { id, name, category } = product;
    setForm({ name, category: category || STANDARD_CATEGORIES[0] });
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    confirmDelete('Are you sure you want to delete this product?', async () => {
      try {
        setError(null);
        await deleteProduct(id);
      } catch (err: any) {
        console.error('Failed to delete product:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  /** Delete every duplicate copy of a product, keeping the oldest of each. */
  const handleRemoveDuplicates = () => {
    if (duplicateExtras.length === 0) return;
    confirmDelete(
      `Remove ${duplicateExtras.length} duplicate product record${duplicateExtras.length === 1 ? '' : 's'}? The oldest copy of each product is kept.`,
      async () => {
        setCleaningUp(true);
        try {
          setError(null);
          for (const p of duplicateExtras) {
            await deleteProduct(p.id);
          }
        } catch (err: any) {
          console.error('Failed to remove duplicates:', err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setCleaningUp(false);
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      category: addingCategory ? newCategory.trim() || form.category : form.category,
    };
    try {
      setError(null);
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct({ ...payload, namespace: 'fleet', system: 'main' } as any);
      }
      resetForm();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse">Loading products...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Box className="w-6 h-6 text-[#4F46E5]" />
            Products Configuration
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Active product catalog for Fleet, Deliveries, and Operations.</p>
        </div>
        <div className="flex items-center gap-2">
          {duplicateExtras.length > 0 && (
            <button 
              onClick={handleRemoveDuplicates} 
              disabled={cleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-semibold transition-colors cursor-pointer text-sm disabled:opacity-50"
              title="Deletes the extra copies, keeping the oldest record of each product"
            >
              <Copy className="w-4 h-4" /> Remove Duplicates ({duplicateExtras.length})
            </button>
          )}
          <button 
            onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} 
            className="flex items-center gap-2 px-4 py-2 bg-[#4338CA]/15 hover:bg-[#4338CA]/25 text-slate-100 border border-[#4338CA]/30 hover:border-[#4338CA]/50 rounded-lg font-semibold transition-colors cursor-pointer text-sm"
          >
            {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Product</>}
          </button>
        </div>
      </div>

      {/* Active Products Info Banner */}
      <div className="glass-panel p-4 border border-[#4338CA]/30 bg-[#4338CA]/[0.03] rounded-xl flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shadow-[0_0_8px_#34D399] shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-slate-200">Active Operational Products</p>
          <p className="text-slate-400 leading-relaxed">
            The main application is restricted strictly to the 5 active operational products: 
            <span className="text-emerald-400 font-semibold ml-1">Diesel</span>, 
            <span className="text-teal-300 font-semibold ml-1">Super (Premium)</span>, 
            <span className="text-indigo-300 font-semibold ml-1">Engine Oil</span>, 
            <span className="text-amber-300 font-semibold ml-1">Brake Fluid</span>, and 
            <span className="text-cyan-300 font-semibold ml-1">Greasing</span>.
          </p>
        </div>
      </div>

      {duplicateExtras.length > 0 && (
        <div className="glass-panel p-4 border border-amber-500/30 bg-amber-500/[0.04] rounded-xl flex items-start justify-between gap-3 flex-wrap">
          <div className="text-xs">
            <p className="font-bold text-amber-300">{duplicateExtras.length} duplicate record{duplicateExtras.length === 1 ? '' : 's'} detected</p>
            <p className="text-slate-400 leading-relaxed mt-0.5">
              The list below shows one row per product name. Use <span className="text-amber-300 font-semibold">Remove Duplicates</span> to delete the extra copies — the oldest record of each product is kept.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/60 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center justify-between">
          <span className="break-all">Error: {error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-900 dark:hover:text-red-200">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      <AnimatePresence>
      {isFormOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
        <div className="glass-panel border border-theme-border rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-theme-text border-b border-theme-border pb-3 mb-4">
            {editingId ? 'Edit Product' : 'New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-theme-text-muted mb-1.5">Product Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Super Premium" 
                required 
                className="w-full px-4 py-2.5 glass-panel border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-theme-text-muted mb-1.5">Category</label>
              {addingCategory ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="e.g. Additives"
                    className="w-full px-4 py-2.5 glass-panel border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategory(''); }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 whitespace-nowrap"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={(form.category as string) || STANDARD_CATEGORIES[0]}
                    onChange={e => {
                      if (e.target.value === '__ADD_NEW_CATEGORY__') {
                        setAddingCategory(true);
                        setNewCategory('');
                        return;
                      }
                      setForm({...form, category: e.target.value});
                    }}
                    className="w-full px-4 py-2.5 glass-panel border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white cursor-pointer"
                  >
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__ADD_NEW_CATEGORY__" className="text-emerald-300 font-bold">+ Add New Category...</option>
                  </select>
                </div>
              )}
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end mt-2">
              <button 
                type="submit"
                className="px-5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg font-semibold transition-colors"
               >
                {editingId ? 'Update Product' : 'Save Product'}
               </button>
            </div>
          </form>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="glass-panel border border-theme-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead className="text-xs text-gray-500 dark:text-gray-400 glass-panel uppercase tracking-wider">
              <tr className="modern-tr">
                <th className="modern-th">Product Code</th>
                <th className="modern-th">Product Name</th>
                <th className="modern-th">Category</th>
                <th className="modern-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-blue-900/50">
              {uniqueProducts.map(p => (
                <tr key={p.id} className="hover:bg-white/5 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="modern-td font-mono text-sm text-theme-text-muted">{p.id}</td>
                  <td className="modern-td">{p.name}</td>
                  <td className="modern-td text-sm text-theme-text-muted">{p.category || '—'}</td>
                  <td className="modern-td">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(p)} className="p-1.5 bg-blue-50 dark:bg-white/5 text-blue-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-800 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {uniqueProducts.length === 0 && (
                <tr className="modern-tr">
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No products configured. Add one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {confirmDialog}
    </motion.div>
  );
}
