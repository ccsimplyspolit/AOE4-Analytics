/** Keyboard profiles and input normalization used by the local shortcut trainer. */

export type ShortcutLayoutId = 'QWERTY' | 'QWERTZ' | 'AZERTY' | 'DVORAK' | 'CUSTOM'
export type ShortcutDisplayStyle = 'SINGLE' | 'GRID' | 'NAME'

export type KeyboardLayout = string[][]

export const DEFAULT_KEYBOARD_LAYOUT: KeyboardLayout = [
  ['Q', 'W', 'E', 'R'],
  ['A', 'S', 'D', 'F'],
  ['Z', 'X', 'C', 'V'],
]

export const KEYBOARD_LAYOUTS: Record<Exclude<ShortcutLayoutId, 'CUSTOM'>, KeyboardLayout> = {
  QWERTY: DEFAULT_KEYBOARD_LAYOUT,
  QWERTZ: [
    ['Q', 'W', 'E', 'R'],
    ['A', 'S', 'D', 'F'],
    ['Y', 'X', 'C', 'V'],
  ],
  AZERTY: [
    ['A', 'Z', 'E', 'R'],
    ['Q', 'S', 'D', 'F'],
    ['W', 'X', 'C', 'V'],
  ],
  DVORAK: [
    ["'", ',', '.', 'P'],
    ['A', 'O', 'E', 'U'],
    [';', 'Q', 'J', 'K'],
  ],
}

/** Physical key positions represented by the compact trainer grid. */
const PHYSICAL_KEY_CODES: string[][] = [
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV'],
]

export function cloneKeyboardLayout(layout: KeyboardLayout): KeyboardLayout {
  return layout.map((row) => [...row])
}

export function keyboardLayoutFor(
  layoutId: ShortcutLayoutId,
  customLayout: KeyboardLayout,
): KeyboardLayout {
  return cloneKeyboardLayout(layoutId === 'CUSTOM' ? customLayout : KEYBOARD_LAYOUTS[layoutId])
}

export interface ShortcutKeyInput {
  key: string
  code?: string
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

/** Normalize both legacy typed values and captured keyboard combinations. */
export function normalizeShortcut(value: string): string {
  return value
    .trim()
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

/** Convert a keydown payload into the same accelerator notation saved by the trainer. */
export function shortcutFromKeyInput(input: ShortcutKeyInput, layout?: KeyboardLayout): string {
  const key = keyFromInput(input, layout)
  if (!key || isModifierKey(key)) return ''
  const modifiers: string[] = []
  if (input.ctrlKey) modifiers.push('CTRL')
  if (input.altKey) modifiers.push('ALT')
  if (input.metaKey) modifiers.push('META')
  if (input.shiftKey) modifiers.push('SHIFT')
  return normalizeShortcut([...modifiers, key].join('+'))
}

/**
 * Rewrites the key part of a shortcut to the same physical position in a new
 * profile. Modifier order and comma-separated alternatives are preserved.
 */
export function remapShortcutForLayout(
  value: string,
  fromLayout: KeyboardLayout,
  toLayout: KeyboardLayout,
): string {
  const normalized = normalizeShortcut(value)
  if (!normalized) return ''
  return normalized
    .split(',')
    .map((chord) => {
      const parts = chord.split('+')
      const key = parts.pop() ?? ''
      const position = layoutPositionForKey(fromLayout, key)
      const replacement = position
        ? toLayout[position[0]]?.[position[1]] ?? key
        : key
      return [...parts, replacement].join('+')
    })
    .join(',')
}

export function remapShortcutsForLayout(
  shortcuts: Record<string, string>,
  fromLayout: KeyboardLayout,
  toLayout: KeyboardLayout,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(shortcuts).map(([id, value]) => [
      id,
      remapShortcutForLayout(value, fromLayout, toLayout),
    ]),
  )
}

export function shortcutKey(value: string): string | null {
  const normalized = normalizeShortcut(value)
  if (!normalized) return null
  const first = normalized.split(',')[0]!.trim()
  const parts = first.split('+')
  return parts[parts.length - 1] ?? null
}

function keyFromInput(input: ShortcutKeyInput, layout?: KeyboardLayout): string {
  if (layout && input.code) {
    const position = physicalPositionForCode(input.code)
    const profileKey = position ? layout[position[0]]?.[position[1]] : undefined
    if (profileKey) return normalizeShortcut(profileKey)
  }
  const code = input.code ?? ''
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return `NUM${code.slice(6)}`
  const named: Record<string, string> = {
    ' ': 'SPACE',
    Add: 'PLUS',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    Backspace: 'BACKSPACE',
    Delete: 'DELETE',
    End: 'END',
    Enter: 'ENTER',
    Escape: 'ESC',
    Home: 'HOME',
    Insert: 'INSERT',
    PageDown: 'PAGEDOWN',
    PageUp: 'PAGEUP',
    Space: 'SPACE',
    Tab: 'TAB',
  }
  if (named[input.key]) return named[input.key]!
  if (named[code]) return named[code]!
  if (input.key === '+') return 'PLUS'
  if (input.key.length === 1) return input.key.toUpperCase()
  return input.key.toUpperCase()
}

function physicalPositionForCode(code: string): [number, number] | null {
  for (let row = 0; row < PHYSICAL_KEY_CODES.length; row += 1) {
    const column = PHYSICAL_KEY_CODES[row]?.indexOf(code) ?? -1
    if (column >= 0) return [row, column]
  }
  return null
}

function layoutPositionForKey(layout: KeyboardLayout, key: string): [number, number] | null {
  const normalized = normalizeShortcut(key)
  if (!normalized) return null
  for (let row = 0; row < layout.length; row += 1) {
    const column = layout[row]?.findIndex((value) => normalizeShortcut(value) === normalized) ?? -1
    if (column >= 0) return [row, column]
  }
  return null
}

function isModifierKey(key: string): boolean {
  return ['ALT', 'ALTGRAPH', 'CTRL', 'CONTROL', 'META', 'SHIFT'].includes(key)
}
