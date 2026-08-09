"""Inventory an offline AoE4 attribute snapshot without executing game parsers.

The attrib repository and AOEMods.Essence can provide patch-specific decoded
JSON/XML and binary game assets. This tool records a deterministic manifest for
those files so a later audited projection can be reviewed before it is bundled
into the app. It intentionally does not parse or execute .sga/.rgd/.rrtex or
.rrgeom content inside Electron.

Examples:
    python scripts/import_attrib_snapshot.py --input C:/src/attrib --dry-run
    python scripts/import_attrib_snapshot.py --input C:/src/attrib \
        --output data/research/attrib/snapshot.json --source-revision abc123
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "research" / "attrib" / "snapshot.json"
ATTRIB_URL = "https://github.com/aoemods/attrib"
ESSENCE_URL = "https://github.com/aoemods/AOEMods.Essence"
DECODED_EXTENSIONS = {".json", ".xml"}
BINARY_EXTENSIONS = {".sga", ".rgd", ".rrtex", ".rrgeom"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Decoded attrib tree or extracted game-data directory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Snapshot manifest path")
    parser.add_argument("--source-revision", default=None, help="Optional attrib/AOEMods.Essence commit or release")
    parser.add_argument("--max-files", type=int, default=100_000, help="Safety limit for one import")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and print counts without writing the manifest")
    return parser.parse_args()


def iter_files(root: Path) -> Iterable[Path]:
    if root.is_file():
        yield root
        return
    for path in sorted(root.rglob("*")):
        if path.is_file() and not path.is_symlink():
            yield path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_record_count(value: Any) -> int | None:
    if isinstance(value, list):
        return len(value)
    if not isinstance(value, dict):
        return None
    for key in ("data", "records", "units", "buildings", "technologies", "upgrades"):
        candidate = value.get(key)
        if isinstance(candidate, list):
            return len(candidate)
    return None


def decoded_metadata(path: Path) -> tuple[bool, int | None, str | None]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        try:
            value = json.loads(path.read_text(encoding="utf-8-sig"))
            return True, json_record_count(value), None
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            return False, None, f"json:{type(error).__name__}"
    if suffix == ".xml":
        try:
            # Counting tags is deliberately shallow metadata, not an attribute
            # decode. It avoids invoking a third-party archive/parser runtime.
            text = path.read_text(encoding="utf-8-sig")
            return True, text.count("<") - text.count("</") - text.count("<?"), None
        except (OSError, UnicodeError) as error:
            return False, None, f"xml:{type(error).__name__}"
    return False, None, None


def relative_name(path: Path, root: Path) -> str:
    if root.is_file():
        return path.name
    return path.relative_to(root).as_posix()


def build_manifest(input_root: Path, files: list[Path], source_revision: str | None) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    decoded_files = 0
    binary_files = 0
    decoded_records = 0
    for path in files:
        suffix = path.suffix.lower()
        decoded, record_count, decode_error = decoded_metadata(path)
        if decoded:
            decoded_files += 1
            decoded_records += record_count or 0
        if suffix in BINARY_EXTENSIONS:
            binary_files += 1
        row: dict[str, Any] = {
            "path": relative_name(path, input_root),
            "extension": suffix or "<none>",
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "format": "decoded" if decoded else ("binary-source" if suffix in BINARY_EXTENSIONS else "other"),
            "recordCount": record_count,
        }
        if decode_error:
            row["decodeError"] = decode_error
        rows.append(row)

    captured_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return {
        "schemaVersion": 1,
        "sourceId": "attrib",
        "sourceUrl": ATTRIB_URL,
        "sourceRevision": source_revision,
        "patch": None,
        "source": {
            "repository": "aoemods/attrib",
            "url": ATTRIB_URL,
            "revision": source_revision,
        },
        "extractor": {
            "repository": "aoemods/AOEMods.Essence",
            "url": ESSENCE_URL,
            "policy": "external-audited-extractor; this manifest step never executes archive parsers",
        },
        "capturedAt": captured_at,
        "inputName": input_root.name,
        "counts": {
            "files": len(rows),
            "decodedFiles": decoded_files,
            "binaryFiles": binary_files,
            "decodedRecords": decoded_records,
        },
        "files": rows,
    }


def main() -> int:
    args = parse_args()
    input_root = args.input.expanduser().resolve()
    if not input_root.exists():
        raise SystemExit(f"input does not exist: {input_root}")
    if args.max_files < 1:
        raise SystemExit("--max-files must be positive")

    files = list(iter_files(input_root))
    if len(files) > args.max_files:
        raise SystemExit(f"input contains {len(files)} files; safety limit is {args.max_files}")

    manifest = build_manifest(input_root, files, args.source_revision)
    counts = manifest["counts"]
    print(
        f"[attrib] {counts['files']} files, {counts['decodedFiles']} decoded, "
        f"{counts['binaryFiles']} binary game assets, {counts['decodedRecords']} decoded records"
    )
    if args.dry_run:
        print("[attrib] dry-run: no manifest written")
        return 0

    output = args.output.expanduser()
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[attrib] manifest: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
