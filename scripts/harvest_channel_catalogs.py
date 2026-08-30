#!/usr/bin/env python3
"""Enumerate EVERY public Valdemar + Beastyqt upload in a date window.

Uses yt-dlp flat playlist on the channel Videos / Shorts / Streams tabs
(not a curated subset). Writes a resumable raw dump, then merges into
data/beastyCatalog.json and data/valdemarCatalog.json.

Examples:
  python scripts/harvest_channel_catalogs.py --list-only
  python scripts/harvest_channel_catalogs.py --write-catalogs
  python scripts/harvest_channel_catalogs.py --fetch-subs --subs-limit 40
  python scripts/resume_creator_transcripts.py --subs-limit 25

Listing command equivalent:
  yt-dlp --flat-playlist --dateafter 20230822 --extractor-args youtubetab:approximate_date URL
  where URL is the channel /videos, /shorts, or /streams tab (or UU… uploads playlist).
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from neodlp_toolchain import apply_ytdlp_options, ensure_pot_server, resolve_neodlp_home

try:
    import yt_dlp
except ImportError as exc:
    raise SystemExit('Install yt-dlp first: python -m pip install yt-dlp') from exc

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SRC_DATA = ROOT / 'src' / 'data'
RESEARCH = DATA / 'research'
RAW_DIR = RESEARCH / 'channel_catalogs'
VALDEMAR_TRANSCRIPTS = RESEARCH / 'valdemar_transcripts'
BEASTY_TRANSCRIPTS = RESEARCH / 'beasty_transcripts'

DATE_AFTER = '20230822'
DATE_BEFORE = '20260823'
WINDOW_START = datetime(2023, 8, 22, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 8, 22, 23, 59, 59, tzinfo=timezone.utc)

CHANNELS = (
    {
        'creator': 'valdemar',
        'label': 'Valdemar1902',
        'tabs': (
            'https://www.youtube.com/channel/UCyzgM7IMV8AXN8suRSyNhiQ/videos',
            'https://www.youtube.com/channel/UCyzgM7IMV8AXN8suRSyNhiQ/shorts',
            'https://www.youtube.com/channel/UCyzgM7IMV8AXN8suRSyNhiQ/streams',
        ),
        'catalog_json': DATA / 'valdemarCatalog.json',
        'generated_ts': SRC_DATA / 'valdemarCatalog.generated.ts',
    },
    {
        'creator': 'beastyqt',
        'label': 'Beastyqt',
        'tabs': (
            'https://www.youtube.com/@BeastyqtSC2/videos',
            'https://www.youtube.com/@BeastyqtSC2/shorts',
            'https://www.youtube.com/@BeastyqtSC2/streams',
        ),
        'catalog_json': DATA / 'beastyCatalog.json',
        'generated_ts': SRC_DATA / 'beastyCatalog.generated.ts',
    },
)

CIVS: dict[str, tuple[str, ...]] = {
    'abbasid_dynasty': ('Abbasid', 'Abbasid Dynasty', 'Abba'),
    'ayyubids': ('Ayyubids', 'Ayyubid'),
    'byzantines': ('Byzantines', 'Byzantine', 'Byz'),
    'chinese': ('Chinese', 'China'),
    'delhi_sultanate': ('Delhi', 'Delhi Sultanate'),
    'english': ('English', 'Eng'),
    'french': ('French',),
    'golden_horde': ('Golden Horde', 'GH'),
    'house_of_lancaster': ('House of Lancaster', 'Lancaster', 'HOL'),
    'holy_roman_empire': ('Holy Roman Empire', 'HRE'),
    'japanese': ('Japanese', 'Japan'),
    'jeanne_darc': ("Jeanne d'Arc", 'Jeanne d Arc', 'Jeanne', 'Joan of Arc', 'JDA'),
    'jin_dynasty': ('Jin Dynasty', 'Jin'),
    'knights_templar': ('Knights Templar', 'Templar', 'KT'),
    'malians': ('Malians', 'Mali'),
    'macedonian_dynasty': ('Macedonian Dynasty', 'Macedonian', 'Macedonians'),
    'mongols': ('Mongols', 'Mongol'),
    'order_of_the_dragon': ('Order of the Dragon', 'OOTD', 'Dragon'),
    'ottomans': ('Ottomans', 'Ottoman', 'Otto'),
    'rus': ('Rus',),
    'sengoku_daimyo': ('Sengoku Daimyo', 'Sengoku'),
    'tughlaq_dynasty': ('Tughlaq Dynasty', 'Tughlaq'),
    'zhu_xis_legacy': ("Zhu Xi's Legacy", 'Zhu Xi', 'Zhu Xi Legacy', 'ZXL'),
}

AOE4_MARKERS = (
    'aoe4', 'aoe 4', 'age of empires 4', 'age of empires iv', 'age of empires 4',
    'valdy', 'valdemar', 'conqueror', 'feudal', 'castle age', '2tc', '2 tc',
)
NON_AOE4_MARKERS = (
    'starcraft', 'sc2', 'star craft', 'stormgate', 'warcraft', 'aoe2', 'aoe 2',
    'age of empires ii', 'age of mythology', 'aoe3',
)
PRIORITY_TITLE = (
    'build order', 'build', 'guide', 'masterclass', 'how to', 'civ',
    'opening', 'fast castle', '2tc', 'coaching', 'analysis', 'replay',
    'macro', 'micro', 'tier list', 'matchup',
)

YT_ID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
VTT_TS_RE = re.compile(r'^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s+-->')
SKIP_LOG_PATH = RAW_DIR / 'caption_skip.json'
CATEGORY_PRIORITY = {
    'build_order': 0,
    'civ_guide': 1,
    'match_analysis': 2,
    'mechanics': 3,
    'mechanics_fundamentals': 3,
    'tier_list': 4,
    'tier_list_meta': 4,
}


class QuietLogger:
    def debug(self, _message: str) -> None:
        pass

    def warning(self, _message: str) -> None:
        pass

    def error(self, message: str) -> None:
        print(message, file=sys.stderr)


def classify_video(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ['coach', 'mistake', 'hardstuck', 'replay', 'analysis', 'cast', 'pro game', ' vs ', 'against']):
        return 'match_analysis'
    if any(k in t for k in ['build order', 'opening', 'boom', 'fast castle', 'all in', 'all-in', 'rush', '2tc', 'pro scout']):
        return 'build_order'
    if any(k in t for k in ['tier list', 'tierlist', 'meta', 'patch', 'update', 'best civ']):
        return 'tier_list_meta'
    if any(k in t for k in ['tip', 'micro', 'macro', 'mechanic', 'hotkey', 'defense', 'counter']):
        return 'mechanics_fundamentals'
    if any(k in t for k in ['guide', 'how to play', 'masterclass', 'overview']):
        return 'civ_guide'
    return 'civ_guide'


def detect_civs(title: str) -> tuple[list[str], list[str]]:
    primary: list[str] = []
    opponents: list[str] = []
    t = title.lower()
    for slug, aliases in CIVS.items():
        if any(re.search(rf'\b{re.escape(a.lower())}\b', t) for a in aliases):
            if slug not in primary:
                primary.append(slug)
    vs_match = re.search(r'(?:vs\.?|against)\s+([a-zA-Z\s\']+)', title, re.IGNORECASE)
    if vs_match:
        target = vs_match.group(1).lower()
        for slug, aliases in CIVS.items():
            if any(re.search(rf'\b{re.escape(a.lower())}\b', target) for a in aliases):
                if slug in primary:
                    primary.remove(slug)
                if slug not in opponents:
                    opponents.append(slug)
    return primary, opponents


def is_aoe4_relevant(title: str, duration: int | None, creator: str) -> bool:
    t = title.lower()
    if any(marker in t for marker in NON_AOE4_MARKERS) and not any(marker in t for marker in AOE4_MARKERS):
        return False
    if any(marker in t for marker in AOE4_MARKERS):
        return True
    if creator == 'valdemar':
        return True
    if duration is not None and duration < 90 and not any(k in t for k in PRIORITY_TITLE):
        return False
    return any(k in t for k in PRIORITY_TITLE) or 'aoe' in t or 'empires' in t


def parse_date(entry: dict[str, Any]) -> datetime | None:
    for key in ('timestamp', 'release_timestamp'):
        value = entry.get(key)
        if isinstance(value, (int, float)) and value > 0:
            return datetime.fromtimestamp(value, tz=timezone.utc)
    upload = entry.get('upload_date') or entry.get('release_date')
    if isinstance(upload, str) and len(upload) >= 8 and upload[:8].isdigit():
        return datetime.strptime(upload[:8], '%Y%m%d').replace(tzinfo=timezone.utc)
    return None


def in_window(entry: dict[str, Any]) -> bool:
    parsed = parse_date(entry)
    if parsed is None:
        return True
    return WINDOW_START <= parsed <= WINDOW_END


def fmt_duration(seconds: int) -> str:
    seconds = max(0, int(seconds))
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f'{hours}:{minutes:02d}:{secs:02d}'
    return f'{minutes}:{secs:02d}'


def list_tab(url: str) -> list[dict[str, Any]]:
    options = apply_ytdlp_options({
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'extract_flat': True,
        'skip_download': True,
        'playlistend': 5000,
        'extractor_args': {'youtubetab': {'approximate_date': ['']}},
        'logger': QuietLogger(),
        'dateafter': DATE_AFTER,
    })
    print(f'yt-dlp --flat-playlist --dateafter {DATE_AFTER} --extractor-args youtubetab:approximate_date {url}', flush=True)
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=False) or {}
    entries = info.get('entries') if isinstance(info, dict) else None
    rows: list[dict[str, Any]] = []
    for entry in entries or []:
        if not isinstance(entry, dict) or not entry.get('id'):
            continue
        rows.append(entry)
    print(f'  -> {len(rows)} entries', flush=True)
    return rows


def list_channel(spec: dict[str, Any]) -> list[dict[str, Any]]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    cache = RAW_DIR / f"{spec['creator']}_raw_entries.json"
    merged: dict[str, dict[str, Any]] = {}
    for url in spec['tabs']:
        for entry in list_tab(url):
            video_id = str(entry.get('id') or '')
            if not YT_ID_RE.match(video_id):
                continue
            prev = merged.get(video_id)
            if prev is None:
                merged[video_id] = entry
            else:
                for key in ('timestamp', 'upload_date', 'duration', 'view_count', 'title'):
                    if prev.get(key) in (None, '', 0) and entry.get(key) not in (None, '', 0):
                        prev[key] = entry[key]
    rows = list(merged.values())
    cache.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {len(rows)} unique ids to {cache}', flush=True)
    return rows


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def load_skip_log() -> dict[str, dict[str, str]]:
    payload = load_json(SKIP_LOG_PATH)
    if not isinstance(payload, dict):
        return {}
    by_id = payload.get('byId') if isinstance(payload.get('byId'), dict) else payload
    return {
        str(video_id): value
        for video_id, value in by_id.items()
        if isinstance(video_id, str) and isinstance(value, dict)
    }


def save_skip_log(skip: dict[str, dict[str, str]]) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SKIP_LOG_PATH.write_text(
        json.dumps({'updatedAt': datetime.now(timezone.utc).isoformat(), 'byId': skip}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )


def classify_caption_error(message: str) -> str:
    lowered = message.lower()
    if 'members-only' in lowered or 'join this channel' in lowered:
        return 'members_only'
    if any(token in lowered for token in ('429', 'requestblocked', 'ipblocked', 'too many requests', 'blocking requests from your ip')):
        return 'ip_blocked'
    if 'no transcripts were found' in lowered or 'subtitles are disabled' in lowered or 'no automatic captions' in lowered:
        return 'no_captions'
    if 'private video' in lowered or 'video unavailable' in lowered:
        return 'unavailable'
    return 'error'


def parse_vtt_snippets(raw: str) -> list[dict[str, Any]]:
    snippets: list[dict[str, Any]] = []
    previous = ''
    pending_start: float | None = None
    pending_lines: list[str] = []

    def flush() -> None:
        nonlocal previous, pending_start, pending_lines
        text = ' '.join(pending_lines).strip()
        text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', text))).strip()
        if text and text != previous and pending_start is not None:
            snippets.append({'text': text, 'start': float(pending_start), 'duration': 0.0})
            previous = text
        pending_lines = []
        pending_start = None

    for line in raw.splitlines():
        value = line.strip()
        match = VTT_TS_RE.match(value)
        if match:
            flush()
            hours = int(match.group(1) or 0)
            pending_start = hours * 3600 + int(match.group(2)) * 60 + int(match.group(3)) + int(match.group(4)) / 1000
            continue
        if not value or value.upper() == 'WEBVTT' or value.startswith('NOTE') or value.startswith('Kind:') or value.startswith('Language:'):
            continue
        if pending_start is not None:
            pending_lines.append(value)
    flush()
    return snippets


def existing_by_id(path: Path) -> dict[str, dict[str, Any]]:
    payload = load_json(path)
    if not isinstance(payload, list):
        return {}
    return {
        str(item['id']): item
        for item in payload
        if isinstance(item, dict) and isinstance(item.get('id'), str)
    }


def transcript_status(creator: str, video_id: str) -> tuple[str, int, str | None]:
    folder = VALDEMAR_TRANSCRIPTS if creator == 'valdemar' else BEASTY_TRANSCRIPTS
    cached = load_json(folder / f'{video_id}.json')
    if isinstance(cached, dict):
        snippets = cached.get('snippets')
        if isinstance(snippets, list) and snippets:
            text = ' '.join(str(s.get('text') or '') for s in snippets[:10]).strip()
            return 'available', len(snippets), (text[:280] + '...') if len(text) > 280 else text
    if creator == 'beastyqt' and video_id in {'vrH85EESrSY', 'FdJFDsXr4ws'}:
        return 'available', 0, None
    return 'unavailable', 0, None


def to_catalog_row(
    creator: str,
    entry: dict[str, Any],
    previous: dict[str, Any] | None,
    skip: dict[str, dict[str, str]] | None = None,
) -> dict[str, Any]:
    video_id = str(entry['id'])
    title = str(entry.get('title') or (previous or {}).get('title') or video_id)
    duration = int(entry.get('duration') or (previous or {}).get('durationSec') or 0)
    published = parse_date(entry)
    published_at = published.strftime('%Y-%m-%d') if published else str((previous or {}).get('publishedAt') or '')
    category = classify_video(title)
    primary, opponents = detect_civs(title)
    status, snippets_count, excerpt = transcript_status(creator, video_id)
    skip_reason = str(((skip or {}).get(video_id) or {}).get('reason') or '')
    if status != 'available' and skip_reason == 'members_only':
        status = 'members_only'
    if previous:
        if previous.get('transcriptStatus') == 'available':
            status = 'available'
            snippets_count = int(previous.get('snippetsCount') or snippets_count)
            excerpt = previous.get('transcriptExcerpt') or excerpt
        if previous.get('primaryCivs') and not primary:
            primary = list(previous['primaryCivs'])
        if previous.get('opponentCivs') and not opponents:
            opponents = list(previous['opponentCivs'])
        if previous.get('category') and category == 'civ_guide':
            category = str(previous['category'])
    tactics = list(previous.get('keyTactics') or []) if previous else []
    summary = excerpt or title
    if previous and previous.get('summary') and status != 'available':
        # Keep an old summary only when it is not a fabricated excerpt for a fake id.
        if YT_ID_RE.match(str(previous.get('id') or '')):
            summary = str(previous.get('summary') or summary)
    row = {
        'id': video_id,
        'title': title,
        'url': f'https://www.youtube.com/watch?v={video_id}',
        'publishedAt': published_at,
        'durationSec': duration,
        'formattedDuration': fmt_duration(duration),
        'viewCount': int(entry.get('view_count') or (previous or {}).get('viewCount') or 0),
        'category': 'tier_list' if creator == 'beastyqt' and category == 'tier_list_meta' else (
            'mechanics' if creator == 'beastyqt' and category == 'mechanics_fundamentals' else (
                'general' if creator == 'beastyqt' and category not in {
                    'build_order', 'civ_guide', 'tier_list', 'match_analysis', 'mechanics',
                } else category
            )
        ),
        'primaryCivs': primary,
        'opponentCivs': opponents,
        'proPlayers': ['Beastyqt'] if creator == 'beastyqt' else list((previous or {}).get('proPlayers') or []),
        'transcriptStatus': status,
        'snippetsCount': snippets_count,
        'summary': summary,
        'keyTactics': tactics,
        'transcriptExcerpt': excerpt,
        'buildOrder': None,
        'aoe4Relevant': is_aoe4_relevant(title, duration or None, creator),
        'tabDurationKnown': duration > 0,
    }
    return row


def write_valdemar_ts(catalog: list[dict[str, Any]]) -> None:
    stats = {
        'totalVideos': len(catalog),
        'transcriptsAvailable': sum(1 for item in catalog if item.get('transcriptStatus') == 'available'),
        'categories': dict(Counter(item.get('category') or 'civ_guide' for item in catalog)),
        'updatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'windowStart': '2023-08-22',
        'windowEnd': '2026-08-22',
        'source': 'yt-dlp channel videos/shorts/streams tabs',
    }
    compact = []
    for item in catalog:
        compact.append({
            'id': item['id'],
            'title': item['title'],
            'url': item['url'],
            'durationSec': item['durationSec'],
            'publishedAt': item.get('publishedAt') or None,
            'category': item['category'] if item['category'] in {
                'match_analysis', 'civ_guide', 'build_order', 'mechanics_fundamentals', 'tier_list_meta',
            } else 'civ_guide',
            'primaryCivs': item['primaryCivs'],
            'opponentCivs': item['opponentCivs'],
            'proPlayers': item['proPlayers'],
            'transcriptStatus': item['transcriptStatus'] if item['transcriptStatus'] in {
                'available', 'members_only', 'unavailable',
            } else 'unavailable',
            'snippetsCount': item['snippetsCount'],
            'summary': item['summary'],
            'keyTactics': item.get('keyTactics') or [],
            'transcriptExcerpt': item.get('transcriptExcerpt'),
        })
    payload = json.dumps(compact, ensure_ascii=False, indent=2)
    stats_json = json.dumps(stats, indent=2)
    civ_lines = ['export const VALDEMAR_VIDEOS_BY_CIV: Readonly<Record<string, readonly ValdemarVideoEntry[]>> = {']
    for slug in sorted(CIVS):
        civ_lines.append(f"  '{slug}': VALDEMAR_VIDEOS.filter((v) => v.primaryCivs.includes('{slug}') || v.opponentCivs.includes('{slug}')),")
    civ_lines.append('}')
    SRC_DATA.joinpath('valdemarCatalog.generated.ts').write_text(
        '\n'.join([
            '/** Generated by scripts/harvest_channel_catalogs.py from yt-dlp channel tabs. */',
            '',
            'export type ValdemarVideoCategory =',
            "  | 'match_analysis'",
            "  | 'civ_guide'",
            "  | 'build_order'",
            "  | 'mechanics_fundamentals'",
            "  | 'tier_list_meta'",
            '',
            'export interface ValdemarTacticSnippet {',
            '  name: string',
            '  timeSec: number',
            '  timeFormatted: string',
            '  text: string',
            '}',
            '',
            'export interface ValdemarVideoEntry {',
            '  id: string',
            '  title: string',
            '  url: string',
            '  durationSec: number',
            '  publishedAt?: string | null',
            '  category: ValdemarVideoCategory',
            '  primaryCivs: string[]',
            '  opponentCivs: string[]',
            '  proPlayers: string[]',
            "  transcriptStatus: 'available' | 'members_only' | 'unavailable'",
            '  snippetsCount: number',
            '  summary: string',
            '  keyTactics: ValdemarTacticSnippet[]',
            '  transcriptExcerpt?: string | null',
            '}',
            '',
            f'export const VALDEMAR_CATALOG_STATS = {stats_json} as const',
            '',
            f'export const VALDEMAR_VIDEOS: readonly ValdemarVideoEntry[] = {payload}',
            '',
            'export const VALDEMAR_VIDEOS_BY_ID: ReadonlyMap<string, ValdemarVideoEntry> = new Map(',
            '  VALDEMAR_VIDEOS.map((v) => [v.id, v]),',
            ')',
            '',
            *civ_lines,
            '',
            'export const VALDEMAR_MATCH_ANALYSES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(',
            "  (v) => v.category === 'match_analysis',",
            ')',
            '',
            'export const VALDEMAR_BUILD_ORDERS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(',
            "  (v) => v.category === 'build_order',",
            ')',
            '',
            'export const VALDEMAR_CIV_GUIDES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(',
            "  (v) => v.category === 'civ_guide',",
            ')',
            '',
            'export const VALDEMAR_FUNDAMENTALS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(',
            "  (v) => v.category === 'mechanics_fundamentals' || v.category === 'tier_list_meta',",
            ')',
            '',
        ]),
        encoding='utf-8',
    )


def write_beasty_ts(catalog: list[dict[str, Any]]) -> None:
    compact = []
    for item in catalog:
        category = item['category']
        if category not in {'build_order', 'civ_guide', 'tier_list', 'match_analysis', 'mechanics', 'general'}:
            category = 'general'
        compact.append({
            'id': item['id'],
            'title': item['title'],
            'url': item['url'],
            'publishedAt': item.get('publishedAt') or '',
            'durationSec': item['durationSec'],
            'formattedDuration': item.get('formattedDuration') or fmt_duration(item['durationSec']),
            'viewCount': item.get('viewCount') or 0,
            'category': category,
            'primaryCivs': item['primaryCivs'],
            'opponentCivs': item['opponentCivs'],
            'proPlayers': item.get('proPlayers') or ['Beastyqt'],
            'summary': item['summary'],
            'keyTactics': [
                {'name': t.get('name', ''), 'text': t.get('text') or t.get('quote') or ''}
                for t in (item.get('keyTactics') or [])
                if isinstance(t, dict)
            ],
            'transcriptExcerpt': item.get('transcriptExcerpt'),
            'buildOrder': None,
            'transcriptStatus': item.get('transcriptStatus') or 'unavailable',
            'aoe4Relevant': bool(item.get('aoe4Relevant', True)),
        })
    payload = json.dumps(compact, ensure_ascii=False, indent=2)
    SRC_DATA.joinpath('beastyCatalog.generated.ts').write_text(
        '\n'.join([
            '/** Generated by scripts/harvest_channel_catalogs.py from yt-dlp @BeastyqtSC2 tabs. */',
            '',
            'export interface BeastyTacticalTip {',
            '  readonly name: string',
            '  readonly text: string',
            '}',
            '',
            'export interface BeastyVideoEntry {',
            '  readonly id: string',
            '  readonly title: string',
            '  readonly url: string',
            '  readonly publishedAt: string',
            '  readonly durationSec: number',
            '  readonly formattedDuration: string',
            '  readonly viewCount: number',
            "  readonly category: 'build_order' | 'civ_guide' | 'tier_list' | 'match_analysis' | 'mechanics' | 'general'",
            '  readonly primaryCivs: readonly string[]',
            '  readonly opponentCivs: readonly string[]',
            '  readonly proPlayers: readonly string[]',
            '  readonly summary: string',
            '  readonly keyTactics: readonly BeastyTacticalTip[]',
            '  readonly transcriptExcerpt?: string | null',
            '  readonly buildOrder?: unknown',
            "  readonly transcriptStatus?: 'available' | 'members_only' | 'unavailable'",
            '  readonly aoe4Relevant?: boolean',
            '}',
            '',
            f'export const BEASTY_CATALOG_STATS = {{ totalVideos: {len(compact)}, aoe4Relevant: {sum(1 for i in compact if i.get("aoe4Relevant"))}, transcriptsAvailable: {sum(1 for i in compact if i.get("transcriptStatus") == "available")}, windowStart: "2023-08-22", windowEnd: "2026-08-22" }} as const',
            '',
            f'export const BEASTY_VIDEOS: readonly BeastyVideoEntry[] = {payload}',
            '',
            'export const BEASTY_VIDEOS_BY_ID: Readonly<Record<string, BeastyVideoEntry>> = Object.fromEntries(',
            '  BEASTY_VIDEOS.map((v) => [v.id, v]),',
            ')',
            '',
            'export function getBeastyVideosForCiv(civ: string | null | undefined): readonly BeastyVideoEntry[] {',
            '  if (!civ) return BEASTY_VIDEOS.filter((v) => v.aoe4Relevant !== false)',
            '  const c = civ.toLowerCase()',
            '  return BEASTY_VIDEOS.filter(',
            '    (v) => v.aoe4Relevant !== false && (v.primaryCivs.includes(c) || v.opponentCivs.includes(c)),',
            '  )',
            '}',
            '',
            'export const BEASTY_AOE4_VIDEOS: readonly BeastyVideoEntry[] = BEASTY_VIDEOS.filter((v) => v.aoe4Relevant !== false)',
            '',
        ]),
        encoding='utf-8',
    )


def fetch_subs_ytdlp(video_id: str) -> tuple[list[dict[str, Any]], str | None]:
    """Download auto/manual English captions with yt-dlp. Returns (snippets, skip_reason)."""
    url = f'https://www.youtube.com/watch?v={video_id}'
    with tempfile.TemporaryDirectory(prefix='aoe4-creator-subs-') as temp_dir:
        options = apply_ytdlp_options({
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'ignoreerrors': False,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'subtitlesformat': 'vtt',
            'outtmpl': str(Path(temp_dir) / '%(id)s.%(ext)s'),
            'retries': 2,
            'extractor_retries': 2,
            'logger': QuietLogger(),
        })
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                ydl.download([url])
        except Exception as exc:
            return [], classify_caption_error(str(exc))
        caption_files = sorted(
            path
            for path in Path(temp_dir).glob(f'{video_id}.*')
            if path.suffix.lower() in {'.vtt', '.srt'}
        )
        for caption_file in caption_files:
            snippets = parse_vtt_snippets(caption_file.read_text(encoding='utf-8', errors='replace'))
            if snippets:
                return snippets, None
    return [], 'no_captions'


def fetch_subs(creator: str, video_ids: list[str], limit: int, sleep_s: float) -> int:
    folder = VALDEMAR_TRANSCRIPTS if creator == 'valdemar' else BEASTY_TRANSCRIPTS
    folder.mkdir(parents=True, exist_ok=True)
    skip = load_skip_log()
    saved = 0
    consecutive_blocks = 0
    attempted = 0
    for video_id in video_ids:
        if attempted >= limit:
            break
        dest = folder / f'{video_id}.json'
        if dest.exists():
            continue
        reason = str((skip.get(video_id) or {}).get('reason') or '')
        if reason in {'members_only', 'no_captions', 'unavailable'}:
            continue
        attempted += 1
        print(f'  yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt https://www.youtube.com/watch?v={video_id}', flush=True)
        snippets, skip_reason = fetch_subs_ytdlp(video_id)
        if skip_reason:
            if skip_reason != 'ip_blocked':
                skip[video_id] = {
                    'reason': skip_reason,
                    'creator': creator,
                    'at': datetime.now(timezone.utc).isoformat(),
                }
                save_skip_log(skip)
            print(f'  skip {video_id}: {skip_reason}', flush=True)
            if skip_reason == 'ip_blocked':
                consecutive_blocks += 1
                if consecutive_blocks >= 3:
                    print('YouTube caption endpoint is rate-limited; stopping this run. Re-run scripts/resume_creator_transcripts.py later.', flush=True)
                    break
            else:
                consecutive_blocks = 0
            if sleep_s:
                time.sleep(sleep_s)
            continue
        consecutive_blocks = 0
        dest.write_text(
            json.dumps({'id': video_id, 'snippets_count': len(snippets), 'snippets': snippets}, ensure_ascii=False),
            encoding='utf-8',
        )
        skip.pop(video_id, None)
        save_skip_log(skip)
        saved += 1
        print(f'  saved captions {video_id} ({len(snippets)} snippets)', flush=True)
        if sleep_s:
            time.sleep(sleep_s)
    return saved


def build_catalog(spec: dict[str, Any], entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    previous = existing_by_id(spec['catalog_json'])
    skip = load_skip_log()
    windowed = [entry for entry in entries if in_window(entry)]
    rows = [
        to_catalog_row(spec['creator'], entry, previous.get(str(entry['id'])), skip)
        for entry in windowed
    ]
    rows.sort(key=lambda item: item.get('publishedAt') or '', reverse=True)
    spec['catalog_json'].write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    if spec['creator'] == 'valdemar':
        write_valdemar_ts(rows)
    else:
        write_beasty_ts(rows)
    print(
        f"{spec['label']}: {len(entries)} listed, {len(windowed)} in 2023-08-22..2026-08-22, "
        f"{sum(1 for r in rows if r.get('aoe4Relevant'))} AoE4-relevant",
        flush=True,
    )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list-only', action='store_true')
    parser.add_argument('--write-catalogs', action='store_true', default=True)
    parser.add_argument('--reuse-raw', action='store_true', help='Skip yt-dlp if raw dumps already exist')
    parser.add_argument('--fetch-subs', action='store_true')
    parser.add_argument('--subs-limit', type=int, default=40)
    parser.add_argument('--subs-sleep', type=float, default=1.5, help='Seconds between caption downloads')
    parser.add_argument('--creator', choices=('valdemar', 'beastyqt', 'both'), default='both')
    args = parser.parse_args()
    neodlp_home = resolve_neodlp_home()
    if neodlp_home:
        pot_ok = ensure_pot_server(neodlp_home)
        print(f'Using NeoDLP toolchain at {neodlp_home} (PO-token server {"up" if pot_ok else "unavailable"})', flush=True)

    selected = [spec for spec in CHANNELS if args.creator in ('both', spec['creator'])]
    for spec in selected:
        raw_path = RAW_DIR / f"{spec['creator']}_raw_entries.json"
        if args.reuse_raw and raw_path.exists():
            entries = json.loads(raw_path.read_text(encoding='utf-8'))
            print(f'Reusing {len(entries)} raw entries from {raw_path}', flush=True)
        else:
            entries = list_channel(spec)
        if args.list_only:
            continue
        rows = build_catalog(spec, entries)
        if args.fetch_subs:
            skip = load_skip_log()
            folder = VALDEMAR_TRANSCRIPTS if spec['creator'] == 'valdemar' else BEASTY_TRANSCRIPTS
            priority = [
                row
                for row in rows
                if row.get('aoe4Relevant')
                and row.get('transcriptStatus') not in {'available', 'members_only'}
                and str((skip.get(row['id']) or {}).get('reason') or '') not in {'members_only', 'no_captions', 'unavailable'}
                and not (folder / f"{row['id']}.json").exists()
                and any(token in row['title'].lower() for token in PRIORITY_TITLE)
            ]
            priority.sort(key=lambda row: (CATEGORY_PRIORITY.get(str(row.get('category')), 9), -(row.get('durationSec') or 0)))
            print(
                f'Fetching up to {args.subs_limit} captions for {spec["label"]} '
                f'({len(priority)} remaining AoE4 priority ids)',
                flush=True,
            )
            fetch_subs(spec['creator'], [row['id'] for row in priority], args.subs_limit, args.subs_sleep)
            build_catalog(spec, entries)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
