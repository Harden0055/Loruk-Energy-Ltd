const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add code to the table header
content = content.replace(
    /<th className="modern-th w-\[60\%\]">Product Name<\/th>/,
    '<th className="modern-th w-[30%]">Product Code</th>\n                <th className="modern-th w-[50%]">Product Name</th>'
);
if (!content.includes('>Product Code</th>')) {
    // maybe header is slightly different
    content = content.replace(
        /<th className="modern-th">Product Name<\/th>/,
        '<th className="modern-th">Product Code</th>\n                <th className="modern-th">Product Name</th>'
    );
}
// Add code to the table row
content = content.replace(
    /<td className="modern-td">\n\s*<div className="flex items-center gap-3">/,
    '<td className="modern-td font-mono text-sm text-theme-text-muted">{p.id}</td>\n                  <td className="modern-td">\n                    <div className="flex items-center gap-3">'
);
// And colSpan=2 -> colSpan=3
content = content.replace(/colSpan=\{2\}/, 'colSpan={3}');

fs.writeFileSync(file, content);
