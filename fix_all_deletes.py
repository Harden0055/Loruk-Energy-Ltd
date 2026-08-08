import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if not filename.endswith(".tsx"):
        continue

    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # 1. Replace the if(confirm()) with confirmDelete()
    def replace_confirm(m):
        inner = m.group(1).strip()
        return f"confirmDelete('Are you sure you want to delete this record?', () => {{\n      {inner}\n    }});"
    
    content = re.sub(r"if\s*\(\s*confirm\('Are you sure you want to delete this record\?'\)\s*\)\s*\{\s*(.*?)\s*\}", replace_confirm, content, flags=re.DOTALL)
    
    if content != original_content:
        # 2. Add import for useConfirm
        # Find the last import
        import_match = list(re.finditer(r"import\s+.*?;", content))
        if import_match:
            last_import = import_match[-1]
            content = content[:last_import.end()] + "\nimport { useConfirm } from '../useConfirm';" + content[last_import.end():]
        else:
            content = "import { useConfirm } from '../useConfirm';\n" + content
            
        # 3. Add useConfirm inside component
        # export default function ComponentName() {
        comp_match = re.search(r"export\s+default\s+function\s+[a-zA-Z0-9_]+\s*\(\s*\)\s*\{", content)
        if comp_match:
            content = content[:comp_match.end()] + "\n  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();" + content[comp_match.end():]
            
        # 4. Add {confirmDialog} before the last ); \n }
        # Let's search from the end
        if content.endswith("  );\n}"):
            content = content[:-6] + "  {confirmDialog}\n  );\n}"
        elif content.endswith(");\n}"):
            content = content[:-4] + "  {confirmDialog}\n);\n}"
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filename}")

