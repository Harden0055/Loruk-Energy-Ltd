const glob = require('glob');
const fs = require('fs');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
  if (file.includes('fuelsuite/views')) return;
  
  let c = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (c.includes('(b.createdAt || b.date) - (a.createdAt || a.date)')) {
    c = c.replace(/\(b\.createdAt \|\| b\.date\) - \(a\.createdAt \|\| a\.date\)/g, 'b.date - a.date');
    changed = true;
  }
  if (c.includes('(a.createdAt || a.date) - (b.createdAt || b.date)')) {
    c = c.replace(/\(a\.createdAt \|\| a\.date\) - \(b\.createdAt \|\| b\.date\)/g, 'a.date - b.date');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, c);
  }
});

