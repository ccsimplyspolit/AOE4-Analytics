/**
 * Patch/data freshness audit for Tincture.
 *
 * AoE4World's stats endpoint reports a comma-separated set of numeric patch
 * identifiers. A build order may instead carry a full game version (16.2), a
 * numeric identifier (10884), or no patch metadata at all. We deliberately
 * distinguish "covered by the source dataset" from "verified current": the
 * former is machine-checkable, the latter requires a human review of the
 * build after balance changes.
 */

export type PatchCoverage = 'covered' | 'legacy' | 'unversioned'

export interface PatchAudit {
  sourcePatch: string | null
  sourcePatchIds: string[]
  sourceFamilies: string[]
  builds: {
    covered: number
    legacy: number
    unversioned: number
  }
  status: 'covered' | 'mixed' | 'unknown'
  warnings: string[]
}

export interface PatchAuditInput {
  /** AoE4World's `patch` field, e.g. "10604,10884,11214,11308". */
  sourcePatch: string | null | undefined
  /** Patch metadata attached to local build orders. */
  buildPatches: readonly (string | null | undefined)[]
}

/** Numeric id → major.minor family for patch versions currently observed in the API. */
const PATCH_FAMILIES: Readonly<Record<string, string>> = {
  '10604': '16.2',
  '10884': '16.2',
  '11214': '16.3',
  '11308': '16.3',
}

function tokens(value: string | null | undefined): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/[\s,;|/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function sourceIds(value: string | null | undefined): string[] {
  return [...new Set(tokens(value).filter((part) => /^\d+$/.test(part)))]
}

function sourceFamilies(ids: readonly string[]): string[] {
  return [
    ...new Set(
      ids.map((id) => PATCH_FAMILIES[id]).filter((family): family is string => family != null),
    ),
  ].sort()
}

function sourceFamiliesFromPatch(value: string | null | undefined): string[] {
  if (typeof value !== 'string') return []
  const explicit = value.match(/\b\d+\.\d+\b/g) ?? []
  return [...new Set([...sourceFamilies(sourceIds(value)), ...explicit])].sort()
}

function buildIsCovered(
  patch: string,
  ids: readonly string[],
  families: readonly string[],
): boolean {
  const parts = tokens(patch)
  return parts.some(
    (part) =>
      ids.includes(part) ||
      families.some((family) => part === family || part.startsWith(`${family}.`)),
  )
}

/** Classifies one build patch against the current AoE4World stats slice. */
export function classifyPatch(
  buildPatch: string | null | undefined,
  sourcePatch: string | null | undefined,
): PatchCoverage {
  const patch = typeof buildPatch === 'string' ? buildPatch.trim() : ''
  if (!patch) return 'unversioned'
  const ids = sourceIds(sourcePatch)
  const families = sourceFamiliesFromPatch(sourcePatch)
  return buildIsCovered(patch, ids, families) ? 'covered' : 'legacy'
}

/** Builds a transparent report for the patch metadata currently in the app. */
export function buildPatchAudit(input: PatchAuditInput): PatchAudit {
  const sourcePatch =
    typeof input.sourcePatch === 'string' && input.sourcePatch.trim()
      ? input.sourcePatch.trim()
      : null
  const sourcePatchIds = sourceIds(sourcePatch)
  const sourceFamiliesList = sourceFamiliesFromPatch(sourcePatch)
  const counts = { covered: 0, legacy: 0, unversioned: 0 }
  for (const patch of input.buildPatches) counts[classifyPatch(patch, sourcePatch)] += 1

  const warnings: string[] = []
  if (!sourcePatch) {
    warnings.push('Live meta did not report a patch set; patch compatibility cannot be verified.')
  }
  if (counts.legacy > 0) {
    warnings.push(
      `${counts.legacy} local build${counts.legacy === 1 ? '' : 's'} is outside the current meta patch set.`,
    )
  }
  if (counts.unversioned > 0) {
    warnings.push(
      `${counts.unversioned} local build${counts.unversioned === 1 ? '' : 's'} has no patch metadata.`,
    )
  }

  const known = counts.covered + counts.legacy
  return {
    sourcePatch,
    sourcePatchIds,
    sourceFamilies: sourceFamiliesList,
    builds: counts,
    status:
      !sourcePatch || known === 0
        ? 'unknown'
        : counts.legacy > 0 || counts.unversioned > 0
          ? 'mixed'
          : 'covered',
    warnings,
  }
}
