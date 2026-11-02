import sys, pypdf
sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader("BaoCao_BrewLite.pdf")

for i in range(4, len(reader.pages)):
    print(f"=== Page {i+1} ===")
    t = reader.pages[i].extract_text()
    for line in t.splitlines():
        line = line.strip()
        if any(line.startswith(p) for p in ["1 ", "1.", "2 ", "2.", "Hình ", "BẢNG", "User Story", "Tiêu chí"]):
            print("  ", line)
