const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

// Update imports
code = code.replace(/import \{ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line \} from 'recharts';/, 
  "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';");

// Replace LineChart with AreaChart
code = code.replace(/<LineChart data=\{fleetTrend\}>/, `<AreaChart data={fleetTrend}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>`);
code = code.replace(/<\/LineChart>/, '</AreaChart>');
code = code.replace(/<Line type="monotone" dataKey="Amount" stroke="#3B82F6" strokeWidth=\{3\} dot=\{\{ stroke: '#3B82F6', strokeWidth: 2, r: 4, fill: '#09090B' \}\} activeDot=\{\{ r: 6, strokeWidth: 0, fill: '#3B82F6' \}\} \/>/, 
  '<Area type="monotone" dataKey="Amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" dot={{ stroke: \'#3B82F6\', strokeWidth: 2, r: 4, fill: \'#111115\' }} activeDot={{ r: 6, strokeWidth: 0, fill: \'#3B82F6\' }} />');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
