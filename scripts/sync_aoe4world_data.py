"""Refresh the slim AoE4World data snapshot used by RTSLytics.

The upstream repository is the same source consumed by the War Room generator,
but shipping the complete 3–4 MB unified files in the Electron bundle is
unnecessary.  This script keeps a local raw copy for patch research and emits
compact projections consumed by ``src/data/gameData.ts`` and
``src/data/explorerData.ts``.

Examples:
    python scripts/sync_aoe4world_data.py --dry-run
    python scripts/sync_aoe4world_data.py
    python scripts/sync_aoe4world_data.py --raw-dir data/research/aoe4world-data
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RAW = ROOT / "data" / "research" / "aoe4world-data"
DEFAULT_OUT = ROOT / "src" / "data" / "vendor" / "aoe4world-data"
REPO = "aoe4world/data"
BRANCH = "main"
SOURCE_URL = "https://github.com/aoe4world/data"
USER_AGENT = "RTSLytics/0.5 (+aoe4world-data-sync)"
FILES = {
    "units": "units/all-unified.json",
    "buildings": "buildings/all-unified.json",
    "technologies": "technologies/all-unified.json",
    "upgrades": "upgrades/all-unified.json",
    "civilizations": "civilizations/civs-index.json",
}


def fetch_json(url: str) -> object:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def number(value: object, fallback: float = 0) -> float:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else fallback


def pick_variation(unit: dict[str, object]) -> dict[str, object]:
    variations = unit.get("variations")
    if not isinstance(variations, list):
        return {}
    for variation in variations:
        if isinstance(variation, dict):
            weapons = variation.get("weapons")
            if isinstance(weapons, list) and any(
                isinstance(weapon, dict) and weapon.get("type") != "fire" for weapon in weapons
            ):
                return variation
    return next((variation for variation in variations if isinstance(variation, dict)), {})


def compact_costs(variation: dict[str, object]) -> dict[str, object]:
    raw = variation.get("costs")
    costs = raw if isinstance(raw, dict) else {}
    return {
        "food": number(costs.get("food")),
        "wood": number(costs.get("wood")),
        "gold": number(costs.get("gold")),
        "stone": number(costs.get("stone")),
        "total": number(costs.get("total")),
        "popcap": number(costs.get("popcap")),
        "time": number(costs.get("time")),
    }


def compact_attack(variation: dict[str, object]) -> dict[str, object] | None:
    weapons = variation.get("weapons")
    if not isinstance(weapons, list):
        return None
    candidates = [
        weapon
        for weapon in weapons
        if isinstance(weapon, dict) and weapon.get("type") != "fire"
    ]
    if not candidates:
        return None
    weapon = max(candidates, key=lambda item: number(item.get("damage")))
    return {"type": str(weapon.get("type") or "melee"), "damage": number(weapon.get("damage"))}


def compact_weapons(variation: dict[str, object]) -> list[dict[str, object]]:
    """Keep the static weapon facts needed by the explainable matchup model.

    The full AoE4World variation contains engine-specific fields that are not
    useful to the renderer.  Retaining target-class bonus groups, damage,
    cadence and range is enough to explain why a counter is preferred without
    pretending to be a frame-accurate combat simulator.
    """
    raw_weapons = variation.get("weapons")
    if not isinstance(raw_weapons, list):
        return []
    output: list[dict[str, object]] = []
    for raw in raw_weapons:
        if not isinstance(raw, dict) or raw.get("type") == "fire":
            continue
        modifiers: list[dict[str, object]] = []
        raw_modifiers = raw.get("modifiers")
        if isinstance(raw_modifiers, list):
            for modifier in raw_modifiers:
                if not isinstance(modifier, dict):
                    continue
                target = modifier.get("target")
                raw_groups = target.get("class") if isinstance(target, dict) else None
                if not isinstance(raw_groups, list):
                    continue
                groups: list[list[str]] = []
                for group in raw_groups:
                    if isinstance(group, list):
                        groups.append([str(token) for token in group])
                if groups:
                    modifiers.append({"value": number(modifier.get("value")), "groups": groups})
        raw_range = raw.get("range")
        range_max = number(raw_range.get("max")) if isinstance(raw_range, dict) else number(raw_range)
        output.append(
            {
                "name": str(raw.get("name") or "Weapon"),
                "type": str(raw.get("type") or "melee"),
                "damage": number(raw.get("damage")),
                "speed": max(0.5, number(raw.get("speed"), 1.0)),
                "range": range_max,
                "modifiers": modifiers,
            }
        )
    return output


def compact_armor(variation: dict[str, object]) -> dict[str, float]:
    armor = variation.get("armor")
    result = {"melee": 0.0, "ranged": 0.0}
    if isinstance(armor, list):
        for entry in armor:
            if isinstance(entry, dict) and entry.get("type") in result:
                result[str(entry["type"])] = number(entry.get("value"))
    return result


def project_units(document: object) -> list[dict[str, object]]:
    rows = document.get("data") if isinstance(document, dict) else None
    if not isinstance(rows, list):
        raise ValueError("units/all-unified.json does not contain data[]")
    output: list[dict[str, object]] = []
    for raw in rows:
        if not isinstance(raw, dict):
            continue
        classes = raw.get("classes") if isinstance(raw.get("classes"), list) else []
        if "military" not in classes:
            continue
        variation = pick_variation(raw)
        produced_by = variation.get("producedBy", raw.get("producedBy", []))
        if not isinstance(produced_by, list):
            produced_by = []
        civs = raw.get("civs") if isinstance(raw.get("civs"), list) else []
        display_classes = raw.get("displayClasses", variation.get("displayClasses", []))
        if not isinstance(display_classes, list):
            display_classes = []
        output.append(
            {
                "id": str(raw.get("id") or ""),
                "name": str(raw.get("name") or raw.get("id") or "Unknown"),
                "displayClasses": [str(value) for value in display_classes],
                "classes": [str(value) for value in classes],
                "minAge": int(number(raw.get("minAge"), number(variation.get("age"), 1))),
                "civs": [str(value) for value in civs],
                "unique": bool(raw.get("unique", False)),
                "icon": raw.get("icon") if isinstance(raw.get("icon"), str) else None,
                "hitpoints": number(variation.get("hitpoints"), 0) or None,
                "costs": compact_costs(variation),
                "attack": compact_attack(variation),
                "weapons": compact_weapons(variation),
                "movementSpeed": number(
                    (variation.get("movement") or {}).get("speed")
                    if isinstance(variation.get("movement"), dict)
                    else None
                )
                or None,
                "armor": compact_armor(variation),
                "producedBy": [str(value) for value in produced_by],
            }
        )
    return sorted(output, key=lambda unit: (int(unit["minAge"]), str(unit["name"])))


def project_explorer_records(documents: dict[str, object]) -> list[dict[str, object]]:
    """Flatten Explorer rows without shipping civ-specific variations."""
    output: list[dict[str, object]] = []
    for kind in ("buildings", "technologies", "upgrades"):
        record_kind = {"buildings": "building", "technologies": "technology", "upgrades": "upgrade"}[kind]
        document = documents[kind]
        rows = document.get("data") if isinstance(document, dict) else None
        if not isinstance(rows, list):
            raise ValueError(f"{kind}/all-unified.json does not contain data[]")
        for raw in rows:
            if not isinstance(raw, dict):
                continue
            variation = pick_variation(raw)
            classes = raw.get("classes") if isinstance(raw.get("classes"), list) else []
            display_classes = raw.get("displayClasses", variation.get("displayClasses", []))
            if not isinstance(display_classes, list):
                display_classes = []
            civs = raw.get("civs") if isinstance(raw.get("civs"), list) else []
            produced_by = variation.get("producedBy", raw.get("producedBy", []))
            if not isinstance(produced_by, list):
                produced_by = []
            raw_description = raw.get("description", variation.get("description", ""))
            raw_icon = variation.get("icon", raw.get("icon"))
            costs = variation.get("costs")
            output.append(
                {
                    "id": str(raw.get("id") or ""),
                    "name": str(raw.get("name") or raw.get("id") or "Unknown"),
                    "kind": record_kind,
                    "displayClasses": [str(value) for value in display_classes],
                    "classes": [str(value) for value in classes],
                    "minAge": int(number(raw.get("minAge"), number(variation.get("age"), 1))),
                    "civs": [str(value) for value in civs],
                    "unique": bool(raw.get("unique", False)),
                    "icon": raw_icon if isinstance(raw_icon, str) else None,
                    "description": str(raw_description) if raw_description else "",
                    "costs": compact_costs(variation) if isinstance(costs, dict) else None,
                    "producedBy": [str(value) for value in produced_by],
                    "hitpoints": number(variation.get("hitpoints"), 0) or None,
                }
            )
    return sorted(output, key=lambda row: (str(row["kind"]), int(row["minAge"]), str(row["name"])))


def commit_sha() -> str:
    """Resolve the branch SHA without consuming the GitHub REST API quota."""
    result = subprocess.run(
        ["git", "ls-remote", f"https://github.com/{REPO}.git", f"refs/heads/{BRANCH}"],
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or "git ls-remote failed"
        raise ValueError(detail)
    line = result.stdout.strip().splitlines()[0] if result.stdout.strip() else ""
    sha = line.split()[0] if line.split() else ""
    if len(sha) != 40 or any(character not in "0123456789abcdef" for character in sha.lower()):
        raise ValueError("GitHub did not return a valid commit SHA")
    return sha


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        sha = commit_sha()
        documents: dict[str, object] = {}
        for key, path in FILES.items():
            documents[key] = fetch_json(f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{path}")
    except (
        HTTPError,
        URLError,
        TimeoutError,
        subprocess.SubprocessError,
        OSError,
        json.JSONDecodeError,
        ValueError,
    ) as error:
        print(f"aoe4world/data sync failed: {error}", file=sys.stderr)
        return 1

    units = project_units(documents["units"])
    explorer_records = project_explorer_records(documents)
    print(f"source commit={sha}")
    print(f"military units={len(units)}")
    print(f"explorer records={len(explorer_records)}")
    print("raw files=" + ", ".join(f"{key}:{len(json.dumps(value))}B" for key, value in documents.items()))
    if args.dry_run:
        return 0

    raw_dir = args.raw_dir.resolve()
    output_dir = args.output_dir.resolve()
    raw_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    for key, document in documents.items():
        (raw_dir / f"{key}.json").write_text(
            json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    (output_dir / "units.json").write_text(
        json.dumps(units, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "explorer.json").write_text(
        json.dumps(explorer_records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    fetched_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    snapshot = {
        "schemaVersion": 1,
        "sourceId": "aoe4world-data",
        "sourceUrl": SOURCE_URL,
        "sourceRevision": sha,
        "patch": None,
        "capturedAt": fetched_at,
        "records": {
            "militaryUnits": len(units),
            "explorerRecords": len(explorer_records),
        },
    }
    (output_dir / "source-snapshot.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "SOURCE.md").write_text(
        f"# Vendored AoE4 game data\n\n"
        f"- **Source:** [aoe4world/data](https://github.com/aoe4world/data)\n"
        f"- **Pinned commit:** `{sha}`\n"
        f"- **Fetched:** {fetched_at}\n"
        f"- **Raw research copy:** `data/research/aoe4world-data/` (ignored)\n"
        f"- **Projection:** {len(units)} military units plus {len(explorer_records)} buildings, technologies and upgrades.\n\n"
        "The raw units/buildings/technologies/upgrades files are retained locally for patch research;\n"
        "the application bundles only compact projections.\n\n"
        "## License / attribution\n\n"
        "AoE4 data and assets remain subject to Microsoft's [Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules).\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
