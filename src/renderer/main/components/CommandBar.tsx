import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Copy,
  Ellipsis,
  Info,
  Landmark,
  Languages,
  Minus,
  Settings as SettingsIcon,
  Square,
  X,
} from 'lucide-react'
import { ipc } from '@shared/ipc'
import { cn } from '@shared/lib/utils'
import { navItems } from '../nav'
import { useSettings } from '../queries/useProfile'
import { AccountSwitcher } from './AccountSwitcher'
import { LOCALE_OPTIONS, useI18n } from '../../i18n'

const MAIN_NAV_ITEMS = navItems.filter((item) => item.group === 'main')

/**
 * The app's single top bar — an AoE-style menu ribbon. The key destinations
 * remain visible like the reference UI; newer specialist tools live under the
 * quiet overflow menu so they stay discoverable without turning the header
 * into a second workspace switcher.
 */
export function CommandBar() {
  const { data: settings } = useSettings()
  const { locale, setLocale, tt } = useI18n()
  const hasProfile = settings?.profileId != null
  const [maximized, setMaximized] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const rightClusterRef = useRef<HTMLDivElement>(null)
  const measureRefs = useRef(new Map<string, HTMLSpanElement>())

  useEffect(() => {
    ipc
      .isWindowMaximized()
      .then(setMaximized)
      .catch(() => {})
    return ipc.onWindowMaximizedChanged(setMaximized)
  }, [])

  useEffect(() => setMoreOpen(false), [location.pathname])

  const mainItems = MAIN_NAV_ITEMS
  const [visiblePaths, setVisiblePaths] = useState(
    () => new Set(mainItems.map((item) => item.path)),
  )
  const recomputeNavigation = useCallback(() => {
    const header = headerRef.current
    const brand = brandRef.current
    const rightCluster = rightClusterRef.current
    if (!header || !brand || !rightCluster || header.clientWidth === 0) return

    const available = Math.max(
      0,
      header.clientWidth - brand.offsetWidth - rightCluster.offsetWidth - 24,
    )
    const overflowWidth = 40
    const widths = mainItems.map((item) => ({
      path: item.path,
      width: measureRefs.current.get(item.path)?.getBoundingClientRect().width ?? 0,
    }))
    const activePath = mainItems.some((item) => item.path === location.pathname)
      ? location.pathname
      : null
    const visible = new Set<string>()
    let used = 0

    // Keep the original navigation order, but reserve room for the overflow
    // trigger while there are still hidden items to place.
    for (const item of widths) {
      const hasMoreAfter = visible.size < widths.length - 1
      const reserve = hasMoreAfter ? overflowWidth : 0
      if (used + item.width + reserve > available) break
      visible.add(item.path)
      used += item.width
    }

    // Never strand the current page in the menu. Replace the last visible
    // destination(s) with it when the active route is otherwise hidden.
    if (activePath && !visible.has(activePath)) {
      const activeWidth = widths.find((item) => item.path === activePath)?.width ?? 0
      while (visible.size > 0 && used + activeWidth + overflowWidth > available) {
        const last = [...visible].at(-1)
        if (!last) break
        visible.delete(last)
        used -= widths.find((item) => item.path === last)?.width ?? 0
      }
      if (activeWidth + overflowWidth <= available || visible.size === 0) visible.add(activePath)
    }

    // If everything fits, remove the unnecessary 40px reservation. This also
    // handles a wider window after it was previously in overflow mode.
    if (visible.size === widths.length) {
      setVisiblePaths((previous) =>
        previous.size === visible.size && [...previous].every((path) => visible.has(path))
          ? previous
          : visible,
      )
      return
    }
    setVisiblePaths((previous) =>
      previous.size === visible.size && [...previous].every((path) => visible.has(path))
        ? previous
        : visible,
    )
  }, [hasProfile, locale, location.pathname, mainItems])

  useLayoutEffect(() => {
    recomputeNavigation()
    const header = headerRef.current
    if (!header) return
    const observer = new ResizeObserver(recomputeNavigation)
    observer.observe(header)
    if (brandRef.current) observer.observe(brandRef.current)
    if (rightClusterRef.current) observer.observe(rightClusterRef.current)
    const fontsReady = document.fonts?.ready
    fontsReady?.then(recomputeNavigation).catch(() => {})
    return () => observer.disconnect()
  }, [recomputeNavigation])

  const directItems = mainItems.filter((item) => visiblePaths.has(item.path))
  const moreItems = mainItems.filter((item) => !visiblePaths.has(item.path))
  const moreIsActive = moreItems.some((item) => item.path === location.pathname)

  return (
    <header
      ref={headerRef}
      className="drag-region relative z-40 flex h-12 shrink-0 select-none items-stretch border-b border-border bg-card/95"
    >
      {/* Brand — the only place the name appears. */}
      <div ref={brandRef} className="flex shrink-0 items-center gap-2.5 pl-4 pr-6">
        <Landmark className="h-4 w-4 text-primary" />
        <span className="whitespace-nowrap font-display text-[13px] font-bold tracking-[0.18em] text-foreground">
          RTSLytics
        </span>
      </div>

      {/* Direct navigation keeps the same immediate, game-menu rhythm as the reference UI. */}
      {hasProfile && (
        <nav aria-label={tt('Main navigation')} className="no-drag flex min-w-0 items-stretch">
          {directItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex shrink-0 items-center px-4 font-display text-[12px] font-semibold tracking-[0.1em] transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {tt(item.label)}
                  <span
                    className={cn(
                      'absolute inset-x-3 bottom-0 h-0.5 bg-primary transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}

          {moreItems.length > 0 && (
            <div className="relative flex shrink-0 items-stretch">
              <button
                type="button"
                aria-label={tt('Main navigation')}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                title="More"
                onClick={() => setMoreOpen((open) => !open)}
                className={cn(
                  'relative flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground',
                  moreIsActive && 'text-primary',
                )}
              >
                <Ellipsis className="h-4 w-4" />
                <span
                  className={cn(
                    'absolute inset-x-3 bottom-0 h-0.5 bg-primary transition-opacity',
                    moreIsActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  aria-label={tt('Main navigation')}
                  className="absolute left-0 top-full z-50 mt-1 w-56 border border-border bg-popover p-1 shadow-xl shadow-black/30"
                >
                  {moreItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-secondary text-primary'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )
                        }
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tt(item.label)}
                      </NavLink>
                    )
                  })}
                  <label className="mt-1 flex items-center gap-2 border-t border-border px-2.5 pt-2 text-xs text-muted-foreground">
                    <Languages className="h-3.5 w-3.5" />
                    <span className="sr-only">{tt('Language')}</span>
                    <select
                      value={locale}
                      onChange={(event) => setLocale(event.target.value as typeof locale)}
                      aria-label={tt('Language')}
                      className="h-8 min-w-0 flex-1 rounded-sm border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {LOCALE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}
        </nav>
      )}

      {/* Flexible drag gutter keeps window controls pinned to the right. */}
      <div className="min-w-6 flex-1" />

      {/* Right cluster: settings/about, account, window controls */}
      <div ref={rightClusterRef} className="no-drag flex shrink-0 items-center gap-1 pr-1">
        {!hasProfile && (
          <label className="mr-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{tt('Language')}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as typeof locale)}
              aria-label={tt('Language')}
              className="h-7 rounded-sm border border-border bg-background px-1.5 text-[11px] text-foreground"
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {hasProfile && (
          <>
            <IconNav to="/settings" title={tt('Settings')}>
              <SettingsIcon className="h-4 w-4" />
            </IconNav>
            <IconNav to="/about" title={tt('About')}>
              <Info className="h-4 w-4" />
            </IconNav>
            <div className="mx-2 h-5 w-px bg-border" aria-hidden />
            <div className="w-52">
              <AccountSwitcher />
            </div>
            <div className="mx-2 h-5 w-px bg-border" aria-hidden />
          </>
        )}
        <WinButton label={tt('Minimize')} onClick={() => void ipc.minimizeWindow()}>
          <Minus className="h-3.5 w-3.5" />
        </WinButton>
        <WinButton
          label={tt(maximized ? 'Restore' : 'Maximize')}
          onClick={() => void ipc.toggleMaximizeWindow()}
        >
          {maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </WinButton>
        <WinButton label={tt('Close')} danger onClick={() => void ipc.closeWindow()}>
          <X className="h-4 w-4" />
        </WinButton>
      </div>

      {/* Off-screen labels give the layout real text widths without letting a
          temporary measurement row change the header's geometry. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[10000px] top-0 flex invisible"
      >
        {mainItems.map((item) => (
          <span
            key={item.path}
            ref={(node) => {
              if (node) measureRefs.current.set(item.path, node)
              else measureRefs.current.delete(item.path)
            }}
            className="flex shrink-0 items-center px-4 font-display text-[12px] font-semibold tracking-[0.1em]"
          >
            {tt(item.label)}
          </span>
        ))}
      </div>
    </header>
  )
}

function IconNav({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      title={title}
      className={({ isActive }) =>
        cn(
          'flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-12 w-11 items-center justify-center text-muted-foreground transition-colors',
        danger
          ? 'hover:bg-destructive hover:text-destructive-foreground'
          : 'hover:bg-foreground/10 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
