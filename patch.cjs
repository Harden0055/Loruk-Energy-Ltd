const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const handleEditAdjustment = `
  const handleUpdateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !editingAdjustment) return;
    const amountVal = parseFloat(adjustAmount);
    if (!amountVal || amountVal <= 0 || !adjustReason.trim()) {
      alert('Please enter progress amount and adjustment explanation');
      return;
    }
    setModalLoading(true);
    try {
      const oldAmount = editingAdjustment.amount;
      const oldType = editingAdjustment.originalType; // credit or debit
      
      await updateAdjustment(editingAdjustment.id.replace('adj-', ''), {
        date: new Date(adjustDate).getTime(),
        type: adjustType,
        amount: amountVal,
        description: adjustReason.trim(),
      }, user?.email || 'Unknown');
      
      // Update customer balance based on difference
      let balanceChange = 0;
      // Reverse old
      if (oldType === 'credit') {
        balanceChange -= oldAmount;
      } else {
        balanceChange += oldAmount;
      }
      
      // Apply new
      if (adjustType === 'credit') {
        balanceChange += amountVal;
      } else {
        balanceChange -= amountVal;
      }
      
      if (balanceChange !== 0) {
        await updateCustomer(customer.id, {
          openingBalance: (customer.openingBalance || 0) + balanceChange
        });
      }
      
      setActiveModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      setEditingAdjustment(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update adjustment');
    } finally {
      setModalLoading(false);
    }
  };
`;

content = content.replace('const handleAddAdjustment = async (e: React.FormEvent) => {', handleEditAdjustment + '\n  const handleAddAdjustment = async (e: React.FormEvent) => {');

const editModalHtml = `
      {activeModal === 'edit_adjustment' && editingAdjustment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-950 rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden transform transition-all duration-300">
            <form onSubmit={handleUpdateAdjustment}>
              <div className="px-6 py-5 border-b border-theme-border bg-blue-100/50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-50">Edit Ledger Override</h3>
                </div>
                <button type="button" onClick={() => { setActiveModal(null); setEditingAdjustment(null); }} className="p-1 px-2 text-blue-400 hover:text-cyan-500 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Adjustment Action *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAdjustType('credit')} className={\`px-4 py-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer \${adjustType === 'credit' ? 'bg-pink-500/10 border-pink-500/50 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'bg-white/5 border-theme-border text-gray-500 hover:text-pink-400'}\`}>
                       Balance Credit
                    </button>
                    <button type="button" onClick={() => setAdjustType('debit')} className={\`px-4 py-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer \${adjustType === 'debit' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-theme-border text-gray-500 hover:text-emerald-400'}\`}>
                       Balance Debit
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Override Amount (KES) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-blue-500 dark:text-blue-400 font-bold">KSh</span>
                    <input type="number" required min="0" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="w-full pl-12 pr-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-lg font-mono font-bold text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Date *</label>
                  <input type="date" required value={adjustDate} onChange={e => setAdjustDate(e.target.value)} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-base text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-theme-text mb-1.5">Reason for Override *</label>
                  <textarea required value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 glass-panel border border-theme-border dark:border-theme-border rounded-lg text-sm text-blue-900 dark:text-blue-50 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none" placeholder="Explain why this ledger override is necessary..."></textarea>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-theme-border bg-blue-100/50 dark:bg-black/20 flex justify-end gap-3">
                 <button type="button" onClick={() => { setActiveModal(null); setEditingAdjustment(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-blue-900/50 rounded-lg transition-colors cursor-pointer">Cancel</button>
                 <button type="submit" disabled={modalLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all cursor-pointer">
                   {modalLoading ? 'Saving...' : 'Update'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace('{/* QUICK MODALS MAP */}', '{/* QUICK MODALS MAP */}' + editModalHtml);

// Add edit button logic for adjustment
content = content.replace(`                        <div className={\`p-1.5 rounded-md \${`, `                        <div 
                          className={\`p-1.5 rounded-md cursor-pointer transition-transform hover:scale-110 \${ \` } 
                          onClick={() => {
                            if (e.type === 'adjustment') {
                              setEditingAdjustment({ ...e, originalType: e.title.includes('Credit') ? 'credit' : 'debit' });
                              setAdjustType(e.title.includes('Credit') ? 'credit' : 'debit');
                              setAdjustAmount(e.amount.toString());
                              setAdjustDate(format(e.date, 'yyyy-MM-dd'));
                              setAdjustReason(e.description);
                              setActiveModal('edit_adjustment');
                            }
                          }}
                        >
                          {e.type === 'adjustment' ? <ArrowUpDown className="w-4 h-4 glow-blue-icon" /> : null}
                          {e.type === 'delivery' ? <Truck className="w-4 h-4 glow-blue-icon" /> : null}
                          {e.type === 'payment' ? <DollarSign className="w-4 h-4 text-emerald-400 stroke-emerald-400 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> : null}
                        </div>
                        {false && <div className={\`p-1.5 rounded-md \${ `);

fs.writeFileSync(file, content);
