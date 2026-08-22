const fs = require('fs');
const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const uniqueProducts = useMemo\(\(\) => \{\n    return Object.values\([\s\S]*?Record<string, ProductDef>\)\n    \);\n  \}, \[products\]\);/g, 'const uniqueProducts = products || [];');
    content = content.replace(/const uniqueProducts = useMemo\(\(\) => \{\n    return Object.values\([\s\S]*?Record<string, ProductDef>\)\n  \);\n  \}, \[products\]\);/g, 'const uniqueProducts = products || [];');
    fs.writeFileSync(file, content);
}
fixFile('./src/pages/Deliveries.tsx');
fixFile('./src/pages/CustomerDashboard.tsx');
