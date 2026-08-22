const fs = require('fs');

function replaceBlock(file) {
    let content = fs.readFileSync(file, 'utf8');
    const searchStr = `  const uniqueProducts = useMemo(() => {
    return Object.values(
      (products || []).reduce((acc, p) => {
        const key = p.name.trim().toLowerCase();
        if (!acc[key]) acc[key] = p;
        return acc;
      }, {} as Record<string, ProductDef>)
    );
  }, [products]);`;

    content = content.split(searchStr).join('  const uniqueProducts = products || [];');
    fs.writeFileSync(file, content);
}
replaceBlock('./src/pages/Deliveries.tsx');
replaceBlock('./src/pages/CustomerDashboard.tsx');
