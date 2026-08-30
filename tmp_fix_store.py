from pathlib import Path
import re

store = Path(r"K:\aoe4_dlc\AOE4-Analytics\src\store\settings.ts")
domain = next(Path(r"K:\aoe4_dlc\AOE4-Analytics\src\domain").glob("hotkey*.ts"))
text = store.read_text(encoding="utf-8")
export_name = re.search(r"export function (normalize\w+)", domain.read_text(encoding="utf-8")).group(1)
text2 = re.sub(r"from '\.\./domain/hotkey[^']+'", f"from '../domain/{domain.stem}'", text)
text2 = re.sub(r"import \{ \w+ \} from '../domain/" + domain.stem + r"'", f"import {{ {export_name} }} from '../domain/{domain.stem}'", text2)
text2 = re.sub(r"return \w+\(v\)", f"return {export_name}(v)", text2)
store.write_text(text2, encoding="utf-8")
print("file", domain.name, "export", export_name)
print([line for line in text2.splitlines() if "hotkey" in line.lower()][:4])
print([line for line in text2.splitlines() if "sanitizeHotkey" in line or "return " in line and "Accelerator" in line][:6])
