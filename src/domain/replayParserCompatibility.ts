/**
 * Compatibility contract for the upstream AoE4World replay parser.
 *
 * This is intentionally data, not a vendored copy of the C# implementation.
 * The desktop app keeps its TypeScript parser deterministic and uses this
 * contract to make the exact upstream format coverage visible in snapshots,
 * diagnostics and optional parser-service fallbacks.
 */

export const AOe4WorldReplayParser = {
  source: 'aoe4world/replays-api',
  repository: 'https://github.com/aoe4world/replays-api',
  revision: 'efc391296451da352c3660daf814403e37e787e8',
  commitDate: '2026-03-05T21:20:14+01:00',
  gameVersion: '15.4.8719',
  stpdVersions: [2029, 2030, 2033, 2034],
  fullReplayParserImplementedUpstream: false,
} as const

export type SummaryParserCoverage = 'full-summary' | 'mixed' | 'timelines-only'

export interface ReplayParserProvenance {
  source: typeof AOe4WorldReplayParser.source
  revision: typeof AOe4WorldReplayParser.revision
  commitDate: typeof AOe4WorldReplayParser.commitDate
  /** STPD versions observed in the decoded summary, not the game patch label. */
  stpdVersions: number[]
  coverage: SummaryParserCoverage
  /** true when the response came from the optional upstream-compatible service. */
  remote: boolean
}

export function makeReplayParserProvenance(input: {
  stpdVersions: number[]
  strictPlayers: number
  totalPlayers: number
  remote?: boolean
}): ReplayParserProvenance {
  const versions = [...new Set(input.stpdVersions.filter(Number.isInteger))].sort(
    (a, b) => a - b,
  )
  const coverage: SummaryParserCoverage =
    input.totalPlayers > 0 && input.strictPlayers >= input.totalPlayers
      ? 'full-summary'
      : input.strictPlayers > 0
        ? 'mixed'
        : 'timelines-only'
  return {
    source: AOe4WorldReplayParser.source,
    revision: AOe4WorldReplayParser.revision,
    commitDate: AOe4WorldReplayParser.commitDate,
    stpdVersions: versions,
    coverage,
    remote: input.remote === true,
  }
}
