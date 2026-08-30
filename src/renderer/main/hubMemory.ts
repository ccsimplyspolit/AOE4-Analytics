/** Last-open hub tab so the sidebar can return to `/lab` without dropping Replay Lab. */
const PREFIX = 'rtslytics.hub.'

export function rememberHub(key: string, value: string): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, value)
  } catch {
    /* quota / private mode */
  }
}

export function recallHub<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(`${PREFIX}${key}`)
    if (value && (allowed as readonly string[]).includes(value)) return value as T
  } catch {
    /* quota / private mode */
  }
  return fallback
}
