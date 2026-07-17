const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/<div className="w-8 h-8 rounded-lg shrink-0 glow-blue-wrapper flex items-center justify-center">[\s\S]*?<\/div>/, `<div className="w-8 h-8 rounded-lg shrink-0 bg-white/5 flex items-center justify-center">
          <Icon className={\`w-4 h-4 \${color || 'text-blue-500'}\`} />
        </div>`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
