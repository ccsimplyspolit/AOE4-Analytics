"""Run AOEMods.Essence as a safe, external AoE4 asset/data adapter.

The Electron application never loads or executes game archives. This script is
the boundary used by ``sync_sources.py``: it discovers a local Essence CLI,
optionally unpacks SGA files, decodes RRTex/RGD files, inventories the resulting
tree and writes a small provenance report. All input/output paths are explicit
and output folders may not be placed inside the input tree.

Examples:
    python scripts/essence_adapter.py --status
    python scripts/essence_adapter.py --input C:/AoE4/UIArt.sga \
        --decode-native-icons --native-output src/data/vendor/aoe4-icons/native
    python scripts/essence_adapter.py --input C:/AoE4/extracted \
        --decode-rgd --source-revision patch-16.0
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ESSENCE_ROOT = ROOT.parent / "_source_audit" / "essence"
DEFAULT_OUTPUT = ROOT / "data" / "research" / "essence"
DEFAULT_NATIVE_OUTPUT = ROOT / "src" / "data" / "vendor" / "aoe4-icons" / "native"
PROVENANCE_OUTPUT = ROOT / "src" / "data" / "vendor" / "aoe4world-data" / "essence-provenance.json"
ESSENCE_URL = "https://github.com/aoemods/AOEMods.Essence"
SELECTIVE_UNPACK_PROJECT = ROOT / "scripts" / "essence-selective-unpack" / "essence-selective-unpack.csproj"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="An extracted game-data directory or one .sga archive")
    parser.add_argument(
        "--essence-root",
        type=Path,
        default=Path(os.environ.get("RTSLYTICS_ESSENCE_ROOT", DEFAULT_ESSENCE_ROOT)),
        help="AOEMods.Essence checkout containing AOEMods.Essence.CLI",
    )
    parser.add_argument(
        "--cli",
        type=Path,
        default=None,
        help="Published Essence CLI executable or .dll; otherwise the local checkout is used",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Essence report/staging directory")
    parser.add_argument(
        "--native-output",
        type=Path,
        default=DEFAULT_NATIVE_OUTPUT,
        help="PNG destination used by the offline icon catalogue",
    )
    parser.add_argument("--decode-native-icons", action="store_true", help="Decode .rrtex files to PNG")
    parser.add_argument("--decode-rgd", action="store_true", help="Decode .rgd files to JSON")
    parser.add_argument(
        "--auto-discover",
        action="store_true",
        help="Use the installed AoE4 archives (Attrib.sga preferred) when --input is omitted",
    )
    parser.add_argument("--source-revision", default=None, help="Essence/game snapshot revision")
    parser.add_argument(
        "--sga-include",
        action="append",
        default=[],
        help="Only unpack SGA paths matching this glob; repeat for additional paths",
    )
    parser.add_argument("--max-files", type=int, default=100_000, help="Safety limit for one inventory")
    parser.add_argument("--dry-run", action="store_true", help="Only preflight and print the planned actions")
    parser.add_argument("--status", action="store_true", help="Print tool availability without an input")
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def resolve_path(path: Path) -> Path:
    return path.expanduser().resolve()


def discover_game_archives() -> dict[str, Path]:
    """Find common Steam AoE4 archives without scanning arbitrary drives.

    Essence is an offline parser, so discovery is deliberately conservative:
    only an explicit ``AOE4_GAME_ROOT`` and the standard Windows Steam path
    are considered. The caller still chooses which archive to process.
    """

    roots: list[Path] = []
    configured = os.environ.get("AOE4_GAME_ROOT")
    if configured:
        roots.append(resolve_path(Path(configured)))
    roots.append(Path(r"C:\Program Files (x86)\Steam\steamapps\common\Age of Empires IV"))
    found: dict[str, Path] = {}
    for root in roots:
        archive_root = root / "cardinal" / "archives"
        if not archive_root.is_dir():
            continue
        for name, key in (("Attrib.sga", "attrib"), ("UIArt.sga", "uiArt"), ("Data.sga", "data")):
            candidate = archive_root / name
            if candidate.is_file() and key not in found:
                found[key] = candidate.resolve()
    return found


def select_discovered_archive(
    discovered: dict[str, Path], *, decode_native_icons: bool, decode_rgd: bool
) -> Path | None:
    """Choose the archive that contains the requested asset family.

    Attrib.sga is the useful source for RGD attributes, while UIArt.sga is the
    source for native RRTex icons. The old fallback always selected Attrib.sga,
    which made ``--decode-native-icons --auto-discover`` silently inventory an
    archive with no textures. Keep the choice explicit and deterministic.
    """

    if decode_native_icons and not decode_rgd:
        return discovered.get("uiArt") or discovered.get("attrib") or discovered.get("data")
    if decode_rgd and not decode_native_icons:
        return discovered.get("attrib") or discovered.get("data") or discovered.get("uiArt")
    return discovered.get("attrib") or discovered.get("data") or discovered.get("uiArt")


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def validate_output(input_path: Path | None, output_path: Path, native_path: Path | None) -> None:
    if input_path is None:
        return
    input_root = input_path if input_path.is_dir() else input_path.parent
    for candidate, label in ((output_path, "--output"), (native_path, "--native-output")):
        if candidate is not None and is_within(candidate, input_root):
            raise SystemExit(f"{label} must not be inside --input; this would make a recursive source tree")


def find_cli(essence_root: Path, explicit: Path | None) -> tuple[list[str] | None, dict[str, Any]]:
    root = resolve_path(essence_root)
    candidates: list[tuple[list[str], str]] = []
    if explicit is not None:
        path = resolve_path(explicit)
        if path.suffix.lower() == ".dll" and shutil.which("dotnet"):
            candidates.append((["dotnet", str(path)], str(path)))
        elif path.exists() and path.is_file():
            candidates.append(([str(path)], str(path)))
        else:
            candidates.append(([str(explicit)], str(explicit)))

    cli_project = root / "AOEMods.Essence.CLI" / "AOEMods.Essence.CLI.csproj"
    if cli_project.exists() and shutil.which("dotnet"):
        candidates.append(
            (
                [
                    "dotnet",
                    "run",
                    "--project",
                    str(cli_project),
                    "--no-launch-profile",
                    "-p:EnablePreviewFeatures=true",
                    "-p:NoWarn=CA2252",
                    "--",
                ],
                str(cli_project),
            )
        )

    for pattern in ("AOEMods.Essence.CLI.exe", "AOEMods.Essence.CLI.dll"):
        for path in sorted((root / "AOEMods.Essence.CLI").glob(f"**/{pattern}")):
            if path.is_file():
                if path.suffix.lower() == ".dll" and shutil.which("dotnet"):
                    candidates.append((["dotnet", str(path)], str(path)))
                else:
                    candidates.append(([str(path)], str(path)))

    for command, label in candidates:
        if command[0] == "dotnet" or Path(command[0]).exists() or shutil.which(command[0]):
            return command, {
                "available": True,
                "root": str(root),
                "entrypoint": label,
                "command": command,
            }

    return None, {
        "available": False,
        "root": str(root),
        "entrypoint": None,
        "command": None,
        "reason": "AOEMods.Essence.CLI checkout, executable or dotnet runtime was not found",
    }


def iter_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    return sorted(path for path in root.rglob("*") if path.is_file() and not path.is_symlink())


def counts(files: list[Path]) -> dict[str, int]:
    suffixes = {".sga": "sga", ".rgd": "rgd", ".rrtex": "rrtex", ".rrgeom": "rrgeom", ".rrmaterial": "rrmaterial", ".png": "png"}
    result = {value: 0 for value in suffixes.values()}
    result["files"] = len(files)
    for path in files:
        key = suffixes.get(path.suffix.lower())
        if key:
            result[key] += 1
    return result


def run_cli(command: list[str], arguments: list[str], cwd: Path) -> str:
    result = subprocess.run(
        [*command, *arguments],
        cwd=cwd,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        raise RuntimeError(f"Essence command failed with exit code {result.returncode}: {output[-2_000:]}")
    return output


def relative_or_absolute(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def write_runtime_provenance(report: dict[str, Any]) -> None:
    """Publish only compact, reviewable provenance to the renderer bundle."""

    PROVENANCE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    source_input = report.get("input") if isinstance(report.get("input"), dict) else {}
    compact = {
        "schemaVersion": 1,
        "source": report.get("source"),
        "sourceUrl": report.get("sourceUrl"),
        "sourceRevision": report.get("sourceRevision"),
        "capturedAt": report.get("capturedAt"),
        "status": report.get("status"),
        # Do not put a user's Windows/Steam path into the renderer bundle.
        "input": {
            "path": None,
            "kind": source_input.get("kind"),
            "name": source_input.get("name"),
            "bytes": source_input.get("bytes"),
        },
        "counts": report.get("counts", {}),
        "actions": report.get("actions", []),
        "projection": report.get("projection"),
    }
    PROVENANCE_OUTPUT.write_text(json.dumps(compact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_report(args: argparse.Namespace, tool: dict[str, Any]) -> dict[str, Any]:
    input_path = resolve_path(args.input) if args.input else None
    output_path = resolve_path(args.output)
    native_path = resolve_path(args.native_output) if args.decode_native_icons else None
    report: dict[str, Any] = {
        "schemaVersion": 1,
        "source": "AOEMods.Essence",
        "sourceUrl": ESSENCE_URL,
        "sourceRevision": args.source_revision,
        "capturedAt": now(),
        "status": "ready" if tool.get("available") else "unavailable",
        "tool": tool,
        "discovery": {
            "enabled": bool(args.auto_discover),
            "archives": {key: relative_or_absolute(value) for key, value in discover_game_archives().items()},
        },
        "input": {
            "path": relative_or_absolute(input_path) if input_path else None,
            "kind": "sga" if input_path and input_path.suffix.lower() == ".sga" else ("directory" if input_path else None),
            "name": input_path.name if input_path else None,
            "bytes": input_path.stat().st_size if input_path and input_path.is_file() else None,
        },
        "output": {
            "path": relative_or_absolute(output_path),
            "nativePath": relative_or_absolute(native_path) if native_path else None,
        },
        "actions": [],
        "counts": {
            "files": 0,
            "sga": 0,
            "rgd": 0,
            "rrtex": 0,
            "rrgeom": 0,
            "rrmaterial": 0,
            "png": 0,
        },
        "errors": [],
    }
    if input_path is not None and input_path.exists():
        report["counts"] = counts(iter_files(input_path))
    # Keep a previously reviewed projection visible when this run only
    # inventories the installed archive. The raw decode tree may be discarded
    # after projection, so the report must not point at a missing staging path.
    projection_path = output_path / "rgd-projection.json"
    if projection_path.is_file():
        try:
            projection = json.loads(projection_path.read_text(encoding="utf-8"))
            projection_counts = projection.get("counts", {})
            report["counts"]["projectedRgd"] = int(projection_counts.get("records", 0))
            report["counts"]["projectionErrors"] = int(projection_counts.get("errors", 0))
            report["output"]["rgdProjectionPath"] = relative_or_absolute(projection_path)
            report["projection"] = {
                "status": projection.get("status"),
                "sourceRevision": projection.get("sourceRevision"),
                "counts": projection_counts,
                "path": relative_or_absolute(projection_path),
            }
        except (OSError, UnicodeError, json.JSONDecodeError, TypeError, ValueError):
            report["errors"].append("Existing RGD projection could not be read; run --decode-rgd to rebuild it.")
    if args.decode_native_icons:
        report["actions"].append("rrtex-decode -> PNG")
    if args.decode_rgd:
        report["actions"].append("rgd-decode -> JSON")
        report["actions"].append("rgd-project -> audited index")
    if input_path and input_path.suffix.lower() == ".sga" and (args.decode_native_icons or args.decode_rgd):
        report["actions"].insert(0, "sga-unpack (filtered)" if args.sga_include else "sga-unpack")
    if args.sga_include:
        report["sgaInclude"] = list(args.sga_include)
    return report


def main() -> int:
    args = parse_args()
    if args.max_files < 1:
        raise SystemExit("--max-files must be positive")
    input_path = resolve_path(args.input) if args.input else None
    discovered = discover_game_archives() if args.auto_discover else {}
    if (
        input_path is None
        and args.auto_discover
        and args.decode_native_icons
        and args.decode_rgd
    ):
        raise SystemExit(
            "--decode-native-icons and --decode-rgd target different auto-discovered archives; "
            "run separate UIArt.sga and Attrib.sga passes"
        )
    if input_path is None and args.auto_discover:
        input_path = select_discovered_archive(
            discovered,
            decode_native_icons=args.decode_native_icons,
            decode_rgd=args.decode_rgd,
        )
    if not args.status and input_path is None and not args.auto_discover:
        raise SystemExit("--input is required unless --auto-discover or --status is used")
    # Keep the report builder and downstream validation on the resolved path.
    args.input = input_path
    output_path = resolve_path(args.output)
    native_path = resolve_path(args.native_output) if args.decode_native_icons else None
    if input_path is not None and not input_path.exists():
        raise SystemExit(f"input does not exist: {input_path}")
    validate_output(input_path, output_path, native_path)

    command, tool = find_cli(args.essence_root, args.cli)
    if args.status:
        print(
            json.dumps(
                {
                    "source": "AOEMods.Essence",
                    "sourceUrl": ESSENCE_URL,
                    "tool": tool,
                    "discovery": {key: str(value) for key, value in discovered.items()},
                },
                ensure_ascii=False,
            )
        )
        return 0 if tool.get("available") else 1
    if input_path is not None and len(iter_files(input_path)) > args.max_files:
        raise SystemExit(f"input contains more than {args.max_files} files; safety limit reached")

    report = build_report(args, tool)
    if not tool.get("available") or command is None:
        report["status"] = "unavailable"
        report["errors"].append(tool.get("reason", "Essence CLI is unavailable"))
    elif input_path is None:
        # Auto-discovery is intentionally non-fatal on machines without the
        # game installed; the web-backed source refresh can still proceed.
        report["status"] = "skipped"
        report["errors"].append("No AoE4 archive was found in the configured Steam location.")
    elif args.dry_run:
        report["status"] = "dry-run"
    else:
        output_path.mkdir(parents=True, exist_ok=True)
        effective_root = input_path
        should_unpack = bool(args.decode_native_icons or args.decode_rgd)
        if input_path and should_unpack and input_path.is_file() and input_path.suffix.lower() == ".sga":
            extracted = output_path / "extracted" / input_path.stem
            extracted.mkdir(parents=True, exist_ok=True)
            if args.sga_include:
                if not SELECTIVE_UNPACK_PROJECT.exists() or not shutil.which("dotnet"):
                    raise RuntimeError("Selective Essence unpacker or dotnet runtime is unavailable")
                selective_command = [
                    "dotnet",
                    "run",
                    "--project",
                    str(SELECTIVE_UNPACK_PROJECT),
                    "--no-launch-profile",
                    "-p:EnablePreviewFeatures=true",
                    "-p:NoWarn=CA2252",
                    "--",
                    str(input_path),
                    str(extracted),
                    *args.sga_include,
                ]
                run_cli(selective_command, [], ROOT)
            else:
                run_cli(command, ["sga-unpack", str(input_path), str(extracted)], ROOT)
            effective_root = extracted
        if effective_root is None:
            raise SystemExit("No input tree available")

        files = iter_files(effective_root)
        if args.decode_native_icons and any(path.suffix.lower() == ".rrtex" for path in files):
            assert native_path is not None
            native_path.mkdir(parents=True, exist_ok=True)
            run_cli(command, ["rrtex-decode", str(effective_root), str(native_path), "--batch"], ROOT)
            report["counts"]["decodedPng"] = len(iter_files(native_path))
        if args.decode_rgd and any(path.suffix.lower() == ".rgd" for path in files):
            rgd_output = output_path / "rgd"
            rgd_output.mkdir(parents=True, exist_ok=True)
            run_cli(command, ["rgd-decode", str(effective_root), str(rgd_output), "--batch", "--format", "json"], ROOT)
            report["output"]["rgdPath"] = relative_or_absolute(rgd_output)
            report["counts"]["decodedRgd"] = len(
                [path for path in iter_files(rgd_output) if path.suffix.lower() == ".json"]
            )
            projection_path = output_path / "rgd-projection.json"
            projection_command = [
                sys.executable,
                str(ROOT / "scripts" / "project_essence_rgd.py"),
                "--input",
                str(rgd_output),
                "--output",
                str(projection_path),
            ]
            if args.source_revision:
                projection_command.extend(("--source-revision", args.source_revision))
            projection = subprocess.run(
                projection_command,
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            projection_output = (projection.stdout or "") + (projection.stderr or "")
            if projection.returncode != 0:
                raise RuntimeError(f"Essence RGD projection failed with exit code {projection.returncode}: {projection_output[-2_000:]}")
            report["output"]["rgdProjectionPath"] = relative_or_absolute(projection_path)
            try:
                projection_report = json.loads(projection_path.read_text(encoding="utf-8"))
                projection_counts = projection_report.get("counts", {})
                report["counts"]["projectedRgd"] = int(projection_counts.get("records", 0))
                report["counts"]["projectionErrors"] = int(projection_counts.get("errors", 0))
            except (OSError, UnicodeError, json.JSONDecodeError, TypeError, ValueError):
                report["counts"]["projectedRgd"] = 0

        decoded_counts = {
            key: value
            for key, value in report["counts"].items()
            if key.startswith("decoded") or key.startswith("projected") or key.startswith("projection")
        }
        report["counts"] = {**counts(files), **decoded_counts}
        report["status"] = "decoded" if args.decode_native_icons or args.decode_rgd else "inventoried"
        report["input"]["effectivePath"] = relative_or_absolute(effective_root)

    report_path = output_path / "latest.json"
    if not args.dry_run:
        output_path.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_runtime_provenance(report)
    print(f"[essence] status: {report['status']}")
    print(
        f"[essence] summary: {json.dumps({
            'status': report['status'],
            'counts': report['counts'],
            'sourceRevision': report['sourceRevision'],
            'report': relative_or_absolute(report_path),
            'input': {
                'name': report['input'].get('name'),
                'kind': report['input'].get('kind'),
                'bytes': report['input'].get('bytes'),
            },
            'actions': report['actions'],
        }, ensure_ascii=False, separators=(',', ':'))}"
    )
    return 0 if report["status"] not in {"unavailable", "failed"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
