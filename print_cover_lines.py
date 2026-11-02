import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('build_enhanced_pdf.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx in range(280, 420):
    if idx < len(lines):
        print(f"{idx+1}: {lines[idx]}", end="")
