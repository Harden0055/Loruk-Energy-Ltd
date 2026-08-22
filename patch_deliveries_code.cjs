const fs = require('fs');
const file = './src/pages/Deliveries.tsx';
let content = fs.readFileSync(file, 'utf8');

// The CSV header
content = content.replace(
    /        Customer: customers\.find\(c => c\.id === d\.customerId\)\?\.name \|\| 'Unknown',\n        Product: d\.productType,/,
    "        Customer: customers.find(c => c.id === d.customerId)?.name || 'Unknown',\n        'Product Code': d.productId || '-',\n        Product: d.productType,"
);

// Table Header
content = content.replace(
    /<th className="modern-th">Customer<\/th>\n\s*<th className="modern-th">Product<\/th>/,
    '<th className="modern-th">Customer</th>\n                      <th className="modern-th">Code</th>\n                      <th className="modern-th">Product</th>'
);

// Table row
content = content.replace(
    /<td className="modern-td">\n\s*<div className="flex items-center gap-3">\n\s*<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-theme-bg-alt flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">\n\s*\{getCustomerName\(d\.customerId\)\.charAt\(0\)\}\n\s*<\/div>\n\s*<span className="font-semibold text-gray-900 dark:text-gray-100">\{getCustomerName\(d\.customerId\)\}<\/span>\n\s*<\/div>\n\s*<\/td>\n\s*<td className="modern-td">/,
    `<td className="modern-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-theme-bg-alt flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            {getCustomerName(d.customerId).charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{getCustomerName(d.customerId)}</span>
                        </div>
                      </td>
                      <td className="modern-td">
                        <span className="font-mono text-xs text-theme-text-muted">{d.productId || '-'}</span>
                      </td>
                      <td className="modern-td">`
);

content = content.replace(/colSpan=\{7\}/, 'colSpan={8}');

fs.writeFileSync(file, content);
