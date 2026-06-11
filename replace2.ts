import fs from 'fs';
import path from 'path';

const walkSync = (dir: string, filelist: string[] = []): string[] => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const map: Record<string, string> = {
  'text-amber-400': 'text-amber-600',
  'text-emerald-400': 'text-emerald-600',
  'text-emerald-500': 'text-emerald-600',
  'text-red-400': 'text-red-600',
  'text-blue-400': 'text-blue-600',
  'bg-emerald-500/10': 'bg-emerald-100',
  'border-emerald-500/20': 'border-emerald-200',
  'bg-red-500/10': 'bg-red-100',
  'border-red-500/20': 'border-red-200',
  'bg-amber-900/30': 'bg-amber-100',
  'bg-green-900/30': 'bg-emerald-100',
};

const replaceInFile = (file: string) => {
  let content = fs.readFileSync(file, 'utf8');
  let altered = content;
  
  for(const [k, v] of Object.entries(map)) {
    const regex = new RegExp(k, 'g');
    altered = altered.replace(regex, v);
  }
  
  if (altered !== content) {
    fs.writeFileSync(file, altered);
    console.log(`Updated ${file}`);
  }
};

const files = walkSync('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
files.forEach(replaceInFile);

console.log('Done replacement.');
