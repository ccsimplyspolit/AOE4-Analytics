"""Synchronise the public aoe4guides build-order API into the Cellar.

The API intentionally returns at most ten builds per request.  We therefore
query the four sort orders documented by the Orda client and deduplicate the
results by civilization + ordered steps.  This gives the archive a much wider
and more reproducible slice than a single "top ten" request, while keeping the
provider's public API limits visible in the output.

Examples:
    python scripts/sync_aoe4guides.py --dry-run
    python scripts/sync_aoe4guides.py --limit-per-query 10
    python scripts/sync_aoe4guides.py --civ FRE --order score,timeCreated
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "src" / "data" / "buildOrders" / "imported"
API_BASE = "https://aoe4guides.com/api"
USER_AGENT = "RTSLytics/0.5 (+public-source-sync)"

# The codes mirror Orda's typed Civilization enum and aoe4-guides' public API.
CIVILIZATIONS = (
    "ABB",
    "AYY",
    "BYZ",
    "CHI",
    "DEL",
    "ENG",
    "FRE",
    "HRE",
    "JAP",
    "JDA",
    "MAL",
    "MON",
    "DRA",
    "OTT",
    "RUS",
    "ZXL",
    "HOL",
    "KTE",
    "GOH",
    "MAC",
    "SEN",
    "TUG",
    "JIN",
)
SORT_ORDERS = ("score", "timeCreated", "views", "likes")


def fetch_json(path: str, params: dict[str, str] | None = None) -> Any:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(
        f"{API_BASE}{path}{query}",
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower().replace("'", ""))
    return result.strip("-") or "build"


def fingerprint(build: dict[str, Any]) -> str:
    payload = {
        "civilization": build.get("civilization"),
        "build_order": build.get("build_order"),
    }
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def extract_builds(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                yield item


def valid_build(build: dict[str, Any]) -> bool:
    if not isinstance(build.get("name"), str) or not build["name"].strip():
        return False
    if not isinstance(build.get("civilization"), str):
        return False
    steps = build.get("build_order")
    if not isinstance(steps, list) or not steps:
        return False
    return all(
        isinstance(step, dict)
        and isinstance(step.get("age"), (int, float))
        and isinstance(step.get("villager_count"), (int, float))
        and isinstance(step.get("resources"), dict)
        and isinstance(step.get("notes"), list)
        for step in steps
    )


def read_existing(output_dir: Path) -> set[str]:
    fingerprints: set[str] = set()
    if not output_dir.exists():
        return fingerprints
    for path in output_dir.glob("*.json"):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(document, dict) and "build_order" in document:
            fingerprints.add(fingerprint(document))
    return fingerprints


def normalize(raw: dict[str, Any], updated_at: str, patch: str | None) -> dict[str, Any]:
    """Keep the overlay-compatible build while preserving provider metadata."""
    build = {
        key: raw[key]
        for key in (
            "name",
            "civilization",
            "author",
            "source",
            "build_order",
            "description",
            "video",
            "season",
            "map",
            "strategy",
            "score",
            "scoreAllTime",
            "views",
            "likes",
            "upvotes",
            "timeCreated",
            "timeUpdated",
        )
        if key in raw
    }
    season = build.get("season")
    if isinstance(season, str):
        match = re.search(r"\d+", season)
        if match:
            build["season"] = int(match.group(0))
        else:
            build.pop("season", None)
    build["origin"] = "imported"
    build["schemaVersion"] = 1
    build["provider"] = "aoe4guides"
    build["capturedAt"] = updated_at
    build["updatedAt"] = updated_at
    if patch:
        build["patch"] = patch
    return build


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--civ",
        action="append",
        dest="civs",
        help="Civilization code, repeatable (default: all 23 civs)",
    )
    parser.add_argument(
        "--order",
        default=",".join(SORT_ORDERS),
        help="Comma-separated provider sort orders (default: score,timeCreated,views,likes)",
    )
    parser.add_argument("--limit-per-query", type=int, default=10)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--patch", default=None, help="Optional patch label for imported builds")
    parser.add_argument("--delay", type=float, default=0.25, help="Seconds between requests")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    civs = tuple(code.upper() for code in (args.civs or CIVILIZATIONS))
    unknown = sorted(set(civs) - set(CIVILIZATIONS))
    if unknown:
        print(f"unknown civilization code(s): {', '.join(unknown)}", file=sys.stderr)
        return 2
    orders = tuple(order.strip() for order in args.order.split(",") if order.strip())
    unknown_orders = sorted(set(orders) - set(SORT_ORDERS))
    if unknown_orders:
        print(f"unknown sort order(s): {', '.join(unknown_orders)}", file=sys.stderr)
        return 2
    if args.limit_per_query < 1 or args.limit_per_query > 10:
        print("--limit-per-query must be between 1 and 10", file=sys.stderr)
        return 2

    try:
        status = fetch_json("/status")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"aoe4guides API unavailable: {error}", file=sys.stderr)
        return 1
    if not isinstance(status, dict) or status.get("status") != "running":
        print(f"unexpected aoe4guides API status: {status!r}", file=sys.stderr)
        return 1

    updated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    output_dir = args.output_dir.resolve()
    seen = read_existing(output_dir)
    fetched = imported = skipped = invalid = 0
    output_dir.mkdir(parents=True, exist_ok=True) if not args.dry_run else None

    for civ in civs:
        for order in orders:
            try:
                response = fetch_json(
                    "/builds",
                    {
                        "civ": civ,
                        "orderBy": order,
                        "overlay": "true",
                    },
                )
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
                print(f"[error] {civ}/{order}: {error}", file=sys.stderr)
                continue

            builds = list(extract_builds(response))[: args.limit_per_query]
            fetched += len(builds)
            for raw in builds:
                if not valid_build(raw):
                    invalid += 1
                    continue
                build = normalize(raw, updated_at, args.patch)
                key = fingerprint(build)
                if key in seen:
                    skipped += 1
                    continue
                seen.add(key)
                output_path = output_dir / f"{slug(build['name'])}-{key[:10]}.json"
                if not args.dry_run:
                    output_path.write_text(
                        json.dumps(build, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                imported += 1
            print(f"[fetch] {civ} {order}: {len(builds)}")
            if args.delay > 0:
                time.sleep(args.delay)

    action = "would import" if args.dry_run else "imported"
    if not args.dry_run:
        manifest = {
            "schemaVersion": 1,
            "sourceId": "aoe4guides",
            "sourceUrl": "https://aoe4guides.com/",
            "sourceRevision": status.get("version") if isinstance(status, dict) else None,
            "patch": args.patch,
            "capturedAt": updated_at,
            "records": {
                "fetched": fetched,
                "imported": imported,
                "duplicates": skipped,
                "invalid": invalid,
            },
        }
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "_source-snapshot.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print(
        f"Done: fetched {fetched}, {action} {imported}, "
        f"skipped duplicates {skipped}, invalid {invalid}."
    )
    return 1 if invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
