import sys

file_path = r'c:\xampp\htdocs\ClassyErp\src\pages\Orders\AddOrder.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
    
    # Fix the main button click and dropdown container
    if 'onClick={() => {' in line and 'updated[idx].showInventoryDropdown' in lines[i+2]:
        indent = line[:line.find('onClick')]
        new_lines.append(f'{indent}onClick={(e) => {{\n')
        new_lines.append(f'{indent}  const rect = e.currentTarget.getBoundingClientRect();\n')
        new_lines.append(f'{indent}  setInventoryDropdownPos({{ top: rect.bottom, left: rect.left, width: rect.width }});\n')
        continue
    
    # Fix the backdrop and dropdown div
    if 'fixed inset-0 z-[80]' in line and 'updateOrderItem(idx, { showInventoryDropdown: null })' in line:
        indent = line[:line.find('<div')]
        new_lines.append(f'{indent}<div className="fixed inset-0 z-[100]" onClick={() => updateOrderItem(idx, {{ showInventoryDropdown: null }})} />\n')
        next_line = lines[i+1]
        next_indent = next_line[:next_line.find('<div')]
        new_lines.append(f'{next_indent}<div \n')
        new_lines.append(f'{next_indent}  className="fixed z-[110] mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl overflow-hidden"\n')
        new_lines.append(f'{next_indent}  style={{{{ \n')
        new_lines.append(f'{next_indent}    top: inventoryDropdownPos.top, \n')
        new_lines.append(f'{next_indent}    left: inventoryDropdownPos.left, \n')
        new_lines.append(f'{next_indent}    width: inventoryDropdownPos.width,\n')
        new_lines.append(f'{next_indent}    minWidth: "220px"\n')
        new_lines.append(f'{next_indent}  }}}}\n')
        new_lines.append(f'{next_indent}>\n')
        skip = 1
        continue
    
    # Fix the misplaced code in the item click
    if 'setInventoryDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });' in line:
        # The line before should be rect calculation, the line before that should be onClick
        # We want to remove the rect stuff and keep the onClick but standard
        # However, the previous line is 'onClick={(e) => {'
        # We'll just skip the next 2 lines and fix the onClick
        # Wait, the current line is the rect one.
        # So i is the rect line. i-1 is the onClick line. i+1 is 'const mats'.
        # We've already added i-1. So we need to RE-WRITE i-1 and skip i and i+1?
        # No, let's just detect the onClick specifically.
        pass

    if 'onClick={(e) => {' in line and 'setInventoryDropdownPos' in lines[i+2]:
        indent = line[:line.find('onClick')]
        new_lines.append(f'{indent}onClick={() => {{\n')
        skip = 2
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated AddOrder.jsx")
