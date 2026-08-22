const fs = require('fs');

function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    const pattern = /const uniqueProducts = useMemo\(\(\) => \{\s+return Object\.values\(\s+\(products \|\| \[\]\)\.reduce\(\(acc, p\) => \{\s+const key = p\.name\.trim\(\)\.toLowerCase\(\);\s+if \(!acc\[key\]\) acc\[key\] = p;\s+return acc;\s+\}, \{\} as Record<string, ProductDef>\)\s+\);\s+\}, \[products\]\);/g;
    content = content.replace(pattern, 'const uniqueProducts = products || [];');
    fs.writeFileSync(file, content);
}
fix('./src/pages/Deliveries.tsx');
fix('./src/pages/CustomerDashboard.tsx');
