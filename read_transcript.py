import json

with open(r'C:\Users\91960\.gemini\antigravity-ide\brain\9af986f1-4a70-44f4-9080-fc0e115792b0\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f, open(r'C:\Users\91960\.gemini\antigravity-ide\scratch\Property-Ledge\transcript_output.txt', 'w', encoding='utf-8') as out:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            out.write(f"Step {data.get('step_index')}: {data.get('content')}\n")
