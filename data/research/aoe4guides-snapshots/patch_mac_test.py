import json
import re
from pathlib import Path

root = Path("src/data/activeBuildOrders")
beasty = json.loads((root / "macedonian-beasty.json").read_text(encoding="utf-8"))
vortix = json.loads((root / "1x1-open-mac-vortix-feudal-varangian-guard-rush.json").read_text(encoding="utf-8"))
hippo = json.loads((root / "1x1-open-mac-tempo-valdemar-hippodrome-2026-HuzXbYxxy3LMgjhXA9n0.json").read_text(encoding="utf-8"))
winery = json.loads((root / "1x1-open-mac-pressure-valdemar-feudal-winery-Z272XddhRKJ9qxjZCGpw.json").read_text(encoding="utf-8"))


def js(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


new = f"""it('bundles timed Season 13 Macedonian Beasty, VortiX VG, and Valdemar openers', () => {{
    const beasty = BUNDLED_BUILD_ORDERS.find((build) => build.name === 'Macedonian Standard (Beasty)')
    const vortix = BUNDLED_BUILD_ORDERS.find((build) =>
      /VortiX Feudal Varangian Guard/i.test(build.name),
    )
    const hippo = BUNDLED_BUILD_ORDERS.find((build) => /Valdemar: Hippodrome 2026/i.test(build.name))
    const winery = BUNDLED_BUILD_ORDERS.find((build) => /Valdemar: Feudal Winery/i.test(build.name))
    expect(beasty?.providerId).toBe({js(beasty["providerId"])})
    expect(beasty?.build_order.length).toBeGreaterThan(15)
    expect(beasty?.video).toBe({js(beasty["video"])})
    expect(vortix?.providerId).toBe({js(vortix["providerId"])})
    expect(vortix?.video).toContain({js(vortix["video"].rsplit("v=", 1)[-1])})
    expect(hippo?.providerId).toBe({js(hippo["providerId"])})
    expect(hippo?.video).toContain({js(hippo["video"].rsplit("v=", 1)[-1])})
    expect(winery?.providerId).toBe({js(winery["providerId"])})
    expect(winery?.video).toContain({js(winery["video"].rsplit("v=", 1)[-1])})
    expect(hippo?.build_order.length).toBeGreaterThan(8)
    expect(winery?.build_order.length).toBeGreaterThan(7)
  }})
}})
"""

test = Path("src/data/__tests__/buildOrders.test.ts")
text = test.read_text(encoding="utf-8")
updated, n = re.subn(
    r"it\('bundles timed Season 13 Macedonian[\s\S]*?\)\n\}\)\n",
    new,
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"replace count {n}")
test.write_text(updated, encoding="utf-8")
print("patched test with", beasty["providerId"], vortix["providerId"], hippo["providerId"], winery["providerId"])
