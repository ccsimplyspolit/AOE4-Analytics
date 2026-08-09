"""Project decoded AOEMods.Essence RGD JSON into a small audited index.

The Essence CLI owns the binary decode.  This script only reads the resulting
JSON tree and keeps the fields useful to the analytics UI (unit/building
identity, health, costs, movement, armour and weapon references).  The raw
RGD tree stays outside the renderer bundle; the projection is deterministic,
bounded and explicitly marked as an optional local snapshot.

Examples:
    python scripts/project_essence_rgd.py \
        --input data/research/essence/rgd \
        --source-revision local-steam-2026-08-09-rgd
    python scripts/project_essence_rgd.py --input C:/decoded-rgd --dry-run
"""

from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "research" / "essence" / "rgd-projection.json"
ESSENCE_URL = "https://github.com/aoemods/AOEMods.Essence"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Decoded Essence RGD directory or one JSON file")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Projection JSON path")
    parser.add_argument("--source-revision", default=None, help="Essence/game snapshot revision")
    parser.add_argument("--max-files", type=int, default=100_000, help="Safety limit for one projection")
    parser.add_argument("--max-nodes", type=int, default=5_000_000, help="Safety limit for decoded nodes")
    parser.add_argument("--max-records", type=int, default=20_000, help="Safety limit for projected entities")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print counts without writing")
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def iter_json_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root] if root.suffix.lower() == ".json" else []
    return sorted(path for path in root.rglob("*.json") if path.is_file() and not path.is_symlink())


def relative_name(path: Path, root: Path) -> str:
    if root.is_file():
        return path.name
    return path.relative_to(root).as_posix()


def scalar(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def load_essence_json(path: Path) -> Any:
    """Read Essence JSON, accepting the CLI's culture-formatted decimals.

    AOEMods.Essence 0.6 serializes non-integer numeric values with the host
    culture.  On a Russian Windows locale that produces ``1,5`` instead of
    valid JSON ``1.5``.  We repair only numeric values immediately following a
    JSON ``value`` key; commas in strings and arrays remain untouched.
    """

    text = path.read_text(encoding="utf-8-sig")
    try:
        return json.loads(text)
    except json.JSONDecodeError as first_error:
        repaired = re.sub(
            r'("value"\s*:\s*)(-?\d+),(\d+)(?=\s*[,}])',
            r"\g<1>\g<2>.\g<3>",
            text,
        )
        if repaired == text:
            raise first_error
        return json.loads(repaired)


def walk_nodes(value: Any, path: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], Any]]:
    """Yield scalar RGD leaves from the Essence `{key,value}` shape."""

    if isinstance(value, dict):
        if set(value) >= {"key", "value"} and isinstance(value.get("key"), str):
            yield from walk_nodes(value.get("value"), (*path, value["key"]))
            return
        for key, child in value.items():
            yield from walk_nodes(child, (*path, str(key)))
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_nodes(child, (*path, str(index)))
        return
    if scalar(value):
        yield path, value


def normalise_path(path: str) -> str:
    return re.sub(r"[\\/]+", "/", path).strip("/").lower()


def as_number(value: Any) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(float(value)):
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def first_value(leaves: list[tuple[tuple[str, ...], Any]], key: str, *contains: str) -> Any:
    candidates = [item for item in leaves if item[0] and item[0][-1].lower() == key.lower()]
    if contains:
        candidates = [item for item in candidates if all(token.lower() in "/".join(item[0]).lower() for token in contains)]
    return candidates[0][1] if candidates else None


def values_for_key(leaves: list[tuple[tuple[str, ...], Any]], key: str, *contains: str) -> list[Any]:
    result: list[Any] = []
    for path, value in leaves:
        if not path or path[-1].lower() != key.lower():
            continue
        path_text = "/".join(path).lower()
        if contains and not all(token.lower() in path_text for token in contains):
            continue
        if scalar(value) and value not in result:
            result.append(value)
    return result


def classify(path: str) -> str | None:
    value = normalise_path(path)
    if "/ebps/" not in f"/{value}/" and "/sbps/" not in f"/{value}/":
        return None
    if "/units/" in f"/{value}/":
        return "unit"
    if "/buildings/" in f"/{value}/":
        return "building"
    if "/weapons/" in f"/{value}/":
        return "weapon"
    return None


def project_record(path: Path, relative: str, max_nodes: int) -> tuple[dict[str, Any] | None, int, str | None]:
    try:
        document = load_essence_json(path)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        return None, 0, f"{type(error).__name__}"
    leaves = list(walk_nodes(document))
    if len(leaves) > max_nodes:
        return None, len(leaves), "node-limit"
    kind = classify(relative)
    if kind is None:
        return None, len(leaves), None

    normal = normalise_path(relative)
    record: dict[str, Any] = {
        "path": relative,
        "kind": kind,
        "pbgName": first_value(leaves, "$PBGNAME"),
        "parentPbg": first_value(leaves, "$PBGNAME", "parent_pbg"),
        "nodeCount": len(leaves),
    }
    if not record["pbgName"]:
        record["pbgName"] = path.stem

    hitpoints = as_number(first_value(leaves, "hitpoints"))
    speed = as_number(first_value(leaves, "max_speed"))
    class_code = first_value(leaves, "class_code")
    if hitpoints is not None:
        record["hitpoints"] = hitpoints
    if speed is not None:
        record["maxSpeed"] = speed
    if class_code not in (None, ""):
        record["classCode"] = class_code

    costs: dict[str, int | float] = {}
    for resource in ("food", "wood", "gold", "stone", "action", "popcap"):
        value = as_number(first_value(leaves, resource, "cost_ext", "cost"))
        if value is not None:
            costs[resource] = value
    train_time = as_number(first_value(leaves, "time_seconds", "cost_ext"))
    if costs:
        record["costs"] = costs
    if train_time is not None:
        record["timeSeconds"] = train_time

    armour = as_number(first_value(leaves, "armor", "armor_layout_option"))
    if armour is not None:
        record["armor"] = armour

    weapon_refs: list[str] = []
    for path_parts, value in leaves:
        if not isinstance(value, str) or "weapon" not in "/".join(path_parts).lower():
            continue
        if path_parts and path_parts[-1].lower().endswith("_pbg") and value and value not in weapon_refs:
            weapon_refs.append(value)
    if weapon_refs:
        record["weaponRefs"] = weapon_refs[:32]

    # Keep only entity files that carry identity or a useful scalar.  This
    # avoids bundling empty/debug blueprints while retaining all unit records.
    useful = any(key in record for key in ("hitpoints", "costs", "timeSeconds", "weaponRefs", "classCode"))
    if not useful and kind not in {"unit", "building"}:
        return None, len(leaves), None
    record["path"] = normal
    return record, len(leaves), None


def build_projection(input_root: Path, files: list[Path], source_revision: str | None, max_nodes: int, max_records: int) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    total_nodes = 0
    for path in files:
        record, nodes, error = project_record(path, relative_name(path, input_root), max_nodes)
        total_nodes += nodes
        if error:
            errors.append({"path": relative_name(path, input_root), "error": error})
        if record is not None:
            records.append(record)
            if len(records) > max_records:
                raise ValueError(f"projection contains more than {max_records} entity records")

    by_kind = {kind: sum(1 for row in records if row["kind"] == kind) for kind in ("unit", "building", "weapon")}
    return {
        "schemaVersion": 1,
        "source": "AOEMods.Essence RGD projection",
        "sourceUrl": ESSENCE_URL,
        "sourceRevision": source_revision,
        "capturedAt": now(),
        "status": "ready" if records else "empty",
        "inputName": input_root.name,
        "counts": {
            "jsonFiles": len(files),
            "nodes": total_nodes,
            "records": len(records),
            **by_kind,
            "errors": len(errors),
        },
        "policy": "optional-local-audit; AoE4World remains the primary runtime game-data source",
        "records": records,
        "errors": errors[:100],
    }


def main() -> int:
    args = parse_args()
    if min(args.max_files, args.max_nodes, args.max_records) < 1:
        raise SystemExit("limits must be positive")
    input_root = args.input.expanduser().resolve()
    if not input_root.exists():
        raise SystemExit(f"input does not exist: {input_root}")
    files = iter_json_files(input_root)
    if len(files) > args.max_files:
        raise SystemExit(f"input contains {len(files)} JSON files; safety limit is {args.max_files}")
    projection = build_projection(input_root, files, args.source_revision, args.max_nodes, args.max_records)
    print(f"[essence-projection] {projection['counts']['records']} records from {projection['counts']['jsonFiles']} JSON files")
    if args.dry_run:
        print("[essence-projection] dry-run: no projection written")
        return 0
    output = args.output.expanduser()
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(projection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[essence-projection] projection: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
