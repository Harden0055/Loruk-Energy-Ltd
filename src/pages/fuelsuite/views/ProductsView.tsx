import React, { useState } from 'react';
import { useFuel, Product } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Table, Th, Td , MetricCard} from '../components';
import { Plus, Pencil, Trash2, X, Box, Tag, Layers } from 'lucide-react';
import { useConfirm } from '../useConfirm';

export default function ProductsView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { products, setProducts } = useFuel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState('');

  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    itemCode: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      itemCode: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (product: Product) => {
    setForm({ ...product });
    setEditingId(product.id);
    setIsFormOpen(true);
    setIsBulkFormOpen(false);
  };

  const handleDelete = (id: string) => {
  confirmDelete('Are you sure you want to delete this record?', () => {
      setProducts(prev => prev.filter(p => p.id !== id));
    });
};


  const standardizeProducts = () => {
    confirmDelete('This will replace all current products with the standard list and sorted order. Proceed?', () => {
      const standardProducts = [
        { id: 'white_oil_super_petrol', name: 'Super Petrol', sortOrder: 1 },
        { id: 'white_oil_diesel_fuel', name: 'Diesel Fuel', sortOrder: 2 },
        { id: 'white_oil_super_premium', name: 'Super (Premium)', sortOrder: 3 },
        { id: 'lpg_13kg', name: '13KG LPG', sortOrder: 4 },
        { id: 'lpg_6kg', name: '6KG LPG', sortOrder: 5 },
        { id: 'empty_13kg', name: '13KG LPG - Empty', sortOrder: 6 },
        { id: 'empty_6kg', name: '6KG LPG - Empty', sortOrder: 7 },
        { id: 'acc_burner', name: 'Burner', sortOrder: 8 },
        { id: 'acc_grill', name: 'Grill', sortOrder: 9 },
        { id: 'lube_engine_oil', name: 'Engine oil', sortOrder: 10 },
        { id: 'lube_brake_fluid', name: 'Brake fluid', sortOrder: 11 },
      ];
      setProducts(standardProducts);
    });
  };

  const removeDuplicates = () => {
    const seenNames = new Set<string>();
    const duplicates = products.filter(p => {
      const name = p.name.trim().toLowerCase();
      if (seenNames.has(name)) return true;
      seenNames.add(name);
      return false;
    });

    if (duplicates.length === 0) {
      alert("No duplicates found.");
      return;
    }

    
      setProducts(prev => prev.filter(p => !duplicates.find(d => d.id === p.id)));
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkInput
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
      
    if (names.length === 0) {
      alert('Please enter at least one product name.');
      return;
    }
    
    const existingNames = new Set(products.map(p => p.name.trim().toLowerCase()));
    const addedProducts: Product[] = [];
    const duplicates: string[] = [];
    
    names.forEach(name => {
      if (existingNames.has(name.toLowerCase())) {
        duplicates.push(name);
      } else {
        const newProd: Product = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
        };
        addedProducts.push(newProd);
        existingNames.add(name.toLowerCase());
      }
    });
    
    if (addedProducts.length > 0) {
      setProducts(prev => [...prev, ...addedProducts]);
    }
    
    if (duplicates.length > 0) {
      alert(`Added ${addedProducts.length} new product(s). Ignored ${duplicates.length} duplicate(s): ${duplicates.join(', ')}`);
    } else {
      alert(`Successfully added ${addedProducts.length} new product(s).`);
    }
    
    setBulkInput('');
    setIsBulkFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = (form.name || '').trim();
    
    // Check for duplicates
    const isDuplicate = products.some(p => p.name.trim().toLowerCase() === newName.toLowerCase() && p.id !== editingId);
    if (isDuplicate) {
      alert(`A product with the name "${newName}" already exists.`);
      return;
    }

    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...form as Product } : p));
    } else {
      const newProd: Product = {
        id: Math.random().toString(36).substr(2, 9),
        ...form as Omit<Product, 'id'>
      };
      setProducts(prev => [...prev, newProd]);
    }
    resetForm();
  };

  
  const metrics = React.useMemo(() => {
    return { total: products.length };
  }, [products]);

  return (<div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Products Configuration</h1>
          <p className="text-theme-text-muted mt-1">Manage fuel and oil products across all stations.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={standardizeProducts} variant="secondary" className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400">
            Standardize Products
          </Button>
          <Button onClick={() => { 
            setIsFormOpen(false);
            setIsBulkFormOpen(prev => !prev);
          }} variant="secondary" className="flex items-center gap-2">
            {isBulkFormOpen ? <><X className="w-4 h-4" /> Cancel Bulk</> : <><Layers className="w-4 h-4" /> Bulk Add</>}
          </Button>
          <Button onClick={() => { 
            setIsBulkFormOpen(false);
            if (isFormOpen) resetForm(); else setIsFormOpen(true); 
          }} className="flex items-center gap-2">
            {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Product</>}
          </Button>
        </div>
      </div>

      {isBulkFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Add Products</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Comma-Separated Product Names</label>
                <textarea 
                  value={bulkInput} 
                  onChange={e => setBulkInput(e.target.value)} 
                  placeholder="e.g. Engine Oil, Brake Fluid, Kerosene, LPG 13kg" 
                  required
                  className="w-full h-24 px-3.5 py-2.5 bg-[#09090B] border border-theme-border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-y"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button type="submit">Bulk Save Products</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Product' : 'New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-1">
                <label className="block text-xs text-theme-text-muted mb-1">Product Name</label>
                <Input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Super Premium" required />
              </div>
              <div className="col-span-1 md:col-span-1">
                <label className="block text-xs text-theme-text-muted mb-1">Item Code (Optional)</label>
                <Input type="text" value={form.itemCode || ''} onChange={e => setForm({...form, itemCode: e.target.value})} placeholder="e.g. PRD-001" />
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
              <tr className="modern-tr">
                <Th>Product Name</Th>
                <Th>Item Code</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {[...products].sort((a: any, b: any) => {
                if (!a.itemCode && !b.itemCode) return (a.sortOrder || 99) - (b.sortOrder || 99);
                if (!a.itemCode) return 1;
                if (!b.itemCode) return -1;
                return a.itemCode.localeCompare(b.itemCode);
              }).map(p => (
                <tr key={p.id} className="hover:theme-bg-gradient transition-colors">
                  <Td>
                    <span className="font-semibold text-theme-text">{p.name}</span>
                  </Td>
                  <Td>
                    <span className="text-theme-text-muted">{p.itemCode || '-'}</span>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(p)} className="text-theme-text-muted hover:text-cyan-400 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-theme-text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr className="modern-tr">
                  <Td colSpan={2} className="text-center py-8 text-slate-500">No products configured.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    {confirmDialog}
      </div>
  
  );
}