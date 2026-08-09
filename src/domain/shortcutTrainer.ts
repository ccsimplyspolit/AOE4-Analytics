/** Keyboard profiles and input normalization used by the local shortcut trainer. */

import type { ExplorerRecord } from '@data/explorerData'

export type ShortcutLayoutId = 'QWERTY' | 'QWERTZ' | 'AZERTY' | 'DVORAK' | 'CUSTOM'
export type ShortcutDisplayStyle = 'SINGLE' | 'GRID' | 'NAME'

export type KeyboardLayout = string[][]
export type ShortcutPosition = `${0 | 1 | 2}:${0 | 1 | 2 | 3}`
export type TrainerBuildingType = 'economic' | 'military' | 'fortified' | 'research'

/** A construction command that is known to use the stock AoE4 grid. */
export interface TrainerBuildingAction {
  id: string
  recordId: string
  name: string
  icon: string | null
  description: string
  age: 1 | 2 | 3 | 4
  type: TrainerBuildingType
  civilizations: string[]
  shortcut: readonly [ShortcutPosition, ShortcutPosition]
}

type KnownBinding = {
  /** Game-data name.  Aliases cover the current AoE4World terminology. */
  names: readonly string[]
  shortcut: readonly [ShortcutPosition, ShortcutPosition]
  age: 1 | 2 | 3 | 4
  type: TrainerBuildingType
  /** Empty means the standard command is shared by every eligible civilization. */
  civilizations?: readonly string[]
  /** Civilizations whose construction panel replaces this otherwise shared command. */
  exceptCivilizations?: readonly string[]
}

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

/*
 * The stock construction panel is a two-step 3x4 grid.  These are the
 * commands present in the default AoE4 profile, not guesses derived from a
 * building name.  Civilisation-specific rows are deliberately explicit: a
 * prompt is omitted when we do not know its default command.
 */
const KNOWN_BUILDING_BINDINGS: readonly KnownBinding[] = [
  { names: ['House'], shortcut: ['0:0', '0:0'], age: 1, type: 'economic' },
  { names: ['Mill'], shortcut: ['0:0', '0:1'], age: 1, type: 'economic' },
  { names: ['Lumber Camp'], shortcut: ['0:0', '0:2'], age: 1, type: 'economic' },
  { names: ['Mining Camp'], shortcut: ['0:0', '0:3'], age: 1, type: 'economic' },
  { names: ['Farm'], shortcut: ['0:0', '1:0'], age: 1, type: 'economic' },
  { names: ['Barracks'], shortcut: ['0:0', '1:1'], age: 1, type: 'military' },
  { names: ['Dock'], shortcut: ['0:0', '1:2'], age: 1, type: 'economic' },
  { names: ['Outpost'], shortcut: ['0:0', '2:0'], age: 1, type: 'fortified' },
  { names: ['Palisade', 'Palisade Wall'], shortcut: ['0:0', '2:1'], age: 1, type: 'fortified' },
  { names: ['Palisade Gate'], shortcut: ['0:0', '2:2'], age: 1, type: 'fortified' },
  { names: ['Blacksmith'], shortcut: ['0:1', '0:0'], age: 2, type: 'research' },
  { names: ['Market'], shortcut: ['0:1', '0:1'], age: 2, type: 'economic' },
  { names: ['Town Center'], shortcut: ['0:1', '0:2'], age: 2, type: 'economic' },
  { names: ['Archery Range'], shortcut: ['0:1', '1:0'], age: 2, type: 'military' },
  { names: ['Stable'], shortcut: ['0:1', '1:1'], age: 2, type: 'military', exceptCivilizations: ['mo', 'gol'] },
  { names: ['Stone Wall Tower'], shortcut: ['0:1', '2:0'], age: 2, type: 'fortified' },
  { names: ['Stone Wall'], shortcut: ['0:1', '2:1'], age: 2, type: 'fortified' },
  { names: ['Stone Wall Gate'], shortcut: ['0:1', '2:2'], age: 2, type: 'fortified' },
  { names: ['Monastery'], shortcut: ['0:2', '0:0'], age: 3, type: 'research', exceptCivilizations: ['by'] },
  { names: ['Siege Workshop'], shortcut: ['0:2', '1:0'], age: 3, type: 'military' },
  { names: ['Keep'], shortcut: ['0:2', '2:0'], age: 3, type: 'fortified' },
  { names: ['University'], shortcut: ['0:3', '0:0'], age: 4, type: 'research' },

  {
    names: ['Ovoo'],
    shortcut: ['0:0', '0:0'],
    age: 1,
    type: 'economic',
    civilizations: ['mo', 'gol'],
  },
  {
    names: ['Ger'],
    shortcut: ['0:0', '0:1'],
    age: 1,
    type: 'economic',
    civilizations: ['mo', 'gol'],
  },
  {
    names: ['Pasture'],
    shortcut: ['0:0', '1:0'],
    age: 1,
    type: 'economic',
    civilizations: ['mo', 'gol'],
  },
  {
    names: ['Stable'],
    shortcut: ['0:0', '1:3'],
    age: 1,
    type: 'military',
    civilizations: ['mo', 'gol'],
  },
  {
    names: ['Hunting Cabin'],
    shortcut: ['0:0', '0:1'],
    age: 1,
    type: 'economic',
    civilizations: ['ru'],
  },
  {
    names: ['Wooden Fortress'],
    shortcut: ['0:0', '2:0'],
    age: 1,
    type: 'fortified',
    civilizations: ['ru'],
  },
  {
    names: ['Village'],
    shortcut: ['0:0', '1:3'],
    age: 1,
    type: 'economic',
    civilizations: ['ch', 'zx'],
  },
  {
    names: ['Granary'],
    shortcut: ['0:1', '1:2'],
    age: 2,
    type: 'economic',
    civilizations: ['ch', 'zx'],
  },
  {
    names: ['Pagoda'],
    shortcut: ['0:2', '1:1'],
    age: 3,
    type: 'economic',
    civilizations: ['ch', 'zx'],
  },
  {
    names: ['House of Wisdom'],
    shortcut: ['0:0', '1:3'],
    age: 1,
    type: 'economic',
    civilizations: ['ab', 'ay'],
  },
  {
    names: ['Prayer Tent'],
    shortcut: ['0:2', '0:0'],
    age: 3,
    type: 'economic',
    civilizations: ['ab'],
  },
  { names: ['Mosque'], shortcut: ['0:0', '1:3'], age: 1, type: 'economic', civilizations: ['de'] },
  {
    names: ['Pit Mine'],
    shortcut: ['0:0', '1:3'],
    age: 1,
    type: 'economic',
    civilizations: ['ma'],
  },
  {
    names: ['Toll Outpost'],
    shortcut: ['0:0', '2:0'],
    age: 1,
    type: 'fortified',
    civilizations: ['ma'],
  },
  {
    names: ['Cattle Ranch'],
    shortcut: ['0:1', '1:2'],
    age: 2,
    type: 'economic',
    civilizations: ['ma'],
  },
  {
    names: ['Military School'],
    shortcut: ['0:0', '1:3'],
    age: 1,
    type: 'military',
    civilizations: ['ot'],
  },
  {
    names: ['Farmhouse'],
    shortcut: ['0:0', '0:0'],
    age: 1,
    type: 'economic',
    civilizations: ['ja', 'sen'],
  },
  {
    names: ['Forge'],
    shortcut: ['0:0', '0:3'],
    age: 1,
    type: 'economic',
    civilizations: ['ja', 'sen'],
  },
  {
    names: ['Shinto Shrine', 'Buddhist Temple'],
    shortcut: ['0:2', '0:0'],
    age: 3,
    type: 'economic',
    civilizations: ['ja', 'sen'],
  },
  {
    names: ['Castle'],
    shortcut: ['0:3', '1:0'],
    age: 4,
    type: 'fortified',
    civilizations: ['ja', 'sen'],
  },
  {
    names: ['Olive Grove'],
    shortcut: ['0:0', '1:0'],
    age: 1,
    type: 'economic',
    civilizations: ['by'],
  },
  { names: ['Cistern'], shortcut: ['0:0', '1:3'], age: 1, type: 'economic', civilizations: ['by'] },
  {
    names: ['Aqueduct'],
    shortcut: ['0:0', '2:3'],
    age: 1,
    type: 'economic',
    civilizations: ['by'],
  },
  {
    names: ['Mercenary House'],
    shortcut: ['0:1', '1:2'],
    age: 2,
    type: 'military',
    civilizations: ['by'],
  },
]

/**
 * Joins verified default construction bindings with the shipped game-data
 * records.  Landmarks and unknown/new commands are intentionally excluded
 * instead of assigning a plausible but false shortcut.
 */
export function trainerBuildingActions(
  records: readonly ExplorerRecord[],
): TrainerBuildingAction[] {
  const byName = new Map(records.map((record) => [record.name.toLocaleLowerCase(), record]))
  return KNOWN_BUILDING_BINDINGS.flatMap((binding) => {
    const record = binding.names
      .map((name) => byName.get(name.toLocaleLowerCase()))
      .find((candidate): candidate is ExplorerRecord => candidate != null)
    if (!record) return []
    const civilizations = binding.civilizations
      ? record.civs.filter((civ) => binding.civilizations!.includes(civ))
      : record.civs.filter((civ) => !binding.exceptCivilizations?.includes(civ))
    if (civilizations.length === 0) return []
    return [
      {
        id: `${record.id}:${binding.shortcut.join('-')}:${civilizations.join(',') || 'shared'}`,
        recordId: record.id,
        name: record.name,
        icon: record.icon,
        description: record.description,
        age: binding.age,
        type: binding.type,
        civilizations,
        shortcut: binding.shortcut,
      },
    ]
  })
}

export function shortcutKeysForPositions(
  shortcut: readonly ShortcutPosition[],
  layout: KeyboardLayout,
): string[] {
  return shortcut.map((position) => {
    const [rowText, columnText] = position.split(':')
    const row = Number(rowText ?? 0)
    const column = Number(columnText ?? 0)
    return layout[row]?.[column] ?? ''
  })
}

/** Returns the profile label for a physical press, ignoring modifiers. */
export function trainerKeyFromInput(input: ShortcutKeyInput, layout: KeyboardLayout): string {
  return keyFromInput(input, layout)
}

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
      const replacement = position ? (toLayout[position[0]]?.[position[1]] ?? key) : key
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
