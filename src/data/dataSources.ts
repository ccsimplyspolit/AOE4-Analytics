import { BUNDLED_BUILD_ORDERS } from './buildOrders'
import { EXPLORER_RECORDS, type ExplorerRecordKind } from './explorerData'
import { GAME_DATA_CAPTURED_AT, GAME_DATA_COMMIT, GAME_DATA_VERSION, UNITS } from './gameData'
import { counterGraphCoverage } from '@domain/unitCounterModel'
import { CURRENT_RANKED_MAP_POOL } from '@domain/rankedMapPool'

export type DataSourceMode = 'live' | 'bundled' | 'local' | 'adapter' | 'reference'

export interface DataSourceDescriptor {
  id: string
  label: string
  url: string
  mode: DataSourceMode
  status: 'active' | 'optional' | 'reference'
  patchAware: boolean
  coverage: string
  records: number | null
  version: string | null
  revision?: string | null
  snapshotSchemaVersion?: number | null
  capturedAt: string | null
  integration: string
}

/**
 * Runtime provenance for the upstream projects used by RTSLytics.
 *
 * This is intentionally an inventory, not a claim that every upstream repo is
 * copied into the app. A source is marked `adapter`/`reference` when its ideas
 * or format are supported without redistributing its implementation or raw
 * game files. That distinction keeps patch and licensing boundaries visible.
 */
export const DATA_SOURCE_REGISTRY: readonly DataSourceDescriptor[] = [
  {
    id: 'aoe4world-api',
    label: 'AoE4World API',
    url: 'https://aoe4world.com/api',
    mode: 'live',
    status: 'active',
    patchAware: true,
    coverage: 'profiles, games, rankings, civ/map/matchup stats, VOD links',
    records: null,
    version: 'v0',
    capturedAt: null,
    integration: 'typed main-process client, rate limiting, disk cache and pagination',
  },
  {
    id: 'ranked-map-pool',
    label: 'Ranked map pool snapshot',
    url: CURRENT_RANKED_MAP_POOL.sourceUrl,
    mode: 'bundled',
    status: 'active',
    patchAware: true,
    coverage: `${CURRENT_RANKED_MAP_POOL.solo.length} solo + ${CURRENT_RANKED_MAP_POOL.team.length} team maps with effective dates`,
    records: CURRENT_RANKED_MAP_POOL.solo.length + CURRENT_RANKED_MAP_POOL.team.length,
    version: CURRENT_RANKED_MAP_POOL.snapshotId,
    revision: null,
    snapshotSchemaVersion: CURRENT_RANKED_MAP_POOL.schemaVersion,
    capturedAt: CURRENT_RANKED_MAP_POOL.capturedAt,
    integration: 'main-process dated resolver; ranked meta defaults to the active queue rotation',
  },
  {
    id: 'aoe4world-data',
    label: 'aoe4world/data',
    url: 'https://github.com/aoe4world/data',
    mode: 'bundled',
    status: 'active',
    patchAware: true,
    coverage: `${UNITS.length} military units + ${EXPLORER_RECORDS.length} buildings/tech/upgrades`,
    records: UNITS.length + EXPLORER_RECORDS.length,
    version: GAME_DATA_VERSION,
    revision: GAME_DATA_COMMIT,
    snapshotSchemaVersion: 1,
    capturedAt: GAME_DATA_CAPTURED_AT,
    integration: 'compact offline projections for Explorer, production and counter analysis',
  },
  {
    id: 'aoe4guides',
    label: 'AoE4Guides',
    url: 'https://aoe4guides.com/',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'community build orders, ratings, seasons, authors and source links',
    records: BUNDLED_BUILD_ORDERS.length,
    version: null,
    capturedAt: null,
    integration: 'safe REST import plus normalized overlay-compatible build schema',
  },
  {
    id: 'orda',
    label: 'orda build API model',
    url: 'https://github.com/gzordrai/orda',
    mode: 'adapter',
    status: 'active',
    patchAware: false,
    coverage: 'typed build/favorites API shape and civ/sort filters',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'same normalized importer boundary, without a Rust runtime dependency',
  },
  {
    id: 'war-room',
    label: 'War Room counter model',
    url: 'https://github.com/haZiinstinct/aoe4-war-room',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: `role graph over ${counterGraphCoverage().units} units (${counterGraphCoverage().directedPairs.toLocaleString()} directed pairs; ${counterGraphCoverage().hardCounterEdges.toLocaleString()} hard edges)`,
    records: counterGraphCoverage().directedPairs,
    version: `role-model@${counterGraphCoverage().sourceRevision.slice(0, 12)}`,
    revision: counterGraphCoverage().sourceRevision,
    snapshotSchemaVersion: 1,
    capturedAt: GAME_DATA_CAPTURED_AT,
    integration:
      'explainable directed pair evaluator with cost/age/training-time ranking, not a frame-perfect simulator',
  },
  {
    id: 'prelate-rs',
    label: 'prelate-rs API types',
    url: 'https://github.com/willfindlay/prelate-rs',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'typed profiles, games, leaders, maps and paginated responses',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'mirrored in TypeScript API contracts used by the Electron main process',
  },
  {
    id: 'aoe4stats-dumps',
    label: 'AoE4World dumps / aoe4stats pattern',
    url: 'https://aoe4world.com/dumps',
    mode: 'live',
    status: 'active',
    patchAware: true,
    coverage: 'official public dump catalog and incremental leaderboard refresh path',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'catalog-only by default; local cache remains opt-in and rate-limited',
  },
  {
    id: 'aoe4world-overlay',
    label: 'aoe4world/overlay',
    url: 'https://github.com/aoe4world/overlay',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'current-game matchup, civ, rank and overlay-friendly browser payloads',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'local always-on-top overlay and typed live payloads',
  },
  {
    id: 'native-hud',
    label: 'WinUI3 / HUD overlay references',
    url: 'https://github.com/FramHerel/Aoe4OverlayWinUI3',
    mode: 'adapter',
    status: 'active',
    patchAware: false,
    coverage: 'native always-on-top, MVVM/service separation and HUD placement ideas',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'Electron overlay controller, placement mode, hotkeys and local API boundary',
  },
  {
    id: 'hud-websocket',
    label: 'ycx HUD frontend',
    url: 'https://github.com/ycxisreal/ycx-aoe4-hud-frontend',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'ROI calibration, local backend and WebSocket HUD concepts',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'kept as a future capture adapter; no unsafe game-memory reading is bundled',
  },
  {
    id: 'essence',
    label: 'AOEMods.Essence',
    url: 'https://github.com/aoemods/AOEMods.Essence',
    mode: 'reference',
    status: 'optional',
    patchAware: true,
    coverage: 'offline .sga/.rgd/.rrtex/.rrgeom extraction for local research snapshots',
    records: null,
    version: null,
    capturedAt: null,
    integration:
      'scripts/import_attrib_snapshot.py records audited Essence outputs; Electron never executes archive parsers',
  },
  {
    id: 'attrib',
    label: 'aoemods/attrib',
    url: 'https://github.com/aoemods/attrib',
    mode: 'reference',
    status: 'optional',
    patchAware: true,
    coverage: 'raw game attributes for patch diffing and research validation',
    records: null,
    version: null,
    capturedAt: null,
    integration:
      'source-of-truth candidate for offline refresh; importer records hashes, app ships only audited projections',
  },
  {
    id: 'counter-chart',
    label: 'aoe4-counter-chart',
    url: 'https://github.com/LeandroSQ/aoe4-counter-chart',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'simple counter graph presentation',
    records: null,
    version: null,
    capturedAt: null,
    integration: 'visual reference only; no stale values are used as data',
  },
]

export type ExplorerRecordCounts = Record<ExplorerRecordKind, number>

export const EXPLORER_RECORD_COUNTS: ExplorerRecordCounts = {
  building: EXPLORER_RECORDS.filter((record) => record.kind === 'building').length,
  technology: EXPLORER_RECORDS.filter((record) => record.kind === 'technology').length,
  upgrade: EXPLORER_RECORDS.filter((record) => record.kind === 'upgrade').length,
}
