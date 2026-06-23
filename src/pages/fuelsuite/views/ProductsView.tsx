import React, { useState } from 'react';
import { useFuel, Product } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td } from '../components';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function ProductsView() {
  const { products, setProducts } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Product>>({
    name: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (product: Product) => {
    setForm({ ...product });
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...p, ...form as Product } : p));
    } else {
      const newProd: Product = {
        id: Math.random().toString(36).substr(2, 9),
        ...form as Omit<Product, 'id'>
      };
      setProducts([...products, newProd]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Products Configuration</h1>
          <p className="text-slate-400 mt-1">Manage fuel and oil products across all stations.</p>
        </div>
        <Button onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }} className="flex items-center gap-2">
          {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Product</>}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Product' : 'New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Product Name</label>
                <Input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Super Premium" required />
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Product' : 'Save Product'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Product Name</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-[#13162b] transition-colors">
                  <Td>
                    <span className="font-semibold text-slate-200">{p.name}</span>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(p)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <Td colSpan={2} className="text-center py-8 text-slate-500">No products configured.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
