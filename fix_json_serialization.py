#!/usr/bin/env python3
"""
Минимальный inline-фикс JSON bool serialization для strict_v2_3.py
Применить: python fix_json_serialization.py
"""
import re, sys, os

target = sys.argv[1] if len(sys.argv) > 1 else 'strict_v2_3.py'

if not os.path.exists(target):
    print(f"Файл не найден: {target}")
    sys.exit(1)

with open(target, 'r', encoding='utf-8') as f:
    src = f.read()

changes = 0

# Fix 1: convert bool fields before serialization
# Find the block that builds the result dict and adds 'strong' key
# The 'strong' field is numpy bool_ → convert to Python bool

# Pattern: 'strong': some_bool_expr → 'strong': bool(some_bool_expr)
new_src = re.sub(
    r"(['\"]strong['\"])\s*:\s*(?!bool\()([^,\n}]+)",
    lambda m: f"{m.group(1)}: bool({m.group(2).strip()})",
    src
)
if new_src != src:
    changes += 1
    src = new_src
    print("✓ Fix 1: 'strong' field → bool()")

# Fix 2: Add JSON encoder class
encoder = '''

class _JsonEncoder(json.JSONEncoder):
    """Handles numpy types and Python bool in JSON serialization."""
    def default(self, obj):
        try:
            import numpy as np
            if isinstance(obj, np.bool_): return bool(obj)
            if isinstance(obj, np.integer): return int(obj)
            if isinstance(obj, np.floating): return float(obj)
            if isinstance(obj, np.ndarray): return obj.tolist()
        except ImportError:
            pass
        if isinstance(obj, bool): return bool(obj)
        return super().default(obj)

'''

if '_JsonEncoder' not in src:
    # Insert after last import block
    import_end = 0
    for line in src.split('\n'):
        if line.startswith('import ') or line.startswith('from '):
            import_end = src.find(line) + len(line)
    src = src[:import_end] + '\n' + encoder + src[import_end:]
    changes += 1
    print("✓ Fix 2: добавлен _JsonEncoder класс")

# Fix 3: use _JsonEncoder in json.dumps
old_dumps = r'json\.dumps\((.*?),\s*ensure_ascii=False,\s*indent=2\)'
new_dumps_repl = lambda m: f"json.dumps({m.group(1)}, ensure_ascii=False, indent=2, cls=_JsonEncoder)"
new_src = re.sub(old_dumps, new_dumps_repl, src, flags=re.DOTALL)
if new_src != src:
    changes += 1
    src = new_src
    print("✓ Fix 3: json.dumps → cls=_JsonEncoder")

with open(target, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\n{'✓' if changes > 0 else '—'} {changes} изменений применено к {target}")
print("Запусти strict_v2_3.py снова.")
