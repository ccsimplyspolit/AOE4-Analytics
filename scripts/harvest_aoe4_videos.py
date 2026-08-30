#!/usr/bin/env python3
"""Harvest and distill recent AoE4 faction videos into build-order evidence.

The script uses yt-dlp for discovery/metadata and youtube-transcript-api for
captions. It never places full transcripts in the renderer or generated build
orders. Raw captions stay in the ignored research directory; the checked-in
artifact is a compact, provenance-linked set of derived signals.

Examples:
  python scripts/harvest_aoe4_videos.py --civ english --limit 10 --transcripts
  python scripts/harvest_aoe4_videos.py --all --limit 100 --days 30 --transcripts
  python scripts/harvest_aoe4_videos.py --local-transcripts-only --transcripts-dir path/to/captions

The default output is data/research/aoe4-video-evidence.json and the generated
TypeScript map is src/data/videoEvidence.generated.ts.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import sys
import tempfile
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from neodlp_toolchain import apply_ytdlp_options, ensure_pot_server, resolve_neodlp_home

try:
    import yt_dlp
except ImportError as exc:  # pragma: no cover - exercised in the user environment
    raise SystemExit('Install yt-dlp first: python -m pip install yt-dlp') from exc

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:  # pragma: no cover - optional for metadata-only harvests
    YouTubeTranscriptApi = None  # type: ignore[assignment,misc]


ROOT = Path(__file__).resolve().parents[1]
RESEARCH_DIR = ROOT / 'data' / 'research'
RAW_TRANSCRIPT_DIR = RESEARCH_DIR / 'raw-transcripts'
GENERATED_PATH = ROOT / 'src' / 'data' / 'videoEvidence.generated.ts'

# Canonical AoE4World civ slugs with search aliases. The aliases intentionally
# include common YouTube naming variants so new/variant civilizations are found.
CIVS: dict[str, tuple[str, ...]] = {
    'abbasid_dynasty': ('Abbasid', 'Abbasid Dynasty'),
    'ayyubids': ('Ayyubids',),
    'byzantines': ('Byzantines',),
    'chinese': ('Chinese',),
    'delhi_sultanate': ('Delhi', 'Delhi Sultanate'),
    'english': ('English',),
    'french': ('French',),
    'golden_horde': ('Golden Horde',),
    'house_of_lancaster': ('House of Lancaster', 'Lancaster'),
    'holy_roman_empire': ('Holy Roman Empire', 'HRE'),
    'japanese': ('Japanese',),
    'jeanne_darc': ("Jeanne d'Arc", 'Jeanne d Arc', 'Jeanne', 'Joan of Arc', 'Juana de Arco'),
    'jin_dynasty': ('Jin Dynasty', 'Jin'),
    'knights_templar': ('Knights Templar', 'Templar'),
    'malians': ('Malians',),
    'macedonian_dynasty': ('Macedonian Dynasty', 'Macedonian'),
    'mongols': ('Mongols',),
    'order_of_the_dragon': ('Order of the Dragon', 'OOTD'),
    'ottomans': ('Ottomans',),
    'rus': ('Rus',),
    'sengoku_daimyo': ('Sengoku Daimyo', 'Sengoku'),
    'tughlaq_dynasty': ('Tughlaq Dynasty', 'Tughlaq'),
    'zhu_xis_legacy': ("Zhu Xi's Legacy", 'Zhu Xi', 'Zhu Xi Legacy'),
}

CIV_DISPLAY_NAMES = {
    'abbasid_dynasty': 'Abbasid Dynasty',
    'ayyubids': 'Ayyubids',
    'byzantines': 'Byzantines',
    'chinese': 'Chinese',
    'delhi_sultanate': 'Delhi Sultanate',
    'english': 'English',
    'french': 'French',
    'golden_horde': 'Golden Horde',
    'house_of_lancaster': 'House of Lancaster',
    'holy_roman_empire': 'Holy Roman Empire',
    'japanese': 'Japanese',
    'jeanne_darc': "Jeanne d'Arc",
    'jin_dynasty': 'Jin Dynasty',
    'knights_templar': 'Knights Templar',
    'malians': 'Malians',
    'macedonian_dynasty': 'Macedonian Dynasty',
    'mongols': 'Mongols',
    'order_of_the_dragon': 'Order of the Dragon',
    'ottomans': 'Ottomans',
    'rus': 'Rus',
    'sengoku_daimyo': 'Sengoku Daimyo',
    'tughlaq_dynasty': 'Tughlaq Dynasty',
    'zhu_xis_legacy': "Zhu Xi's Legacy",
}

ACTION_PATTERNS: dict[str, tuple[str, ...]] = {
    '2TC': (r'\b2\s*tc\b', r'second town center', r'second tc'),
    'Fast Castle': (r'fast castle', r'quick castle', r'age up to castle'),
    'Feudal aggression': (r'feudal (?:rush|aggression|pressure|all[- ]in)', r'early pressure'),
    'Knight/Raid': (r'knight rush', r'cavalry rush', r'raiding', r'raid'),
    'Trade': (r'\btrade\b', r'trade wing', r'market boom'),
    'Defensive': (r'defensive', r'hold the line', r'tower rush', r'wall'),
    'Boom': (r'\bboom\b', r'economic boom', r'eco build', r'economy build'),
    'All-in': (r'\ball[- ]in\b', r'one base', r'push to end'),
}

RESOURCE_PATTERNS: dict[str, tuple[str, ...]] = {
    'food': (r'\bfood\b', r'sheep', r'farms?', r'berries'),
    'wood': (r'\bwood\b', r'lumber', r'trees'),
    'gold': (r'\bgold\b', r'mining camp', r'\bcoin\b'),
    'stone': (r'\bstone\b', r'quarry'),
}

TOPIC_PATTERNS: dict[str, tuple[str, ...]] = {
    'Age-up': (r'age ?up', r'feudal', r'castle age', r'imperial age'),
    'Opening military': (
        r'opening', r'first military', r'barracks?', r'stable',
        r'archery range', r'longbow', r'horsemen?', r'spearmen?',
    ),
    'Economy': (r'eco(?:nomy)?', r'villagers?', r'workers?', r'boom', r'2\s*tc', r'farms?'),
    'Scouting': (r'scout(?:ing)?', r'vision', r'recon'),
    'Map control': (r'map control', r'outpost', r'tower', r'wall', r'sacred site', r'relic'),
    'Technology': (r'blacksmith', r'upgrade', r'technolog(?:y|ies)', r'wheelbarrow'),
    'Counterplay': (r'counter', r'anti[- ]', r'response', r'vs\.?', r'matchup'),
}

MILITARY_PATTERNS: dict[str, tuple[str, ...]] = {
    'Archer': (r'\barchers?\b', r'\blongbow(?:men)?\b'),
    'Spearman': (r'\bspearmen?\b', r'\blancers?\b'),
    'Horseman': (r'\bhorsemen?\b', r'\bcavalry\b'),
    'Knight': (r'\bknights?\b', r'\bpalace guards?\b'),
    'Man-at-Arms': (r'\bman[- ]at[- ]arms?\b', r'\bheavy infantry\b'),
    'Crossbowman': (r'\bcrossbows?\b', r'\bcrossbowmen?\b'),
    'Handcannoneer': (r'\bhandcannoneers?\b', r'\bhand cannons?\b'),
    'Siege': (r'\bsiege\b', r'\bmangonels?\b', r'\btrebuchets?\b', r'\bspringalds?\b'),
}

TIME_RE = re.compile(r'(?<!\d)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)')


class YoutubeRateLimited(RuntimeError):
    """Stop a batch cleanly when YouTube asks the client to slow down."""


class QuietYdlLogger:
    """Keep a resumable harvest readable; actionable status is printed by us."""

    def debug(self, _message: str) -> None:
        pass

    def warning(self, _message: str) -> None:
        pass

    def error(self, _message: str) -> None:
        pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', help='Harvest all 23 canonical civilizations')
    group.add_argument('--civ', choices=sorted(CIVS), help='Harvest one civ slug')
    group.add_argument('--transcripts-only', action='store_true', help='Retry captions for videos already in the local evidence snapshot')
    group.add_argument('--local-transcripts-only', action='store_true', help='Import local captions for stored videos without contacting YouTube')
    group.add_argument('--report-only', action='store_true', help='Regenerate the local Markdown research report without network requests')
    parser.add_argument('--days', type=int, default=30, help='Recency window (default: 30)')
    parser.add_argument('--limit', type=int, default=100, help='Maximum videos per civ (default: 100)')
    parser.add_argument('--candidates', type=int, default=300, help='Candidate metadata cap per civ')
    parser.add_argument('--transcripts', action='store_true', help='Fetch available English/Russian captions')
    parser.add_argument('--transcripts-dir', type=Path, help='Directory containing local captions named VIDEO_ID.txt/.vtt/.srt')
    parser.add_argument('--cookies-from-browser', help='yt-dlp browser cookie source, e.g. chrome or edge')
    parser.add_argument('--cookies-file', type=Path, help='Netscape-format cookies.txt exported from a logged-in browser')
    parser.add_argument('--proxy', help='Optional proxy URL for YouTube requests')
    parser.add_argument('--output', type=Path, default=RESEARCH_DIR / 'aoe4-video-evidence.json')
    parser.add_argument('--no-write-app', action='store_true', help='Do not update generated TypeScript evidence map')
    return parser.parse_args()


def iso_date(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime('%Y-%m-%d')


def parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except ValueError:
        return None


def search_candidates(aliases: tuple[str, ...], cap: int) -> list[dict[str, Any]]:
    queries: list[str] = []
    for alias in aliases:
        queries.extend((
            f'Age of Empires IV {alias} build order',
            f'Age of Empires IV {alias} guide',
            f'AoE4 {alias} gameplay build',
            f'AoE4 {alias} ranked gameplay',
        ))
    found: dict[str, dict[str, Any]] = {}
    options = apply_ytdlp_options({
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'logger': QuietYdlLogger(),
    })
    with yt_dlp.YoutubeDL(options) as ydl:
        for query in queries:
            result = ydl.extract_info(f'ytsearch50:{query}', download=False) or {}
            for entry in result.get('entries') or []:
                if not entry or not entry.get('id'):
                    continue
                found.setdefault(entry['id'], {
                    'id': entry['id'],
                    'url': f"https://www.youtube.com/watch?v={entry['id']}",
                    'searchQueries': [],
                })['searchQueries'].append(query)
                if len(found) >= cap:
                    break
    return list(found.values())


def full_metadata(candidate: dict[str, Any], ydl: yt_dlp.YoutubeDL) -> dict[str, Any] | None:
    try:
        info = ydl.extract_info(candidate['url'], download=False)
    except Exception as exc:  # yt-dlp uses several extractor-specific errors
        if is_rate_limited(exc):
            raise YoutubeRateLimited(str(exc)) from exc
        return None
    if not info:
        return None
    published = info.get('timestamp')
    published_at = datetime.fromtimestamp(published, tz=timezone.utc).isoformat() if published else None
    return {
        'id': info.get('id') or candidate['id'],
        'url': candidate['url'],
        'title': info.get('title') or '',
        'channel': info.get('channel') or info.get('uploader') or None,
        'channelId': info.get('channel_id') or info.get('uploader_id') or None,
        'publishedAt': published_at,
        'durationSec': info.get('duration'),
        'viewCount': info.get('view_count'),
        'likeCount': info.get('like_count'),
        'commentCount': info.get('comment_count'),
        'descriptionExcerpt': (info.get('description') or '')[:1200],
        'searchQueries': candidate.get('searchQueries', []),
    }


def _alias_in_text(text: str, aliases: tuple[str, ...]) -> bool:
    lower = text.lower()
    return any(
        re.search(r'(?<![a-z0-9])' + re.escape(alias.lower()) + r'(?![a-z0-9])', lower)
        for alias in aliases
    )


def title_subject_slug(title: str) -> str | None:
    """Civilization the title is teaching — not one named only as a matchup."""
    how_to_play = re.search(
        r'how to play(?: the)?\s+(.+?)(?:\s+like a pro|\s+[-–—]|\s+masterclass|\s+build|\s+guide|\s+in\b|$)',
        title,
        re.I,
    )
    ranked = sorted(
        ((len(alias), slug, alias) for slug, aliases in CIVS.items() for alias in aliases),
        reverse=True,
    )

    def slug_in(fragment: str) -> str | None:
        lower = fragment.lower()
        for _length, slug, alias in ranked:
            if re.search(r'(?<![a-z0-9])' + re.escape(alias.lower()) + r'(?![a-z0-9])', lower):
                return slug
        return None

    if how_to_play:
        subject = slug_in(how_to_play.group(1))
        if subject:
            return subject
    versus = re.match(r'^(.+?)\s+vs\.?\s+', title, re.I)
    if versus:
        subject = slug_in(versus.group(1))
        if subject:
            return subject
    return slug_in(title)


def matches_civilization(
    metadata: dict[str, Any],
    aliases: tuple[str, ...],
    civ_slug: str | None = None,
) -> bool:
    """Reject search-result bleed from adjacent factions.

    YouTube search often returns a popular AoE4 video for a nearby query even
    when the faction is absent from the result. A masterclass titled
    "How to Play HRE" must not become Macedonian evidence just because the
    description names that matchup.
    """
    title = metadata.get('title') or ''
    subject = title_subject_slug(title)
    if civ_slug and subject and subject != civ_slug:
        return False
    if _alias_in_text(title, aliases):
        return True
    if subject:
        return False
    searchable = clean_text(str(metadata.get('descriptionExcerpt') or ''))
    return _alias_in_text(searchable, aliases)


def clean_text(value: str) -> str:
    value = re.sub(r'<[^>]+>', ' ', value)
    value = re.sub(r'\{\\.*?\}', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def timestamp_to_seconds(value: str) -> int:
    parts = [int(part) for part in value.split(':')]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[-3] * 3600 + parts[-2] * 60 + parts[-1]


def extract_timestamps(text: str) -> list[dict[str, Any]]:
    counts: Counter[int] = Counter()
    for match in TIME_RE.finditer(text):
        raw = match.group(0)
        tail = text[match.end():match.end() + 100]
        if any(re.search(pattern, tail, re.I) for patterns in ACTION_PATTERNS.values() for pattern in patterns):
            counts[timestamp_to_seconds(raw)] += 1
    return [
        {'label': f'{seconds // 60}:{seconds % 60:02d}', 'timeSec': seconds, 'mentions': mentions}
        for seconds, mentions in sorted(counts.items())[:12]
    ]


def derive_signals(
    title: str,
    description: str,
    transcript: str,
    civ_slug: str | None = None,
) -> dict[str, Any]:
    text = f'{title}\n{description}\n{transcript}'.lower()
    action_hits: Counter[str] = Counter()
    resource_hits: Counter[str] = Counter()
    for label, patterns in ACTION_PATTERNS.items():
        action_hits[label] = sum(1 for pattern in patterns if re.search(pattern, text, re.I))
    for label, patterns in RESOURCE_PATTERNS.items():
        resource_hits[label] = sum(1 for pattern in patterns if re.search(pattern, text, re.I))
    actions = [label for label, hits in action_hits.most_common() if hits > 0]
    resources = [label for label, hits in resource_hits.most_common() if hits > 0]
    topics = [
        label for label, patterns in TOPIC_PATTERNS.items()
        if any(re.search(pattern, text, re.I) for pattern in patterns)
    ]
    military_mentions = [
        label for label, patterns in MILITARY_PATTERNS.items()
        if any(re.search(pattern, text, re.I) for pattern in patterns)
    ]
    opponent_civs: list[str] = []
    for candidate_slug, aliases in CIVS.items():
        if candidate_slug == civ_slug:
            continue
        if any(
            re.search(r'(?<![a-z0-9])' + re.escape(alias.lower()) + r'(?![a-z0-9])', text, re.I)
            for alias in aliases
        ):
            opponent_civs.append(CIV_DISPLAY_NAMES[candidate_slug])
    archetype = actions[0] if actions else None
    transcript_bonus = min(0.35, len(transcript.split()) / 4000) if transcript else 0
    confidence = min(0.95, 0.35 + (0.12 if title else 0) + (0.18 if description else 0) + transcript_bonus)
    return {
        'archetype': archetype,
        'actions': actions[:5],
        'resources': resources[:4],
        'topics': topics[:6],
        'opponentCivs': opponent_civs[:6],
        'militaryMentions': military_mentions[:8],
        'timings': extract_timestamps(f'{description}\n{transcript}'),
        'confidence': round(confidence, 2),
    }


def subtitle_text(raw: str) -> str:
    """Turn VTT/SRT caption payload into compact plain text for distillation."""
    lines: list[str] = []
    previous = ''
    for line in raw.splitlines():
        value = html.unescape(line).strip()
        if not value or value.upper() == 'WEBVTT' or value.startswith('NOTE'):
            continue
        if '-->' in value or re.fullmatch(r'\d+', value):
            continue
        value = re.sub(r'<[^>]+>', ' ', value)
        value = re.sub(r'\{\\.*?\}', ' ', value)
        value = re.sub(r'\s+', ' ', value).strip()
        if value and value != previous:
            lines.append(value)
            previous = value
    return ' '.join(lines)


def load_local_transcript(video_id: str, transcripts_dir: Path | None) -> str:
    """Load a user-provided caption file, supporting plain text and subtitle formats."""
    if transcripts_dir is None or not transcripts_dir.exists():
        return ''
    for suffix in ('.txt', '.vtt', '.srt', '.ttml'):
        candidate = transcripts_dir / f'{video_id}{suffix}'
        if not candidate.exists():
            continue
        raw = candidate.read_text(encoding='utf-8', errors='replace')
        text = subtitle_text(raw) if suffix != '.txt' else clean_text(raw)
        if text:
            return text
    return ''


def is_rate_limited(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in ('429', 'requestblocked', 'ipblocked', 'too many requests'))


def fetch_transcript_with_ytdlp(
    video_id: str,
    raw_path: Path,
    base_options: dict[str, Any],
) -> tuple[str, str, str, bool]:
    """Fallback caption fetcher using the same yt-dlp session as discovery."""
    url = f'https://www.youtube.com/watch?v={video_id}'
    with tempfile.TemporaryDirectory(prefix='aoe4-captions-') as temp_dir:
        options = dict(base_options)
        options.update({
            'skip_download': True,
            'ignoreerrors': False,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB', 'ru', 'uk'],
            'subtitlesformat': 'vtt',
            'outtmpl': str(Path(temp_dir) / '%(id)s.%(ext)s'),
        })
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                ydl.download([url])
        except Exception as exc:
            return '', 'none', '', is_rate_limited(exc)
        caption_files = sorted(Path(temp_dir).glob(f'{video_id}.*'))
        for caption_file in caption_files:
            if caption_file.suffix.lower() not in ('.vtt', '.srt', '.ttml'):
                continue
            text = subtitle_text(caption_file.read_text(encoding='utf-8', errors='replace'))
            if text:
                language = caption_file.name.removeprefix(f'{video_id}.').split('.')[0]
                raw_path.write_text(text, encoding='utf-8')
                return text, 'auto', language, False
    return '', 'none', '', False


def fetch_transcript(
    video_id: str,
    raw_path: Path,
    ytdlp_options: dict[str, Any],
) -> tuple[str, str, str, str, bool]:
    if YouTubeTranscriptApi is None:
        text, source, language, blocked = fetch_transcript_with_ytdlp(video_id, raw_path, ytdlp_options)
        return text, source, language, 'yt-dlp' if text else 'none', blocked
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        preferred = None
        for language in ('en', 'en-US', 'en-GB', 'ru', 'uk'):
            try:
                preferred = transcript_list.find_transcript([language])
                break
            except Exception:
                continue
        if preferred is None:
            try:
                preferred = next(iter(transcript_list))
            except StopIteration:
                text, source, language, blocked = fetch_transcript_with_ytdlp(video_id, raw_path, ytdlp_options)
                return text, source, language, 'yt-dlp' if text else 'none', blocked
        fetched = preferred.fetch()
        text = ' '.join(str(item.get('text', '')) for item in fetched)
        raw_path.write_text(text, encoding='utf-8')
        source = 'auto' if getattr(preferred, 'is_generated', False) else 'manual'
        language = getattr(preferred, 'language_code', '') or ''
        return text, source, language, 'youtube-transcript-api', False
    except Exception as exc:
        text, source, language, fallback_blocked = fetch_transcript_with_ytdlp(video_id, raw_path, ytdlp_options)
        return text, source, language, 'yt-dlp' if text else 'none', is_rate_limited(exc) or fallback_blocked


def enrich_transcripts(
    videos: list[dict[str, Any]],
    ytdlp_options: dict[str, Any],
    circuit_open: bool,
    transcripts_dir: Path | None = None,
    local_only: bool = False,
) -> tuple[list[dict[str, Any]], bool]:
    """Refresh captions for an already-selected video slice without discovery."""
    for metadata in videos:
        raw_path = RAW_TRANSCRIPT_DIR / f"{metadata['id']}.txt"
        local_transcript = load_local_transcript(metadata['id'], transcripts_dir)
        if local_transcript:
            transcript = local_transcript
            raw_path.write_text(transcript, encoding='utf-8')
            transcript_source = 'manual'
            transcript_language = metadata.get('transcriptLanguage', '')
            transcript_provider = 'local'
            transcript_status = 'available'
        elif raw_path.exists() and raw_path.stat().st_size > 0:
            transcript = raw_path.read_text(encoding='utf-8')
            transcript_source = 'auto'
            transcript_language = metadata.get('transcriptLanguage', '')
            transcript_provider = 'cache'
            transcript_status = 'available'
        elif local_only or circuit_open:
            transcript = ''
            transcript_source = 'none'
            transcript_language = ''
            transcript_provider = 'none'
            transcript_status = 'missing' if local_only else 'rate-limited'
        else:
            transcript, transcript_source, transcript_language, transcript_provider, blocked = fetch_transcript(
                metadata['id'], raw_path, ytdlp_options,
            )
            transcript_status = 'available' if transcript else ('rate-limited' if blocked else 'missing')
            if blocked:
                circuit_open = True
                print('[transcripts] YouTube caption endpoint is rate-limited; skipping further caption requests in this run.', flush=True)
        metadata['transcriptSource'] = transcript_source if transcript_source in ('manual', 'auto') else 'none'
        metadata['transcriptLanguage'] = transcript_language
        metadata['transcriptProvider'] = transcript_provider
        metadata['transcriptStatus'] = transcript_status
        metadata['signals'] = derive_signals(
            metadata['title'], metadata['descriptionExcerpt'], transcript, metadata.get('civ'),
        )
        time.sleep(0.15)
    return videos, circuit_open


def rank_video(video: dict[str, Any]) -> float:
    views = max(0, int(video.get('viewCount') or 0))
    likes = max(0, int(video.get('likeCount') or 0))
    published = parse_utc(video.get('publishedAt'))
    age_days = max(0, (datetime.now(timezone.utc) - published).days) if published else 999
    return math.log1p(views) + 0.5 * math.log1p(likes) - age_days * 0.01


def merge_video_evidence(
    civ: str,
    aliases: tuple[str, ...],
    prior: list[dict[str, Any]],
    fresh: list[dict[str, Any]],
    start: datetime,
    end: datetime,
    limit: int,
) -> list[dict[str, Any]]:
    """Merge fresh search results without erasing a valid prior checkpoint."""
    merged: dict[str, dict[str, Any]] = {}
    for video in [*prior, *fresh]:
        video_id = video.get('id')
        published = parse_utc(video.get('publishedAt'))
        if not isinstance(video_id, str) or not video_id:
            continue
        if not published or published < start or published > end:
            continue
        if not matches_civilization(video, aliases, civ):
            continue
        merged[video_id] = video
    ranked = sorted(merged.values(), key=lambda video: (
        parse_utc(video.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc),
        rank_video(video),
    ), reverse=True)
    return [{**video, 'civ': civ} for video in ranked[:limit]]


def build_evidence(videos: list[dict[str, Any]], start: datetime, end: datetime, limit: int) -> dict[str, Any]:
    all_actions: Counter[str] = Counter()
    all_resources: Counter[str] = Counter()
    all_topics: Counter[str] = Counter()
    all_opponents: Counter[str] = Counter()
    all_military: Counter[str] = Counter()
    all_timings: Counter[tuple[str, int]] = Counter()
    sources: list[dict[str, Any]] = []
    for video in videos:
        signals = video['signals']
        all_actions.update(signals['actions'])
        all_resources.update(signals['resources'])
        all_topics.update(signals.get('topics', []))
        all_opponents.update(signals.get('opponentCivs', []))
        all_military.update(signals.get('militaryMentions', []))
        for timing in signals['timings']:
            all_timings[(timing['label'], timing['timeSec'])] += 1
        sources.append({
            'id': video['id'],
            'title': video['title'],
            'url': video['url'],
            'channel': video.get('channel'),
            'publishedAt': video['publishedAt'],
            'viewCount': video.get('viewCount'),
            'transcriptLanguage': video.get('transcriptLanguage') or None,
            'transcriptSource': video.get('transcriptSource', 'none'),
            'transcriptProvider': video.get('transcriptProvider', 'none'),
            'transcriptStatus': video.get('transcriptStatus', 'not-requested'),
            'signals': signals,
        })
    return {
        'schemaVersion': 1,
        'windowStart': iso_date(start),
        'windowEnd': iso_date(end),
        'sampleSize': len(videos),
        'requestedSampleSize': limit,
        'coverageNote': None if len(videos) >= limit else f'{len(videos)} matching videos found; requested {limit}',
        'commonActions': [label for label, count in all_actions.most_common(8) if count >= max(1, len(videos) // 10)],
        'commonResources': [label for label, count in all_resources.most_common(4) if count >= max(1, len(videos) // 10)],
        'commonTopics': [label for label, count in all_topics.most_common(8) if count >= max(1, len(videos) // 10)],
        'commonOpponents': [label for label, count in all_opponents.most_common(8) if count >= max(1, len(videos) // 10)],
        'commonMilitaryMentions': [label for label, count in all_military.most_common(8) if count >= max(1, len(videos) // 10)],
        'timingSignals': [
            {'label': label, 'timeSec': seconds, 'mentions': count}
            for (label, seconds), count in all_timings.most_common(12)
        ],
        'sources': sources,
    }


def normalize_key(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def write_generated(evidence_by_civ: dict[str, dict[str, Any]]) -> None:
    map_by_label = {
        normalize_key(CIV_DISPLAY_NAMES[civ]): evidence
        for civ, evidence in evidence_by_civ.items()
    }
    payload = json.dumps(map_by_label, ensure_ascii=False, indent=2)
    GENERATED_PATH.write_text(
        "import type { BuildOrderVideoEvidence } from '@domain/videoEvidence'\n\n"
        '/** Generated by scripts/harvest_aoe4_videos.py; do not edit by hand. */\n'
        f'export const VIDEO_EVIDENCE_BY_CIV: Record<string, BuildOrderVideoEvidence> = {payload} as Record<string, BuildOrderVideoEvidence>\n',
        encoding='utf-8',
    )


def load_existing_output(path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    """Load prior civ slices so one-civ runs can resume without losing work."""
    if not path.exists():
        return {}, {}
    try:
        document = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}, {}
    civs = document.get('civs') if isinstance(document, dict) else None
    videos = document.get('videos') if isinstance(document, dict) else None
    evidence = {
        civ: normalize_evidence_shape(value)
        for civ, value in civs.items()
        if isinstance(value, dict)
    } if isinstance(civs, dict) else {}
    by_civ: dict[str, list[dict[str, Any]]] = {}
    if isinstance(videos, list):
        for video in videos:
            if not isinstance(video, dict) or not isinstance(video.get('civ'), str):
                continue
            by_civ.setdefault(video['civ'], []).append(video)
    return evidence, by_civ


def normalize_evidence_shape(evidence: dict[str, Any]) -> dict[str, Any]:
    """Backfill fields added by newer distillers into an older local snapshot."""
    normalized = dict(evidence)
    for key in (
        'commonActions', 'commonResources', 'commonTopics', 'commonOpponents',
        'commonMilitaryMentions', 'timingSignals', 'sources',
    ):
        normalized.setdefault(key, [])
    for source in normalized.get('sources', []):
        if not isinstance(source, dict):
            continue
        source.setdefault('transcriptStatus', 'not-requested')
        signals = source.get('signals')
        if not isinstance(signals, dict):
            signals = {}
            source['signals'] = signals
        signals.setdefault('topics', [])
        signals.setdefault('opponentCivs', [])
        signals.setdefault('militaryMentions', [])
    return normalized


def write_output(
    path: Path,
    generated_at: datetime,
    start: datetime,
    end: datetime,
    limit: int,
    evidence_by_civ: dict[str, dict[str, Any]],
    videos_by_civ: dict[str, list[dict[str, Any]]],
) -> None:
    """Write a resumable evidence snapshot after each completed civilization."""
    output = {
        'schemaVersion': 1,
        'generatedAt': generated_at.isoformat(),
        'windowStart': start.isoformat(),
        'windowEnd': end.isoformat(),
        'requestedPerCiv': limit,
        'civs': evidence_by_civ,
        'videos': [video for civ in sorted(videos_by_civ) for video in videos_by_civ[civ]],
        'copyrightNote': 'Only derived signals and links are imported into the app; raw captions remain local and ignored.',
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    write_report(path.with_name('aoe4-video-report.md'), generated_at, start, end, limit, evidence_by_civ, videos_by_civ)


def write_report(
    path: Path,
    generated_at: datetime,
    start: datetime,
    end: datetime,
    limit: int,
    evidence_by_civ: dict[str, dict[str, Any]],
    videos_by_civ: dict[str, list[dict[str, Any]]],
) -> None:
    """Write a human-readable coverage and provenance report beside the JSON snapshot."""
    total_videos = sum(len(videos) for videos in videos_by_civ.values())
    available = sum(
        1
        for videos in videos_by_civ.values()
        for video in videos
        if video.get('transcriptStatus') == 'available' or video.get('transcriptSource') != 'none'
    )
    rate_limited = sum(
        1 for videos in videos_by_civ.values() for video in videos
        if video.get('transcriptStatus') == 'rate-limited'
    )
    lines = [
        '# AoE4 video evidence report',
        '',
        f'- Generated: `{generated_at.isoformat()}`',
        f'- Window: `{iso_date(start)}` → `{iso_date(end)}`',
        f'- Videos: `{total_videos}` across `{len(CIVS)}` civilizations',
        f'- Captions: `{available}` available; `{rate_limited}` rate-limited',
        f'- Requested sample: up to `{limit}` videos per civilization',
        '',
        '> The per-civilization target is an upper bound. A smaller sample means fewer matching videos were found in the window, not that existing videos were discarded.',
        '',
        '| Civilization | Videos / target | Captions | Status | Common topics | Opponent context |',
        '| --- | ---: | ---: | --- | --- | --- |',
    ]
    for civ in sorted(CIVS):
        evidence = evidence_by_civ.get(civ, {})
        videos = videos_by_civ.get(civ, [])
        sources = evidence.get('sources', [])
        caption_count = sum(
            1 for source in sources
            if source.get('transcriptStatus') == 'available' or source.get('transcriptSource') != 'none'
        )
        rate_count = sum(1 for source in sources if source.get('transcriptStatus') == 'rate-limited')
        if rate_count:
            status = 'rate-limited'
        elif caption_count:
            status = 'caption-backed'
        elif videos:
            status = 'metadata-only'
        else:
            status = 'no matching videos'
        topics = ', '.join(evidence.get('commonTopics', [])) or '—'
        opponents = ', '.join(evidence.get('commonOpponents', [])) or '—'
        lines.append(
            f"| {CIV_DISPLAY_NAMES[civ]} | {len(videos)} / {limit} | {caption_count}"
            f"{' (+%d blocked)' % rate_count if rate_count else ''} | {status} | {topics} | {opponents} |"
        )
    lines.extend(('', '## Source samples', ''))
    for civ in sorted(CIVS):
        sources = evidence_by_civ.get(civ, {}).get('sources', [])
        if not sources:
            continue
        lines.append(f"### {CIV_DISPLAY_NAMES[civ]}")
        for source in sources[:3]:
            title = str(source.get('title') or source.get('id') or 'Untitled').replace(']', '')
            url = source.get('url') or f"https://www.youtube.com/watch?v={source.get('id', '')}"
            status = source.get('transcriptStatus', 'not-requested')
            lines.append(f"- [{title}]({url}) — {source.get('channel') or 'unknown channel'} · captions: `{status}`")
        lines.append('')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')


def main() -> int:
    args = parse_args()
    if args.days <= 0 or args.limit <= 0:
        raise SystemExit('--days and --limit must be positive')
    if args.local_transcripts_only and args.transcripts_dir is None:
        raise SystemExit('--local-transcripts-only requires --transcripts-dir')
    if args.local_transcripts_only and not args.transcripts_dir.is_dir():
        raise SystemExit(f'Caption directory does not exist: {args.transcripts_dir}')
    civ_slugs = sorted(CIVS) if args.all else [args.civ]
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=args.days)
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    RAW_TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)

    ydl_options = apply_ytdlp_options({
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': False,
        'skip_download': True,
        'socket_timeout': 20,
        'sleep_interval_requests': 0.15,
        'logger': QuietYdlLogger(),
    })
    neodlp_home = resolve_neodlp_home()
    if neodlp_home:
        pot_ok = ensure_pot_server(neodlp_home)
        print(f'Using NeoDLP toolchain at {neodlp_home} (PO-token server {"up" if pot_ok else "unavailable"})', flush=True)
    if args.cookies_from_browser:
        ydl_options['cookiesfrombrowser'] = (args.cookies_from_browser,)
    if args.cookies_file:
        ydl_options['cookiefile'] = str(args.cookies_file)
    if args.proxy:
        ydl_options['proxy'] = args.proxy
    all_evidence, videos_by_civ = load_existing_output(args.output)
    transcript_circuit_open = False
    metadata_circuit_open = False
    if args.report_only:
        if not all_evidence and not videos_by_civ:
            raise SystemExit('No local evidence snapshot found; run discovery first')
        write_report(
            args.output.with_name('aoe4-video-report.md'),
            end,
            start,
            end,
            args.limit,
            all_evidence,
            videos_by_civ,
        )
        print(f'Wrote report to {args.output.with_name("aoe4-video-report.md")}')
        return 0
    if args.transcripts_only or args.local_transcripts_only:
        if not all_evidence and not videos_by_civ:
            raise SystemExit('No local evidence snapshot found; run discovery first')
        for civ in sorted(CIVS):
            selected = videos_by_civ.get(civ, [])[:args.limit]
            if not selected:
                continue
            print(f'[{civ}] retrying transcripts for {len(selected)} stored videos...', flush=True)
            selected, transcript_circuit_open = enrich_transcripts(
                selected,
                ydl_options,
                transcript_circuit_open,
                args.transcripts_dir,
                args.local_transcripts_only,
            )
            all_evidence[civ] = build_evidence(selected, start, end, args.limit)
            videos_by_civ[civ] = selected
            write_output(args.output, end, start, end, args.limit, all_evidence, videos_by_civ)
            if not args.no_write_app:
                write_generated(all_evidence)
        total_videos = sum(len(videos) for videos in videos_by_civ.values())
        print(f'Wrote {total_videos} videos across {len(all_evidence)} civilizations to {args.output}')
        return 0
    with yt_dlp.YoutubeDL(ydl_options) as ydl:
        for civ in civ_slugs:
            print(f'[{civ}] searching candidates...', flush=True)
            try:
                candidates = search_candidates(CIVS[civ], args.candidates)
            except YoutubeRateLimited as exc:
                metadata_circuit_open = True
                print(f'[metadata] YouTube rate limit reached during {civ} search: {exc}', file=sys.stderr)
                break
            detailed: list[dict[str, Any]] = []
            for index, candidate in enumerate(candidates, start=1):
                try:
                    metadata = full_metadata(candidate, ydl)
                except YoutubeRateLimited:
                    metadata_circuit_open = True
                    print('[metadata] YouTube rate limit reached; preserving completed civ slices and stopping this run.', file=sys.stderr)
                    break
                if not metadata:
                    continue
                if not matches_civilization(metadata, CIVS[civ], civ):
                    continue
                published = parse_utc(metadata.get('publishedAt'))
                if not published or published < start or published > end:
                    continue
                metadata['transcriptSource'] = 'none'
                metadata['transcriptLanguage'] = ''
                metadata['transcriptProvider'] = 'none'
                metadata['transcriptStatus'] = 'not-requested' if not args.transcripts else 'missing'
                metadata['civ'] = civ
                metadata['signals'] = derive_signals(
                    metadata['title'], metadata['descriptionExcerpt'], '', civ,
                )
                detailed.append(metadata)
                if index % 25 == 0:
                    print(f'[{civ}] inspected {index}/{len(candidates)} candidates, {len(detailed)} in window', flush=True)
            if metadata_circuit_open:
                break
            # Recent videos win first; rank_video breaks ties in favour of
            # engagement without allowing an old video to outrank the window.
            detailed.sort(key=lambda video: (
                parse_utc(video.get('publishedAt')) or datetime.min.replace(tzinfo=timezone.utc),
                rank_video(video),
            ), reverse=True)
            selected = detailed[:args.limit]
            if args.transcripts:
                print(f'[{civ}] fetching transcripts for {len(selected)} selected videos...', flush=True)
                selected, transcript_circuit_open = enrich_transcripts(
                    selected, ydl_options, transcript_circuit_open,
                )
            selected = merge_video_evidence(
                civ,
                CIVS[civ],
                videos_by_civ.get(civ, []),
                selected,
                start,
                end,
                args.limit,
            )
            evidence = build_evidence(selected, start, end, args.limit)
            all_evidence[civ] = evidence
            videos_by_civ[civ] = selected
            write_output(args.output, end, start, end, args.limit, all_evidence, videos_by_civ)
            if not args.no_write_app:
                write_generated(all_evidence)
            print(f'[{civ}] selected {len(selected)}/{args.limit}', flush=True)
    if metadata_circuit_open:
        write_output(args.output, end, start, end, args.limit, all_evidence, videos_by_civ)
        if not args.no_write_app:
            write_generated(all_evidence)
    total_videos = sum(len(videos) for videos in videos_by_civ.values())
    print(f'Wrote {total_videos} videos across {len(all_evidence)} civilizations to {args.output}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
