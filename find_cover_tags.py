import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('build_enhanced_pdf.py', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if "trang b" in line.lower() or "bìa" in line.lower() or "sgu_logo" in line.lower():
            print(f"{idx+1}: {line.strip()}")
