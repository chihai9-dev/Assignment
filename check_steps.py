import sys, json
sys.stdout.reconfigure(encoding='utf-8')

transcript_path = r'C:\Users\Admin\.gemini\antigravity\brain\b55c061b-664d-41ee-981f-88f0aa227d97\.system_generated\logs\transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for idx, l in enumerate(f):
        if idx + 1 in [1637, 1641, 1654, 1677, 1701, 1705, 1709, 1729]:
            d = json.loads(l)
            print(f"=== Step {idx+1} ===")
            if d.get('thinking'):
                print("Thinking:", d['thinking'][:200])
            for tc in d.get('tool_calls', []):
                print("Tool call:", tc.get('name'), tc.get('args', {}).get('Path', ''))
                if 'Content' in tc.get('args', {}):
                    print("Content preview:\n", tc['args']['Content'][:500])
