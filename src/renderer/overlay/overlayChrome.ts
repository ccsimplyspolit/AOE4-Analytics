import type { CSSProperties } from 'react'
import { panelBg } from './panelBg'

/** Quiet overlay plate: no drop shadow, no cyan ring, just a hairline edge. */
export const OVERLAY_PANEL_CLASS = 'overlay-panel'

export function overlayPanelStyle(alpha = 0.58): CSSProperties {
  return {
    background: panelBg(alpha),
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
  }
}
