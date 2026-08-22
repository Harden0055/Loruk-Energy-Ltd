const fs = require('fs');
let content = fs.readFileSync('./src/pages/Products.tsx', 'utf8');

// Ensure replaceProductsWithStandard is imported
if (!content.includes('replaceProductsWithStandard')) {
    // but the error is replaceProductsWithStandard is not defined, so it's used but not imported
}
if (content.includes('replaceProductsWithStandard(products)') && !content.includes('replaceProductsWithStandard }')) {
    content = content.replace(/import {([^}]+)} from '\.\.\/lib\/operationsDb';/, (match, p1) => {
        if (!p1.includes('replaceProductsWithStandard')) {
            return `import {${p1}, replaceProductsWithStandard} from '../lib/operationsDb';`;
        }
        return match;
    });
}
fs.writeFileSync('./src/pages/Products.tsx', content);
