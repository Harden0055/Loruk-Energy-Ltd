import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if not filename.endswith(".tsx"):
        continue

    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    if "useConfirm" in content and "{confirmDialog}" not in content:
        # replace the last </div> with {confirmDialog} \n </div>
        # we can use rpartition
        parts = content.rpartition("</div>")
        if parts[1] == "</div>":
            content = parts[0] + "{confirmDialog}\n      </div>" + parts[2]
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed {filename}")

