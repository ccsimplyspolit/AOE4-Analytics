from pathlib import Path
import re

settings = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\renderer\main\screens\Settings.tsx").read_text(encoding="utf-8")
i18n = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\renderer\i18n.tsx").read_text(encoding="utf-8")
# crude: tt('...') in Settings around hotkey UI
keys = re.findall(r"tt\(\s*'([^']+)'", settings)
needles = [
    "hotkey",
    "Hotkey",
    "shortcut",
    "binding",
    "Esc",
    "Reset all",
    "Reset to",
    "Press a",
    "Already used",
    "Edit overlay",
    "Overlay hotkeys",
]
for k in keys:
    if any(n.lower() in k.lower() for n in needles):
        present = k in i18n
        print(("OK " if present else "MISS"), repr(k))
