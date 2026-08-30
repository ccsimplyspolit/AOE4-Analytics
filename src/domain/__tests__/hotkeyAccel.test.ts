import { describe, expect, it } from 'vitest'
import {
  acceleratorFromKeyboardEvent,
  acceleratorsEqual,
  formatAccelerator,
  normalizeAccelerator,
} from '../hotkeyAccel'

describe('normalizeAccelerator', () => {
  it('requires a modifier and a key', () => {
    expect(normalizeAccelerator('O')).toBeUndefined()
    expect(normalizeAccelerator('Control')).toBeUndefined()
    expect(normalizeAccelerator('Control+')).toBeUndefined()
    expect(normalizeAccelerator('Foo+O')).toBeUndefined()
  })

  it('folds aliases and a stable modifier order', () => {
    expect(normalizeAccelerator('ctrl + alt + o')).toBe('Control+Alt+O')
    expect(normalizeAccelerator('Alt+Control+Shift+PageDown')).toBe('Control+Alt+Shift+PageDown')
    expect(normalizeAccelerator('Ctrl+ArrowRight')).toBe('Control+Right')
  })
})

describe('acceleratorsEqual', () => {
  it('treats Ctrl and Control as the same binding', () => {
    expect(acceleratorsEqual('Ctrl+Alt+O', 'Control+Alt+O')).toBe(true)
    expect(acceleratorsEqual('Alt+O', 'Control+Alt+O')).toBe(false)
  })
})

describe('formatAccelerator', () => {
  it('prints a short Ctrl label', () => {
    expect(formatAccelerator('Control+Alt+O')).toBe('Ctrl + Alt + O')
  })
})

describe('acceleratorFromKeyboardEvent', () => {
  it('builds Control+Alt+Right from a chord', () => {
    expect(
      acceleratorFromKeyboardEvent({
        key: 'ArrowRight',
        code: 'ArrowRight',
        ctrlKey: true,
        altKey: true,
        shiftKey: false,
        metaKey: false,
        repeat: false,
      }),
    ).toBe('Control+Alt+Right')
  })

  it('ignores modifier-only and unmodified keys', () => {
    expect(
      acceleratorFromKeyboardEvent({
        key: 'Control',
        code: 'ControlLeft',
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
      }),
    ).toBeNull()
    expect(
      acceleratorFromKeyboardEvent({
        key: 'o',
        code: 'KeyO',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
      }),
    ).toBeNull()
  })
})
