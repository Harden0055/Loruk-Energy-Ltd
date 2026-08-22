const fs = require('fs');
const file = 'src/pages/fuelsuite/views/PumpReadingsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFormStart = content.indexOf('<form onSubmit={handleSubmit}');
const oldFormEnd = content.indexOf('</form>', oldFormStart) + 7;
const oldForm = content.slice(oldFormStart, oldFormEnd);

const newForm = `<form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Date</label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Station</label>
                  <Select value={form.station} onChange={e => setForm({...form, station: e.target.value as any})}>
                    {STATIONS.map(s => <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Product</label>
                  <Select value={form.product} onChange={e => setForm({...form, product: e.target.value})}>
                    {products.filter(p => p.name.toLowerCase().includes('super') || p.name.toLowerCase().includes('diesel')).map(p => (
                      <option className="bg-white dark:bg-[#09090B] dark:text-gray-100 text-gray-900" key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Sales Start</label>
                  <Input type="number" step="0.01" value={form.salesStart} onChange={e => setForm({...form, salesStart: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Sales Stop</label>
                  <Input type="number" step="0.01" value={form.salesStop} onChange={e => setForm({...form, salesStop: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Litres Start</label>
                  <Input type="number" step="0.01" value={form.litresStart} onChange={e => setForm({...form, litresStart: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Litres Stop</label>
                  <Input type="number" step="0.01" value={form.litresStop} onChange={e => setForm({...form, litresStop: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Rate per Litre</label>
                  <Input type="number" step="0.01" value={form.ratePerLitre} onChange={e => setForm({...form, ratePerLitre: parseFloat(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted mb-1">Manual Cash</label>
                  <Input type="number" step="0.01" value={form.manualCash} onChange={e => setForm({...form, manualCash: parseFloat(e.target.value)})} required />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button type="submit">{editingId ? 'Update Reading' : 'Save Reading'}</Button>
              </div>
            </form>`;

content = content.replace(oldForm, newForm);

const oldTbodyStart = content.indexOf('<tbody>');
const oldTbodyEnd = content.indexOf('</tbody>', oldTbodyStart) + 8;
const oldTbody = content.slice(oldTbodyStart, oldTbodyEnd);

const newTbody = `<tbody>
            {filteredReadings.map(r => {
              const volume = r.litresStop - r.litresStart;
              const expected = volume * r.ratePerLitre;
              const variance = r.manualCash - expected;
              return (
                <tr key={r.id} className="hover:theme-bg-gradient transition-colors">
                  <Td>{r.date}</Td>
                  <Td>{r.station}</Td>
                  <Td><span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-theme-border">{r.product}</span></Td>
                  <Td className="font-semibold font-mono">{volume.toFixed(2)}</Td>
                  <Td className="text-[#3B82F6] font-semibold font-mono">KES {expected.toLocaleString()}</Td>
                  <Td className="text-[#00D4FF] font-semibold font-mono">KES {r.manualCash.toLocaleString()}</Td>
                  <Td>
                    <span className={\`font-semibold font-mono \${variance === 0 ? 'text-theme-text-muted' : variance > 0 ? 'text-[#00D4FF]' : 'text-red-400'}\`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(r)} className="text-theme-text-muted hover:text-[#00D4FF] transition-colors cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-theme-text-muted hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>`;

content = content.replace(oldTbody, newTbody);

fs.writeFileSync(file, content);
