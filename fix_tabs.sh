sed -i "s/type: 'overview' | 'fuel' | 'lpg' | 'expenses' | 'invoices' | 'timeline'/type: 'overview' | 'deliveries' | 'expenses' | 'timeline'/g" src/pages/StationDashboard.tsx
sed -i "s/useState<'overview' | 'fuel' | 'lpg' | 'expenses' | 'invoices' | 'timeline'>/useState<'overview' | 'deliveries' | 'expenses' | 'timeline'>/g" src/pages/StationDashboard.tsx
