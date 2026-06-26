import React, { useState, useEffect } from 'react';
import { useProducts, addProduct, updateProduct, deleteProduct } from '../lib/operationsDb';
import { ProductDef } from '../types';
import { Plus, Pencil, Trash2, X, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Products() {
  const { data: products, loading } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && products) {
      const seed = async () => {
        try {
          const missingDiesel = !products.some(p => p.name.toLowerCase() === 'diesel');
          const missingSuper = !products.some(p => p.name.toLowerCase().includes('super'));
          
          if (missingDiesel) await addProduct({ name: 'Diesel' });
          if (missingSuper) await addProduct({ name: 'Super (Premium)' });
        } catch (e) {
          console.error('Seed error:', e);
        }
      };
      seed();
    }
  }, [products, loading]);

  const [form, setForm] = useState<Partial<ProductDef>>({
    name: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleEdit = (product: ProductDef) => {
    setError(null);
    // Destructure to omit id or other internal fields from the input form
    const { id, name } = product;
    setForm({ name });
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product? Note: existing records using this product string will not be affected.')) {
      try {
        setError(null);
        await deleteProduct(id);
      } catch (err: any) {
        console.error('Failed to delete product:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await addProduct(form as any);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
            <Box className="w-6 h-6 text-cyan-500 dark:text-blue-400" />
            Products Configuration
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage product types available for deliveries and operations.</p>
        </div>
        <button 
          onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} 
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold transition-colors"
        >
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Product</>}
        </button>
      </div>

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
        <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-blue-100 border-b border-gray-100 dark:border-blue-900/40 pb-3 mb-4">
            {editingId ? 'Edit Product' : 'New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-blue-300 mb-1.5">Product Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Super Premium" 
                required 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-blue-900/40 border border-gray-200 dark:border-blue-800/70 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
              />
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end mt-2">
              <button 
                type="submit"
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold transition-colors"
               >
                {editingId ? 'Update Product' : 'Save Product'}
               </button>
            </div>
          </form>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="bg-white dark:bg-blue-950 border border-gray-200 dark:border-blue-900 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-blue-900/20 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-blue-900/50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-blue-100">{p.name}</td>
                  <td className="px-6 py-4 flex justify-end gap-3">
                    <button onClick={() => handleEdit(p)} className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-cyan-500 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-800 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No products configured. Add one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
