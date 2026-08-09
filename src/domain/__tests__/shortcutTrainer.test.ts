import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYBOARD_LAYOUT,
  keyboardLayoutFor,
  normalizeShortcut,
  shortcutFromKeyInput,
  shortcutKey,
} from '../shortcutTrainer'

describe('shortcut trainer keyboard profiles', () => {
  it('provides the common AoE keyboard profiles', () => {
    expect(keyboardLayoutFor('QWERTY', DEFAULT_KEYBOARD_LAYOUT)[2]).toEqual(['Z', 'X', 'C', 'V'])
    expect(keyboardLayoutFor('QWERTZ', DEFAULT_KEYBOARD_LAYOUT)[2]).toEqual(['Y', 'X', 'C', 'V'])
    expect(keyboardLayoutFor('AZERTY', DEFAULT_KEYBOARD_LAYOUT)[0]).toEqual(['A', 'Z', 'E', 'R'])
    expect(keyboardLayoutFor('DVORAK', DEFAULT_KEYBOARD_LAYOUT)[0]).toEqual(["'", ',', '.', 'P'])
  })

  it('normalizes legacy typed accelerators and extracts their key', () => {
    expect(normalizeShortcut(' Ctrl + 1 ')).toBe('CTRL+1')
    expect(shortcutKey('Shift+A')).toBe('A')
  })

  it('captures a real key combination without requiring text input', () => {
    expect(
      shortcutFromKeyInput({
        key: '1',
        code: 'Digit1',
        ctrlKey: true,
        altKey: true,
      }),
    ).toBe('CTRL+ALT+1')
    expect(shortcutFromKeyInput({ key: 'q', code: 'KeyQ', shiftKey: true })).toBe('SHIFT+Q')
    expect(shortcutFromKeyInput({ key: 'Control', code: 'ControlLeft', ctrlKey: true })).toBe('')
  })
})
