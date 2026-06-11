const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const map = {
  'text-xs': 'text-base',
  'text-sm': 'text-lg',
  'text-\\[10px\\]': 'text-sm',
  'text-lg': 'text-2xl',
  'text-xl': 'text-3xl',
  'text-2xl': 'text-4xl',
  'text-3xl': 'text-5xl'
};

const replaceInFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let altered = content;
  
  // We need to match class names precisely.
  for(const [k, v] of Object.entries(map)) {
    // replace `text-xs` but not `text-xs-foo`
    const regex = new RegExp(`(?<=\\s|["'\`])${k}(?=\\s|["'\`])`, 'g');
    altered = altered.replace(regex, v);
  }
  
  if (altered !== content) {
    fs.writeFileSync(file, altered);
    console.log(`Updated ${file}`);
  }
};

const files = walkSync('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
files.forEach(replaceInFile);

console.log('Done');
