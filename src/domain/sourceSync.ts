export interface SourceSyncOptions {
  dryRun: boolean
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
