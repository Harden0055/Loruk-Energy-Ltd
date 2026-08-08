filepath = './src/pages/fuelsuite/views/ProductsView.tsx'
with open(filepath, 'r') as f:
    content = f.read()

import re
new_content = re.sub(r"if\s*\(\s*confirm\s*\([^)]+\)\s*\)\s*\{\s*([\s\S]*?)\s*\}", r"\1", content)

with open(filepath, 'w') as f:
    f.write(new_content)
