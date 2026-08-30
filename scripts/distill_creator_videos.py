#!/usr/bin/env python3
"""Distill per-video build/mechanics lessons from EXISTING creator transcripts.

Extends harvest_valdemar_catalog.py + harvest_aoe4_videos.py. Does not invent
captions: a quote is stored only when a real snippet/chapter/description
timestamp exists on disk.

Sources (read-only):
  data/valdemarCatalog.json
  data/research/valdemar_transcripts/<id>.json
  data/beastyCatalog.json
  data/beastyMacroTranscript.json          (NeoDLP chapters)
  data/beastyMicroTranscript.json
  data/_tmp_macro/<id>.info.json           (yt-dlp metadata)
  data/_tmp_micro/<id>.info.json

Outputs:
  data/creatorVideoLessons.json
  src/data/creatorVideoLessons.generated.ts
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SRC_DATA = ROOT / 'src' / 'data'
VALDEMAR_TRANSCRIPTS = DATA / 'research' / 'valdemar_transcripts'
BEASTY_MACRO = DATA / 'beastyMacroTranscript.json'
BEASTY_MICRO = DATA / 'beastyMicroTranscript.json'
YT_ID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
TIME_LINE_RE = re.compile(
    r'(?:^|\n)\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—]\s*(.+?)(?=\n|$)',
)

BUILD_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ('2TC Boom', (r'\b2\s*tc\b', r'second town center', r'second tc', r'two tc')),
    ('Fast Castle', (r'fast castle', r'quick castle', r'age up to castle', r'castle age timing')),
    ('Feudal Pressure', (r'feudal rush', r'feudal pressure', r'feudal aggression', r'early aggression', r'all-in', r'all in')),
    ('Pro Scouts', (r'pro scout', r'professional scout', r'bring deer', r'push deer')),
    ('Trade', (r'\btrade\b', r'trade wing', r'market boom')),
    ('Farm Transition', (r'farm transition', r'drop farms', r'farm boom', r'when to add farms')),
    ('Winery / Berries', (r'winery', r'grand winery', r'berry bush', r'olive oil')),
)

MECHANIC_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ('Idle TC', (r'idle tc', r'keep producing', r'keep making workers', r'villager queue')),
    ('Micro / Stutter-step', (r'stutter', r'kiting', r'attack move', r'target fire')),
    ('Relics & Sacred Sites', (r'relics', r'sacred site', r'monastery', r'monks')),
    ('Walls & Keeps', (r'palisade', r'wall', r'keep placement', r'outpost')),
    ('Production Timing', (r'when to make production', r'production building', r'add production')),
    ('Age-up Timing', (r'when to age up', r'age up', r'feudal timing')),
    ('Raid / Denial', (r'raid', r'deny gold', r'woodline', r'pick(?:ing)? off villagers')),
    ('Siege', (r'springald', r'mangonel', r'trebuchet', r'siege')),
    ('Shift Queue', (r'shift queu', r'shift-click')),
)


def fmt_time(sec: int) -> str:
    sec = max(0, int(sec))
    return f'{sec // 60:02d}:{sec % 60:02d}'


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def first_hit(snippets: list[dict[str, Any]], patterns: tuple[str, ...]) -> dict[str, Any] | None:
    for snippet in snippets:
        text = str(snippet.get('text') or '').strip()
        if not text:
            continue
        lowered = text.lower()
        if any(re.search(pattern, lowered) for pattern in patterns):
            start = snippet.get('start', snippet.get('timeSec', 0)) or 0
            return {
                'name': '',
                'timeSec': int(float(start)),
                'timeFormatted': fmt_time(int(float(start))),
                'quote': text[:220],
            }
    return None


def extract_labeled(
    snippets: list[dict[str, Any]],
    groups: tuple[tuple[str, tuple[str, ...]], ...],
    limit: int,
) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for name, patterns in groups:
        hit = first_hit(snippets, patterns)
        if hit is None:
            continue
        hit['name'] = name
        found.append(hit)
        if len(found) >= limit:
            break
    return found


def chapters_from_description(description: str) -> list[dict[str, Any]]:
    chapters: list[dict[str, Any]] = []
    seen: set[int] = set()
    for match in TIME_LINE_RE.finditer(description or ''):
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        title = match.group(4).strip()
        if not title or title.upper() == 'SUBSCRIBE':
            continue
        time_sec = hours * 3600 + minutes * 60 + seconds
        if time_sec in seen:
            continue
        seen.add(time_sec)
        chapters.append({
            'name': title[:80],
            'timeSec': time_sec,
            'timeFormatted': fmt_time(time_sec),
            'quote': title[:220],
        })
    return chapters


def snippets_from_beasty_file(path: Path) -> tuple[list[dict[str, Any]], str]:
    payload = load_json(path)
    if not isinstance(payload, list):
        return [], ''
    snippets: list[dict[str, Any]] = []
    description = ''
    for row in payload:
        if not isinstance(row, dict):
            continue
        text = str(row.get('text') or '').strip()
        if not text:
            continue
        if row.get('type') == 'chapter':
            snippets.append({'text': text, 'start': int(row.get('timeSec') or 0)})
            continue
        if '00:00' in text and ' - ' in text:
            description = text
            snippets.extend(
                {'text': item['name'], 'start': item['timeSec']}
                for item in chapters_from_description(text)
            )
    return snippets, description


def lesson(
    *,
    creator: str,
    video_id: str,
    title: str,
    url: str,
    duration_sec: int,
    category: str,
    primary_civs: list[str],
    opponent_civs: list[str],
    snippets: list[dict[str, Any]],
    source: str,
) -> dict[str, Any]:
    builds = extract_labeled(snippets, BUILD_PATTERNS, 6)
    mechanics = extract_labeled(snippets, MECHANIC_PATTERNS, 8)
    if not mechanics:
        mechanics = [
            {
                'name': str(row.get('text') or row.get('name') or 'Chapter')[:80],
                'timeSec': int(float(row.get('start') or row.get('timeSec') or 0)),
                'timeFormatted': fmt_time(int(float(row.get('start') or row.get('timeSec') or 0))),
                'quote': str(row.get('text') or '')[:220],
            }
            for row in snippets[:12]
            if str(row.get('text') or '').strip()
        ]
    summary_bits = [str(row.get('text') or '').strip() for row in snippets[:8] if str(row.get('text') or '').strip()]
    summary = ' '.join(summary_bits)[:280] if summary_bits else title
    return {
        'creator': creator,
        'id': video_id,
        'title': title,
        'url': url,
        'durationSec': int(duration_sec or 0),
        'category': category,
        'primaryCivs': primary_civs,
        'opponentCivs': opponent_civs,
        'transcriptStatus': 'available',
        'snippetsCount': len(snippets),
        'source': source,
        'summary': summary,
        'builds': builds,
        'mechanics': mechanics[:12],
    }


def distill_valdemar() -> list[dict[str, Any]]:
    catalog = load_json(DATA / 'valdemarCatalog.json') or []
    by_id = {item['id']: item for item in catalog if isinstance(item, dict) and item.get('id')}
    lessons: list[dict[str, Any]] = []
    for path in sorted(VALDEMAR_TRANSCRIPTS.glob('*.json')):
        video_id = path.stem
        cached = load_json(path)
        snippets = cached.get('snippets') if isinstance(cached, dict) else None
        if not isinstance(snippets, list) or not snippets:
            continue
        meta = by_id.get(video_id, {})
        title = str(cached.get('title') or meta.get('title') or video_id)
        lessons.append(
            lesson(
                creator='valdemar',
                video_id=video_id,
                title=title,
                url=str(meta.get('url') or f'https://www.youtube.com/watch?v={video_id}'),
                duration_sec=int(meta.get('durationSec') or 0),
                category=str(meta.get('category') or 'civ_guide'),
                primary_civs=list(meta.get('primaryCivs') or []),
                opponent_civs=list(meta.get('opponentCivs') or []),
                snippets=[{'text': s.get('text'), 'start': s.get('start', 0)} for s in snippets if isinstance(s, dict)],
                source='valdemar_transcripts',
            )
        )
    return lessons


def distill_beasty() -> list[dict[str, Any]]:
    lessons: list[dict[str, Any]] = []
    catalog = load_json(DATA / 'beastyCatalog.json') or []
    catalog_by_id = {
        item['id']: item
        for item in catalog
        if isinstance(item, dict) and isinstance(item.get('id'), str) and YT_ID_RE.match(item['id'])
    }

    masterclass = (
        ('vrH85EESrSY', BEASTY_MACRO, DATA / '_tmp_macro' / 'vrH85EESrSY.info.json', 'mechanics', 'macro'),
        ('FdJFDsXr4ws', BEASTY_MICRO, DATA / '_tmp_micro' / 'FdJFDsXr4ws.info.json', 'mechanics', 'micro'),
    )
    for video_id, transcript_path, info_path, category, label in masterclass:
        snippets, description = snippets_from_beasty_file(transcript_path)
        info = load_json(info_path) if info_path.exists() else None
        title = video_id
        duration = 0
        if isinstance(info, dict):
            title = str(info.get('title') or title)
            duration = int(info.get('duration') or 0)
            if not snippets:
                snippets = [
                    {'text': item['name'], 'start': item['timeSec']}
                    for item in chapters_from_description(str(info.get('description') or ''))
                ]
        if not snippets and description:
            snippets = [{'text': item['name'], 'start': item['timeSec']} for item in chapters_from_description(description)]
        if not snippets:
            continue
        meta = catalog_by_id.get(video_id, {})
        lessons.append(
            lesson(
                creator='beastyqt',
                video_id=video_id,
                title=str(meta.get('title') or title),
                url=f'https://www.youtube.com/watch?v={video_id}',
                duration_sec=int(meta.get('durationSec') or duration),
                category=str(meta.get('category') or category),
                primary_civs=list(meta.get('primaryCivs') or []),
                opponent_civs=list(meta.get('opponentCivs') or []),
                snippets=snippets,
                source=f'beasty_{label}_neodlp',
            )
        )

    folder = DATA / 'research' / 'beasty_transcripts'
    if folder.exists():
        seen = {item['id'] for item in lessons}
        for path in sorted(folder.glob('*.json')):
            video_id = path.stem
            if video_id in seen:
                continue
            cached = load_json(path)
            snippets = cached.get('snippets') if isinstance(cached, dict) else None
            if not isinstance(snippets, list) or not snippets:
                continue
            meta = catalog_by_id.get(video_id, {})
            lessons.append(
                lesson(
                    creator='beastyqt',
                    video_id=video_id,
                    title=str(cached.get('title') or meta.get('title') or video_id),
                    url=str(meta.get('url') or f'https://www.youtube.com/watch?v={video_id}'),
                    duration_sec=int(meta.get('durationSec') or 0),
                    category=str(meta.get('category') or 'civ_guide'),
                    primary_civs=list(meta.get('primaryCivs') or []),
                    opponent_civs=list(meta.get('opponentCivs') or []),
                    snippets=[{'text': s.get('text'), 'start': s.get('start', 0)} for s in snippets if isinstance(s, dict)],
                    source='beasty_transcripts',
                )
            )
            seen.add(video_id)

    return lessons


def write_typescript(lessons: list[dict[str, Any]], stats: dict[str, Any]) -> None:
    payload = json.dumps(lessons, ensure_ascii=False, indent=2)
    stats_json = json.dumps(stats, indent=2)
    SRC_DATA.joinpath('creatorVideoLessons.generated.ts').write_text(
        '\n'.join(
            [
                '/** Generated by scripts/distill_creator_videos.py from on-disk transcripts. */',
                '',
                "export type CreatorId = 'valdemar' | 'beastyqt'",
                '',
                'export interface CreatorLessonBeat {',
                '  name: string',
                '  timeSec: number',
                '  timeFormatted: string',
                '  quote: string',
                '}',
                '',
                'export interface CreatorVideoLesson {',
                '  creator: CreatorId',
                '  id: string',
                '  title: string',
                '  url: string',
                '  durationSec: number',
                '  category: string',
                '  primaryCivs: string[]',
                '  opponentCivs: string[]',
                "  transcriptStatus: 'available'",
                '  snippetsCount: number',
                '  source: string',
                '  summary: string',
                '  builds: CreatorLessonBeat[]',
                '  mechanics: CreatorLessonBeat[]',
                '}',
                '',
                f'export const CREATOR_VIDEO_LESSON_STATS = {stats_json} as const',
                '',
                f'export const CREATOR_VIDEO_LESSONS: readonly CreatorVideoLesson[] = {payload}',
                '',
                'export const CREATOR_VIDEO_LESSONS_BY_ID: ReadonlyMap<string, CreatorVideoLesson> = new Map(',
                '  CREATOR_VIDEO_LESSONS.map((lesson) => [lesson.id, lesson]),',
                ')',
                '',
            ]
        ),
        encoding='utf-8',
    )


def main() -> int:
    valdemar = distill_valdemar()
    beasty = distill_beasty()
    lessons = [*valdemar, *beasty]
    stats = {
        'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'totalLessons': len(lessons),
        'valdemarWithTranscripts': len(valdemar),
        'beastyWithTranscripts': len(beasty),
        'valdemarCatalogVideos': len(load_json(DATA / 'valdemarCatalog.json') or []),
        'beastyCatalogVideos': len(load_json(DATA / 'beastyCatalog.json') or []),
        'note': 'Quotes exist only for videos with on-disk transcripts/chapters. Catalog shells without captions are not listed here.',
    }
    DATA.joinpath('creatorVideoLessons.json').write_text(
        json.dumps({'stats': stats, 'lessons': lessons}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    write_typescript(lessons, stats)
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
