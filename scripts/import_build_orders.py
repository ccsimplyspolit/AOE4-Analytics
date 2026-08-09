"""Import every AoE4 build-order JSON from an inbox into the Tincture catalog.

The importer is intentionally source-agnostic: AoE4 guides do not share one
stable public API, so providers/exporters can drop JSON into an inbox without
making the renderer depend on a scraper. Only normalized, schema-valid files
are copied into ``src/data/buildOrders/imported``; duplicates are skipped by a
content fingerprint.

Examples:
    python scripts/import_build_orders.py --source-dir data/research/build-orders/inbox --dry-run
    python scripts/import_build_orders.py --source-dir C:\\exports\\aoe4 --origin imported --patch 15.2
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "src" / "data" / "buildOrders" / "imported"


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower().replace("'", ""))
    return value.strip("-") or "build"


def as_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def extract_builds(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        if "build_order" in value:
            yield value
            return
        for key in ("builds", "buildOrders", "data", "results"):
            nested = value.get(key)
            if isinstance(nested, list):
                for item in nested:
                    yield from extract_builds(item)
    elif isinstance(value, list):
        for item in value:
            yield from extract_builds(item)


def validate_build(build: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(build.get("name"), str) or not build["name"].strip():
        errors.append("name")
    civ = build.get("civilization")
    if not isinstance(civ, str) and not (
        isinstance(civ, list) and civ and all(isinstance(item, str) and item.strip() for item in civ)
    ):
        errors.append("civilization")
    steps = build.get("build_order")
    if not isinstance(steps, list) or not steps:
        errors.append("build_order")
        return errors
    for index, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append(f"build_order[{index}]")
            continue
        for key in ("population_count", "villager_count", "age"):
            if not as_number(step.get(key)):
                errors.append(f"build_order[{index}].{key}")
        if not isinstance(step.get("notes"), list) or not all(isinstance(note, str) for note in step["notes"]):
            errors.append(f"build_order[{index}].notes")
        resources = step.get("resources")
        if not isinstance(resources, dict):
            errors.append(f"build_order[{index}].resources")
        else:
            for key in ("food", "wood", "gold", "stone"):
                if not as_number(resources.get(key)):
                    errors.append(f"build_order[{index}].resources.{key}")
    return errors


def fingerprint(build: dict[str, Any]) -> str:
    payload = {
        "civilization": build.get("civilization"),
        "build_order": build.get("build_order"),
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def read_existing(output_dir: Path) -> set[str]:
    fingerprints: set[str] = set()
    if not output_dir.exists():
        return fingerprints
    for path in output_dir.glob("*.json"):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for build in extract_builds(value):
            fingerprints.add(fingerprint(build))
    return fingerprints


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True, help="Directory containing source JSON exports")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT, help="Imported catalog directory")
    parser.add_argument("--origin", choices=("imported", "curated", "house", "video"), default="imported")
    parser.add_argument("--patch", default=None, help="Patch label attached to imported builds")
    parser.add_argument("--updated-at", default=None, help="ISO timestamp; defaults to current UTC time")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without copying files")
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    if not source_dir.is_dir():
        print(f"source directory does not exist: {source_dir}", file=sys.stderr)
        return 2

    updated_at = args.updated_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    seen = read_existing(output_dir)
    imported = skipped = invalid = 0
    output_dir.mkdir(parents=True, exist_ok=True) if not args.dry_run else None

    for path in sorted(source_dir.rglob("*.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            invalid += 1
            print(f"[invalid] {path}: {error}")
            continue

        for raw in extract_builds(document):
            errors = validate_build(raw)
            if errors:
                invalid += 1
                print(f"[invalid] {path}: {', '.join(errors[:5])}")
                continue
            key = fingerprint(raw)
            if key in seen:
                skipped += 1
                continue
            seen.add(key)

            build = dict(raw)
            build["schemaVersion"] = 1
            build["origin"] = args.origin
            build["capturedAt"] = updated_at
            if args.patch:
                build["patch"] = args.patch
            build["updatedAt"] = updated_at
            output_path = output_dir / f"{slug(str(build['name']))}-{key[:10]}.json"
            if not args.dry_run:
                output_path.write_text(json.dumps(build, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            imported += 1
            print(f"[import] {path.name} -> {output_path.name}")

    action = "would import" if args.dry_run else "imported"
    print(f"Done: {action} {imported}, skipped duplicates {skipped}, invalid {invalid}.")
    return 1 if invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
