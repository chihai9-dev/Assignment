import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('build_enhanced_pdf.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_cover = False
for idx, line in enumerate(lines):
    if "1. TRANG BIA" in line:
        in_cover = True
    if in_cover:
        print(f"{idx+1}: {line}", end="")
        if "2. MỤC LỤC" in line:
            break
