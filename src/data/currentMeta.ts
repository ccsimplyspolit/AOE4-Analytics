/**
 * August 2026 ranked meta snapshot (patch window 16.2.10604–16.3.11308).
 * Numbers are from AoE4World rm_solo / rm_2v2 distilled on 2026-08-22.
 * Map pool is the community-verified August rotation (until 2026-09-01).
 */
export interface MetaCivRank {
  civ: string
  winRate: number
  pickRate: number
  games: number
  note: string
}

export interface MetaPatchBeat {
  id: string
  date: string
  title: string
  url: string
  summary: string
}

export const CURRENT_META = {
  capturedAt: '2026-08-22T21:09:09Z',
  season: 13,
  patchLabel: '16.2.10604–16.3.11308',
  patchIds: '10604,10884,11214,11308',
  mapPoolUntil: '2026-09-01',
  headline: 'August 2026: Macedonian, Templar, and Golden Horde set the 1v1 pace',
  summary:
    'Since June 1 the live patch window is 16.2 through 16.3.11308. July 2 started automatic monthly ranked map rotation; the August pool (West Lake, Flankwoods, Hidden Valley, Ocean Gateway, Relic River) rewards scouting and safer openings more than all-in Feudal. Ladder win rate still crowns Macedonian Dynasty, Knights Templar, and Golden Horde. English remains the most-picked civ, not the highest win rate — turtle and 2TC are strong on this month’s maps, not because English is Z-tier.',
  playThis: [
    'Macedonian Warcamp → Imperial Hippodrome → Riddari (Beasty 1v1 reference).',
    'Vs greedy 2TC: VortiX Hippodrome horsemen into Varangian Guard spam (AoE4Guides, timed).',
    'Valdemar 2026 Hippodrome into Castle, or DLC Grand Winery feudal tricomp.',
    'Knights Templar: VortiX pilgrim → 2TC Serjeant + Genitour on sacred-site maps.',
    'Golden Horde: Keshik/Torguud pressure, or the 6-minute 2TC with Khan if they turtle.',
  ],
  communityBuilds: [
    {
      civ: 'macedonian_dynasty',
      name: 'VortiX Feudal Varangian Guard rush',
      url: 'https://aoe4guides.com/builds/RgHNHa5jDWnCw7pY67UL',
      video: 'https://www.youtube.com/watch?v=OezixLpYQEw',
      note: 'Hippodrome horses then VG vs 2TC.',
    },
    {
      civ: 'knights_templar',
      name: 'VortiX 2TC Serjeant & Genitour + Pilgrim',
      url: 'https://aoe4guides.com/builds/41yOCHHtg3snki8AopmV',
      video: 'https://www.youtube.com/watch?v=_l1eR5f9gW4',
      note: 'Antioch + Castile; pilgrim then second TC.',
    },
    {
      civ: 'golden_horde',
      name: 'Golden Horde 2TC in 6 minutes',
      url: 'https://aoe4guides.com/builds/HVKBR95daLKot8GKK5Hz',
      video: null,
      note: 'Khan + Torguuds hold while the second TC finishes.',
    },
  ],
  avoidTrap: [
    'Do not treat English 12.7% pick rate as a strength ranking — 47.1% WR is C-tier on the ladder.',
    'West Lake looks like water but ranked docks are disabled — do not walk vils to a shoreline dock. Skip KT water-hybrid BOs on that map.',
    'Chinese is last in 1v1 WR this window; defaulting into Song boom is a losing default.',
  ],
  solo: {
    leaderboard: 'rm_solo' as const,
    totalGames: 2_064_310,
    zTier: [
      {
        civ: 'macedonian_dynasty',
        winRate: 55.0,
        pickRate: 4.6,
        games: 95_740,
        note: 'Highest WR. Silver + Warcamp tempo into Riddari; still underpicked.',
      },
      {
        civ: 'knights_templar',
        winRate: 53.9,
        pickRate: 9.7,
        games: 196_653,
        note: 'Most popular high-WR civ. Pilgrim gold and armored timings.',
      },
      {
        civ: 'golden_horde',
        winRate: 53.9,
        pickRate: 3.4,
        games: 70_343,
        note: 'Khan cavalry. Punishes slow English/HRE on open and hybrid maps.',
      },
    ] satisfies MetaCivRank[],
    sTier: [
      {
        civ: 'order_of_the_dragon',
        winRate: 52.5,
        pickRate: 5.3,
        games: 109_805,
        note: 'Choke maps (Highwoods / The Pit) and elite infantry.',
      },
      {
        civ: 'zhu_xis_legacy',
        winRate: 52.0,
        pickRate: 3.1,
        games: 65_009,
        note: 'Fastest median game in the window — supervision tempo.',
      },
      {
        civ: 'japanese',
        winRate: 51.5,
        pickRate: 5.6,
        games: 116_777,
        note: 'Stable A-tier. Towers of the Sun and samurai/yumi lines.',
      },
      {
        civ: 'jin_dynasty',
        winRate: 51.4,
        pickRate: 2.0,
        games: 41_628,
        note: 'Received dedicated 16.2.10604 attention; still low pick, solid WR.',
      },
    ] satisfies MetaCivRank[],
    popularNotStrong: [
      {
        civ: 'english',
        winRate: 47.1,
        pickRate: 12.7,
        games: 252_045,
        note: 'Most picked. Map pool helps turtle; ladder WR is still C-tier.',
      },
      {
        civ: 'french',
        winRate: 50.8,
        pickRate: 12.4,
        games: 247_575,
        note: 'Second most picked. Fine default, not the August spike civ.',
      },
    ] satisfies MetaCivRank[],
    bottom: [
      {
        civ: 'chinese',
        winRate: 44.9,
        pickRate: 3.9,
        games: 81_435,
        note: 'Worst 1v1 WR this patch window.',
      },
      {
        civ: 'sengoku_daimyo',
        winRate: 46.2,
        pickRate: 1.4,
        games: 29_445,
        note: 'Low sample, still below 47%.',
      },
    ] satisfies MetaCivRank[],
  },
  team2v2: {
    leaderboard: 'rm_2v2' as const,
    totalGames: 1_340_064,
    top: [
      { civ: 'french', winRate: 53.4, pickRate: 13.8, games: 171_296, note: 'Team default cavalry.' },
      { civ: 'macedonian_dynasty', winRate: 53.3, pickRate: 3.9, games: 54_393, note: 'Still elite as a pocket/flank hybrid.' },
      { civ: 'knights_templar', winRate: 52.5, pickRate: 11.4, games: 142_575, note: 'Shared pilgrim/sacred-site plans.' },
      { civ: 'golden_horde', winRate: 52.2, pickRate: 3.4, games: 47_731, note: 'Raid the enemy pocket trade.' },
    ] satisfies MetaCivRank[],
  },
  patches: [
    {
      id: '16.2.10604',
      date: '2026-06-01',
      title: 'Patch 16.2.10604',
      url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10475/',
      summary:
        'Balance pass with Jin Dynasty focus, controller UI on PC/handheld, and a long civ bugfix list. This is still the start of the live stats window.',
    },
    {
      id: '16.2.10884',
      date: '2026-06-18',
      title: 'Patch 16.2.10884',
      url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10884/',
      summary:
        'Controller vs KBM UI toggle on handheld. Golden Horde tech-repeat bugs (Armored Caravans / Medical Centers / City Planning). Announced Raiders of the North.',
    },
    {
      id: '16.3.11214',
      date: '2026-07-02',
      title: 'Patch 16.3.11214 — monthly map rotation',
      url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10884/',
      summary:
        'Ranked map pool now rotates on the 1st of each month with a mix of open, closed, hybrid, and naval maps. This is the mechanical meta shift of the last six weeks.',
    },
    {
      id: '16.3.11308',
      date: '2026-07',
      title: 'Minor 16.3.11308',
      url: 'https://www.ageofempires.com/news/age-of-empires-iv-patch-16-2-10884/',
      summary: 'Console launch crash fix. Current match payloads (including team RM) report this build.',
    },
  ] satisfies MetaPatchBeat[],
  creatorReads: [
    {
      title: 'Age of Empires 4 Imperial Landmarks Tier List',
      url: 'https://www.youtube.com/watch?v=GV-0H7HOBg4',
      publishedAt: '2026-08-19',
      note: 'Beastyqt — Age 4 win-condition landmarks after the June–July patch window.',
    },
    {
      title: 'Age of Empires 4 Castle Landmarks Tier List',
      url: 'https://www.youtube.com/watch?v=ftZ6Ycqw93o',
      publishedAt: '2026-08-09',
      note: 'Beastyqt — Castle landmarks and mid-game identity.',
    },
    {
      title: 'Age of Empires 4 Feudal Landmarks Tier List',
      url: 'https://www.youtube.com/watch?v=RkcrjGNVH9A',
      publishedAt: '2026-08-02',
      note: 'Beastyqt — Feudal landmark rankings for the new monthly map pool.',
    },
  ],
} as const

export function metaCivSlugs(): string[] {
  return CURRENT_META.solo.zTier.map((row) => row.civ)
}
