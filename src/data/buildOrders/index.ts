/**
 * The bundled build-order library. Two tiers:
 *  • CURATED — hand-picked from aoe4guides.com's top-scored community builds
 *    (research pass 2026-07-02), converted to our schema with the author +
 *    source credited and a `reasoning` line explaining why the build earned its
 *    slot. Raw aoe4guides is uneven, so only builds matching known meta
 *    archetypes (Beasty / Valdemar / MarineLord-derived where possible) made it.
 *  • HOUSE — RTSLytics-written beginner builds with full step timings.
 *
 * ORDER MATTERS for untagged civ defaults: `buildIndexForCiv` / auto overlay
 * without an opponent civ pick the FIRST build matching a civ. Matchup-tagged
 * builds (`opponentCivilization`) override that default when the live opponent
 * is known. Keep the best-TIMED generic first per civ. August 2026: Macedonian
 * default remains Beasty Hippodrome; Templar and Golden Horde now also have
 * timed aoe4guides lines (VortiX 2TC / 6-minute Horde 2TC) next to the house
 * pressure BOs.
 */
import { normalizeBuildOrder, type BuildOrder } from '@domain/buildOrderSchema'
import { videoEvidenceForCiv } from '@data/videoEvidenceMap'
import { sanitizeBuildOrderVideos } from '@data/buildOrderVideos'
import BUILD_ORDER_ARCHIVE from '@data/buildOrderArchive.json'

/**
 * The immutable archive is the release-safe source of truth. Active DLC builds
 * are loaded separately. Keeping the broad legacy glob out of this module is
 * intentional: a concurrent source refresh can remove a JSON file between
 * Vite's scan and module evaluation, which would otherwise prevent startup.
 */
const PRIMARY_FILE_ORDER = [
  'english-2tc-longbow.json',
  'french-knights-rush.json',
  'hre-fast-castle.json',
  'rus-pro-scouts.json',
  'mongols-fast-castle.json',
  'chinese-tax-aggro.json',
  'abbasid-eco-wing-2tc.json',
  'delhi-fast-ghazi.json',
  'ottomans-military-school.json',
  'malians-classic-opener.json',
  'byzantines-5-cistern.json',
  'japanese-mlord-fast-castle.json',
  'jeanne-darc-aggression.json',
  'ootd-2tc-boom.json',
  'zhuxi-zhuge-nu-timing.json',
  'lancaster-2tc-2manor.json',
  'jin-swaggy-standard.json',
  'macedonian-beasty.json',
  'sengoku-beasty.json',
  'tughlaq-beasty-standard.json',
] as const

const PRIMARY_RANK = new Map<string, number>(PRIMARY_FILE_ORDER.map((file, index) => [file, index]))
const ACTIVE_BUILD_MODULES = import.meta.glob('../activeBuildOrders/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

const ARCHIVED_BUILD_ORDERS = (Array.isArray(BUILD_ORDER_ARCHIVE) ? BUILD_ORDER_ARCHIVE : []) as unknown[]

/** The importer also writes metadata snapshots beside build JSON files. */
function isBuildOrder(value: unknown): value is BuildOrder {
  if (value == null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const civilization = candidate.civilization
  return (
    typeof candidate.name === 'string' &&
    (typeof civilization === 'string' ||
      (Array.isArray(civilization) && civilization.every((item) => typeof item === 'string'))) &&
    Array.isArray(candidate.build_order)
  )
}


const ACTIVE_BUILD_ORDERS = Object.entries(ACTIVE_BUILD_MODULES)
  .sort(([left], [right]) => {
    const leftFile = left.replace(/^\.\//, '').replace(/^\.\.\/activeBuildOrders\//, '')
    const rightFile = right.replace(/^\.\//, '').replace(/^\.\.\/activeBuildOrders\//, '')
    return (
      (PRIMARY_RANK.get(leftFile) ?? Number.MAX_SAFE_INTEGER) -
        (PRIMARY_RANK.get(rightFile) ?? Number.MAX_SAFE_INTEGER) ||
      leftFile.localeCompare(rightFile)
    )
  })
  .map(([, build]) => build)

// Prefer the reviewed active catalog when an archive snapshot still contains
// the same build. The archive remains the fallback, but it must not shadow a
// newer active record during a refresh or a partially rebuilt release.
const RAW_BUNDLED_BUILD_ORDERS = [
  ...ACTIVE_BUILD_ORDERS,
  ...ARCHIVED_BUILD_ORDERS,
].filter(isBuildOrder)

function buildIdentity(build: BuildOrder): string {
  const civilizations = Array.isArray(build.civilization)
    ? build.civilization.join('|')
    : build.civilization
  const compact = (value: string) =>
    value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}|]+/gu, '')
  return `${compact(civilizations)}::${compact(build.name)}`
}

function buildQuality(build: BuildOrder): number {
  return (
    build.build_order.length * 10 +
    (build.reasoning ? 20 : 0) +
    (build.archetype ? 5 : 0) +
    (build.difficulty ? 2 : 0) +
    (build.video ? 8 : 0) +
    (build.source ? 1 : 0)
  )
}

/** Keep one best-documented variant per faction/title in the runtime library. */
const NORMALIZED_BUILD_ORDERS: BuildOrder[] = []
const BUILD_INDEX_BY_ID = new Map<string, number>()
for (const rawBuild of RAW_BUNDLED_BUILD_ORDERS) {
  const normalized = normalizeBuildOrder(rawBuild)
  // A source synchronizer can leave manifests or partially-written JSON next
  // to real builds. They are not build orders and must never reach the runtime
  // catalog, otherwise a missing civilization/name can crash main at startup.
  if (!normalized.ok) continue
  const build = normalized.value
  const identity = buildIdentity(build)
  const existingIndex = BUILD_INDEX_BY_ID.get(identity)
  if (existingIndex == null) {
    BUILD_INDEX_BY_ID.set(identity, NORMALIZED_BUILD_ORDERS.length)
    NORMALIZED_BUILD_ORDERS.push(build)
  } else if (buildQuality(build) > buildQuality(NORMALIZED_BUILD_ORDERS[existingIndex]!)) {
    NORMALIZED_BUILD_ORDERS[existingIndex] = build
  }
}

/** Attach generated video observations without changing the upstream JSON files. */
export const BUNDLED_BUILD_ORDERS = NORMALIZED_BUILD_ORDERS.map((build) =>
  sanitizeBuildOrderVideos({
    ...build,
    video_evidence: build.video_evidence ?? videoEvidenceForCiv(build.civilization),
  }),
)
