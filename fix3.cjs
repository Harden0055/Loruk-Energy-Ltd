const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('onClick={() => {\n                            if (e.type === \\\'adjustment\\\') {\n                              setEditingAdjustment({ ...e, originalType: e.title.includes(\\\'Credit\\\') ? \\\'credit\\\' : \\\'debit\\\' });\n                              setAdjustType(e.title.includes(\\\'Credit\\\') ? \\\'credit\\\' : \\\'debit\\\');\n                              setAdjustAmount(e.amount.toString());\n                              setAdjustDate(format(e.date, \\\'yyyy-MM-dd\\\'));\n                              setAdjustReason(e.description);\n                              setActiveModal(\\\'edit_adjustment\\\');\n                            }\n                          }}', 'onClick={() => {\n                            if (e.type === "adjustment") {\n                              setEditingAdjustment({ ...e, originalType: e.title.includes("Credit") ? "credit" : "debit" });\n                              setAdjustType(e.title.includes("Credit") ? "credit" : "debit");\n                              setAdjustAmount(e.amount.toString());\n                              setAdjustDate(format(e.date, "yyyy-MM-dd"));\n                              setAdjustReason(e.description);\n                              setActiveModal("edit_adjustment");\n                            }\n                          }}');

const i = content.indexOf('className={`p-1.5 rounded-md cursor-pointer transition-transform hover:scale-110 ${ ` }');
if (i !== -1) {
    content = content.replace('className={`p-1.5 rounded-md cursor-pointer transition-transform hover:scale-110 ${ ` }', 'className={`p-1.5 rounded-md cursor-pointer transition-transform hover:scale-110 ${e.type === "payment" ? "bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "glow-blue-wrapper"}`}');
}

fs.writeFileSync(file, content);
