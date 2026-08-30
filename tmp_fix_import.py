from pathlib import Path
import re

settings = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\renderer\main\screens\Settings.tsx")
domain = next(Path(r"K:\aoe4_dlc\AOE4-Analytics\src\domain").glob("hotkey*.ts"))
text = settings.read_text(encoding="utf-8")
text2, n = re.subn(r"from '@domain/hotkey[^']+'", f"from '@domain/{domain.stem}'", text)
settings.write_text(text2, encoding="utf-8")
print("domain file", domain.name, "replacements", n)
for line in text2.splitlines():
    if "hotkey" in line.lower() and ("import" in line or "from" in line):
        print(line)
