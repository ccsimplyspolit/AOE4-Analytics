import { BUNDLED_BUILD_ORDERS } from './buildOrders'
import { EXPLORER_RECORDS, type ExplorerRecordKind } from './explorerData'
import {
  ESSENCE_PROVENANCE,
  GAME_DATA_CAPTURED_AT,
  GAME_DATA_COMMIT,
  GAME_DATA_VERSION,
  UNITS,
} from './gameData'
import {
  CURATED_CONTENT,
  CURATED_CONTENT_CAPTURED_AT,
  CURATED_CONTENT_COUNTS,
  CURATED_CONTENT_REVISION,
  CURATED_CONTENT_SOURCE,
} from './curatedContent'
import { ESSENCE_RGD_PROJECTION } from './essenceAttributes'
import { counterGraphCoverage } from '@domain/unitCounterModel'
import { CURRENT_RANKED_MAP_POOL } from '@domain/rankedMapPool'
import upstreamAudit from '../../data/research/aoe4-upstream-revisions.json'

const UPSTREAM_AUDIT = upstreamAudit as {
  capturedAt?: string
  sources?: Array<{ repository?: string; commit?: string | null }>
}

function upstreamVersion(repository: string): string | null {
  const commit = UPSTREAM_AUDIT.sources?.find((source) => source.repository === repository)?.commit
  return commit ? commit.slice(0, 12) : null
}

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
    url: 'https://github.com/jensbuehl/aoe4-guides',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'community build orders, ratings, seasons, authors and source links',
    records: BUNDLED_BUILD_ORDERS.length,
    version: 'aoe4-guides@1.15.0',
    revision: '8d00f03754a83106f47c76e1b0099e30c3b9d747',
    snapshotSchemaVersion: 1,
    capturedAt: '2026-08-07T20:31:53+02:00',
    integration:
      'safe REST import plus normalized overlay-compatible schema, age timings, rich-text time parsing and economy/age insights',
  },
  {
    id: 'aoe4world-explorer',
    label: 'aoe4world/explorer',
    url: 'https://github.com/aoe4world/explorer',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'unit, building, technology, upgrade and ability exploration patterns',
    records: EXPLORER_RECORDS.length,
    version: `explorer@f5b5476188bc + ${GAME_DATA_VERSION}`,
    revision: 'f5b5476188bc3d5fe279bd736aad31c98b8ede4d',
    snapshotSchemaVersion: 1,
    capturedAt: GAME_DATA_CAPTURED_AT,
    integration:
      'local React Explorer uses the same normalized aoe4world/data projection with offline filters, detail views, quiz and exports',
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
    version: upstreamVersion('aoemods/zig-essence'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
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
    version: upstreamVersion('aoemods/aoetypes'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
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
    version: upstreamVersion('aoemods/aoetypes-docs'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
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
    version: 'overlay@426f7d057d93',
    revision: '426f7d057d93e5c7ae4521a06710121026d99241',
    capturedAt: null,
    integration: 'local always-on-top overlay and typed live payloads',
  },
  {
    id: 'twitch-api',
    label: 'Twitch API',
    url: 'https://dev.twitch.tv/docs/api',
    mode: 'live',
    status: 'optional',
    patchAware: false,
    coverage: 'official VOD/channel/category metadata, publication dates, durations and views',
    records: null,
    version: 'Helix',
    capturedAt: null,
    integration:
      'optional encrypted credentials, client-credentials OAuth, rate-limited search and local cache',
  },
  {
    id: 'youtube-data-api',
    label: 'YouTube Data API',
    url: 'https://developers.google.com/youtube/v3',
    mode: 'live',
    status: 'optional',
    patchAware: false,
    coverage: 'recent/popular video search, channel, duration and view-count metadata',
    records: null,
    version: 'v3',
    capturedAt: null,
    integration: 'optional encrypted API key, date/sort filters and local cache',
  },
  {
    id: 'aoe4world-replay-parser',
    label: 'AoE4World replay parser',
    url: 'https://github.com/aoe4world/replays-api',
    mode: 'adapter',
    status: 'active',
    patchAware: true,
    coverage: 'STPD 2029/2030/2033/2034 summary layouts + replay container reference',
    records: null,
    version: '15.4.8719 / STPD 2034',
    revision: 'efc391296451da352c3660daf814403e37e787e8',
    capturedAt: '2026-03-05T21:20:14+01:00',
    integration:
      'bundled TypeScript summary parser follows upstream version guards; optional main-process /Summary/new fallback is supported via RTSLYTICS_REPLAYS_API_URL',
  },
  {
    id: 'aoe4world-curated',
    label: 'aoe4world/curated',
    url: CURATED_CONTENT_SOURCE,
    mode: 'bundled',
    status: 'active',
    patchAware: false,
    coverage: `${CURATED_CONTENT_COUNTS.videos} videos + ${CURATED_CONTENT_COUNTS.items - CURATED_CONTENT_COUNTS.videos} guides/references across ${CURATED_CONTENT_COUNTS.civilizations} civilizations`,
    records: CURATED_CONTENT.length,
    version: CURATED_CONTENT_REVISION ? `curated@${CURATED_CONTENT_REVISION.slice(0, 12)}` : 'curated@main',
    revision: CURATED_CONTENT_REVISION,
    snapshotSchemaVersion: 1,
    capturedAt: CURATED_CONTENT_CAPTURED_AT,
    integration:
      'bundled Explorer reference library with civ/tag/search filters; provenance is preserved and curated content never replaces ranked meta',
  },
  {
    id: 'aoe4world-docker-ruby-node',
    label: 'aoe4world/docker-ruby-node',
    url: 'https://github.com/aoe4world/docker-ruby-node',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'Ruby + Node development/CI container baseline',
    records: null,
    version: 'ruby 3.2 / node 18',
    revision: '8b699d3ac893d4281b645a8bffc57ecc54b87d0e',
    capturedAt: null,
    integration:
      'documented as an optional CI/dev environment; the Windows Electron runtime stays native and does not require Docker',
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
    mode: 'adapter',
    status: 'optional',
    patchAware: true,
    coverage: `offline .sga/.rgd/.rrtex/.rrgeom extraction + ${ESSENCE_RGD_PROJECTION.counts.records.toLocaleString()} audited entity attributes`,
    records: ESSENCE_RGD_PROJECTION.counts.records || ESSENCE_PROVENANCE.counts.files || null,
    version: ESSENCE_PROVENANCE.sourceRevision,
    capturedAt: ESSENCE_PROVENANCE.capturedAt,
    integration:
      'automatic Attrib.sga discovery plus explicit SGA/RGD/RRTex/RRGeom decoding, bounded RGD projection and provenance through scripts/essence_adapter.py; Electron never executes archive parsers',
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
    version: upstreamVersion('aoemods/attrib'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration:
      'source-of-truth candidate for offline refresh; importer records hashes, app ships only audited projections',
  },
  {
    id: 'aoemods-zig-essence',
    label: 'AOEMods Zig Essence',
    url: 'https://github.com/aoemods/zig-essence',
    mode: 'reference',
    status: 'reference',
    patchAware: true,
    coverage: 'portable SGA/chunky format implementation for cross-checking Essence extraction',
    records: null,
    version: upstreamVersion('aoemods/zig-essence'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'kept as an independently auditable parser reference; Windows runtime uses the tested .NET CLI adapter',
  },
  {
    id: 'aoemods-aoetypes',
    label: 'AOEMods AoE4 types',
    url: 'https://github.com/aoemods/aoetypes',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'TypeScript/Lua mod API declarations and game enum vocabulary',
    records: null,
    version: upstreamVersion('aoemods/aoetypes'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'used as a vocabulary reference when documenting local overlay/mod boundaries; not executed by Electron',
  },
  {
    id: 'aoemods-aoetypes-docs',
    label: 'AOEMods type documentation',
    url: 'https://github.com/aoemods/aoetypes-docs',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'documented AoE4 mod API and enums',
    records: null,
    version: upstreamVersion('aoemods/aoetypes-docs'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'linkable developer reference for overlay/mod diagnostics; no game scripting is injected',
  },
  {
    id: 'aoemods-typescript-template',
    label: 'AOEMods TypeScript template',
    url: 'https://github.com/aoemods/aoe4-typescript-template',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'TypeScript-to-Lua mod project scaffold and deployment workflow',
    records: null,
    version: upstreamVersion('aoemods/aoe4-typescript-template'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'developer reference for optional mod tooling; never compiled into or executed by the analytics runtime',
  },
  {
    id: 'aoemods-tstl',
    label: 'AOEMods TypeScript-to-Lua',
    url: 'https://github.com/aoemods/AOE4-TSTL',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'TypeScript-to-Lua build patterns for offline mod tooling',
    records: null,
    version: upstreamVersion('aoemods/AOE4-TSTL'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'reference only; RTSLytics remains a safe telemetry/analysis app and does not compile or inject mods',
  },
  {
    id: 'aoemods-lua-docs',
    label: 'AOEMods Lua API docs',
    url: 'https://github.com/aoemods/lua-docs',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'in-game Lua API documentation for diagnostics and mod context',
    records: null,
    version: upstreamVersion('aoemods/lua-docs'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'documentation link for mod-facing analysis context; no Lua is executed inside the app',
  },
  {
    id: 'aoemods-dodge-mod',
    label: 'AOEMods dodge-mod',
    url: 'https://github.com/aoemods/dodge-mod',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'TypeScript mod project layout and test/deploy workflow',
    records: null,
    version: upstreamVersion('aoemods/dodge-mod'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'developer workflow reference only; mod binaries and gameplay scripts are never loaded into RTSLytics',
  },
  {
    id: 'aoemods-wiki',
    label: 'AOEMods wiki',
    url: 'https://github.com/aoemods/wiki',
    mode: 'reference',
    status: 'reference',
    patchAware: false,
    coverage: 'community modding guidance and official resource links',
    records: null,
    version: upstreamVersion('aoemods/wiki'),
    capturedAt: UPSTREAM_AUDIT.capturedAt ?? null,
    integration: 'documentation reference surfaced in the source registry',
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
