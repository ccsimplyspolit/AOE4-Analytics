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


def build_identity(value: object) -> str | None:
    """Return the stable catalog identity used to collapse title duplicates."""
    if not isinstance(value, dict):
        return None
    name = value.get("name")
    civilization = value.get("civilization")
    if not isinstance(name, str) or not name.strip():
        return None
    if isinstance(civilization, str):
        civilizations = [civilization]
    elif isinstance(civilization, list) and all(isinstance(item, str) for item in civilization):
        civilizations = civilization
    else:
        return None

    def compact(text: str) -> str:
        return "".join(character for character in text.casefold() if character.isalnum())

    return "|".join(compact(item) for item in civilizations) + "::" + compact(name)


def build_quality(value: object) -> int:
    """Prefer the richer copy when duplicate records have the same identity."""
    if not isinstance(value, dict):
        return 0
    steps = value.get("build_order")
    return (
        len(steps) * 10 if isinstance(steps, list) else 0
        + 20 * int(bool(value.get("reasoning")))
        + 5 * int(bool(value.get("archetype")))
        + int(bool(value.get("source")))
    )


def archive_builds(candidates: list[tuple[object, int]]) -> list[object]:
    """Deduplicate by civ/title while preferring active and richer records."""
    selected: dict[str, tuple[int, int, object]] = {}
    fallback: dict[str, object] = {}
    for value, source_priority in candidates:
        try:
            serialized = json.dumps(
                value,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
        except (TypeError, ValueError):
            continue
        identity = build_identity(value)
        if identity is None:
            fallback.setdefault(serialized, value)
            continue
        candidate_rank = (source_priority, build_quality(value))
        current = selected.get(identity)
        if current is None or candidate_rank > current[:2]:
            selected[identity] = (candidate_rank[0], candidate_rank[1], value)

    return [value for _, _, value in selected.values()] + list(fallback.values())


def main() -> int:
    paths = tracked_paths()
    builds: list[tuple[object, int]] = []
    seen_paths: set[str] = set()

    # Preserve the previous archive first. This matters when a source refresh
    # is interrupted or an external cleanup removes untracked active builds.
    previous = read_file(OUTPUT)
    if isinstance(previous, list):
        builds.extend((value, 0) for value in previous)

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
            source_priority = 3 if path.startswith("src/data/activeBuildOrders/") else 1
            builds.append((value, source_priority))

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
                source_priority = 3 if root.name == "activeBuildOrders" else 1
                builds.append((value, source_priority))

    unique = archive_builds(builds)

    if len(unique) < 600:
        raise RuntimeError(f"bundled archive unexpectedly small: {len(unique)}")
    OUTPUT.write_text(json.dumps(unique, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"archived {len(unique)} builds to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
