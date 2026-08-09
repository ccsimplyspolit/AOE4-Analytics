import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYBOARD_LAYOUT,
  KEYBOARD_LAYOUTS,
  keyboardLayoutFor,
  normalizeShortcut,
  remapShortcutForLayout,
  shortcutKeysForPositions,
  shortcutFromKeyInput,
  shortcutKey,
  trainerBuildingActions,
  trainerKeyFromInput,
} from '../shortcutTrainer'
import { EXPLORER_RECORDS_BY_KIND } from '@data/explorerData'

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

  it('captures the label at the physical position of the selected profile', () => {
    expect(
      shortcutFromKeyInput(
        { key: 'y', code: 'KeyZ', shiftKey: true },
        KEYBOARD_LAYOUTS.QWERTZ,
      ),
    ).toBe('SHIFT+Y')
    expect(
      shortcutFromKeyInput({ key: 'a', code: 'KeyQ' }, KEYBOARD_LAYOUTS.AZERTY),
    ).toBe('A')
  })

  it('keeps saved shortcuts on the same physical key when the profile changes', () => {
    expect(
      remapShortcutForLayout(
        'CTRL+Z,ALT+X',
        KEYBOARD_LAYOUTS.QWERTY,
        KEYBOARD_LAYOUTS.QWERTZ,
      ),
    ).toBe('CTRL+Y,ALT+X')
    expect(
      remapShortcutForLayout('Q', KEYBOARD_LAYOUTS.QWERTY, KEYBOARD_LAYOUTS.AZERTY),
    ).toBe('A')
  })

  it('provides verified default two-key construction commands without user mapping', () => {
    const actions = trainerBuildingActions(EXPLORER_RECORDS_BY_KIND.building)
    const house = actions.find((action) => action.name === 'House')
    const mongolStable = actions.find(
      (action) => action.name === 'Stable' && action.civilizations.includes('mo'),
    )

    expect(house?.shortcut).toEqual(['0:0', '0:0'])
    expect(shortcutKeysForPositions(house?.shortcut ?? [], KEYBOARD_LAYOUTS.QWERTY)).toEqual(['Q', 'Q'])
    expect(shortcutKeysForPositions(house?.shortcut ?? [], KEYBOARD_LAYOUTS.AZERTY)).toEqual(['A', 'A'])
    expect(mongolStable?.shortcut).toEqual(['0:0', '1:3'])
  })

  it('reads a trainer command from its physical keyboard position', () => {
    expect(trainerKeyFromInput({ key: 'y', code: 'KeyZ' }, KEYBOARD_LAYOUTS.QWERTZ)).toBe('Y')
    expect(trainerKeyFromInput({ key: 'a', code: 'KeyQ' }, KEYBOARD_LAYOUTS.AZERTY)).toBe('A')
  })
})
