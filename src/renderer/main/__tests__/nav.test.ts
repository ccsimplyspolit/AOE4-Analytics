import { describe, expect, it } from 'vitest'
import {
  isNavPathActive,
  navItems,
  SIDEBAR_HIDDEN_ALIASES,
  SIDEBAR_SECTIONS,
} from '../nav'

describe('sidebar navigation', () => {
  it('lists each sidebar path once and keeps hidden aliases off the rail', () => {
    const listed = SIDEBAR_SECTIONS.flatMap((section) => [...section.paths])
    const mainPaths = new Set(navItems.filter((item) => item.group === 'main').map((item) => item.path))
    expect(listed).toEqual(['/', '/scout', '/guides', '/explorer', '/stats', '/civ-meta', '/lab'])
    for (const path of listed) expect(mainPaths.has(path)).toBe(true)
    for (const alias of SIDEBAR_HIDDEN_ALIASES) {
      expect(listed).not.toContain(alias)
      expect(mainPaths.has(alias)).toBe(true)
    }
  })

  it('treats Dashboard as an exact match only', () => {
    expect(isNavPathActive('/', '/')).toBe(true)
    expect(isNavPathActive('/scout', '/')).toBe(false)
    expect(isNavPathActive('/civ/english', '/civ-meta')).toBe(false)
    expect(isNavPathActive('/civ-meta', '/civ-meta')).toBe(true)
    expect(isNavPathActive('/lab', '/lab')).toBe(true)
    expect(isNavPathActive('/tincture', '/lab')).toBe(true)
    expect(isNavPathActive('/leaderboards', '/scout')).toBe(true)
    expect(isNavPathActive('/patches', '/explorer')).toBe(true)
    expect(isNavPathActive('/lab', '/explorer')).toBe(false)
  })
})
