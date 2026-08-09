"""Create the release-safe bundled build-order fallback.

The importer writes build JSON files into the working tree, while release and
test processes can observe a refresh in progress. The generated archive keeps
the last known-good catalog and merges current worktree files on top of the
tracked tree, so one missing or half-written source file cannot make Vite fail
at startup.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "buildOrderArchive.json"
BUILD_ROOTS = (
    ROOT / "src" / "data" / "buildOrders",
    ROOT / "src" / "data" / "activeBuildOrders",
)


def read_file(path: Path) -> object | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def tracked_paths() -> list[str]:
    result: list[str] = []
    for root in BUILD_ROOTS:
        relative_root = root.relative_to(ROOT).as_posix()
        result.extend(
            subprocess.check_output(
                ["git", "ls-tree", "-r", "--name-only", "HEAD", "--", relative_root],
                cwd=ROOT,
                text=True,
            ).splitlines()
        )
    return result


def main() -> int:
    paths = tracked_paths()
    builds: list[object] = []
    seen_paths: set[str] = set()

    # Preserve the previous archive first. This matters when a source refresh
    # is interrupted or an external cleanup removes untracked active builds.
    previous = read_file(OUTPUT)
    if isinstance(previous, list):
        builds.extend(previous)

    for path in paths:
        if not path.endswith(".json") or path.endswith("/_source-snapshot.json"):
            continue
        seen_paths.add(path)
        worktree_path = ROOT / Path(path)
        value = read_file(worktree_path) if worktree_path.exists() else None
        try:
            if value is None:
                raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
                value = json.loads(raw)
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            value = None
        if value is not None:
            builds.append(value)

    # Include new importer/active files that are not tracked yet. They are
    # intentionally not required for the fallback to remain valid.
    for root in BUILD_ROOTS:
        if not root.exists():
            continue
        for path in root.rglob("*.json"):
            if path.name == "_source-snapshot.json":
                continue
            relative = path.relative_to(ROOT).as_posix()
            if relative in seen_paths:
                continue
            value = read_file(path)
            if value is not None:
                builds.append(value)

    unique: list[object] = []
    seen_records: set[str] = set()
    for value in builds:
        try:
            key = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        except (TypeError, ValueError):
            continue
        if key in seen_records:
            continue
        seen_records.add(key)
        unique.append(value)

    if len(unique) < 600:
        raise RuntimeError(f"bundled archive unexpectedly small: {len(unique)}")
    OUTPUT.write_text(json.dumps(unique, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"archived {len(unique)} builds to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
