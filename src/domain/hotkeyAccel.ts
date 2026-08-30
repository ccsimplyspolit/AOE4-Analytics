/** Canonical Electron accelerator helpers shared by settings sanitization and the UI. */

const MOD_ALIAS: Record<string, string> = {
  commandorcontrol: 'Control',
  cmdorctrl: 'Control',
  control: 'Control',
  ctrl: 'Control',
  command: 'Command',
  cmd: 'Command',
  alt: 'Alt',
  option: 'Alt',
  altgr: 'AltGr',
  shift: 'Shift',
  super: 'Super',
  meta: 'Super',
}

const MOD_ORDER = ['Control', 'Alt', 'AltGr', 'Shift', 'Super', 'Command'] as const

const KEY_ALIAS: Record<string, string> = {
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  esc: 'Escape',
  escape: 'Escape',
  return: 'Return',
  enter: 'Return',
  space: 'Space',
  ' ': 'Space',
  plus: 'Plus',
  add: 'Plus',
}

/**
 * Normalize an Electron accelerator: at least one modifier, a non-modifier key,
 * aliases folded (`Ctrl` → `Control`, `ArrowRight` → `Right`), modifiers in a
 * stable order. Returns undefined when the string is not a usable binding.
 */
export function normalizeAccelerator(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const parts = raw.split('+').map((part) => part.trim()).filter((part) => part !== '')
  if (parts.length < 2) return undefined
  const keyPart = parts[parts.length - 1]!
  if (MOD_ALIAS[keyPart.toLowerCase()]) return undefined
  const mods = parts.slice(0, -1).map((mod) => MOD_ALIAS[mod.toLowerCase()])
  if (mods.some((mod) => mod == null)) return undefined
  const unique = MOD_ORDER.filter((mod) => mods.includes(mod))
  if (unique.length === 0) return undefined
  const key = canonicalizeKey(keyPart)
  if (!key) return undefined
  return `${unique.join('+')}+${key}`
}

export function acceleratorsEqual(a: string, b: string): boolean {
  const left = normalizeAccelerator(a)
  const right = normalizeAccelerator(b)
  return left != null && left === right
}

/** Compact display: `Control+Alt+O` → `Ctrl + Alt + O`. */
export function formatAccelerator(raw: string): string {
  const normalized = normalizeAccelerator(raw) ?? raw.trim()
  return normalized
    .split('+')
    .map((part) => (part === 'Control' ? 'Ctrl' : part))
    .join(' + ')
}

function canonicalizeKey(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const aliased = KEY_ALIAS[trimmed.toLowerCase()]
  if (aliased) return aliased
  if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(trimmed)) {
    return `F${trimmed.slice(1)}`
  }
  if (/^[a-z]$/i.test(trimmed)) return trimmed.toUpperCase()
  if (/^[0-9]$/.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9]*$/i.test(trimmed)) {
    return trimmed[0]!.toUpperCase() + trimmed.slice(1)
  }
  return trimmed
}

const CODE_TO_KEY: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Home: 'Home',
  End: 'End',
  Insert: 'Insert',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  Enter: 'Return',
  NumpadEnter: 'Return',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  NumpadAdd: 'Plus',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
  NumpadDecimal: 'numdec',
}

/**
 * Turn a keydown into an Electron accelerator. Modifier-only presses return
 * null so the recorder can keep waiting. Escape is left to the UI to cancel.
 */
export function acceleratorFromKeyboardEvent(event: {
  key: string
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  repeat: boolean
}): string | null {
  if (event.repeat) return null
  if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(event.key)) return null
  if (event.key === 'Escape') return null
  const mods: string[] = []
  if (event.ctrlKey) mods.push('Control')
  if (event.altKey) mods.push('Alt')
  if (event.shiftKey) mods.push('Shift')
  if (event.metaKey) mods.push('Super')
  if (mods.length === 0) return null
  const key = keyFromEvent(event)
  if (!key) return null
  return normalizeAccelerator(`${mods.join('+')}+${key}`) ?? null
}

function keyFromEvent(event: { key: string; code: string }): string | undefined {
  const { code } = event
  if (code.startsWith('Key') && code.length === 4) return code.slice(3)
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5)
  if (code.startsWith('Numpad') && /^\d$/.test(code.slice(6))) return `num${code.slice(6)}`
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  return CODE_TO_KEY[code]
}
