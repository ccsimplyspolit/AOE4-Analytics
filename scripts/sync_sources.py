"""Synchronise the external AoE4 data sources used by RTSLytics.

This is the single entry point for source refreshes. It deliberately delegates
provider-specific parsing to the existing scripts, so a failed provider cannot
silently turn into an empty catalog. Successful providers write their own
versioned/capturedAt artifacts and this script records a local run manifest.

Examples:
    python scripts/sync_sources.py --dry-run
    python scripts/sync_sources.py
    python scripts/sync_sources.py --skip-game-data --patch 15.2
    python scripts/sync_sources.py --civ FRE --civ ENG --guides-limit-per-query 10
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "research" / "aoe4-source-sync.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Fetch and validate without writing source artifacts")
    parser.add_argument("--patch", default=None, help="Explicit patch label for imported AoE4Guides builds")
    parser.add_argument("--civ", action="append", dest="civs", help="AoE4Guides civ code, repeatable; default is all civs")
    parser.add_argument("--guides-order", default="score,timeCreated,views,likes")
    parser.add_argument("--guides-limit-per-query", type=int, default=10)
    parser.add_argument("--guides-delay", type=float, default=0.25)
    parser.add_argument("--leaderboards", nargs="+", default=["rm_solo", "rm_2v2", "rm_3v3", "rm_4v4"])
    parser.add_argument("--rank-level", default=None)
    parser.add_argument("--skip-game-data", action="store_true", help="Do not refresh aoe4world/data game files")
    parser.add_argument("--skip-meta", action="store_true", help="Do not refresh AoE4World civilization meta snapshots")
    parser.add_argument("--skip-guides", action="store_true", help="Do not import AoE4Guides builds")
    parser.add_argument("--skip-icons", action="store_true", help="Do not rebuild the offline AoE4World icon catalogue")
    parser.add_argument(
        "--skip-upstream-audit",
        action="store_true",
        help="Do not resolve revisions for the referenced GitHub repositories",
    )
    parser.add_argument(
        "--attrib-input",
        type=Path,
        default=None,
        help="Optional decoded attrib/Essence directory or file to inventory",
    )
    parser.add_argument(
        "--attrib-revision",
        default=None,
        help="Optional attrib or AOEMods.Essence revision recorded in the audit",
    )
    parser.add_argument("--upstream-timeout", type=int, default=30)
    return parser.parse_args()


def run_step(label: str, script: str, arguments: list[str], dry_run: bool) -> None:
    command = [sys.executable, str(ROOT / "scripts" / script), *arguments]
    if dry_run:
        command.append("--dry-run")
    print(f"[sync] {label}: {' '.join(command)}", flush=True)
    result = subprocess.run(command, cwd=ROOT, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")


def run_node_step(label: str, script: str, arguments: list[str]) -> None:
    command = ["node", str(ROOT / "scripts" / script), *arguments]
    print(f"[sync] {label}: {' '.join(command)}", flush=True)
    result = subprocess.run(command, cwd=ROOT, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def read_document(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def build_arguments(args: argparse.Namespace) -> list[str]:
    result = ["--order", args.guides_order, "--limit-per-query", str(args.guides_limit_per_query), "--delay", str(args.guides_delay)]
    for civ in args.civs or []:
        result.extend(("--civ", civ))
    if args.patch:
        result.extend(("--patch", args.patch))
    return result


def write_manifest(args: argparse.Namespace, completed: list[str]) -> None:
    captured_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    meta = read_json(ROOT / "src" / "data" / "tinctureMeta.json")
    units = read_document(ROOT / "src" / "data" / "vendor" / "aoe4world-data" / "units.json")
    icons = read_json(ROOT / "src" / "data" / "vendor" / "aoe4-icons" / "metadata.json")
    upstream_audit = read_json(ROOT / "data" / "research" / "aoe4-upstream-revisions.json")
    imported_dir = ROOT / "src" / "data" / "buildOrders" / "imported"
    unit_rows = units.get("data", units) if isinstance(units, dict) else units
    manifest = {
        "schemaVersion": 2,
        "source": "aoe4guides+aoe4world+upstream-audit",
        "capturedAt": captured_at,
        "patch": args.patch or meta.get("patch"),
        "completed": completed,
        "counts": {
            "importedBuildFiles": len(list(imported_dir.glob("*.json"))) if imported_dir.exists() else 0,
            "militaryUnits": len(unit_rows) if isinstance(unit_rows, list) else 0,
            "metaSlices": len(meta.get("slices", [])) if isinstance(meta.get("slices"), list) else 0,
            "entityIcons": icons.get("uniqueEntityIcons", 0),
            "nativeIcons": icons.get("nativeAssetCount", 0),
        },
        "upstreamAudit": {
            "capturedAt": upstream_audit.get("capturedAt"),
            "status": upstream_audit.get("status"),
            "healthy": upstream_audit.get("healthy"),
            "total": upstream_audit.get("total"),
        },
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[sync] manifest: {MANIFEST_PATH}")


def main() -> int:
    args = parse_args()
    if args.guides_limit_per_query < 1 or args.guides_limit_per_query > 10:
        raise SystemExit("--guides-limit-per-query must be between 1 and 10")
    if args.guides_delay < 0:
        raise SystemExit("--guides-delay must be non-negative")
    if (
        args.skip_game_data
        and args.skip_meta
        and args.skip_guides
        and args.skip_icons
        and args.skip_upstream_audit
        and args.attrib_input is None
    ):
        raise SystemExit("at least one source must remain enabled")
    if args.upstream_timeout < 1 or args.upstream_timeout > 300:
        raise SystemExit("--upstream-timeout must be between 1 and 300 seconds")

    completed: list[str] = []
    try:
        if not args.skip_game_data:
            run_step("AoE4World game data", "sync_aoe4world_data.py", [], args.dry_run)
            completed.append("aoe4world-data")
        if not args.skip_icons:
            if args.dry_run:
                print("[sync] AoE4World icons: skipped in dry-run (generator has no write-free mode)")
            else:
                native_root = ROOT / "src" / "data" / "vendor" / "aoe4-icons" / "native"
                run_node_step("AoE4World icons", "sync_aoe4_icons.mjs", ["--native-png-root", str(native_root)])
                completed.append("aoe4world-icons")
        if not args.skip_meta:
            meta_arguments = ["--leaderboards", *args.leaderboards]
            if args.rank_level:
                meta_arguments.extend(("--rank-level", args.rank_level))
            run_step("AoE4World meta", "distill_tincture.py", meta_arguments, args.dry_run)
            completed.append("aoe4world-meta")
        if not args.skip_guides:
            run_step("AoE4Guides builds", "sync_aoe4guides.py", build_arguments(args), args.dry_run)
            completed.append("aoe4guides-builds")
        if args.attrib_input is not None:
            attrib_arguments = ["--input", str(args.attrib_input)]
            if args.attrib_revision:
                attrib_arguments.extend(("--source-revision", args.attrib_revision))
            run_step("attrib / Essence audit", "import_attrib_snapshot.py", attrib_arguments, args.dry_run)
            completed.append("attrib-audit")
        if not args.skip_upstream_audit:
            run_step(
                "GitHub upstream audit",
                "audit_upstream_repos.py",
                ["--timeout", str(args.upstream_timeout)],
                args.dry_run,
            )
            completed.append("upstream-github-audit")
    except (OSError, RuntimeError) as error:
        print(f"[sync] failed: {error}", file=sys.stderr)
        return 1

    if not args.dry_run:
        write_manifest(args, completed)
    print(f"[sync] completed: {', '.join(completed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
