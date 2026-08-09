"""Sync the approved AoE4World curated content catalogue.

The upstream repository is a small, human-reviewed index of guides, videos,
and analysed games.  It is useful evidence for the Explorer and build coach,
but it is not a ranked-statistics source, so this script keeps provenance and
does not turn curated entries into meta claims.

Examples:
    python scripts/sync_aoe4world_curated.py --dry-run
    python scripts/sync_aoe4world_curated.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "src" / "data" / "vendor" / "aoe4world-curated" / "content.json"
DEFAULT_REPORT = ROOT / "data" / "research" / "aoe4world-curated.json"
SOURCE_REPOSITORY = "aoe4world/curated"
SOURCE_URL = "https://github.com/aoe4world/curated"
CONTENT_URL = "https://raw.githubusercontent.com/aoe4world/curated/main/data/content.json"
FEATURED_URL = "https://raw.githubusercontent.com/aoe4world/curated/main/data/featured.json"
REPOSITORY_GIT_URL = f"https://github.com/{SOURCE_REPOSITORY}.git"
USER_AGENT = "RTSLytics/0.5 (+aoe4world-curated-sync)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--dry-run", action="store_true", help="Fetch and validate without writing")
    return parser.parse_args()


def fetch_json(url: str, timeout: int) -> object:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def as_list(value: object) -> list[object]:
    return value if isinstance(value, list) else []


def strings(value: object) -> list[str]:
    return [item.strip() for item in as_list(value) if isinstance(item, str) and item.strip()]


def text(value: object) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def duration_seconds(value: object) -> int | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return max(0, round(value))
    raw = text(value)
    if not raw:
        return None
    if raw.isdigit():
        return int(raw)
    match = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", raw.lower())
    if not match or not any(match.groups()):
        return None
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def entry_key(raw: dict[str, object]) -> str:
    youtube = raw.get("youtube_data")
    video_id = youtube.get("videoId") if isinstance(youtube, dict) else None
    url = text(raw.get("url"))
    identity = text(video_id) or url or text(raw.get("title")) or "unknown"
    return identity.casefold()


def stable_id(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def normalize_entry(raw: object, *, featured: bool) -> dict[str, object] | None:
    if not isinstance(raw, dict) or raw.get("approved") is not True:
        return None
    url = text(raw.get("url"))
    title = text(raw.get("title"))
    if not url or not title:
        return None
    youtube = raw.get("youtube_data") if isinstance(raw.get("youtube_data"), dict) else {}
    video_id = text(youtube.get("videoId"))
    key = entry_key(raw)
    return {
        "id": stable_id(key),
        "title": title,
        "type": text(raw.get("type")) or "Reference",
        "tags": strings(raw.get("tags")),
        "creator": text(raw.get("creator")),
        "creatorUrl": text(raw.get("creator_url")),
        "civilizations": strings(raw.get("civilizations")),
        "relatedItems": strings(raw.get("relatedItems")),
        "url": url,
        "description": text(raw.get("description")),
        "thumbnail": text(raw.get("thumbnail")),
        "featured": featured,
        "youtube": {
            "videoId": video_id,
            "channelId": text(youtube.get("channelId")),
            "durationSec": duration_seconds(youtube.get("videoDuration")),
        },
    }


def merge_entries(content: object, featured: object) -> list[dict[str, object]]:
    merged: dict[str, dict[str, object]] = {}
    for raw, is_featured in [
        *[(item, False) for item in as_list(content)],
        *[(item, True) for item in as_list(featured)],
    ]:
        normalized = normalize_entry(raw, featured=is_featured)
        if normalized is None:
            continue
        key = entry_key(raw) if isinstance(raw, dict) else normalized["id"]
        previous = merged.get(key)
        if previous is None:
            merged[key] = normalized
        elif is_featured:
            previous["featured"] = True
    return sorted(
        merged.values(),
        key=lambda item: (
            not bool(item.get("featured")),
            str(item.get("civilizations", [""])[0] if item.get("civilizations") else "").casefold(),
            str(item.get("title", "")).casefold(),
        ),
    )


def resolve_source_revision(timeout: int) -> str:
    result = subprocess.run(
        ["git", "ls-remote", REPOSITORY_GIT_URL, "refs/heads/main"],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.strip() or "git ls-remote failed")
    fields = result.stdout.strip().split()
    revision = fields[0] if fields else ""
    if len(revision) != 40 or any(char not in "0123456789abcdef" for char in revision.lower()):
        raise ValueError("GitHub did not return a valid curated commit SHA")
    return revision


def build_snapshot(
    content: object,
    featured: object,
    captured_at: str,
    source_revision: str,
) -> dict[str, object]:
    items = merge_entries(content, featured)
    featured_count = sum(1 for item in items if item.get("featured") is True)
    videos = sum(1 for item in items if str(item.get("type", "")).casefold() == "video")
    descriptions = sum(1 for item in items if item.get("description"))
    return {
        "schemaVersion": 1,
        "source": SOURCE_REPOSITORY,
        "sourceUrl": SOURCE_URL,
        "contentUrl": CONTENT_URL,
        "featuredUrl": FEATURED_URL,
        "branch": "main",
        "sourceRevision": source_revision,
        "sourceCommitUrl": f"https://github.com/{SOURCE_REPOSITORY}/commit/{source_revision}",
        "capturedAt": captured_at,
        "items": items,
        "counts": {
            "items": len(items),
            "featured": featured_count,
            "videos": videos,
            "descriptions": descriptions,
            "civilizations": len({civ for item in items for civ in strings(item.get("civilizations"))}),
        },
    }


def resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def main() -> int:
    args = parse_args()
    if args.timeout < 1 or args.timeout > 300:
        raise SystemExit("--timeout must be between 1 and 300 seconds")
    try:
        content = fetch_json(CONTENT_URL, args.timeout)
        featured = fetch_json(FEATURED_URL, args.timeout)
        source_revision = resolve_source_revision(args.timeout)
        snapshot = build_snapshot(
            content,
            featured,
            datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            source_revision,
        )
    except (
        HTTPError,
        URLError,
        OSError,
        json.JSONDecodeError,
        ValueError,
        subprocess.SubprocessError,
    ) as error:
        print(f"aoe4world/curated sync failed: {error}")
        return 1

    print(
        "[curated] "
        f"{snapshot['counts']['items']} approved items, "
        f"{snapshot['counts']['featured']} featured, "
        f"{snapshot['counts']['videos']} videos"
    )
    if args.dry_run:
        print("[curated] dry-run: no files written")
        return 0

    output = resolve_path(args.output)
    report = resolve_path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n"
    output.write_text(encoded, encoding="utf-8")
    report.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[curated] bundle: {output.resolve()}")
    print(f"[curated] report: {report.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
