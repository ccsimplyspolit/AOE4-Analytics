"""Audit the revisions of the external AoE4 repositories used by RTSLytics.

This is deliberately a metadata-only step. It does not clone repositories or
execute code from them; it resolves each repository's symbolic HEAD and commit
through ``git ls-remote`` and writes a small provenance manifest. A failed
repository is recorded as degraded instead of hiding the healthy results from
the rest of the source refresh.

Examples:
    python scripts/audit_upstream_repos.py --dry-run
    python scripts/audit_upstream_repos.py
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "research" / "aoe4-upstream-revisions.json"
USER_AGENT = "RTSLytics/0.5 (+upstream-provenance-audit)"

UPSTREAMS: tuple[dict[str, str], ...] = (
    {"id": "aoe4world-data", "repository": "aoe4world/data"},
    {"id": "aoe4world-overlay", "repository": "aoe4world/overlay"},
    {"id": "aoe4world-explorer", "repository": "aoe4world/explorer"},
    {"id": "aoe4world-replays-api", "repository": "aoe4world/replays-api"},
    {"id": "aoe4world-curated", "repository": "aoe4world/curated"},
    {"id": "aoe4world-docker-ruby-node", "repository": "aoe4world/docker-ruby-node"},
    {"id": "aoe4guides", "repository": "jensbuehl/aoe4-guides"},
    {"id": "essence", "repository": "aoemods/AOEMods.Essence"},
    {"id": "attrib", "repository": "aoemods/attrib"},
    {"id": "war-room", "repository": "haZiinstinct/aoe4-war-room"},
    {"id": "prelate-rs", "repository": "willfindlay/prelate-rs"},
    {"id": "orda", "repository": "gzordrai/orda"},
    {"id": "aoe4stats", "repository": "willbonney/aoe4stats.com"},
    {"id": "native-hud", "repository": "FramHerel/Aoe4OverlayWinUI3"},
    {"id": "hud-websocket", "repository": "ycxisreal/ycx-aoe4-hud-frontend"},
    {"id": "counter-chart", "repository": "LeandroSQ/aoe4-counter-chart"},
    # AOEMods' format/parser and TypeScript-to-Lua toolchain. These repositories
    # are audited for provenance and developer tooling; they are not bundled
    # into the Electron runtime.
    {"id": "aoemods-zig-essence", "repository": "aoemods/zig-essence"},
    {"id": "aoemods-aoetypes", "repository": "aoemods/aoetypes"},
    {"id": "aoemods-aoetypes-docs", "repository": "aoemods/aoetypes-docs"},
    {"id": "aoemods-typescript-template", "repository": "aoemods/aoe4-typescript-template"},
    {"id": "aoemods-tstl", "repository": "aoemods/AOE4-TSTL"},
    {"id": "aoemods-lua-docs", "repository": "aoemods/lua-docs"},
    {"id": "aoemods-dodge-mod", "repository": "aoemods/dodge-mod"},
    {"id": "aoemods-wiki", "repository": "aoemods/wiki"},
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--timeout", type=int, default=30, help="Timeout per repository in seconds")
    parser.add_argument("--dry-run", action="store_true", help="Audit without writing the manifest")
    return parser.parse_args()


def resolve_head(repository: str, timeout: int) -> tuple[str | None, str | None, str | None]:
    """Return ``(branch, commit, error)`` for one public Git repository."""
    url = f"https://github.com/{repository}.git"
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--symref", url, "HEAD"],
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except (OSError, subprocess.SubprocessError) as error:
        return None, None, f"{type(error).__name__}: {error}"
    if result.returncode != 0:
        detail = result.stderr.strip() or "git ls-remote failed"
        return None, None, detail

    branch: str | None = None
    commit: str | None = None
    for line in result.stdout.splitlines():
        if line.startswith("ref: refs/heads/") and line.endswith("\tHEAD"):
            branch = line.removeprefix("ref: refs/heads/").removesuffix("\tHEAD")
        fields = line.split()
        if len(fields) >= 2 and fields[1] == "HEAD" and len(fields[0]) == 40:
            commit = fields[0]
    if not commit:
        return branch, None, "GitHub did not return a commit for HEAD"
    return branch, commit, None


def build_manifest(timeout: int) -> dict[str, Any]:
    captured_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    rows: list[dict[str, Any]] = []
    for upstream in UPSTREAMS:
        branch, commit, error = resolve_head(upstream["repository"], timeout)
        row: dict[str, Any] = {
            "id": upstream["id"],
            "repository": upstream["repository"],
            "url": f"https://github.com/{upstream['repository']}",
            "branch": branch,
            "commit": commit,
            "status": "ok" if commit else "unavailable",
        }
        if error:
            row["error"] = error
        rows.append(row)
        if commit:
            print(f"[upstream] {upstream['repository']} {branch or 'HEAD'} {commit[:12]}")
        else:
            print(f"[upstream] {upstream['repository']} unavailable: {error}")

    healthy = sum(row["status"] == "ok" for row in rows)
    return {
        "schemaVersion": 1,
        "sourceId": "upstream-github-audit",
        "sourceUrl": "https://github.com/",
        "capturedAt": captured_at,
        "status": "healthy" if healthy == len(rows) else "degraded",
        "healthy": healthy,
        "total": len(rows),
        "sources": rows,
    }


def main() -> int:
    args = parse_args()
    if args.timeout < 1 or args.timeout > 300:
        raise SystemExit("--timeout must be between 1 and 300 seconds")
    manifest = build_manifest(args.timeout)
    print(f"[upstream] {manifest['healthy']}/{manifest['total']} repositories resolved")
    if args.dry_run:
        print("[upstream] dry-run: no manifest written")
        return 0
    output = args.output.expanduser()
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[upstream] manifest: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
