"""Emit curated Macedonian active build-order JSON from aoe4guides overlay snapshots."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ACTIVE = ROOT / "src" / "data" / "activeBuildOrders"
ARCHIVE_COPY = ROOT / "src" / "data" / "buildOrders"


def iso(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def step(
    age: int,
    time: str | None,
    vills: int,
    food: int,
    wood: int,
    gold: int,
    stone: int,
    notes: list[str],
    builder: int = -1,
    provenance: str | None = "stated",
) -> dict:
    rec: dict = {
        "age": age,
        "population_count": -1,
        "villager_count": vills,
        "resources": {
            "food": food,
            "wood": wood,
            "gold": gold,
            "stone": stone,
            "builder": builder,
        },
        "notes": notes,
    }
    if time:
        rec["time"] = time
        rec["timeProvenance"] = provenance or "stated"
    return rec


def evidence(video_id: str, title: str, url: str, channel: str, published: str, views: int | None, excerpt: str) -> dict:
    source = {
        "id": video_id,
        "title": title,
        "url": url,
        "channel": channel,
        "publishedAt": published,
        "viewCount": views,
        "transcriptLanguage": None,
        "transcriptSource": "none",
        "transcriptProvider": "none",
        "transcriptStatus": "missing",
        "transcriptWordCount": 0,
        "transcriptExcerpt": excerpt,
        "sourceKind": "guide",
        "frameCheckpoints": [],
        "signals": {
            "archetype": None,
            "actions": [],
            "resources": [],
            "topics": [],
            "opponentCivs": [],
            "militaryMentions": [],
            "timings": [],
            "confidence": 0.7,
        },
    }
    return {
        "schemaVersion": 1,
        "windowStart": "2025-11-01",
        "windowEnd": "2026-08-23",
        "sampleSize": 1,
        "requestedSampleSize": 1,
        "coverageNote": "YouTube oEmbed title/channel plus aoe4guides overlay timings. Captions were empty on the public timedtext endpoint.",
        "commonActions": [],
        "commonResources": [],
        "commonTopics": [],
        "commonOpponents": [],
        "commonMilitaryMentions": [],
        "timingSignals": [],
        "sources": [source],
    }


BEASTY = {
    "description": "Эталон Beastyqt (HankBot overlay, S13): Warcamp → Imperial Hippodrome (~3:53) → давление всадником → Varangian Stronghold/Arsenal/Market → Golden Horn Tower. Видео GIErhV3Eeys.",
    "civilization": "Macedonian Dynasty",
    "name": "Macedonian Standard (Beasty)",
    "author": "HankBot / Beastyqt",
    "source": "https://aoe4guides.com/builds/sJ31bLURiStxpn0XaKkE, https://www.youtube.com/watch?v=GIErhV3Eeys",
    "build_order": [
        step(1, "00:00", 5, 5, 0, 0, 0, ["5 @unit_worker/villager.webp@ на @resource/sheep.webp@."]),
        step(
            1,
            None,
            5,
            5,
            0,
            0,
            0,
            [
                "1 @unit_worker/villager.webp@ чинит @building_macedonian/varangian_warcamp.webp@, затем на @resource/sheep.webp@."
            ],
        ),
        step(
            1,
            None,
            8,
            6,
            0,
            2,
            0,
            [
                "2 @resource/rally.webp@ на @building_economy/mining-camp.webp@ → @resource/resource_gold.webp@."
            ],
        ),
        step(1, "02:16", 13, 11, 0, 2, 0, ["5 @resource/rally.webp@ на @resource/sheep.webp@."]),
        step(
            1,
            "02:23",
            9,
            7,
            0,
            2,
            0,
            [
                "4 с @resource/resource_food.webp@ на @landmark_byzantines/imperial-hippodrome-1.webp@.",
            ],
            builder=4,
        ),
        step(
            1,
            None,
            9,
            5,
            2,
            2,
            0,
            [
                "2 с @resource/resource_food.webp@ на @building_economy/lumber-camp.webp@ → @resource/resource_wood.webp@."
            ],
        ),
        step(1, None, 13, 5, 6, 2, 0, ["4 @resource/rally.webp@ на @resource/resource_wood.webp@."]),
        step(
            1,
            None,
            12,
            5,
            5,
            2,
            0,
            [
                "1 с @resource/resource_wood.webp@ ставит @building_economy/house.webp@, обратно на дерево."
            ],
        ),
        step(
            2,
            "03:53",
            17,
            5,
            6,
            6,
            0,
            [
                "4 с @landmark_byzantines/imperial-hippodrome-1.webp@ на @resource/resource_gold.webp@. Feudal ~3:53."
            ],
        ),
        step(
            2,
            None,
            17,
            5,
            6,
            6,
            0,
            [
                "1 @unit_cavalry/horseman-1.webp@ с ипподрома. Если оппонента можно харассить — очередь 2–3."
            ],
        ),
        step(2, None, 17, 5, 6, 6, 0, ["@technology_economy/specialized-pick.webp@."]),
        step(
            2,
            None,
            16,
            4,
            6,
            6,
            0,
            [
                "1 с @resource/resource_food.webp@ ставит @building_macedonian/varangian_stronghold.webp@."
            ],
        ),
        step(
            2,
            None,
            15,
            4,
            6,
            5,
            0,
            ["1 с @resource/resource_gold.webp@ ставит @building_economy/market.webp@."],
        ),
        step(
            2,
            None,
            14,
            4,
            6,
            4,
            0,
            [
                "1 с @resource/resource_gold.webp@ ставит @building_macedonian/varangian_arsenal.webp@."
            ],
        ),
        step(2, None, 18, 8, 6, 4, 0, ["4 @resource/rally.webp@ на @resource/resource_food.webp@."]),
        step(2, None, 24, 8, 6, 10, 0, ["6 @resource/rally.webp@ на @resource/resource_gold.webp@."]),
        step(2, None, 31, 15, 6, 10, 0, ["7 @resource/rally.webp@ на @resource/resource_food.webp@."]),
        step(
            2,
            None,
            34,
            15,
            6,
            13,
            0,
            [
                "3 с @building_macedonian/varangian_arsenal.webp@ на @resource/resource_gold.webp@."
            ],
        ),
        step(2, None, 41, 15, 6, 20, 0, ["7 @resource/rally.webp@ на @resource/resource_gold.webp@."]),
        step(
            3,
            None,
            31,
            15,
            6,
            10,
            0,
            [
                "10 с @resource/resource_gold.webp@ на @landmark_byzantines/golden-horn-tower-2.webp@."
            ],
            builder=10,
        ),
        step(
            3,
            None,
            31,
            15,
            6,
            10,
            0,
            ["Прикрывай ресурсы и базу, пока идёт ап в Castle."],
        ),
    ],
    "video": "https://www.youtube.com/watch?v=GIErhV3Eeys",
    "season": 13,
    "map": None,
    "strategy": "Warcamp, Imperial Hippodrome, horseman, Varangian eco, Golden Horn Tower",
    "provider": "aoe4guides",
    "providerId": "sJ31bLURiStxpn0XaKkE",
    "score": 1.3862943611198906,
    "views": 4,
    "likes": 0,
    "upvotes": 0,
    "timeCreated": iso(1785494374),
    "timeUpdated": iso(1785494374),
    "modes": ["1x1"],
    "mapTypes": ["open", "hybrid"],
    "role": "tempo",
    "status": "active",
    "queue": "rm_solo",
    "teamSize": 1,
    "strategyKey": "tempo",
    "metaTier": "meta_core",
    "buildGroup": "mac_beasty_hippodrome",
    "rankFit": "all+conqueror",
    "verifiedPatch": "10604,10884,11214,11308",
    "lastVerified": "2026-08-23",
    "gameBuild": "16.3.11308",
    "schemaVersion": 1,
    "origin": "curated",
    "capturedAt": "2026-08-23T00:00:00Z",
    "patch": "16.3.11308",
    "updatedAt": "2026-08-23T00:00:00Z",
    "archetype": "Standard opening",
    "difficulty": "medium",
    "reasoning": "Beasty Hippodrome — дефолт MAC 1v1 (S13 overlay HankBot, 21 шаг, feudal ~3:53). Видео GIErhV3Eeys.",
    "ageTimings": [{"age": 2, "seconds": 233, "derived": False, "stepIndex": 8}],
    "tactics": [
        {
            "id": "beasty-warcamp-open",
            "category": "opening",
            "title": "Warcamp from spawn, 2 gold, Hippodrome at 2:23",
            "detail": "Five on sheep, one repairs Warcamp, two gold, Hippodrome with four at 2:23.",
            "timeSec": 0,
            "confidence": 0.92,
        },
        {
            "id": "beasty-feudal-353",
            "category": "transition",
            "title": "Feudal ~3:53, horseman then Stronghold/Market/Arsenal",
            "detail": "Landmark vills to gold. One horseman, or two–three if you can harass. Then Stronghold, Market, Arsenal.",
            "timeSec": 233,
            "confidence": 0.9,
        },
        {
            "id": "beasty-ght",
            "category": "transition",
            "title": "Ten gold vills on Golden Horn Tower",
            "detail": "Bank gold, click Castle with ten from gold, cover the base while ageing.",
            "timeSec": None,
            "confidence": 0.86,
        },
    ],
    "video_evidence": evidence(
        "GIErhV3Eeys",
        "BEST Macedonian Dynasty Build Order Guide",
        "https://www.youtube.com/watch?v=GIErhV3Eeys",
        "BeastyqtSC2",
        "2026-03-13T12:30:32Z",
        28673,
        "BEST Macedonian Dynasty Build Order Guide",
    ),
}

VORTIX = {
    "description": "VortiX: Hippodrome (~4:03) → 3–4 всадника → Varangian Guard spam. Ответ на жадный 2TC (English, Chinese, Abbasid, Lancaster, Ayyubids, Zhu Xi). Видео OezixLpYQEw.",
    "civilization": "Macedonian Dynasty",
    "opponentCivilization": [
        "English",
        "Chinese",
        "Abbasid Dynasty",
        "House of Lancaster",
        "Ayyubids",
        "Zhu Xi's Legacy",
    ],
    "name": "[1x1][OPEN][MAC][PRESSURE] VortiX Feudal Varangian Guard rush",
    "author": "VortiX / murtuk (AoE4Guides)",
    "source": "https://aoe4guides.com/builds/RgHNHa5jDWnCw7pY67UL, https://www.youtube.com/watch?v=OezixLpYQEw",
    "build_order": [
        step(
            1,
            "00:00",
            6,
            6,
            0,
            0,
            0,
            [
                "6 на @resource/resource_food.webp@. @resource/rally.webp@ на @resource/resource_gold.webp@ до 2, с @abilities/repair.webp@ @building_macedonian/varangian_warcamp.webp@."
            ],
        ),
        step(
            1,
            "01:00",
            9,
            7,
            0,
            2,
            0,
            ["Дальше @resource/rally.webp@ на @resource/resource_food.webp@ до апа."],
        ),
        step(
            1,
            "02:22",
            13,
            6,
            3,
            0,
            0,
            [
                "Ап в @age/age_2.webp@ четырьмя с @resource/resource_food.webp@ (перед этим 1 @abilities/repair.webp@ @building_economy/house.webp@), потом обратно на еду.",
                "Ралли на @resource/resource_wood.webp@: 1 с еды + 2 с золота на дерево.",
            ],
            builder=4,
        ),
        step(
            2,
            "04:03",
            18,
            10,
            8,
            0,
            0,
            [
                "@landmark_byzantines/imperial-hippodrome-1.webp@ готов в 4:03. Аперы обратно на @resource/resource_food.webp@ (дом по дороге).",
                "Делай @unit_cavalry/horseman-1.webp@ до 3–4 и дави.",
            ],
        ),
        step(
            2,
            "04:30",
            19,
            15,
            4,
            0,
            0,
            [
                "5 с @resource/resource_wood.webp@ на @resource/deer.webp@; один из них чинит @building_macedonian/varangian_stronghold.webp@ (оборона)."
            ],
        ),
        step(
            2,
            "05:10",
            21,
            15,
            4,
            2,
            0,
            ["2 с @resource/resource_wood.webp@ на @resource/resource_gold.webp@."],
        ),
        step(
            2,
            "05:30",
            22,
            15,
            5,
            2,
            0,
            ["Второй @building_macedonian/varangian_stronghold.webp@."],
        ),
        step(
            2,
            "05:50",
            23,
            12,
            6,
            5,
            0,
            [
                "3 с @resource/resource_food.webp@ на @resource/resource_gold.webp@, @building_economy/house.webp@.",
                "@technology_economy/survival-techniques.webp@, когда хватит золота.",
            ],
        ),
        step(
            2,
            "06:20",
            25,
            12,
            8,
            5,
            0,
            [
                "@abilities/repair.webp@ @building_macedonian/varangian_arsenal.webp@ у золота.",
                "Спамь @unit_byzantines/varangian-guard-3.webp@.",
            ],
        ),
        step(
            2,
            "07:20",
            28,
            12,
            6,
            10,
            0,
            [
                "При 200 дерева: 5 с дерева на @resource/resource_gold.webp@.",
                "Третий @building_macedonian/varangian_stronghold.webp@. Сначала @technology_macedonian/butted-chainmail-2.webp@, затем @technology_macedonian/pattern-welding-2.webp@.",
            ],
        ),
        step(
            2,
            "08:10",
            30,
            17,
            3,
            10,
            0,
            [
                "5 с @resource/resource_wood.webp@ на @resource/berrybush.webp@ с @building_economy/mill.webp@."
            ],
        ),
        step(
            2,
            "09:00",
            33,
            17,
            6,
            10,
            0,
            ["Экономические и военные апгрейды (еда / дерево / золото)."],
        ),
        step(
            2,
            "09:50",
            -1,
            0,
            0,
            0,
            0,
            [
                "Ориентир армии: 17 @unit_byzantines/varangian-guard-3.webp@ + 4 @unit_cavalry/horseman-1.webp@ + чемпионы.",
                "@technology_military/siege-engineering.webp@, если нужен пуш @unit_byzantines/cheirosiphon-3.webp@.",
            ],
        ),
    ],
    "video": "https://www.youtube.com/watch?v=OezixLpYQEw",
    "season": 13,
    "map": None,
    "strategy": "Hippodrome horsemen into Varangian Guard vs 2TC",
    "provider": "aoe4guides",
    "providerId": "RgHNHa5jDWnCw7pY67UL",
    "score": 4.248495242049359,
    "views": 120,
    "likes": 0,
    "upvotes": 1,
    "timeCreated": iso(1787129119),
    "timeUpdated": iso(1787129119),
    "modes": ["1x1"],
    "mapTypes": ["open", "hybrid"],
    "role": "pressure",
    "status": "active",
    "queue": "rm_solo",
    "teamSize": 1,
    "strategyKey": "pressure",
    "metaTier": "meta_core",
    "buildGroup": "mac_vortix_vg",
    "rankFit": "all+conqueror",
    "verifiedPatch": "10604,10884,11214,11308",
    "lastVerified": "2026-08-23",
    "gameBuild": "16.3.11308",
    "schemaVersion": 1,
    "origin": "curated",
    "capturedAt": "2026-08-23T00:00:00Z",
    "patch": "16.3.11308",
    "updatedAt": "2026-08-23T00:00:00Z",
    "archetype": "Feudal aggression",
    "difficulty": "hard",
    "reasoning": "Август 2026: ответ MAC на жадный 2TC. Hippodrome-всадники в VG; timed aoe4guides S13 (patch 16.3.11308).",
    "ageTimings": [{"age": 2, "seconds": 243, "derived": False, "stepIndex": 3}],
    "tactics": [
        {
            "id": "vortix-2tc-punish",
            "category": "opening",
            "title": "Vs 2TC: horses then Varangian Guard",
            "detail": "Hippodrome at 4:03, 3–4 horsemen, Stronghold on deer, then VG from Arsenal.",
            "timeSec": 243,
            "confidence": 0.93,
        },
        {
            "id": "vortix-third-stronghold",
            "category": "military",
            "title": "Third Stronghold + mail/welding at 7:20",
            "detail": "At 200 wood pull five to gold, drop the third Stronghold, Butted Chainmail then Pattern Welding.",
            "timeSec": 440,
            "confidence": 0.9,
        },
    ],
    "video_evidence": evidence(
        "OezixLpYQEw",
        "TUTORIAL Macedonios AOE4 | Así se juega MACEDONIAN DYNASTY",
        "https://www.youtube.com/watch?v=OezixLpYQEw",
        "VortiX",
        iso(1787129119),
        None,
        "TUTORIAL Macedonios AOE4 | Así se juega MACEDONIAN DYNASTY",
    ),
}

VALDEMAR_HIPPO = {
    "description": "Valdemar 2026: Hippodrome aggro (~4:20) в Castle timing. 3 на золото, олени, Survival Techniques, всадник + wheelbarrow, Stronghold на оленях. Видео LKH4uwXd24E.",
    "civilization": "Macedonian Dynasty",
    "name": "[1x1][OPEN][MAC][TEMPO] Valdemar: Hippodrome 2026",
    "author": "Valdemar1902 / Valdy",
    "source": "https://aoe4guides.com/builds/HuzXbYxxy3LMgjhXA9n0, https://www.youtube.com/watch?v=LKH4uwXd24E",
    "build_order": [
        step(
            1,
            "00:00",
            6,
            6,
            0,
            0,
            0,
            [
                "6 @unit_worker/villager.webp@ на @resource/sheep.webp@. @unit_cavalry/scout.webp@ вокруг базы ищет @resource/deer.webp@."
            ],
        ),
        step(
            1,
            "00:20",
            7,
            6,
            0,
            1,
            0,
            ["@resource/rally.webp@ 3 @unit_worker/villager.webp@ на @resource/resource_gold.webp@."],
        ),
        step(
            1,
            "00:30",
            7,
            6,
            0,
            1,
            0,
            [
                "5 с @resource/sheep.webp@ на @resource/deer.webp@, как только найдёшь оленей."
            ],
            provenance="derived",
        ),
        step(1, None, -1, 0, 0, 0, 0, ["@technology_economy/survival-techniques.webp@."]),
        step(
            1,
            "01:20",
            10,
            7,
            0,
            3,
            0,
            ["@resource/rally.webp@ обратно на @resource/sheep.webp@ до @age/age_2.webp@."],
        ),
        step(
            1,
            "02:45",
            13,
            5,
            1,
            3,
            0,
            [
                "Ап с @landmark_byzantines/imperial-hippodrome-1.webp@ около 2:45 четырьмя @unit_worker/villager.webp@."
            ],
            builder=4,
        ),
        step(
            1,
            "02:50",
            9,
            5,
            1,
            3,
            0,
            ["Макро: 8 на @resource/resource_wood.webp@."],
        ),
        step(
            2,
            "04:20",
            19,
            9,
            7,
            3,
            0,
            [
                "Аперы снова на @resource/sheep.webp@. Очередь @technology_economy/wheelbarrow.webp@ и @unit_cavalry/horseman-1.webp@."
            ],
        ),
        step(
            2,
            "05:10",
            21,
            10,
            8,
            3,
            0,
            [
                "@technology_economy/double-broadaxe.webp@. @building_macedonian/varangian_stronghold.webp@ крестьянами с оленей и @building_defensive/outpost.webp@."
            ],
        ),
        step(
            2,
            None,
            -1,
            0,
            0,
            0,
            0,
            [
                "Производи нужные юниты, забирай кабана и второго оленя, харассь оппонента."
            ],
        ),
        step(
            2,
            "06:00",
            24,
            13,
            8,
            3,
            0,
            [
                "@building_macedonian/varangian_arsenal.webp@ на золоте. Приоритет: броня кавалерии и урон лучников (если есть лучники)."
            ],
        ),
        step(
            2,
            None,
            -1,
            0,
            0,
            0,
            0,
            [
                "Около 9–10 мин тяни дерево на золото и готовь Castle. Дальше — по видео."
            ],
        ),
    ],
    "video": "https://www.youtube.com/watch?v=LKH4uwXd24E",
    "season": 13,
    "map": None,
    "strategy": "Hippodrome aggro into Castle timing (2026)",
    "provider": "aoe4guides",
    "providerId": "HuzXbYxxy3LMgjhXA9n0",
    "score": 1.8125923187304457e-08,
    "views": 5996,
    "likes": 12,
    "upvotes": 5,
    "timeCreated": iso(1770948379),
    "timeUpdated": iso(1770949071),
    "modes": ["1x1"],
    "mapTypes": ["open", "hybrid"],
    "role": "tempo",
    "status": "active",
    "queue": "rm_solo",
    "teamSize": 1,
    "strategyKey": "tempo",
    "metaTier": "meta_core",
    "buildGroup": "mac_valdemar_hippodrome",
    "rankFit": "all+conqueror",
    "verifiedPatch": "10604,10884,11214,11308",
    "lastVerified": "2026-08-23",
    "gameBuild": "16.3.11308",
    "schemaVersion": 1,
    "origin": "curated",
    "capturedAt": "2026-08-23T00:00:00Z",
    "patch": "16.3.11308",
    "updatedAt": "2026-08-23T00:00:00Z",
    "archetype": "Timing attack",
    "difficulty": "medium",
    "reasoning": "Valdemar 2026 Hippodrome — актуальный MAC гайд (LKH4uwXd24E): олени, Survival Techniques, feudal 4:20, Castle окно 9–10 мин.",
    "ageTimings": [{"age": 2, "seconds": 260, "derived": False, "stepIndex": 7}],
    "tactics": [
        {
            "id": "valdy-deer-st",
            "category": "economy",
            "title": "Three gold, deer, Survival Techniques",
            "detail": "Rally three gold, pull five to deer, Survival Techniques, then sheep until Hippodrome at 2:45.",
            "timeSec": 30,
            "confidence": 0.92,
        },
        {
            "id": "valdy-castle-window",
            "category": "transition",
            "title": "Wood to gold at 9–10 min for Castle",
            "detail": "After Arsenal and cav armor, collapse the woodline onto gold for the Castle timing.",
            "timeSec": 540,
            "confidence": 0.85,
        },
    ],
    "video_evidence": evidence(
        "LKH4uwXd24E",
        "How To Play Macedonian Dynasty In 2026 | AoE4",
        "https://www.youtube.com/watch?v=LKH4uwXd24E",
        "Valdy",
        "2026-02-13T16:00:36Z",
        17946,
        "How To Play Macedonian Dynasty In 2026 | AoE4",
    ),
}

VALDEMAR_WINERY = {
    "description": "Valdemar DLC: феодальная агрессия через Grand Winery на ягодах (~4:10). Tricomp (всадник / копьё / лучник), затем Riddari. Видео zoA922O-HQM.",
    "civilization": "Macedonian Dynasty",
    "name": "[1x1][OPEN][MAC][PRESSURE] Valdemar: Feudal Winery",
    "author": "Valdemar1902 / Valdy",
    "source": "https://aoe4guides.com/builds/Z272XddhRKJ9qxjZCGpw, https://www.youtube.com/watch?v=zoA922O-HQM",
    "build_order": [
        step(
            1,
            "00:00",
            6,
            5,
            0,
            0,
            0,
            [
                "5 @unit_worker/villager.webp@ на @resource/sheep.webp@, 1 ставит @building_macedonian/varangian_warcamp.webp@."
            ],
            builder=1,
        ),
        step(
            1,
            "00:20",
            7,
            6,
            0,
            1,
            0,
            ["@resource/rally.webp@ 2 @unit_worker/villager.webp@ на @resource/resource_gold.webp@."],
        ),
        step(
            1,
            "01:00",
            9,
            7,
            0,
            2,
            0,
            ["@resource/rally.webp@ на @resource/resource_food.webp@ до @age/age_2.webp@."],
        ),
        step(
            1,
            "02:13",
            12,
            10,
            0,
            2,
            0,
            [
                "3 @unit_worker/villager.webp@ ставят @landmark_byzantines/grand-winery-1.webp@ на @resource/berrybush.webp@."
            ],
            builder=3,
        ),
        step(
            1,
            "02:20",
            9,
            4,
            0,
            2,
            0,
            [
                "3 с @resource/sheep.webp@ на @resource/resource_wood.webp@, ралли до 8 на дереве."
            ],
        ),
        step(
            2,
            "04:10",
            17,
            7,
            8,
            2,
            0,
            [
                "@building_military/stable.webp@ → @building_macedonian/varangian_arsenal.webp@ / @building_macedonian/varangian_stronghold.webp@ (арсенал, если оппонент ещё не в феодале и не открыл юнитов)."
            ],
        ),
        step(2, "04:15", 17, 7, 8, 2, 0, ["@technology_economy/wheelbarrow.webp@."]),
        step(
            2,
            "04:45",
            20,
            10,
            8,
            2,
            0,
            [
                "@technology_macedonian/blade-inlaying-2.webp@ или @technology_macedonian/sharpening-stones-2.webp@ (если лучники)."
            ],
        ),
        step(
            2,
            "05:15",
            21,
            11,
            8,
            2,
            0,
            [
                "Второй @building_macedonian/varangian_stronghold.webp@ (или @building_macedonian/varangian_arsenal.webp@, если первым был стронгхолд)."
            ],
        ),
        step(
            2,
            "07:00",
            25,
            13,
            10,
            2,
            0,
            [
                "Несколько @building_economy/farm.webp@ вокруг @landmark_byzantines/grand-winery-1.webp@. Башню на передние ягоды или золото, если они спереди."
            ],
        ),
    ],
    "video": "https://www.youtube.com/watch?v=zoA922O-HQM",
    "season": 12,
    "map": None,
    "strategy": "Grand Winery feudal tricomp into Riddari",
    "provider": "aoe4guides",
    "providerId": "Z272XddhRKJ9qxjZCGpw",
    "score": 2.162281073273311e-26,
    "views": 4822,
    "likes": 14,
    "upvotes": 3,
    "timeCreated": iso(1762460633),
    "timeUpdated": iso(1762460683),
    "modes": ["1x1"],
    "mapTypes": ["open", "hybrid"],
    "role": "pressure",
    "status": "active",
    "queue": "rm_solo",
    "teamSize": 1,
    "strategyKey": "pressure",
    "metaTier": "meta_core",
    "buildGroup": "mac_valdemar_winery",
    "rankFit": "all+conqueror",
    "verifiedPatch": "10604,10884,11214,11308",
    "lastVerified": "2026-08-23",
    "gameBuild": "16.3.11308",
    "schemaVersion": 1,
    "origin": "curated",
    "capturedAt": "2026-08-23T00:00:00Z",
    "patch": "16.3.11308",
    "updatedAt": "2026-08-23T00:00:00Z",
    "archetype": "Feudal aggression",
    "difficulty": "medium",
    "reasoning": "Valdemar DLC Winery — феодальный tricomp с ягодной винодельней (zoA922O-HQM). Заменяет синтетический Grand Winery Castle BO.",
    "ageTimings": [{"age": 2, "seconds": 250, "derived": False, "stepIndex": 5}],
    "tactics": [
        {
            "id": "valdy-winery-berries",
            "category": "opening",
            "title": "Winery on berries at 2:13",
            "detail": "Warcamp from spawn, two gold, three vills on Grand Winery on berries, then eight wood.",
            "timeSec": 133,
            "confidence": 0.92,
        },
        {
            "id": "valdy-winery-prod",
            "category": "military",
            "title": "Stable then Arsenal or Stronghold",
            "detail": "Arsenal if they are still Dark or have no units. Tricomp, farms around the Winery at 7:00.",
            "timeSec": 250,
            "confidence": 0.88,
        },
    ],
    "video_evidence": evidence(
        "zoA922O-HQM",
        "How To Play Macedonians Feudal Aggression | Build Order | AoE4",
        "https://www.youtube.com/watch?v=zoA922O-HQM",
        "Valdy",
        "2025-11-23T00:00:00Z",
        11226,
        "How To Play Macedonians Feudal Aggression | Build Order | AoE4",
    ),
}


def dump(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)} ({len(payload['build_order'])} steps)")


def main() -> None:
    beasty_path = ACTIVE / "macedonian-beasty.json"
    dump(beasty_path, BEASTY)
    dump(ARCHIVE_COPY / "macedonian-beasty.json", BEASTY)
    dump(ACTIVE / "1x1-open-mac-vortix-feudal-varangian-guard-rush.json", VORTIX)
    dump(ACTIVE / "1x1-open-mac-tempo-valdemar-hippodrome-2026-HuzXbYxxy3LMgjhXA9n0.json", VALDEMAR_HIPPO)
    dump(ACTIVE / "1x1-open-mac-pressure-valdemar-feudal-winery-Z272XddhRKJ9qxjZCGpw.json", VALDEMAR_WINERY)
    for stale in (
        ACTIVE / "1x1-safe-mac-macro-grand-winery-castle-fb93817cc5.json",
        ACTIVE / "1x1-open-mac-pressure-warcamp-varangian-guard-cfb9777020.json",
    ):
        if stale.exists():
            stale.unlink()
            print(f"deleted {stale.name}")


if __name__ == "__main__":
    main()
