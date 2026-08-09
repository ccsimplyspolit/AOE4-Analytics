/**
 * Curated from the URL set supplied for the August 9, 2026 review.
 *
 * This file deliberately stores derived public-match facts and source links,
 * not copied VOD audio, chat, or transcripts. Twitch exposed no subtitle tracks
 * for these VODs, so the UI must keep that coverage gap visible.
 */

export interface CuratedReviewPlayer {
  profileId: number
  name: string
  civilization: string
  result: 'win' | 'loss'
  rating: number
  ratingDiff: number
  mmr: number
  mmrDiff: number
  mapWinRate: number
  mapGames: number
  mapMedianDurationSec: number
}

export interface CuratedMatchReview {
  id: string
  gameId: number
  map: string
  mapId: number
  startedAt: string
  durationSec: number
  patch: number
  averageRating: number
  averageMmr: number
  mapStatsUrl: string
  gameUrl: string
  video: {
    id: string
    url: string
    offsetSec: number
  }
  players: [CuratedReviewPlayer, CuratedReviewPlayer]
  mapLeader: {
    civilization: string
    winRate: number
    games: number
  }
  mapStatsPatch: string
  captionStatus: 'unavailable'
}

const MAP_STATS_PATCH = '10604,10884,11214,11308'

export const CURATED_MATCH_REVIEWS: CuratedMatchReview[] = [
  {
    id: 'game-246498987',
    gameId: 246498987,
    map: 'Gorge',
    mapId: 2135363,
    startedAt: '2026-08-08T23:39:25Z',
    durationSec: 1450,
    patch: 11308,
    averageRating: 1563,
    averageMmr: 1648,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/2135363-Gorge',
    gameUrl: 'https://aoe4world.com/players/7596200/games/246498987',
    video: {
      id: '2841027880',
      url: 'https://www.twitch.tv/videos/2841027880?t=998s',
      offsetSec: 998,
    },
    players: [
      {
        profileId: 7596200,
        name: 'Matahari',
        civilization: 'golden_horde',
        result: 'loss',
        rating: 1549,
        ratingDiff: -20,
        mmr: 1612,
        mmrDiff: -12,
        mapWinRate: 53.21,
        mapGames: 4960,
        mapMedianDurationSec: 1362,
      },
      {
        profileId: 14738023,
        name: '♥',
        civilization: 'holy_roman_empire',
        result: 'win',
        rating: 1576,
        ratingDiff: 24,
        mmr: 1684,
        mmrDiff: 12,
        mapWinRate: 48.8,
        mapGames: 6512,
        mapMedianDurationSec: 1326,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 54.0, games: 6575 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246497762',
    gameId: 246497762,
    map: 'Dry Arabia',
    mapId: 163361,
    startedAt: '2026-08-08T23:23:38Z',
    durationSec: 850,
    patch: 11308,
    averageRating: 1560,
    averageMmr: 1648,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/163361-Dry%20Arabia',
    gameUrl: 'https://aoe4world.com/players/7596200/games/246497762',
    video: {
      id: '2841027880',
      url: 'https://www.twitch.tv/videos/2841027880?t=51s',
      offsetSec: 51,
    },
    players: [
      {
        profileId: 7596200,
        name: 'Matahari',
        civilization: 'golden_horde',
        result: 'win',
        rating: 1519,
        ratingDiff: 30,
        mmr: 1592,
        mmrDiff: 20,
        mapWinRate: 53.66,
        mapGames: 10730,
        mapMedianDurationSec: 1391,
      },
      {
        profileId: 14738023,
        name: '♥',
        civilization: 'malians',
        result: 'loss',
        rating: 1601,
        ratingDiff: -25,
        mmr: 1704,
        mmrDiff: -20,
        mapWinRate: 50.65,
        mapGames: 9956,
        mapMedianDurationSec: 1389,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 54.46, games: 13711 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246498004',
    gameId: 246498004,
    map: 'Ancient Spires',
    mapId: 176990,
    startedAt: '2026-08-08T23:26:59Z',
    durationSec: 1863,
    patch: 11308,
    averageRating: 2254,
    averageMmr: 2213,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/176990-Ancient%20Spires',
    gameUrl: 'https://aoe4world.com/players/8354416/games/246498004',
    video: {
      id: '2840961055',
      url: 'https://www.twitch.tv/videos/2840961055?t=5624s',
      offsetSec: 5624,
    },
    players: [
      {
        profileId: 8354416,
        name: 'EL.loueMT',
        civilization: 'byzantines',
        result: 'win',
        rating: 2235,
        ratingDiff: 25,
        mmr: 2197,
        mmrDiff: 13,
        mapWinRate: 48.62,
        mapGames: 321,
        mapMedianDurationSec: 1541,
      },
      {
        profileId: 8446710,
        name: 'Puppypaw',
        civilization: 'knights_templar',
        result: 'loss',
        rating: 2273,
        ratingDiff: -26,
        mmr: 2229,
        mmrDiff: -13,
        mapWinRate: 52.99,
        mapGames: 1160,
        mapMedianDurationSec: 1649,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 57.49, games: 405 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246497189',
    gameId: 246497189,
    map: 'Dry Arabia',
    mapId: 163361,
    startedAt: '2026-08-08T23:15:42Z',
    durationSec: 1018,
    patch: 11308,
    averageRating: 1213,
    averageMmr: 1270,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/163361-Dry%20Arabia',
    gameUrl: 'https://aoe4world.com/players/18176558/games/246497189',
    video: {
      id: '2840968725',
      url: 'https://www.twitch.tv/videos/2840968725?t=4387s',
      offsetSec: 4387,
    },
    players: [
      {
        profileId: 18176558,
        name: 'StevezGamez',
        civilization: 'order_of_the_dragon',
        result: 'win',
        rating: 1238,
        ratingDiff: 19,
        mmr: 1301,
        mmrDiff: 13,
        mapWinRate: 51.06,
        mapGames: 14160,
        mapMedianDurationSec: 1408,
      },
      {
        profileId: 3051178,
        name: 'Nidhogg',
        civilization: 'mongols',
        result: 'loss',
        rating: 1187,
        ratingDiff: -20,
        mmr: 1238,
        mmrDiff: -13,
        mapWinRate: 50.44,
        mapGames: 11040,
        mapMedianDurationSec: 1382,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 54.46, games: 13711 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246497039',
    gameId: 246497039,
    map: 'Dry Arabia',
    mapId: 163361,
    startedAt: '2026-08-08T23:13:58Z',
    durationSec: 717,
    patch: 11308,
    averageRating: 2254,
    averageMmr: 2213,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/163361-Dry%20Arabia',
    gameUrl: 'https://aoe4world.com/players/8354416/games/246497039',
    video: {
      id: '2840961055',
      url: 'https://www.twitch.tv/videos/2840961055?t=4843s',
      offsetSec: 4843,
    },
    players: [
      {
        profileId: 8354416,
        name: 'EL.loueMT',
        civilization: 'macedonian_dynasty',
        result: 'win',
        rating: 2208,
        ratingDiff: 27,
        mmr: 2184,
        mmrDiff: 13,
        mapWinRate: 54.46,
        mapGames: 13711,
        mapMedianDurationSec: 1369,
      },
      {
        profileId: 8446710,
        name: 'Puppypaw',
        civilization: 'order_of_the_dragon',
        result: 'loss',
        rating: 2300,
        ratingDiff: -27,
        mmr: 2242,
        mmrDiff: -13,
        mapWinRate: 51.06,
        mapGames: 14160,
        mapMedianDurationSec: 1408,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 54.46, games: 13711 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246495667',
    gameId: 246495667,
    map: 'Flankwoods',
    mapId: 2141342,
    startedAt: '2026-08-08T22:56:18Z',
    durationSec: 1444,
    patch: 11308,
    averageRating: 1387,
    averageMmr: 1473,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/2141342-Flankwoods',
    gameUrl: 'https://aoe4world.com/players/693025/games/246495667',
    video: {
      id: '2840845005',
      url: 'https://www.twitch.tv/videos/2840845005?t=12612s',
      offsetSec: 12612,
    },
    players: [
      {
        profileId: 693025,
        name: 'Torik',
        civilization: 'order_of_the_dragon',
        result: 'win',
        rating: 1403,
        ratingDiff: 24,
        mmr: 1507,
        mmrDiff: 12,
        mapWinRate: 52.64,
        mapGames: 862,
        mapMedianDurationSec: 1340,
      },
      {
        profileId: 25837004,
        name: 'monsieur douceur',
        civilization: 'english',
        result: 'loss',
        rating: 1371,
        ratingDiff: -20,
        mmr: 1438,
        mmrDiff: -12,
        mapWinRate: 48.46,
        mapGames: 1911,
        mapMedianDurationSec: 1450,
      },
    ],
    mapLeader: { civilization: 'zhu_xis_legacy', winRate: 55.87, games: 584 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246495361',
    gameId: 246495361,
    map: 'Flankwoods',
    mapId: 2141342,
    startedAt: '2026-08-08T22:52:27Z',
    durationSec: 1213,
    patch: 11308,
    averageRating: 2255,
    averageMmr: 2213,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/2141342-Flankwoods',
    gameUrl: 'https://aoe4world.com/players/8446710/games/246495361',
    video: {
      id: '2840961055',
      url: 'https://www.twitch.tv/videos/2840961055?t=3552s',
      offsetSec: 3552,
    },
    players: [
      {
        profileId: 8446710,
        name: 'Puppypaw',
        civilization: 'byzantines',
        result: 'win',
        rating: 2279,
        ratingDiff: 21,
        mmr: 2232,
        mmrDiff: 10,
        mapWinRate: 44.7,
        mapGames: 637,
        mapMedianDurationSec: 1270,
      },
      {
        profileId: 8354416,
        name: 'EL.loueMT',
        civilization: 'tughlaq_dynasty',
        result: 'loss',
        rating: 2230,
        ratingDiff: -22,
        mmr: 2194,
        mmrDiff: -10,
        mapWinRate: 49.64,
        mapGames: 275,
        mapMedianDurationSec: 1379,
      },
    ],
    mapLeader: { civilization: 'zhu_xis_legacy', winRate: 55.87, games: 584 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
  {
    id: 'game-246493818',
    gameId: 246493818,
    map: 'Gorge',
    mapId: 2135363,
    startedAt: '2026-08-08T22:35:40Z',
    durationSec: 2254,
    patch: 11308,
    averageRating: 1289,
    averageMmr: 1352,
    mapStatsUrl: 'https://aoe4world.com/stats/rm_solo/maps/2135363-Gorge',
    gameUrl: 'https://aoe4world.com/players/6180851/games/246493818',
    video: {
      id: '2840968725',
      url: 'https://www.twitch.tv/videos/2840968725?t=1985s',
      offsetSec: 1985,
    },
    players: [
      {
        profileId: 6180851,
        name: 'Future',
        civilization: 'french',
        result: 'win',
        rating: 1320,
        ratingDiff: 18,
        mmr: 1390,
        mmrDiff: 12,
        mapWinRate: 49.59,
        mapGames: 15671,
        mapMedianDurationSec: 1376,
      },
      {
        profileId: 18176558,
        name: 'StevezGamez',
        civilization: 'order_of_the_dragon',
        result: 'loss',
        rating: 1258,
        ratingDiff: -20,
        mmr: 1313,
        mmrDiff: -12,
        mapWinRate: 52.82,
        mapGames: 7451,
        mapMedianDurationSec: 1371,
      },
    ],
    mapLeader: { civilization: 'macedonian_dynasty', winRate: 54.0, games: 6575 },
    mapStatsPatch: MAP_STATS_PATCH,
    captionStatus: 'unavailable',
  },
]

export const CURATED_MATCH_REVIEWS_BY_GAME_ID = new Map(
  CURATED_MATCH_REVIEWS.map((review) => [review.gameId, review]),
)
