"""Build a reproducible, ranked AoE4 learning catalogue from YouTube search.

The YouTube search endpoint is used only for discovery.  The generated catalogue
keeps the source URL and query context so users can verify a video in its own
patch context.  Titles are classified into broad learning blocks and a
four-step difficulty ladder; this is a navigation aid, not a claim about a
creator's skill level.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "src" / "data" / "guideCatalog.generated.ts"


@dataclass(frozen=True)
class Query:
    text: str
    block: str
    difficulty: str


QUERIES = (
    Query("Age of Empires 4 beginner guide", "fundamentals", "beginner"),
    Query("Age of Empires IV tips tricks", "fundamentals", "beginner"),
    Query("AoE4 build order guide", "economy", "beginner"),
    Query("AoE4 economy guide", "economy", "intermediate"),
    Query("AoE4 farming guide", "economy", "beginner"),
    Query("AoE4 deer hunt guide", "map", "intermediate"),
    Query("AoE4 micro guide", "military", "intermediate"),
    Query("AoE4 kiting guide", "military", "advanced"),
    Query("AoE4 army composition counters guide", "military", "intermediate"),
    Query("AoE4 hotkeys control groups guide", "mechanics", "intermediate"),
    Query("AoE4 advanced mechanics guide", "mechanics", "advanced"),
    Query("AoE4 map control positioning guide", "strategy", "advanced"),
    Query("AoE4 team game guide", "team", "intermediate"),
    Query("AoE4 civilization guide", "civilizations", "intermediate"),
    Query("AoE4 professional coaching analysis", "professional", "professional"),
    Query("AoE4 landmark guide", "civilizations", "intermediate"),
    Query("AoE4 relic guide", "map", "advanced"),
    Query("AoE4 siege guide", "military", "advanced"),
    Query("AoE4 trade guide", "economy", "advanced"),
    Query("AoE4 water map guide", "map", "advanced"),
    Query("AoE4 wall placement guide", "mechanics", "advanced"),
    Query("Beastyqt AoE4 analysis", "professional", "professional"),
    Query("AoE4 tournament cast analysis", "professional", "professional"),
    Query("AoE4 pro player guide", "professional", "professional"),
)

AOE_MARKERS = ("aoe4", "age of empires 4", "age of empires iv", "age of empires 4")
OTHER_GAME_MARKERS = (
    "aoe2",
    "aoe 2",
    "age of empires ii",
    "aoe3",
    "aoe 3",
    "age of empires iii",
    "age of mythology",
    "starcraft",
    "warcraft",
)
DIFFICULTY_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2, "professional": 3}


def clean(value: Any) -> str:
    return str(value or "").replace("\r", " ").replace("\n", " ").strip()


def is_relevant(title: str) -> bool:
    lowered = title.casefold()
    return any(marker in lowered for marker in AOE_MARKERS)


def run_search(query: Query, limit: int) -> list[dict[str, Any]]:
    command = [
        "python",
        "-m",
        "yt_dlp",
        "--flat-playlist",
        "--dump-single-json",
        f"ytsearch{limit}:{query.text}",
    ]
    completed = subprocess.run(
        command,
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    payload = json.loads(completed.stdout)
    entries = payload.get("entries") if isinstance(payload, dict) else None
    return [entry for entry in entries or [] if isinstance(entry, dict)]


def classify(title: str, query: Query) -> tuple[str, str]:
    lowered = title.casefold()
    if query.difficulty == "professional" or any(
        token in lowered for token in ("pro player", "professional", "tournament", "coaching", "analysis")
    ):
        difficulty = "professional"
    elif any(token in lowered for token in ("advanced", "masterclass", "high level", "top 100", "pros")):
        difficulty = "advanced"
    elif any(token in lowered for token in ("beginner", "new player", "newbie", "basics", "starter")):
        difficulty = "beginner"
    else:
        difficulty = query.difficulty

    if any(token in lowered for token in ("farm", "food", "economy", "eco", "boom", "build order", "2 tc", "town center")):
        block = "economy"
    elif any(token in lowered for token in ("micro", "kite", "counter", "army", "unit", "fight", "combat")):
        block = "military"
    elif any(token in lowered for token in ("hotkey", "control group", "mechanic", "shortcut", "settings")):
        block = "mechanics"
    elif any(token in lowered for token in ("team", "2v2", "3v3", "4v4", "co-op")):
        block = "team"
    elif any(token in lowered for token in ("civ", "civilization", "english", "french", "mongol", "chinese")):
        block = "civilizations"
    elif any(token in lowered for token in ("map", "position", "deer", "relic", "scout", "scouting")):
        block = "map"
    else:
        block = query.block
    return difficulty, block


def ts(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit-per-query", type=int, default=100)
    parser.add_argument("--target", type=int, default=1000)
    args = parser.parse_args()
    if args.limit_per_query < 1 or args.target < 1:
        raise SystemExit("--limit-per-query and --target must be positive")

    chosen: dict[str, dict[str, Any]] = {}
    failures: list[str] = []
    for query_index, query in enumerate(QUERIES):
        try:
            entries = run_search(query, args.limit_per_query)
        except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
            failures.append(f"{query.text}: {error}")
            continue
        for rank, entry in enumerate(entries, start=1):
            video_id = clean(entry.get("id"))
            title = clean(entry.get("title"))
            # The query itself is AoE4-scoped.  Many strong videos omit the
            # game name from the title, so title-only filtering would discard
            # useful material such as matchup and civilization lessons.
            if not video_id or not title or any(marker in title.casefold() for marker in OTHER_GAME_MARKERS):
                continue
            difficulty, block = classify(title, query)
            candidate = {
                "id": video_id,
                "title": title,
                "channel": clean(entry.get("channel") or entry.get("uploader")) or "YouTube",
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "difficulty": difficulty,
                "block": block,
                "query": query.text,
                "queryRank": rank,
                "views": entry.get("view_count") if isinstance(entry.get("view_count"), int) else None,
                "durationSec": entry.get("duration") if isinstance(entry.get("duration"), int) else None,
                "queryIndex": query_index,
            }
            previous = chosen.get(video_id)
            if previous is None or (query_index, rank) < (previous["queryIndex"], previous["queryRank"]):
                chosen[video_id] = candidate

    records = list(chosen.values())
    records.sort(
        key=lambda item: (
            DIFFICULTY_ORDER[item["difficulty"]],
            item["queryIndex"],
            item["queryRank"],
            -(item["views"] or 0),
            item["title"].casefold(),
        )
    )
    # Keep a visible professional slice even though the primary ordering is
    # beginner-first; otherwise a target-sized cut would discard the last
    # difficulty level whenever discovery returns more than the target.
    professional = [item for item in records if item["difficulty"] == "professional"]
    if len(records) > args.target and professional:
        professional_count = min(len(professional), max(20, args.target // 20))
        non_professional = [item for item in records if item["difficulty"] != "professional"]
        records = non_professional[: args.target - professional_count] + professional[:professional_count]
        records.sort(
            key=lambda item: (
                DIFFICULTY_ORDER[item["difficulty"]],
                item["queryIndex"],
                item["queryRank"],
                -(item["views"] or 0),
                item["title"].casefold(),
            )
        )
    else:
        records = records[: args.target]
    for index, item in enumerate(records, start=1):
        item["rank"] = index
        item.pop("queryIndex", None)

    generated = [
        "// Generated by scripts/harvest_guide_catalog.py; do not hand-edit.",
        f"// Discovery date: {date.today().isoformat()}; source: YouTube search, {len(QUERIES)} topic queries.",
        "",
        "export type GuideCatalogDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'professional'",
        "export type GuideCatalogBlock = 'fundamentals' | 'economy' | 'military' | 'mechanics' | 'map' | 'team' | 'civilizations' | 'strategy' | 'professional'",
        "",
        "export interface GuideCatalogEntry {",
        "  rank: number",
        "  id: string",
        "  title: string",
        "  channel: string",
        "  url: string",
        "  difficulty: GuideCatalogDifficulty",
        "  block: GuideCatalogBlock",
        "  query: string",
        "  queryRank: number",
        "  views: number | null",
        "  durationSec: number | null",
        "}",
        "",
        "export const GUIDE_CATALOG: readonly GuideCatalogEntry[] = ",
        json.dumps(records, ensure_ascii=False, indent=2),
        ";",
        "",
        "export const GUIDE_CATALOG_DISCOVERY = {",
        f"  target: {args.target},",
        f"  collected: {len(records)},",
        f"  queries: {len(QUERIES)},",
        f"  failures: {json.dumps(failures, ensure_ascii=False)},",
        f"  checkedAt: {ts(date.today().isoformat())},",
        "} as const",
        "",
    ]
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(generated), encoding="utf-8")
    print(f"wrote {len(records)} entries to {output}")
    if failures:
        print("search failures:")
        print("\n".join(failures))
    return 0 if len(records) >= args.target else 2


if __name__ == "__main__":
    raise SystemExit(main())
