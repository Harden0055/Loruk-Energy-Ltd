import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if filename.endswith(".tsx"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # We want to replace something like:
        # const handleDelete = (id: string) => {
        #   if (confirm('...')) {
        #     setPumpReadings(prev => prev.filter(r => r.id !== id));
        #   }
        # };
        # with:
        # const handleDelete = (id: string) => {
        #   setPumpReadings(prev => prev.filter(r => r.id !== id));
        # };
        
        # Regex to find: if (confirm(...)) { \n <content> \n }
        # Need a robust regex for this
        
        new_content = re.sub(r"if\s*\(\s*confirm\s*\([^)]+\)\s*\)\s*\{\s*([\s\S]*?)\s*\}", r"\1", content)
        
        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filename}")

