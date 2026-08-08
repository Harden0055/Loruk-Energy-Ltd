import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if not filename.endswith(".tsx"):
        continue

    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # If {confirmDialog} is not present but useConfirm is imported
    if "useConfirm" in content and "{confirmDialog}" not in content:
        # Wrap the whole return (...) in <> ... </>
        # Find the return ( ... ); }
        match = re.search(r"return\s*\(\s*(.*)\s*\);\s*\}", content, flags=re.DOTALL)
        if match:
            inner_return = match.group(1)
            new_return = f"return (\n    <>\n{inner_return}\n      {{confirmDialog}}\n    </>\n  );\n}}"
            content = content[:match.start()] + new_return
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed {filename}")

