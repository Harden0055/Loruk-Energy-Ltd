const fs = require('fs');
const file = './src/pages/CustomerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('{false && <div className={\`p-1.5 rounded-md \${ ', '');
content = content.replace('e.type === \\\'payment\\\'', '');

fs.writeFileSync(file, content);
