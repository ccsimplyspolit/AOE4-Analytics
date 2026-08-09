export interface SourceSyncOptions {
  dryRun: boolean
  /** Inventory the installed Attrib.sga through Essence when available. */
  essenceAuto: boolean
  /** Decode local Essence assets instead of only inventorying the archive. */
  essenceDecodeRgd: boolean
  essenceDecodeNativeIcons: boolean
  /** Skip all network/bundled providers and run only the local Essence pass. */
  essenceOnly: boolean
  skipIcons: boolean
  skipGameData: boolean
  skipMeta: boolean
  skipGuides: boolean
  patch: string | null
}

export interface SourceSyncResult {
  completed: string[]
  capturedAt: string
  durationMs: number
  dryRun: boolean
  /** A non-dry run updates bundled files; the running renderer needs a restart to import them. */
  restartRequired: boolean
  output: string
  essence: EssenceSyncStatus | null
}

export interface EssenceSyncStatus {
  status: string
  sourceRevision: string | null
  counts: Record<string, number>
  report: string | null
  inputName: string | null
  inputKind: string | null
  inputBytes: number | null
  actions: string[]
}

export function normalizeSourceSyncOptions(input: unknown):
  | { ok: true; data: SourceSyncOptions }
  | { ok: false; message: string } {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const patch = typeof value.patch === 'string' ? value.patch.trim() : ''
  if (patch && !/^[A-Za-z0-9._-]{1,32}$/.test(patch)) {
    return { ok: false, message: 'Patch must contain only letters, numbers, dots, underscores or dashes.' }
  }
  return {
    ok: true,
    data: {
      dryRun: value.dryRun === true,
      essenceAuto: value.essenceAuto !== false,
      essenceDecodeRgd: value.essenceDecodeRgd === true,
      essenceDecodeNativeIcons: value.essenceDecodeNativeIcons === true,
      essenceOnly: value.essenceOnly === true,
      skipIcons: value.skipIcons === true,
      skipGameData: value.skipGameData === true,
      skipMeta: value.skipMeta === true,
      skipGuides: value.skipGuides === true,
      patch: patch || null,
    },
  }
}

export function parseSourceSyncCompleted(output: string): string[] {
  const match = /^\[sync\] completed:\s*(.*)$/im.exec(output)
  if (!match?.[1]) return []
  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseEssenceSyncStatus(output: string): EssenceSyncStatus | null {
  const match = /^\[essence\] summary:\s*(\{.*\})$/im.exec(output)
  if (!match?.[1]) return null
  try {
    const value = JSON.parse(match[1]) as Record<string, unknown>
    const counts = value.counts
    const input =
      value.input && typeof value.input === 'object'
        ? (value.input as Record<string, unknown>)
        : null
    return {
      status: typeof value.status === 'string' ? value.status : 'unknown',
      sourceRevision: typeof value.sourceRevision === 'string' ? value.sourceRevision : null,
      counts:
        counts && typeof counts === 'object'
          ? Object.fromEntries(
              Object.entries(counts).filter(([, item]) => typeof item === 'number'),
            )
          : {},
      report: typeof value.report === 'string' ? value.report : null,
      inputName: typeof input?.name === 'string' ? input.name : null,
      inputKind: typeof input?.kind === 'string' ? input.kind : null,
      inputBytes:
        typeof input?.bytes === 'number' && Number.isFinite(input.bytes) ? input.bytes : null,
      actions: Array.isArray(value.actions)
        ? value.actions.filter((item): item is string => typeof item === 'string')
        : [],
    }
  } catch {
    return null
  }
}
