import React, { useState, useMemo } from 'react';
import { useFuel, Product, StationData, ProductCategory, ProductUOM } from '../context';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Table, Th, Td } from '../components';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Tag, 
  Layers, 
  RefreshCw, 
  Check, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Fuel, 
  Flame, 
  Box, 
  Wrench, 
  Droplet,
  Package,
  Layers as LayersIcon
} from 'lucide-react';
import { useConfirm } from '../useConfirm';

export const sortProductsList = (list: Product[]): Product[] => {
  return [...list].sort((a, b) => {
    if (a.itemCode && b.itemCode) {
      return a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true });
    }
    if (a.itemCode) return -1;
    if (b.itemCode) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const CATEGORY_OPTIONS: { label: string; value: ProductCategory; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { label: 'Fuel', value: 'Fuel', icon: Fuel, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { label: 'LPG', value: 'LPG', icon: Flame, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { label: 'Accessories', value: 'Accessories', icon: Box, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { label: 'Lubricants', value: 'Lubricants', icon: Droplet, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { label: 'Equipment', value: 'Equipment', icon: Wrench, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { label: 'Other', value: 'Other', icon: Package, color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
];

export const UOM_OPTIONS: { label: string; value: ProductUOM }[] = [
  { label: 'Litre (L)', value: 'Litre' },
  { label: 'Kilogram (Kg)', value: 'Kg' },
  { label: 'Piece (Pcs)', value: 'Piece' },
  { label: 'Cylinder (Cyl)', value: 'Cylinder' },
  { label: 'Pack (Pk)', value: 'Pack' },
  { label: 'Drum (200L)', value: 'Drum' },
  { label: 'Bottle', value: 'Bottle' },
];

export const autoDetectCategoryAndUOM = (name: string): { category: ProductCategory; uom: ProductUOM; suggestedSkuPrefix: string } => {
  const n = name.trim().toLowerCase();
  
  if (n.includes('super') || n.includes('petrol') || n.includes('pms') || n.includes('premium')) {
    return { category: 'Fuel', uom: 'Litre', suggestedSkuPrefix: 'PMS' };
  }
  if (n.includes('diesel') || n.includes('ago') || n.includes('gasoil')) {
    return { category: 'Fuel', uom: 'Litre', suggestedSkuPrefix: 'AGO' };
  }
  if (n.includes('kerosene') || n.includes('ik') || n.includes('paraffin')) {
    return { category: 'Fuel', uom: 'Litre', suggestedSkuPrefix: 'IK' };
  }
  if (n.includes('lpg') || n.includes('gas') || n.includes('cylinder') || n.includes('propane') || n.includes('butane')) {
    return { category: 'LPG', uom: 'Cylinder', suggestedSkuPrefix: 'LPG' };
  }
  if (n.includes('oil') || n.includes('lube') || n.includes('grease') || n.includes('atf') || n.includes('coolant') || n.includes('brake fluid')) {
    return { category: 'Lubricants', uom: 'Litre', suggestedSkuPrefix: 'LUB' };
  }
  if (n.includes('burner') || n.includes('grill') || n.includes('regulator') || n.includes('hose') || n.includes('pipe') || n.includes('valve')) {
    return { category: 'Accessories', uom: 'Piece', suggestedSkuPrefix: 'ACC' };
  }
  if (n.includes('pump') || n.includes('nozzle') || n.includes('meter') || n.includes('filter') || n.includes('extinguisher')) {
    return { category: 'Equipment', uom: 'Piece', suggestedSkuPrefix: 'EQP' };
  }
  return { category: 'Accessories', uom: 'Piece', suggestedSkuPrefix: 'ITEM' };
};

export default function ProductsView() {
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();
  const { products, setProducts, stations, setStations } = useFuel();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  
  const [newStationName, setNewStationName] = useState('');
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [editingStationName, setEditingStationName] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [bulkInput, setBulkInput] = useState('');
  
  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    itemCode: '',
    category: 'Fuel',
    uom: 'Litre',
  });

  const sortedProducts = useMemo(() => {
    return sortProductsList(products);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(p => {
      const matchesCategory = selectedCategoryFilter === 'ALL' || (p.category || 'Other') === selectedCategoryFilter;
      const matchesSearch = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.itemCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.uom || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [sortedProducts, selectedCategoryFilter, searchQuery]);

  const handleAddStation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newStationName.trim();
    if (!trimmed) return;

    if (stations.some(s => s.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      alert(`A station with name "${trimmed}" already exists.`);
      return;
    }

    const newStation: StationData = { 
      id: `station_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
      name: trimmed 
    };
    setStations(prev => [...prev, newStation]);
    setNewStationName('');
  };

  const handleSaveEditStation = (id: string) => {
    const trimmed = editingStationName.trim();
    if (!trimmed) return;

    if (stations.some(s => s.id !== id && s.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      alert(`Another station with name "${trimmed}" already exists.`);
      return;
    }

    setStations(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s));
    setEditingStationId(null);
    setEditingStationName('');
  };

  const handleRestoreDefaultStations = () => {
    const defaults: StationData[] = [
      { id: '1', name: 'Loruk Ndalu Filling Station' },
      { id: '2', name: 'Loruk Junction Filling Station' },
    ];
    setStations(defaults);
  };

  const handleDeleteStation = (id: string) => {
    confirmDelete('Are you sure you want to delete this station?', () => {
      setStations(prev => prev.filter(s => s.id !== id));
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      itemCode: '',
      category: 'Fuel',
      uom: 'Litre',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      itemCode: product.itemCode || '',
      category: product.category || autoDetectCategoryAndUOM(product.name).category,
      uom: product.uom || autoDetectCategoryAndUOM(product.name).uom,
    });
    setEditingId(product.id);
    setIsFormOpen(true);
    setIsBulkFormOpen(false);
  };

  const handleDelete = (id: string) => {
    confirmDelete('Are you sure you want to delete this product? It will be removed from your catalog and inventory.', () => {
      setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const standardizeProducts = () => {
    confirmDelete('This will reset your catalog to standard products with item codes, category groups, and UOM. Proceed?', () => {
      const standardProducts: Product[] = [
        { id: '1', name: 'Super ( Premium )', itemCode: 'PMS-001', category: 'Fuel', uom: 'Litre' },
        { id: '2', name: 'Diesel Fuel', itemCode: 'AGO-002', category: 'Fuel', uom: 'Litre' },
        { id: '3', name: '6Kg LPG', itemCode: 'LPG-003', category: 'LPG', uom: 'Cylinder' },
        { id: '4', name: '13Kg LPG', itemCode: 'LPG-004', category: 'LPG', uom: 'Cylinder' },
        { id: '5', name: 'Burner', itemCode: 'ACC-005', category: 'Accessories', uom: 'Piece' },
        { id: '6', name: 'Grill', itemCode: 'ACC-006', category: 'Accessories', uom: 'Piece' },
      ];
      setProducts(standardProducts);
    });
  };

  const handleNameChange = (name: string) => {
    // If not editing, or code/category/uom were not manually customized, auto-suggest
    if (!editingId && name.trim()) {
      const detected = autoDetectCategoryAndUOM(name);
      setForm(prev => {
        const shouldUpdateSku = !prev.itemCode || prev.itemCode.includes('-') || /^\d+$/.test(prev.itemCode);
        const countInCategory = products.filter(p => (p.category || '').toLowerCase() === detected.category.toLowerCase()).length;
        const nextCode = `${detected.suggestedSkuPrefix}-${String(countInCategory + 1).padStart(3, '0')}`;
        
        return {
          ...prev,
          name,
          category: prev.category === 'Fuel' && detected.category !== 'Fuel' ? detected.category : prev.category || detected.category,
          uom: prev.uom === 'Litre' && detected.uom !== 'Litre' ? detected.uom : prev.uom || detected.uom,
          itemCode: shouldUpdateSku ? nextCode : prev.itemCode,
        };
      });
    } else {
      setForm(prev => ({ ...prev, name }));
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkInput
      .split('\n')
      .flatMap(line => line.split(','))
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (lines.length === 0) {
      alert('Please enter at least one product name.');
      return;
    }

    const existingNames = new Set(products.map(p => p.name.trim().toLowerCase()));
    const addedProducts: Product[] = [];
    const duplicates: string[] = [];

    lines.forEach((line) => {
      // Check if line contains pipe or semicolon format: Name | SKU | Category | UOM
      let name = line;
      let sku = '';
      let category: ProductCategory = 'Other';
      let uom: ProductUOM = 'Piece';

      if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim());
        name = parts[0];
        sku = parts[1] || '';
        category = (parts[2] as ProductCategory) || 'Other';
        uom = (parts[3] as ProductUOM) || 'Piece';
      } else {
        const detected = autoDetectCategoryAndUOM(name);
        category = detected.category;
        uom = detected.uom;
        const countInCategory = products.length + addedProducts.length + 1;
        sku = `${detected.suggestedSkuPrefix}-${String(countInCategory).padStart(3, '0')}`;
      }

      if (existingNames.has(name.toLowerCase())) {
        duplicates.push(name);
      } else {
        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: name,
          itemCode: sku,
          category,
          uom,
        };
        addedProducts.push(newProd);
        existingNames.add(name.toLowerCase());
      }
    });

    if (addedProducts.length > 0) {
      setProducts(prev => [...prev, ...addedProducts]);
    }

    if (duplicates.length > 0) {
      alert(`Added ${addedProducts.length} new product(s). Ignored duplicate(s): ${duplicates.join(', ')}`);
    }

    setBulkInput('');
    setIsBulkFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = (form.name || '').trim();

    if (!newName) {
      alert('Product Name is required.');
      return;
    }

    // Check for duplicates
    const isDuplicate = products.some(p => p.name.trim().toLowerCase() === newName.toLowerCase() && p.id !== editingId);
    if (isDuplicate) {
      alert(`A product with the name "${newName}" already exists.`);
      return;
    }

    const detected = autoDetectCategoryAndUOM(newName);
    const category = form.category || detected.category;
    const uom = form.uom || detected.uom;
    const itemCode = (form.itemCode || '').trim() || `${detected.suggestedSkuPrefix}-${String(products.length + 1).padStart(3, '0')}`;

    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? {
        ...p,
        name: newName,
        itemCode,
        category,
        uom,
      } : p));
    } else {
      const newProd: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: newName,
        itemCode,
        category,
        uom,
      };
      setProducts(prev => [...prev, newProd]);
    }
    resetForm();
  };

  return (
    <div className="p-8 pb-32 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Settings & Products
          </h1>
          <p className="text-theme-text-muted mt-1">
            Configure master products (Name, SKU/Code, Category Group, UOM) and stations.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { 
            setIsFormOpen(false);
            setIsBulkFormOpen(prev => !prev);
          }} variant="secondary" className="flex items-center gap-2">
            {isBulkFormOpen ? <><X className="w-4 h-4" /> Cancel Bulk</> : <><Layers className="w-4 h-4" /> Bulk Add</>}
          </Button>
          <Button onClick={() => { 
            setIsBulkFormOpen(false);
            if (isFormOpen) resetForm(); else {
              setForm({
                name: '',
                itemCode: '',
                category: 'Fuel',
                uom: 'Litre',
              });
              setIsFormOpen(true);
            }
          }} className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
            {isFormOpen ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Item</>}
          </Button>
        </div>
      </div>

      {/* Add / Edit Item Form */}
      {isFormOpen && (
        <Card className="border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 shadow-2xl animate-in slide-in-from-top duration-300">
          <CardHeader className="border-b border-theme-border/60 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                {editingId ? 'Edit Catalog Item' : 'Add New Catalog Item'}
              </CardTitle>
              <button onClick={resetForm} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-theme-text-muted">
              Define the 4 standard parameters: Item Name, Item Code / SKU, Item Group/Category, and Unit of Measure (UOM).
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Item Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    1. Item Name *
                  </label>
                  <Input 
                    type="text" 
                    value={form.name || ''} 
                    onChange={e => handleNameChange(e.target.value)} 
                    placeholder="e.g. Diesel, Super ( Premium ), 6Kg LPG" 
                    required 
                    className="bg-slate-900 border-theme-border text-slate-100 placeholder-slate-500 font-medium"
                    autoFocus
                  />
                  <span className="text-[11px] text-slate-400 block">The primary display title</span>
                </div>

                {/* 2. Item Code / SKU */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    2. Item Code / SKU
                  </label>
                  <Input 
                    type="text" 
                    value={form.itemCode || ''} 
                    onChange={e => setForm({...form, itemCode: e.target.value})} 
                    placeholder="e.g. AGO-001, PMS-002, LPG-003" 
                    className="bg-slate-900 border-theme-border text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 block">Unique alphanumeric identifier</span>
                </div>

                {/* 3. Item Group / Category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    3. Item Group / Category
                  </label>
                  <Select 
                    value={form.category || 'Fuel'} 
                    onChange={e => setForm({...form, category: e.target.value as ProductCategory})}
                    className="bg-slate-900 border-theme-border text-slate-100"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.value} value={cat.value} className="bg-slate-900 text-slate-100">
                        {cat.label}
                      </option>
                    ))}
                  </Select>
                  <span className="text-[11px] text-slate-400 block">Groups into Fuel, LPG, Accessories, etc.</span>
                </div>

                {/* 4. Unit of Measure (UOM) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    4. Unit of Measure (UOM)
                  </label>
                  <Select 
                    value={form.uom || 'Litre'} 
                    onChange={e => setForm({...form, uom: e.target.value as ProductUOM})}
                    className="bg-slate-900 border-theme-border text-slate-100"
                  >
                    {UOM_OPTIONS.map(uom => (
                      <option key={uom.value} value={uom.value} className="bg-slate-900 text-slate-100">
                        {uom.label}
                      </option>
                    ))}
                  </Select>
                  <span className="text-[11px] text-slate-400 block">Measurement metric (Litre, Cylinder, Kg)</span>
                </div>
              </div>

              {/* Preview Banner */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-theme-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Preview:</span>
                  <span className="font-bold text-white text-sm">{form.name || '(Enter Name)'}</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    {form.itemCode || 'CODE-AUTO'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                    {form.category || 'Fuel'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                    {form.uom || 'Litre'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={resetForm} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs px-5">
                    {editingId ? 'Update Item' : 'Save Item to Catalog'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isBulkFormOpen && (
        <Card className="border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Bulk Add Items
            </CardTitle>
            <p className="text-xs text-theme-text-muted">
              Enter one product per line or comma-separated. You can also supply <code className="text-cyan-300 font-mono">Item Name | SKU | Category | UOM</code>.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-theme-text-muted mb-1">Product List Input</label>
                <textarea 
                  value={bulkInput} 
                  onChange={e => setBulkInput(e.target.value)} 
                  placeholder="Diesel | AGO-001 | Fuel | Litre&#10;Super Petrol | PMS-002 | Fuel | Litre&#10;6Kg LPG | LPG-003 | LPG | Cylinder&#10;15W40 Engine Oil | LUB-001 | Lubricants | Litre&#10;Burner | ACC-001 | Accessories | Piece" 
                  required
                  className="w-full h-32 px-3.5 py-2.5 bg-[#09090B] border border-theme-border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsBulkFormOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">Bulk Save Items</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stations Configuration */}
      <Card className="border-theme-border glass-panel">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <CardTitle className="text-lg text-cyan-400">Stations Configuration</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                {stations.length} Station{stations.length === 1 ? '' : 's'} Active
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-1">
              Manage your operating filling stations. All sales, meter readings, expenses, and inventory isolate by station.
            </p>
          </div>
          {stations.length === 0 && (
            <Button 
              onClick={handleRestoreDefaultStations} 
              variant="secondary" 
              className="text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Initialize 2 Standard Stations
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddStation} className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={newStationName} 
              onChange={e => setNewStationName(e.target.value)} 
              placeholder="Enter new station name (e.g. Loruk Ndalu Filling Station)" 
              className="flex-1 bg-slate-900 border-theme-border text-slate-100 placeholder-slate-500"
            />
            <Button type="submit" className="flex items-center justify-center gap-2 px-5 py-2 whitespace-nowrap bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
              <Plus className="w-4 h-4" /> Add Station
            </Button>
          </form>

          <div className="rounded-xl border border-theme-border/60 overflow-hidden bg-slate-900/30">
            <Table>
              <thead>
                <tr className="modern-tr bg-slate-950/50">
                  <Th className="w-12 text-center text-xs">#</Th>
                  <Th className="text-xs">STATION NAME</Th>
                  <Th className="w-36 text-right text-xs">ACTIONS</Th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors border-b border-theme-border/40 last:border-0">
                    <Td className="text-center text-xs font-mono text-cyan-400/80 font-bold">{idx + 1}</Td>
                    <Td>
                      {editingStationId === s.id ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <Input 
                            value={editingStationName}
                            onChange={e => setEditingStationName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEditStation(s.id);
                              if (e.key === 'Escape') setEditingStationId(null);
                            }}
                            className="text-sm py-1 bg-slate-900"
                            autoFocus
                          />
                          <button 
                            type="button"
                            onClick={() => handleSaveEditStation(s.id)}
                            className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 cursor-pointer"
                            title="Save name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingStationId(null)}
                            className="p-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                          <span className="font-semibold text-slate-100 text-sm">{s.name}</span>
                        </div>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => {
                            setEditingStationId(s.id);
                            setEditingStationName(s.name);
                          }} 
                          className="text-slate-400 hover:text-cyan-400 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer" 
                          title="Rename Station"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStation(s.id)} 
                          className="text-slate-400 hover:text-red-400 p-2 rounded hover:bg-red-500/10 transition-colors cursor-pointer" 
                          title="Delete Station"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {stations.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="text-center text-theme-text-muted py-8">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="w-8 h-8 text-slate-600" />
                        <p className="text-sm">No stations configured yet.</p>
                        <Button 
                          onClick={handleRestoreDefaultStations} 
                          variant="secondary" 
                          className="text-xs text-cyan-400 border-cyan-500/30 mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> Add Loruk Ndalu & Loruk Junction Stations
                        </Button>
                      </div>
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product List Table */}
      <Card className="border-theme-border glass-panel">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-400" />
              <CardTitle className="text-lg text-cyan-400">Master Product Catalog ({sortedProducts.length})</CardTitle>
            </div>
            <p className="text-xs text-theme-text-muted mt-1">
              Products configured here define item codes, categories, units of measure, and inventory tracking order.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items, SKU, group..."
              className="text-xs bg-slate-900 max-w-xs"
            />
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({sortedProducts.length})
              </button>
              {CATEGORY_OPTIONS.map(cat => {
                const count = sortedProducts.filter(p => (p.category || 'Other') === cat.value).length;
                if (count === 0 && selectedCategoryFilter !== cat.value) return null;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryFilter === cat.value
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr className="modern-tr bg-slate-950/60">
                <Th className="w-12 text-center text-xs">#</Th>
                <Th className="text-xs">ITEM NAME</Th>
                <Th className="text-xs">ITEM CODE / SKU</Th>
                <Th className="text-xs">GROUP / CATEGORY</Th>
                <Th className="text-xs">UNIT OF MEASURE (UOM)</Th>
                <Th className="w-24 text-right text-xs">ACTIONS</Th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => {
                const catOption = CATEGORY_OPTIONS.find(c => c.value === (p.category || 'Other')) || CATEGORY_OPTIONS[5];
                const CatIcon = catOption.icon;
                const uom = p.uom || autoDetectCategoryAndUOM(p.name).uom;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors border-b border-theme-border/40 last:border-0">
                    <Td className="text-center text-xs font-mono text-cyan-400/80 font-bold">{idx + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${catOption.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100 text-sm">{p.name}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                        {p.itemCode || '-'}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catOption.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {p.category || 'Other'}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {uom}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleEdit(p)} 
                          className="text-slate-400 hover:text-cyan-400 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer" 
                          title="Edit Item"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer" 
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr className="modern-tr">
                  <Td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="w-8 h-8 text-slate-600" />
                      <p className="text-sm">No items found matching filter.</p>
                      <Button onClick={() => { setSelectedCategoryFilter('ALL'); setSearchQuery(''); }} variant="secondary" className="text-xs mt-1">
                        Clear Filters
                      </Button>
                    </div>
                  </Td>
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
