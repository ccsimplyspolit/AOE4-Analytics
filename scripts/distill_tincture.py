"""Distill AoE4World civilization slices into committed Tincture snapshots.

The script mirrors the reference Tincture workflow: fetch a small, explicit
source payload, normalize it, append bounded history, and only then replace the
output files. A failed or malformed upstream response never overwrites the last
known-good snapshot.

Examples:
    python scripts/distill_tincture.py --dry-run
    python scripts/distill_tincture.py --leaderboards rm_solo qm_1v1 rm_2v2 qm_2v2 rm_3v3 qm_3v3 rm_4v4 qm_4v4
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
API_BASE = "https://aoe4world.com/api/v0"
DEFAULT_LEADERBOARDS = (
    "rm_solo",
    "qm_1v1",
    "rm_2v2",
    "qm_2v2",
    "rm_3v3",
    "qm_3v3",
    "rm_4v4",
    "qm_4v4",
)
META_PATH = ROOT / "src" / "data" / "tinctureMeta.json"
HISTORY_PATH = ROOT / "src" / "data" / "tinctureHistory.json"
MAX_SNAPSHOTS = 240


def fetch_json(url: str) -> object:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "RTSLytics-Tincture/0.5"})
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_slice(leaderboard: str, rank_level: str | None) -> dict[str, object]:
    params = {"rank_level": rank_level} if rank_level else {}
    query = f"?{urlencode(params)}" if params else ""
    document = fetch_json(f"{API_BASE}/stats/{leaderboard}/civilizations{query}")
    if not isinstance(document, dict) or not isinstance(document.get("data"), list):
        raise ValueError(f"{leaderboard}: response has no data array")

    civs: list[dict[str, object]] = []
    total_games = 0
    for row in document["data"]:
        if not isinstance(row, dict):
            continue
        civ = row.get("civilization")
        if not isinstance(civ, str):
            continue
        values = {
            "civ": civ,
            "civName": civ.replace("_", " ").title(),
            "winRate": round(float(row.get("win_rate", 0)), 1),
            "pickRate": round(float(row.get("pick_rate", 0)), 1),
            "games": int(row.get("games_count", 0)),
        }
        civs.append(values)
        total_games += values["games"]

    if not civs:
        raise ValueError(f"{leaderboard}: empty civilization data")
    return {
        "leaderboard": leaderboard,
        "rankLevel": rank_level,
        "totalGames": total_games,
        "patch": document.get("patch") if isinstance(document.get("patch"), str) else None,
        "civs": sorted(civs, key=lambda row: (-float(row["winRate"]), str(row["civName"]))),
    }


def read_json(path: Path, fallback: dict[str, object]) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else fallback
    except (OSError, json.JSONDecodeError):
        return fallback


def write_atomic(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp_path = Path(handle.name)
    temp_path.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--leaderboards", nargs="+", default=list(DEFAULT_LEADERBOARDS))
    parser.add_argument("--rank-level", default=None, help="Optional AoE4World rank slice, e.g. conqueror")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and validate without writing output")
    args = parser.parse_args()

    captured_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    slices: list[dict[str, object]] = []
    try:
        for leaderboard in args.leaderboards:
            print(f"[fetch] {leaderboard} {args.rank_level or 'all'}", flush=True)
            slices.append(fetch_slice(leaderboard, args.rank_level))
    except Exception as error:  # fail-safe: do not touch the previous files
        print(f"distill failed; previous snapshot kept: {error}", file=sys.stderr)
        return 1

    meta = {
        "schemaVersion": 2,
        "generatedAt": captured_at,
        "capturedAt": captured_at,
        "source": "aoe4world",
        "patch": ",".join(sorted({str(item["patch"]) for item in slices if item.get("patch")})) or None,
        "rankLevel": args.rank_level,
        "slices": slices,
    }
    previous = read_json(HISTORY_PATH, {"schemaVersion": 1, "maxSnapshots": MAX_SNAPSHOTS, "snapshots": []})
    raw_snapshots = previous.get("snapshots") if isinstance(previous.get("snapshots"), list) else []
    snapshots: list[dict[str, object]] = []
    for item in raw_snapshots:
        if not isinstance(item, dict) or not isinstance(item.get("capturedAt"), str):
            continue
        item_slices = item.get("slices") if isinstance(item.get("slices"), list) else []
        inferred_patch = ",".join(
            sorted(
                {
                    str(slice_item.get("patch"))
                    for slice_item in item_slices
                    if isinstance(slice_item, dict) and slice_item.get("patch")
                }
            )
        ) or None
        snapshots.append(
            {
                "schemaVersion": 2,
                "source": str(item.get("source") or "aoe4world"),
                "capturedAt": item["capturedAt"],
                "patch": item.get("patch") or inferred_patch,
                "slices": item_slices,
            }
        )
    snapshots = [item for item in snapshots if item.get("capturedAt") != captured_at]
    snapshots.append({
        "schemaVersion": 2,
        "source": "aoe4world",
        "capturedAt": captured_at,
        "patch": meta["patch"],
        "slices": slices,
    })
    history = {"schemaVersion": 2, "maxSnapshots": MAX_SNAPSHOTS, "snapshots": snapshots[-MAX_SNAPSHOTS:]}

    print(f"[distill] {len(slices)} slices, {sum(len(item['civs']) for item in slices)} civilizations")
    if not args.dry_run:
        write_atomic(META_PATH, meta)
        write_atomic(HISTORY_PATH, history)
        print(f"[write] {META_PATH}")
        print(f"[write] {HISTORY_PATH} ({len(history['snapshots'])} snapshots)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
