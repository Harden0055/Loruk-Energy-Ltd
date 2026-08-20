const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure all tags are properly closed by re-running the exact fix
// The previous fix accidentally nested things or messed up divs.
// Let's just restore the file from a known state or rewrite the block cleanly.

const originalBlock = `
                        <div 
                          className={\`p-1.5 rounded-md cursor-pointer transition-transform hover:scale-110 \${e.type === "payment" ? "bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "glow-blue-wrapper"}\`} 
                          onClick={() => {
                            if (e.type === "adjustment") {
                              setEditingAdjustment({ ...e, originalType: e.title.includes("Credit") ? "credit" : "debit" });
                              setAdjustType(e.title.includes("Credit") ? "credit" : "debit");
                              setAdjustAmount(e.amount.toString());
                              setAdjustDate(format(e.date, "yyyy-MM-dd"));
                              setAdjustReason(e.description);
                              setActiveModal("edit_adjustment");
                            }
                          }}
                        >
                          {e.type === 'adjustment' ? <ArrowUpDown className="w-4 h-4 glow-blue-icon" /> : null}
                          {e.type === 'delivery' ? <Truck className="w-4 h-4 glow-blue-icon" /> : null}
                          {e.type === 'payment' ? <DollarSign className="w-4 h-4 text-emerald-400 stroke-emerald-400 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> : null}
                        </div>
`;

// we need to replace everything between onClick={() => { ... }} > and <span className="text-base font-bold text-theme-text">

// actually it's easier to use sed to just view the block and write a clean script.
