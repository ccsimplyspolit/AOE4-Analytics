import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronsLeft,
  ChevronsRight,
  Copy,
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
import { isNavPathActive, navItems, SIDEBAR_SECTIONS } from '../nav'
import { useSettings } from '../queries/useProfile'
import { AccountSwitcher } from './AccountSwitcher'
import { LOCALE_OPTIONS, useI18n } from '../../i18n'

const SIDEBAR_KEY = 'rtslytics.sidebar.collapsed'
const BY_PATH = new Map(navItems.map((item) => [item.path, item]))

/**
 * Window chrome: brand, language, account, and native window buttons.
 * Navigation lives in the sidebar so every tab stays visible.
 */
export function TitleBar() {
  const { data: settings } = useSettings()
  const { locale, setLocale, tt } = useI18n()
  const hasProfile = settings?.profileId != null
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    ipc
      .isWindowMaximized()
      .then(setMaximized)
      .catch(() => {})
    return ipc.onWindowMaximizedChanged(setMaximized)
  }, [])

  return (
    <header className="drag-region relative z-40 flex h-11 shrink-0 select-none items-stretch border-b border-border bg-card/95">
      <div className="flex shrink-0 items-center gap-2.5 pl-4 pr-4">
        <Landmark className="h-4 w-4 text-primary" />
        <span className="whitespace-nowrap font-display text-[13px] font-bold tracking-[0.2em] text-foreground">
          RTSLytics
        </span>
      </div>

      <div className="min-w-4 flex-1" />

      <div className="no-drag flex shrink-0 items-center gap-1 pr-1">
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
    </header>
  )
}

export function AppSidebar() {
  const { tt } = useI18n()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        /* ignore quota */
      }
      return next
    })
  }

  return (
    <aside
      className={cn(
        'rts-sidebar no-drag flex shrink-0 flex-col border-r border-border bg-card/90',
        collapsed ? 'w-[3.35rem]' : 'w-[13.75rem]',
      )}
    >
      <nav
        aria-label={tt('Main navigation')}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-3 [scrollbar-width:thin]"
      >
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-0.5">
            {!collapsed && (
              <div className="rts-ledger-head px-2 pb-1 pt-1">{tt(section.label)}</div>
            )}
            {section.paths.map((path) => {
              const item = BY_PATH.get(path)
              if (!item) return null
              const Icon = item.icon
              const active = isNavPathActive(location.pathname, item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={collapsed ? tt(item.label) : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-secondary text-primary shadow-[inset_2px_0_0_hsl(var(--primary))]'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && <span className="truncate">{tt(item.label)}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={toggle}
        className="flex h-10 items-center justify-center gap-2 border-t border-border text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title={tt(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && <span>{tt('Collapse')}</span>}
      </button>
    </aside>
  )
}

/** @deprecated Use TitleBar + AppSidebar. Kept so old imports do not crash. */
export function CommandBar() {
  return <TitleBar />
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
        'flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors',
        danger
          ? 'hover:bg-destructive hover:text-destructive-foreground'
          : 'hover:bg-foreground/10 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
