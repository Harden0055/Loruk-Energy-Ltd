import os
import re

directory = './src/pages/fuelsuite/views/'

for filename in os.listdir(directory):
    if filename.endswith(".tsx"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Regex to find:
        # const handleDelete = (id: string) => {
        #   setSomething(prev => prev.filter(x => x.id !== id));
        # };
        
        # We need to replace:
        # const handleDelete = (id: string) => {
        #   setPumpReadings(prev => prev.filter(r => r.id !== id));
        # };
        # With:
        # const handleDelete = (id: string) => {
        #   if (confirm('Are you sure you want to delete this record?')) {
        #     setPumpReadings(prev => prev.filter(r => r.id !== id));
        #   }
        # };
        
        # For handleDeleteCustomer as well
        
        def replace_func(match):
            func_name = match.group(1)
            inner_content = match.group(2)
            
            # check if it already has confirm
            if 'confirm(' in inner_content:
                return match.group(0)
            
            # format with confirm
            new_inner = f"if (confirm('Are you sure you want to delete this record?')) {{\n    {inner_content.strip()}\n  }}"
            return f"const {func_name} = (id: string) => {{\n  {new_inner}\n}};"
        
        new_content = re.sub(r"const\s+(handleDelete(?:[A-Za-z0-9_]*))\s*=\s*\(\s*id:\s*string\s*\)\s*=>\s*\{\s*(.*?)\s*\};", replace_func, content, flags=re.DOTALL)
        
        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filename}")

