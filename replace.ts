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
  'bg-\\[#09090b\\]': 'bg-gray-50',
  'bg-zinc-950': 'bg-gray-100',
  'bg-zinc-900/50': 'bg-white',
  'bg-zinc-900/80': 'bg-gray-50',
  'bg-zinc-900': 'bg-white',
  'bg-zinc-800/50': 'bg-gray-100',
  'bg-zinc-800/30': 'bg-gray-50',
  'bg-zinc-800': 'bg-gray-200',
  'bg-zinc-700': 'bg-gray-300',
  'border-zinc-800': 'border-gray-200',
  'border-zinc-700': 'border-gray-300',
  'text-zinc-100': 'text-gray-900',
  'text-zinc-200': 'text-gray-800',
  'text-zinc-300': 'text-gray-700',
  'text-zinc-400': 'text-gray-500',
  'text-zinc-500': 'text-gray-400',
  'text-zinc-600': 'text-gray-400',
  'hover:bg-zinc-800': 'hover:bg-gray-100',
  'hover:bg-zinc-900/50': 'hover:bg-gray-50',
  'divide-zinc-800': 'divide-gray-200',
  'ring-zinc-800': 'ring-gray-200',
  'focus:border-zinc-700': 'focus:border-gray-300',
  // Specific Sidebar and Header tweaks:
  // Usually the Sidebar has text-white, let's keep some or replace
};

const replaceInFile = (file: string) => {
  let content = fs.readFileSync(file, 'utf8');
  let altered = content;
  
  for(const [k, v] of Object.entries(map)) {
    const regex = new RegExp(k, 'g');
    altered = altered.replace(regex, v);
  }
  
  // Specific fix for text-white in sidebar when moving to a light theme:
  if (file.includes('Sidebar.tsx')) {
    altered = altered.replace(/text-white/g, 'text-gray-900');
    altered = altered.replace(/hover:text-white/g, 'hover:text-gray-900');
  }

  // Dashboard charts text colors: fill="#71717a" to fill="#9ca3af" / stroke="#71717a" (zinc-500) to stroke="#9ca3af" (gray-400), #27272a to #e5e7eb
  if (file.includes('Dashboard.tsx')) {
    altered = altered.replace(/stroke="#71717a"/g, 'stroke="#9ca3af"');
    altered = altered.replace(/stroke="#27272a"/g, 'stroke="#e5e7eb"');
    altered = altered.replace(/backgroundColor: '#18181b'/g, 'backgroundColor: \'#ffffff\'');
    altered = altered.replace(/border: '1px solid #27272a'/g, 'border: \'1px solid #e5e7eb\'');
    altered = altered.replace(/color: '#fff'/g, 'color: \'#111827\'');
    altered = altered.replace(/cursor={{fill: '#27272a'}}/g, "cursor={{fill: '#f3f4f6'}}");
    altered = altered.replace(/text-white/g, 'text-gray-900');
  }

  // For App.tsx text-white
  if (file.includes('App.tsx')) {
    altered = altered.replace(/text-white/g, 'text-gray-900');
    // For the login button, text-gray-900 looks bad on a blue button
    altered = altered.replace(/bg-blue-600 hover:bg-blue-500 text-gray-900/g, 'bg-blue-600 hover:bg-blue-500 text-white');
  }

  // For Customers, Deliveries, Payments buttons
  ['Customers', 'Deliveries', 'Payments', 'Reports'].forEach(n => {
     if (file.includes(n)) {
      // Just in case we replaced white text inside blue buttons somewhere blindly, we didn't, we only replaced text-zinc.
      // But in Sidebar we did.
     }
  })

  // Table header fixes: text-zinc-500 -> text-gray-600
  altered = altered.replace(/text-zinc-500/g, 'text-gray-500');

  if (altered !== content) {
    fs.writeFileSync(file, altered);
    console.log(`Updated ${file}`);
  }
};

const files = walkSync('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
files.forEach(replaceInFile);

console.log('Done replacement.');
