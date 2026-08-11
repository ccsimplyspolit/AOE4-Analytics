"""Synchronise the public aoe4guides build-order API into the Cellar.

The API intentionally returns at most ten builds per request and does not
expose pagination.  There is no honest way to claim that one run downloaded
every build on the site.  Instead we enumerate every documented civilization
and sort slice, plus the endpoint's no-sort/default slice, save every raw
response locally, and deduplicate the reachable sample by civilization +
ordered steps.  The manifest records the exact request coverage and limits.

Examples:
    python scripts/sync_aoe4guides.py --dry-run
    python scripts/sync_aoe4guides.py --limit-per-query 10
    python scripts/sync_aoe4guides.py --civ FRE --order score,timeCreated
    python scripts/sync_aoe4guides.py --refresh-cache
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
DEFAULT_CACHE = ROOT / "data" / "research" / "build-orders" / "aoe4guides-api-cache"
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
DEFAULT_SLICE = "default"


def fetch_json(path: str, params: dict[str, str] | None = None) -> Any:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(
        f"{API_BASE}{path}{query}",
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def cache_key(civ: str, order: str) -> str:
    return f"{civ.lower()}--{slug(order)}"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--patch", default=None, help="Optional patch label for imported builds")
    parser.add_argument("--delay", type=float, default=0.25, help="Seconds between requests")
    parser.add_argument(
        "--refresh-cache",
        action="store_true",
        help="Refetch cached API slices instead of using the local raw response",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use only local cache files; fail if a requested slice is missing",
    )
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
    if args.offline and args.refresh_cache:
        print("--offline cannot be combined with --refresh-cache", file=sys.stderr)
        return 2

    # The undocumented/no-sort request is a useful additional discovery slice
    # and is deliberately named "default" rather than pretending it is a
    # fifth documented sort order.
    order_slices: tuple[tuple[str, str | None], ...] = ((DEFAULT_SLICE, None),) + tuple(
        (order, order) for order in orders
    )

    if args.offline:
        status: Any = {"status": "running", "version": None}
    else:
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
    cache_dir = args.cache_dir.resolve()
    seen = read_existing(output_dir)
    api_seen: set[str] = set()
    fetched = imported = skipped = invalid = 0
    raw_records = 0
    cache_hits = cache_misses = 0
    request_failures: list[dict[str, str]] = []
    request_manifest: list[dict[str, Any]] = []
    output_dir.mkdir(parents=True, exist_ok=True) if not args.dry_run else None
    cache_dir.mkdir(parents=True, exist_ok=True)

    for civ in civs:
        for order_name, order_param in order_slices:
            params = {"civ": civ, "overlay": "true"}
            if order_param is not None:
                params["orderBy"] = order_param
            query = f"?{urlencode(params)}"
            cache_path = cache_dir / f"{cache_key(civ, order_name)}.json"
            request_record: dict[str, Any] = {
                "civilization": civ,
                "slice": order_name,
                "orderBy": order_param,
                "path": "/builds",
                "query": query,
                "url": f"{API_BASE}/builds{query}",
                "cacheFile": cache_path.name,
            }
            try:
                if cache_path.exists() and not args.refresh_cache:
                    response = read_json(cache_path)
                    request_record["source"] = "cache"
                    cache_hits += 1
                elif args.offline:
                    raise FileNotFoundError(f"offline cache is missing: {cache_path}")
                else:
                    response = fetch_json("/builds", params)
                    if not args.dry_run:
                        write_json(cache_path, response)
                    request_record["source"] = "network"
                    cache_misses += 1
            except (OSError, HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
                request_record["error"] = str(error)
                request_failures.append({"civilization": civ, "slice": order_name, "error": str(error)})
                print(f"[error] {civ}/{order_name}: {error}", file=sys.stderr)
                request_manifest.append(request_record)
                continue

            builds = list(extract_builds(response))[: args.limit_per_query]
            fetched += len(builds)
            raw_records += len(builds)
            request_record["records"] = len(builds)
            request_record["capturedAt"] = updated_at
            request_manifest.append(request_record)
            for raw in builds:
                if not valid_build(raw):
                    invalid += 1
                    continue
                build = normalize(raw, updated_at, args.patch)
                key = fingerprint(build)
                api_seen.add(key)
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
            print(f"[fetch] {civ} {order_name}: {len(builds)} ({request_record['source']})")
            if args.delay > 0:
                time.sleep(args.delay)

    action = "would import" if args.dry_run else "imported"
    if not args.dry_run:
        manifest = {
            "schemaVersion": 2,
            "sourceId": "aoe4guides",
            "sourceUrl": "https://aoe4guides.com/",
            "sourceRevision": status.get("version") if isinstance(status, dict) else None,
            "patch": args.patch,
            "capturedAt": updated_at,
            "coverage": {
                "civilizations": list(civs),
                "slices": [name for name, _ in order_slices],
                "documentedSorts": list(orders),
                "defaultSliceIncluded": True,
                "apiLimitPerRequest": args.limit_per_query,
                "pagination": "not exposed by provider; this is all reachable query slices, not a claim of the complete site",
            },
            "records": {
                "fetched": fetched,
                "imported": imported,
                "duplicates": skipped,
                "invalid": invalid,
                "rawRecords": raw_records,
                "reachableUnique": len(api_seen),
            },
            "requests": request_manifest,
            "requestFailures": request_failures,
            "cache": {
                "directory": str(cache_dir.relative_to(ROOT)),
                "hits": cache_hits,
                "misses": cache_misses,
                "files": len(request_manifest) - len(request_failures),
            },
        }
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "_source-snapshot.json", manifest)
        write_json(cache_dir / "_manifest.json", manifest)
    print(
        f"Done: fetched {fetched}, {action} {imported}, "
        f"skipped duplicates {skipped}, invalid {invalid}, "
        f"cache hits {cache_hits}, cache misses {cache_misses}."
    )
    return 1 if invalid or request_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
