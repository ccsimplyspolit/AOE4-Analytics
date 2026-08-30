import { describe, expect, it } from 'vitest'
import {
  classifyForegroundWindow,
  looksLikeAoe4Window,
  parseForegroundWatcherLine,
} from '../gameWindow'

describe('looksLikeAoe4Window', () => {
  it('matches English and compact titles', () => {
    expect(looksLikeAoe4Window('Age of Empires IV', '')).toBe(true)
    expect(looksLikeAoe4Window('Age of Empires 4', 'Qt5152QWindowIcon')).toBe(true)
  })

  it('matches Relic / AoE4 window classes', () => {
    expect(looksLikeAoe4Window('', 'RelicCardinal')).toBe(true)
    expect(looksLikeAoe4Window('', 'RelicCardinal_ws')).toBe(true)
  })

  it('rejects unrelated windows', () => {
    expect(looksLikeAoe4Window('Google Chrome', 'Chrome_WidgetWin_1')).toBe(false)
    expect(looksLikeAoe4Window('RTSLytics', 'Chrome_WidgetWin_1')).toBe(false)
  })
})

describe('classifyForegroundWindow', () => {
  const our = { ourPid: 111, ourProcessName: 'RTSLytics' }

  it('maps our pid to the app name without opening the game', () => {
    expect(
      classifyForegroundWindow({ pid: 111, title: 'RTSLytics', className: 'x', ...our }),
    ).toBe('RTSLytics')
  })

  it('maps the AoE4 window to RelicCardinal', () => {
    expect(
      classifyForegroundWindow({
        pid: 222,
        title: 'Age of Empires IV',
        className: '',
        ...our,
      }),
    ).toBe('RelicCardinal')
  })

  it('maps the Store build class to RelicCardinal_ws', () => {
    expect(
      classifyForegroundWindow({ pid: 222, title: '', className: 'RelicCardinal_ws', ...our }),
    ).toBe('RelicCardinal_ws')
  })

  it('returns other for a readable non-game window', () => {
    expect(
      classifyForegroundWindow({
        pid: 333,
        title: 'Discord',
        className: 'Chrome_WidgetWin_1',
        ...our,
      }),
    ).toBe('other')
  })

  it('returns empty when the HWND is unreadable (fail-open)', () => {
    expect(classifyForegroundWindow({ pid: 0, title: '', className: '', ...our })).toBe('')
  })
})

describe('parseForegroundWatcherLine', () => {
  it('parses pid, title, class, and rect without a process handle', () => {
    expect(parseForegroundWatcherLine('222\tAge of Empires IV\tRelicCardinal\t10,20,1920,1080')).toEqual({
      pid: 222,
      title: 'Age of Empires IV',
      className: 'RelicCardinal',
      rect: { x: 10, y: 20, width: 1920, height: 1080 },
    })
  })

  it('keeps empty title/class (fail-open for unreadable HWNDs)', () => {
    expect(parseForegroundWatcherLine('0\t\t\t')).toEqual({
      pid: 0,
      title: '',
      className: '',
      rect: null,
    })
  })

  it('ignores noise without the four-field protocol', () => {
    expect(parseForegroundWatcherLine('Windows PowerShell')).toBeNull()
    expect(parseForegroundWatcherLine('RelicCardinal\t10,20,1920,1080')).toBeNull()
  })
})
