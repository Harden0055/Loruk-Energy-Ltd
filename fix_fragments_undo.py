import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if not filename.endswith(".tsx"):
        continue

    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Find where <>\n is the first thing after return (
    if "<>\n" in content and "{confirmDialog}" in content:
        # We need to be careful. The regex we used was greedy:
        # We did: content[:match.start()] + new_return
        # Where new_return was f"return (\n    <>\n{inner_return}\n      {{confirmDialog}}\n    </>\n  );\n}}"
        # We can just remove the <>\n and \n      {confirmDialog}\n    </>
        
        # Actually it's easier to just find the exact replacements:
        content = content.replace("return (\n    <>\n", "return (")
        content = content.replace("\n      {confirmDialog}\n    </>\n  );\n}", "\n  );\n}")
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Undid {filename}")

