#!/usr/bin/env python3
"""Harvest and analyze videos and transcripts from @Valdemar1902.

Processes all 370 videos from the channel metadata, linking existing full transcripts,
classifying every video, generating tactical timings, and compiling the full catalog.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

ROOT = Path('K:/aoe4_dlc/AOE4-Analytics')
WORKSPACE_ROOT = Path('K:/aoe4_dlc')
RESEARCH_DIR = ROOT / 'data' / 'research'
RAW_TRANSCRIPT_DIR = RESEARCH_DIR / 'valdemar_transcripts'
ROOT_TRANSCRIPT_DIR = WORKSPACE_ROOT / 'valdemar_transcripts'
DATA_DIR = ROOT / 'data'
GENERATED_TS = ROOT / 'src' / 'data' / 'valdemarCatalog.generated.ts'
CATALOG_JSON = DATA_DIR / 'valdemarCatalog.json'

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
    'jeanne_darc': ("Jeanne d'Arc", 'Jeanne d Arc', 'Jeanne', 'Joan of Arc', 'JDA', 'Jon Dark'),
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

PRO_PLAYERS = (
    'Beasty', 'Beastyqt', 'MarineLorD', 'LoueMT', 'LucifroN', 'VortiX',
    'Corvinus', 'TheViper', 'DeMu', '1Day', 'Puppypaw', 'Wam01', 'State',
    'Snoopa', 'Kiljardi', 'Aniko', 'Crackedy', 'Valdemar', 'Valdy'
)

TIME_RE = re.compile(r'(?<!\d)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)')


def classify_video(title: str, text: str = '') -> str:
    t = title.lower()
    if any(k in t for k in ['coach', 'mistake', 'hardstuck', 'replay', 'analysis', 'gameplay', 'cast', 'watch this', 'think like a pro', 'top of the ladder', 'pro game', 'vs', 'against']):
        return 'match_analysis'
    if any(k in t for k in ['build order', 'build', 'opening', 'boom', 'fast castle', 'fc', 'all in', 'all-in', 'rush', '2tc', 'tempo boom', 'pro scout']):
        return 'build_order'
    if any(k in t for k in ['tier list', 'tierlist', 'tier', 'ranking', 'ranked', 'meta', 'patch', 'update', 'best civ']):
        return 'tier_list_meta'
    if any(k in t for k in ['tip', 'defense', 'counter', 'setting', 'hotkey', 'mechanic', 'micro', 'macro', 'secret', 'rule', 'hack', 'ai problem', 'turtle']):
        return 'mechanics_fundamentals'
    if any(k in t for k in ['guide', 'strat', 'how to play', 'masterclass', 'conqueror', 'complete', 'overview', 'broken', 'op if played', 'why is so strong', 'least played', 'achieve conqueror']):
        return 'civ_guide'
    return 'civ_guide'


def detect_civs(title: str, text: str = '') -> tuple[list[str], list[str]]:
    primary_civs: list[str] = []
    opponent_civs: list[str] = []
    t = title.lower()
    
    for slug, aliases in CIVS.items():
        for a in aliases:
            pattern = rf'\b{re.escape(a.lower())}\b'
            if re.search(pattern, t):
                if slug not in primary_civs:
                    primary_civs.append(slug)
                break
                
    vs_match = re.search(r'(?:vs\.?|against)\s+([a-zA-Z\s\']+)', title, re.IGNORECASE)
    if vs_match:
        target_str = vs_match.group(1).lower()
        for slug, aliases in CIVS.items():
            for a in aliases:
                if re.search(rf'\b{re.escape(a.lower())}\b', target_str):
                    if slug not in opponent_civs and slug not in primary_civs:
                        opponent_civs.append(slug)
                    break

    if not primary_civs and text:
        text_sample = text[:1500].lower()
        for slug, aliases in CIVS.items():
            for a in aliases:
                if re.search(rf'\b{re.escape(a.lower())}\b', text_sample):
                    if slug not in primary_civs:
                        primary_civs.append(slug)
                    break
                    
    return primary_civs, opponent_civs


def detect_pro_players(title: str, text: str = '') -> list[str]:
    found = []
    content = title + ' ' + text[:1500]
    for p in PRO_PLAYERS:
        if re.search(rf'\b{re.escape(p)}\b', content, re.IGNORECASE):
            if p not in found:
                found.append(p)
    return found


def extract_key_tactics(title: str, snippets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tactics: list[dict[str, Any]] = []
    action_keywords = [
        ('2TC Boom', [r'\b2\s*tc\b', r'second town center', r'second tc', r'two tc']),
        ('Fast Castle', [r'fast castle', r'quick castle', r'age up to castle', r'castle age timing']),
        ('Feudal Pressure', [r'feudal rush', r'feudal pressure', r'feudal aggression', r'early aggression', r'all-in', r'all in']),
        ('Pro Scouts', [r'pro scout', r'professional scout', r'bring deer', r'push deer']),
        ('Winery / Berries', [r'winery', r'grand winery', r'berry bush', r'olive oil']),
        ('Hippodrome / Cav', [r'hippodrome', r'triumph', r'cavalry opener']),
        ('Farm Transition', [r'farm transition', r'drop farms', r'farm boom', r'farming setup']),
        ('Relics & Sacred Sites', [r'relics', r'sacred site', r'monastery', r'monks', r'scholar']),
        ('Defense & Walls', [r'palisade', r'wall off', r'outpost', r'tower defense', r'hold defense']),
        ('Counter-Attack', [r'counter attack', r'raid economy', r'punish', r'catch out of position']),
        ('Macro & Idle TC', [r'idle tc', r'keep producing', r'villager queue', r'resource balance']),
    ]
    
    if snippets:
        for label, patterns in action_keywords:
            for s in snippets:
                stext = s['text'].lower()
                if any(re.search(p, stext) for p in patterns):
                    tactics.append({
                        'name': label,
                        'timeSec': int(s['start']),
                        'timeFormatted': f"{int(s['start']//60):02d}:{int(s['start']%60):02d}",
                        'text': s['text'].strip()
                    })
                    break
    else:
        # Infer default tactic points from title
        t_low = title.lower()
        for label, patterns in action_keywords:
            if any(re.search(p, t_low) for p in patterns):
                tactics.append({
                    'name': label,
                    'timeSec': 0,
                    'timeFormatted': '00:00',
                    'text': title
                })
                
    return tactics[:8]


def run_catalog_builder() -> None:
    RAW_TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    ROOT_TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_TS.parent.mkdir(parents=True, exist_ok=True)

    entries_file = Path('K:/aoe4_dlc/data_research_tmp/valdemar_raw_entries.json')
    if not entries_file.exists():
        entries_file = ROOT / 'data' / 'research' / 'valdemar_raw_entries.json'
        
    with open(entries_file, 'r', encoding='utf-8') as f:
        entries = json.load(f)
        
    print(f"Loaded {len(entries)} channel video entries.")
    
    catalog: list[dict[str, Any]] = []
    
    for idx, e in enumerate(entries):
        vid_id = e['id']
        title = e.get('title', '')
        url = e.get('url') or f'https://www.youtube.com/watch?v={vid_id}'
        duration = e.get('duration') or 0
        
        raw_json_file = RAW_TRANSCRIPT_DIR / f'{vid_id}.json'
        raw_txt_file = RAW_TRANSCRIPT_DIR / f'{vid_id}.txt'
        root_txt_file = ROOT_TRANSCRIPT_DIR / f'{vid_id}.txt'
        tmp_json = Path(f'K:/aoe4_dlc/data_research_tmp/transcripts/{vid_id}.json')
        
        snippets: list[dict[str, Any]] = []
        transcript_text = ''
        transcript_status = 'unavailable'
        
        if raw_json_file.exists():
            try:
                with open(raw_json_file, 'r', encoding='utf-8') as rf:
                    cached_data = json.load(rf)
                    snippets = cached_data.get('snippets', [])
                    transcript_status = 'available'
            except Exception:
                pass
        elif tmp_json.exists():
            try:
                with open(tmp_json, 'r', encoding='utf-8') as rf:
                    cached_data = json.load(rf)
                    snippets = cached_data.get('snippets', [])
                    transcript_status = 'available'
                with open(raw_json_file, 'w', encoding='utf-8') as wf:
                    json.dump(cached_data, wf, ensure_ascii=False, indent=2)
            except Exception:
                pass
                
        if snippets:
            formatted_lines = [f"Title: {title}", f"ID: {vid_id}", f"URL: {url}", ""]
            for s in snippets:
                formatted_lines.append(f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}")
            full_txt = "\n".join(formatted_lines)
            transcript_text = " ".join([s['text'] for s in snippets])
            
            with open(raw_txt_file, 'w', encoding='utf-8') as wf:
                wf.write(full_txt)
            with open(root_txt_file, 'w', encoding='utf-8') as wf:
                wf.write(full_txt)

        category = classify_video(title, transcript_text)
        primary_civs, opponent_civs = detect_civs(title, transcript_text)
        players = detect_pro_players(title, transcript_text)
        tactics = extract_key_tactics(title, snippets)
        
        if snippets:
            summary = " ".join([s['text'] for s in snippets[:10]]).strip()
            if len(summary) > 280:
                summary = summary[:277] + '...'
        else:
            summary = title

        item = {
            'id': vid_id,
            'title': title,
            'url': url,
            'durationSec': int(duration),
            'category': category,
            'primaryCivs': primary_civs,
            'opponentCivs': opponent_civs,
            'proPlayers': players,
            'transcriptStatus': transcript_status,
            'snippetsCount': len(snippets),
            'summary': summary,
            'keyTactics': tactics,
            'transcriptExcerpt': transcript_text[:1500] if transcript_text else None,
        }
        catalog.append(item)

    # Save to CATALOG_JSON
    with open(CATALOG_JSON, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(catalog)} catalog entries to {CATALOG_JSON}")
    
    # Save script to scripts dir
    scripts_dest = ROOT / 'scripts' / 'harvest_valdemar_catalog.py'
    with open(__file__, 'r', encoding='utf-8') as sf:
        script_code = sf.read()
    with open(scripts_dest, 'w', encoding='utf-8') as df:
        df.write(script_code)
    print(f"Copied script to {scripts_dest}")
    
    generate_typescript(catalog)


def generate_typescript(catalog: list[dict[str, Any]]) -> None:
    categories_counter: dict[str, int] = {}
    
    for item in catalog:
        cat = item['category']
        categories_counter[cat] = categories_counter.get(cat, 0) + 1

    stats_obj = {
        'totalVideos': len(catalog),
        'transcriptsAvailable': sum(1 for c in catalog if c['transcriptStatus'] == 'available'),
        'categories': categories_counter,
        'updatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
    }

    ts_content = [
        "/**",
        " * Valdemar1902 Comprehensive AoE4 Video & Match Analysis Catalog.",
        " * Generated automatically by scripts/harvest_valdemar_catalog.py.",
        " * Contains 3-year video analysis, transcripts, tactical timings and civ links.",
        " */",
        "",
        "export type ValdemarVideoCategory =",
        "  | 'match_analysis'",
        "  | 'civ_guide'",
        "  | 'build_order'",
        "  | 'mechanics_fundamentals'",
        "  | 'tier_list_meta'",
        "",
        "export interface ValdemarTacticSnippet {",
        "  name: string",
        "  timeSec: number",
        "  timeFormatted: string",
        "  text: string",
        "}",
        "",
        "export interface ValdemarVideoEntry {",
        "  id: string",
        "  title: string",
        "  url: string",
        "  durationSec: number",
        "  category: ValdemarVideoCategory",
        "  primaryCivs: string[]",
        "  opponentCivs: string[]",
        "  proPlayers: string[]",
        "  transcriptStatus: 'available' | 'members_only' | 'unavailable'",
        "  snippetsCount: number",
        "  summary: string",
        "  keyTactics: ValdemarTacticSnippet[]",
        "  transcriptExcerpt?: string | null",
        "}",
        "",
        f"export const VALDEMAR_CATALOG_STATS = {json.dumps(stats_obj, indent=2)};",
        "",
        f"export const VALDEMAR_VIDEOS: readonly ValdemarVideoEntry[] = {json.dumps(catalog, indent=2, ensure_ascii=False)};",
        "",
        "export const VALDEMAR_VIDEOS_BY_ID: ReadonlyMap<string, ValdemarVideoEntry> = new Map(",
        "  VALDEMAR_VIDEOS.map((v) => [v.id, v]),",
        ");",
        "",
        "export const VALDEMAR_VIDEOS_BY_CIV: Readonly<Record<string, readonly ValdemarVideoEntry[]>> = {",
    ]
    
    for civ_slug in sorted(CIVS):
        matching = [v['id'] for v in catalog if civ_slug in v['primaryCivs'] or civ_slug in v['opponentCivs']]
        ts_content.append(f"  '{civ_slug}': [")
        for vid_id in matching:
            ts_content.append(f"    VALDEMAR_VIDEOS_BY_ID.get('{vid_id}')!,")
        ts_content.append("  ],")
        
    ts_content.append("};")
    ts_content.append("")
    ts_content.append("export const VALDEMAR_MATCH_ANALYSES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(")
    ts_content.append("  (v) => v.category === 'match_analysis',")
    ts_content.append(");")
    ts_content.append("")
    ts_content.append("export const VALDEMAR_BUILD_ORDERS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(")
    ts_content.append("  (v) => v.category === 'build_order',")
    ts_content.append(");")
    ts_content.append("")
    ts_content.append("export const VALDEMAR_CIV_GUIDES: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(")
    ts_content.append("  (v) => v.category === 'civ_guide',")
    ts_content.append(");")
    ts_content.append("")
    ts_content.append("export const VALDEMAR_FUNDAMENTALS: readonly ValdemarVideoEntry[] = VALDEMAR_VIDEOS.filter(")
    ts_content.append("  (v) => v.category === 'mechanics_fundamentals' || v.category === 'tier_list_meta',")
    ts_content.append(");")
    ts_content.append("")

    with open(GENERATED_TS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(ts_content))
    print(f"Generated TypeScript catalog at {GENERATED_TS}")


if __name__ == '__main__':
    run_catalog_builder()
