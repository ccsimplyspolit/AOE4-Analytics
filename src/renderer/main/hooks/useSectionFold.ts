import { useCallback, useState } from 'react'

const PREFIX = 'rtslytics.sectionFold.'

export function parseFoldFlag(raw: string | null, fallback: boolean): boolean {
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

export function recallFold(id: string, fallback = false): boolean {
  try {
    return parseFoldFlag(localStorage.getItem(`${PREFIX}${id}`), fallback)
  } catch {
    return fallback
  }
}

export function rememberFold(id: string, collapsed: boolean): void {
  try {
    localStorage.setItem(`${PREFIX}${id}`, collapsed ? '1' : '0')
  } catch {
    /* quota / private mode */
  }
}

/** Collapsed/expanded state for an overview card, remembered across sessions. */
export function useSectionFold(id: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState(() => recallFold(id, defaultCollapsed))
  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      rememberFold(id, next)
      return next
    })
  }, [id])
  return { collapsed, toggle }
}
