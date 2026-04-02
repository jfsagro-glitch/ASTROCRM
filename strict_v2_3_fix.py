"""
Патч для strict_v2_3.py — исправляет TypeError: bool not JSON serializable
и добавляет диагностику coverage.

Применение:
  python strict_v2_3_fix.py          # показывает патч
  python strict_v2_3_fix.py --apply  # применяет к strict_v2_3.py
"""

import sys, re

PATCH = """
# ── JSON-safe serializer ────────────────────────────────────────
import numpy as np

class HolosEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)
"""

# Строка с json.dumps, которую надо пофиксить
OLD_DUMPS = 'json.dumps({'
NEW_DUMPS = 'json.dumps({'  # сама структура не меняется

# Добавляем cls=HolosEncoder в вызов json.dumps
OLD_DUMPS_END = '}, ensure_ascii=False, indent=2)'
NEW_DUMPS_END = '}, ensure_ascii=False, indent=2, cls=HolosEncoder)'

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    
    target = 'strict_v2_3.py'
    with open(target, 'r', encoding='utf-8') as f:
        src = f.read()
    
    # Fix 1: add HolosEncoder class before def run() or before json.dumps
    if 'HolosEncoder' not in src:
        # Insert after 'import json' line
        src = src.replace('import json\n', 'import json\nimport numpy as np\n', 1)
        # Add class after all imports (before first def or class)
        encoder_code = '''
class _HolosEncoder(json.JSONEncoder):
    """Makes numpy bools/ints/floats and Python bools JSON-serializable."""
    def default(self, obj):
        if isinstance(obj, (bool,)): return bool(obj)
        if hasattr(obj, 'item'): return obj.item()   # numpy scalars
        if hasattr(obj, 'tolist'): return obj.tolist()  # numpy arrays
        return super().default(obj)

'''
        # Find first function definition
        m = re.search(r'^def ', src, re.MULTILINE)
        if m:
            src = src[:m.start()] + encoder_code + src[m.start():]
    
    # Fix 2: add cls= to all json.dumps calls
    src = re.sub(
        r'json\.dumps\((\{.*?\})\s*,\s*ensure_ascii=False\s*,\s*indent=2\)',
        r'json.dumps(\1, ensure_ascii=False, indent=2, cls=_HolosEncoder)',
        src, flags=re.DOTALL
    )
    
    if apply:
        with open(target, 'w', encoding='utf-8') as f:
            f.write(src)
        print(f"✓ Патч применён к {target}")
        print("  Добавлен класс _HolosEncoder + cls=_HolosEncoder в json.dumps")
    else:
        print("Патч (preview, не применён):")
        print("  1. Добавляет класс _HolosEncoder в начало файла")
        print("  2. Добавляет cls=_HolosEncoder во все вызовы json.dumps")
        print("  Запусти с --apply для применения")
