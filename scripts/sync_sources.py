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
    parser.add_argument("--skip-curated", action="store_true", help="Do not refresh AoE4World curated guides/videos")
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
    parser.add_argument(
        "--essence-input",
        type=Path,
        default=None,
        help="Optional .sga archive or extracted game-data directory for AOEMods.Essence",
    )
    parser.add_argument(
        "--essence-auto",
        action="store_true",
        help="Discover the installed AoE4 Attrib.sga and inventory it without unpacking",
    )
    parser.add_argument(
        "--essence-root",
        type=Path,
        default=None,
        help="AOEMods.Essence checkout; defaults to ../_source_audit/essence or RTSLYTICS_ESSENCE_ROOT",
    )
    parser.add_argument(
        "--essence-cli",
        type=Path,
        default=None,
        help="Optional published AOEMods.Essence CLI executable or .dll",
    )
    parser.add_argument(
        "--essence-output",
        type=Path,
        default=None,
        help="Optional AOEMods.Essence staging/report directory",
    )
    parser.add_argument(
        "--essence-native-output",
        type=Path,
        default=None,
        help="Optional decoded native PNG directory used by the icon catalogue",
    )
    parser.add_argument(
        "--decode-native-icons",
        action="store_true",
        help="Decode Essence .rrtex files into native PNG icons before icon sync",
    )
    parser.add_argument(
        "--decode-rgd",
        action="store_true",
        help="Decode Essence .rgd files into an audited JSON staging tree",
    )
    parser.add_argument(
        "--essence-sga-include",
        action="append",
        default=[],
        help="Only unpack matching SGA paths when decoding; repeat for additional globs",
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
    essence = (
        read_json(ROOT / "data" / "research" / "essence" / "latest.json")
        if args.essence_input or args.essence_auto
        else {}
    )
    essence_projection = read_json(ROOT / "data" / "research" / "essence" / "rgd-projection.json")
    curated = read_json(ROOT / "src" / "data" / "vendor" / "aoe4world-curated" / "content.json")
    game_data_snapshot = read_json(
        ROOT / "src" / "data" / "vendor" / "aoe4world-data" / "source-snapshot.json"
    )
    upstream_audit = read_json(ROOT / "data" / "research" / "aoe4-upstream-revisions.json")
    imported_dir = ROOT / "src" / "data" / "buildOrders" / "imported"
    unit_rows = units.get("data", units) if isinstance(units, dict) else units
    manifest = {
        "schemaVersion": 4,
        "source": "aoe4guides+aoe4world+curated+upstream-audit",
        "capturedAt": captured_at,
        "patch": args.patch or meta.get("patch"),
        "sourceRevisions": {
            "aoe4worldData": game_data_snapshot.get("sourceRevision"),
            "aoe4worldCurated": curated.get("sourceRevision"),
        },
        "completed": completed,
        "counts": {
            "importedBuildFiles": len(list(imported_dir.glob("*.json"))) if imported_dir.exists() else 0,
            "militaryUnits": len(unit_rows) if isinstance(unit_rows, list) else 0,
            "metaSlices": len(meta.get("slices", [])) if isinstance(meta.get("slices"), list) else 0,
            "entityIcons": icons.get("uniqueEntityIcons", 0),
            "nativeIcons": icons.get("nativeAssetCount", 0),
        },
        "essence": {
            "status": essence.get("status") if args.essence_input or args.essence_auto else "not-run",
            "sourceRevision": essence.get("sourceRevision"),
            "counts": essence.get("counts", {}),
            "report": "data/research/essence/latest.json" if essence else None,
            "projection": {
                "status": essence_projection.get("status", "not-run") if essence_projection else "not-run",
                "sourceRevision": essence_projection.get("sourceRevision"),
                "counts": essence_projection.get("counts", {}),
                "report": "data/research/essence/rgd-projection.json" if essence_projection else None,
            },
        },
        "curated": {
            "status": "not-run" if args.skip_curated else "bundled",
            "source": curated.get("source"),
            "sourceRevision": curated.get("sourceRevision"),
            "capturedAt": curated.get("capturedAt"),
            "counts": curated.get("counts", {}),
            "report": "data/research/aoe4world-curated.json" if curated else None,
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
        and args.skip_curated
        and args.skip_icons
        and args.skip_upstream_audit
        and args.attrib_input is None
        and args.essence_input is None
        and not args.essence_auto
    ):
        raise SystemExit("at least one source must remain enabled")
    if (args.decode_native_icons or args.decode_rgd) and args.essence_input is None and not args.essence_auto:
        raise SystemExit("--decode-native-icons/--decode-rgd require --essence-input or --essence-auto")
    if args.upstream_timeout < 1 or args.upstream_timeout > 300:
        raise SystemExit("--upstream-timeout must be between 1 and 300 seconds")

    completed: list[str] = []
    essence_report_path = (
        (args.essence_output.resolve() if args.essence_output else ROOT / "data" / "research" / "essence")
        / "latest.json"
    )
    essence_native_output = (
        args.essence_native_output.resolve()
        if args.essence_native_output
        else ROOT / "data" / "research" / "essence" / "native-output"
    )
    try:
        if args.essence_input is not None:
            essence_arguments = ["--input", str(args.essence_input)]
            if args.essence_root:
                essence_arguments.extend(("--essence-root", str(args.essence_root)))
            if args.essence_cli:
                essence_arguments.extend(("--cli", str(args.essence_cli)))
            if args.essence_output:
                essence_arguments.extend(("--output", str(args.essence_output)))
            if args.essence_native_output:
                essence_arguments.extend(("--native-output", str(args.essence_native_output)))
            elif args.decode_native_icons:
                essence_arguments.extend(("--native-output", str(essence_native_output)))
            if args.decode_native_icons:
                essence_arguments.append("--decode-native-icons")
            if args.decode_rgd:
                essence_arguments.append("--decode-rgd")
            if args.attrib_revision:
                essence_arguments.extend(("--source-revision", args.attrib_revision))
            for pattern in args.essence_sga_include:
                essence_arguments.extend(("--sga-include", pattern))
            run_step("AOEMods.Essence adapter", "essence_adapter.py", essence_arguments, args.dry_run)
            completed.append("aoemods-essence")
        elif args.essence_auto:
            essence_auto_arguments = ["--auto-discover"]
            if args.decode_native_icons:
                essence_auto_arguments.append("--decode-native-icons")
                essence_auto_arguments.extend(("--native-output", str(essence_native_output)))
            if args.decode_rgd:
                essence_auto_arguments.append("--decode-rgd")
            if args.attrib_revision:
                essence_auto_arguments.extend(("--source-revision", args.attrib_revision))
            for pattern in args.essence_sga_include:
                essence_auto_arguments.extend(("--sga-include", pattern))
            run_step(
                "AOEMods.Essence auto-discovery",
                "essence_adapter.py",
                essence_auto_arguments,
                args.dry_run,
            )
            completed.append("aoemods-essence-auto")
        if not args.skip_game_data:
            run_step("AoE4World game data", "sync_aoe4world_data.py", [], args.dry_run)
            completed.append("aoe4world-data")
        if not args.skip_icons:
            if args.dry_run:
                print("[sync] AoE4World icons: skipped in dry-run (generator has no write-free mode)")
            else:
                native_root = (
                    essence_native_output
                    if args.decode_native_icons
                    else ROOT / "src" / "data" / "vendor" / "aoe4-icons" / "native"
                )
                icon_arguments = ["--native-png-root", str(native_root)]
                if args.essence_input or args.essence_auto:
                    icon_arguments.extend(("--essence-report", str(essence_report_path)))
                else:
                    icon_arguments.append("--skip-essence-report")
                run_node_step("AoE4World icons", "sync_aoe4_icons.mjs", icon_arguments)
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
        if not args.skip_curated:
            run_step(
                "AoE4World curated content",
                "sync_aoe4world_curated.py",
                [],
                args.dry_run,
            )
            completed.append("aoe4world-curated")
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
