from pathlib import Path
import re

settings = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\renderer\main\screens\Settings.tsx").read_text(encoding="utf-8")
i18n = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\renderer\i18n.tsx").read_text(encoding="utf-8")
block = re.search(r"const HOTKEY_ROWS[\s\S]*?\]\n", settings).group(0)
labels = re.findall(r"label: '([^']+)'", block)
for lab in labels:
    print(("OK " if lab in i18n else "MISS"), lab)
