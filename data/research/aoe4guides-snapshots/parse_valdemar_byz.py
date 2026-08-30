"""One-shot parser for Valdemar Byz aoe4guides snapshots."""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def icon_token(src: str) -> str | None:
    clean = src.replace("\\", "/").split("?")[0]
    clean = re.sub(r"\.(?:png|jpe?g|webp)$", "", clean, flags=re.I)
    match = re.search(
        r"(?:^|/)((?:unit|building|landmark|technology|upgrade|ability|resource)[^/]*)/([^/]+)$",
        clean,
        re.I,
    )
    if not match:
        return None
    cat = match.group(1).lower()
    if cat.startswith("unit"):
        catn = "units"
    elif cat.startswith("building") or cat.startswith("landmark"):
        catn = "buildings"
    elif cat.startswith("technology") or cat.startswith("upgrade"):
        catn = "technologies"
    elif cat.startswith("resource"):
        catn = "resource"
    else:
        catn = "abilities"
    return f"{catn}/{match.group(2)}"


def normalize_html(value: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1)
        src = re.search(r'src\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
        title = re.search(r'(?:title|alt)\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
        token = icon_token(src.group(1)) if src else None
        if token:
            return f" @{token}@ "
        if title:
            return f" {title.group(1)} "
        return " "

    with_tokens = re.sub(r"<img\b([^>]+)>", repl, value, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", with_tokens, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def num(value: object) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(float(str(value).replace("+", "")))
    except ValueError:
        return None


def parse(payload: dict) -> list[dict]:
    steps: list[dict] = []
    prev_age = 1
    prev_pop = 5
    for group in payload.get("steps") or []:
        group_age = num(group.get("age")) or prev_age
        age = min(4, group_age + 1) if group.get("type") == "ageUp" else group_age
        for step in group.get("steps") or []:
            note = normalize_html(step.get("description") or "")
            food = num(step.get("food")) or 0
            wood = num(step.get("wood")) or 0
            gold = num(step.get("gold")) or 0
            stone = num(step.get("stone")) or 0
            builders = num(step.get("builders"))
            vills = num(step.get("villagers"))
            assigned = food + wood + gold + stone
            villager_count = vills if vills is not None else assigned
            pop = max(prev_pop + 1, villager_count + (builders or 0))
            raw_time = step.get("time")
            derived = None
            time = None
            if isinstance(raw_time, str) and raw_time.strip():
                derived = "~" in raw_time or "≈" in raw_time
                time = re.sub(r"[~≈]", "", raw_time).replace(" ", "")
            if not note and not time and assigned == 0 and builders is None:
                continue
            rec = {
                "time": time,
                "age": age,
                "food": food,
                "wood": wood,
                "gold": gold,
                "stone": stone,
                "builder": builders,
                "villagers": villager_count,
                "pop": pop,
                "note": note or "Continue the current plan",
                "derived": derived,
            }
            steps.append(rec)
            prev_pop = pop
            prev_age = age
    return steps


def main() -> None:
    for path in sorted(ROOT.glob("*.json")):
        if path.name.startswith("parsed-"):
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        steps = parse(payload)
        out = {
            "id": payload.get("id"),
            "title": payload.get("title"),
            "ageTimings": payload.get("ageTimings"),
            "score": payload.get("score"),
            "views": payload.get("views"),
            "likes": payload.get("likes"),
            "timeCreated": payload.get("timeCreated"),
            "timeUpdated": payload.get("timeUpdated"),
            "description": payload.get("description"),
            "steps": steps,
        }
        dest = ROOT / f"parsed-{path.stem}.json"
        dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {dest.name} ({len(steps)} steps) ageTimings={payload.get('ageTimings')}")


if __name__ == "__main__":
    main()
