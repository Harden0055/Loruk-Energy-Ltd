const fs = require('fs');
const file = './src/pages/Products.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useConfirm')) {
    content = content.replace(
        "import { Plus, Pencil, Trash2, X, Box } from 'lucide-react';",
        "import { Plus, Pencil, Trash2, X, Box } from 'lucide-react';\nimport { useConfirm } from './fuelsuite/useConfirm';"
    );
}

content = content.replace(
    '  const [error, setError] = useState<string | null>(null);',
    '  const [error, setError] = useState<string | null>(null);\n  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();'
);

content = content.replace(
    /  const handleDelete = async \(id: string\) => \{\n    if \(confirm\('Are you sure you want to delete this product\? Note: existing records using this product string will not be affected.'\)\) \{\n      try \{\n        setError\(null\);\n        await deleteProduct\(id\);\n      \} catch \(err: any\) \{\n        console\.error\('Failed to delete product:', err\);\n        setError\(err instanceof Error \? err\.message : String\(err\)\);\n      \}\n    \}\n  \};/,
    `  const handleDelete = async (id: string) => {
    confirmDelete('Are you sure you want to delete this product?', async () => {
      try {
        setError(null);
        await deleteProduct(id);
      } catch (err: any) {
        console.error('Failed to delete product:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };`
);

// We need to render the {confirmDialog}. We'll append it before the final closing div.
content = content.replace(
    '    </div>\n  );\n}\n',
    '      {confirmDialog}\n    </div>\n  );\n}\n'
);

fs.writeFileSync(file, content);
